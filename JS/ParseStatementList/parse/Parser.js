import { 
  Expression,
  AstNodeFactory,
  Parameter
} from '../ast/Ast';
import { DeclarationParsingResult, Declaration } from './DeclarationParsingResult';
import AstValueFactory from '../ast/AstValueFactory';
import Location from '../scanner/Location';
import { 
  VariableDeclarationParsingScope,
  ExpressionParsingScope,
  AccumulationScope,
  ParameterDeclarationParsingScope,
} from './ExpressionScope';
import Scope, { DeclarationScope } from './Scope';

import { FuncNameInferrer, State } from './FuncNameInferrer';
import FunctionState from './FunctionState';

import ParsePropertyInfo from './ParsePropertyInfo';

import {
  kVar,
  kLet,
  kConst,

  kObjectLiteral,

  NORMAL_VARIABLE,
  PARAMETER_VARIABLE,

  kNoSourcePosition,
  kArrowFunction,
  kAsyncArrowFunction,

  kMaxArguments,

  kSpread,
  SPREAD,
  kValue,
  kAssign,
  kShorthandOrClassField,
  kShorthand,
  kIsAsync,
  kMethod,
  kIsGenerator,
  kAccessorGetter,
  kAccessorSetter,
  COMPUTED,
  kNotSet,
  kIsNormal,
  kSkipFunctionNameCheck,
  kFunctionNameIsStrictReserved,
  kFunctionNameValidityUnknown,
  kNormalFunction,
  kAsyncFunction,
  kGeneratorFunction,
  kAsyncGeneratorFunction,
  kConciseMethod,
  kAsyncConciseMethod,
  kConciseGeneratorMethod,
  kAsyncConciseGeneratorMethod,
  kDeclaration,
  kSloppy,
  kStrict,
  SLOPPY_BLOCK_FUNCTION_VARIABLE,
  kWrapped,
  kShouldEagerCompile,
  kShouldLazyCompile,
  kHasDuplicateParameters,
  kNoDuplicateParameters,
  PARSE_EAGERLY,
  PARSE_LAZILY,
  kSloppyMode,
  kStrictMode,
  _kBlock,
  kTemporary,
  FUNCTION_SCOPE,
  kParameterDeclaration,
} from '../enum';

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
  TokenIsInRange,
  IsPropertyName,
  IsStrictReservedWord,
  IsArrowFunction,
  IsGetterFunction,
  IsSetterFunction,
  is_sloppy,
  is_strict,
  IsValidIdentifier,
  IsGeneratorFunction,
} from '../util';

import {
  kParamDupe,
  kVarRedeclaration,
  kTooManyArguments,
  kElementAfterRest,
  kDuplicateProto,
  kInvalidCoverInitializedName,
  kMissingFunctionName,
  kArgStringTerminatesParametersEarly,
  kUnexpectedEndOfArgString,
  kTooManyParameters,
  kParamAfterRest,
  kRestDefaultInitializer,
  kStrictEvalArguments,
  kBadGetterArity,
  kBadSetterArity,
  kBadSetterRestParameter,
} from '../MessageTemplate';

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
    this.function_literal_id_ = 0;
    this.scanner = scanner;
    this.ast_value_factory_ = new AstValueFactory();
    this.ast_node_factory_ = new AstNodeFactory(this.ast_value_factory_);
    /**
     * 顶层作用域
     */
    this.original_scope_ = null;
    this.scope_ = new Scope();
    this.fni_ = new FuncNameInferrer();
    this.function_state_ = new FunctionState(null, this.scope, null);
    this.default_eager_compile_hint_ = kShouldLazyCompile;
    this.expression_scope_ = null;
    this.pointer_buffer_ = [];

    this.accept_IN_ = true;

    this.parameters_ = null;
    this.parsing_module_ = false;
  }
  /**
   * 大量的工具方法
   * 已经砍掉了很多
   */
  IsLet(identifier) { return identifier === 'let'; }
  // TODO
  IsAssignableIdentifier() {}
  UNREACHABLE() {
    this.scanner.UNREACHABLE();
  }
  NewFunctionScope(kind) {
    let result = new DeclarationScope(this.scope_, FUNCTION_SCOPE, kind);
    this.function_state_.RecordFunctionOrEvalCall();
    if(!IsArrowFunction(kind)) result.DeclareDefaultFunctionVariables(this.ast_value_factory_);
    return result;
  }
  NullExpression() { return null; }
  NullIdentifier() { return null; }
  language_mode() { return this.scope_.language_mode(); }
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
    let body = [];
    while(this.peek() !== 'Token::EOS') {
      let stat = this.ParseStatementListItem();
      if(stat === null) return;
      body.push(stat);
    }
  }
  /**
   * 一级解析
   * 优先处理了function、class、var、let、const、async声明式Token
   */
  ParseStatementListItem() {
    switch(this.peek()) {
      case 'Token::FUNCTION':
        return this._ParseHoistableDeclaration(null, false);
      case 'Token::VAR':
      case 'Token::CONST':
        return this.ParseVariableStatement(kStatementListItem, null);
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
     * let后面跟{、[、标识符、static、let、yield、await、get、set、async是合法的(实际上let let不合法)
     * 保留关键词合法性根据严格模式决定
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
           * @returns {Assignment}
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
  /**
   * 跳到scanner实现
   * @returns {AstRawString*}
   */
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
  GetSymbol() {
    const result = this.scanner.CurrentSymbol(this.ast_value_factory_);
    return result;
  }
  // NewRawVariable(name, pos) { return this.ast_node_factory_.NewVariableProxy(name, NORMAL_VARIABLE, pos); }

  /**
   * 处理赋值语法
   * @returns {Assignment} 返回赋值右值
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
   * @returns {Assignment}
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
     * [Token::ASSIGN, Token::LBRACE, null]
     */
    switch(token) {
      case 'Token::LBRACE':
        return this.ParseObjectLiteral();
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
  /**
   * 解析对象字面量
   * '{' (PropertyDefinition (',' PropertyDefinition)* ','? )? '}'
   */
  ParseObjectLiteral() {
    let pos = this.peek_position();
    /**
     * 此处生成了一个ScopedPtrList 容器是pointer_buffer_
     * ObjectPropertyList = ScopedPtrList<v8::internal::ObjectLiteralProperty>
     * ObjectPropertyList properties(pointer_buffer());
     */
    let properties = this.pointer_buffer_;
    // 引用属性计数
    let number_of_boilerplate_properties = 0;

    let has_computed_names = false;
    let has_rest_property = false;
    let has_seen_proto = false;
    // [Token::ASSIGN, Token::LBRACE, null] => [Token::LBRACE, xxx, null]
    this.Consume('Token::LBRACE');
    /**
     * 当前作用域类型如果是非表达式类型这里不做任何事
     * AccumulationScope accumulation_scope(expression_scope());
     */
    let accumulation_scope = new AccumulationScope(this.expression_scope_);
    while(!this.Check('Token::RBRACE')) {
      // FuncNameInferrerState fni_state(&fni_);
      let prop_info = new ParsePropertyInfo(this, accumulation_scope);
      prop_info.position = kObjectLiteral;
      /**
       * @returns {ObjectLiteralProperty}
       */
      let property = this.ParseObjectPropertyDefinition(prop_info, has_seen_proto);
      if (prop_info.is_computed_name) has_computed_names = true;
      if (prop_info.is_rest) has_rest_property = true;
      
      if (this.IsBoilerplateProperty(property) && !has_computed_names) number_of_boilerplate_properties++;
      properties.push(property);

      if (this.peek() !== 'Token::RBRACE') this.Expect('Token::COMMA');

      // this.fni_.Infer();
    }
    if (has_rest_property && properties.length > kMaxArguments) {
      this.expression_scope_.RecordPatternError(new Location(pos, this.position(), kTooManyArguments));
    }
    return this.InitializeObjectLiteral(this.ast_node_factory_.NewObjectLiteral(properties, number_of_boilerplate_properties, pos, has_rest_property));
  }
  ParseObjectPropertyDefinition(prop_info, has_seen_proto) {
    let name_token = this.peek();
    let next_loc = this.scanner.peek_location();

    let name_expression = this.ParseProperty(prop_info);

    let { name, function_flags, kind } = prop_info;
    switch(kind) {
      /**
       * 扩展运算符 { ...obj }
       */
      case kSpread:
        prop_info.is_computed_name = true;
        prop_info.is_rest = true;
        return this.ast_node_factory_.NewObjectLiteralProperty(this.ast_node_factory_.NewTheHoleLiteral(), name_expression, SPREAD, true);
      /**
       * 最常见的键值对形式 { a: 1 }
       */
      case kValue: {
        if (!prop_info.is_computed_name && this.scanner.CurrentLiteralEquals('__proto__')) {
          if (has_seen_proto) throw new Error(kDuplicateProto);
          has_seen_proto = true;
        }
        this.Consume('Token::COLON');
        // AcceptINScope scope(this, true);
        let value = this.ParsePossibleDestructuringSubPattern(prop_info.accumulation_scope);
        /**
         * 返回一个管理键值对的对象 标记了值的类型
         * @returns {ObjectLiteralProperty}
         */
        let result = this.ast_node_factory_.NewObjectLiteralProperty(name_expression, value, prop_info.is_computed_name);
        this.SetFunctionNameFromPropertyName(result, name);
        return result;
      }
      /**
       * 赋值运算符 =
       * 简写或类 } ,
       */
      case kAssign:
      case kShorthandOrClassField:
      case kShorthand: {
        // TODO
        // if(IsValidIdentifier(...))
        // if(name_token === 'Token::AWAIT') {}
        let lhs = this.ExpressionFromIdentifier(name, next_loc.beg_pos);
        // if (!this.IsAssignableIdentifier()) {}

        let value;
        if (this.peek() === 'Token::ASSIGN') {
          // TODO
          throw new Error(kInvalidCoverInitializedName);
        } else {
          value = lhs;
        }
        let result = this.ast_node_factory_.NewObjectLiteralProperty(name_expression, value, COMPUTED, false);
        // 只有匿名函数等等才会进入这里
        this.SetFunctionNameFromPropertyName(result, name);
        return result;
      }

      case kMethod:

      case kAccessorGetter:
      case kAccessorSetter:

      case kClassField:
      case kNotSet:
        return this.NullExpression();
    }
    this.UNREACHABLE();
  }
  /**
   * 这个方法负责解析对象键值对的key
   * [Token::LBRACE, xxx, null]
   * @returns {Expression}
   */
  ParseProperty(prop_info) {
    /**
     * 仅当Check参数与next_的token一致时才会调用Next
     * 这里Check对应xxx 进这个分支意味着
     * [Token::LBRACE, Token::ASYNC, null] => [Token::ASYNC, xxx, null]
     * 即{ async ... };
     */
    if (this.Check('Token::ASYNC')) {
      let token = this.peek();
      /**
       * 进入这个分支代表async被当成普通的变量名
       * { async: 1 }
       */
      if ((token !== 'Token::MUL'
      && prop_info.ParsePropertyKindFromToken(token))
      || this.scanner.HasLineTerminatorBeforeNext()) {
        prop_info.name = this.GetIdentifier();
        this.PushLiteralName(prop_info.name);
        return this.NewStringLiteral(prop_info.name, this.position());
      }
      // V8_UNLIKELY
      if(this.scanner.literal_contains_escapes()) throw new Error('UnexpectedToken Token::ESCAPED_KEYWORD');
      // 给属性上标记
      prop_info.function_flags = kIsAsync;
      prop_info.kind = kMethod;
    }
    /**
     * { *fn(){} };
     * GeneratorFunction
     */
    if (this.Check('Token::MUL')) {
      prop_info.function_flags |= kIsGenerator;
      prop_info.kind = kMethod;
    }
    /**
     * { get xxx(){}, set xxx(){} }; 其中xxx是标识符
     * 特殊的get、set属性
     * [Token::LBRACE, Token::GET, null]、[Token::LBRACE, Token::SET, null]
     */
    if (prop_info.kind === kNotSet && TokenIsInRange(this.peek(), 'GET', 'SET')) {
      let token = this.Next();
      /**
       * 进入下面的分支代表{ get: 1, set(){} }
       * 这种情况get、set会当成普通属性解析
       */
      if (prop_info.ParsePropertyKindFromToken(this.peek())) {
        prop_info.name = this.GetIdentifier();
        this.PushLiteralName(prop_info.name);
        return this.NewStringLiteral(prop_info.name, this.position());
      }
      // V8_UNLIKELY
      if (this.scanner.literal_contains_escapes()) throw new Error('UnexpectedToken Token::ESCAPED_KEYWORD');
      if (token === 'Token::GET') prop_info.kind = kAccessorGetter;
      if (token === 'Token::SET') prop_info.kind = kAccessorSetter;
    }

    let pos = this.position();
    let is_array_index = false;
    let index = 0;
    /**
     * 前面处理的是三种特殊情况
     * 下面是正常键的解析
     */
    switch (this.peek()) {
      /**
       * #号开头会被识别为PRIVATE_NAME
       * 对象属性不支持
       */
      case 'Token::PRIVATE_NAME': {
        prop_info.is_private = true;
        is_array_index = false;
        this.Consume('Token::PRIVATE_NAME');
        if(prop_info.kind === kNotSet) prop_info.ParsePropertyKindFromToken(this.peek());
        prop_info.name = this.GetIdentifier();
        // V8_UNLIKELY
        if(prop_info.position === kObjectLiteral) throw new Error('UnexpectedToken Token::PRIVATE_NAME');
        // if(allow_harmony_private_methods() && )
        break;
      }
      /**
       * { 'aaa': xxx }
       * 显式的字符串属性
       */
      case 'Token::STRING': {
        this.Consume('Token::STRING');
        // 这两个方法一点卵区别都没有
        prop_info.name = this.peek() === 'Token::COLON' ? this.GetSymbol() : this.GetIdentifier();
        let result = this.IsArrayIndex(prop_info.name, index);
        is_array_index = result.is_array_index;
        index = result.index;
        break;
      } 
      
      case 'Token::SMI':
        this.Consume('Token::SMI');
        index = this.scanner.smi_value();
        is_array_index = true;
        prop_info.name = this.GetSymbol();
        break;

      case 'Token::NUMBER': {
        this.Consume('Token::NUMBER');
        prop_info.name = this.GetNumberAsSymbol();
        let result = this.IsArrayIndex(prop_info.name, index);
        is_array_index = result.is_array_index;
        index = result.index;
        break;
      }
      /**
       * '[' 符号 即{ [1]: 2 }
       * 这种键是需要计算的 因此给了一个is_computed_name标记
       */
      case 'Token::LBRACK': {
        prop_info.name = this.NullIdentifier();
        prop_info.is_computed_name = true;
        this.Consume('Token::LBRACK');
        // AcceptINScope scope(this, true);
        /**
         * 直接走了赋值解析 我靠
         */
        let expression = this.ParseAssignmentExpression();
        this.Expect('Token::RBRACK');
        if(prop_info.kind === kNotSet) prop_info.ParsePropertyKindFromToken(this.peek());
        return expression;
      }
      /**
       * '...' 扩展运算符
       */
      case 'Token::ELLIPSIS':
        if (prop_info.kind === kNotSet) {
          prop_info.name = this.NullIdentifier();
          this.Consume('Token::ELLIPSIS');
          // AcceptINScope scope(this, true);
          let start_pos = this.peek_position();
          /**
           * TODO 不晓得这个解析什么
           */
          let expression = this.ParsePossibleDestructuringSubPattern(prop_info.accumulation_scope);
          prop_info.kind = kSpread;

          if (this.peek() !== 'Token::RBRACE') throw new Error(kElementAfterRest);
          return expression;
        }
        this.UNREACHABLE();
      /**
       * 其余大部分情况在这里处理
       * 例如隐式的字符串属性 { a: 1 }
       */
      default:
        prop_info.name = this.ParsePropertyName();
        is_array_index = false;
        break;
    }
    if (prop_info.kind === kNotSet) prop_info.ParsePropertyKindFromToken(this.peek());
    this.PushLiteralName(prop_info.name);
    return is_array_index ? this.ast_node_factory_.NewNumberLiteral(index, pos) : this.ast_node_factory_.NewStringLiteral(prop_info.name, pos);
  }
  /**
   * 解析value
   * @param {ExpressionScope} scope
   * @returns {Expression} 
   */
  ParsePossibleDestructuringSubPattern(scope) {
    if (scope) scope.Accumulate();
    // let begin = this.peek_position();
    let result = this.ParseAssignmentExpressionCoverGrammar();
    return result;
  }
  ParsePropertyName() {
    let next = this.Next();
    // V8_LIKELY
    if (IsPropertyName(next)) {
      if (this.peek() === 'Token::COLON') return this.GetSymbol();
      return this.GetIdentifier();
    }
    throw new Error('UnexpectedToken ParsePropertyName');
  }
  /**
   * Pattern包括了
   * 1.Identifier 变量
   * 2.ArrayLiteral 数组字面量
   * 3.ObjectLiteral  对象字面量
   */
  ParseBindingPattern() {
    let beg_pos = this.peek_position();
    let token = this.peek();
    let result = null;
    if(IsAnyIdentifier(token)) {
      let name = this.ParseAndClassifyIdentifier(this.Next());
      // 严格模式禁用eval与arguments
      if(is_strict(this.language_mode()) && this.IsEvalOrArguments(name)) throw new Error(kStrictEvalArguments);
      return this.ExpressionFromIdentifier(name, beg_pos);
    }
    // CheckStackOverflow();
    if(token === 'Token::LBRACK') result = this.ParseArrayLiteral();
    else if(token === 'Token::LBRACE') result = this.ParseObjectLiteral();
    else throw new Error('UnexpectedToken');

    return result;
  }
  /**
   * 这里重载了 JS不管
   * @param {ObjectLiteralProperty} property 键值对对象
   * @param {AstRawString*} name 键值
   * @param {AstRawString*} prefix 
   */
  SetFunctionNameFromPropertyName(property, name, prefix = null) {
    // 设置prototype不做处理
    if (property.IsPrototype()) return;
    /**
     * 匿名函数
     */
    if (property.NeedsSetFunctionName()) {
      name = null;
      prefix = null;
    } else {
      // TODO
    }
    let value = property.value_;
    this.SetFunctionName(value, name, prefix);
  }
  SetFunctionName(value, name, prefix) {
    // TODO
  }
  IsBoilerplateProperty(property) {
    return !property.IsPrototype();
  }
  InitializeObjectLiteral(object_literal) {
    object_literal.CalculateEmitStore();
    return object_literal;
  }
  Expect(token) {
    let next = this.Next();
    // V8_UNLIKELY
    if(next !== token) {
      throw new Error('UnexpectedToken');
    }
  }
  /**
   * 判定该字符串是否是int32的纯数字 多位数不可以0开头
   * @param {AstRawString} string 
   * @param {Number} index 
   */
  IsArrayIndex(string, index) {
    return string.AsArrayIndex(index);
  }
  PushLiteralName(id) {
    this.fni_.PushLiteralName(id);
  }

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

  FailureExpression() { throw new Error('UnexpectedExpression'); }

  /**
   * 解析函数声明 存在变量提升
   * 此处有函数重载 由于重载函数多处调用 这个2参调用少 改个名
   * @param {AstRawString*} names
   * @param {Boolean} default_export
   */
  _ParseHoistableDeclaration(names = null, default_export = null) {
    this.expression_scope_ = new VariableDeclarationParsingScope(this, kParameterDeclaration, names);
    this.Consume('Token::FUNCTION');
    let pos = this.position();
    let flags = kIsNormal;
    if(this.Check('Token::MUL')) flag |= kIsGenerator;
    this.ParseHoistableDeclaration(pos, flags, names, default_export);
  }
  /**
   * 普通函数声明的格式如下:
   * 1、'function' Identifier '(' FormalParameters ')' '{' FunctionBody '}'
   * 2、'function' '(' FormalParameters ')' '{' FunctionBody '}'
   * Generator函数声明格式如下:
   * 1、'function' '*' Identifier '(' FormalParameters ')' '{' FunctionBody '}'
   * 2、'function' '*' '(' FormalParameters ')' '{' FunctionBody '}'
   * 均分为正常与匿名 default_export负责标记这个区别
   * @param {int} pos 
   * @param {ParseFunctionFlags} flags 
   * @param {AstRawString*} names 
   * @param {Boolean} default_export 
   */
  ParseHoistableDeclaration(pos, flags, names, default_export) {
    // this.CheckStackOverflow(); TODO
    if((flags & kIsAsync) !== 0 && this.Check('Token::MUL')) flag |= kIsGenerator;

    let name = null;
    let name_validity = null;
    let variable_name = null;
    /**
     * 匿名函数或者函数表达式
     */
    if(this.peek() === 'Token::LPAREN') {
      if(default_export) {
        name = this.ast_value_factory_.default_string();
        variable_name = this.ast_value_factory_.dot_default_string();
        name_validity = kSkipFunctionNameCheck;
      } else {
        throw new Error(kMissingFunctionName);
      }
    }
    /**
     * 带名字的函数声明
     */ 
    else {
      // 函数名判断是否是保留字
      let is_strict_reserved = IsStrictReservedWord(this.peek());
      let name = this.ParseIdentifier(this.scope_.function_kind_);
      name_validity = is_strict_reserved ? kFunctionNameIsStrictReserved : kFunctionNameValidityUnknown;
      variable_name = name;
    }

    /**
     * 这里的C++源码代码如下
     * FuncNameInferrerState fni_state(&fni_);
     * 很多地方都有这个声明 但是fni_state实际上并没有调用
     * 目的是为了触发构造函数的++this.fni_.scope_depth_
     */
    this.fni_.scope_depth_++;
    this.PushEnclosingName(name);
    let function_kind = this.FunctionKindFor(flags);
    /**
     * 解析函数参数与函数体
     * @returns {FunctionLiteral}
     */
    let functionLiteral = this.ParseFunctionLiteral(name, this.scanner.location(), name_validity, function_kind, pos, kDeclaration, this.language_mode(), null);

    let mode = (!this.scope_.is_declaration_scope() || this.scope_.is_module_scope()) ? kLet : kVar;
    let kind = is_sloppy(this.language_mode()) && 
    !this.scope_.is_declaration_scope() &&
    flags === kIsNormal ? SLOPPY_BLOCK_FUNCTION_VARIABLE : NORMAL_VARIABLE;
    return this.DeclareFunction(variable_name, functionLiteral, mode, kind, pos, this.end_position(), names);
  }
  ParseIdentifier(function_kind) {
    let next = this.Next();
    if(!IsValidIdentifier(next, this.language_mode(), 
    IsGeneratorFunction(function_kind), this.parsing_module_ || IsAsyncFunction(function_kind))) {
      throw new Error('UnexpectedToken');
    }
    return this.GetIdentifier();
  }
  PushEnclosingName(name) {
    this.fni_.PushEnclosingName(name);
  }
  FunctionKindFor(flags) {
    return this.FunctionKindForImpl(0, flags);
  }
  FunctionKindForImpl(is_method, flags) {
    let kFunctionKinds = [
      [
        [kNormalFunction, kAsyncFunction],
        [kGeneratorFunction, kAsyncGeneratorFunction]
      ],
      [
        [kConciseMethod, kAsyncConciseMethod],
        [kConciseGeneratorMethod, kAsyncConciseGeneratorMethod]
      ]
    ];
    let i = Number((flags & kIsGenerator) !== 0);
    let j = Number((flags & kIsAsync) !== 0);
    return kFunctionKinds[is_method][i][j];
  }
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
    this.mode_ = PARSE_EAGERLY;
    this.target_stack_ = null;
    this.parameters_end_pos_ = kNoSourcePosition;
    this.allow_lazy_ = false;
    this.use_counts_ = new Array(kUseCounterFeatureCount).fill(0);
  }
  IsEval(identifier) {
    return identifier.literal_bytes_ === this.ast_value_factory_.eval_string();
  }
  IsArguments(identifier) {
    return identifier.literal_bytes_ === this.ast_value_factory_.arguments_string();
  }
  IsEvalOrArguments(identifier) {
    return this.IsEval(identifier) || this.IsArguments(identifier);
  }
  /**
   * 判断当前的expression是不是通过let const var声明的标识符
   * @param {Expression}} expression 
   */
  IsIdentifier(expression) {
    let operand = expression;
    return operand !== null && !operand.is_new_target();
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
    /**
     * ScopedPtrList就是一个高级数组 先不实现了
     * ScopedPtrList<Statement> statements(pointer_buffer());
     */
    let statements = this.pointer_buffer_;
    let vector = parsing_result.declarations;
    for (const declaration of vector) {
      // 这里的initializer是声明的初始值
      if(!declaration.initializer) continue;
      // 这里第二个参数是parsing_result.descriptor.kind 但是没有使用
      this.InitializeVariables(statements, declaration);
    }
    return this.ast_node_factory_.NewBlock(true, statements);
  }
  InitializeVariables(vector, declaration) {
    let pos = declaration.value_beg_pos;
    if(pos === kNoSourcePosition) pos = declaration.initializer.position();
    let assignment = this.ast_node_factory_.NewAssignment('Token::INIT', declaration.pattern, declaration.initializer, pos);
    vector.push(this.ast_node_factory_.NewExpressionStatement(assignment, pos));
  }

  /**
   * 解析函数参数与函数体 分为三种情况
   * 1、普通函数 '(' FormalParameterList? ')' '{' FunctionBody '}'
   * 2、Getter函数 '(' ')' '{' FunctionBody '}'
   * 3、Setter函数 '(' PropertySetParameterList ')' '{' FunctionBody '}'
   * @param {AstRawString*} function_name 函数名
   * @param {Location} function_name_location 函数位置 这是一个对象
   * @param {FunctionNameValidity} function_name_validity 函数名是否是保留字
   * @param {FunctionKind} kind 函数类型 通过一个映射表得到
   * @param {int} function_token_pos 当前位置点
   * @param {FunctionType} function_syntax_kind 声明类型(kDeclaration)
   * @param {LanguageMode} language_mode 当前作用域是否是严格模式
   * @param {ZonePtrList} arguments_for_wrapped_function null
   * @returns {FunctionLiteral} 返回一个函数字面量
   */
  ParseFunctionLiteral(function_name, function_name_location, function_name_validity, kind, function_token_pos, function_syntax_kind, language_mode, arguments_for_wrapped_function) {
    /**
     * 难道是(function(){}) ???
     */
    let is_wrapped = function_syntax_kind === kWrapped;
    let pos = function_token_pos === kNoSourcePosition ? this.peek_position() : function_token_pos;
    // 匿名函数传进来是null 给设置一个空字符串
    let should_infer_name = function_name === null;
    if (should_infer_name) function_name = this.ast_value_factory_.empty_string();
    /**
     * 标记该函数是否应该被立即执行
     * !function(){}、+function(){}、IIFE等等
     */
    let eager_compile_hint = this.function_state_.next_function_is_likely_called() || is_wrapped ? kShouldEagerCompile : this.default_eager_compile_hint_;
    
    /**
     * 有些函数在解析(抽象语法树生成阶段)阶段就需要被提前编译 比如说IIFE
     * 其余的函数则是懒编译 只做抽象语法树的解析
     * 判断是否懒编译有以下几个条件
     * 1、开发者没有禁用这个功能
     * 2、外部作用域必须允许内部函数的懒编译
     * 3、函数表达式之前不能有左括号 这可能是一个IIFE的暗示
     * 
     * 顶层作用域的函数与内部作用域的函数在懒编译的处理上不一样
     * 因为存在着变量提升的可能 比如下面的案例
     * (function foo() { bar = function() { return 1; } })()
     * 此时foo会被立即解析编译 bar则稍微才会被解析
     */
    let is_lazy = eager_compile_hint === kShouldLazyCompile;
    // 判断是否是顶级作用域
    let is_top_level = this.AllowsLazyParsingWithoutUnresolvedVariables();
    let is_eager_top_level_function = !is_lazy && is_top_level;
    let is_lazy_top_level_function = is_lazy && is_top_level;
    let is_lazy_inner_function = is_lazy && !is_top_level;

    /**
     * 判定是否可以懒解析内部函数
     * 前提条件如下
     * 1、Lazy compilation功能开启
     * 2、禁止声明native函数
     * 3、...
     */
    let should_preparse_inner = this.parse_lazily() && is_lazy_inner_function;
    // 默认是false
    let should_post_parallel_task = false;

    let should_preparse = (this.parse_lazily() && is_lazy_top_level_function) || should_preparse_inner || should_post_parallel_task;
    let body = this.pointer_buffer_;
    let function_literal_id = this.GetNextFunctionLiteralId();
    let produced_preparse_data = null;

    let scope = this.NewFunctionScope(kind);
    this.SetLanguageMode(scope, language_mode);
    // V8_UNLIKELY
    if (!is_wrapped && (!this.Check('Token::LPAREN'))) throw new Error('UnexpectedToken');
    scope.set_start_position(this.position);

    /**
     * 终于开始解析了
     * 由于Lazy mode默认不开启 所以这里是false
     * 目前的结构 => '(' 函数参数 ')' '{' 函数体 '}'
     */
    let did_preparse_successfully = should_preparse && this.SkipFunction(function_name, kind, function_syntax_kind, scope, -1, -1, null);
    
    /**
     * 下面的变量作为引用传到ParseFunction里去了
     */
    // int expected_property_count = 0;
    // int suspend_count = -1;
    // int num_parameters = -1;
    // int function_length = -1;
    // bool has_duplicate_parameters = false;
    let result = {};
    if (!did_preparse_successfully) {
      if (should_preparse) this.Consume('Token::LPAREN');
      should_post_parallel_task = false;
      result = this.ParseFunction(body, function_name, pos, kind, function_syntax_kind, scope,
        -1, -1, false, 0, -1, arguments_for_wrapped_function);
    }

    let { num_parameters, function_length, has_duplicate_parameters, expected_property_count, suspend_count } = result;
    return;
    /**
     * 解析完函数后再检测函数名合法性
     * 因为函数名的严格模式取决于外部作用域
     */
    language_mode = scope.language_mode();
    this.CheckFunctionName(language_mode, function_name, function_name_validity, function_name_location);
    if(is_strict(language_mode)) this.CheckStrictOctalLiteral(scope.start_position(), scope.end_position());
    let duplicate_parameters = has_duplicate_parameters ? kHasDuplicateParameters : kNoDuplicateParameters;

    let function_literal = this.ast_node_factory_.NewFunctionLiteral(
      function_name, scope, body, expected_property_count, num_parameters,
      function_length, duplicate_parameters, function_syntax_kind,
      eager_compile_hint, pos, true, function_literal_id, produced_preparse_data);
    function_literal.set_function_token_position(function_token_pos);
    function_literal.set_suspend_count(suspend_count);

    this.RecordFunctionLiteralSourceRange(function_literal);

    // if (should_post_parallel_task) {}
    if(should_infer_name) this.fni_.AddFunction(function_literal);

    return function_literal;
  }
  AllowsLazyParsingWithoutUnresolvedVariables() {
    return this.scope_.AllowsLazyParsingWithoutUnresolvedVariables(this.original_scope_);
  }
  parse_lazily() {
    return this.mode_ === PARSE_LAZILY;
  }
  GetNextFunctionLiteralId() {
    return ++this.function_literal_id_;
  }
  SetLanguageMode(scope, mode) {
    let feature;
    if(is_sloppy(mode)) feature = kSloppyMode;
    else if(is_strict(mode)) feature = kStrictMode;
    else this.UNREACHABLE();
    ++this.use_counts_[feature];
    scope.SetLanguageMode(mode);
  }

  /**
   * 这个函数的参数是他妈真的多
   * 解析函数参数 流程巨长
   * @param {ScopedPtrList<Statement>*} body 保存了当前作用域内所有变量
   * @param {AstRawString*} function_name 函数名 匿名函数是空字符串
   * @param {int} pos 当前位置
   * @param {FunctionKind} kind 函数类型 见FunctionKindForImpl
   * @param {FunctionSyntaxKind} function_syntax_kind 普通函数orIIFE
   * @param {DeclarationScope} function_scope 函数的作用域
   * @param {int*} num_parameters 参数数量
   * @param {int*} function_length 函数长度
   * @param {bool*} has_duplicate_parameters 是否有重复参数
   * @param {int*} expected_property_count 
   * @param {int*} suspend_count 
   * @param {ZonePtrList<const AstRawString>*} arguments_for_wrapped_function 
   */
  ParseFunction(body, function_name, pos, kind, function_syntax_kind, function_scope,
    num_parameters = -1, function_length = -1, has_duplicate_parameters = false,
    expected_property_count = 0, suspend_count = -1, arguments_for_wrapped_function = null) {

    let mode = new ParsingModeScope(this, this.allow_lazy_ ? PARSE_LAZILY : PARSE_EAGERLY);
    let function_state = new FunctionState(this.function_state_, this.scope_, function_scope);

    let is_wrapped = function_syntax_kind === kWrapped;

    let expected_parameters_end_pos = this.parameters_end_pos_;
    if(expected_parameters_end_pos !== kNoSourcePosition) this.parameters_end_pos_ = kNoSourcePosition;

    let formals = new ParserFormalParameters(function_scope);
    {
      let formals_scope = new ParameterDeclarationParsingScope(this);
      /**
       * 类型待定
       */
      if(is_wrapped) {
        for(const arg of arguments_for_wrapped_function) {
          const is_rest = false;
          let argument = this.ExpressionFromIdentifier(arg, kNoSourcePosition);
          this.AddFormalParameter(formals, argument, null, kNoSourcePosition, is_rest);
        }
        this.DeclareFormalParameters(formals);
      }
      /**
       * 正常声明的函数
       */
      else {
        // 解析参数
        this.ParseFormalParameterList(formals);
        if(expected_parameters_end_pos !== kNoSourcePosition) {
          let position = this.peek_position();
          if(position < expected_parameters_end_pos) throw new Error(kArgStringTerminatesParametersEarly);
          else if(position > expected_parameters_end_pos) throw new Error(kUnexpectedEndOfArgString);
          return;
        }
        this.Expect('Token::RPAREN');
        let formals_end_position = this.scanner.location().end_pos;
        this.CheckArityRestrictions(formals.arity, kind, formals.has_rest, function_scope.start_position_, formals_end_position);
        this.Expect('Token::LBRACE');
      }
      formals.duplicate_loc = formals_scope.duplicate_location();
    }
    num_parameters = formals.num_parameters();
    function_length = formals.function_length;

    // AcceptINScope scope(this, true);
    /**
     * 解析函数体
     */
    // this.ParseFunctionBody(body, function_name, pos, formals, kind, function_syntax_kind, _kBlock);
    has_duplicate_parameters = formals.has_duplicate();
    expected_property_count = function_state.expected_property_count_;
    suspend_count = function_state.suspend_count_;
    console.log(formals);
    return { num_parameters, function_length, has_duplicate_parameters, expected_property_count, suspend_count };
  }

  /**
   * 以下内容为解析函数参数
   * @param {ParserFormalParameters*} parameters 
   */
  ParseFormalParameterList(parameters) {
    /**
     * C++有很多声明但是不调用的方法
     * 但实际操作写在了析构函数中 比如这里的声明
     * 目的是缓存当前scope的parameters_ 解析完后还原
     * ParameterParsingScope scope(impl(), parameters);
     */
    let parent_parameters_ = this.parameters_;
    this.parameter_ = parameters;
    if(this.peek() !== 'Token::RPAREN') {
      while(true) {
        // 形参数量有限制
        if(parameters.arity + 1 > kMaxArguments) throw new Error(kTooManyParameters);
        // 检查...运算符
        parameters.has_rest = this.Check('Token::ELLIPSIS');
        this.ParseFormalParameter(parameters);

        if(parameters.has_rest) {
          parameters.is_simple = false;
          // function a(a, ...b,) {} 这种也是不合法的 rest后面不能加括号
          if(this.peek() === 'Token::COMMA') throw new Error(kParamAfterRest);
          break;
        }
        // 代表解析完了
        if(!this.Check('Token::COMMA')) break;
        // 形参最后的逗号 function a(a, b,) {}
        if(this.peek() === 'Token::RPAREN') break;
      }
    }
    this.DeclareFormalParameters(parameters);
    this.parameters_ = parent_parameters_;
  }
  ParseFormalParameter(parameters) {
    // FuncNameInferrerState fni_state(&fni_);
    this.fni_.scope_depth_++;
    let pos = this.peek_position();
    let declaration_it = this.scope_.declarations().length;
    // 解析形参
    let pattern = this.ParseBindingPattern();
    /**
     * 区分简单与复杂形参
     * 简单 (a, b) => {}
     * 复杂 ({a,b }, [c, d]) => {}
     */
    if(this.IsIdentifier(pattern)) this.ClassifyParameter(pattern, pos, this.end_position());
    else parameters.is_simple = false;

    let initializer = this.NullExpression();
    // 解析参数默认值
    if(this.Check('Token::ASSIGN')) {
      parameters.is_simple = false;
      // rest参数不能有默认值
      if(parameters.has_rest) throw new Error(kRestDefaultInitializer);

      // AcceptINScope accept_in_scope(this, true);
      initializer = this.ParseAssignmentExpression();
      this.SetFunctionNameFromIdentifierRef(initializer, pattern);
    }
    let decls = this.scope_.declarations();
    let declaration_end = decls.length;
    let initializer_end = this.end_position();
    for(; declaration_it < declaration_end; declaration_it++) {
      decls[declaration_it].var().initializer_position_ = initializer_end;
    }

    this.AddFormalParameter(parameters, pattern, initializer, this.end_position(), parameters.has_rest);
  }
  /**
   * 给形参设置默认值
   * 其中value可能是function也可能是class
   * @param {Expression*} value 值
   * @param {Expression*} identifier 键
   */
  SetFunctionNameFromIdentifierRef(value, identifier) {
    if(!identifier.IsVariableProxy()) return; 
    this.SetFunctionName(value, identifier.raw_name());
  }
  SetFunctionName(value, name, prefix = null) {
    /**
     * 匿名函数、属性简写、get/set
     */
    if(!value.IsAnonymousFunctionDefinition() &&
      !value.IsConciseMethodDefinition() &&
      !value.IsAccessorFunctionDefinition()) return;
    // 这里调用了AsFunctionLiteral方法进行了强转
    let f = value;
    // 如果是class 这里同样会调用AsClassLiteral强转
    if(value.IsClassLiteral()) f = v._constructor();
    /**
     * 到这里最终会变成一个函数字面量
     * 只有FunctionLiteral类才有set_raw_name方法
     */
    if(f !== null) {
      let cons_name = null;
      if(name !== null) {
        if(prefix !== null) cons_name = this.ast_value_factory_.NewConsString(prefix, name);
        else cons_name = this.ast_value_factory_.NewConsString(name);
      }
      f.set_raw_name(cons_name);
    }
  }
  /**
   * 添加单个形参到容器中
   * @param {ParserFormalParameters*} parameters 参数描述类
   * @param {Expression*} pattern 形参
   * @param {Expression*} initializer 参数默认值(没有就是null)
   * @param {int} initializer_end_position 位置
   * @param {bool} is_rest 由于rest只能是最后一个 所以这个直接代表当前参数是否是rest参数
   */
  AddFormalParameter(parameters, pattern, initializer, initializer_end_position, is_rest) {
    parameters.UpdateArityAndFunctionLength(initializer !== null, is_rest);
    let parameter = new Parameter(pattern, initializer, this.scanner.location().beg_pos, initializer_end_position, is_rest);
    parameters.params.push(parameter);
  }
  ClassifyParameter(parameters, begin, end) {
    if(this.IsEvalOrArguments(parameters)) throw new Error(kStrictEvalArguments);
  }
  CheckArityRestrictions(param_count, function_kind, has_rest, formals_start_pos, formals_end_pos) {
    if(this.HasCheckedSyntax()) return;
    if(IsGetterFunction(function_kind) && param_count !== 0) throw new Error(kBadGetterArity);
    else if(IsSetterFunction(function_kind)) {
      if(param_count !== 1) throw new Error(kBadSetterArity);
      if(has_rest) throw new Error(kBadSetterRestParameter);
    }
  }
  HasCheckedSyntax() {
    return this.scope_.GetDeclarationScope().has_checked_syntax_;
  }
  /**
   * 
   * @param {ParserFormalParameters*} parameters 
   */
  DeclareFormalParameters(parameters) {
    /**
     * 出现以下三种情况时该值是false
     * 1.rest参数
     * 2.默认参数
     * 3.解构参数
     */
    let is_simple = parameters.is_simple;
    let scope = parameters.scope;
    if(!is_simple) scope.MakeParametersNonSimple();
    for(let parameter of parameters.params) {
      let is_optional = parameter.initializer_ !== null;
      // 根据simple属性来决定参数
      // scope.DeclareParameter(
      //   is_simple ? parameter.name() : this.ast_value_factory_.empty_string(),
      //   is_simple ? kVar : kTemporary,
      //   is_optional, parameter.is_rest_, this.ast_value_factory_, parameter.position
      // );
    }
  }

  /**
   * 以下内容为解析函数体
   * @param {StatementListT*} body 
   * @param {Identifier} function_name 
   * @param {int} pos 
   * @param {FormalParameters} parameters 
   * @param {FunctionKind} kind 
   * @param {FunctionSyntaxKind} function_syntax_kind 
   * @param {FunctionBodyType} body_type 
   */
  ParseFunctionBody(body, function_name, pos, parameters, kind, function_syntax_kind, body_type) {
  }
 
  DeclareFunction() {

  }
}

/**
 * 缓存解析模式
 */
class ParsingModeScope {
  constructor(parser, mode) {
    this.parser_ = parser;
    this.old_mode_ = parser.mode_;
    this.parser_.mode_ = mode;
  }
}

class FormalParametersBase {
  constructor(scope) {
    this.scope = scope;
    this.has_rest = false;
    this.is_simple = true;
    this.function_length = 0;
    this.arity = 0;
  }
  /**
   * 返回形参数量 去除rest
   * 与布尔值计算会自动转换 我就不用管了
   */
  num_parameters() {
    return this.arity - this.has_rest;
  }
  /**
   * 更新函数的参数数量与length属性
   * 任何情况下arity都会增加
   * 而function.length必须满足以下条件才会增加
   * 1、该参数不存在默认值
   * 2、不是rest参数
   * 3、length、arity相等
   * 那么length的意思就是 从第一个形参开始计数 直接碰到有默认值的参数或rest
   * (a,b,c) => length => 3
   * (a,b,c = 1) => length => 2
   * (a=1,b,c) => length => 0
   * @param {bool} is_optional 当前参数是否有默认值
   * @param {bool} is_rest 是否是rest参数
   */
  UpdateArityAndFunctionLength(is_optional, is_rest) {
    if(!is_optional && !is_rest && this.function_length === this.arity) ++this.function_length;
    ++this.arity;
  }
}

class ParserFormalParameters extends FormalParametersBase {
  constructor(scope) {
    super(scope);
    this.params = [];
    this.duplicate_loc = new Location().invalid();
  }
  has_duplicate() {
    return this.duplicate_loc.IsValid();
  }
}