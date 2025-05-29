import { reactive } from '@vue/reactivity'
import { __hasOwnProperty, __isFunction } from '@vue/shared'

/**
 * 创建组件实例
 * @param vnode 
 */
export const createComponentInstance = (vnode) => {
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
    attrs: {},
    proxy: null, // 用来代理 props, attrs, data 中的数据, 让使用者更方便的访问
    render: null
  }

  // // 组件状态, 拿到数据创建响应式
  // const state = reactive(data() || {})

  return instance
}

export const setupComponent = (instance) => {
  const { vnode } = instance
  const { type, props: rawProps = {}, children } = vnode
  const { data = () => {}, render } = type

  // 根据 rawProps 和 propsOptions 区分出 props 和 attrs
  initProps(instance, rawProps)

  // 代理 props, attrs, data 中的数据(源码中有严格的取值顺序)
  // data 定义的属性 和 props 定义的属性重名的话, 应该是要给出提示的
  instance.proxy = new Proxy(instance, instanceProxyHandler)

  // 组件状态, 拿到数据创建响应式
  if (!__isFunction(data)) { return console.warn('data option mast be a function') }

  instance.data = reactive(data.call(instance.proxy) || {})
  instance.render = render
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

const instanceProxyHandler = {
  get(target, key) {
    const { data, props } = target
    if (__hasOwnProperty(data, key)) { return data[key] }
    if (__hasOwnProperty(props, key)) { return props[key] }
    // 对于一些无法修改的属性($attrs, $slots)
    // 通过不同的策略来访问对应的方法
    const getter = publicProperty[key]
    if (getter) {
      return getter(target)
    }
  },
  set(target, key, value) {
    const { data, props } = target
    
    if (__hasOwnProperty(data, key)) {
      data[key] = value
    }
    if (__hasOwnProperty(props, key)) {
      // 使用者可以属性中嵌套的属性, 内部不会报错(但是不合法)
      // props[key] = value
      console.warn('props is readonly')
      return false
    }
    return true
  }
}

// 公共属性获取器
const publicProperty = {
  $attrs: (instance) => instance.attrs
}