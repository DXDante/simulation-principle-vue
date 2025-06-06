import { ref } from "@vue/reactivity"
import { __isFunction, __isPromise } from "@vue/shared"
import { h } from "./h"

export const defineAsyncComponent = (options) => {
  if (__isFunction(options)) {
    options = { loader: options }
  }

  return {
    setup() {
      let component = null
      let attempts = 0 // 加载失败次数
      const { loader, errorComponent, timeout, delay, loadingComponent, onError } = options
      const loaded = ref(false) // 成功的
      const errored = ref(false) // 失败的
      const loading = ref(false) // 加载中
      const loadingTimer = ref(null) // 延迟多少开启加载中
      const placeHolder = h('div', '') // 默认占位

      const loadFunc = () => {
        // 递归的利用 Promise 链
        return loader().catch(err => {
          // 手动处理异常
          if (__isFunction(onError)) {
            return new Promise((resolve, reject) => {
              const retry = () => resolve(loadFunc())
              const fail = () => reject(err)
              onError(err, retry, fail, ++attempts)
            })
          }
          // 继续传递错误
          throw err
        })
      }
      const loaderRes = loadFunc()

      if (__isPromise(loaderRes)) {
        loaderRes.then(comp => {
          component = comp
          loaded.value = true
        }).catch(() => {
          errored.value = true
          throw new Error('组件加载失败')
        }).finally(() => {
          loading.value = false
          clearTimeout(loadingTimer.value)
          loadingTimer.value = null
        })
      }

      if (delay > 0) {
        loadingTimer.value = setTimeout(() => {
          loading.value = true
        }, delay);
      }

      if (timeout > 0) {
        setTimeout(() => {
          errored.value = true
          throw new Error('组件加载超时')
        }, timeout);
      }

      return () => {
        // 渲染加载的组件
        return loaded.value
          ? h(component)
          // 渲染加载失败/超时的组件
          : errored.value && errorComponent
          ? h(errorComponent)
          // 渲染加载中组件
          : loading.value && loadingComponent
          ? h(loadingComponent)
          // 渲染占位组件
          : placeHolder
      }
    }
  }
}