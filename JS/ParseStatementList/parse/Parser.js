import { 
  Expression,
  AstNodeFactory
} from '../ast/Ast';
import { DeclarationParsingResult, Declaration } from './DeclarationParsingResult';
import AstValueFactory from '../ast/AstValueFactory';
import Location from '../base/Location';

import { 
  VariableDeclarationParsingScope,
  ExpressionParsingScope,
} from './ExpressionScope';
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

  kNoSourcePosition,
  kArrowFunction,
  kAsyncArrowFunction,
} from '../base/Const';

import {
  IsAnyIdentifier,
  IsAutoSemicolon,
  IsLexicalVariableMode,
  IsAsyncFunction,
  IsArrowOrAssignmentOp,
  IsUnaryOrCountOp,
  IsCountOp,
  IsLiteral,
  IsPropertyOrCall,
  IsMember,
  Precedence,
} from '../base/Util';

import {
  kParamDupe,
  kVarRedeclaration,
} from '../base/MessageTemplate';

const kStatementListItem = 0;
const kStatement = 1;
const kForStatement = 2;

const kYes = 0;
const kNo = 1;

const kSloppyModeBlockScopedFunctionRedefinition = 22;
const kUseCounterFeatureCount = 76;

class ParserBase {
  constructor(scanner) {
    // scanner.Initialize();
    this.scanner = scanner;
    this.ast_value_factory_ = new AstValueFactory();
    this.ast_node_factory_ = new AstNodeFactory();
    this.scope_ = new Scope();
    this.fni_ = new FuncNameInferrer();
    this.expression_scope_ = null;
    this.pointer_buffer_ = [];

    this.accept_IN_ = true;
  }
  /**
   * 大量的工具方法
   * 已经砍掉了很多
   */
  IsLet(identifier) { return identifier === 'let'; }
  UNREACHABLE() {
    this.scanner.UNREACHABLE();
  }
  NullExpression() { return null; }
  NullIdentifier() { return null; }
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
    return this.scanner.peek_location().beg_pos;
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
    if (next === token) {
      this.Consume(next);
      return true;
    }
    return false;
  }

  /**
   * 省去了use strict、use asm的解析
   * 直接进入了正常语法树parse
   */
  ParseStatementList() {
    while(this.peek() !== 'Token::EOS') {
      this.ParseStatementListItem();
    }
  }
  /**
   * 一级解析
   * 优先处理了function、class、var、let、const、async声明式Token
   */
  ParseStatementListItem() {
    switch(this.peek()) {
      case 'Token::LET':
        if (this.IsNextLetKeyword()) {
          return this.ParseVariableStatement(kStatementListItem, null);
        }
        break;
    }
  }
  IsNextLetKeyword() {
    /**
     * 这里调用了PeekAhead后赋值了next_next_ 会影响Next方法
     * 调用后cur、next_、next_next_的值变化如下
     * [null, LET, null] => [null, LET, IDENTIFIER];
     */
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
        // return is_sloppy(language_mode());
      default:
        return false;
    }
  }
  /**
   * 处理var、let、const声明语句
   * 语句的形式应该是 (var | const | let) (Identifier) (=) (AssignmentExpression)
   */
  ParseVariableStatement(var_context, names) {
    let parsing_result = new DeclarationParsingResult();
    let result = this.ParseVariableDeclarations(var_context, parsing_result, names);
    /**
     * 处理自动插入semicolon
     * 见ECMA-262 11.9 Automatic Semicolon Insertion
     * 简要翻译如下；
     * 在若干情况下 源代码需要自动插入分号
     */
    this.ExpectSemicolon();
    return this.BuildInitializationBlock(result);
  }
  ParseVariableDeclarations(var_context, parsing_result, names) {
    parsing_result.descriptor.kind = NORMAL_VARIABLE;
    parsing_result.descriptor.declaration_pos = this.peek_position();
    parsing_result.descriptor.initialization_pos = this.peek_position();
    /**
     * 游标变动
     * [null, LET, IDENTIFIER] => [LET, IDENTIFIER, null]
     * 返回了LET
     */
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
    if (!names) names = [];
    // 这一步的目的是设置scope参数
    this.expression_scope_ = new VariableDeclarationParsingScope(this, parsing_result.descriptor.mode, names);
    // 获取合适的作用域
    let target_scope = IsLexicalVariableMode(parsing_result.descriptor.mode) ? this.scope_ : this.scope_.GetDeclarationScope();
    let decls = target_scope.declarations();
    let declaration_it = decls.length ? decls[decls.length - 1] : null;

    let bindings_start = this.peek_position();
    /**
     * 可以一次性声明多个变量
     * let a = 1, b, c;
     */
    do {
      // let fni_state = new State(this.fni_);

      let decl_pos = this.peek_position();
      // 变量名 => AstRawString*
      let name = null;
      // 抽象语法树节点 => Expression*
      let pattern = null;
      // 检查下一个token是否是标识符
      if (IsAnyIdentifier(this.peek())) {
        /**
         * 解析变量名并返回一个字符串对象 总体流程如下
         * 1、区分单字节字符串与双字符串 目前只考虑ascii码小于128的单字节
         * 2、确定类型后 由AstValueFactory类统一处理字符串实例的生成
         * 3、根据字符串的特征计算Hash值 有如下四种情况
         * (1)单字符 计算后 将值缓存到一个名为one_character_strings_的容器 下次直接返回
         * (2)纯数字字符串且小于2^32(int类型可保存范围内) 会转换为数字后进行Hash计算
         * (3)出现ascii码大于127会特殊处理 暂时不管
         * (4)其余情况会以一个种子数字为基准 遍历每一个字符的ascii码进行位运算 算出一个Hash值
         * 解析结果返回一个AstRawString实例与一个Hash值 并缓存到一个全局的Map中
         * 
         * 游标变动
         * [LET, IDENTIFIER, null] => [IDENTIFIER, ASSIGN, null]
         * @returns {AstRawString}
         */
        name = this.ParseAndClassifyIdentifier(this.Next());
        // 检查下一个token是否是赋值运算符
        if (this.peek() === 'Token::ASSIGN' || 
        // 判断for in、for of语法 这个暂时不解析
        // (var_context === kForStatement && this.PeekInOrOf()) ||
        parsing_result.descriptor.mode === kLet) {
          /**
           * 过程总结如下：
           * 1、生成一个VariableProxy实例(继承于Expressio) 
           * 该类负责管理VariableDeclaration 并记录了变量是否被赋值、是否被使用等等
           * 2、生成一个VariableDeclaration实例(继承于AstNode)
           * 该类管理Variable 并描述了变量的位置、声明类型(变量、参数、表达式)等
           * 3、在合适的Scope中生成一个Variable实例 插入到Map中
           * 该类描述了变量的作用域、名称等等
           * 
           * 整个过程有如下细节
           * (1)有两种情况下 该声明会被标记为unresolved丢进一个容器
           * 第一是赋值右值为复杂表达式 复杂表达式需要重新走Parse的完整解析
           * 例如let a = '123'.split('').map(v => v ** 2);
           * 第二种情况是var类型的声明 由于需要向上搜索合适的作用域 声明需要后置处理
           * (2)let、const与var生成的AstNode类型不一致 var属于NestedVariable({var a=1;{var a=2;}})
           * (3)有一个作用域链 类似于原型链 从里向外通过outer_scope属性(类似于__proto__)连着
           * (4)var类型的声明会向上一直搜索is_declaration_scope_为1的作用域
           * (5)由于检测到了赋值运算符 所以这里的变量属性都会被标记可能被赋值
           * @returns {Expression}
           */
          pattern = this.ExpressionFromIdentifier(name, decl_pos);
        }
        /**
         * 声明未定义的语句 let a;
         * 跳过了一些步骤 变量的很多属性都是未定义的状态
         */ 
        else {
          this.DeclareIdentifier(name, decl_pos);
          pattern = this.NullExpression();
        }
      }
      /**
       * let后面不一定必须跟标识符
       * let [ a, b ] = [1, 2]也是合法的
       */ 
      else {
        name = this.NullIdentifier();
        pattern = this.ParseBindingPattern();
      }
      
      let variable_loc = new Location();

      let value = this.NullExpression();
      let value_beg_pos = kNoSourcePosition;
      /**
       * 游标变动
       * [IDENTIFIER, ASSIGN, null] => [ASSIGN, SMI, null]
       */
      if (this.Check('Token::ASSIGN')) {
        {
          value_beg_pos = this.peek_position();
          /**
           * 这里处理赋值
           * 大部分情况下这是一个简单右值 源码使用了一个Precedence来进行渐进解析与优先级判定
           * Precedence代表该表达式的复杂程度 值越低表示越复杂(或运算符优先级越低)
           * Precedence = 2 基本处理方法
           * Precedence = 3 处理三元表达式 每一块都是独立的表达式 之间没有直接的逻辑
           * Precedence >= 4 处理二元表达式、一元表达式、纯字面量
           * 其中 由于运算存在多元的情况 所以均有一个对应的xxxContinuation方法来递归解析
           * 例如a ? b : c ? d : e、a.b.c、a[b][c]等等
           * 
           * Precedence >= 4的分类如下
           * (1)单值字面量 null、true、false、1、1.1、1n、'1'
           * (2)一元运算 +1、++a 形如+function(){}、!function(){}会被特殊处理
           * (3)二元运算 'a' + 'b'、1 + 2
           * (4){}对象、[]数组、``模板字符串
           * 等等情况 实在太过繁琐
           * 除了上述情况 被赋值的可能也是一个左值 比如遇到如下的特殊Token
           * import、async、new、this、function、任意标识符等等
           * 左值的解析相当于一个完整的新表达式
           */
          value = this.ParseAssignmentExpression();
        }
        variable_loc.end_pos = this.end_position();

        /**
         * 处理a = function(){};
         * 下面的先不管
         */
      }
      // 处理for in、for of
      else {}

      let initializer_position = this.end_position();
      /**
       * 当成简单的遍历
       * 这里的逻辑JS极难模拟 做简化处理
       */
      let declaration_end = decls[decls.length - 1];
      if(declaration_it === null) declaration_end.var().initializer_position_ = initializer_position;
      // else {
      //   for(;declaration_it !== declaration_end;declaration_it = declaration_it.next_) {
      //     declaration_it.var().set_initializer_position(initializer_position);
      //   }
      // }

      let decl = new Declaration(pattern, value);
      decl.value_beg_pos = value_beg_pos;

      parsing_result.declarations.push(decl);
    } while (this.Check('Token::COMMA'));

    parsing_result.bindings_loc = new Location(bindings_start, this.end_position());
    return parsing_result;
  }
  ParseAndClassifyIdentifier(next) {
    if (IsAnyIdentifier(next, 'IDENTIFIER', 'ASYNC')) {
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
  // NewRawVariable(name, pos) { return this.ast_node_factory_.NewVariableProxy(name, NORMAL_VARIABLE, pos); }

  /**
   * 处理赋值语法
   * @returns {Expression} 返回赋值右值
   */
  ParseAssignmentExpression() {
    // let expression_scope = new ExpressionParsingScope(this);
    let result = this.ParseAssignmentExpressionCoverGrammar();
    // expression_scope.ValidateExpression();
    return result;
  }
  /**
   * Precedence = 2
   * 大体上赋值表达式分为以下几种情况
   * (1)条件表达式 let a = true ? b : c
   * (2)箭头函数
   * (3)yield表达式
   * (4)左值?表达式 let a = new f()
   * (5)运算赋值 let a += b
   * (6)普通赋值表达式 let a = b
   * @returns {Expression}
   */
  ParseAssignmentExpressionCoverGrammar() {
    let lhs_beg_pos = this.peek_position();
    if(this.peek() === 'Token:YIELD' && this.is_generator()) return this.ParseYieldExpression();
    // FuncNameInferrerState fni_state(&fni_);
    /**
     * 解析条件表达式
     */
    let expression = this.ParseConditionalExpression();

    let op = this.peek();
    if (!IsArrowOrAssignmentOp(op)) return expression;

    // 箭头函数 V8_UNLIKELY
    if (op === 'Token::ARROW') {
      let loc = new Location(lhs_beg_pos, this.end_position());
      // if(...) return this.FailureExpression();
      // TODO
    }

    // TODO
    if (this.IsAssignableIdentifier(expression)) {
    } else if (expression.IsProperty()) {

    } else if (expression.IsPattern() && op === 'Token::ASSIGN') {

    } else {}

    this.Consume();
    let op_position = this.position();
    let right = this.ParseAssignmentExpression();
    // TODO
    if (op === 'Token::ASSIGN') {} 
    else {}

    return this.ast_node_factory_.NewAssignment(op, expression, right, op_position);
  }
  /**
   * Precedence = 3
   * 条件表达式 源码示例只有三元表达式
   */
  ParseConditionalExpression() {
    let pos = this.peek_position();
    let expression = this.ParseBinaryExpression(4);
    return this.peek() === 'Token::CONDITIONAL' ? this.ParseConditionalContinuation(expression, pos) : expression;
  }
  ParseConditionalContinuation() {}
  /**
   * Precedence >= 4
   * 处理二元表达式
   */
  ParseBinaryExpression(prec) {
    if(prec < 4) throw new Error('We start using the binary expression parser for prec >= 4 only!');
    let x = this.ParseUnaryExpression();
    let prec1 = Precedence(this.peek(), this.accept_IN_);
    if(prec1 >= prec) return this.ParseBinaryContinuation(x, prec, prec1);
    return x;
  }
  /**
   * 处理一元表达式 分为下列情况
   * (1)PostfixExpression
   * (2)delete xxx
   * (3)void xxx
   * (4)typeof xxx
   * (5)++
   * (6)--
   * (7)+
   * (8)-
   * (9)~
   * (10)!
   * (11)await xxx
   */
  ParseUnaryExpression() {
    let op = this.peek();
    // 一元运算
    if (IsUnaryOrCountOp(op)) return this.ParseUnaryOrPrefixExpression();
    // await语法
    if (this.is_async_function() && op === 'Token::AWAIT') return this.ParseAwaitExpression();
    // 运算后置语法与左值 ++ --
    return this.ParsePostfixExpression();
  }
  ParsePostfixExpression() {
    let lhs_beg_pos = this.peek_position();
    let expression = this.ParseLeftHandSideExpression();
    // V8_LIKELY
    if (!IsCountOp(this.peek()) || this.scanner.HasLineTerminatorBeforeNext()) return expression;
    return this.ParsePostfixContinuation(expression, lhs_beg_pos);
  }
  ParseAwaitExpression(){}
  /**
   * LeftHandSideExpression
   * 处理new与成员表达式
   */
  ParseLeftHandSideExpression() {
    let result = this.ParseMemberExpression();
    if (!IsPropertyOrCall(this.peek())) return result;
    return this.ParseLeftHandSideContinuation(result);
  }
  /**
   * 处理成员表达式
   * 即a.b、a[b]、`a${b}`、fn()等等
   * 由于对象属性的操作符依赖对象本身 所以需要优先解析处理初级表达式
   */
  ParseMemberExpression() {
    let result = this.ParsePrimaryExpression();
    return this.ParseMemberExpressionContinuation(result);
  }
  /**
   * 所有的逻辑最终会汇集在这里 处理最基本的单位
   * 分为下列情况
   * (1)this
   * (2)null
   * (3)true
   * (4)false
   * (5)Identifier
   * (6)Number
   * (7)String
   * (8)ArrayLiteral
   * (9)ObjectLiteral
   * (10)RegExpLiteral
   * (11)ClassLiteral
   * (12)'(' Expression ')'
   * (13)模板字符串 TemplateLiteral
   * (14)do Block
   * (15)AsyncFunctionLiteral
   */
  ParsePrimaryExpression() {
    let beg_pos = this.peek_position();
    let token = this.peek();

    if (IsAnyIdentifier(token)) {
      this.Consume();
      let kind = kArrowFunction;
      // V8_UNLIKELY
      if (token === 'Token::ASYNC' 
      && !this.scanner.HasLineTerminatorBeforeNext()
      && !this.scanner.literal_contains_escapes()) {
        // async普通函数
        if (this.peek() === 'Token::FUNCTION') return this.ParseAsyncFunctionLiteral();
        // async箭头函数
        if (this.peek_any_identifier() && this.PeekAhead() === 'Token::ARROW') {
          token = this.Next();
          beg_pos = this.position();
          kind = kAsyncArrowFunction;
        }
      }
      // V8_UNLIKELY
      if (this.peek() === 'Token::ARROW') {
        // TODO
      }

      let name = this.ParseAndClassifyIdentifier(token);
      return this.ExpressionFromIdentifier(name, beg_pos);
    }
    /**
     * 普通字面量
     */
    if (IsLiteral(token)) return this.ExpressionFromLiteral(this.Next(), beg_pos);
    /**
     * 处理各种特殊符号
     * 比如new this [] {}
     */
    switch(token) {

    }

    throw new Error('UnexpectedToken');
  }
  /**
   * 这里的所有方法都通过ast_node_factory工厂来生成literal类
   */
  ExpressionFromLiteral(token, pos) {
    switch(token) {
      case 'Token::NULL_LITERAL':
        return this.ast_node_factory_.NewNullLiteral(pos);
      case 'Token::TRUE_LITERAL':
        return this.ast_node_factory_.NewBooleanLiteral(true, pos);
      case 'Token::FALSE_LITERAL':
        return this.ast_node_factory_.NewBooleanLiteral(false, pos);
      case 'Token::SMI': {
        let value = this.scanner.smi_value();
        return this.ast_node_factory_.NewSmiLiteral(value, pos);
      }
      case 'Token:NUMBER': {
        let value = this.scanner.DoubleValue();
        return this.ast_node_factory_.NewNumberLiteral(value, pos);
      }
      case 'Token::BIGINT':
        return this.ast_node_factory_.NewBigIntLiteral(new AstBigInt(this.scanner.CurrentLiteralAsCString()), pos);
      case 'Token::STRING':
        return this.ast_node_factory_.NewStringLiteral(this.GetSymbol(), pos);
    }
    return this.FailureExpression();
  }
  /**
   * 成员表达式
   */
  ParseMemberExpressionContinuation(expression) {
    if (!IsMember(this.peek())) return expression;
    return this.DoParseMemberExpressionContinuation(expression);
  }
  DoParseMemberExpressionContinuation(expression) {
    // 成员符号也是可以多层的 a.b.c、a[b[c]]等等
    do {
      switch(this.peek()) {
        // []
        case 'Token::LBRACK': {
          this.Consume('Token::LBRACK');
          let pos = this.position();
          // TODO
          break;
        }
        case 'Token::PERIOD': {
          this.Consume('Token::PERIOD');
          let pos = this.position();
          // TODO
          break;
        }
        default:
          let pos;
          if (this.scanner.current_token() === 'Token::IDENTIFIER') pos = this.position();
          else {
            pos = this.peek_position();
            // TODO
          }
          expression = this.ParseTemplateLiteral(expression, pos, true);
          break;
      }
    } while(IsMember(this.peek()));
    return expression;
  }
  ParseTemplateLiteral() {}

  // TODO
  is_generator() { return true; }
  is_async_function() { return true; }

  /**
   * 处理自动分号插入
   */
  ExpectSemicolon() {
    let tok = this.peek();
    /**
     * 正常情况下会有个分号
     */
    if(tok === 'Token::SEMICOLON') {
      this.Next();
      return;
    }
    /**
     * ;, }, EOS
     */
    if(this.scanner.HasLineTerminatorBeforeNext() || IsAutoSemicolon(tok)) {
      return ;
    }
    throw new Error('UnexpectedToken');
  }

  FailureExpression() {}
}



/**
 * 源码中的Parser类作为模板参数impl作为模板参数传入ParseBase 同时也继承于该类
 * class Parser : public ParserBase<Parser>
 * template <typename Impl> class ParserBase {...}
 * Parser、ParserBase基本上是一个类
 */
export default class Parser extends ParserBase {
  constructor(scanner) {
    super(scanner);
    // this.fni_ = new FuncNameInferrer();
    this.use_counts_ = new Array(kUseCounterFeatureCount).fill(0);
  }
  /**
   * 返回一个变量代理 继承于Expression类
   * @returns {VariableProxy}
   */
  ExpressionFromIdentifier(name, start_position, infer = kYes) {
    // 这个fni_暂时不知道干啥的 TODO
    // if (infer === kYes) {
    //   this.fni_.PushVariableName(name);
    // }
    // 在当前的作用域下生成一个新的变量
    return this.expression_scope_.NewVariable(name, start_position);
  }
  DeclareIdentifier(name, start_position) {
    return this.expression_scope_.Declare(name, start_position);
  }
  DeclareVariable(name, kind, mode, init, scope, was_added, begin, end = kNoSourcePosition) {
    let declaration;
    // var声明的变量需要提升
    if (mode === kVar && !scope.is_declaration_scope()) {
      declaration = this.ast_node_factory_.NewNestedVariableDeclaration(scope, begin);
    }
    /**
     * let、const 声明
     * 这里才是返回一个VariableDeclaration实例
     * 即new VariableDeclaration(begin)
     */
    else {
      declaration = this.ast_node_factory_.NewVariableDeclaration(begin);
    }
    this.Declare(declaration, name, kind, mode, init, scope, was_added. begin, end);
    return declaration.var();
  }
  Declare(declaration, name, variable_kind, mode, init, scope, was_added, var_begin_pos, var_end_pos) {
    // 这两个参数作为引用传入方法 JS只能用这个操作了
    let local_ok = true;
    // bool sloppy_mode_block_scope_function_redefinition = false;
    // 普通模式下 在作用域内容重定义
    let { sloppy_mode_block_scope_function_redefinition } = scope.DeclareVariable(
      declaration, name, var_begin_pos, mode, variable_kind, init, was_added,
      false, true);
    // 下面代码大部分情况不会走
    if (!local_ok) {
      // 标记错误地点 end未传入时仅仅高亮start一个字符
      let loc = new Location(var_begin_pos, var_end_pos !== kNoSourcePosition ? var_end_pos : var_begin_pos + 1);
      if (variable_kind === PARAMETER_VARIABLE) throw new Error(loc, kParamDupe);
      else throw new Error(loc, kVarRedeclaration);
    }
    // 重定义计数
    else if (sloppy_mode_block_scope_function_redefinition) {
      ++this.use_counts_[kSloppyModeBlockScopedFunctionRedefinition];
    }
  }

  BuildInitializationBlock(parsing_result) {
    // ScopedPtrList就是一个高级数组 先不实现了
    // todo ScopedPtrList<Statement> statements(pointer_buffer());
    let vector = parsing_result.declarations;
    for (const declaration of vector) {
      // 这里的initializer是声明的初始值
      if(!declaration.initializer) continue;
      // 这里第二个参数是parsing_result.descriptor.kind 但是没有使用
      this.InitializeVariables(this.pointer_buffer_, declaration);
    }
    return this.ast_node_factory_.NewBlock(true, this.pointer_buffer_);
  }
  InitializeVariables(vector, declaration) {
    let pos = declaration.value_beg_pos;
    if(pos === kNoSourcePosition) pos = declaration.initializer.position();
    let assignment = this.ast_node_factory_.NewAssignment('Token::INIT', declaration.pattern, declaration.initializer, pos);
    vector.push(this.ast_node_factory_.NewExpressionStatement(assignment, pos));
  }
}