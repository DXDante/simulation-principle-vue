// 缓存当前要执行的队列
const queue = []
// 是否正在刷新中(微任务标识)
let isFlashing = false
// 
const resolvePromise = Promise.resolve()

/**
 * 通过时间循环机制, 同一个组件数据改变多次时, 会多次调用更新方法, 把这个更新方法放入队列中并且去重, 等更改数据的同步任务全部执行完, 再执行异步的更新任务
 * @param job 
 */
export const queueJob = (job) => {
  // 1) 如果同时在一个组件中更新多个状态, job 肯定是同一个, 去重同一个任务
  if (!queue.includes(job)) {
    queue.push(job)
  }
  // 2) 不是在刷新中时, 同时开启一个异步任务
  if (!isFlashing) {
    resolvePromise.then(() => {
      isFlashing = true
      // 先拷贝再执行, 防止正在执行此任务时, queue 如果新增了, 可能导致死循环
      const copy = queue.slice(0)
      // 清空队列
      queue.length = 0
      // 更新循环
      copy.forEach(job => job())
      copy.length = 0
    })
  }
}