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

export const Bytecode_kAny = 0;
export const Bytecode_kBoolean = 1;
export const Bytecode_kString = 2;