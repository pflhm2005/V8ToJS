import BytecodeArrayWriter from "./BytecodeArrayWriter";
import {
  kNoSourcePosition,
  Bytecode_kLdaTheHole,
  Bytecode_kLdaConstant,
  Bytecode_kPushContext,
  bytecodeMapping,
  OperandType_kFlag8,
  OperandType_kIntrinsicId,
  OperandType_kRuntimeId,
  OperandType_kNativeContextIndex,
  OperandType_kIdx,
  OperandType_kUImm,
  OperandType_kRegCount,
  OperandType_kImm,
  OperandType_kRegList,
  OperandType_kRegPair,
  OperandType_kRegOut,
  OperandType_kRegOutList,
  OperandType_kRegOutPair,
  OperandType_kRegOutTriple,
  OperandType_kReg,
  Bytecode_kLdaUndefined,
  Bytecode_kLdar,
  Bytecode_kStaCurrentContextSlot,
  Bytecode_kStar,
  Bytecode_kMov,
  Bytecode_kLdaZero,
  Bytecode_kLdaSmi,
  Bytecode_kLdaNull,
  Bytecode_kBoolean,
} from "../enum";
import { FLAG_ignition_reo, FLAG_ignition_filter_expression_positions } from "../Compiler/Flag";
import BytecodeRegisterAllocator from "./BytecodeRegisterAllocator";
import BytecodeRegisterOptimizer from "./BytecodeRegisterOptimizer";
import Register from "./Register";
import BytecodeNode from './BytecodeNode';
import ConstantArrayBuilder from './ConstantArrayBuilder';

// TODO
function IsWithoutExternalSideEffects() { return true; }

/**
 * 机器码操作符处理
 * 分为三大量情况
 * 1. 立即数(Imm)
 * 2. 寄存器输入(Reg)
 * 3. 寄存器输出(RegOutput)
 */
function OperandHelper(operand_type, builder, value) {
  switch (operand_type) {
    case OperandType_kFlag8:
    case OperandType_kIntrinsicId:
    case OperandType_kRuntimeId:
    case OperandType_kNativeContextIndex:
    case OperandType_kIdx:
    case OperandType_kUImm:
    case OperandType_kRegCount:
    case OperandType_kImm:
      return value;
    case OperandType_kReg:
      return builder.GetInputRegisterOperand(value);
    case OperandType_kRegList:
      return builder.GetInputRegisterListOperand(value);
    case OperandType_kRegPair:
      return builder.GetInputRegisterListOperand(value);
    case OperandType_kRegOut:
      return builder.GetOutputRegisterOperand(value);
    case OperandType_kRegOutList:
      return builder.GetOutputRegisterListOperand(value);
    case OperandType_kRegOutPair:
      return builder.GetOutputRegisterListOperand(value);
    case OperandType_kRegOutTriple:
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
    let source_info = source_info = builder.CurrentSourcePosition(bytecode);
    switch (operands.length) {
      case 0:
        return BytecodeNode.Create0(bytecode, accumulator_use, source_info);
      case 1:
        return BytecodeNode.Create1(
          bytecode, accumulator_use, source_info,
          OperandHelper(operand_types[0], builder, operands[0]), operand_types[0]);
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
        this);
    }
  }
  /**
   * 下面是工具方法
   */
  Write(node) {
    this.AttachOrEmitDeferredSourceInfo(node);
    this.bytecode_array_writer_.Write(node);
  }
  SetExpressionPosition(expr) {
    let position = expr.position_;
    if (position === kNoSourcePosition) return;
    if (!this.latest_source_info_.is_statement()) {
      this.latest_source_info_.MakeExpressionPosition(position);
    }
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
  SetDeferredSourceInfo(source_info) {
    if (!source_info.is_valid()) return;
    this.deferred_source_info_ = source_info;
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
  RemainderOfBlockIsDead() {
    return this.bytecode_array_writer_.exit_seen_in_block_;
  }
  StackCheck() {}
  Receiver() {}

  /**
   * 下列函数处理字节码节点的生成
   * 一般分为三步
   * 1. Loadxxx/Push/Pop 立即值会直接output 特殊字面量会有一个从池里获取值的过程
   * 2. outputxxx 统一由宏定义
   * 3. Createxxx 统一由宏和枚举宏定义
   * 由于第一步不是固定的 所以统一对2、3进行类似于宏的统一分发处理
   */
  PushContext(ctx) {
    this.Output(Bytecode_kPushContext, [ctx]);
    return this;
  }
  OutputStar(reg) {
    this.Output(Bytecode_kStar, [reg]);
  }
  OutputStaContextSlot(...args) {
    this.Output(Bytecode_kStaCurrentContextSlot, args);
  }
  OutputStaCurrentContextSlot(ctx) {
    this.Output(Bytecode_kStaCurrentContextSlot, [ctx]);
  }
  LoadTheHole() {
    this.Output(Bytecode_kLdaTheHole);
    return this;
  }
  LoadConstantPoolEntry(entry) {
    this.Output(Bytecode_kLdaConstant, [entry]);
    return this;
  }
  LoadBoolean() {
    this.Output(Bytecode_kBoolean);
    return this;
  }
  LoadUndefined() {
    this.Output(Bytecode_kLdaUndefined);
    return this;
  }
  LoadNull() {
    this.Output(Bytecode_kLdaNull);
    return this;
  }
  LoadAccumulatorWithRegister(reg) {
    if (this.register_optimizer_) {
      this.SetDeferredSourceInfo(this.CurrentSourcePosition(Bytecode_kLdar));
      this.register_optimizer_.DoLdar(reg);
    } else {
      this.Output(Bytecode_kLdar);
    }
    return this;
  }
  /**
   * 重载过多 直接分为单个函数
   */
  LoadLiteral_Smi(smi) {
    if (smi === 0) {
      this.Output(Bytecode_kLdaZero);
    } else {
      this.Output(Bytecode_kLdaSmi, smi);
    }
    return this;
  }
  // TODO
  LoadLiteral_HeapNumber() {

  }
  LoadLiteral_String() {

  }
  LoadLiteral_Symbol() {

  }
  LoadLiteral_BigInt() {

  }

    /**
   * 将所有Ouput、Create方法统一处理
   * 逻辑参照DEFINE_BYTECODE_OUTPUT宏
   * @param {Bytecode} bytecode 字节码类型
   * @param {Operands} operands 操作类型
   * @returns {void}
   */
  Output(bytecode, operands = []) {
    let node = this.Create(bytecode, operands);
    this.Write(node);
  }
  /**
   * C++源码由template、rest参数组成
   * 枚举值由宏拼接而成 这里处理成手动传入
   * template参数的作用由于不是泛型声明而是实际使用 所以作为数组参数传入
   * @param 所有参数由Output透传进来
   * @returns {BytecodeNode}
   */
  Create(bytecode, operands = []) {
    return BytecodeNodeBuilder.Make(this, operands, bytecodeMapping[bytecode]);
  }

  /**
   * 这三个方法较为特殊 属于内存元操作
   * 直接走的Bytenode生成 不走Prepare 否则会造成无限递归
   */
  OutputLdarRaw(reg) {
    let operand = reg.ToOperand();
    let map = bytecodeMapping[Bytecode_kLdar];
    let node = BytecodeNode.Create1(Bytecode_kLdar, null, new BytecodeSourceInfo(), operand, map[2]);
    this.Write(node);
  }
  OutputStarRaw(reg) {
    let operand = reg.ToOperand();
    let map = bytecodeMapping[Bytecode_kStar];
    let node = BytecodeNode.Create1(Bytecode_kStar, null, new BytecodeSourceInfo(), operand, map[2]);
    this.Write(node);
  }
  OutputMovRaw(src, dest) {
    let operand0 = src.ToOperand();
    let operand1 = dest.ToOperand();
    let map = bytecodeMapping[Bytecode_kMov];
    let node = BytecodeNode.Create2(
      Bytecode_kStar, null, new BytecodeSourceInfo(), [operand0, operand1], map[2], map[3]);
    this.Write(node);
  }

  /**
   * 下面是一些功能性方法
   */
  AllocateDeferredConstantPoolEntry() {
    return this.constant_array_builder_.InsertDeferred();
  }
  Receiver() {
    return Register.FromParameterIndex(0, this.parameter_count_);
  }
  Parameter(parameter_index) {
    return Register.FromParameterIndex(parameter_index + 1, this.parameter_count_);
  }
  StoreAccumulatorInRegister(reg) {
    if (this.register_optimizer_) {
      this.SetDeferredSourceInfo(this.CurrentSourcePosition(Bytecode_kStar));
      this.register_optimizer_.DoStar(reg);
    } else {
      this.OutputStar(reg);
    }
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
  MakeExpressionPosition(source_position) {
    this.position_type_ = kExpression;
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