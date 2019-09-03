import { kLastLexicalVariableMode, kAsyncArrowFunction, kAsyncGeneratorFunction } from "../enum";
import { TokenIsInRange } from './Identifier';

/**
 * 表达式类型判定
 */
export const IsLexicalVariableMode = (mode) =>{
  return mode <= kLastLexicalVariableMode;
}

/**
 * 是否需要自动插入分号
 */
export const IsAutoSemicolon = (token) => {
  return TokenIsInRange(token, 'SEMICOLON', 'EOS');
}

export const IsAsyncFunction = (kind) => {
  return IsInRange(kind, kAsyncArrowFunction, kAsyncGeneratorFunction);
};

export const IsArrowOrAssignmentOp = (token) => {
  return TokenIsInRange(token, 'ARROW', 'ASSIGN_SUB');
}

export const IsUnaryOrCountOp = op => TokenIsInRange(op, 'ADD', 'DEC');
export const IsCountOp = op => TokenIsInRange(op, 'INC', 'DEC');
export const IsPropertyOrCall = op => TokenIsInRange(op, 'TEMPLATE_SPAN', 'LPAREN');
export const IsLiteral = token => TokenIsInRange(token, 'NULL_LITERAL', 'STRING');
export const IsMember = token => TokenIsInRange(token, 'TEMPLATE_SPAN', 'LBRACK');
