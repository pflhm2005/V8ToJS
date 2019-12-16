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

export const kNotStatic = 0;
export const kStatic = 1;

export const NORMAL_VARIABLE = 0;
export const PARAMETER_VARIABLE = 1;
export const THIS_VARIABLE = 2;
export const SLOPPY_BLOCK_FUNCTION_VARIABLE = 3;
export const SLOPPY_FUNCTION_NAME_VARIABLE = 4;

/**
 * 声明类型
 */
export const VariableMode_kLet = 0;  // let声明
export const VariableMode_kConst = 1;  // const声明
export const VariableMode_kVar = 2;  // var、function声明
// 编译器内部类型
export const VariableMode_kTemporary = 3;  // 临时变量(用户不可见) 分配在栈上
export const VariableMode_kDynamic = 4;  // 未知的声明
export const VariableMode_kDynamicGlobal = 5;  // 全局变量
export const VariableMode_kDynamicLocal = 6; // 本地变量
// 私有属性
export const VariableMode_kPrivateMethod = 7;
export const VariableMode_kPrivateSetterOnly = 8;
export const VariableMode_kPrivateGetterOnly = 9;
export const VariableMode_kPrivateGetterAndSetter = 10;

export const VariableMode_kLastLexicalVariableMode = VariableMode_kConst;  // ES6新出的两种类型

/**
 * 赋值类型
 */
export const AssignType_NON_PROPERTY = 0; // 解构赋值
export const AssignType_NAMED_PROPERTY = 1; // obj.key
export const AssignType_KEYED_PROPERTY = 2; // obj[key]
export const AssignType_NAMED_SUPER_PROPERTY = 3; // super.key
export const AssignType_KEYED_SUPER_PROPERTY = 4; // super[key]
export const AssignType_PRIVATE_METHOD = 5; // obj.#key
export const AssignType_PRIVATE_GETTER_ONLY = 5;  // obj.#key getter
export const AssignType_PRIVATE_SETTER_ONLY = 5;  // obj.#key setter
export const AssignType_PRIVATE_GETTER_AND_SETTER = 5;  // obk.#key gettter+setter

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
export const UseCounterFeature_kUseAsm = 0;
export const UseCounterFeature_kBreakIterator = 1;
export const UseCounterFeature_kLegacyConst = 2;
export const UseCounterFeature_kMarkDequeOverflow = 3;
export const UseCounterFeature_kStoreBufferOverflow = 4;
export const UseCounterFeature_kSlotsBufferOverflow = 5;
export const UseCounterFeature_kObjectObserve = 6;
export const UseCounterFeature_kForcedGC = 7;
export const UseCounterFeature_kSloppyMode = 8;
export const UseCounterFeature_kStrictMode = 9;
export const UseCounterFeature_kStrongMode = 10;
export const UseCounterFeature_kRegExpPrototypeStickyGetter = 11;
export const UseCounterFeature_kRegExpPrototypeToString = 12;
export const UseCounterFeature_kRegExpPrototypeUnicodeGetter = 13;
export const UseCounterFeature_kIntlV8Parse = 14;
export const UseCounterFeature_kIntlPattern = 15;
export const UseCounterFeature_kIntlResolved = 16;
export const UseCounterFeature_kPromiseChain = 17;
export const UseCounterFeature_kPromiseAccept = 18;
export const UseCounterFeature_kPromiseDefer = 19;
export const UseCounterFeature_kHtmlCommentInExternalScript = 20;
export const UseCounterFeature_kHtmlComment = 21;
export const UseCounterFeature_kSloppyModeBlockScopedFunctionRedefinition = 22;
export const UseCounterFeature_kForInInitializer = 23;
export const UseCounterFeature_kArrayProtectorDirtied = 24;
export const UseCounterFeature_kArraySpeciesModified = 25;
export const UseCounterFeature_kArrayPrototypeConstructorModified = 26;
export const UseCounterFeature_kArrayInstanceProtoModified = 27;
export const UseCounterFeature_kArrayInstanceConstructorModified = 28;
export const UseCounterFeature_kLegacyFunctionDeclaration = 29;
export const UseCounterFeature_kRegExpPrototypeSourceGetter = 30;
export const UseCounterFeature_kRegExpPrototypeOldFlagGetter = 31;
export const UseCounterFeature_kDecimalWithLeadingZeroInStrictMode = 32;
export const UseCounterFeature_kLegacyDateParser = 33;
export const UseCounterFeature_kDefineGetterOrSetterWouldThrow = 34;
export const UseCounterFeature_kFunctionConstructorReturnedUndefined = 35;
export const UseCounterFeature_kAssigmentExpressionLHSIsCallInSloppy = 36;
export const UseCounterFeature_kAssigmentExpressionLHSIsCallInStrict = 37;
export const UseCounterFeature_kPromiseConstructorReturnedUndefined = 38;
export const UseCounterFeature_kConstructorNonUndefinedPrimitiveReturn = 39;
export const UseCounterFeature_kLabeledExpressionStatement = 40;
export const UseCounterFeature_kLineOrParagraphSeparatorAsLineTerminator = 41;
export const UseCounterFeature_kIndexAccessor = 42;
export const UseCounterFeature_kErrorCaptureStackTrace = 43;
export const UseCounterFeature_kErrorPrepareStackTrace = 44;
export const UseCounterFeature_kErrorStackTraceLimit = 45;
export const UseCounterFeature_kWebAssemblyInstantiation = 46;
export const UseCounterFeature_kDeoptimizerDisableSpeculation = 47;
export const UseCounterFeature_kArrayPrototypeSortJSArrayModifiedPrototype = 48;
export const UseCounterFeature_kFunctionTokenOffsetTooLongForToString = 49;
export const UseCounterFeature_kWasmSharedMemory = 50;
export const UseCounterFeature_kWasmThreadOpcodes = 51;
export const UseCounterFeature_kAtomicsNotify = 52;
export const UseCounterFeature_kAtomicsWake = 53;
export const UseCounterFeature_kCollator = 54;
export const UseCounterFeature_kNumberFormat = 55;
export const UseCounterFeature_kDateTimeFormat = 56;
export const UseCounterFeature_kPluralRules = 57;
export const UseCounterFeature_kRelativeTimeFormat = 58;
export const UseCounterFeature_kLocale = 59;
export const UseCounterFeature_kListFormat = 60;
export const UseCounterFeature_kSegmenter = 61;
export const UseCounterFeature_kStringLocaleCompare = 62;
export const UseCounterFeature_kStringToLocaleUpperCase = 63;
export const UseCounterFeature_kStringToLocaleLowerCase = 64;
export const UseCounterFeature_kNumberToLocaleString = 65;
export const UseCounterFeature_kDateToLocaleString = 66;
export const UseCounterFeature_kDateToLocaleDateString = 67;
export const UseCounterFeature_kDateToLocaleTimeString = 68;
export const UseCounterFeature_kAttemptOverrideReadOnlyOnPrototypeSloppy = 69;
export const UseCounterFeature_kAttemptOverrideReadOnlyOnPrototypeStrict = 70;
export const UseCounterFeature_kOptimizedFunctionWithOneShotBytecode = 71;
export const UseCounterFeature_kRegExpMatchIsTrueishOnNonJSRegExp = 72;
export const UseCounterFeature_kRegExpMatchIsFalseishOnJSRegExp = 73;
export const UseCounterFeature_kDateGetTimezoneOffset = 74;
export const UseCounterFeature_kStringNormalize = 75;
export const UseCounterFeature_kCallSiteAPIGetFunctionSloppyCall = 76;
export const UseCounterFeature_kCallSiteAPIGetThisSloppyCall = 77;
export const UseCounterFeature_kRegExpMatchAllWithNonGlobalRegExp = 78;

// If you add new values here; you'll also need to update Chromium's:
// web_feature.mojom; use_counter_callback.cc; and enums.xml. V8 changes to
// this list need to be landed first; then changes on the Chromium side.
export const UseCounterFeature_kUseCounterFeatureCount = 79;  // This enum value must be last.

export const CLASS_SCOPE = 0;  // class作用域 class a {};
export const EVAL_SCOPE = 1; // eval作用域 eval("var a = 1;")
export const FUNCTION_SCOPE = 2; // 函数作用域 function a() {}
export const MODULE_SCOPE = 3; // 模块作用域 export default {}
export const SCRIPT_SCOPE = 4; // 最外层作用域 默认作用域
export const CATCH_SCOPE = 5;  // catch作用域  try{}catch(){}
export const BLOCK_SCOPE = 6;  // 块作用域 {}
export const WITH_SCOPE = 7; // with作用域 with() {}

export const NOT_NATIVES_CODE = 0;
export const EXTENSION_CODE = 1;
export const INSPECTOR_CODE = 2;

export const kFunctionLiteralIdInvalid = -1;
export const kFunctionLiteralIdTopLevel = 0;
export const kSmallOrderedHashSetMinCapacity = 4;
export const kSmallOrderedHashMapMinCapacity = 4;

export const PERFORMANCE_RESPONSE = 0;
export const PERFORMANCE_ANIMATION = 0;
export const PERFORMANCE_IDLE = 0;
export const PERFORMANCE_LOAD = 0;

export const kIncludingVariables = 0;
export const kScopesOnly = 0;

export const kMappedArguments = 0;
export const kUnmappedArguments = 0;
export const kRestParameter = 0;

export const VariableLocation_UNALLOCATED = 0;
export const VariableLocation_PARAMETER = 1;
export const VariableLocation_LOCAL = 2;
export const VariableLocation_CONTEXT = 3;
export const VariableLocation_LOOKUP = 4;
export const VariableLocation_MODULE = 5;
export const VariableLocation_REPL_GLOBAL = 6;
export const VariableLocation_kLastVariableLocation = VariableLocation_REPL_GLOBAL;

export const INSIDE_TYPEOF = 0;
export const NOT_INSIDE_TYPEOF = 1;

/**
 * Memory pressure level for the MemoryPressureNotification.
 * kNone hints V8 that there is no memory pressure.
 * kModerate hints V8 to speed up incremental garbage collection at the cost of
 * of higher latency due to garbage collection pauses.
 * kCritical hints V8 to free memory as soon as possible. Garbage collection
 * pauses at this level will be large.
 */
export const MemoryPressureLevel_kNone = 0;
export const MemoryPressureLevel_kModerate = 1;
export const MemoryPressureLevel_kCritical = 2;

export const CompilationJob_SUCCEEDED = 0;
export const CompilationJob_FAILED = 1;

export const CodeEventListener_CODE_CREATION_EVENT = 0;
export const CodeEventListener_CODE_DISABLE_OPT_EVENT = 1;
export const CodeEventListener_CODE_MOVE_EVENT = 2;
export const CodeEventListener_CODE_DELETE_EVENT = 3;
export const CodeEventListener_CODE_MOVING_GC = 4;
export const CodeEventListener_SHARED_FUNC_MOVE_EVENT = 5;
export const CodeEventListener_SNAPSHOT_CODE_NAME_EVENT = 6;
export const CodeEventListener_TICK_EVENT = 7;
export const CodeEventListener_BUILTIN_TAG = 8;
export const CodeEventListener_CALLBACK_TAG = 9;
export const CodeEventListener_EVAL_TAG = 10;
export const CodeEventListener_FUNCTION_TAG = 11;
export const CodeEventListener_INTERPRETED_FUNCTION_TAG = 12;
export const CodeEventListener_HANDLER_TAG = 13;
export const CodeEventListener_BYTECODE_HANDLER_TAG = 14;
export const CodeEventListener_LAZY_COMPILE_TAG = 15;
export const CodeEventListener_REG_EXP_TAG = 16;
export const CodeEventListener_SCRIPT_TAG = 17;
export const CodeEventListener_STUB_TAG = 18;
export const CodeEventListener_NATIVE_FUNCTION_TAG = 19;
export const CodeEventListener_NATIVE_LAZY_COMPILE_TAG = 20;
export const CodeEventListener_NATIVE_SCRIPT_TAG = 21;

export const AllocationType_kYoung = 0;
export const AllocationType_kOld = 1;
export const AllocationType_kCode = 2;
export const AllocationType_kMap = 3;
export const AllocationType_kReadOnly = 4;