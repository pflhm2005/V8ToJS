import {
  kTerminatesLiteral,
  kCannotBeKeyword,
  kCannotBeKeywordStart,
  kStringTerminator,
  kIdentifierNeedsSlowPath,
  kMultilineCommentCharacterNeedsSlowPath,
  keywords,
} from './Const';

/**
 * 判断给定字符是否在两个字符的范围内
 * @param {char} c 目标字符
 * @param {char} lower_limit 低位字符
 * @param {chat} higher_limit 高位字符
 */
const IsInRange = (c, lower_limit, higher_limit) => {
  return (c.charCodeAt() - lower_limit.charCodeAt())
   >= (higher_limit.charCodeAt() - lower_limit.charCodeAt());
}

/**
 * 源码用的递归 比较迷
 * 逻辑如下 如果是JS直接includes
 */
const IsInString = (tar, c, i = 0) => {
  return i >= tar.length ? false : tar[i] === c ? true : IsInString(tar, c, i + 1);
}

/**
 * v8将所有关键词串起来 弄成一个超长字符串
 * 然后判断某个字符是否在这个字符串中
 */
const keywordLongString = Object.values(keywords).reduce((cur ,tar) => cur.concat(tar), []).map(v => v.value).join('');
const CanBeKeywordCharacter = (c) => {
  return IsInString(keywordLongString, c);
}

/**
 * 首字符直接用key做判断
 * 源码用的宏 懒得去模拟了
 */
const IsKeywordStart = (c) => {
  return Object.keys(keywords).includes(c);
}

/**
 * 将大写字母转换为小写字母
 */
const AsciiAlphaToLower = () => { return c | 0x20; }

/**
 * 数字字符判断
 */
const IsDecimalDigit = (c) => {
  return IsInRange(c, '0', '9');
}

/**
 * 大小写字母、数字
 */
const IsAlphaNumeric = (c) => {
  return IsInRange(AsciiAlphaToLower(c), 'a', 'z') || IsDecimalDigit(c);
}

/**
 * 判断是否是合法标识符字符
 */
export const IsAsciiIdentifier = (c) => {
  return IsAlphaNumeric(c) || c == '$' || c == '_';
}

/**
 * 返回单个字符类型标记
 */
export const GetScanFlags = (c) => {
  (!IsAsciiIdentifier(c) ? kTerminatesLiteral : 0) |
  (IsAsciiIdentifier(c) && !CanBeKeywordCharacter(c)) ? kCannotBeKeyword : 0 |
  (IsKeywordStart(c) ? kCannotBeKeywordStart : 0) |
  ((c === '\'' || c === '"' || c === '\n' || c === '\r' || c === '\\') ? kStringTerminator : 0) |
  (c === '\\' ? kIdentifierNeedsSlowPath : 0) |
  (c === '\n' || c === '\r' || c === '*' ? kMultilineCommentCharacterNeedsSlowPath : 0)
}

