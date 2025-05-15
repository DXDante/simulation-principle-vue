/**
 * Tip:
 * 打包 packages 下的模块
 * 1) package.json 配置 script 命令, node 执行命令函 (node xx/xx.js 打包的名称 -f 打包的格式)
 * 2) node 命令函参数通过 process.argv 获取 (返回数组, 前两个数据为 node 程序地址、项目打包文件地址, 不需要)
 * 3) 配置打包入口、出口、配置 (node 中 esm 模块没有 __dirname, 需要自己解析)
 * 4) 安装模块的依赖到模块 (reactivity 模块依赖 shared 模块, 使用命令 pnpm i @vue/shared --workspace --filter @vue/reactivity 添加依赖, 注意添加的是本地开发的模块)
 *    pnpm i xx包 --filter xx包 // 第三方, 也就是正式的模块
 *    pnpm i xx包 --workspace --filter xx包 // 安装本地环境的模块依赖加上 --workspace
 */

import minimist from 'minimist'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import esbuild from 'esbuild'

// CommonJs 的模块化语法, 这里做兼容处理, ES、CommonJs 都可以使用
const require = createRequire(import.meta.url)

// 当前打包文件路径 (import.meta.url 是以 file:///K:/xx/xx/build.js 格式的路径, 使用 fileURLToPath 转换为正常的文件路径 K:/xx/xx/build.js)
const __filename = fileURLToPath(import.meta.url)
// 当前打包文件目录路径
const __dirname = dirname(__filename)

// 解析命令函参数
const mistRes = minimist(process.argv.slice(2))
// 打包模块名称
const target = mistRes._[0]
// 打包方式 (iife 自调形式, esm es 模块规范, cjs common.js 规范)
const format = mistRes.f || 'esm'

// 入口文件, 根据路径解析
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`)
// 入口文件的 package.json 文件
const targetPackageJson = require(`../packages/${target}/package.json`)

// 根据需要进行打包
esbuild.context({
  entryPoints: [entry], // 入口配置
  outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`), // 出口
  bundle: true, // 打包打一起
  platform: "browser", // 打包环境, 浏览器
  sourcemap: true, // 链接源代码, 供调试
  format, // 打包方式 (iife 自调形式, esm es 模块规范, cjs common.js 规范)
  globalName: targetPackageJson.buildOptions?.name, // 全局调用名称, 供打包方式是 iife 时, 因为是自调函数会返回内容给全局变量接收, 这里就是定义这个全局变量的名称, 比如 jQ
}).then((ctx) => {
  console.log(`simulation-principle-vue 项目开始打包, 模块名: ${target}`)

  // watch: 监控入口文件持续打包
  return ctx.watch()
})