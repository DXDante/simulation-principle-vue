/**
 * 检测是否是代理对象的属性集
 */
export enum ReactiveFlags {
  IS_REACTIVE = '__v_isReactive'
}

export enum DirtyLevels {
  // 脏值, 取值要运行计算属性的 effect 函数
  Dirty = 4,
  // 不是脏值就用上一轮返回的结果(缓存)
  NoDirty = 0
}