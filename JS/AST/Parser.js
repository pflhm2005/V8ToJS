import { 
  Expression,
  AstNodeFactory
} from './AST';
import DeclarationParsingResult from './DeclarationParsingResult';
import AstRawString from './AstRawString';
import FuncNameInferrer from './FuncNameInferrer';
import Location from './Location';

import { VariableDeclarationParsingScope } from './ExpressionScope';
import Scope from './Scope';
import { FuncNameInferrer, State } from './FuncNameInferrer';

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
  IsLexicalVariableMode,
} from './Util';

import {
  kParamDupe,
  kVarRedeclaration,
} from './MessageTemplate';

const kStatementListItem = 0;
const kStatement = 1;
const kForStatement = 2;

const kNoSourcePosition = -1;

const kYes = 0;
const kNo = 1;

const kNeedsInitialization = 0;
const kCreatedInitialized = 1;

const kSloppyModeBlockScopedFunctionRedefinition = 22;
const kUseCounterFeatureCount = 76;

/**
 * 源码中的impl 作为模板参数传入ParseBase 同时也继承于该类
 * class Parser : public ParserBase<Parser>
 * Parser、ParserBase基本上是一个类
 */
class Parser extends ParserBase {
  constructor() {
    this.fni_ = new FuncNameInferrer();
    this.use_counts_ = new Array(kUseCounterFeatureCount).fill(0);
  }
  // 源码返回一个空指针
  NullExpression() {
    return new Expression();
  }
  /**
   * @returns {Expression}
   */
  ExpressionFromIdentifier(name, start_position, infer = kYes) {
    // 这个fni_暂时不知道干啥的
    if(infer === kYes) {
      this.fni_.PushVariableName(name);
    }
    // 在当前的作用域下生成一个新的变量
    return this.expression_scope_.NewVariable(name, start_position);
  }
  DeclareIdentifier(name, start_position) {
    return this.expression_scope_.Declare(name, start_position);
  }
  DeclareVariable(name, kind, mode, init, scope, was_added, begin, end = kNoSourcePosition) {
    let declaration;
    // var声明的变量需要提升
    if(mode === kVar && !scope.is_declaration_scope()) {
      declaration = this.ast_node_factory_.NewNestedVariableDeclaration(scope, begin);
    }
    // let、const 
    // 返回一个VariableDeclaration实例
    else {
      declaration = this.ast_node_factory_.NewVariableDeclaration(begin);
    }
    this.Declare(declaration, name, kind, mode, init. scope, was_added. begin, end);
    return declaration.var();
  }
  Declare(declaration, name, variable_kind, mode, init, scope, was_added, var_begin_pos, var_end_pos) {
    // 这两个参数作为引用传入方法 JS只能用这个操作了
    // bool local_ok = true;
    // bool sloppy_mode_block_scope_function_redefinition = false;
    // 普通模式下 在作用域内容重定义
    let { local_ok, sloppy_mode_block_scope_function_redefinition } = scope.DeclareVariable(
      declaration, name, var_begin_pos, mode, variable_kind, init, was_added,
      false, true);
    if(!local_ok) {
      // 标记错误地点 end未传入时仅仅高亮start一个字符
      let loc = new Location(var_begin_pos, var_end_pos !== kNoSourcePosition ? var_end_pos : var_begin_pos + 1);
      if(variable_kind === PARAMETER_VARIABLE) throw new Error(loc, kParamDupe);
      else throw new Error(loc, kVarRedeclaration);
    }
    // 重定义计数
    else if(sloppy_mode_block_scope_function_redefinition) {
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
    this.scope_ = new Scope();
    this.fni_ = new FuncNameInferrer();
    this.expression_scope_ = null;
  }
  IsLet(identifier) { return identifier === this.ast_value_factory_.let_string(); }
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
     * let后面跟{、}、a、static、let、yield、await、get、set、async是合法的(至少目前是合法的)
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
    /**
     * 源码中该变量类型是 ZonePtrList<const AstRawString>* names
     * 由于传进来是一个nullptr 这里手动重置为数组
     */
    if(!names) names = [];
    // 这一步的目的是设置scope参数
    this.expression_scope_ = new VariableDeclarationParsingScope(this.parser_, parsing_result.descriptor.mode, names);
    // 获取合适的作用域
    let target_scope = IsLexicalVariableMode(parsing_result.descriptor.mode) ? this.scope_ : this.scope_.GetDeclarationScope();
    
    let bindings_start = this.peek_position();
    /**
     * 可以一次性声明多个变量
     * let a = 1, b, c;
     */
    do {
      let fni_state = new State(this.fni_);

      let decl_pos = this.peek_position();
      // 变量名 => AstRawString*
      let name = null;
      // 抽象语法树节点 => Expression*
      let pattern = null;
      // 检查下一个token是否是标识符
      if(IsAnyIdentifier(this.peek())) {
        // 解析变量名字符串
        name = this.ParseAndClassifyIdentifier(this.Next());
        // 检查下一个token是否是赋值运算符
        if(this.peek() === 'Token::ASSIGN' || 
        // for in、for of
        (var_context === kForStatement && this.PeekInOrOf()) ||
        parsing_result.descriptor.mode === kLet) {
          /**
           * 生成一个Expression实例
           */
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

      let variable_loc = new Location();

      let value = this.NullExpression();
      let value_beg_pos = kNoSourcePosition;
      if(this.Check('Token::ASSIGN')) {
        {
          value_beg_pos = this.peek_position();
          value = this.ParseAssignmentExpression();
        }
        variable_loc.end_pos = this.end_position();

        // 处理a = function(){};
      }
      // 处理for in、for of
      else {}

      

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
    return this.ast_node_factory_.NewVariableProxy(name, NORMAL_VARIABLE, pos);
  }
}