import BytecodeArrayWriter from "./BytecodeArrayWriter";
import {
  kNoSourcePosition,
} from "../enum";
import { FLAG_ignition_reo } from "../Compile/Flag";
import BytecodeRegisterAllocator from "./BytecodeRegisterAllocator";
import BytecodeRegisterOptimizer from "./BytecodeRegisterOptimizer";

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

export default class BytecodeArrayBuilder {
  constructor(parameter_count, locals_count, feedback_vector_spec, source_position_mode) {
    this.feedback_vector_spec_ = feedback_vector_spec;
    this.bytecode_generated_= false;
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
  StackCheck() {
    
  }
  Receiver() {

  }
  LoadUndefined() {
    
  }
  LoadAccumulatorWithRegister() {
    
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
    return BytecodeNodeBuilder.make(this, entry, kLdaConstant, kWrite, kIdx);
  }

  RemainderOfBlockIsDead() {
    return this.bytecode_array_writer_.exit_seen_in_block_;
  }
  AllocateDeferredConstantPoolEntry() {
    return this.constant_array_builder_.InsertDeferred();
  }
}

const kUninitializedPosition = -1;
const kNone = 0;
const kExpression = 0;
const kStatement = 0;

class BytecodeSourceInfo {
  constructor() {
    this.position_type_ = kNone;
    this.source_position_ = kUninitializedPosition;
  }
  MakeStatementPosition(source_position) {
    this.position_type_ = kStatement;
    this.source_position_ = source_position;
  }
}

class ConstantArrayBuilder {
  // TODO
  InsertDeferred() {
    return -1;
  }
}

class BytecodeNodeBuilder{
  static make(builder, operands, bytecode, accumulator_use, operand_types) {
    builder.PrepareToOutputBytecode();
    return BytecodeNode.Create(builder.CurrentSourcePosition(bytecode), operands);
  }
}

class HandlerTableBuilder {}

class RegisterTransferWriter {}