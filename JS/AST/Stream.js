import  { UnicodeToAsciiMapping } from './Util';

export default class Stream {
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