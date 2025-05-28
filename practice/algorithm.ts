// 节点对比
//      ┏━━━━━━━━━━━┓
// A  B ┃C  D  E   ┃ F  G  旧
// A  B ┃E  C  D  H┃ F  G  新
//      ┗━━━━━━━━━━━┛
//           ∨
//  C    D    E          2, 3, 4                    索引
// [0]  [1]  [2]
//  E    C    D    H     4, 2, 3, 0(表示以前不存在)   索引
// 
// [C, D]
// [0, 1] 通过上面的两个序列, 可以求出来, 最终这样的结果, 就可以保证某些元素不用移动
//
//
// 需要求 "最长递增子序列"
// 贪心算法 + 二分查找
// 贪心表示更有潜力值, 从最小开始连续, 因为后面还可以放更大的
//
//
//    2   3   7   6   8   4   9   11            ->  求连续性最长子序列个数
//   [0] [1] [2] [3] [4] [5] [6] [7]
//
// 0│ 2
// 1│ 2   3                                     3 比 2 大可放入
// 2│ 2   3   7
// 3│ 2   3   6                                 6 替换 7, 替换前是最后1个 (6 比 7 小, 6 后面可以放还可以放 7, 所以 236 比 237 连续性更好)
// 4│ 2   3   6   8                       
// 5│ 2   3   4   8                             4 替换 6, 8 之前是 6
// 6│ 2   3   4   8   9                   
// 7│ 2   3   4   8   9   11                    个数为 6 个
//
//
// 源 2   3   1   5   6   8   7   9   4
//   [0] [1] [2] [3] [4] [5] [6] [7] [8]
// 0│ 2                                         (2 的前一个是 null)
// 1│ 2   3                                     (3 的前一个是 2)
// 2│ 1   3                                     (1 的前一个是 null, 1 替换了 2)
// 3│ 1   3   5                                 (5 的前一个是 3)
// 4│ 1   3   5   6                             (6 的前一个是 5)
// 5│ 1   3   5   6   8                         (8 的前一个是 6)
// 6│ 1   3   5   6   7                         (7 的前一个是 6, 7 替换了 8)
// 7│ 1   3   5   6   7   9                     (9 的前一个是 7)
// 8│ 1   3   4   6   7   9                     (4 的前一个是 3, 4 替换了 5)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------
//    1   3   4   6   7   9                     个数为 6 个, 虽然是无序的, 但是通过以下方法可以追溯
// 反向追溯(最后一个开始, 因为是最大的, 即 9, 表里找 9 的前一个 是 7, 得到 9 7, 又从 7 开始找前一个, 是 6, 得到 9 7 6, 那么 6 的前一个是 5, 得到 9 7 6 5, ..依次类推.., 结果顺序倒序看 <--)
//    9   7   6   5   3   2   ==就是=>   2   3   5   6   7   9
// 结果对应 源, 就是连续性最长的序列: 2   3   5   6   7   9
//            1          8           4
// *  2   3      5   6       7   9
// 对应的索引是不是: 0, 1, 3, 4, 6, 7 ???

// 贪心算法 + 二分查找求出 "最长子序列索引"
export const getSequence = (arr) => {
  // 返回的是索引集, 默认认为 第 0 个是最小的
  const result = [0]
  // 前驱节点的列表
  const p = result.slice(0)
  const length = arr.length
  
  // 二分查找
  let start, end, middle;
  
  for(let i = 0; i < length; i++) {
    const arrI = arr[i]
    // 为了 Vue 3 而处理掉数组中 0 的情况 [5, 3, 4, 0]
    if (arrI !== 0) {
      // 拿出索引集最后一项(得到的是索引), 然后从数组中取出数据 和 当前的这一轮数据来作比对
      let resultLastIndex = result[result.length - 1]

      if (arr[resultLastIndex] < arrI) {
        // 正常放入时, 前一个节点索引就是 result 中的最后一个
        p[i] = result[result.length - 1]
        // 将当前索引追加结果
        result.push(i)
        continue
      }
    }

    // 二分查找(没有追加说明是要和 前面的 替换, 查找比 arrI 大的第 1 个替换掉)
    start = 0 // 标记查找起始索引
    end = result.length - 1 // 标记查找结束索引
    // 要替换的索引最终 start === end
    while(start < end) {
      // 计算中间索引(| 0 位运算, 取整)
      middle = ((start + end) / 2) | 0
      // 索引集中拿到中间的索引, 再从源数组取出对应索引的值
      if (arr[result[middle]] < arrI) {
        start = middle + 1
      } else {
        end = middle
      }
    }

    // 当前值 小于找到 源数据 索引对应的值就替换为最新的索引
    if (arrI < arr[result[start]]) {
      // 找到被替换节点的前一个
      p[i] = result[start - 1]
      result[start] = i
    }

    // 创建前驱节点, 进行倒叙追溯(最后一项肯定是不会错的, 所以根据最后一个节点做追溯)
    let len = result.length
    // 取出最后一项
    let last = result[len - 1]
    while(len-- > 0) {
      // 倒叙向前找, 因为 p 的列表是前驱节点
      result[len] = last
      // 在数组中找到最后一个
      last = p[last]
    }
  }
  return result
}

// 自己实现的贪心算法 + 二分查找(第 1 次用的顺位查找, 数量多有性能消耗) + 节点递归追溯求出 "最长子序列索引"
export const getSequenceOther = (source: number[]): number[] => {
  // 根据指定数据查找在子序列中小于的那个值得索引, 这里稍后更改为二分查找
  const findSmaller = (beFinds: number[], target: number) => beFinds.findIndex(i => target < i)
  // 源数据对应索引
  const sourceValueToIndex = new Map()
  // 子序列
  const subsequence = []
  // 子序列对应上一个值
  const subsequencePrevValueMap = new Map()
  // 根据 subsequencePrevValueMap 上一轮值映射表递归追溯得到正确的 值的序列 (倒叙的)
  const backTo = (res: number[], map: Map<number, number>) => {
    const resLast = res[res.length - 1]
    const value = map.get(resLast)
    if (value == null) {
      return res
    }
    res.push(value)
    return backTo(res, map)
  }

  for(let i = 0; i < source.length; i++) {
    const item = source[i]
    // 每轮循环设置数据对应的索引, 方便后面直接查找
    sourceValueToIndex.set(item, i)
    // 查找每轮数据比子序列中小的值
    const smallIndex = findSmaller(subsequence, item)
    let prevValue
    // 替换, 保存上一轮的值, 用于倒叙追溯
    if (smallIndex > -1) {
      prevValue = subsequence[smallIndex - 1]
      subsequence[smallIndex] = item
    }
    // 追加, 保存上一轮的值, 用于倒叙追溯
    else {
      prevValue = subsequence[subsequence.length - 1]
      subsequence.push(item)
    }

    subsequencePrevValueMap.set(item, prevValue)
  }

  // 得到序列 并且 翻转
  const sourceSubsequence = backTo(subsequence.slice(subsequence.length - 1), subsequencePrevValueMap).reverse()

  // console.log('subsequence', subsequence)
  // console.log('subsequencePrevValueMap', subsequencePrevValueMap)
  // console.log('sourceSubsequence', sourceSubsequence)
  // 最后根据 值序列 映射源数据对应的 索引
  return sourceSubsequence.map(item => sourceValueToIndex.get(item))
}