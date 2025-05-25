
const patchClass = (el, value) => {
  if (value == null || value == '') {
    el.removeAttribute('class')
  } else {
    el.className = value
  }
}

export default patchClass