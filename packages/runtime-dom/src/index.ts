import { nodeOps } from './nodeOps'
import patchProp from './patchProp'

// 将节点操作和属性操作合并在一起
const renderOptions = Object.assign({ patchProp }, nodeOps)
// const createRenderer = () => {
// }

// createRenderer(renderOptions).render()
export { renderOptions }
export * from '@vue/reactivity'