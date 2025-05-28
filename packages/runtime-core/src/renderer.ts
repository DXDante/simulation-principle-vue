import { ShapeFlags } from "@vue/shared"
import { Fragment, isSameVnode, Text } from "./createVNode"
import { getSequence } from './seq'
import { reactive } from "@vue/reactivity"
import { ReactiveEffect } from "@vue/reactivity"
import { queueJob } from "./scheduler"

/**
 * createRenderer 可跨平台, 它不关心如何渲染
 * @param renderOptions 渲染选项
 */
export const createRenderer = (renderOptions) => {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = renderOptions

  /************************************************************ 元素、节点操作 ************************************************************/
  /** 挂载元素 **/
  const mountElement = (vnode, container, anchor) => {
    const { type, children, props, shapeFlag } = vnode
    // 第 1 次渲染时让虚拟节点 和 真实 DOM 创建关联 vnode.el = 真实 DOM
    // 第 2 次渲染如果没有值, 需要移除真实 DOM, 如果是新的 vnode, 可以和上 1 次的 vnode 做比对, 之后更新对应的 el 元素, 后续再复用这个 DOM 元素
    const el = (vnode.el = hostCreateElement(type))

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 文本元素 (9 & 8 > 0 与/或位移运算)
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }
    // 多个节点
    else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }

    hostInsert(el, container, anchor)
  }

  /** 挂载子元素 **/
  const mountChildren = (children, container) => {
    for(let i = 0; i < children.length; i++) {
      // TODO: 可能是纯文本
      patch(null, children[i], container)
    }
  }

  /** 移除 DOM **/
  const unMount = (vnode) => {
    const { type, children, el } = vnode
    if (type === Fragment) {
      unMountChildren(children)
      return
    }
    hostRemove(el)
  }

  /** 移除子元素 DOM **/
  const unMountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unMount(children[i])
    }
  }
  /************************************************************ 元素、节点操作 ************************************************************/

  /************************************************************ 处理文本节点流程 ************************************************************/
  /** 处理文本节点流程 **/
  const processText = (n1, n2, container) => {
    // 初始创建文本节点, 插入到容器, 并和真实节点做关联 (n2.el 指向 "真实节点")
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), container)
    }
    // 
    else {
      // 先将旧节点关联的 DOM 关联到新节点上
      const el = (n2.el = n1.el)
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children)
      }
    }
  }
  /************************************************************ 处理文本节点流程 ************************************************************/

  /************************************************************ 处理 Fragment 流程 ************************************************************/
  /** 处理 Fragment 流程 **/
  const processFragment = (n1, n2, container) => {
    // 初始挂载子节点
    if (n1 == null) {
      mountChildren(n2.children, container)
    }
    // 对比更新子节点
    else {
      patchChildren(n1, n2, container)
    }
  }
  /************************************************************ 处理 Fragment 流程 ************************************************************/

  /************************************************************ 处理 组件 流程 ************************************************************/
  /** 处理组件 **/
  const processComponent = (n1, n2, container, anchor) => {
    // 挂载组件
    if (n1 == null) {
      mountComponent(n2, container, anchor)
    }
    // 更新组件
    else {

    }
  }
  
  /** 挂载组件 **/
  const mountComponent = (vnode, container, anchor) => {
    // 组件可以依据自己的状态重新渲染, 组件其实就是 effect
    // 解构, type, props 就是提供给组件的数据(类似于创建元素提供的属性数据), children 就是组件的插槽
    const { type, props: rawProps = {}, children } = vnode
    const { data = () => ({}), render, props: propsOptions = {} } = type
    // 组件状态, 拿到数据创建响应式
    const state = reactive(data())
    // 组件标识位实例(它不是 new 出来的那种, 存放关于组件的一些数据)
    const instance = {
      data: state, // 组件状态
      vnode, // 组件虚拟节点
      subTree: null, // 组件子树, 组件节点 render 返回的子节点
      isMounted: false, // 组件是否挂载完成
      update: null, // 组件更新函数(effect 的调度函数)
      component: null,
      props: {},
      propsOptions,
      attrs: {}
    }

    // 组件节点保存当前组件实例
    vnode.component = instance

    // 根据 rawProps 和 propsOptions 区分出 props 和 attrs
    initProps(instance, rawProps)

    // 元素更新, 操作的 DOM 赋值给新的节点, 即 n2.el = n1.el
    // 组件更新, 组件没有 el, render 函数返回的那个子虚拟节点才是渲染的节点(subTree), 即 n2.component.subTree.el = n1.component.subTree.el

    // 渲染、更新都会走这, 这里其实就是副作用函数, 使用到 state 时, state 就会收集这个副作用函数依赖到 effect 实例上
    const componentUpdateFn = () => {
      // 初始挂载
      if (!instance.isMounted) {
        // call 第 1 个参数表示改变的 this 的引用为这个(因为在声明组件时 render 函数里用到了 this 去访问数据, 所以把这个 this 改变为 state 的引用), 第 2 个参数是被调用函数形参第 1 个参数
        // render 函数返回的"子虚拟节点"(子树)
        const subTree = render.call(state, state)
        // 把"子树"插入到指定位置
        patch(null, subTree, container, anchor)
        instance.isMounted = true
        instance.subTree = subTree
      }
      // 基于状态的组件更新 (比较两个子虚拟节点的差异, 就会走组件的 Diff 算法去比对, 再更新)
      else {
        const subTree = render.call(state, state)
        patch(instance.subTree, subTree, container, anchor)
        instance.subTree = subTree
      }
    }

    // 原本多次修改状态, 就会出发多次渲染, 应该是多次修改状态只渲染更新 1 次
    // 调度函数做延迟, 不是立刻执行, 等同步代码执行完了, 数据更改完了, 再去执行 1 次更新(异步更新), queueJob 函数就是就是把更新函数缓存, 再在微任务里执行 1 次
    const effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update))
    const update = (instance.update = () => effect.run())

    update()
  }

  /** 初始化 props, rawProps 为 "vnode 上的 props", 不是 type(定义组件时, h 函数中第一个参数 type 表示组件对象) 中的 props **/
  const initProps = (instance, rawProps) => {
    const props = {}
    const attrs = {}
    // 组件对象定义的 props
    const { propsOptions } = instance
    
    // 用 rawProps (生成组件虚拟节点定义的 props) 来分裂
    for(const key in rawProps) {
      const value = rawProps[key]
      // 如果组件对象定义的 props 中有这个 key, 应该把他分裂到 propsOptions 中
      if (key in propsOptions) { // 这里可以把 propsOptions[key] 的值 和 rawProps[key] 的值校验关系, 是否是同一个类型, 否则的话就可以放入 attrs, 暂时先不管
        props[key] = value
      } else {
        attrs[key] = value
      }
    }

    instance.props = reactive(props) // 这里其实应该是 shallowReactive, props 不应该是深度代理, 组件不能更改 props 里面的值
    instance.attrs = attrs
  }
  /************************************************************ 处理 组件 流程 ************************************************************/

  /************************************************************ 处理 元素节点 流程 ************************************************************/
  /** 处理元素节点流程 **/
  const processElement = (n1, n2, container, anchor) => {
    // 初始挂载元素
    if (n1 === null) {
      mountElement(n2, container, anchor)
    }
    // 比对差异更新, 后续处理子节点相关
    else {
      patchElement(n1, n2, container)
    }
  }

  /** 处理 vnode **/
  const patchElement = (n1, n2, container) => {
    // 1) 比较元素的差异, 肯定就是复用 DOM
    // 2) 比较元素的属性、元素子节点

    const el = (n2.el = n1.el)
    const { props: oldProps = {} } = n1
    const { props: newProps = {} } = n2

    patchProps(oldProps, newProps, el)
    patchChildren(n1, n2, el)
  }

  /** 处理父级 props(class, style, 事件, 其他属性), el 是指父级 element **/
  const patchProps = (oldProps, newProps, el) => {
    // 新的全部设置 (新旧都有, 直接把旧的替换)
    for(const key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key])
    }

    // 循环旧属性, 在新的上如果没找到, 说明不需要了, 删除掉
    for(const key in oldProps) {
      if (!(key in newProps)) {
        hostPatchProp(el, key, oldProps[key], null)
      }
    }
  }

  /** 处理子元素, el 是指父级 element **/
  const patchChildren = (n1, n2, el) => {
    // 子元素种类: text, [text, text], [vnode, vnode], null
    // 子元素对比:
    // [新的]      [旧的]          [操作方式]
    // ─────────────────────────────────────────────────
    //  文本        数组            删除旧数组, 设置文本
    //  文本        文本            更新文本
    //  文本        空的            更新文本
    // ─────────────────────────────────────────────────
    //  数组        数组            Diff 算法
    //  数组        文本            清空文本, 进行挂载
    //  数组        空的            进行挂载
    // ─────────────────────────────────────────────────
    //  空的        数组            删除旧数组
    //  空的        文本            清空文本
    //  空的        空的            不处理
    // ─────────────────────────────────────────────────
    // 操作:
    // 1) 新的是文本, 老的是数组移除老的
    // 2) 新的是文本, 老的也是文本, 内容不相同替换
    // 3) 老的是数组, 新的是数组, 全量 diff 算法
    // 4) 老的是数组, 新的不是数组, 移除老的子节点
    // 5) 老的是文本, 新的是空
    // 6) 老的是文本, 新的是数组
    const { children: c1, shapeFlag: prevShapeFlag } = n1
    const { children: c2, shapeFlag: shapeFlag } = n2

    // 1) 新的是文本, 老的是数组移除老的
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unMountChildren(c1)
      }

      // 2) 新的是文本, 老的也是文本, 内容不相同替换
      if (c1 !== c2) {
        hostSetElementText(el, c2)
      }
    }
    // 3) 老的是数组, 新的是数组, 全量 diff 算法
    else if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        patchKeyedChildren(c1, c2, el)
      }
      // 4) 老的是数组, 新的不是数组, 移除老的子节点
      else {
        unMountChildren(c1)
      }
    }
    // 5) 老的是文本, 新的是空
    else if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, '')

      // 6) 老的是文本, 新的是数组
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(c2, el)
      }
    }
  }

  /**
   * Vue 3 中分为两种 全量 diff(递归 diff)、快速 diff(靶向更新 -> 基于模板编译的)
   * 通过 Diff 算法比较两个儿子们的差异, 更新父级元素 (这里是全量 Diff)
   * @param el 父级元素
   * 原理步骤:
   * 1) 先挨个从头比对, 相同节点就更新, 不同节点就停止, 再挨个从尾比对, 操作也如此
   * 2) 比完头尾, 通过比对完的索引 i、比对完的尾部索引 e1、e2 (分别代表旧数组 和 新数组比对完最后的索引), 可以得出 头/尾 的部分是否要 增加/删除
   * 3) 比对中间剩余乱序的部分, 旧的比对新的, 旧的多余的节点删除, 新旧都存在的复用更新, 最终按照新的顺序以倒叙方式根据参照物依次插入, 参照物就是插入节点在数组中的下一个节点
   */
  const patchKeyedChildren = (c1, c2, el) => {
    // appendChild, removeChild, insertBefore
    // 1) 减少比对范围, 先从头开始挨个比, 直到发现不一致的, 做记录, 然后再从尾开始挨个比, 确定变化的一个范围
    //       ┏━━━━┓
    // [A, B,┃C, E┃, F, D] 旧的
    //  ↓  ↓ ┃    ┃  ↓  ↓
    // [A, B,┃Q, H┃, F, D] 新的
    //       ┗━━━━┛

    // 2) 从头比对, 再从尾比对, 如果有"多余"的或者"新增"的直接操作即可
    // [A, B, C, E, F]  /  [A, B, C, E]
    // [A, B, C, E]     /  [A, B, C, E, F]

    // [A, B, C]
    // [A, B, D, E]
    let i = 0 // 头部开始比对的索引
    let e1 = c1.length - 1 // 旧 数组的尾部索引
    let e2 = c2.length - 1 // 新 数组的尾部索引

    // ------------------------------------------------------------ 第一步: 先比对头尾相同的部分做更新 ------------------------------------------------------------ //
    // 从头比对:
    // 有任何一方循环结束了, 就要终止比较, 终止前把相同节点就去更新, 其子节点就递归的如此处理
    while(i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      // 相同节点, 就要更新属性, 并且递归的继续比较子节点
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el) // 更新 "当前节点" 和 "儿子节点" 的各个属性 (递归比较子节点)
      } else {
        break
      }
      i++
    }

    // 到 C 的位置终止了
    // 到 D 的位置终止了
    //    C
    // D, E

    // 从尾比对:
    // 有任何一方循环结束了, 就要终止比较, 终止前把相同节点就去更新, 其子节点就递归的如此处理 (新旧数组最后节点下标开始依次递减)
    while(i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      // 相同节点, 就要更新属性, 并且递归的继续比较子节点
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el) // 更新 "当前节点" 和 "儿子节点" 的各个属性 (递归比较子节点)
      } else {
        break
      }

      e1--
      e2--
    }
    // ------------------------------------------------------------ 第一步: 先比对头尾相同的部分做更新 ------------------------------------------------------------ //

    // ---------------------------------------- 第二步: 比完头尾, 通过比对索引 i、数组尾部索引 e1、e2 可以得出 头/尾 增加/删除 ---------------------------------------- //
    // 处理特殊情况: 头部/尾部 增加
    // [A, B]       i = 2, e1 = 1, e2 = 2    -->   i > e1 && i <= e2
    // [A, B, C]    ----- 尾部追加 -----
    //    [A, B]    i = 0, e1 = -1, e2 = 0   -->   i > e1 && i <= e2
    // [C, A, B]    ----- 头部插入 -----

    // 新的多
    if (i > e1) {
      // 有插入的部分
      if (i <= e2) {
        let nextPos = e2 + 1
        // anchor 表示看新 children 数组 e2 下标的下一个元素是否存在, 如果存在表示头部插入, 如果不存在表示尾部追加, 头部插入时 anchor 能访问 .el, 否则尾部 anchor 就找不到, 就追加
        // 上方 头/尾 patch 之后, 相同的节点在 patchElement (更新过程)中会被赋值 el 为真实 DOM, 是从旧 children 每个节点赋值过去的, 所以这里可能可以访问 .el
        let anchor = c2[nextPos]?.el
        
        while(i <= e2) {
          patch(null, c2[i], el, anchor)
          i++
        }
      }
    }

    // 处理特殊情况: 头部/尾部 删除
    // [A, B, C]    i = 2, e1 = 2, e2 = 1    -->   i > e2 && i <= e1
    // [A, B]       ----- 尾部删除 -----
    // [C, A, B]    i = 0, e1 = 0, e2 = -1   -->   i > e2 && i <= e1
    //    [A, B]    ----- 头部删除 -----
    // 新的少
    else if (i > e2) {
      // 有删除的部分
      if (i <= e1) {
        // 
        while(i <= e1) {
          unMount(c1[i])
          i++
        }
        // // 可优化为, 直接截取旧 children 要删除的部分
        // unMountChildren(c1.slice(i, e1 + 1))
        // i = e1 + 1
      }
    }
    // ---------------------------------------- 第二步: 比完头尾, 通过比对索引 i、数组尾部索引 e1、e2 可以得出 头/尾 增加/删除 ---------------------------------------- //
    
    // ---------------------------------------- 第三步: 比对中间剩余乱序的部分, 旧的比对新的, 旧的多余的节点删除, 新旧都存在的复用更新 --------------------------------------- //
    // ----------------------------------------------- 最终按照新的顺序以倒叙方式根据参照物依次插入, 参照物就是插入节点在数组中的下一个节点 ---------------------------------- //
    else {
      console.log(`patchKeyedChildren i:`, i, ` e1:`, e1, ` e2:`, e2)
      // 1) 把索引 i 分别保存新旧数组的索引 s1, s2, 得到 新旧数组的索引的范围 s1 -> e1, s2 -> e2
      let s1 = i,
          s2 = i
      console.log(`patchKeyedChildren s1`, s1,' -> e1 ', e1)
      console.log(`patchKeyedChildren s2`, s2, ' -> e2 ', e2)

      // 2) 用新的部分做一个映射表用于快速查找, 创建 keyToNewIndexMap(节点 key 对应 "索引"), 循环新的部分, 把 vnode 上的 key 和 "索引"存储起来
      const keyToNewIndexMap = new Map()
      // 准备操作的乱序部分数量, 新的部分通过 尾索引 - 头索引 + 1 得到新的乱序部分的节点数量, 也是倒叙插入的数量
      // 这个 +1 是索引相减后是不含尾的, 类似 for let i 循环, 索引比长度小 1 个, 算个数就得 +1
      const toBePatched = e2 - s2 + 1
      // ━━━━━━━━━━━━━━━━━━━━ Diff 优化关键部分 ━━━━━━━━━━━━━━━━━━━━
      // 新的节点索引对应老的节点索引(去除前部、尾部)
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0) // [0, 0, 0, 0]
      // ━━━━━━━━━━━━━━━━━━━━ Diff 优化关键部分 ━━━━━━━━━━━━━━━━━━━━

      for(let i = s2; i <= e2; i++) {
        const vnode = c2[i]
        keyToNewIndexMap.set(vnode.key, i)
      }
      console.log('keyToNewIndexMap:', keyToNewIndexMap)

      // 3) 循环旧的部分, 拿节点去上面的映射表里查找, 没找到说明新的不要这个节点, 这个旧节点要删除, 找到了说明就需要更新
      for(let i = s1; i <= e1; i++) {
        const vnode = c1[i]
        const newIndex = keyToNewIndexMap.get(vnode.key)
        // 找不到的删除
        if (newIndex == undefined) {
          unMount(vnode)
        }
        // 找到了的更新(新旧比对后更新属性, 又递归的比对该节点的儿子节点集)
        else {
          // ━━━━━━━━━━━━━━━━━━━━ Diff 优化关键部分 ━━━━━━━━━━━━━━━━━━━━
          // 根据"新的节点索引"找到对应"老节点的索引"存储, 然后求出最长递增子序列, 根据子序列求出 "索引"
          // newIndex 是新节点数组的真实索引, 要设置到 newIndexToOldMapIndex 上, 要减排除的前部分(s2), 赋值旧的节点真实索引到 newIndexToOldMapIndex 中, 得到 [4, 2, 3, 0]
          // [4, 2, 3, 0] 求它的最长递增子序列, 就是 2 3, 根据子序列可以求出 "索引", 那么 2 3 对应这个数组的索引就是 1、2
          // !!!!! 注意:为了区分 0 索引值, 所以以下 +1, 并不影响结果, 因为求得是序列索引 !!!!!
          // newIndexToOldMapIndex 其实就是对应下方 "4) 调整顺序" 里的 children2 中间倒叙插入的部分, 那么下方 "4) 调整顺序" 倒叙插入部分循环的下标为 1、2 的节点就 "不用移动"
          newIndexToOldMapIndex[newIndex - s2] = i + 1
          // ━━━━━━━━━━━━━━━━━━━━ Diff 优化关键部分 ━━━━━━━━━━━━━━━━━━━━
          patch(vnode, c2[newIndex], el)
        }
      }
      console.log('newIndexToOldMapIndex:', newIndexToOldMapIndex)

      // 根据新节点集求出最长子序列索引, 得出 [1, 2], 那么下面操作时, 下标为 1、2 的不用移动
      const increasingSeq = getSequence(newIndexToOldMapIndex)
      let increasingSeqIndex = increasingSeq.length - 1 // 索引
      
      // 4) 调整顺序(最终以新的部分顺序为准, 通过 insertBefore 倒叙通过倒叙参照物挨个插入)
      // 插入过程中, 新的部分可能更多, 就需要创建节点
      for(let i = toBePatched - 1; i >= 0; i--) {
        // 3, 2, 1, 0
        // 4.1) 新的乱序部分倒叙每轮要插入的 "索引"
        const newIndex = s2 + i
        // 4.2) 新的乱序部分倒叙每轮要插入的 "索引" 的节点
        const vnode = c2[newIndex]
        // 4.3) 新的乱序部分倒叙每轮要插入的 "索引" 的 下一个 "索引" 就是插入的参照物 "索引", .el 就是参照物的 DOM 元素, 有可能是没有的
        const anchor = c2[newIndex + 1]?.el
        // 需新建的节点 (经过上面 3 的步骤就会把复用的节点属性通过比对全部更新, 会在新节点上赋值 el 为真实 DOM, 可通过该属性判断是否是 "新建的节点")
        if (!vnode.el) {
          patch(null, vnode, el, anchor)
        }
        // 已有的节点
        else {
          // 做了 Diff 算法的优化, 当循环到不需要移动的索引时, 跳过
          if (i === increasingSeq[increasingSeqIndex]) {
            increasingSeqIndex--
          }
          // 移动插入
          else {
            hostInsert(vnode.el, el, anchor)
          }
        }
      }
    }
    // ---------------------------------------- 第三步: 比对中间剩余乱序的部分, 旧的比对新的, 旧的多余的节点删除, 新旧都存在的复用更新 --------------------------------------- //
    // ----------------------------------------------- 最终按照新的顺序以倒叙方式根据参照物依次插入, 参照物就是插入节点在数组中的下一个节点 ---------------------------------- //
  }
  /************************************************************ 处理 元素节点 流程 ************************************************************/

  /** 渲染 和 更新都走这里, anchor 如果有值表示在之前插入, 否则就是追加 **/
  const patch = (n1, n2, container, anchor = null) => {
    // 节点完全相同直接跳过
    if (n1 === n2) { return }

    // 旧节点"元素/key" 不同于新节点, 移除老的 DOM, 初始化新的 DOM
    if (n1 && !isSameVnode(n1, n2)) {
      unMount(n1)
      n1 = null // 就会执行后续的 n2 的初始化
    }

    const { type, shapeFlag } = n2
    switch (type) {
      // 文本类型
      case Text:
        processText(n1, n2, container)
        break;
      // Fragment 类型(相当于文档碎片, Vue 2 中必须要用根节点, Vue 3 则可不必, V3 多节点就是基于 Fragment 实现的)
      case Fragment:
        processFragment(n1, n2, container)
        break;
      default:
        // 对元素的处理
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor)
        }
        // 对组件的处理 (函数式组件在 Vue 3 中已经废弃了, 因为没有性能节约, 推荐的是状态组件)
        else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor)
        }
    }
  }

  /** 将虚拟节点变成真实节点进行渲染, 多次调用会进行虚拟节点比较再更新 **/
  const render = (vnode, container) => {
    if (vnode === null) {
      // 我要移除当前容器中的dom元素
      if (container._vnode) {
        unMount(container._vnode)
      }
      return
    }

    patch(container._vnode || null, vnode, container)
    // 存储当次渲染节点到标识位, 下一次渲染时取出做比对
    container._vnode = vnode
  }

  return {
    render
  }
}