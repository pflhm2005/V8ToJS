/**
 * 机器码枚举
 */
export const Bytecode_kWide = 0;
export const Bytecode_kExtraWide = 1;

export const Bytecode_kDebugBreakWide = 2;
export const Bytecode_kDebugBreakExtraWide = 3;
export const Bytecode_kDebugBreak0 = 4;
export const Bytecode_kDebugBreak1 = 5;
export const Bytecode_kDebugBreak2 = 6;
export const Bytecode_kDebugBreak3 = 7;
export const Bytecode_kDebugBreak4 = 8;
export const Bytecode_kDebugBreak5 = 9;
export const Bytecode_kDebugBreak6 = 10;

export const Bytecode_kLdaZero = 11;
export const Bytecode_kLdaSmi = 12;
export const Bytecode_kLdaUndefined = 13;
export const Bytecode_kLdaNull = 14;
export const Bytecode_kLdaTheHole = 15;
export const Bytecode_kLdaTrue = 16;
export const Bytecode_kLdaFalse = 17;
export const Bytecode_kLdaConstant = 18;

export const Bytecode_kLdaGlobal = 19;
export const Bytecode_kLdaGlobalInsideTypeof = 20;
export const Bytecode_kStaGlobal = 21;

export const Bytecode_kPushContext = 22;
export const Bytecode_kPopContext = 23;
export const Bytecode_kLdaContextSlot = 24;
export const Bytecode_kLdaImmutableContextSlot = 25;
export const Bytecode_kLdaCurrentContextSlot = 26;
export const Bytecode_kLdaImmutableCurrentContextSlot = 27;
export const Bytecode_kStaContextSlot = 28;
export const Bytecode_kStaCurrentContextSlot = 29;

export const Bytecode_kLdaLookupSlot = 31;
export const Bytecode_kLdaLookupContextSlot = 32;
export const Bytecode_kLdaLookupGlobalSlot = 33;
export const Bytecode_kLdaLookupSlotInsideTypeof = 34;
export const Bytecode_kLdaLookupContextSlotInsideTypeof = 35;
export const Bytecode_kLdaLookupGlobalSlotInsideTypeof = 36;
export const Bytecode_kStaLookupSlot = 37;

export const Bytecode_kLdar = 38;
export const Bytecode_kStar = 39;

export const Bytecode_kMov = 40;

export const Bytecode_kLdaNamedProperty = 41;
export const Bytecode_kLdaNamedPropertyNoFeedback = 42;
export const Bytecode_kLdaKeyedProperty = 43;

export const Bytecode_kLdaModuleVariable = 44;
export const Bytecode_kStaModuleVariable = 45;

export const Bytecode_kStaNamedProperty = 46;
export const Bytecode_kStaNamedPropertyNoFeedback = 47;
export const Bytecode_kStaNamedOwnProperty = 48;
export const Bytecode_kStaKeyedProperty = 49;
export const Bytecode_kStaInArrayLiteral = 50;
export const Bytecode_kStaDataPropertyInLiteral = 51;
export const Bytecode_kCollectTypeProfile = 52;

export const Bytecode_kAdd = 53;
export const Bytecode_kSub = 54;
export const Bytecode_kMul = 55;
export const Bytecode_kDiv = 56;
export const Bytecode_kMod = 57;
export const Bytecode_kExp = 58;
export const Bytecode_kBitwiseOr = 59;
export const Bytecode_kBitwiseXor = 60;
export const Bytecode_kBitwiseAnd = 61;
export const Bytecode_kShiftLeft = 62;
export const Bytecode_kShiftRight = 63;
export const Bytecode_kShiftRightLogical = 64;

export const Bytecode_kAddSmi = 65;
export const Bytecode_kSubSmi = 66;
export const Bytecode_kMulSmi = 67;
export const Bytecode_kDivSmi = 68;
export const Bytecode_kModSmi = 69;
export const Bytecode_kExpSmi = 70;
export const Bytecode_kBitwiseOrSmi = 71;
export const Bytecode_kBitwiseXorSmi = 72;
export const Bytecode_kBitwiseAndSmi = 73;
export const Bytecode_kShiftLeftSmi = 74;
export const Bytecode_kShiftRightSmi = 75;
export const Bytecode_kShiftRightLogicalSmi = 76;

export const Bytecode_kInc = 77;
export const Bytecode_kDec = 78;
export const Bytecode_kNegate = 79;
export const Bytecode_kBitwiseNot = 80;
export const Bytecode_kToBooleanLogicalNot = 81;
export const Bytecode_kLogicalNot = 82;
export const Bytecode_kTypeOf = 83;
export const Bytecode_kDeletePropertyStrict = 84;
export const Bytecode_kDeletePropertySloppy = 85;

export const Bytecode_kGetSuperConstructor = 86;

export const Bytecode_kCallAnyReceiver = 87;
export const Bytecode_kCallProperty = 88;
export const Bytecode_kCallProperty0 = 89;
export const Bytecode_kCallProperty1 = 90;
export const Bytecode_kCallProperty2 = 91;
export const Bytecode_kCallUndefinedReceiver = 92;
export const Bytecode_kCallUndefinedReceiver0 = 93;
export const Bytecode_kCallUndefinedReceiver1 = 94;
export const Bytecode_kCallUndefinedReceiver2 = 95;
export const Bytecode_kCallNoFeedback = 96;
export const Bytecode_kCallWithSpread = 97;
export const Bytecode_kCallRuntime = 98;
export const Bytecode_kCallRuntimeForPair = 99;
export const Bytecode_kCallJSRuntime = 100;

export const Bytecode_kInvokeIntrinsic = 101;

export const Bytecode_kConstruct = 102;
export const Bytecode_kConstructWithSpread = 103;

export const Bytecode_kTestEqual = 104;
export const Bytecode_kTestEqualStrict = 105;
export const Bytecode_kTestLessThan = 106;
export const Bytecode_kTestGreaterThan = 107;
export const Bytecode_kTestLessThanOrEqual = 108;
export const Bytecode_kTestGreaterThanOrEqual = 109;
export const Bytecode_kTestReferenceEqual = 110;
export const Bytecode_kTestInstanceOf = 111;
export const Bytecode_kTestIn = 112;
export const Bytecode_kTestUndetectable = 113;
export const Bytecode_kTestNull = 114;
export const Bytecode_kTestUndefined = 115;
export const Bytecode_kTestTypeOf = 116;

export const Bytecode_kToName = 117;
export const Bytecode_kToNumber = 118;
export const Bytecode_kToNumeric = 119;
export const Bytecode_kToObject = 120;
export const Bytecode_kToString = 121;

export const Bytecode_kCreateRegExpLiteral = 122;
export const Bytecode_kCreateArrayLiteral = 123;
export const Bytecode_kCreateArrayFromIterable = 124;
export const Bytecode_kCreateEmptyArrayLiteral = 125;
export const Bytecode_kCreateObjectLiteral = 126;
export const Bytecode_kCreateEmptyObjectLiteral = 127;
export const Bytecode_kCloneObject = 128;

export const Bytecode_kGetTemplateObject = 129;

export const Bytecode_kCreateClosure = 130;

export const Bytecode_kCreateBlockContext = 131;
export const Bytecode_kCreateCatchContext = 132;
export const Bytecode_kCreateFunctionContext = 133;
export const Bytecode_kCreateEvalContext = 134;
export const Bytecode_kCreateWithContext = 135;

export const Bytecode_kCreateMappedArguments = 136;
export const Bytecode_kCreateUnmappedArguments = 137;
export const Bytecode_kCreateRestParameter = 138;

export const Bytecode_kJumpLoop = 139;
export const Bytecode_kJump = 140;
export const Bytecode_kJumpConstant = 141;
export const Bytecode_kJumpIfNullConstant = 142;
export const Bytecode_kJumpIfNotNullConstant = 143;
export const Bytecode_kJumpIfUndefinedConstant = 144;
export const Bytecode_kJumpIfNotUndefinedConstant = 145;
export const Bytecode_kJumpIfUndefinedOrNullConstant = 146;
export const Bytecode_kJumpIfTrueConstant = 147;
export const Bytecode_kJumpIfFalseConstant = 148;
export const Bytecode_kJumpIfJSReceiverConstant = 149;
export const Bytecode_kJumpIfToBooleanTrueConstant = 150;
export const Bytecode_kJumpIfToBooleanFalseConstant = 151;
export const Bytecode_kJumpIfToBooleanTrue = 152;
export const Bytecode_kJumpIfToBooleanFalse = 153;
export const Bytecode_kJumpIfTrue = 154;
export const Bytecode_kJumpIfFalse = 155;
export const Bytecode_kJumpIfNull = 156;
export const Bytecode_kJumpIfNotNull = 157;
export const Bytecode_kJumpIfUndefined = 158;
export const Bytecode_kJumpIfNotUndefined = 159;
export const Bytecode_kJumpIfUndefinedOrNull = 160;
export const Bytecode_kJumpIfJSReceiver = 161;

export const Bytecode_kSwitchOnSmiNoFeedback = 162;

export const Bytecode_kForInEnumerate = 163;
export const Bytecode_kForInPrepare = 164;
export const Bytecode_kForInContinue = 165;
export const Bytecode_kForInNext = 166;
export const Bytecode_kForInStep = 167;

export const Bytecode_kStackCheck = 168;

export const Bytecode_kSetPendingMessage = 169;

export const Bytecode_kThrow = 170;
export const Bytecode_kReThrow = 171;
export const Bytecode_kReturn = 172;
export const Bytecode_kThrowReferenceErrorIfHole = 173;
export const Bytecode_kThrowSuperNotCalledIfHole = 174;
export const Bytecode_kThrowSuperAlreadyCalledIfNotHole = 175;

export const Bytecode_kSwitchOnGeneratorState = 176;
export const Bytecode_kSuspendGenerator = 177;
export const Bytecode_kResumeGenerator = 178;

export const Bytecode_kGetIterator = 179;
export const Bytecode_kDebugger = 180;
export const Bytecode_kIncBlockCounter = 181;
export const Bytecode_kAbort = 182;
export const Bytecode_kIllegal = 183;

/**
 * 机器码操作符枚举
 */
export const OperandScale_kSingle = 1;
export const OperandScale_kDouble = 2;
export const OperandScale_kQuadruple = 4;
export const OperandScale_kLast = OperandScale_kQuadruple;

export const OperandType_kNone = 0;
export const OperandType_kFlag8 = 1;
export const OperandType_kIntrinsicId = 2;
export const OperandType_kRuntimeId = 3;
export const OperandType_kNativeContextIndex = 4;
export const OperandType_kIdx = 5;
export const OperandType_kUImm = 6;
export const OperandType_kRegCount = 7;
export const OperandType_kImm = 8;
export const OperandType_kReg = 9;
export const OperandType_kRegList = 10;
export const OperandType_kRegPair = 11;
export const OperandType_kRegOut = 12;
export const OperandType_kRegOutList = 13;
export const OperandType_kRegOutPair = 14;
export const OperandType_kRegOutTriple = 15;

export const AccumulatorUse_kNone = 0;
export const AccumulatorUse_kRead = 1 << 0;
export const AccumulatorUse_kWrite = 1 << 1;
export const AccumulatorUse_kReadWrite = AccumulatorUse_kRead | AccumulatorUse_kWrite;

export const OperandSize_kNone = 0;
export const OperandSize_kByte = 1;
export const OperandSize_kShort = 2;
export const OperandSize_kQuad = 4;
export const OperandSize_kLast = OperandSize_kQuad;

/**
 * 机器码操作空间映射
 */
export const kOperandSizes = [
  [],
  [],
  [],
];

/**
 * 机器码枚举与操作符的映射
 * V(Wide, AccumulatorUse::kNone) => (0): [Bytecode_kWide, AccumulatorUse_kNone]
 * ...
 * V(Illegal, AccumulatorUse::kNone) => (183): [Bytecode_kIllegal, AccumulatorUse_kNone]
 */
export const bytecodeMapping = [
  /* Extended width operands */
  [Bytecode_kWide, AccumulatorUse_kNone],
  [Bytecode_kExtraWide, AccumulatorUse_kNone],
  /* Debug Breakpoints */
  [Bytecode_kDebugBreakWide, AccumulatorUse_kReadWrite],
  [Bytecode_kDebugBreakExtraWide, AccumulatorUse_kReadWrite],
  [Bytecode_kDebugBreak0, AccumulatorUse_kReadWrite],
  [Bytecode_kDebugBreak1, AccumulatorUse_kReadWrite, OperandType_kReg],
  [Bytecode_kDebugBreak2, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kReg],
  [Bytecode_kDebugBreak3, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kReg, OperandType_kReg],
  [Bytecode_kDebugBreak4, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kReg, OperandType_kReg, OperandType_kReg],
  [Bytecode_kDebugBreak5, AccumulatorUse_kReadWrite, OperandType_kRuntimeId, OperandType_kReg, OperandType_kReg],
  [Bytecode_kDebugBreak6, AccumulatorUse_kReadWrite, OperandType_kRuntimeId, OperandType_kReg, OperandType_kReg, OperandType_kReg],
  /* Loading the accumulator */
  [Bytecode_kLdaZero, AccumulatorUse_kWrite],
  [Bytecode_kLdaSmi, AccumulatorUse_kWrite, OperandType_kImm],
  [Bytecode_kLdaUndefined, AccumulatorUse_kWrite],
  [Bytecode_kLdaNull, AccumulatorUse_kWrite],
  [Bytecode_kLdaTheHole, AccumulatorUse_kWrite],
  [Bytecode_kLdaTrue, AccumulatorUse_kWrite],
  [Bytecode_kLdaFalse, AccumulatorUse_kWrite],
  [Bytecode_kLdaConstant, AccumulatorUse_kWrite, OperandType_kIdx],
  /* Globals */
  [Bytecode_kLdaGlobal, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx],
  [Bytecode_kLdaGlobalInsideTypeof, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx],
  [Bytecode_kStaGlobal, AccumulatorUse_kRead, OperandType_kIdx, OperandType_kIdx],
  /* Context operations */
  [Bytecode_kPushContext, AccumulatorUse_kRead, OperandType_kRegOut],
  [Bytecode_kPopContext, AccumulatorUse_kNone, OperandType_kReg],
  [Bytecode_kLdaContextSlot, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kLdaImmutableContextSlot, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kLdaCurrentContextSlot, AccumulatorUse_kWrite, OperandType_kIdx],
  [Bytecode_kLdaImmutableCurrentContextSlot, AccumulatorUse_kWrite, OperandType_kIdx],
  [Bytecode_kStaContextSlot, AccumulatorUse_kRead, OperandType_kReg, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kStaCurrentContextSlot, AccumulatorUse_kRead, OperandType_kIdx],
  /* Load-Store lookup slots */
  [Bytecode_kLdaLookupSlot, AccumulatorUse_kWrite, OperandType_kIdx],
  [Bytecode_kLdaLookupContextSlot, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kLdaLookupGlobalSlot, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kLdaLookupSlotInsideTypeof, AccumulatorUse_kWrite, OperandType_kIdx],
  [Bytecode_kLdaLookupContextSlotInsideTypeof, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kLdaLookupGlobalSlotInsideTypeof, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kStaLookupSlot, AccumulatorUse_kReadWrite, OperandType_kIdx, OperandType_kFlag8],
  /* Register-accumulator transfers */
  [Bytecode_kLdar, AccumulatorUse_kWrite, OperandType_kReg],
  [Bytecode_kStar, AccumulatorUse_kRead, OperandType_kRegOut],
  /* Register-register transfers */
  [Bytecode_kMov, AccumulatorUse_kNone, OperandType_kReg, OperandType_kRegOut],
  /* Property loads (LoadIC) operations */
  [Bytecode_kLdaNamedProperty, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx, OperandType_kIdx],
  [Bytecode_kLdaNamedPropertyNoFeedback, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kLdaKeyedProperty, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  /* Operations on module variables */
  [Bytecode_kLdaModuleVariable, AccumulatorUse_kWrite, OperandType_kImm, OperandType_kUImm],
  [Bytecode_kStaModuleVariable, AccumulatorUse_kRead, OperandType_kImm, OperandType_kUImm],
  /* Propery stores (StoreIC) operations */
  [Bytecode_kStaNamedProperty, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx, OperandType_kIdx],
  [Bytecode_kStaNamedPropertyNoFeedback, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx, OperandType_kFlag8],
  [Bytecode_kStaNamedOwnProperty, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx, OperandType_kIdx],
  [Bytecode_kStaKeyedProperty, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kStaInArrayLiteral, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kStaDataPropertyInLiteral, AccumulatorUse_kRead, OperandType_kReg, OperandType_kReg, OperandType_kFlag8, OperandType_kIdx],
  [Bytecode_kCollectTypeProfile, AccumulatorUse_kRead, OperandType_kImm],
  /* Binary Operators */
  [Bytecode_kAdd, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kSub, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kMul, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kDiv, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kMod, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kExp, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kBitwiseOr, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kBitwiseXor, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kBitwiseAnd, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kShiftLeft, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kShiftRight, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kShiftRightLogical, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  /* Binary operators with immediate operands */
  [Bytecode_kAddSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kSubSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kMulSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kDivSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kModSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kExpSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kBitwiseOrSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kBitwiseXorSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kBitwiseAndSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kShiftLeftSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kShiftRightSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  [Bytecode_kShiftRightLogicalSmi, AccumulatorUse_kReadWrite, OperandType_kImm, OperandType_kIdx],
  /* Unary Operators */
  [Bytecode_kInc, AccumulatorUse_kReadWrite, OperandType_kIdx],
  [Bytecode_kDec, AccumulatorUse_kReadWrite, OperandType_kIdx],
  [Bytecode_kNegate, AccumulatorUse_kReadWrite, OperandType_kIdx],
  [Bytecode_kBitwiseNot, AccumulatorUse_kReadWrite, OperandType_kIdx],
  [Bytecode_kToBooleanLogicalNot, AccumulatorUse_kReadWrite],
  [Bytecode_kLogicalNot, AccumulatorUse_kReadWrite],
  [Bytecode_kTypeOf, AccumulatorUse_kReadWrite],
  [Bytecode_kDeletePropertyStrict, AccumulatorUse_kReadWrite, OperandType_kReg],
  [Bytecode_kDeletePropertySloppy, AccumulatorUse_kReadWrite, OperandType_kReg],
  /* GetSuperConstructor operator */
  [Bytecode_kGetSuperConstructor, AccumulatorUse_kRead, OperandType_kRegOut],
  /* Call operations */
  [Bytecode_kCallAnyReceiver, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount, OperandType_kIdx],
  [Bytecode_kCallProperty, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount, OperandType_kIdx],
  [Bytecode_kCallProperty0, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kCallProperty1, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kReg, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kCallProperty2, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kReg, OperandType_kReg, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kCallUndefinedReceiver, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount, OperandType_kIdx],
  [Bytecode_kCallUndefinedReceiver0, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kCallUndefinedReceiver1, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kCallUndefinedReceiver2, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kReg, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kCallNoFeedback, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount],
  [Bytecode_kCallWithSpread, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount, OperandType_kIdx],
  [Bytecode_kCallRuntime, AccumulatorUse_kWrite, OperandType_kRuntimeId, OperandType_kRegList, OperandType_kRegCount],
  [Bytecode_kCallRuntimeForPair, AccumulatorUse_kNone, OperandType_kRuntimeId, OperandType_kRegList, OperandType_kRegCount, OperandType_kRegOutPair],
  [Bytecode_kCallJSRuntime, AccumulatorUse_kWrite, OperandType_kNativeContextIndex, OperandType_kRegList, OperandType_kRegCount],
  /* Intrinsics */
  [Bytecode_kInvokeIntrinsic, AccumulatorUse_kWrite, OperandType_kIntrinsicId, OperandType_kRegList, OperandType_kRegCount],
  /* Construct operators */
  [Bytecode_kConstruct, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount, OperandType_kIdx],
  [Bytecode_kConstructWithSpread, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount, OperandType_kIdx],
  /* Test Operators */
  [Bytecode_kTestEqual, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestEqualStrict, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestLessThan, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestGreaterThan, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestLessThanOrEqual, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestGreaterThanOrEqual, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestReferenceEqual, AccumulatorUse_kReadWrite, OperandType_kReg],
  [Bytecode_kTestInstanceOf, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestIn, AccumulatorUse_kReadWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kTestUndetectable, AccumulatorUse_kReadWrite],
  [Bytecode_kTestNull, AccumulatorUse_kReadWrite],
  [Bytecode_kTestUndefined, AccumulatorUse_kReadWrite],
  [Bytecode_kTestTypeOf, AccumulatorUse_kReadWrite, OperandType_kFlag8],
  /* Cast operators */
  [Bytecode_kToName, AccumulatorUse_kRead, OperandType_kRegOut],
  [Bytecode_kToNumber, AccumulatorUse_kReadWrite, OperandType_kIdx],
  [Bytecode_kToNumeric, AccumulatorUse_kReadWrite, OperandType_kIdx],
  [Bytecode_kToObject, AccumulatorUse_kRead, OperandType_kRegOut],
  [Bytecode_kToString, AccumulatorUse_kReadWrite],
  /* Literals */
  [Bytecode_kCreateRegExpLiteral, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kFlag8],
  [Bytecode_kCreateArrayLiteral, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kFlag8],
  [Bytecode_kCreateArrayFromIterable, AccumulatorUse_kReadWrite],
  [Bytecode_kCreateEmptyArrayLiteral, AccumulatorUse_kWrite, OperandType_kIdx],
  [Bytecode_kCreateObjectLiteral, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kFlag8],
  [Bytecode_kCreateEmptyObjectLiteral, AccumulatorUse_kWrite],
  [Bytecode_kCloneObject, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kFlag8, OperandType_kIdx],
  /* Tagged templates */
  [Bytecode_kGetTemplateObject, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx],
  /* Closure allocation */
  [Bytecode_kCreateClosure, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kIdx, OperandType_kFlag8],
  /* Context allocation */
  [Bytecode_kCreateBlockContext, AccumulatorUse_kWrite, OperandType_kIdx],
  [Bytecode_kCreateCatchContext, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx],
  [Bytecode_kCreateFunctionContext, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kCreateEvalContext, AccumulatorUse_kWrite, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kCreateWithContext, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx],
  /* Arguments allocation */
  [Bytecode_kCreateMappedArguments, AccumulatorUse_kWrite],
  [Bytecode_kCreateUnmappedArguments, AccumulatorUse_kWrite],
  [Bytecode_kCreateRestParameter, AccumulatorUse_kWrite],
  /* Control Flow -- carefully ordered for efficient checks */
  /* - [Unconditional jumps] */
  [Bytecode_kJumpLoop, AccumulatorUse_kNone, OperandType_kUImm, OperandType_kImm],
  /* - [Forward jumps] */
  [Bytecode_kJump, AccumulatorUse_kNone, OperandType_kUImm],
  /* - [Start constant jumps] */
  [Bytecode_kJumpConstant, AccumulatorUse_kNone, OperandType_kIdx],
  /* - [Conditional jumps] */
  /* - [Conditional constant jumps] */
  [Bytecode_kJumpIfNullConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfNotNullConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfUndefinedConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfNotUndefinedConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfUndefinedOrNullConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfTrueConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfFalseConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfJSReceiverConstant, AccumulatorUse_kRead, OperandType_kIdx],
  /* - [Start ToBoolean jumps] */
  [Bytecode_kJumpIfToBooleanTrueConstant, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kJumpIfToBooleanFalseConstant, AccumulatorUse_kRead, OperandType_kIdx],
  /* - [End constant jumps] */
  /* - [Conditional immediate jumps] */
  [Bytecode_kJumpIfToBooleanTrue, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfToBooleanFalse, AccumulatorUse_kRead, OperandType_kUImm],
  /* - [End ToBoolean jumps] */
  [Bytecode_kJumpIfTrue, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfFalse, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfNull, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfNotNull, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfUndefined, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfNotUndefined, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfUndefinedOrNull, AccumulatorUse_kRead, OperandType_kUImm],
  [Bytecode_kJumpIfJSReceiver, AccumulatorUse_kRead, OperandType_kUImm],
  /* Smi-table lookup for switch statements */
  [Bytecode_kSwitchOnSmiNoFeedback, AccumulatorUse_kRead, OperandType_kIdx, OperandType_kUImm, OperandType_kImm],
  /* Complex flow control For..in */
  [Bytecode_kForInEnumerate, AccumulatorUse_kWrite, OperandType_kReg],
  [Bytecode_kForInPrepare, AccumulatorUse_kRead, OperandType_kRegOutTriple, OperandType_kIdx],
  [Bytecode_kForInContinue, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kReg],
  [Bytecode_kForInNext, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kReg, OperandType_kRegPair, OperandType_kIdx],
  [Bytecode_kForInStep, AccumulatorUse_kWrite, OperandType_kReg],
  /* Perform a stack guard check */
  [Bytecode_kStackCheck, AccumulatorUse_kNone],
  /* Update the pending message */
  [Bytecode_kSetPendingMessage, AccumulatorUse_kReadWrite],
  /* Non-local flow control */
  [Bytecode_kThrow, AccumulatorUse_kRead],
  [Bytecode_kReThrow, AccumulatorUse_kRead],
  [Bytecode_kReturn, AccumulatorUse_kRead],
  [Bytecode_kThrowReferenceErrorIfHole, AccumulatorUse_kRead, OperandType_kIdx],
  [Bytecode_kThrowSuperNotCalledIfHole, AccumulatorUse_kRead],
  [Bytecode_kThrowSuperAlreadyCalledIfNotHole, AccumulatorUse_kRead],
  /* Generators */
  [Bytecode_kSwitchOnGeneratorState, AccumulatorUse_kNone, OperandType_kReg, OperandType_kIdx, OperandType_kUImm],
  [Bytecode_kSuspendGenerator, AccumulatorUse_kRead, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount, OperandType_kUImm],
  [Bytecode_kResumeGenerator, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kRegList, OperandType_kRegCount],
  /* Iterator protocol operations */
  [Bytecode_kGetIterator, AccumulatorUse_kWrite, OperandType_kReg, OperandType_kIdx, OperandType_kIdx],
  /* Debugger */
  [Bytecode_kDebugger, AccumulatorUse_kNone],
  /* Block Coverage */
  [Bytecode_kIncBlockCounter, AccumulatorUse_kNone, OperandType_kIdx],
  /* Execution Abort (internal error) */
  [Bytecode_kAbort, AccumulatorUse_kNone, OperandType_kIdx],
  /* Illegal bytecode  */
  [Bytecode_kIllegal, AccumulatorUse_kNone],
];

export const Bytecode_kAny = 0;
export const Bytecode_kBoolean = 1;
export const Bytecode_kString = 2;

export const TypeHint_kAny = 0;
export const TypeHint_kBoolean = 1;
export const TypeHint_kString = 2;

export const AccumulatorPreservingMode_kNone = 0;
export const AccumulatorPreservingMode_kPreserve = 1;

export const ContextSlotMutability_kImmutableSlot = 0;
export const ContextSlotMutability_kMutableSlot = 1;