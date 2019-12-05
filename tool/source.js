const fs = require('fs');

/**
 * 机器码枚举
 */
const Bytecode_kWide = 0;
const Bytecode_kExtraWide = 1;

const Bytecode_kDebugBreakWide = 2;
const Bytecode_kDebugBreakExtraWide = 3;
const Bytecode_kDebugBreak0 = 4;
const Bytecode_kDebugBreak1 = 5;
const Bytecode_kDebugBreak2 = 6;
const Bytecode_kDebugBreak3 = 7;
const Bytecode_kDebugBreak4 = 8;
const Bytecode_kDebugBreak5 = 9;
const Bytecode_kDebugBreak6 = 10;

const Bytecode_kLdaZero = 11;
const Bytecode_kLdaSmi = 12;
const Bytecode_kLdaUndefined = 13;
const Bytecode_kLdaNull = 14;
const Bytecode_kLdaTheHole = 15;
const Bytecode_kLdaTrue = 16;
const Bytecode_kLdaFalse = 17;
const Bytecode_kLdaConstant = 18;

const Bytecode_kLdaGlobal = 19;
const Bytecode_kLdaGlobalInsideTypeof = 20;
const Bytecode_kStaGlobal = 21;

const Bytecode_kPushContext = 22;
const Bytecode_kPopContext = 23;
const Bytecode_kLdaContextSlot = 24;
const Bytecode_kLdaImmutableContextSlot = 25;
const Bytecode_kLdaCurrentContextSlot = 26;
const Bytecode_kLdaImmutableCurrentContextSlot = 27;
const Bytecode_kStaContextSlot = 28;
const Bytecode_kStaCurrentContextSlot = 29;

const Bytecode_kLdaLookupSlot = 30;
const Bytecode_kLdaLookupContextSlot = 31;
const Bytecode_kLdaLookupGlobalSlot = 32;
const Bytecode_kLdaLookupSlotInsideTypeof = 33;
const Bytecode_kLdaLookupContextSlotInsideTypeof = 34;
const Bytecode_kLdaLookupGlobalSlotInsideTypeof = 35;
const Bytecode_kStaLookupSlot = 36;

const Bytecode_kLdar = 37;
const Bytecode_kStar = 38;

const Bytecode_kMov = 39;

const Bytecode_kLdaNamedProperty = 40;
const Bytecode_kLdaNamedPropertyNoFeedback = 41;
const Bytecode_kLdaKeyedProperty = 42;

const Bytecode_kLdaModuleVariable = 43;
const Bytecode_kStaModuleVariable = 44;

const Bytecode_kStaNamedProperty = 45;
const Bytecode_kStaNamedPropertyNoFeedback = 46;
const Bytecode_kStaNamedOwnProperty = 47;
const Bytecode_kStaKeyedProperty = 48;
const Bytecode_kStaInArrayLiteral = 49;
const Bytecode_kStaDataPropertyInLiteral = 50;
const Bytecode_kCollectTypeProfile = 51;

const Bytecode_kAdd = 52;
const Bytecode_kSub = 53;
const Bytecode_kMul = 54;
const Bytecode_kDiv = 55;
const Bytecode_kMod = 56;
const Bytecode_kExp = 57;
const Bytecode_kBitwiseOr = 58;
const Bytecode_kBitwiseXor = 59;
const Bytecode_kBitwiseAnd = 60;
const Bytecode_kShiftLeft = 61;
const Bytecode_kShiftRight = 62;
const Bytecode_kShiftRightLogical = 63;

const Bytecode_kAddSmi = 64;
const Bytecode_kSubSmi = 65;
const Bytecode_kMulSmi = 66;
const Bytecode_kDivSmi = 67;
const Bytecode_kModSmi = 68;
const Bytecode_kExpSmi = 69;
const Bytecode_kBitwiseOrSmi = 70;
const Bytecode_kBitwiseXorSmi = 71;
const Bytecode_kBitwiseAndSmi = 72;
const Bytecode_kShiftLeftSmi = 73;
const Bytecode_kShiftRightSmi = 74;
const Bytecode_kShiftRightLogicalSmi = 75;

const Bytecode_kInc = 76;
const Bytecode_kDec = 77;
const Bytecode_kNegate = 78;
const Bytecode_kBitwiseNot = 79;
const Bytecode_kToBooleanLogicalNot = 80;
const Bytecode_kLogicalNot = 81;
const Bytecode_kTypeOf = 82;
const Bytecode_kDeletePropertyStrict = 83;
const Bytecode_kDeletePropertySloppy = 84;

const Bytecode_kGetSuperConstructor = 85;

const Bytecode_kCallAnyReceiver = 86;
const Bytecode_kCallProperty = 87;
const Bytecode_kCallProperty0 = 88;
const Bytecode_kCallProperty1 = 89;
const Bytecode_kCallProperty2 = 90;
const Bytecode_kCallUndefinedReceiver = 91;
const Bytecode_kCallUndefinedReceiver0 = 92;
const Bytecode_kCallUndefinedReceiver1 = 93;
const Bytecode_kCallUndefinedReceiver2 = 94;
const Bytecode_kCallNoFeedback = 95;
const Bytecode_kCallWithSpread = 96;
const Bytecode_kCallRuntime = 97;
const Bytecode_kCallRuntimeForPair = 98;
const Bytecode_kCallJSRuntime = 99;

const Bytecode_kInvokeIntrinsic = 100;

const Bytecode_kConstruct = 101;
const Bytecode_kConstructWithSpread = 102;

const Bytecode_kTestEqual = 103;
const Bytecode_kTestEqualStrict = 104;
const Bytecode_kTestLessThan = 105;
const Bytecode_kTestGreaterThan = 106;
const Bytecode_kTestLessThanOrEqual = 107;
const Bytecode_kTestGreaterThanOrEqual = 108;
const Bytecode_kTestReferenceEqual = 109;
const Bytecode_kTestInstanceOf = 110;
const Bytecode_kTestIn = 111;
const Bytecode_kTestUndetectable = 112;
const Bytecode_kTestNull = 113;
const Bytecode_kTestUndefined = 114;
const Bytecode_kTestTypeOf = 115;

const Bytecode_kToName = 116;
const Bytecode_kToNumber = 117;
const Bytecode_kToNumeric = 118;
const Bytecode_kToObject = 119;
const Bytecode_kToString = 120;

const Bytecode_kCreateRegExpLiteral = 121;
const Bytecode_kCreateArrayLiteral = 122;
const Bytecode_kCreateArrayFromIterable = 123;
const Bytecode_kCreateEmptyArrayLiteral = 124;
const Bytecode_kCreateObjectLiteral = 125;
const Bytecode_kCreateEmptyObjectLiteral = 126;
const Bytecode_kCloneObject = 127;

const Bytecode_kGetTemplateObject = 128;

const Bytecode_kCreateClosure = 129;

const Bytecode_kCreateBlockContext = 130;
const Bytecode_kCreateCatchContext = 131;
const Bytecode_kCreateFunctionContext = 132;
const Bytecode_kCreateEvalContext = 133;
const Bytecode_kCreateWithContext = 134;

const Bytecode_kCreateMappedArguments = 135;
const Bytecode_kCreateUnmappedArguments = 136;
const Bytecode_kCreateRestParameter = 137;

const Bytecode_kJumpLoop = 138;
const Bytecode_kJump = 139;
const Bytecode_kJumpConstant = 140;
const Bytecode_kJumpIfNullConstant = 141;
const Bytecode_kJumpIfNotNullConstant = 142;
const Bytecode_kJumpIfUndefinedConstant = 143;
const Bytecode_kJumpIfNotUndefinedConstant = 144;
const Bytecode_kJumpIfUndefinedOrNullConstant = 145;
const Bytecode_kJumpIfTrueConstant = 146;
const Bytecode_kJumpIfFalseConstant = 147;
const Bytecode_kJumpIfJSReceiverConstant = 148;
const Bytecode_kJumpIfToBooleanTrueConstant = 149;
const Bytecode_kJumpIfToBooleanFalseConstant = 150;
const Bytecode_kJumpIfToBooleanTrue = 151;
const Bytecode_kJumpIfToBooleanFalse = 152;
const Bytecode_kJumpIfTrue = 153;
const Bytecode_kJumpIfFalse = 154;
const Bytecode_kJumpIfNull = 155;
const Bytecode_kJumpIfNotNull = 156;
const Bytecode_kJumpIfUndefined = 157;
const Bytecode_kJumpIfNotUndefined = 158;
const Bytecode_kJumpIfUndefinedOrNull = 159;
const Bytecode_kJumpIfJSReceiver = 160;

const Bytecode_kSwitchOnSmiNoFeedback = 161;

const Bytecode_kForInEnumerate = 162;
const Bytecode_kForInPrepare = 163;
const Bytecode_kForInContinue = 164;
const Bytecode_kForInNext = 165;
const Bytecode_kForInStep = 166;

const Bytecode_kStackCheck = 167;

const Bytecode_kSetPendingMessage = 168;

const Bytecode_kThrow = 169;
const Bytecode_kReThrow = 170;
const Bytecode_kReturn = 171;
const Bytecode_kThrowReferenceErrorIfHole = 172;
const Bytecode_kThrowSuperNotCalledIfHole = 173;
const Bytecode_kThrowSuperAlreadyCalledIfNotHole = 174;

const Bytecode_kSwitchOnGeneratorState = 175;
const Bytecode_kSuspendGenerator = 176;
const Bytecode_kResumeGenerator = 177;

const Bytecode_kGetIterator = 178;
const Bytecode_kDebugger = 179;
const Bytecode_kIncBlockCounter = 180;
const Bytecode_kAbort = 181;
const Bytecode_kIllegal = 182;

/**
 * 机器码操作符枚举
 */
const OperandScale_kSingle = 1;
const OperandScale_kDouble = 2;
const OperandScale_kQuadruple = 4;
const OperandScale_kLast = OperandScale_kQuadruple;

const OperandType_kNone = 0;
const OperandType_kFlag8 = 1;
const OperandType_kIntrinsicId = 2;
const OperandType_kRuntimeId = 3;
const OperandType_kNativeContextIndex = 4;
const OperandType_kIdx = 5;
const OperandType_kUImm = 6;
const OperandType_kRegCount = 7;
const OperandType_kImm = 8;
const OperandType_kReg = 9;
const OperandType_kRegList = 10;
const OperandType_kRegPair = 11;
const OperandType_kRegOut = 12;
const OperandType_kRegOutList = 13;
const OperandType_kRegOutPair = 14;
const OperandType_kRegOutTriple = 15;

const AccumulatorUse_kNone = 0;
const AccumulatorUse_kRead = 1 << 0;
const AccumulatorUse_kWrite = 1 << 1;
const AccumulatorUse_kReadWrite = AccumulatorUse_kRead | AccumulatorUse_kWrite;

const OperandSize_kNone = 0;
const OperandSize_kByte = 1;
const OperandSize_kShort = 2;
const OperandSize_kQuad = 4;
const OperandSize_kLast = OperandSize_kQuad;

/**
 * 机器码枚举与操作符的映射
 * V(Wide, AccumulatorUse::kNone) => (0): [Bytecode_kWide, AccumulatorUse_kNone]
 * ...
 * V(Illegal, AccumulatorUse::kNone) => (183): [Bytecode_kIllegal, AccumulatorUse_kNone]
 */
const bytecodeMapping = [
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

const Bytecode_kAny = 0;
const Bytecode_kBoolean = 1;
const Bytecode_kString = 2;

const TypeHint_kAny = 0;
const TypeHint_kBoolean = 1;
const TypeHint_kString = 2;

const AccumulatorPreservingMode_kNone = 0;
const AccumulatorPreservingMode_kPreserve = 1;

const ContextSlotMutability_kImmutableSlot = 0;
const ContextSlotMutability_kMutableSlot = 1;

const RecordingMode_OMIT_SOURCE_POSITIONS = 0;
const RecordingMode_OMIT_LAZY_SOURCE_POSITIONS = 1;
const RecordingMode_RECORD_SOURCE_POSITIONS = 2;

const IntrinsicId_kAsyncFunctionAwaitCaught = 0;
const IntrinsicId_kAsyncFunctionAwaitUncaught = 1;
const IntrinsicId_kAsyncFunctionEnter = 2;
const IntrinsicId_kAsyncFunctionReject = 3;
const IntrinsicId_kAsyncFunctionResolve = 4;
const IntrinsicId_kAsyncGeneratorAwaitCaught = 5;
const IntrinsicId_kAsyncGeneratorAwaitUncaught = 6;
const IntrinsicId_kAsyncGeneratorReject = 7;
const IntrinsicId_kAsyncGeneratorResolve = 8;
const IntrinsicId_kAsyncGeneratorYield = 9;
const IntrinsicId_kCreateJSGeneratorObject = 10;
const IntrinsicId_kGeneratorGetResumeMode = 11;
const IntrinsicId_kGeneratorClose = 12;
const IntrinsicId_kGetImportMetaObject = 13;
const IntrinsicId_kCall = 14;
const IntrinsicId_kCopyDataProperties = 15;
const IntrinsicId_kCreateIterResultObject = 16;
const IntrinsicId_kCreateAsyncFromSyncIterator = 17;
const IntrinsicId_kHasProperty = 18;
const IntrinsicId_kIsArray = 19;
const IntrinsicId_kIsJSReceiver = 20;
const IntrinsicId_kIsSmi = 21;
const IntrinsicId_kToStringRT = 22;
const IntrinsicId_kToLength = 23;
const IntrinsicId_kToObject = 24;

const OperandTypeInfo_kNone = 0;
const OperandTypeInfo_kScalableSignedByte = 1;
const OperandTypeInfo_kScalableUnsignedByte = 2;
const OperandTypeInfo_kFixedUnsignedByte = 3;
const OperandTypeInfo_kFixedUnsignedShort = 4;

function OperandScaler(IsScalable, UnscaledSize, Size = 0) {
  if (IsScalable) {
    return UnscaledSize * Size;
  } else {
    return UnscaledSize;
  }
}

function OperandeTypeToInfo(operand_type) {
  switch (operand_type) {
    case OperandType_kReg:
    case OperandType_kRegList:
    case OperandType_kRegPair:
    case OperandType_kRegOut:
    case OperandType_kRegOutList:
    case OperandType_kRegOutPair:
    case OperandType_kRegOutTriple:
    case OperandType_kImm:
      return OperandTypeInfo_kScalableSignedByte;
    case OperandType_kIdx:
    case OperandType_kUImm:
    case OperandType_kRegCount:
    case OperandType_kNativeContextIndex:
      return OperandTypeInfo_kScalableUnsignedByte;
    case OperandType_kFlag8:
    case OperandType_kIntrinsicId:
      return OperandTypeInfo_kFixedUnsignedByte;
    case OperandType_kRuntimeId:
      return OperandTypeInfo_kFixedUnsignedShort;
    default:
      return OperandTypeInfo_kNone;
  }
}

function OperandTypeInfoToSize(operand_info) {
  switch (operand_info) {
    case OperandTypeInfo_kNone:
      return [false, /*false,*/ OperandSize_kNone];
    case OperandTypeInfo_kScalableSignedByte:
      return [true, /*false,*/ OperandSize_kByte];
    case OperandTypeInfo_kScalableUnsignedByte:
      return [true, /*true,*/ OperandSize_kByte];
    case OperandTypeInfo_kFixedUnsignedByte:
      return [false, /*true,*/ OperandSize_kByte];
    case OperandTypeInfo_kFixedUnsignedShort:
      return [false, /*true,*/ OperandSize_kShort];
  }
}

/**
 * 机器码映射表
 */
const kOperandSizes = [OperandScale_kSingle, OperandScale_kDouble, OperandScale_kQuadruple].map(operand_scale => {
  return bytecodeMapping.map(map => {
    let operand_types = map.slice(2);
    if (operand_types.length === 0) operand_types = [OperandTypeInfo_kNone];
    return operand_types.map(operand_type => {
      return OperandScaler(...OperandTypeInfoToSize(OperandeTypeToInfo(operand_type)), operand_scale);
    });
  });
});


fs.writeFile('./i.json', JSON.stringify(kOperandSizes), (err) => {});