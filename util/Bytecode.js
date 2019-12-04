import {
  Bytecode_kJump,
  Bytecode_kJumpIfJSReceiver,
  Bytecode_kSwitchOnSmiNoFeedback,
  Bytecode_kSwitchOnGeneratorState,
  OperandTypeo_kImm,
  OperandTypeo_kRegOutTriple,
  OperandTypeo_kIdx,
  OperandTypeo_kRegCount,
  Bytecode_kLdar,
  Bytecode_kLdaZero,
  Bytecode_kLdaSmi,
  Bytecode_kLdaNull,
  Bytecode_kLdaTrue,
  Bytecode_kLdaFalse,
  Bytecode_kLdaUndefined,
  Bytecode_kLdaTheHole,
  Bytecode_kLdaConstant,
  Bytecode_kLdaContextSlot,
  Bytecode_kLdaCurrentContextSlot,
  Bytecode_kLdaImmutableContextSlot,
  Bytecode_kLdaImmutableCurrentContextSlot,
  OperandScale_kQuadruple,
  Bytecode_kExtraWide,
  OperandScale_kDouble,
  Bytecode_kWide,
  kOperandSizes,
  Runtime_FunctionId_kInlineAsyncFunctionAwaitCaught,
  Runtime_FunctionId_kInlineAsyncFunctionAwaitUncaught,
  Runtime_FunctionId_kInlineAsyncFunctionEnter,
  Runtime_FunctionId_kInlineAsyncFunctionReject,
  Runtime_FunctionId_kInlineAsyncFunctionResolve,
  Runtime_FunctionId_kInlineAsyncGeneratorAwaitCaught,
  Runtime_FunctionId_kInlineAsyncGeneratorAwaitUncaught,
  Runtime_FunctionId_kInlineAsyncGeneratorReject,
  Runtime_FunctionId_kInlineAsyncGeneratorResolve,
  Runtime_FunctionId_kInlineAsyncGeneratorYield,
  Runtime_FunctionId_kInlineCreateJSGeneratorObject,
  Runtime_FunctionId_kInlineGeneratorGetResumeMode,
  Runtime_FunctionId_kInlineGeneratorClose,
  Runtime_FunctionId_kInlineGetImportMetaObject,
  Runtime_FunctionId_kInlineCall,
  Runtime_FunctionId_kInlineCopyDataProperties,
  Runtime_FunctionId_kInlineCreateIterResultObject,
  Runtime_FunctionId_kInlineCreateAsyncFromSyncIterator,
  Runtime_FunctionId_kInlineHasProperty,
  Runtime_FunctionId_kInlineIsArray,
  Runtime_FunctionId_kInlineIsJSReceiver,
  Runtime_FunctionId_kInlineIsSmi,
  Runtime_FunctionId_kInlineToStringRT,
  Runtime_FunctionId_kInlineToLength,
  Runtime_FunctionId_kInlineToObject,
  IntrinsicId_kAsyncFunctionAwaitCaught,
  IntrinsicId_kAsyncFunctionAwaitUncaught,
  IntrinsicId_kAsyncFunctionEnter,
  IntrinsicId_kAsyncFunctionReject,
  IntrinsicId_kAsyncFunctionResolve,
  IntrinsicId_kAsyncGeneratorAwaitCaught,
  IntrinsicId_kAsyncGeneratorAwaitUncaught,
  IntrinsicId_kAsyncGeneratorReject,
  IntrinsicId_kAsyncGeneratorResolve,
  IntrinsicId_kAsyncGeneratorYield,
  IntrinsicId_kCreateJSGeneratorObject,
  IntrinsicId_kGeneratorGetResumeMode,
  IntrinsicId_kGeneratorClose,
  IntrinsicId_kGetImportMetaObject,
  IntrinsicId_kCall,
  IntrinsicId_kCopyDataProperties,
  IntrinsicId_kCreateIterResultObject,
  IntrinsicId_kCreateAsyncFromSyncIterator,
  IntrinsicId_kHasProperty,
  IntrinsicId_kIsArray,
  IntrinsicId_kIsJSReceiver,
  IntrinsicId_kIsSmi,
  IntrinsicId_kToStringRT,
  IntrinsicId_kToLength,
  IntrinsicId_kToObject,
} from "../enum";
import { IsInRange } from "./Identifier";

export const Bytecodes_IsJump = (bytecode) => bytecode >= Bytecode_kJump && bytecode <= Bytecode_kJumpIfJSReceiver;
export const Bytecodes_IsSwitch = (bytecode) => bytecode === Bytecode_kSwitchOnSmiNoFeedback || bytecode === Bytecode_kSwitchOnGeneratorState;
export const Bytecodes_IsAccumulatorLoadWithoutEffects = (bytecode) =>
  bytecode === Bytecode_kLdar || bytecode === Bytecode_kLdaZero ||
  bytecode === Bytecode_kLdaSmi || bytecode === Bytecode_kLdaNull ||
  bytecode === Bytecode_kLdaTrue || bytecode === Bytecode_kLdaFalse ||
  bytecode === Bytecode_kLdaUndefined || bytecode === Bytecode_kLdaTheHole ||
  bytecode === Bytecode_kLdaConstant || bytecode === Bytecode_kLdaContextSlot ||
  bytecode === Bytecode_kLdaCurrentContextSlot || bytecode === Bytecode_kLdaImmutableContextSlot ||
  bytecode === Bytecode_kLdaImmutableCurrentContextSlot;
export const Bytecodes_OperandScaleToPrefixBytecode = (operand_scale) => {
  switch (operand_scale) {
    case OperandScale_kQuadruple:
      return Bytecode_kExtraWide;
    case OperandScale_kDouble:
      return Bytecode_kWide;
    default:
      throw new Error('UNREACHABLE');
  }
}
export const Bytecodes_GetOperandSizes = (bytecode, operand_scale) => {
  let scale_index = operand_scale >> 1;
  // TODO 这里的宏看不懂
  return 0;
  // return kOperandSizes[scale_index][bytecode];
}

export const BytecodeOperands_IsScalableSignedByte = (operand_type) => IsInRange(operand_type, OperandTypeo_kImm, OperandTypeo_kRegOutTriple);
export const BytecodeOperands_IsScalableUnsignedByte = (operand_type) => IsInRange(operand_type, OperandTypeo_kIdx, OperandTypeo_kRegCount);

export const IntrinsicsHelper_IsSupported = (function_id) => {
  switch (function_id) {
    case Runtime_FunctionId_kInlineAsyncFunctionAwaitCaught:
    case Runtime_FunctionId_kInlineAsyncFunctionAwaitUncaught:
    case Runtime_FunctionId_kInlineAsyncFunctionEnter:
    case Runtime_FunctionId_kInlineAsyncFunctionReject:
    case Runtime_FunctionId_kInlineAsyncFunctionResolve:
    case Runtime_FunctionId_kInlineAsyncGeneratorAwaitCaught:
    case Runtime_FunctionId_kInlineAsyncGeneratorAwaitUncaught:
    case Runtime_FunctionId_kInlineAsyncGeneratorReject:
    case Runtime_FunctionId_kInlineAsyncGeneratorResolve:
    case Runtime_FunctionId_kInlineAsyncGeneratorYield:
    case Runtime_FunctionId_kInlineCreateJSGeneratorObject:
    case Runtime_FunctionId_kInlineGeneratorGetResumeMode:
    case Runtime_FunctionId_kInlineGeneratorClose:
    case Runtime_FunctionId_kInlineGetImportMetaObject:
    case Runtime_FunctionId_kInlineCall:
    case Runtime_FunctionId_kInlineCopyDataProperties:
    case Runtime_FunctionId_kInlineCreateIterResultObject:
    case Runtime_FunctionId_kInlineCreateAsyncFromSyncIterator:
    case Runtime_FunctionId_kInlineHasProperty:
    case Runtime_FunctionId_kInlineIsArray:
    case Runtime_FunctionId_kInlineIsJSReceiver:
    case Runtime_FunctionId_kInlineIsSmi:
    case Runtime_FunctionId_kInlineToStringRT:
    case Runtime_FunctionId_kInlineToLength:
    case Runtime_FunctionId_kInlineToObject:
      return true;
    default:
      return false;
  }
}

export const IntrinsicsHelper_FromRuntimeId = (function_id) => {
  switch (function_id) {
    case Runtime_FunctionId_kInlineAsyncFunctionAwaitCaught:
      return IntrinsicId_kAsyncFunctionAwaitCaught;
    case Runtime_FunctionId_kInlineAsyncFunctionAwaitUncaught:
      return IntrinsicId_kAsyncFunctionAwaitUncaught;
    case Runtime_FunctionId_kInlineAsyncFunctionEnter:
      return IntrinsicId_kAsyncFunctionEnter;
    case Runtime_FunctionId_kInlineAsyncFunctionReject:
      return IntrinsicId_kAsyncFunctionReject;
    case Runtime_FunctionId_kInlineAsyncFunctionResolve:
      return IntrinsicId_kAsyncFunctionResolve;
    case Runtime_FunctionId_kInlineAsyncGeneratorAwaitCaught:
      return IntrinsicId_kAsyncGeneratorAwaitCaught;
    case Runtime_FunctionId_kInlineAsyncGeneratorAwaitUncaught:
      return IntrinsicId_kAsyncGeneratorAwaitUncaught;
    case Runtime_FunctionId_kInlineAsyncGeneratorReject:
      return IntrinsicId_kAsyncGeneratorReject;
    case Runtime_FunctionId_kInlineAsyncGeneratorResolve:
      return IntrinsicId_kAsyncGeneratorResolve;
    case Runtime_FunctionId_kInlineAsyncGeneratorYield:
      return IntrinsicId_kAsyncGeneratorYield;
    case Runtime_FunctionId_kInlineCreateJSGeneratorObject:
      return IntrinsicId_kCreateJSGeneratorObject;
    case Runtime_FunctionId_kInlineGeneratorGetResumeMode:
      return IntrinsicId_kGeneratorGetResumeMode;
    case Runtime_FunctionId_kInlineGeneratorClose:
      return IntrinsicId_kGeneratorClose;
    case Runtime_FunctionId_kInlineGetImportMetaObject:
      return IntrinsicId_kGetImportMetaObject;
    case Runtime_FunctionId_kInlineCall:
      return IntrinsicId_kCall;
    case Runtime_FunctionId_kInlineCopyDataProperties:
      return IntrinsicId_kCopyDataProperties
    case Runtime_FunctionId_kInlineCreateIterResultObject:
      return IntrinsicId_kCreateIterResultObject;
    case Runtime_FunctionId_kInlineCreateAsyncFromSyncIterator:
      return IntrinsicId_kCreateAsyncFromSyncIterator;
    case Runtime_FunctionId_kInlineHasProperty:
      return IntrinsicId_kHasProperty;
    case Runtime_FunctionId_kInlineIsArray:
      return IntrinsicId_kIsArray;
    case Runtime_FunctionId_kInlineIsJSReceiver:
      return IntrinsicId_kIsJSReceiver;
    case Runtime_FunctionId_kInlineIsSmi:
      return IntrinsicId_kIsSmi;
    case Runtime_FunctionId_kInlineToStringRT:
      return IntrinsicId_kToStringRT;
    case Runtime_FunctionId_kInlineToLength:
      return IntrinsicId_kToLength;
    case Runtime_FunctionId_kInlineToObject:
      return IntrinsicId_kToObject;
    default:
      throw new Error('UNREACHABLE');
  }
}