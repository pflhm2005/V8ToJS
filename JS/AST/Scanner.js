import Stream from './Stream';
import PerfectKeywordHash from './PerfectKeywordHash';
import TokenDesc from './TokenDesc';
import { 
  kMaxAscii, 
  kIdentifierNeedsSlowPath,
  IMPLICIT_OCTAL,
  BINARY,
  OCTAL,
  HEX,
  DECIMAL,
  IMPLICIT_ODECIMAL_WITH_LEADING_ZEROCTAL,
} from './Const';

import {
  TerminatesLiteral,
  IdentifierNeedsSlowPath,
  CanBeKeyword,
  character_scan_flags, 
  UnicodeToToken, 
  UnicodeToAsciiMapping,
  AsciiAlphaToLower,
} from './Util';

export default class Scanner {
  constructor(source_string) {
    this.source_ = new Stream(source_string);
    /**
     * 当前字符的Unicode编码
     * 如果为null代表解析完成
     */
    this.c0_ = null;
    /**
     * 其实v8有三个词法描述类
     * token_storage_是一个数组 里面装着那个三个类 这里就不用了
     * 为了方便就弄一个
     */
    this.TokenDesc = new TokenDesc();
    this.token_storage_ = [];
  }
  /**
   * 源码有current_、next_、next_next_三个标记 这里搞一个
   */
  next() {
    return this.TokenDesc;
  }
  Initialize() {
    this.Init();
    this.next().after_line_terminator = true;
    this.Scan();
  }
  Init() {
    this.Advance();
    // 后面会有一些词法描述类对token_storage_的映射 这里跳过
  }
  Advance() {
    this.c0_ = this.source_.Advance();
  }
  AddLiteralCharAdvance() {
    this.AddLiteralChar(this.c0_);
    this.Advance();
  }
  /**
   * 这里有函数重载 JS就直接用默认参数模拟了
   */
  Scan(next = this.TokenDesc) {
    next.token = this.ScanSingleToken();
    next.location.end_pos = this.source_.buffer_cursor_ - 1;
  }
  /**
   * 单个词法的解析
   */
  ScanSingleToken() {
    let token = null;
    do {
      this.next().location.beg_pos = this.source_.buffer_cursor_ - 1;
      if(this.c0_ < kMaxAscii) {
        token = UnicodeToToken[this.c0_];
        switch(token) {
          case 'Token::LPAREN':
          /**
           * 有很多其他的case
           * 因为只讲字符串
           * 这里就不实现这个方法了
           */
            return this.Select(token);
          case 'Token::STRING':
            return this.ScanString();
          // 数字开头的变量会在这里被拦截处理
          case 'Token::NUMBER':
            return ScanNumber(false);
          case 'Token::IDENTIFIER':
            return this.ScanIdentifierOrKeyword();
          // ...
        } 
      }
      /**
       * 源码中这里处理一些特殊情况 不展开了
       */
    } while(token === 'Token::WHITESPACE')
    return token;
  }
  /**
   * 解析数字相关
   * literal作为字面量类无所不能!
   */
  ScanNumber(seen_period) {
    let kind = DECIMAL;
    this.next().literal_chars.Start();
    // 正常写法的数字
    let as_start = !seen_period;
    let start_pos = 0;
    // 处理简写
    if(seen_period) {

    } else {
      /**
       * 共有数字0、0exxx、0Exxx、0.xxx、二进制、十六进制、八进制、十进制八种情况
       */
      if(this.c0_ === '0') {
        this.AddLiteralCharAdvance();

        // 0x代表16进制
        if(AsciiAlphaToLower(c0_) === 'x') {
          this.AddLiteralCharAdvance();
          kind = HEX;
          if(!ScanHexDigits()) return 'TOKEN:ILLEGAL';
        } else if(AsciiAlphaToLower(c0_) === 'o') {
          this.AddLiteralCharAdvance();
          kind = OCTAL;
          if(!ScanOctalDigits()) return 'Token::ILLEGAL';
        } else if(AsciiAlphaToLower(c0_) === 'b') {
          this.AddLiteralCharAdvance();
          kind = BINARY;
          if(!ScanBinaryDigits()) return 'Token::ILLEGAL';
        } else if(IsOctalDigit(c0_)) {
          kind = IMPLICIT_OCTAL;
          // 这里的kind作为引用传入 JS没这个东西 做做样子
          if(!ScanImplicitOctalDigits(start_pos, kind)) return 'Token::ILLEGAL';
          if(kind === DECIMAL_WITH_LEADING_ZERO) as_start = false;
        }
      }
    }
  }
  /**
   * 解析标识符相关
   * 标识符的解析也用到了literal类
   */
  ScanIdentifierOrKeyword() {
    this.next().literal_chars.Start();
    return this.ScanIdentifierOrKeywordInner();
  }
  ScanIdentifierOrKeywordInner() {
    /**
     * 两个布尔类型的flag 
     * 一个标记转义字符 一个标记关键词
     */
    let escaped = false;
    let can_be_keyword = true;
    if(this.c0_ < kMaxAscii) {
      // 转义字符以'\'字符开头
      if(this.c0_ !== '\\') {
        let scan_flags = character_scan_flags[this.c0_];
        // 这个地方比较迷 没看懂
        scan_flags >>= 1;
        this.AddLiteralChar(this.c0_);
        this.AdvanceUntil((c0) => {
          // 当某个字符的Ascii值大于127 进入慢解析
          if(c0 > kMaxAscii) {
            scan_flags |= kIdentifierNeedsSlowPath;
            return true;
          }
          // 叠加每个字符的bitmap
          let char_flags = character_scan_flags[c0];
          scan_flags |= char_flags;
          // 用bitmap判断是否结束
          if(TerminatesLiteral(char_flags)) {
            return true;
          } else {
            this.AddLiteralChar(c0);
            return false;
          }
        });
        // 基本上都是进这里
        if(!IdentifierNeedsSlowPath(scan_flags)) {
          if(!CanBeKeyword(scan_flags)) return 'Token::IDENTIFIER';
          // 源码返回一个新的vector容器 这里简单处理成一个字符串
          let str = this.next().literal_chars.one_byte_literal();
          return this.KeywordOrIdentifierToken(str, str.length);
        }
        can_be_keyword = CanBeKeyword(scan_flags);
      } else {
        escaped = true;
        // let c = this.ScanIdentifierUnicodeEscape();
        // 合法变量以大小写字母_开头
        // if(c === '\\' || !IsIdentifierStart(c)) return 'Token::ILLEGAL';
        // this.AddLiteralChar(c);
        // can_be_keyword = CharCanBeKeyword(c);
      }
    }
    // 逻辑同上 进这里代表首字符Ascii值就过大
    // return ScanIdentifierOrKeywordInnerSlow(escaped, can_be_keyword);
  }
  // 跳到另外一个文件里实现
  KeywordOrIdentifierToken(str, len) {
    return PerfectKeywordHash.GetToken(str, len);
  }
  ScanIdentifierUnicodeEscape() {
  }
  /**
   * 解析字符串相关
   */
  ScanString() {
    // 保存当前字符串的标记符号 ' 或 "
    let quote = this.c0_;
    this.next().literal_chars.Start();
    while(true) {
      this.AdvanceUntil((c0) => {
        /**
         * 代表当前字符可能是一个结束符 这里简化了判断 源码如下
         * uint8_t char_flags = character_scan_flags[c0];
         * if (MayTerminateString(char_flags)) return true;
         */
        if(["\'", "\""].includes(UnicodeToAsciiMapping[c0])) return true;
        this.AddLiteralChar(c0);
        return false;
      });
      /**
       * 特殊符号直接前进一格
       */
      while(this.c0_ === '\\') {
        this.Advance();
      }
      /**
       * 遇到结束的标记代表解析结束
       */
      if (this.c0_ === quote) {
        this.Advance();
        return 'Token::STRING';
      }
      this.AddLiteralChar(this.c0_);
    }
  }
  AddLiteralChar(c) {
    this.next().literal_chars.AddChar(c);
  }
  /**
   * 这里相对源码有改动
   * 1、实际调用的是source_上的方法 并把返回值给了c0_
   * 2、判断函数在这里写实现
   */
  AdvanceUntil(callback) {
    /**
     * 这里需要实现std标准库中一个方法
     * 实际上是三个参数 且前两个参数为迭代器 为了方便暂时就不完美实现了
     */
    const find_if = (arr, start, end, callback) => {
      let tarArr = arr.slice(start, end);
      let tarIdx = tarArr.findIndex(v => callback(v));
      return tarIdx === -1 ? end : tarIdx;
    }
    /**
     * 在字符串中寻找第一个字符结尾标记的位置
     * 例如'、"等等
     */
    let next_cursor_pos = find_if(this.source_.buffer_, this.source_.buffer_cursor_, this.source_.buffer_end_, callback);
    if(next_cursor_pos === this.source_.buffer_end_) {
      this.source_.buffer_cursor_ = this.source_.buffer_end_;
      this.c0_ = null;
    } else {
      this.source_.buffer_cursor_ = next_cursor_pos + 1;
      this.c0_ = this.source_.buffer_[next_cursor_pos + 1];
    }
  }
}