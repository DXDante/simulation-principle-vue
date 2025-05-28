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