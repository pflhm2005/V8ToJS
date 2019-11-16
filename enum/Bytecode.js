export const kWide = 0;
export const kExtraWide = 1;
export const kDebugBreakWide = 2;
export const kDebugBreakExtraWide = 3;
export const kDebugBreak0 = 4;
export const kDebugBreak1 = 5;
export const kDebugBreak2 = 6;
export const kDebugBreak3 = 7;
export const kDebugBreak4 = 8;
export const kDebugBreak5 = 9;
export const kDebugBreak6 = 10;

export const kLdaZero = 11;
export const kLdaSmi = 12;
export const kLdaUndefined = 13;
export const kLdaNull = 14;
export const kLdaTheHole = 15;
export const kLdaTrue = 16;
export const kLdaFalse = 17;
export const kLdaConstant = 18;

export const kLdaGlobal = 19;
export const kLdaGlobalInsideTypeof = 20;
export const kStaGlobal = 21;

export const kPushContext = 22;
export const kPopContext = 23;
export const kLdaContextSlot = 24;
export const kLdaImmutableContextSlot = 25;
export const kLdaCurrentContextSlot = 26;
export const kLdaImmutableCurrentContextSlot = 27;
export const kStaContextSlot = 28;
export const kStaCurrentContextSlot = 29;

export const kLdaLookupSlot = 31;
export const kLdaLookupContextSlot = 32;
export const kLdaLookupGlobalSlot = 33;
export const kLdaLookupSlotInsideTypeof = 34;
export const kLdaLookupContextSlotInsideTypeof = 35;
export const kLdaLookupGlobalSlotInsideTypeof = 36;
export const kStaLookupSlot = 37;

export const kLdar = 38;
export const kStar = 39;

export const kMov = 40;

export const kLdaNamedProperty = 41;
export const kLdaNamedPropertyNoFeedback = 42;
export const kLdaKeyedProperty = 43;

export const kLdaModuleVariable = 44;
export const kStaModuleVariable = 45;

export const kStaNamedProperty = 46;
export const kStaNamedPropertyNoFeedback = 47;
export const kStaNamedOwnProperty = 48;
export const kStaKeyedProperty = 49;
export const kStaInArrayLiteral = 50;
export const kStaDataPropertyInLiteral = 51;
export const kCollectTypeProfile = 52;

export const kAdd = 53;
export const kSub = 54;
export const kMul = 55;
export const kDiv = 56;
export const kMod = 57;
export const kExp = 58;
export const kBitwiseOr = 59;
export const kBitwiseXor = 60;
export const kBitwiseAnd = 61;
export const kShiftLeft = 62;
export const kShiftRight = 63;
export const kShiftRightLogical = 64;

export const kAddSmi = 65;
export const kSubSmi = 66;
export const kMulSmi = 67;
export const kDivSmi = 68;
export const kModSmi = 69;
export const kExpSmi = 70;
export const kBitwiseOrSmi = 71;
export const kBitwiseXorSmi = 72;
export const kBitwiseAndSmi = 73;
export const kShiftLeftSmi = 74;
export const kShiftRightSmi = 75;
export const kShiftRightLogicalSmi = 76;

export const kInc = 77;
export const kDec = 78;
export const kNegate = 79;
export const kBitwiseNot = 80;
export const kToBooleanLogicalNot = 81;
export const kLogicalNot = 82;
export const kTypeOf = 83;
export const kDeletePropertyStrict = 84;
export const kDeletePropertySloppy = 85;

export const kGetSuperConstructor = 86;

export const kCallAnyReceiver = 87;
export const kCallProperty = 88;
export const kCallProperty0 = 89;
export const kCallProperty1 = 90;
export const kCallProperty2 = 91;
export const kCallUndefinedReceiver = 92;
export const kCallUndefinedReceiver0 = 93;
export const kCallUndefinedReceiver1 = 94;
export const kCallUndefinedReceiver2 = 95;
export const kCallNoFeedback = 96;
export const kCallWithSpread = 97;
export const kCallRuntime = 98;
export const kCallRuntimeForPair = 99;
export const kCallJSRuntime = 100;

export const kInvokeIntrinsic = 101;

export const kConstruct = 102;
export const kConstructWithSpread = 103;

export const kTestEqual = 104;
export const kTestEqualStrict = 105;
export const kTestLessThan = 106;
export const kTestGreaterThan = 107;
export const kTestLessThanOrEqual = 108;
export const kTestGreaterThanOrEqual = 109;
export const kTestReferenceEqual = 110;
export const kTestInstanceOf = 111;
export const kTestIn = 112;
export const kTestUndetectable = 113;
export const kTestNull = 114;
export const kTestUndefined = 115;
export const kTestTypeOf = 116;

export const kToName = 117;
export const kToNumber = 118;
export const kToNumeric = 119;
export const kToObject = 120;
export const kToString = 121;

export const kCreateRegExpLiteral = 122;
export const kCreateArrayLiteral = 123;
export const kCreateArrayFromIterable = 124;
export const kCreateEmptyArrayLiteral = 125;
export const kCreateObjectLiteral = 126;
export const kCreateEmptyObjectLiteral = 127;
export const kCloneObject = 128;

export const kGetTemplateObject = 129;

export const kCreateClosure = 130;

export const kCreateBlockContext = 131;
export const kCreateCatchContext = 132;
export const kCreateFunctionContext = 133;
export const kCreateEvalContext = 134;
export const kCreateWithContext = 135;

export const kCreateMappedArguments = 136;
export const kCreateUnmappedArguments = 137;
export const kCreateRestParameter = 138;

export const kJumpLoop = 139;
export const kJump = 140;
export const kJumpConstant = 141;
export const kJumpIfNullConstant = 142;
export const kJumpIfNotNullConstant = 143;
export const kJumpIfUndefinedConstant = 144;
export const kJumpIfNotUndefinedConstant = 145;
export const kJumpIfUndefinedOrNullConstant = 146;
export const kJumpIfTrueConstant = 147;
export const kJumpIfFalseConstant = 148;
export const kJumpIfJSReceiverConstant = 149;
export const kJumpIfToBooleanTrueConstant = 150;
export const kJumpIfToBooleanFalseConstant = 151;
export const kJumpIfToBooleanTrue = 152;
export const kJumpIfToBooleanFalse = 153;
export const kJumpIfTrue = 154;
export const kJumpIfFalse = 155;
export const kJumpIfNull = 156;
export const kJumpIfNotNull = 157;
export const kJumpIfUndefined = 158;
export const kJumpIfNotUndefined = 159;
export const kJumpIfUndefinedOrNull = 160;
export const kJumpIfJSReceiver = 161;

export const kSwitchOnSmiNoFeedback = 162;

export const kForInEnumerate = 163;
export const kForInPrepare = 164;
export const kForInContinue = 165;
export const kForInNext = 166;
export const kForInStep = 167;

export const kStackCheck = 168;

export const kSetPendingMessage = 169;

export const kThrow = 170;
export const kReThrow = 171;
export const kReturn = 172;
export const kThrowReferenceErrorIfHole = 173;
export const kThrowSuperNotCalledIfHole = 174;
export const kThrowSuperAlreadyCalledIfNotHole = 175;

export const kSwitchOnGeneratorState = 176;
export const kSuspendGenerator = 177;
export const kResumeGenerator = 178;

export const kGetIterator = 179;
export const kDebugger = 180;
export const kIncBlockCounter = 181;
export const kAbort = 182;
export const kIllegal = 183;
