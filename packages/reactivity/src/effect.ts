import { DirtyLevels } from './constants'
import type { depMapType } from './reactiveEffect'
import { __isObject } from '@vue/shared'

export let activeEffect: null | ReactiveEffect = null

/**
 * 响应式副作用类
 */
export class ReactiveEffect {
  // parent: null | ReactiveEffect Vue 3.4 之前使用
  // fn 副作用函数
  // scheduler 更新副作用的函数
  active: boolean = true // 标识当前创建的 effect 实例是响应式的
  _trackId: number = 0 // 记录当前 effect 执行次数(副作用函数执行次数) (防止一个"属性"在当前 effect 副作用中多次依赖收集)
  deps: depMapType[] = [] // 存放 effect 的依赖收集器集合的数组
  _depsLength: number = 0 // 存放 effect 的依赖收集器集合的数组索引, 可用来判断副作用执行时最新的依赖收集与旧的做简易化 DIFF 算法依赖对比
  _running: number = 0 // 该副作用是否正在执行 run 方法
  // ---------- 计算属性使用 判断当前状态是否是脏值(有几个级别, 目前示例代码使用到 2 个) ----------
  _dirtyLevel: number = DirtyLevels.Dirty // 脏值级别
  // ---------- 计算属性使用 判断当前状态是否是脏值(有几个级别, 目前示例代码使用到 2 个) ----------
  // ---------- 计算属性使用 控制计算属性是否为脏值标识 ----------
  get dirty() {
    return this._dirtyLevel === DirtyLevels.Dirty
  }
  set dirty(value) {
    this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.NoDirty
  }
  // ---------- 计算属性使用 控制计算属性是否为脏值标识 ----------
  run() {
    // 当运行时需要把代理对象的属性 和 effect 副作用关联起来, 准备当前的 effect 实例

    // ---------- 计算属性使用 ----------
    // 用于计算属性, 计算属性 effect 执行后, 设置此标识为不是脏的
    // this._dirtyLevel = DirtyLevels.NoDirty
    this.dirty = false // 可使用属性访问器设置值, 最终再设置 _dirtyLevel 的值
    // ---------- 计算属性使用 ----------

    // 标识不是响应式的, 直接调用副作用执行, 不会去收集依赖
    if (!this.active) {
      return this.fn()
    }

    /**
     * !!!!!!!!!!!!  注意: 前置步骤的行为是为了把"响应式对象的属性"和"effect 实例(最终执行副作用函数)"给正确关联起来, 防止嵌套 !!!!!!!!!!!!
     * 前置步骤方案 一: 设置全局属性, 利用 JS 单线程特性 (!!! 无法规避 effect 嵌套调用问题, 内层 effect 调用完后, 外层接着依赖的属性无法和全局 activeEffect 做关联了, 因为被赋值 null 释放了 !!!)
     * 这里在 effect 副作用执行前把当前实例(副作用类实例)赋值给全局 activeEffect 变量,
     * 执行 fn 时会使用到代理对象的属性, 一旦访问就会触发 getter, 调用 track 函数就能把 "属性" 和 "effect" 副作用关联起来, 就是 "依赖收集",
     * 当 effect 副作用执行完, 就不需要再收集属性依赖了 (因为属性只和使用到的 effect 副作用做关联),
     * 这里执行 effect 副作用时需要返回调用结果, 但是当执行完毕后需要停止属性依赖收集, 需要把全局 activeEffect 变量释放掉, 已经 return 了无法再执行代码了, 所以放在 try finally 里
     */
    // activeEffect = this
    // try {
    //   return this.fn()
    // } finally {
    //   activeEffect = null
    // }

    /**
     * 前置步骤方案 二: 使用栈, 当前副作用执行时收集的依赖属性之关联栈的最后一个, 也就是当前的, 副作用执行完毕就 pop 这个副作用,
     * 那剩下需要收集的也访问栈的最后一个 (可解决上面的问题, Vue 2 就是这样做的, 但是栈需要占用较大的空间)
     */

    /**
     * 前置步骤方案 三: 树结构 (3.4 之前应该是这么做的)
     */
    // this.parent = activeEffect
    // activeEffect = this
    // try {
    //   return this.fn()
    // } finally {
    //   activeEffect = this.parent
    //   this.parent = null
    // }

    /**
     * 前置步骤方案 四: 直接在当前函数作用域创建接收上一轮 effect 对象, 当前 effect 赋值给 actived, 然后 effect 副作用执行完, 将上一轮 effect 赋值给 actived
     */
    let lastEffect = activeEffect
    activeEffect = this
    try {
      // effect 重新执行前, 将上一次的依赖相关数据清空
      preCleanEffect(this)
      this._running++
      // 执行副作用函数, 准备收集使用到的依赖
      return this.fn()
    } finally {
      postCleanEffect(this)
      this._running--
      activeEffect = lastEffect
      lastEffect = null
    }
  }
  // 停止响应式激活, 把状态都设置为初始状态, 再执行 run 方法时直接执行副作用函数
  stop() {
    if (this.active) {
      this.active = false
      preCleanEffect(this)
      postCleanEffect(this)
    }
  }
  static of(fn: Function, scheduler: Function) {
    return new ReactiveEffect(fn, scheduler)
  }
  // 构造函数形参中声明 public 直接会再实例上创建对应的属性
  // fn: 副作用函数
  // scheduler: 调度器(操作执行 run 方法进行渲染)
  constructor(public fn: Function, public scheduler: Function) {
    // this.fn = fn
    // this.scheduler = scheduler
  }
}

/**
 * 创建响应式副作用
 * @param fn 
 * @param options 
 * @returns 
 */
export const effect = (fn: Function, options?: Record<string, any>) => {
  // 将使用者的函数变成响应式的函数, 所以存起来, 直接定义类生成实例管理
  const _effect = ReactiveEffect.of(fn, () => {
    console.log('执行 effect 内置定义的 scheduler 方法, 直接 effect.run()')
    _effect.run()
  })
  // 默认让 effect 副作用执行一次
  _effect.run()

  // 合并副作用实例对应参数选项
  if (__isObject(options)) {
    Object.assign(_effect, options)
  }

  const runner = _effect.run.bind(_effect)
  // run 方法上可以获取到对应的副作用实例
  runner.effect = _effect
  // 外部可以自己触发 run
  return runner
}

/**
 * 预先清空上一轮依赖相关数据
 * @param effect 
 */
const preCleanEffect = (effect: ReactiveEffect) => {
  // 每次执行 ID + 1, 如果当前同一个 effect 执行, 那么 ID 就是相同的
  effect._trackId++
  // 恢复计数, 用于副作用依赖收集对比每一个 Key 与上一轮的 Key
  effect._depsLength = 0
}

/**
 * 后置清理无用的依赖相关数据
 * @param effect 
 */
const postCleanEffect = (effect: ReactiveEffect) => {
  // [flag, name, aaa, bbb, ccc] 上一轮
  //              ∨
  // [flag, age, aaa, bbb, ccc] 当前轮(替换副作用依赖后)
  //              ∨
  // [flag, age] 最终保留
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      // 删除依赖收集器集中多余 Key 的依赖
      cleanDepEffect(effect.deps[i], effect)
    }
    // 更新依赖收集器集长度, 清除多余的收集器
    effect.deps.length = effect._depsLength
  }
}

/**
 * 清理收集器中的依赖
 * @param dep 
 * @param effect 
 */
const cleanDepEffect = (dep, effect) => {
  dep.delete(effect)
  if (dep.size == 0) {
    // 把响应式数据里对应属性映射的收集器(就是这个 dep)也删除引用
    dep.cleanup()
  }
}

/**
 * 将当前 effect 副作用 和 依赖收集器 "相互" 做关联
 * @param effect 当前依赖收集的副作用实例
 * @param dep 当前依赖收集的收集器
 */
export const trackEffect = (effect: ReactiveEffect, dep: depMapType) => {
  // 3.4 采用定义 _trackId 的方式来过滤重复依赖收集, 重新收集依赖, 把不需要的移除
  if (dep.get(effect) !== effect._trackId) {
    // 当前 effect 和 efffect 集关联起来
    // 3.4 之前是 Set 数据机构
    // dep.add(activeEffect)

    // 3.4
    dep.set(effect, effect._trackId)

    // 当更改数据后, effect 实例会调用这个实例上存储的"副作用函数"进行刷新, 然后再次访问到数据, 就会再次执行数据的依赖收集,
    // 如果副作用中条件判断使用的数据, 更新后和更新前使用的变量数据不一样, 例如以下示例:
    // --------------------------------------------------
    // const proxyData = reactive({ name: 'Dante', age: 33, flag: true })
    // effect(() => {
    //   proxyData.flag ? proxyData.name : proxyData.age
    // })
    // setTimeout(() => {
    //   proxyData.flag = false
    // }, 2000)
    // --------------------------------------------------
    // 将会进入例如以下比较, 第 1 轮 flag 对比 flag, 第 2 轮 name 对比 age, 将要收集新的属性依赖, 删除旧属性的依赖 (这里断点可以看到更直观的变化), 这里也就是简易的 diff 算法
    //   顺序无变化         顺序有变化
    //    1     2          1     2
    // { flag, name }   { flag, name }
    //          ∨         ∨     ∨
    // { flag, age }    { age, flag }  // 最新的结果就算收集的顺序不一样, 也是最新的, 正确的
    const oldDep = effect.deps[effect._depsLength]
    if (dep !== oldDep) {
      // 删除旧的依赖收集器里对当前 effect 副作用实例的引用, 因为上方 dep 是新创建, 且存入了当前 effect 副作用实例
      if (oldDep) {
        cleanDepEffect(oldDep, effect)
      }
      // 将依赖收集器设置到当前 effect 的 deps 上保存, 如果是更新执行副作用则是替换了, 永远按照本轮收集的最新顺序来存放
      effect.deps[effect._depsLength++] = dep
    } else {
      effect._depsLength++
    }
  }
}

/**
 * 触发依赖收集器所有依赖更新
 * @param dep 
 */
export const triggerEffects = (dep: depMapType) => {
  for(const effect of dep.keys()) {
    // ---------- 计算属性使用 ----------
    // 当前这个值是不脏的, 但是触发了更新要将值变为脏值
    // 也可以使用这个条件判断 !effect.dirty
    if (/*effect._dirtyLevel < DirtyLevels.Dirty*/!effect.dirty) {
      // effect._dirtyLevel = DirtyLevels.Dirty
      effect.dirty = true // 可使用属性访问器设置值, 最终再设置 _dirtyLevel 的值
    }
    // ---------- 计算属性使用 ----------

    // effect 副作用实例不是正在执行 (解决在触发更新时副作用函数内又再次改变数据进行更新的死循环)
    if (!effect._running && effect.scheduler) {
      // 生成 effect 副作用实例时会传递"更新函数", 这个"更新函数"执行 effect.run 方法, 就调用副作用函数
      effect.scheduler()
    }
  }
}