const source_code = "'Hello World'";

const kMaxAscii = 127;
const UnicodeToAsciiMapping = [];
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

class Stream {
  constructor(source_string) {
    /**
     * 最优处理是在初始化就对buffer_处理
     * 但为了模拟v8这里暂时保存源字符串
     */
    this.source_string = source_string;
    /**
     * 作为容器存储字符
     */
    this.buffer_ = [];
    /**
     * 三个指针分别代表当前解析进度
     */
    this.buffer_start_ = 0
    this.buffer_cursor_ = 0
    this.buffer_end_ = 0
  }
  ReadBlockChecked() {
    return this.ReadBlock();
  }
  ReadBlock() {
    this.buffer_ = this.source_string.split('').map(v => UnicodeToAsciiMapping.indexOf(v));
    this.buffer_end_ = this.buffer_.length;
    /**
     * 这里的返回与源码不同 涉及gc 不做展开
     */
    return this.buffer_.length;
  }
  /**
   * 返回当前字符 并前进一格
   */
  Advance() {
    let tmp = this.peek();
    this.buffer_cursor_++;
    return tmp;
  }
  /**
   * 返回当前字符
   * 同时会做初始化
   */
  peek() {
    if(this.buffer_cursor_ < this.buffer_end_) {
      return this.buffer_[this.buffer_cursor_];
    } else if(this.ReadBlockChecked()) {
      return this.buffer_[this.buffer_cursor_];
    } else {
      return null;
    }
  }
}

const Latin1_kMaxChar = 255;
// constexpr int kOneByteSize = kCharSize = sizeof(char);
const kOneByteSize = 1;
class LiteralBuffer {
  constructor() {
    /**
     * 源码中是一个Vector容器
     * 有对应扩容算法
     */
    this.backing_store_ = [];
    this.position_ = 0;
    /**
     * 当字符串中有字符的Unicode值大于255
     * 判定为双字节类型 这里先不处理这种
     */
    this.is_one_byte_ = null;
  }
  /**
   * 启动这个时默认字符串为单字节
   */
  Start() {
    this.position_ = 0;
    this.is_one_byte_ = true;
  }
  /**
   * 只关心单字节字符 所以那两个方法不给出实现了
   */
  AddChar(code_unit) {
    if(this.is_one_byte_) {
      if(code_unit <= Latin1_kMaxChar) {
        return this.AddOneByteChar(code_unit);
      }
      this.ConvertToTwoByte();
    }
    this.AddTwoByteChar(code_unit);
  }
  AddOneByteChar(one_byte_char) {
    /**
     * 扩容算法简述就是以64为基准 每次扩容*4
     * 当所需容器大于(1024 * 1024) / 3时 写死为2 * 1024 * 1024
     */
    if (this.position_ >= this.backing_store_.length) this.ExpandBuffer();
    this.backing_store_[this.position_] = one_byte_char;
    this.position_ += kOneByteSize;
  }
  ExpandBuffer() {}
}

class TokenDesc {
  constructor() {
    /**
     * 源码中是一个结构体
     * 除了标记起始、结束位置还有若干方法
     */
    this.location =  {
      beg_pos: 0,
      end_pos: 0,
    };
    /**
     * 负责管理字符串
     * 还有一个raw_literal_chars属性储存源字符串
     */
    this.literal_chars = new LiteralBuffer();
    /**
     * Token类型
     */
    this.token = null;
    /**
     * 处理小整数
     */
    this.smi_value = 0;
    this.after_line_terminator = false;
  }
}

class Scanner {
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

let scanner = new Scanner(source_code);
scanner.Initialize();
console.log(scanner)
