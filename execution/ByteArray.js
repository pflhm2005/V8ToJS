const kHeaderSize = 16;

function OBJECT_POINTER_ALIGN(value) {
  return (value + 7) & (~7);
}

export default class ByteArray {
  constructor() {
    this.length = 0;
  }
  static SizeFor(length) {
    return OBJECT_POINTER_ALIGN(kHeaderSize + length);
  }
}