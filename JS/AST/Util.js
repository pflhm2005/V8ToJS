import {
  kTerminatesLiteral,
  kCannotBeKeyword,
  kCannotBeKeywordStart,
  kStringTerminator,
  kIdentifierNeedsSlowPath,
  kMultilineCommentCharacterNeedsSlowPath,
  kMaxAscii,

  BINARY,
  DECIMAL,
  DECIMAL_WITH_LEADING_ZERO
} from './Const';

/**
 * 关键词表 也包括一些保留关键词(还有一些特殊情况下有意义的字符)
 * 其中key代表首字符 值分别为关键词字符以及枚举类型
 * 有时候觉得宏就是个灾难 有时候觉得真香
 */
const keywords = {
  a: [
    { value: 'async', type: 'Token::ASYNC' },
    { value: 'await', type: 'Token::AWAIT' },
  ],
  b: [
    { value: 'break', type: 'Token::BREAK' },
    { value: 'case', type: 'Token::CASE' },
  ],
  c: [
    { value: 'case', type: 'Token::CASE' },
    { value: 'catch', type: 'Token::CATCH' },
    { value: 'class', type: 'Token::CLASS' },
    { value: 'const', type: 'Token::CONST' },
    { value: 'continue', type: 'Token::CONTINUE' },
  ],
  d: [
    { value: 'debugger', type: 'Token::DEBUGGER' },
    { value: 'default', type: 'Token::DEFAULT' },
    { value: 'delete', type: 'Token::DELETE' },
    { value: 'do', type: 'Token::DO' },
  ],
  e: [
    { value: 'else', type: 'Token::ELSE' },
    { value: 'enum', type: 'Token::ENUM' },
    { value: 'export', type: 'Token::EXPORT' },
    { value: 'extends', type: 'Token::EXTENDS' },
  ],
  f: [
    { value: 'false', type: 'Token::FALSE_LITERAL' },
    { value: 'finally', type: 'Token::FINALLY' },
    { value: 'for', type: 'Token::FOR' },
    { value: 'function', type: 'Token::FUNCTION' },
  ],
  g: [
    { value: 'get', type: 'Token::GET' },
  ],
  i: [
    { value: 'if', type: 'Token::IF' },
    { value: 'implements', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'import', type: 'Token::IMPORT' },
    { value: 'in', type: 'Token::IN' },
    { value: 'instanceof', type: 'Token::INSTANCEOF' },
    { value: 'interface', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
  ],
  l: [
    { value: 'let', type: 'Token::LET' },
  ],
  n: [
    { value: 'new', type: 'Token::NEW' },
    { value: 'null', type: 'Token::NULL_LITERAL' },
  ],
  p: [
    { value: 'package', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'private', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'protected', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
    { value: 'public', type: 'Token::FUTURE_STRICT_RESERVED_WORD' },
  ],
  r: [
    { value: 'return', type: 'Token::RETURN' },
  ],
  s: [
    { value: 'set', type: 'Token::SET' },
    { value: 'static', type: 'Token::STATIC' },
    { value: 'super', type: 'Token::SUPER' },
    { value: 'switch', type: 'Token::SWITCH' },
  ],
  t: [
    { value: 'this', type: 'Token::THIS' },
    { value: 'throw', type: 'Token::THROW' },
    { value: 'true', type: 'Token::TRUE_LITERAL' },
    { value: 'try', type: 'Token::TRY' },
    { value: 'typeof', type: 'Token::TYPEOF' },
  ],
  v: [
    { value: 'var', type: 'Token::VAR' },
    { value: 'void', type: 'Token::VOID' },
  ],
  w: [
    { value: 'while', type: 'Token::WHILE' },
    { value: 'with', type: 'Token::WITH' },
  ],
  y: [
    { value: 'yield', type: 'Token::YIELD'},
  ],
};

/**
 * Ascii - Unicode值映射
 */
let UnicodeToAsciiMapping = [];

for(let i = 0;i < kMaxAscii;i ++) {
  UnicodeToAsciiMapping.push(String.fromCharCode(i));
}
export { UnicodeToAsciiMapping }

/**
 * 判断给定字符(数字)是否在两个字符的范围内
 * C++通过static_cast同时处理了char和int类型 JS就比较坑了
 * 这个方法其实在C++超简单的 然而用JS直接炸裂
 * @param {char} c 目标字符
 * @param {char} lower_limit 低位字符
 * @param {chat} higher_limit 高位字符
 */
export const IsInRange = (c, lower_limit, higher_limit) => {
  if(typeof lower_limit === 'string' && typeof higher_limit === 'string') {
    if(typeof c === 'string') c = c.charCodeAt();
    return Math.abs(c - lower_limit.charCodeAt())
    <= (higher_limit.charCodeAt() - lower_limit.charCodeAt());
  } else {
    return Math.abs(c - lower_limit) <= (higher_limit - lower_limit);
  }
}

/**
 * 源码用的递归 比较迷
 * 逻辑如下 反正相当于JS的includes
 */
const IsInString = (tar, c, i = 0) => {
  return i >= tar.length ? false : tar[i] === c ? true : IsInString(tar, c, i + 1);
}

/**
 * v8用宏将所有关键词串起来 弄成一个超长字符串
 * 然后判断字符是否在这个字符串中
 */
const keywordLongString = Object.values(keywords).reduce((cur ,tar) => cur.concat(tar), []).map(v => v.value).join('');
const CanBeKeywordCharacter = (c) => {
  return IsInString(keywordLongString, c);
}

/**
 * 首字符直接用上面那个对象的key做判断
 * 源码用的宏 懒得去模拟了(也基本上没法模拟)
 */
const IsKeywordStart = (c) => {
  return Object.keys(keywords).includes(c);
}

/**
 * 将大写字母转换为小写字母
 */
export const AsciiAlphaToLower = (c) => { return String.fromCharCode(c.charCodeAt() | 0x20); }

/**
 * 数字类型判断
 */
// 二进制 0~1
export const IsBinaryDigit = (c) => {
  return IsInRange(c, '0', '1');
}
// 八进制 0~7
export const IsOctalDigit = (c) => {
  return IsInRange(c, '0', '7');
}
// 十进制 0~9
export const IsDecimalDigit = (c) => {
  return IsInRange(c, '0', '9');
}
// 十六进制 0~f
export const IsHexDigit = (c) => {
  return IsDecimalDigit(c) || IsInRange(AsciiAlphaToLower(c), 'a', 'f');
}
// 隐式非八进制 8~9
export const  IsNonOctalDecimalDigit = (c) => {
  return IsInRange(c, '8', '9');
}
// 是否是十进制
export const IsDecimalNumberKind = (kind) => {
  return IsInRange(kind, DECIMAL, DECIMAL_WITH_LEADING_ZERO)
}
// 是否是合法的bigint进制模式
export const IsValidBigIntKind = (kind) => {
  return IsInRange(kind, BINARY, DECIMAL);
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
  if(typeof c === 'number') c = UnicodeToAsciiMapping[c];
  return IsAlphaNumeric(c) || c == '$' || c == '_';
}
export const IsIdentifierStart = (c) => {
  if(typeof c === 'number') c = UnicodeToAsciiMapping[c];
  return ('A' <= c && c <= 'Z') || ('a' <= c && c <= 'z') || c == '_';
}

/**
 * bitmap判断flag系列
 */
export const TerminatesLiteral = (scan_flags) => {
  return scan_flags & kTerminatesLiteral;
}
export const IdentifierNeedsSlowPath = (scan_flags) => {
  return scan_flags & kIdentifierNeedsSlowPath;
}
export const CanBeKeyword = (scan_flags) => {
  return scan_flags & kCannotBeKeyword;
}

/**
 * 源码确实是一个超长的三元表达式
 * Token是一个枚举 这里直接用字符串代替了
 * 因为太多了 只保留几个看看
 */
const TokenToAsciiMapping = (c) => {
  return c === '(' ? 'Token::LPAREN' : 
  c == ')' ? 'Token::RPAREN' :
  // ...很多很多
  c == '"' ? 'Token::STRING' :
  c == '\'' ? 'Token::STRING' :

  // 标识符部分单独抽离出一个方法判断
  IsDecimalDigit(c) ? 'Token::NUMBER' :
  c == '\\' ? 'Token::IDENTIFIER' :
  IsAsciiIdentifier(c) ? 'Token::IDENTIFIER' :
  // ...很多很多
  'Token::ILLEGAL'
};
export const UnicodeToToken = UnicodeToAsciiMapping.map(c => TokenToAsciiMapping(c));

/**
 * 返回单个字符类型标记
 */
const GetScanFlags = (c) => {
  return (!IsAsciiIdentifier(c) ? kTerminatesLiteral : 0) |
  (IsAsciiIdentifier(c) && !CanBeKeywordCharacter(c)) ? kCannotBeKeyword : 0 |
  (IsKeywordStart(c) ? kCannotBeKeywordStart : 0) |
  ((c === '\'' || c === '"' || c === '\n' || c === '\r' || c === '\\') ? kStringTerminator : 0) |
  (c === '\\' ? kIdentifierNeedsSlowPath : 0) |
  (c === '\n' || c === '\r' || c === '*' ? kMultilineCommentCharacterNeedsSlowPath : 0)
}

export const character_scan_flags = UnicodeToAsciiMapping.map(c => GetScanFlags(c));

