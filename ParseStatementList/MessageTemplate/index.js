export const kStrictDecimalWithLeadingZero = "Decimals with leading zeros are not allowed in strict mode.";
export const kZeroDigitNumericSeparator = "Numeric separator can not be used after leading 0.";
export const kContinuousNumericSeparator = "Only one underscore is allowed as numeric separator";
export const kTrailingNumericSeparator = "Numeric separators are not allowed at the end of numeric literals";

export const kParamDupe = "Duplicate parameter name not allowed in this context";
export const kVarRedeclaration = "Identifier '%' has already been declared";
export const kTooManyVariables = "Too many variables declared (only 4194303 allowed)";
// let let是不合法的
export const kLetInLexicalBinding = "let is disallowed as a lexically bound name";

export const kTooManyArguments = 'Too many arguments in function call (only 65535 allowed)';

export const kElementAfterRest = 'Rest element must be last element';

export const kDuplicateProto = 'Duplicate __proto__ fields are not allowed in object literals';

export const kInvalidCoverInitializedName = 'Invalid shorthand property initializer';
export const kMissingFunctionName = 'Function statements require a function name';
export const kArgStringTerminatesParametersEarly = 'Arg string terminates parameters early';
export const kUnexpectedEndOfArgString = 'Unexpected end of arg string';
export const kTooManyParameters = 'Too many parameters in function definition (only 65534 allowed)';
export const kParamAfterRest = 'Rest parameter must be last formal parameter';
export const kRestDefaultInitializer = 'Rest parameter may not have a default initializer';
export const kStrictEvalArguments = 'Unexpected eval or arguments in strict mode';
export const kBadGetterArity = 'Getter must not have any formal parameters.';
export const kBadSetterArity = 'Setter must have exactly one formal parameter.';
export const kBadSetterRestParameter = 'Setter function argument must not be a rest parameter';