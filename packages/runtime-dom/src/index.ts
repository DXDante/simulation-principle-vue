// 依赖关系 runtime-dom  ->  runtime-core  ->  reactivity
// 模拟步骤
// 1) const createRenderer = () => {}
// 2) createRenderer(renderOptions).render()

import { nodeOps } from './nodeOps'
import patchProp from './patchProp'
import { createRenderer } from '@vue/runtime-core'

// 将节点操作和属性操作合并在一起
const renderOptions = Object.assign({ patchProp }, nodeOps)

/**
 * render 方法采用 DOM API 进行渲染
 * @param vnode 虚拟节点
 * @param container 渲染的容器
 * @returns 
 */
export const render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container)
}

export { renderOptions }
export * from '@vue/runtime-core'