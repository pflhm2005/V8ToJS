/**
 * 函数类型枚举
 */
export const kNormalFunction = 0; // function() {}
export const kModule = 1; // 模块
export const kBaseConstructor = 2;   // 基类构造函数
export const kDefaultBaseConstructor = 3; // 默认基类构造函数
export const kDefaultDerivedConstructor = 4;// 默认派生构造函数
export const kDerivedConstructor = 5; // 派生构造函数
export const kGetterFunction = 6; // { get a() {} }
export const kSetterFunction = 7; // { set a() {} }
export const kArrowFunction = 8; // () => {}
export const kAsyncArrowFunction = 9;  // async () => {}
export const kAsyncFunction = 10; // async () => {}
export const kAsyncConciseMethod = 11; // { async fn() {} }
export const kAsyncConciseGeneratorMethod = 12; // { async fn*() {} }
export const kAsyncGeneratorFunction = 13; // async function*() {}
export const kGeneratorFunction = 14; // function*() {}
export const kConciseGeneratorMethod = 15;  // { fn*() {} }
export const kConciseMethod = 16; // { fn() {} }
export const kClassMembersInitializerFunction = 17; // 
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

export const kExpression = 0;
export const kBlock = 0;