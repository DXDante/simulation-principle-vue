import { currentInstance, setCurrentInstance, unsetCurrentInstance } from './component'

export const enum lifeCycles {
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u'
}

// 钩子可以多次调用, 多次都要关联到实例上, m => [fn1, fn2]
const createHook = (type: lifeCycles) => {
  // 将当前实例存放到此钩子上(钩子函数都在 setup 阶段调用, 所以在调用中形参 target 就可以获取到对应组件的实例, 并保存在这个局部变量中, 就是闭包, 这个 hook 就对应了这个组件的实例)
  return (hook, target = currentInstance) => {
    // 当前钩子是在组件 setup 阶段运行的
    if (target) {
      // 创建关联, 每个类型的生命周期存在实例上, 看当前的钩子是否存放 (发布订阅)
      const hooks =  target[type] || (target[type] = [])

      // 还是利用闭包把 currentInstance 存到这个函数内
      const wrapHook = () => {
        // 钩子执行前对实例进行校正处理, 执行完重置, 这样在钩子内部调用 getCurrentInstance 就能正确获取实例
        setCurrentInstance(target)
        hook.call(target)
        unsetCurrentInstance()
      }

      // 在执行函数 hook 内部保证实例是正确的, (这里有坑, 在 setup 阶段执行完成后, 会清空 currentInstance)
      hooks.push(wrapHook)
    }
  }
}

export const onBeforeMount = createHook(lifeCycles.BEFORE_MOUNT)
export const onMounted = createHook(lifeCycles.MOUNTED)
export const onBeforeUpdate = createHook(lifeCycles.BEFORE_UPDATE)
export const onUpdated = createHook(lifeCycles.UPDATED)

// 生命周期调用方法
export const invokeArray = (fns: Function[]) => {
  for(let i = 0; i < fns.length; i++) {
    fns[i]()
  }
}