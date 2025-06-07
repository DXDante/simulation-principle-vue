import { __isString, ShapeFlags, __isObject, __isFunction, __isArray } from "@vue/shared";
import { isTeleport } from './components/Teleport';

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
    : __isObject(type) // Teleport/状态组件都是对象形式
    ? (
      isTeleport(type)
      ? ShapeFlags.TELEPORT // Teleport 组件
      : ShapeFlags.STATEFUL_COMPONENT // 带状态组件
    )
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
    shapeFlag, // 标记有哪些类型的子节点
    ref: props?.ref, // 用于获取组件 / DOM 的特殊字段
    transition: null,
    patchFlag, // 标识节点哪些是需要动态的 (比如: TEXT 就是文本需要变化, PROPS 就是属性会变化)
    dynamicChildren: null // 收集的动态的子节点 (绑定了数据会变化的子节点)
  }

  // 把动态的节点(属性、文本等等会变化的节点)收集到块中
  if (currentBlock && patchFlag > 0) {
    currentBlock.push(vnode)
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

/****************************** 靶向更新使用 ******************************/
let currentBlock = null

export const openBlock = () => {
  // 用于收集动态节点
  currentBlock = []
}

export const closeBlock = () => {
  currentBlock = null
}

/** 启动 block, 作用是让 vnode 具有收集能力 **/
export const setupBlock = (vnode) => {
  // 当前 ElementBlock 会收集子节点(因为创建子节点会先执行, 然后创建父节点时就会启动这里去收集), 用 currentBlock 来收集, 在调用 createElementBlock 前会先调用 openBlock
  vnode.dynamicChildren = currentBlock
  // 收集完成
  closeBlock()
  return vnode
}

/** block 有收集虚拟节点的功能 **/
export const createElementBlock = (type, props, children, patchFlag?) => {
  const vnode = createVNode(type, props, children, patchFlag)
  // 把块收集到父级里
  // if (currentBlock) {
  //   currentBlock.push(vnode)
  // }
  // 模板编译后的 createElementVNode 就是 createVNode 方法
  return setupBlock(vnode)
}

export const toDisplayString = (value) => {
  return value == null ? '' : __isString(value) ? value : __isObject(value) || __isArray(value) ? JSON.stringify(value) : String(value)
}
export { createVNode as createElementVNode }
/****************************** 靶向更新使用 ******************************/