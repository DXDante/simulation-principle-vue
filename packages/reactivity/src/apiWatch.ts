import { __isFunction, __isObject } from "@vue/shared"
import { ReactiveEffect } from "./effect"
import { isReactive } from "./reactive"
import { isRef } from "./ref"
interface IWatchCallback {
  (oldValue: unknown, newValue: unknown, onCleanup: (fn: Function) => void): unknown
}
interface IWatchOptions {
  deep?: boolean
  immediate?: boolean
}

/**
 * 递归遍历属性
 * @param source 
 * @param depth 
 * @param currentDepth 控制 depth 当前已经遍历到哪一层
 * @param seen 
 */
const traverse = (source, depth: number | undefined, currentDepth = 0, seen = new Set()) => {
  if (!__isObject(source)) { return source }
  // 遍历限定的指定层级直接返回源数据, 深度标识都是每层遍历前累加, 所以初始遍历前已经指定为 1 层了
  if (depth) {
    if (currentDepth >= depth) {
      return source
    }
    currentDepth++
  }
  // 检查数据是否已经遍历过, 这里防止递归引用造成的遍历死循环
  if (seen.has(source)) {
    return source
  }
  // 遍历会使用到属性, 就会触发 get 收集 watch 传递的副作用函数
  for (const key in source) {
    traverse(source[key], depth, currentDepth, seen)
  }
  return source
}

/**
 * watch 实现
 * @param source 
 * @param cb 
 * @param param2 
 */
const doWatch = (source, cb: IWatchCallback|null, { deep, immediate }: IWatchOptions) => {
  // 实现 source 转变成 getter (副作用函数, 而这个副作用函数内部会遍历数据的每个属性进行依赖收集)

  // const reactiveGetter = (source) => traverse(source, deep === false ? 1 : undefined)

  let getter = () => {}, oldValue;

  if (isReactive(source)) {
    // 创建一个可以给 ReactiveEffect 使用的 getter, 需要对这个对象进行遍历取值操作, 会关联当前的 reactiveEffect
    // getter = () => reactiveGetter(source)
    // getter 函数可以把上面的优化成以下, TODO: 后面做传递 getter 来实现访问数据
    getter = () => traverse(source, deep === false ? 1 : undefined)
  } else if (isRef(source)) {
    getter = () => source.value
  } else if (__isFunction(source)) {
    getter = source
  }

  // 实现清理函数
  let clean: null|Function = null;
  const onCleanup = (fn) => {
    if (!__isFunction(fn)) { return }
    // 创建函数, 函数内部调用外部传入的函数
    clean = () => {
      fn()
      clean = null
    }
  }

  // 调度器
  const job = () => {
    // 没有回调一般表示 watchEffect
    if (!cb) {
      effect.run()
      return
    }
    // 重新执行副作用函数重新依赖收集和获取到最新的值
    const newValue = effect.run()
    // 在调用调用回调前, 把上一次的清理函数执行
    if (clean) { clean() }
    cb(oldValue, newValue, onCleanup)
    oldValue = newValue
  }

  const effect = new ReactiveEffect(getter, job)
  const unwatch = () => {
    effect.stop()
  }

  // 没有回调一般表示 watchEffect
  if (cb) {
    // 立即执行回调, 执行一遍 run 后就依赖收集
    if (immediate) {
      job()
    } else {
      // 调用 run 就是执行生成的 getter / 传入的监听的 getter, 执行就会访问到数据, 就会做依赖收集
      oldValue = effect.run()
    }
  } else {
    // watchEffect 的实现, 直接 run, 在副作用函数里使用到的数据会收集这个副作用函数, 其实就是 ReactiveEffect, 只是包装了一层
    effect.run()
  }

  return unwatch
}

/**
 * 监听
 * @param source 
 * @param cb 
 * @param options 
 * @returns 
 */
export const watch = (source, cb: IWatchCallback, options: IWatchOptions = {}) => {
  return doWatch(source, cb, options)
}

/**
 * 监听副作用
 * @param cb 
 */
export const watchEffect = (source: Function, options: IWatchOptions = {}) => {
  return doWatch(source, null, options)
}