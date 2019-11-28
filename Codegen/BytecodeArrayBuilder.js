import BytecodeArrayWriter from "./BytecodeArrayWriter";
import {
  kNoSourcePosition,
  AccumulatorUse_kWrite,
  Bytecode_kLdaTheHole,
  Bytecode_kLdaConstant,
  Bytecode_kPushContext,
  AccumulatorUse_kRead,
  OperandTypeo_kRegOut,
} from "../enum";
import { FLAG_ignition_reo, FLAG_ignition_filter_expression_positions } from "../Compiler/Flag";
import BytecodeRegisterAllocator from "./BytecodeRegisterAllocator";
import BytecodeRegisterOptimizer from "./BytecodeRegisterOptimizer";
import Register from "./Register";
import BytecodeNode from './BytecodeNode';
import ConstantArrayBuilder from './ConstantArrayBuilder';

const kFlag8 = 1;
const kIntrinsicId = 2;
const kRuntimeId = 3;
const kNativeContextIndex = 4;
const kIdx = 5;
const kUImm = 6;
const kRegCount = 7;
const kImm = 8;
const kReg = 9;
const kRegList = 10;
const kRegPair = 11;
const kRegOut = 12;
const kRegOutList = 13;
const kRegOutPair = 14;
const kRegOutTriple = 15;

// TODO
function IsWithoutExternalSideEffects() { return true; }

/* example

V(LdaTheHole, AccumulatorUse::kWrite)

BytecodeNode BytecodeArrayBuilder::CreateLdaTheHoleNode(Operands... operands) {
  return BytecodeNodeBuilder<Bytecode::kLdaTheHole, AccumulatorUse::kWrite>::Make(this, operands...)
};
void BytecodeArrayBuilder::OutputLdaTheHole(Operands... operands) {
  BytecodeNode node(CreateLdaTheHoleNode(operands...));
  Write(&node);
}
void BytecodeArrayBuilder::OutputLdaTheHole(BytecodeLabel* label, Operands... operands) {
  BytecodeNode node(CreateLdaTheHoleNode(operands...));
  WriteJump(&node, label);
}

#define DEFINE_BYTECODE_NODE_CREATOR(Name, ...)                              \
  template <typename... Operands>                                            \
  V8_INLINE static BytecodeNode Name(BytecodeSourceInfo source_info,         \
                                     Operands... operands) {                 \
    return Create<Bytecode::k##Name, __VA_ARGS__>(source_info, operands...); \
  }
  BYTECODE_LIST(DEFINE_BYTECODE_NODE_CREATOR)
#undef DEFINE_BYTECODE_NODE_CREATOR

template <Bytecode bytecode, AccumulatorUse accumulator_use, OperandType... operand_types>
class BytecodeNodeBuilder {
  static BytecodeNode Make(BytecodeArrayBuilder* builder, Operands... operands) {
    builder->PrepareToOutputBytecode<bytecode, accumulator_use>();
    return BytecodeNode::Create<bytecode, accumulator_use, operand_types...>(
        builder->CurrentSourcePosition(bytecode),
        OperandHelper<operand_types>::Convert(builder, operands)...);
  }
}

*/

/**
 * 机器码操作符处理
 * 分为三大量情况
 * 1. 立即数(Imm)
 * 2. 寄存器输入(Reg)
 * 3. 寄存器输出(RegOutput)
 */
function OperandHelper(operand_type, builder, value) {
  switch (operand_type) {
    case kFlag8:
    case kIntrinsicId:
    case kRuntimeId:
    case kNativeContextIndex:
    case kIdx:
    case kUImm:
    case kRegCount:
    case kImm:
      return value;
    case kReg:
      return builder.GetInputRegisterOperand(value);
    case kRegList:
      return builder.GetInputRegisterListOperand(value);
    case kRegPair:
      return builder.GetInputRegisterListOperand(value);
    case kRegOut:
      return builder.GetOutputRegisterOperand(value);
    case kRegOutList:
      return builder.GetOutputRegisterListOperand(value);
    case kRegOutPair:
      return builder.GetOutputRegisterListOperand(value);
    case kRegOutTriple:
      return builder.GetOutputRegisterListOperand(value);
  }
}

class BytecodeNodeBuilder {
  /**
   * 原方法较为复杂
   * 存在template与rest两套参数
   * 将两类参数进行分割 然后进行分类调用
   * @param {BytecodeArrayBuilder*} builder 字节码生成辅助工具
   * @param {Array} operands 操作符 可能有0~5个
   * @param {Array} template 字节码类型与操作符类型 可能有2~7个值
   * 由于operands和template的长度同步增加 因此可以简单化处理
   */
  static Make(builder, operands, template) {
    const [bytecode, accumulator_use] = template;
    const operand_types = template.slice(2);
    builder.PrepareToOutputBytecode(bytecode, accumulator_use);
    let source_info = builder.CurrentSourcePosition(bytecode);
    switch (operands.length) {
      case 0:
        return BytecodeNode.Create0(bytecode, accumulator_use, source_info);
      case 1:
        return BytecodeNode.Create1(
          bytecode, accumulator_use, source_info,
          OperandHelper(operand_types[0], builder, operands[0], 0), operand_types[0]);
      case 2:
        return BytecodeNode.Create2(
          bytecode, accumulator_use, source_info,
          ...operands.map((operand, i) => OperandHelper(operand_types[i], builder, operand)),
          operand_types[0], operand_types[1]);
      case 3:
        return BytecodeNode.Create3(
          bytecode, accumulator_use, source_info,
          ...operands.map((operand, i) => OperandHelper(operand_types[i], builder, operand)),
          operand_types[0], operand_types[1], operand_types[2]);
      case 4:
        return BytecodeNode.Create4(
          bytecode, accumulator_use, source_info,
          ...operands.map((operand, i) => OperandHelper(operand_types[i], builder, operand)),
          operand_types[0], operand_types[1], operand_types[2], operand_types[3]);
      case 5:
        return BytecodeNode.Create5(
          bytecode, accumulator_use, source_info,
          ...operands.map((operand, i) => OperandHelper(operand_types[i], builder, operand)),
          operand_types[0], operand_types[1], operand_types[2], operand_types[3], operand_types[4]);
    }
  }
}

/**
 * 该类负责输出各类机器码
 * 由于V8用宏处理了所有指令 所以很简便
 * JS也必须用特殊方法统一处理 一个一个写太麻烦了
 */
export default class BytecodeArrayBuilder {
  constructor(parameter_count, locals_count, feedback_vector_spec, source_position_mode) {
    this.feedback_vector_spec_ = feedback_vector_spec;
    this.bytecode_generated_ = false;
    this.constant_array_builder_ = new ConstantArrayBuilder();
    this.handler_table_builder_ = new HandlerTableBuilder();
    this.parameter_count_ = parameter_count;
    this.local_register_count_ = locals_count;
    this.register_allocator_ = new BytecodeRegisterAllocator(this.local_register_count_);
    this.bytecode_array_writer_ = new BytecodeArrayWriter(this.constant_array_builder_, source_position_mode);
    this.register_optimizer_ = null;

    this.latest_source_info_ = new BytecodeSourceInfo();
    this.deferred_source_info_ = new BytecodeSourceInfo();
    this.next_register_index_ = this.local_register_count_;

    if (FLAG_ignition_reo) {
      this.register_optimizer_ = new BytecodeRegisterOptimizer(
        this.register_allocator_, this.local_register_count_, parameter_count,
        new RegisterTransferWriter(this));
    }
  }
  Write(node) {
    this.AttachOrEmitDeferredSourceInfo(node);
    this.bytecode_array_writer_.Write(node);
  }
  AttachOrEmitDeferredSourceInfo(node) {
    if (!this.deferred_source_info_.is_valid()) return;
    if (!node.source_info_.is_valid()) {
      node.source_info_ = this.deferred_source_info_;
    } else if (this.deferred_source_info_.is_statement() &&
    node.source_info_.is_expression()) {
      let source_position = node.source_info_;
      source_position.MakeStatementPosition(source_position,source_position_);
      node.source_info_ = source_position;
    }
    this.deferred_source_info_.set_invalid();
  }

  SetStatementPosition(stmt) {
    if (stmt.position_ === kNoSourcePosition) return;
    this.latest_source_info_.MakeStatementPosition(stmt.position_);
  }
  PrepareToOutputBytecode(bytecode, accumulator_use) {
    if (this.register_optimizer_) {
      this.register_optimizer_.PrepareForBytecode(bytecode, accumulator_use);
    }
  }
  CurrentSourcePosition(bytecode) {
    let source_position = new BytecodeSourceInfo();
    if (this.latest_source_info_.is_valid()) {
      if (this.latest_source_info_.is_statement() ||
        !FLAG_ignition_filter_expression_positions ||
        !IsWithoutExternalSideEffects(bytecode)) {
        source_position = this.latest_source_info_;
        this.latest_source_info_.set_invalid();
      }
    }
    return source_position;
  }

  PushContext(context) {
    this.OutputPushContext(context);
    return this;
  }
  OutputPushContext(context) {
    let node = this.CreatePushContextNode(context);
    this.Write(node);
  }
  CreatePushContextNode(context) {
    return BytecodeNodeBuilder.Make(this, [context], [Bytecode_kPushContext, AccumulatorUse_kRead, OperandTypeo_kRegOut]);
  }

  StackCheck() {}
  Receiver() {

  }
  LoadUndefined() {

  }
  LoadAccumulatorWithRegister() {

  }
  LoadLiteral() {
    return this;
  }

  LoadTheHole() {
    this.OutputLdaTheHole();
    return this;
  }
  OutputLdaTheHole() {
    let node = this.CreateLdaTheHoleNode();
    this.Write(node);
  }
  CreateLdaTheHoleNode() {
    return BytecodeNodeBuilder.Make(this, [], [Bytecode_kLdaTheHole, AccumulatorUse_kWrite]);
  }

  LoadConstantPoolEntry(entry) {
    this.OutputLdaConstant(entry);
    return this;
  }
  OutputLdaConstant(entry) {
    let node = this.CreateLdaConstantNode(entry);
    this.write(node);
  }
  CreateLdaConstantNode(entry) {
    return BytecodeNodeBuilder.Make(this, [entry], [Bytecode_kLdaConstant, AccumulatorUse_kWrite, kIdx]);
  }

  RemainderOfBlockIsDead() {
    return this.bytecode_array_writer_.exit_seen_in_block_;
  }
  AllocateDeferredConstantPoolEntry() {
    return this.constant_array_builder_.InsertDeferred();
  }
  Receiver() {
    return Register.FromParameterIndex(0, this.parameter_count_);
  }
  Parameter(parameter_index) {
    return Register.FromParameterIndex(parameter_index + 1, this.parameter_count_);
  }
  StoreAccumulatorInRegister() {
    return this;
  }
  StoreContextSlot(context, slot_index, depth) {
    if (context.is_current_context() & depth === 0) {
      this.OutputStaCurrentContextSlot(slot_index);
    } else {
      this.OutputStaContextSlot(context, slot_index, depth);
    }
    return this;
  }
  CallRuntime() {
    return this;
  }

  /**
   * 以下方法服务OperandHelper函数
   */
  GetInputRegisterOperand(reg) {
    if (this.register_optimizer_) reg = this.register_optimizer_.GetInputRegister(reg);
    return reg.ToOperand();
  }
  GetInputRegisterListOperand(reg_list) {
    if (this.register_optimizer_) reg_list = this.register_optimizer_.GetInputRegisterList(reg_list);
    return reg_list.first_register().ToOperand();
  }
  GetOutputRegisterOperand(reg) {
    if (this.register_optimizer_) this.register_optimizer_.PrepareOutputRegister(reg);
    return reg.ToOperand();
  }
  GetOutputRegisterListOperand(reg_list) {
    if (this.register_optimizer_) this.register_optimizer_.PrepareOutputRegisterList(reg_list);
    return reg_list.first_register().ToOperand();
  }
}

/**
 * 纯内部使用
 */
const kUninitializedPosition = -1;
const kNone = 0;
const kExpression = 1;
const kStatement = 2;

class BytecodeSourceInfo {
  constructor() {
    this.position_type_ = kNone;
    this.source_position_ = kUninitializedPosition;
  }
  MakeStatementPosition(source_position) {
    this.position_type_ = kStatement;
    this.source_position_ = source_position;
  }
  is_valid() {
    return this.position_type_ !== kNone;
  }
  set_invalid() {
    this.position_type_ = kNone;
    this.source_position_ = kUninitializedPosition;
  }
  is_statement() {
    return this.position_type_ === kStatement;
  }
  is_expression() {
    return this.position_type_ === kExpression;
  }
}

class HandlerTableBuilder { }

class RegisterTransferWriter { }