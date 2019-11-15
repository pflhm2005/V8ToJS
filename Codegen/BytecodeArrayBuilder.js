import BytecodeArrayWriter from "./BytecodeArrayWriter";
import { kNoSourcePosition } from "../enum";

export default class BytecodeArrayBuilder {
  constructor() {
    this.bytecode_array_writer_ = new BytecodeArrayWriter();
    this.latest_source_info_ = new BytecodeSourceInfo();
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
  RemainderOfBlockIsDead() {
    return this.bytecode_array_writer_.exit_seen_in_block_;
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