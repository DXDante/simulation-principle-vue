import { getCurrentInstance } from "../component"
import { h } from "../h"

// transitionend 事件在 CSS 完成过渡后触发, CSS 过渡完成事件

/** Transition 函数式组件, 这里只做属性处理, 实际使用的是 BaseTransitionImple **/
export const Transition = (props, { slots }) => {
  // 函数式组件功能较少, 为了方便函数式组件, 只处理了属性, 处理属性后传递给状态组件 setup
  
  return h(BaseTransitionImple, resolveTransitionProps(props), slots)
}

export const resolveTransitionProps = (props) => {
  // enterFrom, enterActive, enterTo | leaveFrom, leaveActive, leaveTo
  const {
    name = 'v',
    enterFromClass = `${ name }-enter-from`,
    enterActiveClass = `${ name }-enter-active`,
    enterToClass = `${ name }-enter-to`,
    leaveFromClass = `${ name }-leave-from`,
    leaveActiveClass = `${ name }-leave-active`,
    leaveToClass = `${ name }-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave
  } = props

  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el)
      el.classList.add(enterFromClass)
      el.classList.add(enterActiveClass)
    },
    onEnter(el, done) {
      const resolve = () => {
        el.classList.remove(enterActiveClass)
        el.classList.remove(enterToClass)
        done && done()
      }

      onEnter && onEnter(el, resolve)
      // 添加后再移除, 而不是马上移除, 需要在下一帧移除 (代码是同步执行, 上一个方法走完立马就执行该函数了), 保证动画的产生
      nextFrame(() => {
        el.classList.remove(enterFromClass)
        el.classList.add(enterToClass)
        // 如果使用者没有传递 onEnter / onEnter 没有接收第 2 个参数的 done 方法, 这里内部就监听 transitionEnd 事件执行后置操作
        if (!onEnter || onEnter.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    },
    onLeave(el, done) {
      const resolve = () => {
        el.classList.remove(leaveActiveClass)
        el.classList.remove(leaveToClass)
        done && done()
      }

      onLeave && onLeave(el, resolve)

      el.classList.add(leaveFromClass)
      // 强制重绘, 立刻绘制 (只要获取元素的信息, 比如宽高、大小、位置, 就能产生重绘)
      document.body.offsetHeight
      el.classList.add(leaveActiveClass)

      nextFrame(() => {
        el.classList.remove(leaveFromClass)
        el.classList.add(leaveToClass)
        // 如果使用者没有传递 onLeave / onLeave 没有接收第 2 个参数的 done 方法, 这里内部就监听 transitionEnd 事件执行后置操作
        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener('transitionend', resolve)
        }
      })
    }
  }
}

const nextFrame = (fn) => {
  // 浏览器 API, 下 1 帧, 这里做两次是为了有的浏览器是把下 1 帧的任务放置在当前帧的最尾部, 所以嵌套 1 层, 下 1 帧 / 下 2 帧差异不大
  requestAnimationFrame(() => {
    requestAnimationFrame(fn)
  })
}

/** 实际使用的组件 (渲染后调用封装的钩子即可) **/
const BaseTransitionImple = {
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function
  },
  setup(props, { slots }) {
    return () => {
      const { onBeforeEnter, onEnter, onLeave } = props
      // 拿到插槽内容, 调用方法
      const vnode = slots.default && slots.default()
      if (!vnode) { return }

      // 渲染前 (有节点离开) 和 渲染后 (有节点进入)
      // 把钩子函数赋值到插槽的虚拟节点上
      vnode.transition = {
        beforeEnter: onBeforeEnter,
        enter: onEnter,
        leave: onLeave
      }
      
      return vnode
    }
  }
}