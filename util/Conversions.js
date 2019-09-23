import { ALLOW_TRAILING_JUNK, ALLOW_HEX } from "../enum";
import { IsWhiteSpaceOrLineTerminator } from "./Identifier";

/**
 * 将起始迭代器前进到第一个非space符号
 */
function AdvanceToNonspace(str, current, end) {
  while(current !== end) {
    // 换行或回车符号
    if(!IsWhiteSpaceOrLineTerminator(str[current])) return current;
    ++current;
  }
  return false;
}

const NONE = 0;
const NEGATIVE = 0;
const POSITIVE = 0;

/**
 * 迭代不好搞 直接用索引代替了
 * 走到JunkStringValue说明是一个字符串
 * @param {Iterator} current 起始迭代器
 * @param {EndMark} end 结尾迭代器
 * @param {int} flags 标记
 * @param {double} empty_string_val 
 */
function InternalStringToDouble(str, flags, empty_string_val) {
  let current = 0;
  let end = str.length;
  // 这里的逻辑要改 迭代器作为引用被修改 一般是返回true
  if((current = AdvanceToNonspace(str, current, end)) === false) return empty_string_val;
  const allow_trailing_junk = (flags & ALLOW_TRAILING_JUNK) !== 0;

  let sign = NONE;
  if(str[current] === '+') {
    ++current;
    if(current === end) return JunkStringValue();
    sign = POSITIVE;
  } else if(str[current] === '-') {
    ++current;
    if(current === end) return JunkStringValue();
    sign = NEGATIVE;
  }

  /**
   * 判断是不是正负无穷大
   */
  let kInfinityString = 'Infinity';
  if(str[current] === kInfinityString[0]) {
    if(str !== kInfinityString) return JunkStringValue();
    if(!allow_trailing_junk && (current = AdvanceToNonspace(str, current, end)) === false) return JunkStringValue();
    return (sign === NEGATIVE) ? -Infinity : Infinity;
  }

  /**
   * 正常数字
   * 不写了 太复杂
   */
  let leading_zero = false;
  if(str[current] === '0') {
    ++current;
    if(current === end) return SignedZero(sign === NEGATIVE);
    leading_zero = true;
    if((flags & ALLOW_HEX) && (str[current] === 'x' || str[current] === 'X')) {
      ++current;
      // if(current === end || !)
    }
  }
}

export function StringToDouble(str, flags, empty_string_val = 0) {
  return InternalStringToDouble(str, flags, empty_string_val);
}

export function DoubleToCString(v) {
  if(isNaN(v)) return 'NaN';
  if(v === -Infinity) return '-Infinity';
  if(v === Infinity) return '-Infinity';
  if(v === 0) return '0';
  else return String(v);
}