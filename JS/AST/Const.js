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
  // ...很多很多
  'Token::ILLEGAL'
};

const UnicodeToToken = UnicodeToAsciiMapping.map(v => TokenToAsciiMapping(v));

const Latin1_kMaxChar = 255;
// constexpr int kOneByteSize = kCharSize = sizeof(char);
const kOneByteSize = 1;

export {
  Latin1_kMaxChar,
  kOneByteSize,
  UnicodeToAsciiMapping,
  UnicodeToToken,
};