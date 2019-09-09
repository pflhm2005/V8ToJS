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
        this.kind = kValue;
        return true;
      case 'Token::COMMA':
        this.kind = kShorthand;
        return true;
      case 'Token::RBRACE':
        this.kind = kShorthandOrClassField;
        return true;
      case 'Token::ASSIGN':
        this.kind = kAssign;
        return true;
      case 'Token::LPAREN':
        this.kind = kMethod;
        return true;
      case 'Token::MUL':
      case 'Token::SEMICOLON':
        this.kind = kClassField;
        return true;
      default:
        break;
    }
    return false;
  }
}