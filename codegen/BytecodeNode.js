import { 
  OperandScale_kSingle, 
  OperandScale_kDouble, 
  OperandScale_kQuadruple, 
} from "../enum";
import { 
  BytecodeOperands_IsScalableUnsignedByte, 
  BytecodeOperands_IsScalableSignedByte, 
} from "../util/Bytecode";

const KB = 1024;
const MB = KB * KB;
const GB = KB * KB * KB;
const kMaxInt = 0x7FFFFFFF;
const kMinInt = -kMaxInt - 1;
const kMaxInt8 = (1 << 7) - 1;
const kMinInt8 = -(1 << 7);
const kMaxUInt8 = (1 << 8) - 1;
const kMinUInt8 = 0;
const kMaxInt16 = (1 << 15) - 1;
const kMinInt16 = -(1 << 15);
const kMaxUInt16 = (1 << 16) - 1;
const kMinUInt16 = 0;

function ScaleForUnsignedOperand(value) {
  if (value <= kMaxUInt8) {
    return OperandScale_kSingle;
  } else if (value <= kMaxUInt16) {
    return OperandScale_kDouble;
  } else {
    return OperandScale_kQuadruple;
  }
}

function ScaleForSignedOperand(value) {
  if (value >= kMinInt8 && value <= kMaxInt8) {
    return OperandScale_kSingle;
  } else if (value >= kMinInt16 && kMaxInt16) {
    return OperandScale_kDouble;
  } else {
    return OperandScale_kQuadruple;
  }
}

export default class BytecodeNode {
  constructor(bytecode, operand_count, operand_scale, source_info,
    operand0 = 0, operand1 = 0, operand2 = 0, operand3 = 0, operand4 = 0) {
    this.bytecode_ = bytecode;
    this.operands_ = [operand0, operand1, operand2, operand3, operand4];
    this.operand_count_ = operand_count;
    this.operand_scale_ = operand_scale;
    this.source_info_ = source_info;
  }
  static ScaleForOperand(operand_type, operand) {
    if (BytecodeOperands_IsScalableUnsignedByte(operand_type)) {
      return ScaleForUnsignedOperand(operand);
    } else if (BytecodeOperands_IsScalableSignedByte(operand_type)) {
      return ScaleForSignedOperand(operand);
    } else {
      return OperandScale_kSingle;
    }
  }
  static Create0(bytecode, accm_use, source_info) {
    return new BytecodeNode(bytecode, 0, OperandScale_kSingle, source_info);
  }
  static Create1(bytecode, accm_use, source_info, operand0, operand0_type) {
    let scale = OperandScale_kSingle;
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand0_type, operand0));
    return new BytecodeNode(bytecode, 1, scale, source_info, operand0);
  }
  static Create2(bytecode, accm_use, source_info, operand0, operand1, operand0_type, operand1_type) {
    let scale = OperandScale_kSingle;
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand0_type, operand0));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand1_type, operand1));
    return new BytecodeNode(bytecode, 2, scale, source_info, operand0, operand1);
  }
  static Create3(bytecode, accm_use, source_info,
    operand0, operand1, operand2,
    operand0_type, operand1_type, operand2_type) {
    let scale = OperandScale_kSingle;
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand0_type, operand0));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand1_type, operand1));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand2_type, operand2));
    return new BytecodeNode(bytecode, 3, scale, source_info, operand0, operand1, operand2);
  }
  static Create4(bytecode, accm_use, source_info,
    operand0, operand1, operand2, operand3,
    operand0_type, operand1_type, operand2_type, operand3_type) {
    let scale = OperandScale_kSingle;
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand0_type, operand0));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand1_type, operand1));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand2_type, operand2));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand3_type, operand3));
    return new BytecodeNode(bytecode, 4, scale, source_info, operand0, operand1, operand2, operand3);
  }
  static Create5(bytecode, accm_use, source_info,
    operand0, operand1, operand2, operand3, operand4,
    operand0_type, operand1_type, operand2_type, operand3_type, operand4_type) {
    let scale = OperandScale_kSingle;
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand0_type, operand0));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand1_type, operand1));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand2_type, operand2));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand3_type, operand3));
    scale = Math.max(scale, BytecodeNode.ScaleForOperand(operand4_type, operand4));
    return new BytecodeNode(bytecode, 5, scale, source_info, operand0, operand1, operand2, operand3, operand4);
  }
}