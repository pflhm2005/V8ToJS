/**
 * BreakableStatement::BreakableType
 * break语句枚举
 */
export const TARGET_FOR_ANONYMOUS = 0;
export const TARGET_FOR_NAMED_ONLY = 1;

export const kExpression = 0;
export const kMaybeArrowParameterDeclaration = 1;
export const kMaybeAsyncArrowParameterDeclaration = 2;
export const kParameterDeclaration = 3;
export const kVarDeclaration = 4;
export const kLexicalDeclaration = 5;

export const kRequired = 0;
export const kElided = 1;

// for语句的遍历模式
export const ENUMERATE = 0; // for in
export const ITERATE = 1; // for of

export const IS_POSSIBLY_EVAL = 0;
export const NOT_EVAL = 1;

export const kHomeObjectSymbol = 0;

export const kBody = 0;
export const kCatch = 1;
export const kContinuation = 2;
export const kElse = 3;
export const kFinally = 4;
export const kRight = 5;
export const kThen = 6;
