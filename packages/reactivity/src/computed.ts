// 描述实现原理:
// 1) 计算属性维护了一个 dirty 属性, 默认就是 true, 稍后运行过一次会将 dirty 变为 false, 并且稍后依赖的值变化后会再次让 dirty 变为 true
// 2) 计算属性也是一个 effect(computedEffect), 依赖的属性会收集这个计算属性, 当依赖值变化后, 会让 computedEffect 里面 dirty 变为 true
// 3) 计算属性具备收集能力的, 可以收集对应的 effect, 依赖的值变化后会触发 effect 重新执行

// 计算属性运行流程:
// 1) 调用 computed 函数返回 ComputedRefImpl 实例, 构造函数中创建计算属性 effect, 副作用函数就是传递给 computed 函数的参数/参数对象里的 get 方法 和 触发更新的调度器(scheduler)
// 2) 当外部 effect(组件/组件模板编译后的产物)执行传入副作用函数时, 访问到这个计算属性的值, 也就是 .value 时, 会触发 ComputedRefImpl 实例的 get 方法
// 3) 第 1 次访问时默认这个计算属性 effect 上的 dirty 为 true, 表示是脏的, 需要执行计算属性 effect 的 run 方法(调用传入的"副作用函数"), 这时使用到的"响应式数据"会 和 这个"副作用函数"做依赖收集(数据收集计算属性 efffect)
// 4) 然后把这个计算属性 和 外部 effect 关联起来(计算属性的收集外部 effect)
// 4) 当计算属性副作用函数内部使用的数据有变化时, 就会触发更新, 调用对应的这个计算属性 effect 的 scheduler(调度器), 这个调度器内部就触发更新, 调用对应的外部 effect 的 scheduler, 触发更新时会把 effect 上的 dirty 值置为脏的
// 5) 当外部 effect 副作用函数执行时, 访问到这个计算属性, 就会走计算属性的 get 方法, 这时计算属性的 dirty 为脏, 就要重新执行计算属性 effect 的副作用函数, 然后依赖收集如上面流程, 得到新的结果返回

import type { depMapType } from './reactiveEffect'
import { __isFunction } from '@vue/shared'
import { ReactiveEffect } from './effect'
import { trackRefValue, triggerRefValue } from './ref'

type ComputedOptions = { get: Function, set?: Function }
export type Computed = Function | ComputedOptions

export class ComputedRefImpl {
  _value // 计算属性的值
  effect: ReactiveEffect // 副作用实例
  dep: depMapType
  static of(getter, setter) {
    return new ComputedRefImpl(getter, setter)
  }
  get value() {
    // 1) 默认取值(第 1 次取值), dirty 是脏的, 执行副作用 run 后 dirty 被赋值不是脏的
    if (this.effect.dirty) {
      // 1.1
      this._value = this.effect.run()
      // 1.2) 如果当前在 effect 中使用了计算属性, 那么计算属性要收集这个 effect
      trackRefValue(this)
      return this._value
    }
    // 2) 不是脏的直接取上一次返回的结果
    return this._value
  }
  set value(value) {
    this.setter(value)
  }
  constructor(public getter, public setter) {
    // 创建"计算属性 effect"来管理这个计算属性的 dirty 属性
    this.effect = ReactiveEffect.of(
      // 副作用函数
      () => getter(this._value),
      // 调度器
      () => {
        // 计算属性依赖的值变化了, 应该触发"渲染 effect"重新执行 (需要把 effect 的 dirty 属性设置为脏值, 让它重新计算)
        triggerRefValue(this)
      }
    )
  }
}

export const computed = (getterOrOptions: Computed): ComputedRefImpl => {
  const onlyGetter = __isFunction(getterOrOptions)
  const defaultSetter = () => {}
  let getter, setter

  if (onlyGetter) {
    getter = getterOrOptions
    setter = defaultSetter
  } else {
    const { get, set } = getterOrOptions as ComputedOptions
    getter = get
    setter = set || defaultSetter
  }

  return ComputedRefImpl.of(getter, setter)
}