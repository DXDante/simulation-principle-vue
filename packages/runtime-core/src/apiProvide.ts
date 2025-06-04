import { currentInstance } from "./component"

/** 设置依赖 **/
export const provide = (key, value) => {
  // 将 c1 的 provide 赋给 c2, c2 的 provide 赋给 c3
  // c1 -> c2 -> c3
  // c3 只需要在 c2 上获取到保存就行了, 不需要一级一级往上找
  //      父                   子 (子组件如果继续添加了依赖数据, 不会影响父级的, 所以子组件应该是从父级拷贝的数据)
  // { data1: 1 }   { data1: 1, data2: 2 }
  // { data1: 1 }   { data1: 1, data2: 2, data3: 3 } //

  // 建立在组件基础上的, 如果获取不到组件实例, 说明不在 setup / 生命周期阶段使用
  if (!currentInstance) { return }

  // 获取父级的 provides
  const parentProvides = currentInstance.parent?.provides
  // 当前组件的 provides
  let provides = currentInstance.provides
  // 当组件使用了 provide api 添加数据的时候, 就把父级的 provides 拷贝一份
  // provide('name') => 这时就拷贝了
  // provide('age') => 这时直接赋值
  if (parentProvides === provides) {
    // 子组件上如果新增了 provides, 需要拷贝一份全新的 (这里当前的 和 父级是引用关系, 是一样的, 所以直接取自己进行拷贝即可)
    provides = currentInstance.provides = Object.create(provides)
  }

  provides[key] = value
}

/** 依赖注入 **/
export const inject = (key, defaultValue) => {
  // 建立在组件基础上的, 如果获取不到组件实例, 说明不在 setup / 生命周期阶段使用
  if (!currentInstance) { return }

  const provides = currentInstance.parent?.provides
  // 从父级的 provides 中取到 inject 的值
  if (provides && key in provides) {
    return provides[key]
  }
  // 就算父级没有 provide, 这里也可以 inject 到默认值
  return defaultValue
}