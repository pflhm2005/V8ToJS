import { FLAG_enable_embedded_constant_pool } from "../compiler/Flag";

const kInvalidIndex = -1;

// 定义的乱七八糟
const kSystemPointerSize = 4;
const kCPSlotSize = FLAG_enable_embedded_constant_pool ? kSystemPointerSize : 0;
const kFixedFrameSizeFromFp = 2 * kSystemPointerSize + kCPSlotSize;
const kRegisterFileFromFp = -kFixedFrameSizeFromFp - 3 * kSystemPointerSize;

const kFPOnStackSize = kSystemPointerSize;
const kPCOnStackSize = kSystemPointerSize;
const kCallerFPOffset = 0 * kSystemPointerSize;
const kCallerPCOffset = kCallerFPOffset + 1 * kFPOnStackSize;
const kLastParamFromFp = kCallerPCOffset + 1 * kPCOnStackSize;
const kLastParamRegisterIndex = (kRegisterFileFromFp - kLastParamFromFp) / kSystemPointerSize;

const kFunctionOffset = -2 * kSystemPointerSize - kCPSlotSize;
const kFunctionClosureRegisterIndex = (kRegisterFileFromFp - kFunctionOffset) / kSystemPointerSize;

const kContextOrFrameTypeSize = kSystemPointerSize;
const kContextOrFrameTypeOffset = -(kCPSlotSize + kContextOrFrameTypeSize);
const kContextOffset = kContextOrFrameTypeOffset;
const kCurrentContextRegisterIndex = (kRegisterFileFromFp - kContextOffset) / kSystemPointerSize;

const kBytecodeArrayFromFp = -kFixedFrameSizeFromFp - 1 * kSystemPointerSize;
const kBytecodeArrayRegisterIndex = (kRegisterFileFromFp - kBytecodeArrayFromFp) / kSystemPointerSize;

const kBytecodeOffsetFromFp = -kFixedFrameSizeFromFp - 2 * kSystemPointerSize;
const kBytecodeOffsetRegisterIndex = (kRegisterFileFromFp - kBytecodeOffsetFromFp) / kSystemPointerSize;

const kCallerPCOffsetFromFp = kCallerPCOffset;
const kCallerPCOffsetRegisterIndex = (kRegisterFileFromFp - kCallerPCOffsetFromFp) / kSystemPointerSize;

const kRegisterFileStartOffset = kRegisterFileFromFp / kSystemPointerSize;

/**
 * 寄存器类
 * 负责管理变量
 */
export default class Register {
  static function_closure() {
    
  }
  static current_context() {
    return new Register(kCurrentContextRegisterIndex);
  }
  static FromParameterIndex(index, parameter_count) {
    let register_index = kLastParamRegisterIndex - parameter_count + index + 1;
    return new Register(register_index);
  }
  static virtual_accumulator() {
    return new Register(kCallerPCOffsetRegisterIndex);
  }
  constructor(index = kInvalidIndex) {
    this.index_ = index;
  }

  is_current_context() {
    return this.index_ === kCurrentContextRegisterIndex;
  }
  ToOperand() {
    return (kRegisterFileStartOffset - this.index_) >>> 0;
  }
  is_valid() {
    return this.index_ !== kInvalidIndex;
  }
}

export class RegisterList{
  constructor(first_reg_index = kInvalidIndex, register_count = 0) {
    if (first_reg_index instanceof Register) {
      first_reg_index = first_reg_index.index_;
      register_count = 1;
    }
    this.first_reg_index_ = first_reg_index;
    this.register_count_ = register_count;
  }
  /**
   * 这个类重载了[]操作符 因此所有取索引操作转换为这个方法
   * @param {int} 索引
   */
  get(i) {
    return new Register(this.first_reg_index_ + i);
  }
  first_register() {
    return this.register_count_ === 0 ? new Register(0) : this.get(0);
  }
}