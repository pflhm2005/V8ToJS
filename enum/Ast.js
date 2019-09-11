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
export const kElided = 0;