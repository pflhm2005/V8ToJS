import { FLAG_enable_embedded_constant_pool } from "../Compiler/Flag";

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
}

export class RegisterList{
  constructor(first_reg_index, register_count) {
    this.first_reg_index_ = first_reg_index;
    this.register_count_ = register_count;
  }
  get(i) {
    return new Register(this.first_reg_index_ + i);
  }
}