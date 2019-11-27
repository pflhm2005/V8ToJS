import { OperandScale_kSingle } from "../enum";

export default class BytecodeNode {
  constructor() {
    this.bytecode_ = null;
    this.operands_ = [];
    this.operand_count_ = 0;
    this.source_info_ = null;
  }
  static ScaleForOperand(operand_type, operand) {
    
  }
  static Create0(bytecode, accm_use, source_info) {
    return new BytecodeNode(bytecode, 0, OperandScale_kSingle, source_info);
  }
  static Create1(bytecode, accm_use, source_info, operand0, operand0_type) {
    let scale = OperandScale_kSingle;
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand0_type, operand0))
  }
  static Create2(bytecode, accm_use, source_info, operand0, operand1, operand0_type, operand1_type) {

  }
  static Create3(bytecode, accm_use, source_info, 
    operand0, operand1, operand2,
    operand0_type, operand1_type, operand2_type) {

  }
  static Create4(bytecode, accm_use, source_info, 
    operand0, operand1, operand2, operand3,
    operand0_type, operand1_type, operand2_type, operand3_type) {

  }
  static Create5(bytecode, accm_use, source_info, 
    operand0, operand1, operand2, operand3, operand4,
    operand0_type, operand1_type, operand2_type, operand3_type, operand4_type) {

  }
}