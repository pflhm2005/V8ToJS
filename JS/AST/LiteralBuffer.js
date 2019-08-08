import { Latin1_kMaxChar, kOneByteSize } from './Const';

export default class LiteralBuffer {
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
  one_byte_literal() {
    return this.backing_store_.map(v => String.fromCharCode(v)).join('');
  }
  ExpandBuffer() {}
}