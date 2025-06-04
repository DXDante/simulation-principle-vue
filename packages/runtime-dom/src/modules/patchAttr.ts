const patchAttr = (el, key, value) => {
  // 当渲染是 DOM 元素时, 在元素上通过 ref 获取 DOM, 这时 ref 属性不应该设置在 DOM 元素上, 这里简易处理
  if (key === 'ref') { return }
  if (value == null) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}

export default patchAttr