import { __isArray, __isObject } from '@vue/shared'
import { createVNode, isVnode } from './createVNode'

/**
 * 创建 Virtual DOM
 * 该方法是表层方法, 实际创建节点是 createVNode, 以下对函数重载做处理
 * @param type 
 * @param propsOrChildren 
 * @param children 
 */
export function h(type, propsOrChildren?, children?) {
  const { length } = arguments

  if (length == 2) {
    // h(div, 虚拟节点 | 属性)
    if (__isObject(propsOrChildren) && !__isArray(propsOrChildren)) {
      // h(div, 虚拟节点)
      if (isVnode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      // h(div, 属性)
      return createVNode(type, propsOrChildren)
    }
    // h(div, 数组 | 文本)
    return createVNode(type, null, propsOrChildren)
  }
  // 参数为 3 / 3+
  else {
    // h(div, 属性, 节点, 节点...)
    // h(div, 属性, [节点, 节点], [节点]) // 变态写法 >_<, 拍平一层
    if (length > 3) {
      children = Array.from(arguments).slice(2).flat()
    }
    // h(div, 属性, 节点)
    if (length == 3 && isVnode(children)) {
      children = [children]
    }
    // h(div, 属性, 数组 | 文本)
    return createVNode(type, propsOrChildren, children)
  }
}