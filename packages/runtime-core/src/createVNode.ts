import { __isString, ShapeFlags, __isObject, __isFunction, __isArray } from "@vue/shared";

export const Text = Symbol('Text')

export const Fragment = Symbol('Fragment')

/** 是否是节点 **/
export const isVnode = (value) => {
  return value?.__v_isVnode;
}

/** 是否是相同节点 **/
export const isSameVnode = (n1, n2) => {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * 创建 Virtual NODE
 * @param type 元素类型 (比如 div, p)
 * @param props 元素属性 (比如 class, style, 其他的 attribute 和 事件)
 * @param children? 数组节点 / 文本节点, 如果是单独的节点, h 方法内会包裹一层数组传递到这
 * @param patchFlag? 
 */
export const createVNode = (type, props, children?, patchFlag?) => {
  const shapeFlag = __isString(type)
    ? ShapeFlags.ELEMENT // 元素
    : __isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT // 带状态组件
    : __isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT // 函数组件
    : 0;

  const vnode = {
    __v_isVnode: true,
    type,
    props,
    children,
    key: props?.key, // diff 算法后面需要的 key
    el: null, // 每个虚拟节点都对应一个真实节点, 用来存放真实节点, 后续更新的时候会产生新的虚拟节点, 比较差异更新真实 DOM
    shapeFlag,
    ref: props?.ref,
    patchFlag
  }

  if (children) {
    // 多个节点
    if (__isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    }
    // 插槽组件
    else if (__isObject(children)) {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN; // 组件的孩子
    }
    // 文本节点
    else {
      children = String(children);
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
  }

  return vnode
}