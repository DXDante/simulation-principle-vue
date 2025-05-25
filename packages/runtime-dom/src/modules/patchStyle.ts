
const patchStyle = (el, prevValue = {}, nextValue = {}) => {
  const { style } = el

  // 新样式全部设置
  for(const key in nextValue) {
    style[key] = nextValue[key]
  }

  if (!prevValue) { return }

  // 遍历旧样式, 查找新样式数据中有没有, 没有则删除
  for(const key in prevValue) {
    if (nextValue && nextValue[key] == null) {
      style[key] == null
    }
  }
}

export default patchStyle