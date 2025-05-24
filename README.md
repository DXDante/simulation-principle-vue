# 前言

这是一个模拟 Vue 3 源码原理的项目, 更好的学习 Vue 3 整个项目模块的工作情况

## 响应式系统

- reactivity 响应式模块

## 编译时

- compiler-core (针对 DOM 的编译), compiler-dom (进行非平台相关的编译)

## 运行时

- runtime-core (浏览器操作的一些 API, DOM 的增删改查), runtime-dom (不关心如何操作 DOM、调用了哪些 API, 只关心如何操作这些 API)
