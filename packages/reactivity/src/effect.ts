let activeEffect = null

/**
 * 响应式的副作用
 */
class ReactiveEffect {
  parent: null | ReactiveEffect
  deps: [] // 记录那些属性是在 effect 副作用内部调用的
  run() {
    // 当运行时需要把代理对象的属性 和 effect 副作用关联起来

    /**
     * 关联方案 一: 设置全局属性, 利用 JS 单线程特性 (!!! 无法规避 effect 嵌套调用问题, 内层 effect 调用完后, 外层接着依赖的属性无法和全局 activeEffect 做关联了, 因为被赋值 null 释放了 !!!)
     * 这里在 effect 副作用执行前把当前实例(副作用类实例)赋值给全局 activeEffect 变量,
     * 执行 fn 时会使用到代理对象的属性, 一旦访问就会触发 getter, 这样就就能把 "属性" 和 "effect" 副作用关联起来, 就是 "依赖收集",
     * 当 effect 副作用执行完, 就不需要再收集属性依赖了 (因为属性只和使用到的 effect 副作用做关联), 这里执行 effect 副作用时需要返回调用结果,
     * 但是当执行完毕后需要停止属性依赖收集, 需要把全局 activeEffect 变量释放掉, 已经 return 了无法再执行代码了, 所以放在 try finally 里
     */
    // try {
    //   activeEffect = this
    //   return this.fn() 
    // } finally {
    //   activeEffect = null
    // }

    /**
     * 关联方案 二: 使用栈, 当前副作用执行时收集的依赖属性之关联栈的最后一个, 也就是当前的, 副作用执行完毕就 pop 这个副作用,
     * 那剩下需要收集的也访问栈的最后一个 (可解决上面的问题, Vue 2 就是这样做的, 但是栈需要占用较大的空间)
     */

    /**
     * 关联方案 三: 树结构 (3.4 之前应该是这么做的)
     */

    /**
     * 关联方案 四: 直接在当前函数作用域创建接收上一轮 effect 对象, 当前 effect 赋值给 actived, 然后 effect 副作用执行完, 将上一轮 effect 赋值给 actived
     */

    try {
      this.parent = activeEffect
      activeEffect = this
      return this.fn() 
    } finally {
      activeEffect = this.parent
      this.parent = null
    }
  }
  constructor(public fn) {
    this.fn = fn
  }
}

export const effect = (fn) => {
  // 将使用者的函数变成响应式的函数, 所以存起来, 直接定义类生成实例管理
  const _effect = new ReactiveEffect(fn)
  // 默认让 effect 副作用执行一次
  _effect.run()
}