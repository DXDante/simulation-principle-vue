import { ShapeFlags } from "@vue/shared"
import { isSameVnode } from "./createVNode"

/**
 * createRenderer 可跨平台, 它不关心如何渲染
 * @param renderOptions 渲染选项
 */
export const createRenderer = (renderOptions) => {
  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp
  } = renderOptions

  /** 挂载子元素 **/
  const mountChildren = (children, container) => {
    for(let i = 0; i < children.length; i++) {
      // TODO: 可能是纯文本
      patch(null, children[i], container)
    }
  }

  /** 挂载元素 **/
  const mountElement = (vnode, container) => {
    const { type, children, props, shapeFlag } = vnode
    // 第 1 次渲染时让虚拟节点 和 真实 DOM 创建关联 vnode.el = 真实 DOM
    // 第 2 次渲染如果没有值, 需要移除真实 DOM, 如果是新的 vnode, 可以和上 1 次的 vnode 做比对, 之后更新对应的 el 元素, 后续再复用这个 DOM 元素
    const el = (vnode.el = hostCreateElement(type))

    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 文本元素 (9 & 8 > 0 与/或位移运算)
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children)
    }
    // 多个节点
    else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el)
    }

    hostInsert(el, container)
  }

  /** 移除 DOM **/
  const unmount = (vnode) => hostRemove(vnode.el)

  /** 渲染 和 更新都走这里 **/
  const patch = (n1, n2, container) => {
    // 节点完全相同直接跳过
    if (n1 === n2) { return }

    // 旧节点"元素/key" 不同于新节点, 移除老的 DOM, 初始化新的 DOM
    if (n1 && !isSameVnode(n1, n2)) {
      unmount(n1)
      n1 = null // 就会执行后续的 n2 的初始化
    }

    // 初次渲染
    if (n1 === null) {
      mountElement(n2, container)
    }
  }

  /** 将虚拟节点变成真实节点进行渲染, 多次调用会进行虚拟节点比较再更新 **/
  const render = (vnode, container) => {
    if (vnode === null) {
      // 我要移除当前容器中的dom元素
      if (container._vnode) {
        unmount(container._vnode)
      }
      return
    }

    patch(container._vnode || null, vnode, container)
    // 存储当次渲染节点到标识位, 下一次渲染时取出做比对
    container._vnode = vnode
  }

  return {
    render
  }
}