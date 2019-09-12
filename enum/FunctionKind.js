/**
 * 函数作用域枚举
 */
export const kNormalFunction = 0;
export const kModule = 1;
export const kBaseConstructor = 2;
export const kDefaultBaseConstructor = 3;
export const kDefaultDerivedConstructor = 4;
export const kDerivedConstructor = 5;
export const kGetterFunction = 6;
export const kSetterFunction = 7;
export const kArrowFunction = 8;
export const kAsyncArrowFunction = 9;
export const kAsyncFunction = 10;
export const kAsyncConciseMethod = 11;
export const kAsyncConciseGeneratorMethod = 12;
export const kAsyncGeneratorFunction = 13;
export const kGeneratorFunction = 14;
export const kConciseGeneratorMethod = 15;
export const kConciseMethod = 16;
export const kClassMembersInitializerFunction = 17;
export const kLastFunctionKind = kClassMembersInitializerFunction;

export const kIsNormal = 0;
export const kIsGenerator = 1 << 0;
export const kIsAsync = 1 << 1;

export const kAnonymousExpression = 0;
export const kNamedExpression = 1;
export const kDeclaration = 2;
export const kAccessorOrMethod = 3;
export const kWrapped = 4;
export const kLastFunctionSyntaxKind = kWrapped;

export const kFunctionNameIsStrictReserved = 0;
export const kSkipFunctionNameCheck = 1;
export const kFunctionNameValidityUnknown = 2;

export const kAllowLabelledFunctionStatement = 0;
export const kDisallowLabelledFunctionStatement = 1;

export const kShouldEagerCompile = 0;
export const kShouldLazyCompile = 1;

export const kNoDuplicateParameters = 0;
export const kHasDuplicateParameters = 0;

const kArgumentsBits = 16;
export const kMaxArguments = (1 << kArgumentsBits) - 2;
