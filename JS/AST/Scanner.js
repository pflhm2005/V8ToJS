import Stream from './Stream';
import TokenDesc from './TokenDesc';
import { kMaxAscii } from './Const';

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
          // ...
        } 
      }
      /**
       * 源码中这里处理一些特殊情况 不展开了
       */
    } while(token === 'Token::WHITESPACE')
    return token;
  }
  ScanString() {
    // 保存当前字符串的标记符号 ' 或 "
    let quote = this.c0_;
    this.next().literal_chars.Start();
    while(true) {
      this.AdvanceUntil();
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
  AdvanceUntil() {
    /**
     * 这里需要实现std标准库中一个方法
     * 实际上是三个参数 且前两个参数为迭代器 为了方便暂时就不完美实现了
     */
    const find_if = (arr, start, end, callback) => {
      let tarArr = arr.slice(start, end);
      let tarIdx = tarArr.findIndex(v => callback(v));
      return tarIdx === -1 ? end : tarIdx;
    }
    const callback = (c0) => {
      /**
       * 代表当前字符可能是一个结束符 这里简化了判断 源码如下
       * uint8_t char_flags = character_scan_flags[c0];
       * if (MayTerminateString(char_flags)) return true;
       */
      if(["\'", "\""].includes(UnicodeToAsciiMapping[c0])) return true;
      this.AddLiteralChar(c0);
      return false;
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