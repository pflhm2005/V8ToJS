const kHeaderSize = 16;

/**
 * 返回一个等宽的内存长度
 * 数值为比当前数字大的最小8的倍数
 * 0 ~ 0
 * 1 ~ 8
 * 9 ~ 16
 * 等等
 * @param {int} value 实际长度
 */
function OBJECT_POINTER_ALIGN(value) {
  return (value + 7) & (~7);
}

export default class ByteArray {
  constructor() {
    this.length = 0;
    this.bytecodes = [];
  }
  static SizeFor(length) {
    return OBJECT_POINTER_ALIGN(kHeaderSize + length);
  }
}