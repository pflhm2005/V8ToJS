import LiteralBuffer from './LiteralBuffer';
import Location from './Location';

export default class TokenDesc {
  constructor() {
    /**
     * 源码中是一个结构体
     * 除了标记起始、结束位置还有若干方法
     */
    this.location = new Location(0, 0);
    /**
     * 负责管理字符串
     * 还有一个raw_literal_chars属性储存源字符串
     */
    this.literal_chars = new LiteralBuffer();
    /**
     * Token类型
     * 此状态等同于null
     */
    this.token = 'Token::UNINITIALIZED';
    /**
     * 处理小整数
     */
    this.smi_value = 0;
    this.after_line_terminator = false;
  }
}