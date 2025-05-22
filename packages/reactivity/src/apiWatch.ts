import { ReactiveEffect } from "./effect"

interface IWatchCallback {
  (oldValue: unknown, newValue: unknown): unknown
}
interface IWatchOptions {
  deep?: boolean
}

const doWatch = (source, cb: IWatchCallback, { deep }: IWatchOptions) => {
  const reactiveGetter = (source) => traverse(source, deep)
  // 创建一个可以给 ReactiveEffect 使用的 getter, 需要对这个对象进行取值操作, 会关联当前的 reactiveEffect
  let getter = () => reactiveGetter(source)

  new ReactiveEffect(getter, () => {
    cb(1, 2)
  })
}

/**
 * 
 * @param source 
 * @param depth 
 * @param currentDepth 控制 depth 当前已经遍历到哪一层
 */
const traverse = (source, depth, currentDepth = 0) => {

}

export const watch = (source, cb: IWatchCallback, options: IWatchOptions = {}) => {
  return doWatch(source, cb, options)
}