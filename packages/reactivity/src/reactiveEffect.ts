import type { ReactiveEffect } from './effect'
import { activeEffect, trackEffect, triggerEffects } from './effect'

export type targetMapType = WeakMap<WeakKey, depsMapType>
// 3.4 之前使用的 Set 存储副作用
// type depsMapType = Map<string | symbol, depSetType>
// type depSetType = Set<ReactiveEffect>
export type depsMapType = Map<string, depMapType>
export type depMapType = Map<ReactiveEffect, ReactiveEffect | number>

// 对象、属性 和 effect 收集器关联表
const targetMap = new WeakMap<targetMapType>()

/**
 * 创建 effect 集 (3.4 之后被提出来的, 用于清理依赖)
 * @param cleanup 清理函数
 * @param key 源码中没有, 在调试中方便看到清理的哪个属性
 * @returns 
 */
export const createDep = (cleanup: Function, key?: string | symbol): depMapType => {
  // // 3.4 之前使用的是 Set
  // return new Set()

  // 3.4 开始为了做属性依赖的清理, 所以用了 Map
  const dep = new Map() as any
  dep.cleanup = cleanup
  dep.key = key
  return dep
}

/**
 * 依赖收集
 * @param target 被代理对象
 * @param key 被代理对象属性
 * 
 * 数据结构 WeakMap = { key: value } => Map
 *         Map = key => Set
 *         Set = i => effectInstance
 */
export const track = (target: any, key: string | symbol) => {
  // 如果当前没有副作用函数, 不做依赖收集
  if (!activeEffect) { return }

  // 在对象关联表中找被代理对象, 否则创建新的 "属性关联表" 关联 "effect" 集的表
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  // 在属性关联表中找 effect 集, 否则创建新的 effect 集
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(
      key,
      // 开始创建依赖收集器, 3.4 开始创建用于清理这个属性的依赖收集器 (可后续实现某些场景下不需要再使用响应式更新的功能了)
      (dep = createDep(() => depsMap.delete(key), key))
    )
  }

  // // 3.4 之前在这里判断重复的收集依赖, 在 effect 集中找是否存在(存在说明依赖被收集过), 否则把这个 effect 存入, 因为之前使用的 Set 可以直接去重
  // const shouldTrack = !dep.has(activeEffect)
  // if (shouldTrack) {
  //   trackEffect(activeEffect, dep)
  // }

  // 3.4 开始
  trackEffect(activeEffect, dep)
}

/**
 * 依赖更新
 */
export const trigger = (target: any, key: string | symbol, value: any, oldValue: any) => {
  const depsMap = targetMap.get(target)
  if (!depsMap) { return }

  const dep = depsMap.get(key)
  if (!dep) { return }

  triggerEffects(dep)
}