import AstValueFactory from './AstValueFactory';
import AstNodeFactory from './AstNodeFactory';
import DeclarationParsingResult from './DeclarationParsingResult';
import AstRawString from './AstRawString';
import FuncNameInferrer from './FuncNameInferrer';
import Location from './Location';

import {
  kVar,
  kLet,
  kConst,

  NORMAL_VARIABLE,
  PARAMETER_VARIABLE,
  THIS_VARIABLE,
  SLOPPY_BLOCK_FUNCTION_VARIABLE,
  SLOPPY_FUNCTION_NAME_VARIABLE,
} from './Const';

import {
  IsAnyIdentifier,
} from './Util';

const kStatementListItem = 0;
const kStatement = 1;
const kForStatement = 2;

const kNoSourcePosition = -1;

const kYes = 0;
const kNo = 1;

/**
 * 内存管理相关
 */
const kExpression = 0;
const kMaybeArrowParameterDeclaration = 1;
const kMaybeAsyncArrowParameterDeclaration = 2;
const kParameterDeclaration = 3;
const kVarDeclaration = 4;
const kLexicalDeclaration = 5;

const kNeedsInitialization = 0;
const kCreatedInitialized = 1;

class ExpressionScope {
  constructor(parser, type) {
    this.parser_ = parser;
    this.type_ = type;
  }
  NewVariable() {
    return this.parser_.NewRawVariable(name, start_position);
  }
  Declare(name, pos = kNoSourcePosition) {
    if(type_ === kParameterDeclaration) {
      return new ParameterDeclarationParsingScope(this).Declare(name, pos);
    }
    return new VariableDeclarationParsingScope(this).Declare(name, pos);
  }
  DefaultInitializationFlag(mode) {
    return mode === kVar ? kCreatedInitialized : kNeedsInitialization;
  }
}

class ParameterDeclarationParsingScope extends ExpressionScope {
  Declare(name, pos) {
    let kind = PARAMETER_VARIABLE;
    let mode = kVar;
    let was_added = null;
    let variable = this.parser_.DeclareVariable(name, kind, mode, 
      this.DefaultInitializationFlag(mode), this.scope_, was_added, pos);
    if(!this.has_duplicate() && !was_added) {
      duplicate_loc_ = new Location(pos, pos + name.length);
    }
    return variable;
  }
}

// Limit the allowed number of local variables in a function. The hard limit
// in Ignition is 2^31-1 due to the size of register operands. We limit it to
// a more reasonable lower up-limit.
const kMaxNumFunctionLocals = (1 << 23) - 1;
class VariableDeclarationParsingScope extends ExpressionScope {
  constructor(parser, mode, names) {
    this.parser_ = parser;
    this.mode_ = mode;
    this.names_ = names;
  }
  Declare(name, pos) {
    let kind = NORMAL_VARIABLE;
    let was_added = null;
    let variable = this.parser_.DeclareVariable(name, kind, this.mode_,
      this.DefaultInitializationFlag(this.mode_), this.parser_.scope, was_added, pos);
    if(was_added && this.parser_.scope_.num_var() > kMaxNumFunctionLocals) throw new Error('Too many variables declared (only 4194303 allowed)');
    if(this.names_) this.names_.Add(name, this.parser_.zone());
    if(this.IsLexicalDeclaration()) {
      if(this.parser_.IsLet(name)) {
        throw new Error('let is disallowed as a lexically bound name');
      }
    } else {
      if(this.parser_.loop_nesting_depth() > 0) {
        variable.set_maybe_assigned();
      }
    }
    return variable;
  }
}

const kSloppyModeBlockScopedFunctionRedefinition = 22;
const kUseCounterFeatureCount = 76;

class Parser extends ParserBase {
  constructor() {
    this.scope_ = null;
    this.fni_ = new FuncNameInferrer();
    this.expression_scope_ = new ExpressionScope(this);
    this.use_counts_ = new Array(kUseCounterFeatureCount).fill(0);
  }
  expression_scope() { return this.expression_scope_; }
  ExpressionFromIdentifier(name, start_position, infer = kYes) {
    if(infer === kYes) {
      this.fni_.PushVariableName(name);
    }
    return this.expression_scope().NewVariable(name, start_position);
  }
  DeclareIdentifier(name, start_position) {
    return this.expression_scope().Declare(name, start_position);
  }
  DeclareVariable(name, kind, mode, init, scope, was_added, begin, end = kNoSourcePosition) {
    let declaration;
    if(mode === kVar) {
      declaration = this.factory().NewNestedVariableDeclaration(scope, begin);
    } else {
      declaration = this.factory().NewVariableDeclaration(begin);
    }
    this.Declare(declaration, name, kind, mode, init. scope, was_added. begin, end);
    return declaration.var();
  }
  Declare(declaration, name, variable_kind, mode, init, scope, was_added, var_begin_pos, var_end_pos) {
    // 这两个参数作为引用传入方法
    // bool local_ok = true;
    // bool sloppy_mode_block_scope_function_redefinition = false;
    let local_ok = scope.DeclareVariable(
      declaration, name, var_begin_pos, mode, variable_kind, init, was_added,
      false, true);
    if(!local_ok) throw new Error(`error at ${var_begin_pos} ${var_end_pos}`);
    else {
      ++this.use_counts_[kSloppyModeBlockScopedFunctionRedefinition];
    }
  }
}

export default class ParserBase {
  constructor(scanner) {
    scanner.Initialize();
    this.scanner = scanner;
    this.ast_value_factory_ = new AstValueFactory();
    this.ast_node_factory_ = new AstNodeFactory();
    this.parser =  new Parser();
  }
  factory() { return this.ast_node_factory_; }
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
          return this.ParseVariableStatement(kStatementListItem, null);
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
    
    // 这一步的目的是设置scope参数
    let declaration = new VariableDeclarationParsingScope(this.parser_, parsing_result.descriptor.mode, names);

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
          pattern = this.parser.ExpressionFromIdentifier(name, decl_pos);
        } else {
          // 声明未定义的语句 let a;
          this.parser.DeclareIdentifier(name, decl_pos);
          pattern = this.NullExpression();
        }
      } else {
        // 声明未定义的语句
        name = this.parser.NullIdentifier();
        pattern = this.ParseBindingPattern();
      }

      let variable_loc = this.scanner.location();

      let value = this.NullExpression();
      let value_beg_pos = kNoSourcePosition;
      if(this.Check('Token::ASSIGN')) {
        value_beg_pos = this.peek_position();
        value = this.ParseAssignmentExpression();
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
  /**
   * 返回AstRawString*
   */
  GetSymbol() {
    const result = this.scanner.CurrentSymbol(this.ast_value_factory_);
    return result;
  }
  NewRawVariable(name, pos) {
    this.factory().ast_node_factory().NewVariableProxy(name, NORMAL_VARIABLE, pos);
  }
}