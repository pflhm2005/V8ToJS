export default class BytecodeNode {
  constructor() {
    this.bytecode_ = null;
    this.operands_ = [];
    this.operand_count_ = 0;
    this.source_info_ = null;
  }
}