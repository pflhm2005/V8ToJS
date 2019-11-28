export const OperandScale_kSingle = 1;
export const OperandScale_kDouble = 2;
export const OperandScale_kQuadruple = 4;
export const OperandScale_kLast = OperandScale_kQuadruple;

export const OperandTypeo_kNone = 0;
export const OperandTypeo_kFlag8 = 1;
export const OperandTypeo_kIntrinsicId = 2;
export const OperandTypeo_kRuntimeId = 3;
export const OperandTypeo_kNativeContextIndex = 4;
export const OperandTypeo_kIdx = 5;
export const OperandTypeo_kUImm = 6;
export const OperandTypeo_kRegCount = 7;
export const OperandTypeo_kImm = 8;
export const OperandTypeo_kReg = 9;
export const OperandTypeo_kRegList = 10;
export const OperandTypeo_kRegPair = 11;
export const OperandTypeo_kRegOut = 12;
export const OperandTypeo_kRegOutList = 13;
export const OperandTypeo_kRegOutPair = 14;
export const OperandTypeo_kRegOutTriple = 15;

export const AccumulatorUse_kNone = 0;
export const AccumulatorUse_kRead = 1 << 0;
export const AccumulatorUse_kWrite = 1 << 1;
export const AccumulatorUse_kReadWrite = AccumulatorUse_kRead | AccumulatorUse_kWrite;

export const OperandSize_kNone = 0;
export const OperandSize_kByte = 1;
export const OperandSize_kShort = 2;
export const OperandSize_kQuad = 4;
export const OperandSize_kLast = OperandSize_kQuad;

export const kOperandSizes = [
  [],
  [],
  [],
];