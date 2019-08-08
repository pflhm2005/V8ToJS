import { IsAsciiIdentifier, GetScanFlags } from './Util';

const kMaxAscii = 127;
let UnicodeToAsciiMapping = [];

for(let i = 0;i < kMaxAscii;i ++) {
  UnicodeToAsciiMapping.push(String.fromCharCode(i));
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
  c == '\\' ? 'Token::IDENTIFIER' :
  IsAsciiIdentifier(c) ? 'Token::IDENTIFIER' :
  // ...很多很多
  'Token::ILLEGAL'
};

const UnicodeToToken = UnicodeToAsciiMapping.map(c => TokenToAsciiMapping(c));

const Latin1_kMaxChar = 255;
// constexpr int kOneByteSize = kCharSize = sizeof(char);
const kOneByteSize = 1;

/**
 * 字符类型相关
 */
const kTerminatesLiteral = 1 << 0;
const kCannotBeKeyword = 1 << 1;
const kCannotBeKeywordStart = 1 << 2;
const kStringTerminator = 1 << 3;
const kIdentifierNeedsSlowPath = 1 << 4;
const kMultilineCommentCharacterNeedsSlowPath = 1 << 5;

const CharTypeMapping = UnicodeToAsciiMapping.map(c => GetScanFlags(c));

export {
  Latin1_kMaxChar,
  kOneByteSize,
  UnicodeToAsciiMapping,
  UnicodeToToken,
  CharTypeMapping,
  kMaxAscii,
};