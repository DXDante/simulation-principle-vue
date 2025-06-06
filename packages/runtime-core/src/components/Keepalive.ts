import { h } from '../h'
import { isVnode, Text } from '../createVNode'
import { onMounted, onUpdated } from '../apiLifeCycle'
import { getCurrentInstance } from '../component'
import { ShapeFlags } from '@vue/shared'

export const KeepAlive = {
  __isKeepAlive: true,
  props: {
    max: Number // 最大缓存个数, 最新使用的放在最后, 超出长度就把最前面的移除掉 [1 ↑, 2, 3, 4 ←]
  },
  setup(props, { slots }) {
    const { max } = props
    // 缓存表 (<keep-alive> <xx> </keep-alive>)
    const cache = new Map()
    // 用来记录哪些组件缓存过
    const keys = new Set()

    // 在这个组件中需要一些 DOM 方法, 可以将元素移动到一个 div 中
    // 还可以卸载某个元素

    let pendingCacheKey = null

    const instance = getCurrentInstance()
    // 当组件"挂载" / "更新完成"后再把"插槽组件"虚拟节点缓存
    const cacheSubTreee = () => {
      // 缓存"插槽组件"虚拟节点, 里面"子树组件"有 DOM 元素 el, 把虚拟节点设置到映射表里面
      cache.set(pendingCacheKey, instance.subTree)
      console.log('cahce:', cache)
    }

    // -------------------- 这里是 KeepAlive 特有的初始化方法 --------------------
    // 缓存的是组件虚拟节点 -> 虚拟节点.component 是组件实例 -> 组件实例 subTree -> subTree 里的 el 
    const { move, createElement, unMount } = instance.ctx.renderer
    // 还原标识位
    const resetShapeFlag = (vnode) => {
      let { shapeFlag } = vnode
      if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
      }
      if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
        shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      }
      vnode.shapeFlag = shapeFlag
    }
    // 销毁指定虚拟节点
    const purneCacheEntry = (key) => {
      // 1) 删除缓存 key
      keys.delete(key)
      // 2) 之前缓存过的虚拟节点
      const cached = cache.get(key)
      if (!cached) { return }
      cache.delete(key)
      // 3) 还原 vnode 上的 shapeFlage 标识, 否则无法真实卸载
      resetShapeFlag(cached)
      // 4) 真实卸载虚拟节点
      unMount(cached)
    }

    // 缓存组件 - 激活时执行
    instance.ctx.activated = (vnode, container, anchor) => {
      // 把缓存组件里子树组件移动到指定位置
      move(vnode, container, anchor)
    }
    // DOM 缓存盒子
    const storageContent = createElement('div')
    // 缓存组件 - 卸载时执行
    instance.ctx.deactivated = (vnode) => {
      // 将 DOM 元素临时移动到"缓存盒子"里, 但是没有被销毁
      move(vnode, storageContent)
    }
    // -------------------- 这里是 KeepAlive 特有的初始化方法 --------------------

    onMounted(cacheSubTreee)
    onUpdated(cacheSubTreee)

    return () => {
      const vnode = slots?.default()
      if (!vnode) { return h(Text, '')}

      const comp = vnode.type
      const key = (pendingCacheKey = vnode.key || comp)
      const cacheVNode = cache.get(key)

      if (cacheVNode) {
        // 1) 重新渲染缓存的组件, 我们缓存了的组件虚拟节点, 里面可以拿到组件实例, 就可以拿到 subTree 中的 el(需要渲染的 DOM), 所有不用重新创建组件实例, 直接复用即可
        vnode.component = cacheVNode.component
        // 2) 重新设置组件的标识位, 表示已经缓存过, 后面不用做创建实例的这个初始化操作 (| 在前者基础上加类型, 并在一起, & 是判断存不存在, 前段是否包含后者)
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        // 3) 后续处理 processComponent 挂载流程时判断如果是缓存组件, 直接走上方 activated 逻辑
        // 刷新缓存 key 的位置, Set 是有序的
        keys.delete(key)
        keys.add(key)
      }
      else {
        keys.add(key)
        // 达到最大缓存个数, 需要把头移除掉(这里缓存个数和一些条件判断还有问题)
        if (max != null && keys.size > max) {
          // keys.values().next() 可以获取到第 1 个位置的内容
          purneCacheEntry(keys.values().next().value)
        }
      }

      // 设置标识位, 组件节点需要被缓存, 卸载时不应该真卸载, 卸载的 DOM 临时放入 storageContent (缓存盒子)中
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      // 等待组件加载完毕后再去缓存
      return vnode
    }
  }
}

export const isKeepAlive = (vnode) => vnode.type.__isKeepAlive