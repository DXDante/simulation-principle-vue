/**
 * 对节点元素的属性操作 (class, style, event(事件)、attr)
 */

import patchClass from './modules/patchClass'
import patchStyle from './modules/patchStyle'
import patchEvent from './modules/patchEvent'
import patchAttr from './modules/patchAttr'

const eventLintReg = /^on[^a-z]/

const patchProp = (el, key, prevValue, nextValue) => {
  // class
  if (key === 'class') {
    return patchClass(el, nextValue)
  }
  // 样式
  if (key === 'style') {
    return patchStyle(el, prevValue, nextValue)
  }
  // 事件
  if (eventLintReg.test(key)) {
    return patchEvent(el, key, nextValue)
  }
  // 属性
  return patchAttr(el, key, nextValue)
}

export default patchProp