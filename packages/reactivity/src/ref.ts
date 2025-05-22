import type { depMapType } from './reactiveEffect'
import type { ComputedRefImpl } from './computed'
import { createDep } from './reactiveEffect'
import { activeEffect, trackEffect, triggerEffects } from './effect'
import { toReactive } from "./reactive"

/**
 * Ref 实现类
 */
class RefImpl {
  __v_isRef: boolean = true // ref 标识
  // rawValue // 原始值
  _value // 对应原始值 / 转化为 reactive 的对象
  dep: null | depMapType = null // 依赖收集器
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this.rawValue = newValue
      // 课件代码 (有 BUG, 如果这里赋值为对象类型, 则导致下一次再修改对象下属性的值不会触发依赖更新, 应该再次使用 toReactive 代理)
      // this._value = newValue

      // 自己优化的代码
      this._value = toReactive(newValue)
      triggerRefValue(this)
    }
  }
  static of(value) {
    return new RefImpl(value)
  }
  constructor(public rawValue) {
    this._value = toReactive(rawValue)
  }
}

class ObjectRefImpl {
  __v_isRef: boolean = true // ref 标识
  get value() {
    return this._object[this._key]
  }
  set value(newValue) {
    this._object[this._key] = newValue
  }
  static of(_object, _key) {
    return new ObjectRefImpl(_object, _key)
  }
  constructor(public _object, public _key) {}
}

const createRef = (value): RefImpl => {
  return RefImpl.of(value)
}

export const ref = (value): RefImpl => {
  return createRef(value)
}

// export const shallowRef = () => {}

/**
 * Ref 依赖收集
 * @param ref ref 实例
 * @returns 
 */
export const trackRefValue = (ref: RefImpl | ComputedRefImpl) => {
  if (!activeEffect) { return }
  // 把当前的 effect 副作用实例 和 依赖收集器关联起来
  trackEffect(activeEffect, (ref.dep = ref.dep || createDep(() => ref.dep = null, 'refKey')))
}

/**
 * Ref 依赖更新
 * @param ref ref 实例
 */
export const triggerRefValue = (ref: RefImpl | ComputedRefImpl) => {
  const { dep } = ref
  if (!dep) { return }
  triggerEffects(dep)
}

/**
 * 将代理对象的属性转换为 ref 类型
 * name.value => state.data.info.name, 这个逻辑示例相当于帮你访问代理对象下的某个属性, 并没有什么操作
 */
export const toRef = (_object, _key): ObjectRefImpl => {
  return ObjectRefImpl.of(_object, _key)
}

export const toRefs = (_object): Record<string|number, ObjectRefImpl> => {
  // 课件代码定义 res 返回对象, 使用 for in 遍历设置属性, 将单个设置为 ObjectRefImpl 类型的数据

  // 自定义代码
  const keys = Object.keys(_object)
  return keys.reduce((res, key) => {
    res[key] = toRef(_object, key)
    return res
  }, {})
}

/**
 * 一般只在模版编译中使用, 即解包行为, 比如: {{ name }} => {{ name.value }}
 * 将 toRefs 后的结构转化为 proxy 结构, 简化代理对象属性访问时需要 .value
 * @param objectWithRef 属性为 Ref 的对象, 如果属性为普通数据则不具备响应式功能
 * @returns 
 */
export const proxyRefs = (objectWithRef) => {
  return new Proxy(objectWithRef, {
    get (target, key, receiver){
      const res = Reflect.get(target, key, receiver)
      return res.__v_isRef ? res.value : res
    },
    set (target, key, value, receiver){
      const res = target[key]
      const isRef = res.__v_isRef || false
      const oldValue = isRef ? res.value : res

      // 自定义添加值判断
      if (value === oldValue) { return true }
      if (isRef) {
        res.value = value
        return true
      }

      return Reflect.set(target, key, value, receiver)
    }
  })
}