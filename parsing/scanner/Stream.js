import  { UnicodeToAsciiMapping } from '../../util';
import { kEndOfInput } from '../../enum';

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
    this.buffer_start_ = 0;
    this.buffer_cursor_ = 0;
    this.buffer_end_ = 0;

    /**
     * 这个pos暂时不会用到
     */
    this.buffer_pos_ = 0;
  }
  pos() {
    return this.buffer_pos_ + (this.buffer_cursor_ - this.buffer_start_);
  }
  ReadBlockChecked() {
    return this.ReadBlock();
  }
  ReadBlock() {
    if (this.buffer_end_ !== 0) return false;
    this.buffer_ = this.source_string.split('').map(v => UnicodeToAsciiMapping.indexOf(v));
    this.buffer_end_ = this.buffer_.length;
    /**
     * 这里的返回与源码不同 涉及gc 不做展开
     */
    return true;
  }
  ReadBlockAt(new_pos) {
    this.buffer_pos_ = new_pos;
    this.buffer_cursor_ = this.buffer_start_;
    this.ReadBlockChecked();
  }
  /**
   * 撤销Advance操作
   */
  Back() {
    if (this.buffer_cursor_ > this.buffer_start_) {
      this.buffer_cursor_--;
    } else {
      this.ReadBlockAt(this.pos() - 1);
    }
  }
  /**
   * 返回当前字符
   * 同时会做初始化
   */
  Peek() {
    if (this.buffer_cursor_ < this.buffer_end_) {
      return this.buffer_[this.buffer_cursor_];
    } else if (this.ReadBlockChecked()) {
      return this.buffer_[this.buffer_cursor_];
    } else {
      return kEndOfInput;
    }
  }
  /**
   * 返回当前字符 并前进一格
   */
  Advance() {
    let tmp = this.Peek();
    this.buffer_cursor_++;
    return tmp;
  }
  AdvanceUntil(callback) {
    /**
     * 这里需要实现std标准库中一个方法
     * 实际上是三个参数 且前两个参数为迭代器 为了方便暂时就不完美实现了
     */
    const find_if = (arr, start, end, callback) => {
      let tarArr = arr.slice(start, end);

      let tarIdx = tarArr.findIndex(v => callback(v));
      return tarIdx === -1 ? end : (tarIdx + start);
    }

    let next_cursor_pos = find_if(this.buffer_, this.buffer_cursor_, this.buffer_end_, callback);

    if (next_cursor_pos === this.buffer_end_) {
      this.buffer_cursor_ = this.buffer_end_;
      if (!this.ReadBlockChecked()) {
        this.buffer_cursor_++;
        return kEndOfInput;
      }
    } else {
      this.buffer_cursor_ = next_cursor_pos + 1;
      return this.buffer_[next_cursor_pos];
    }
  }
}