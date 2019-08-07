import {
  kTerminatesLiteral,
  kCannotBeKeyword,
  kCannotBeKeywordStart,
  kStringTerminator,
  kIdentifierNeedsSlowPath,
  kMultilineCommentCharacterNeedsSlowPath,
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

const IsInString = (c) => {

}

const CanBeKeywordCharacter = (c) => {
  return IsInString(keywords, c);
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

