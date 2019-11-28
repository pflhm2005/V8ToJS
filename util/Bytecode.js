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
  switch(operand_scale) {
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