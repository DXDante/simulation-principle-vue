import { proxyRefs, reactive } from '@vue/reactivity'
import { __hasOwnProperty, __isFunction, ShapeFlags } from '@vue/shared'

/**
 * 创建组件实例
 * @param vnode 
 */
export const createComponentInstance = (vnode, parent) => {
  // 组件可以依据自己的状态重新渲染, 组件其实就是 effect
  // 解构 type, props 就是提供给组件的数据(类似于创建元素提供的属性数据), children 就是组件的插槽
  const { type: { props: propsOptions = {} } } = vnode
  // 组件标识位实例(它不是 new 出来的那种, 存放关于组件的一些数据)
  const instance = {
    data: null, // 组件状态
    vnode, // 组件虚拟节点
    subTree: null, // 组件子树, 组件节点 render 返回的子节点
    isMounted: false, // 组件是否挂载完成
    update: null, // 组件更新函数(effect 的调度函数)
    component: null,
    props: {}, // rawProps 分裂出来不包含 propsOptions 中 key 的属性
    propsOptions, // 组件虚拟节点定义的 props 选项
    attrs: {}, // 普通属性
    slots: {}, // 插槽
    proxy: null, // 用来代理 props, attrs, data 中的数据, 让使用者更方便的访问
    render: null, // 渲染函数
    setupState: {}, // setup 返回对象的数据
    exposed: null, // 暴露的数据
    parent,
    // component1 -> component2 -> component3, 后代的所有组件 provide 都一样, 因为每个组件的 provide 取自父级
    // parent = {}, child = 引用 parent 的
    // child 增加 provide, 创建拷贝对象再赋值 const newProvides = Object.create(引用 parent 的), newProvides[key] = value
    provides: parent ? parent.provides : Object.create(null),
    ctx: {} as Record<string, any> // 如果是 KeepAlive 组件, 就将 DOM api 放入到这个属性上
  }

  // // 组件状态, 拿到数据创建响应式
  // const state = reactive(data() || {})

  return instance
}

/** 启动组件 **/
export const setupComponent = (instance) => {
  const { vnode } = instance
  const { type, props: rawProps = {}, children } = vnode
  const { data = () => {}, render, setup } = type

  // 根据 rawProps 和 propsOptions 区分出 props 和 attrs
  initProps(instance, rawProps)
  //
  initSlots(instance, children)

  // 代理 props, attrs, data 中的数据(源码中有严格的取值顺序)
  // data 定义的属性 和 props 定义的属性重名的话, 应该是要给出提示的
  instance.proxy = new Proxy(instance, instanceProxyHandler)

  // 组件启动器
  if (setup && __isFunction(setup)) {
    const setupContext = {
      // 属性
      attrs: instance.attrs,
      // 插槽
      slots: instance.slots,
      // 事件派发
      emit(event: string, ...payload) {
        const { vnode: { props: vnodeProps } } = instance
        const eventName = `on${event[0].toUpperCase()}${event.substring(1)}`
        // 从组件实例虚拟节点上找到原始 "事件属性"
        const hanler = vnodeProps[eventName]
        console.log('instance.vnode.props 传递进子组件的自定义事件函数:', instance.vnode.props)
        if (__isFunction(hanler)) {
          hanler(...payload)
        }
      },
      expose(value) {
        instance.exposed = value
      }
    }

    // setup 调用前吧实例设置到全局, 执行完后清除
    setCurrentInstance(instance)
    const setupResult = setup(instance.props, setupContext)
    unsetCurrentInstance()

    // 返回渲染函数
    if (__isFunction(setupResult)) {
      instance.render = setupResult
    }
    // 返回数据对象, 将值做脱 ref 操作
    else {
      instance.setupState = proxyRefs(setupResult)
    }
  }

  // 组件状态, 拿到数据创建响应式
  if (!__isFunction(data)) {
    console.warn('data option mast be a function')
  } else {
    instance.data = reactive(data.call(instance.proxy) || {})
  }
  // 没有在 setup 中设置过 render, 则使用定义的 render 方法
  if (!instance.render) {
    instance.render = render
  }
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
    // 这里可以把 propsOptions[key] 的值 和 rawProps[key] 的值校验关系, 是否是同一个类型, 否则的话就可以放入 attrs, 暂时先不管
    if (key in propsOptions) {
      props[key] = value
    } else {
      attrs[key] = value
    }
  }

  instance.props = reactive(props) // 这里其实应该是 shallowReactive, props 不应该是深度代理, 组件不能更改 props 里面的值
  instance.attrs = attrs
}

/** 初始化插槽 **/
const initSlots = (instance, children) => {
  const { vnode } = instance
  const { shapeFlag } = vnode
  if (shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children
  }
}

const instanceProxyHandler = {
  get(target, key) {
    const { data, props, setupState } = target
    if (__hasOwnProperty(data, key)) { return data[key] }
    if (__hasOwnProperty(props, key)) { return props[key] }
    if (__hasOwnProperty(setupState, key)) { return setupState[key] }
    // 对于一些无法修改的属性($attrs, $slots)
    // 通过不同的策略来访问对应的方法
    const getter = publicProperty[key]
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { data, props, setupState } = target
    
    if (__hasOwnProperty(data, key)) {
      data[key] = value
    }
    if (__hasOwnProperty(props, key)) {
      // 使用者可以属性中嵌套的属性, 内部不会报错(但是不合法)
      // props[key] = value
      console.warn('props is readonly')
      return false
    }
    if (__hasOwnProperty(setupState, key)) {
      setupState[key] = value
    }
    return true
  }
}

// 公共属性获取器
const publicProperty = {
  $attrs: (instance) => instance.attrs,
  $slots: (instance) => instance.slots
}

// 当前组件实例, 用于"生命周期钩子" 关联 当前组件实例(做法类似于响应式数据的依赖收集)
export let currentInstance = null

export const getCurrentInstance = () => {
  return currentInstance  
}

export const setCurrentInstance = (instance) => {
  currentInstance = instance
}

export const unsetCurrentInstance = () => {
  currentInstance = null
}