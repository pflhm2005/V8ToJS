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

export const kDeclarationMissingInitializer = 'Missing initializer in destructuring/const declaration';
export const kInvalidDestructuringTarget = 'Invalid destructuring assignment target';
export const kInvalidPropertyBindingPattern = 'Illegal property in declaration context';
export const kInvalidLhsInAssignment = 'Invalid left-hand side in assignment';
export const kStrictDelete = 'Delete of an unqualified identifier in strict mode.';
export const kDeletePrivateField = 'Private fields can not be deleted';
export const kUnexpectedTokenUnaryExponentiation = 'Unary operator used immediately before exponentiation expression.';

export const kUnexpectedStrictReserved = 'Unexpected strict mode reserved word';
export const kInvalidPrivateFieldResolution = 'Private field xxx must be declared in an enclosing class';
export const kIllegalLanguageModeDirective = 'Illegal "use strict" directive in function with non-simple parameter list';
export const kMalformedArrowFunParamList = 'Malformed arrow function parameter list';
export const kAsyncFunctionInSingleStatementContext = 'Async functions can only be declared at the top level or inside a block.';
export const kUnexpectedLexicalDeclaration = 'Lexical declaration cannot appear in a single-statement context';
export const kNewlineAfterThrow = 'Illegal newline after throw';
export const kStrictWith = 'Strict mode code may not include a with statement';
export const kMultipleDefaultsInSwitch = 'More than one default clause in switch statement';
export const kUnterminatedArgList = 'missing ) after argument list';

export const kImportCallNotNewExpression = 'Cannot use new with import';
export const kUnexpectedPrivateField = 'Unexpected private field';
export const kUnexpectedSuper = "'super' keyword unexpected here";

export const kImportMetaOutsideModule = "Cannot use 'import.meta' outside a module";
export const kImportMissingSpecifier = 'import() requires a specifier';
export const kInvalidEscapedMetaProperty = 'must not contain escaped characters';

export const kUnterminatedTemplateExpr = 'Missing } in template expression';
export const kIntrinsicWithSpread = 'Intrinsic calls do not support spread arguments';
export const kNotDefined = '% is not defined';

export const kNoCatchOrFinally = 'Missing catch or finally after try';