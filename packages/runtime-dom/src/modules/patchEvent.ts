/**
 * div onClick=fn1  =>  div onClick=fn2, 移出事件、添加事件
 * div onClick=() => fn1
 * @param value 
 */

/**
 * 创建函数调用器
 * @param value 
 */
const createInvoker = (value) => {
  // return (e) => value() // 这样写死了

  const invoker = (e) => invoker.value(e)
  // 更改 invoker 的 value 属性可以修改对应的调用函数
  invoker.value = value
  return invoker
}

/**
 * 利用调用器解决平凡的对 DOM 添加、移除事件, 只需要设置调用器调用函数的值
 * @param el 
 * @param name 
 * @param nextValue 
 * @returns 
 */
const patchEvent = (el, name, nextValue) => {
  // vue_event_invoker, 事件缓存集(事件名 => 事件处理器)
  const invokers = el._vei || (el._vei = {})
  // 事件名称
  const eventName = name.slice(2).toLowerCase()
  // 同名事件缓存的处理器
  const exisitingInvoker = invokers[name]
  
  // 同名事件换绑处理器
  if (exisitingInvoker && nextValue) {
    return (exisitingInvoker.value = nextValue)
  }
  // 新添加事件处理器
  if (nextValue) {
    const invoker = (invokers[name] = createInvoker(nextValue))
    return el.addEventListener(eventName, invoker)
  }
  // 解除事件处理器 (以前有绑定, 现在没有绑定)
  if (exisitingInvoker) {
    el.removeEventListener(eventName, exisitingInvoker)
    invokers[name] = undefined
  }
}

export default patchEvent