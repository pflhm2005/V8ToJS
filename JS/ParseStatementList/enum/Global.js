export const kNoSourcePosition = -1;
export const kMaxAscii = 127;
export const kEndOfInput = -1;

/**
 * 变量初始化类型
 */
export const kNeedsInitialization = 0;
export const kCreatedInitialized = 1;

/**
 * 变量赋值标记
 */
export const kNotAssigned = 0;
export const kMaybeAssigned = 1;

export const NORMAL_VARIABLE = 0;
export const PARAMETER_VARIABLE = 1;
export const THIS_VARIABLE = 2;
export const SLOPPY_BLOCK_FUNCTION_VARIABLE = 3;
export const SLOPPY_FUNCTION_NAME_VARIABLE = 4;

/**
 * 声明类型
 */
export const kLet = 0;  // let声明
export const kConst = 1;  // cosnt声明
export const kVar = 2;  // var、function声明
// 编译器内部类型
export const kTemporary = 3;  // 临时变量(用户不可见) 分配在栈上
export const kDynamic = 4;  // 未知的声明
export const kDynamicGlobal = 5;  // 全局变量
export const kDynamicLocal = 6; // 本地变量
export const kLastLexicalVariableMode = kConst;  // ES6新出的两种类型

/**
 * 字符类型相关
 */
export const kTerminatesLiteral = 1 << 0;
export const kCannotBeKeyword = 1 << 1;
export const kCannotBeKeywordStart = 1 << 2;
export const kStringTerminator = 1 << 3;
export const kIdentifierNeedsSlowPath = 1 << 4;
export const kMultilineCommentCharacterNeedsSlowPath = 1 << 5;

/**
 * Ascii字符标记
 */
export const kIsIdentifierStart = 1 << 0;
export const kIsIdentifierPart = 1 << 1;
export const kIsWhiteSpace = 1 << 2;
export const kIsWhiteSpaceOrLineTerminator = 1 << 3;

export const kSloppy = 0;
export const kStrict = 1;

export const PARSE_LAZILY = 0;
export const PARSE_EAGERLY = 1;

// UseCounterFeature
export const kUseAsm = 0;
export const kBreakIterator = 1;
export const kLegacyConst = 2;
export const kMarkDequeOverflow = 3;
export const kStoreBufferOverflow = 4;
export const kSlotsBufferOverflow = 5;
export const kObjectObserve = 6;
export const kForcedGC = 7;
export const kSloppyMode = 8;
export const kStrictMode = 9;
export const kStrongMode = 10;
export const kRegExpPrototypeStickyGetter = 11;
export const kRegExpPrototypeToString = 12;
export const kRegExpPrototypeUnicodeGetter = 13;
export const kIntlV8Parse = 14;
export const kIntlPattern = 15;
export const kIntlResolved = 16;
export const kPromiseChain = 17;
export const kPromiseAccept = 18;
export const kPromiseDefer = 19;
export const kHtmlCommentInExternalScript = 20;
export const kHtmlComment = 21;
export const kSloppyModeBlockScopedFunctionRedefinition = 22;
export const kForInInitializer = 23;
export const kArrayProtectorDirtied = 24;
export const kArraySpeciesModified = 25;
export const kArrayPrototypeConstructorModified = 26;
export const kArrayInstanceProtoModified = 27;
export const kArrayInstanceConstructorModified = 28;
export const kLegacyFunctionDeclaration = 29;
export const kRegExpPrototypeSourceGetter = 30;
export const kRegExpPrototypeOldFlagGetter = 31;
export const kDecimalWithLeadingZeroInStrictMode = 32;
export const kLegacyDateParser = 33;
export const kDefineGetterOrSetterWouldThrow = 34;
export const kFunctionConstructorReturnedUndefined = 35;
export const kAssigmentExpressionLHSIsCallInSloppy = 36;
export const kAssigmentExpressionLHSIsCallInStrict = 37;
export const kPromiseConstructorReturnedUndefined = 38;
export const kConstructorNonUndefinedPrimitiveReturn = 39;
export const kLabeledExpressionStatement = 40;
export const kLineOrParagraphSeparatorAsLineTerminator = 41;
export const kIndexAccessor = 42;
export const kErrorCaptureStackTrace = 43;
export const kErrorPrepareStackTrace = 44;
export const kErrorStackTraceLimit = 45;
export const kWebAssemblyInstantiation = 46;
export const kDeoptimizerDisableSpeculation = 47;
export const kArrayPrototypeSortJSArrayModifiedPrototype = 48;
export const kFunctionTokenOffsetTooLongForToString = 49;
export const kWasmSharedMemory = 50;
export const kWasmThreadOpcodes = 51;
export const kAtomicsNotify = 52;
export const kAtomicsWake = 53;
export const kCollator = 54;
export const kNumberFormat = 55;
export const kDateTimeFormat = 56;
export const kPluralRules = 57;
export const kRelativeTimeFormat = 58;
export const kLocale = 59;
export const kListFormat = 60;
export const kSegmenter = 61;
export const kStringLocaleCompare = 62;
export const kStringToLocaleUpperCase = 63;
export const kStringToLocaleLowerCase = 64;
export const kNumberToLocaleString = 65;
export const kDateToLocaleString = 66;
export const kDateToLocaleDateString = 67;
export const kDateToLocaleTimeString = 68;
export const kAttemptOverrideReadOnlyOnPrototypeSloppy = 69;
export const kAttemptOverrideReadOnlyOnPrototypeStrict = 70;
export const kOptimizedFunctionWithOneShotBytecode = 71;
export const kRegExpMatchIsTrueishOnNonJSRegExp = 72;
export const kRegExpMatchIsFalseishOnJSRegExp = 73;
export const kDateGetTimezoneOffset = 74;
export const kStringNormalize = 75;
export const kCallSiteAPIGetFunctionSloppyCall = 76;
export const kCallSiteAPIGetThisSloppyCall = 77;
export const kRegExpMatchAllWithNonGlobalRegExp = 78;

// If you add new values here; you'll also need to update Chromium's:
// web_feature.mojom; use_counter_callback.cc; and enums.xml. V8 changes to
// this list need to be landed first; then changes on the Chromium side.
export const kUseCounterFeatureCount = 79;  // This enum value must be last.

export const CLASS_SCOPE = 0;  // class作用域 class a {};
export const EVAL_SCOPE = 1; // eval作用域 eval("var a = 1;")
export const FUNCTION_SCOPE = 2; // 函数作用域 function a() {}
export const MODULE_SCOPE = 3; // 模块作用域 export default {}
export const SCRIPT_SCOPE = 4; // 最外层作用域 默认作用域
export const CATCH_SCOPE = 5;  // catch作用域  try{}catch(){}
export const BLOCK_SCOPE = 6;  // 块作用域 {}
export const WITH_SCOPE = 7; // with作用域 with() {}
