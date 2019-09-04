import {
  kIsNormal,
  kClassLiteral,

  kNotSet,
  kValue,
  kShorthand,
  kShorthandOrClassField,
  kAssign,
  kMethod,
  kClassField,
} from '../enum';

export default class ParsePropertyInfo {
  constructor(parser, accumulation_scope = null) {
    this.accumulation_scope = accumulation_scope;
    this.name = null;
    this.position = kClassLiteral;
    this.function_flags = kIsNormal;
    this.kind = kNotSet;
    this.is_computed_name = false;
    this.is_private = false;
    this.is_static = false;
    this.is_rest = false;
  }
  /**
   * 检测以下符号
   * ':'、','、'}'、'='、'('、'*'、';'
   */
  ParsePropertyKindFromToken(token) {
    switch(token) {
      case 'Token::COLON':
        kind = kValue;
        return true;
      case 'Token::COMMA':
        kind = kShorthand;
        return true;
      case 'Token::RBRACE':
        kind = kShorthandOrClassField;
        return true;
      case 'Token::ASSIGN':
        kind = kAssign;
        return true;
      case 'Token::LPAREN':
        kind = kMethod;
        return true;
      case 'Token::MUL':
      case 'Token::SEMICOLON':
        kind = kClassField;
        return true;
      default:
        break;
    }
    return false;
  }
}