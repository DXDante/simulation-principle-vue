import { ShapeFlags } from "packages/shared/dist/shared"

/** Teleport 组件 **/
export const Teleport = {
  __isTeleport: true,
  // 挂载、更新流程
  process(n1, n2, container, anchor, parentComponent, internals) {
    const { mountChildren, patchChildren, move } = internals

    // 初始化挂载
    if (!n1) {
      const target = (n2.target = document.querySelector(n2.props?.to))
      if (!target) { return }
      mountChildren(n2.children, target, parentComponent)
      return
    }
    // 更新
    patchChildren(n1, n2, n2.target, parentComponent)
    // 更新时如果插入的位置有变化, 重新获取被插入位置再把子节点插入到新的位置
    if (n2.props.to !== n1.props.to) {
      const nextTarget = (n2.target = document.querySelector(n2.props?.to))
      n2.children.forEach(child => move(child, nextTarget, anchor))
    }
  },
  // 卸载
  remove(vnode, unMountChildren) {
    const { shapeFlag, children } = vnode

    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unMountChildren(children)
    }
  }
}

export const isTeleport = (value) => value.__isTeleport