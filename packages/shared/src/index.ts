/**
 * 是否为 Array
 */
export const __isArray = (p: unknown): boolean => {
  return !!(typeof p === 'object' && p !== null && p.constructor === Array)
}

/**
 * 是否为空 Array
 */
export const __isEmptyArray = (p: unknown): boolean => {
  return !!(__isArray(p) && (p as unknown[]).length == 0)
}

/**
 * 是否为 Function
 * @description 小程序中测试 p.constructor == Function 并不相等, 故取消判断
 */
export const __isFunction = (p: unknown): boolean => {
  return typeof p === 'function'
}

/**
 * 是否为 Object
 */
export const __isObject = (p: unknown): boolean => {
  return !!(typeof p === 'object' && p !== null && p.constructor === Object)
}

/**
 * 是否为空 Object
 */
export const __isEmptyObject = (p: unknown): boolean => {
  if (__isObject(p)) {
    for (const k in (p as Object)) {
      return false
    }
    return true
  }
  return false
}

/**
 * 是否为 String
 */
export const __isString = (p: unknown): boolean => {
  return typeof p === 'string'
}

/**
 * 是否为 Number
 */
export const __isNumber = (p: unknown): boolean => {
  return typeof p === 'number'
}

/**
 * 是否为 Boolean
 */
export const __isBoolean = (p: unknown): boolean => {
  return typeof p === 'boolean'
}

/**
 * 是否为 Null
 */
export const __isNull = (p: unknown): boolean => {
  return p === null
}

/**
 * 是否为 Undefined
 */
export const __isUndefined = (p: unknown): boolean => {
  return p === undefined
}

/**
 * 是否为字符串数字 (可转换的字符串数据)
 */
export const __isStringNumber = (p: unknown): boolean => {
  return !!(typeof p === 'string' && !isNaN(Number(p)))
}

export * from './shapeFlags'