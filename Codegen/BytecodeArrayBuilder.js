import BytecodeArrayWriter from "./BytecodeArrayWriter";
import {
  kNoSourcePosition,
  kLdaTheHole,
} from "../enum";
import { FLAG_ignition_reo, FLAG_ignition_filter_expression_positions } from "../Compiler/Flag";
import BytecodeRegisterAllocator from "./BytecodeRegisterAllocator";
import BytecodeRegisterOptimizer from "./BytecodeRegisterOptimizer";
import Register from "./Register";
import BytecodeNode from './BytecodeNode';

const kNone = 0;
const kRead = 1 << 0;
const kWrite = 1 << 1;
const kReadWrite = kRead | kWrite;

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

function OperandHelper(operand_types, builder, operands) {
  if (!operand_types.length) return 0;
  switch (operand_types[0]) {
    case kFlag8:
    case kIntrinsicId:
    case kRuntimeId:
    case kNativeContextIndex:
    case kIdx:
    case kUImm:
    case kRegCount:
      return operands;
  }
}

class BytecodeNodeBuilder {
  /**
   * 原方法较为复杂
   * 存在template与rest两套参数
   * 将两类参数进行分割
   * @param {BytecodeArrayBuilder*} builder 
   * @param {Array} operands 
   * @param {Array} template 
   */
  static Make(builder, operands, template) {
    const [bytecode, accumulator_use] = template;
    const operand_types = template.slice(2);
    builder.PrepareToOutputBytecode([bytecode, accumulator_use]);
    return BytecodeNode.Create(builder.CurrentSourcePosition(bytecode), OperandHelper(operand_types, builder, operands), template);
  }
}

export default class BytecodeArrayBuilder {
  constructor(parameter_count, locals_count, feedback_vector_spec, source_position_mode) {
    this.feedback_vector_spec_ = feedback_vector_spec;
    this.bytecode_generated_ = false;
    this.constant_array_builder_ = new ConstantArrayBuilder();
    this.handler_table_builder_ = new HandlerTableBuilder();
    this.parameter_count_ = parameter_count;
    this.local_register_count_ = locals_count;
    this.register_allocator_ = new BytecodeRegisterAllocator(this.local_register_count_);
    this.bytecode_array_writer_ = new BytecodeArrayWriter();
    this.register_optimizer_ = null;

    this.latest_source_info_ = new BytecodeSourceInfo();
    this.next_register_index_ = this.local_register_count_;

    if (FLAG_ignition_reo) {
      this.register_optimizer_ = new BytecodeRegisterOptimizer(
        this.register_allocator_, this.local_register_count_, parameter_count,
        new RegisterTransferWriter(this));
    }
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

  StackCheck() {

  }
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
    let node = new BytecodeNode(this.CreateLdaTheHoleNode());
    this.write(node);
  }
  CreateLdaTheHoleNode() {
    return BytecodeNodeBuilder.Make(this, [], [kLdaTheHole, kWrite]);
  }

  LoadConstantPoolEntry(entry) {
    this.OutputLdaConstant(entry);
    return this;
  }
  OutputLdaConstant(entry) {
    let node = new BytecodeNode(this.CreateLdaConstantNode(entry));
    this.write(node);
  }
  CreateLdaConstantNode(entry) {
    return BytecodeNodeBuilder.Make(this, [entry], [kLdaConstant, kWrite, kIdx]);
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
  StoreContextSlot() {
    return this;
  }
  CallRuntime() {
    return this;
  }
}

const kUninitializedPosition = -1;
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

class ConstantArrayBuilder {
  // TODO
  InsertDeferred() {
    return -1;
  }
}

class HandlerTableBuilder { }

class RegisterTransferWriter { }