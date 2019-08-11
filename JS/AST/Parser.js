import AstValueFactory from './AstValueFactory';
import DeclarationParsingResult from './DeclarationParsingResult';
import AstRawString from './AstRawString';

import {
  kVar,
  kLet,
  kConst,

  NORMAL_VARIABLE,
} from './Const';

import {
  IsAnyIdentifier,
} from './Util';

const kStatementListItem = 0;
const kStatement = 1;
const kForStatement = 2;

const kNoSourcePosition = -1;

class ParserBase {
  constructor(scanner) {
    scanner.Initialize();
    this.scanner = scanner;
    this.ast_value_factory_ = new AstValueFactory();
  }
  UNREACHABLE() {
    this.scanner.UNREACHABLE();
  }
  peek() {
    return this.scanner.peek();
  }
  Next() {
    return this.scanner.Next();
  }
  PeekAhead() {
    return this.scanner.PeekAhead();
  }
  PeekInOrOf() {
    return this.peek() === 'Token::IN'
    //  || PeekContextualKeyword(ast_value_factory()->of_string());
  }
  position() {
    return this.scanner.location().beg_pos;
  }
  peek_position() {
    return this.scanner.peek_position().beg_pos;
  }
  end_position() {
    return this.scanner.location().end_pos;
  }
  Consume(token) {
    let next = this.scanner.Next();
    return next === token;
  }
  Check(token) {
    let next = this.scanner.peek();
    if(next === token) {
      this.Consume(next);
      return true;
    }
    return false;
  }
  ParseStatementList() {
    while(this.peek() !== 'Token::EOS') {
      this.ParseStatementListItem();
    }
  }
  ParseStatementListItem() {
    switch(this.peek()) {
      case 'Token::LET':
        if(this.IsNextLetKeyword()) {
          return this.ParseVariableStatement(kStatementListItem, new AstRawString());
        }
        break;
    }
  }
  /**
   * 处理var、let、const声明语句
   * 语句的形式应该是 (var | const | let) (Identifier) (=) (AssignmentExpression)
   */
  IsNextLetKeyword() {
    let next_next = this.PeekAhead();
    /**
     * let后面跟{、}、a、static、let、yield、await、get、set、async是合法的(怎么可能……)
     * 其他保留关键词合法性根据严格模式决定
     */
    switch(next_next) {
      case 'Token::LBRACE':
      case 'Token::LBRACK':
      case 'Token::IDENTIFIER':
      case 'Token::STATIC':
      case 'Token::LET':
      case 'Token::YIELD':
      case 'Token::AWAIT':
      case 'Token::GET':
      case 'Token::SET':
      case 'Token::ASYNC':
        return true;
      case 'Token::FUTURE_STRICT_RESERVED_WORD':
        return is_sloppy(language_mode());
      default:
        return false;
    }
  }
  ParseVariableStatement(var_context, names) {
    let parsing_result = new DeclarationParsingResult();
    this.ParseVariableDeclarations(var_context, parsing_result, names);
    this.ExpectSemicolon();
  }
  ParseVariableDeclarations(var_context, parsing_result, names) {
    parsing_result.descriptor.kind = NORMAL_VARIABLE;
    parsing_result.descriptor.declaration_pos = this.peek_position();
    parsing_result.descriptor.initialization_pos = this.peek_position();
    // 设置声明mode
    switch(this.peek()) {
      case 'Token::VAR':
        parsing_result.descriptor.mode = kVar;
        this.Consume('Token::VAR');
        break;
      case 'Token::CONST':
        this.Consume('Token::CONST');
        parsing_result.descriptor.mode = kConst;
        break;
      case 'Token::LET':
        this.Consume('Token::LET');
        parsing_result.descriptor.mode = kLet;
        break;
      default:
        this.UNREACHABLE();
        break;
    }

    let bindings_start = this.peek_position();
    /**
     * 可以一次性声明多个变量
     * let a = 1, b, c;
     */
    do {
      let decl_pos = this.peek_position();
      // 变量名
      let name = '';
      let pattern = null;
      // 存在赋值运算符或for语句
      if(IsAnyIdentifier(this.peek())) {
        name = this.ParseAndClassifyIdentifier(this.Next());
        // let a = 1;
        if(this.peek() === 'Token::ASSIGN' || 
        // for in、for of
        (var_context === kForStatement && this.PeekInOrOf()) ||
        parsing_result.descriptor.mode === kLet) {

          // pattern = 
        } else {
          // 声明未定义的语句
        }
      } else {
        // 声明未定义的语句
      }

      let variable_loc = this.scanner.location();

      let value_beg_pos = kNoSourcePosition;
      if(this.Check('Token::ASSIGN')) {

      } else {

      }

      let initializer_position = this.end_position();

    } while (this.Check('Token::COMMA'));

    parsing_result.bindings_loc = new Location(bindings_start, this.end_position());
  }
  ParseAndClassifyIdentifier(next) {
    if(IsAnyIdentifier(next, 'IDENTIFIER', 'ASYNC')) {
      let name = this.GetIdentifier();
      return name;
    }
    // 其他情况都是用保留词做变量名 不合法
    this.UNREACHABLE();
  }
  GetIdentifier() {
    return this.GetSymbol();
  }
  GetSymbol() {
    return this.scanner.NextSymbol(this.ast_value_factory_);
  }
}