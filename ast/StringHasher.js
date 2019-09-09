import { 
  IsInRange,
  IsDecimalDigit,
} from '../util';

import { 
  ArrayIndexLengthBits_kShift,
  kMaxArrayIndexSize,
  kMaxHashCalcLength,
  kHashBitMask,
  kZeroHash,
  kIsNotArrayIndexMask,
  kHashShift
} from '../enum';

/**
 * 1、非数字直接返回false
 * 2、if分支判断中的429496729数字是2^32为4294967296 必须比这个小
 * 所能接受的最大值是4294967294
 * 3、结果是一层层叠起来 
 * 例如12345 index初始值为1 叠加过程为 1 => 12 => 123 => 1234 => 12345
 */
export const TryAddIndexChar = (index, c) => {
  if (!IsDecimalDigit(c)) return false;
  let d = c - '0';
  if (index > 429496729 - ((d + 3) >> 3)) return false;
  index = index * 10 + d;
  return index;
}

/**
 * 下面全是不懂的位运算
 */
const MakeArrayIndexHash = (value, length) => {
  value <<= ArrayIndexLengthBits_kShift;
  value |= length << ArrayIndexLengthBits_kShift;
  return value;
};

export default class StringHasher {
  /**
   * 没有引用干脆声明一个类变量
   */
  constructor() {
    this.number = 0;
  }
  /**
   * 返回字符串的映射Hash值
   */
  static HashSequentialString(chars, length, seed) {
    /**
     * 这里所做的操作是尝试将数字字符串转换为纯数字
     * 判断字符串长度是否在1 - 10之间
     */
    if (IsInRange(length, 1, kMaxArrayIndexSize)) {
      /**
       * 1、判断第一位是否是数字
       * 2、长度为1或者第一位不是0
       */
      if (IsDecimalDigit(chars[0]) && (length === 1 || chars[0] !== '0')) {
        /**
         * 这里通过与0的Unicode计算后得到实际数值
         */
        this.number = chars[0] - '0';
        let i = 1;
        do{
          if (i === length) return this.number = MakeArrayIndexHash(this.number, length);
        } while(this.number = TryAddIndexChar(this.number, chars[i++]))
      }
    } else if (length > kMaxHashCalcLength) {
      return this.GetTrivialHash(length);
    }
    let AddCharacterCore = (running_hash, c) => {
      running_hash += c;
      running_hash += (running_hash << 10);
      running_hash ^= (running_hash >>> 6);
      return running_hash;
    }
    let GetHashCore = (running_hash) => {
      running_hash += (running_hash << 3);
      running_hash ^= (running_hash >>> 11);
      running_hash += (running_hash << 15);
      let hash = (running_hash & kHashBitMask);
      let mask = (hash - 1) >> 31;
      return running_hash | (kZeroHash & mask);
    }

    let running_hash = seed;
    for(let i =0;i < length;i++) {
      running_hash = AddCharacterCore(running_hash, chars[i].charCodeAt());
    }

    return (GetHashCore(running_hash) << kHashShift) | kIsNotArrayIndexMask;
  }
  GetTrivialHash(length) {
    return (length << kHashShift) | kIsNotArrayIndexMask;
  }
}