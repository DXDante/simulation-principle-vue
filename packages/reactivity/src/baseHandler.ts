import { __isAnyObject } from '@vue/shared'
import { track, trigger } from './reactiveEffect'
import { reactive } from './reactive'
import { ReactiveFlags } from './constants'

/**
 * 基础处理器
 */

/**
 * 代理对象处理器
 */
export const proxyHandlers: ProxyHandler<object> = {
  get(target, key, recevier) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return true
    }

    // 依赖收集 (取值时让响应式对象的属性和 effect 副作用映射)
    track(target, key)

    // recevier 是代理对象, 如果使用 target[key] 返回会导致如果被代理的对象有 get xx 的属性访问器中有 this.xx 访问其他属性时导致部分依赖收集丢失
    // 如果使用 recevier[key] 返回会导致 get 方法死循环, 因为重复在访问代理对象的属性
    const res = Reflect.get(target, key, recevier)

    // 懒代理, 当访问的属性是对象/数组时, 就需要再次代理, 即递归代理 (Vue 2 是通过 Object.defineProperties 直接递归设置初始数据属性为响应式)
    if (__isAnyObject(res)) {
      return reactive(res)
    }

    return res
  },
  set(target, key, value, recevier) {
    const oldValue = target[key]
    // 依赖更新/触发更新 (设置属性的值, 找到该属性并让映射的 effect 副作用重新执行)
    if (value !== oldValue) {
      Reflect.set(target, key, value, recevier)
      trigger(target, key, value, oldValue)
    }
    
    return true
  }
}