/**
 * 对节点元素的增删改查
 */

export const nodeOps = {
  // 插入 (如果第三个元素不传递 === appendChild)
  insert: (el, parent, anchor) => parent.insertBefore(el, anchor || null),
  // 移出元素
  remove: (el) => el.parentNode && el.parentNode.removeChild(el),
  // 创建元素
  createElement: (type) => document.createElement(type),
  // 创建文本节点
  createText: (text) => document.createTextNode(text),
  // 文本节点设置文本
  setText: (textNode, text) => textNode.nodeValue = text,
  // 设置元素文本
  setElementText: (el, text) => el.textContent = text,
  // 获取节点父节点
  parentNode: (node) => node.parentNode,
  // 获取下一个元素
  nextSibling: (node) => node.nextSibling
}