import { ShapeFlags } from "@vue/shared"
import { isSameVnode } from "./createVNode"

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
  const unMount = (vnode) => hostRemove(vnode.el)

  /** 移除子元素 DOM **/
  const unMountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unMount(children[i])
    }
  }

  /** 处理节点流程 **/
  const processElement = (n1, n2, container, anchor) => {
    // 初次渲染
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
   * Vue 3 中分为两种 全量 diff, 递归 diff、快速 diff(靶向更新 -> 基于模板编译的)
   * 通过 Diff 算法比较两个儿子们的差异, 更新父级元素
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
      for(let i = s2; i <= e2; i++) {
        const vnode = c2[i]
        keyToNewIndexMap.set(vnode.key, i)
      }
      console.log(keyToNewIndexMap)
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
          patch(vnode, c2[newIndex], el)
        }
      }
      // 4) 调整顺序(最终以新的部分顺序为准, 通过 insertBefore 倒叙通过倒叙参照物挨个插入)
      // 插入过程中, 新的部分可能更多, 就需要创建节点
      // 新的部分通过 尾索引 - 头索引 + 1 得到新的乱序部分的节点数量, 也是倒叙插入的数量, 这个 +1 是索引相减后是不含尾的, 类似 for let i 循环, 索引比长度小 1 个, 算个数就得 +1
      const toBePatched = e2 - s2 + 1
      for(let i = toBePatched - 1; i >= 0; i--) {
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
          hostInsert(vnode.el, el, anchor)
        }
      }
    }
    // ---------------------------------------- 第三步: 比对中间剩余乱序的部分, 旧的比对新的, 旧的多余的节点删除, 新旧都存在的复用更新 --------------------------------------- //
    // ----------------------------------------------- 最终按照新的顺序以倒叙方式根据参照物依次插入, 参照物就是插入节点在数组中的下一个节点 ---------------------------------- //
  }

  /** 渲染 和 更新都走这里, anchor 如果有值表示在之前插入, 否则就是追加 **/
  const patch = (n1, n2, container, anchor = null) => {
    // 节点完全相同直接跳过
    if (n1 === n2) { return }

    // 旧节点"元素/key" 不同于新节点, 移除老的 DOM, 初始化新的 DOM
    if (n1 && !isSameVnode(n1, n2)) {
      unMount(n1)
      n1 = null // 就会执行后续的 n2 的初始化
    }

    processElement(n1, n2, container, anchor)
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