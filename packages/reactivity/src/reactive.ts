import { proxyHandlers } from './baseHandler'
import { __isAnyObject } from '@vue/shared'
import { ReactiveFlags } from './constants'

/**
 * 代理对象缓存集 (被代理的对象 和 代理对象的映射表)
 */
const proxyCacheMap = new WeakMap()

/**
 * 创建响应式对象
 * @param target 
 * @returns
 */
const createReactiveObject = (target) => {
  // 不是对象/数组直接返回原值
  if (!(__isAnyObject(target))) { return target }

  // 检查源数据是否是代理对象 (访问指定的属性时, 能走 getter 说明这个对象是被代理过的, 直接返回, 防止多次代理)
  if (target[ReactiveFlags.IS_REACTIVE]) { return target }

  // 查询代理缓存集, 如果有同源数据直接返回, 防止创建多次代理
  const cachedProxy = proxyCacheMap.get(target)
  if (cachedProxy) { return cachedProxy}
  
  // 创建代理对象
  const proxy = new Proxy(target, proxyHandlers)

  // 存储代理对象至缓存
  proxyCacheMap.set(target, proxy)

  return proxy
}

export const reactive = (target) => {
  return createReactiveObject(target)
}

// export const shallowReactive = () => {}

/**
 * 将数据转换为 reactive
 * @param value 
 * @returns 
 */
export const toReactive = (value) => {
  return __isAnyObject(value) ? reactive(value) : value
}

/**
 * 是否是 reactive 的代理对象
 * @param value 
 */
export const isReactive = (value) => {
  return value && !!(value[ReactiveFlags.IS_REACTIVE])
}