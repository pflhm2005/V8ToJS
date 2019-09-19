import { 
  Expression,
  AstNodeFactory,
} from '../ast/Ast';
import { DeclarationParsingResult, Declaration } from './DeclarationParsingResult';
import AstValueFactory from '../ast/AstValueFactory';
import Location from './scanner/Location';
import { 
  VariableDeclarationParsingScope,
  AccumulationScope,
} from './ExpressionScope';
import Scope, { FunctionDeclarationScope, ScriptDeclarationScope } from './Scope';

import FunctionState from './FunctionState';
import { FuncNameInferrer, State } from './FuncNameInferrer';

import ParsePropertyInfo from './ParsePropertyInfo';

import {
  kVar,
  kLet,
  kConst,

  kObjectLiteral,

  NORMAL_VARIABLE,

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
  SLOPPY_BLOCK_FUNCTION_VARIABLE,
  kShouldLazyCompile,
  _kBlock,
  FUNCTION_SCOPE,
  kParameterDeclaration,
  kAllowLabelledFunctionStatement,
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
  is_sloppy,
  is_strict,
  IsValidIdentifier,
  IsGeneratorFunction,
} from '../util';

import {
  kTooManyArguments,
  kElementAfterRest,
  kDuplicateProto,
  kInvalidCoverInitializedName,
  kMissingFunctionName,
  kStrictEvalArguments,
} from '../MessageTemplate';
import ParserFormalParameters from './function/ParserFormalParameters';

const kStatementListItem = 0;
const kStatement = 1;
const kForStatement = 2;

export default class ParserBase {
  /**
   * 来源于ParseInfo
   * @param {Zone*} zone 
   * @param {Scanner*} scanner 
   * @param {uintptr_t*} stack_limit 
   * @param {Extension*} extension 
   * @param {AstValueFactory*} ast_value_factory 
   * @param {PendingCompilationErrorHandler*} pending_error_handler 
   * @param {RuntimeCallStats*} runtime_call_stats 
   * @param {Logger*} logger 
   * @param {int} script_id 
   * @param {bool} parsing_module 
   * @param {bool} parsing_on_main_thread 
   */
  constructor(zone = null, scanner, stack_limit, extension, ast_value_factory, pending_error_handler, 
    runtime_call_stats, logger, script_id, parsing_module, parsing_on_main_thread) {
    this.scope_ = new Scope(null);
    this.original_scope_ = null;
    this.function_state_ = new FunctionState(null, this.scope_, null);
    this.extension_ = extension;

    this.fni = new FuncNameInferrer(ast_value_factory);
    this.ast_value_factory_ = ast_value_factory;
    this.ast_node_factory_ = new AstNodeFactory(ast_value_factory, null);
    this.runtime_call_stats_ = runtime_call_stats;
    this.logger_ = logger;

    this.parsing_on_main_thread_ = parsing_on_main_thread;
    this.parsing_module_ = parsing_module;
    this.stack_limit_ = stack_limit;  // 155704134568
    this.pending_error_handler_ = pending_error_handler;
    this.zone_ = zone;

    this.expression_scope_ = null;
    this.scanner_ = scanner;
    this.function_literal_id_ = 0;
    this.script_id_ = script_id;
    this.default_eager_compile_hint_ = kShouldLazyCompile;

    this.parameters_ = new ParserFormalParameters();
    this.next_arrow_function_info_ = new NextArrowFunctionInfo();
    this.accept_IN_ = true;
    
    this.allow_natives_ = false;
    this.allow_harmony_dynamic_import_ = false;
    this.allow_harmony_import_meta_ = false;
    this.allow_harmony_private_methods_ = false;
    this.allow_eval_cache_ = true;

    this.pointer_buffer_ = []; // 32
    this.variable_buffer_ = []; // 32
  }
  /**
   * 大量的工具方法
   * 已经砍掉了很多
   */
  IsLet(identifier) { return identifier === 'let'; }
  // TODO
  IsAssignableIdentifier() {}
  UNREACHABLE() {
    this.scanner_.UNREACHABLE();
  }
  /**
   * 这里的DeclarationScope存在构造函数重载 并且初始化方式不一致
   * 手动分成两个不同的子类
   */
  NewFunctionScope(kind) {
    let result = new FunctionDeclarationScope(null, this.scope_, FUNCTION_SCOPE, kind);
    this.function_state_.RecordFunctionOrEvalCall();
    if (!IsArrowFunction(kind)) result.DeclareDefaultFunctionVariables(this.ast_value_factory_);
    return result;
  }
  NewScriptScope() {
    return new ScriptDeclarationScope(null, this.ast_value_factory_);
  }
  // TODO
  NewEvalScope() {
    return null;
  }
  // TODO
  NewModuleScope() {
    return null;
  }
  ResetFunctionLiteralId() { this.function_literal_id_ = 0; }
  language_mode() { return this.scope_.language_mode(); }
  peek() {
    return this.scanner_.peek();
  }
  Next() {
    return this.scanner_.Next();
  }
  PeekAhead() {
    return this.scanner_.PeekAhead();
  }
  PeekInOrOf() {
    return this.peek() === 'Token::IN'
    //  || PeekContextualKeyword(ast_value_factory()->of_string());
  }
  position() {
    return this.scanner_.location().beg_pos;
  }
  peek_position() {
    return this.scanner_.peek_location().beg_pos;
  }
  end_position() {
    return this.scanner_.location().end_pos;
  }
  Consume(token) {
    let next = this.scanner_.Next();
    return next === token;
  }
  Check(token) {
    let next = this.scanner_.peek();
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
  ParseStatementList(body, end_token) {
    while(this.peek() === 'Token::STRING') {
      // TODO;
    }
    console.log(this.scanner_);

    while(this.peek() !== end_token) {
      let stat = this.ParseStatementListItem();
      if (stat === null) return;
      if (stat.IsEmptyStatement()) continue;
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
      case 'Token::CLASS':
        this.Consume('Token::CLASS');
        return this.ParseClassDeclaration(null, false);
      case 'Token::VAR':
      case 'Token::CONST':
        return this.ParseVariableStatement(kStatementListItem, null);
      case 'Token::LET':
        if (this.IsNextLetKeyword()) {
          return this.ParseVariableStatement(kStatementListItem, null);
        }
        break;
      case 'Token::ASYNC':
        if (this.peek() === 'Token::FUNCTION' && !this.scanner_.HasLineTerminatorBeforeNext()) {
          this.Consume('Token::ASYNC');
          return this.ParseAsyncFunctionDeclaration(null, false);
        }
        break;
      default:
        break;
    }
    return this.ParseStatement(null, null, kAllowLabelledFunctionStatement);
  }
  ParseStatement() {}

  /**
   * 解析函数声明 存在变量提升
   * 此处有函数重载 由于重载函数多处调用 这个2参调用少 改个名
   * @param {AstRawString*} names
   * @param {Boolean} default_export
   */
  _ParseHoistableDeclaration(names = null, default_export = false) {
    this.expression_scope_ = new VariableDeclarationParsingScope(this, kParameterDeclaration, names);
    this.Consume('Token::FUNCTION');
    let pos = this.position();
    let flags = kIsNormal;
    // function *fn() {}表示Generator函数
    if (this.Check('Token::MUL')) flags |= kIsGenerator;
    this.ParseHoistableDeclaration(pos, flags, names, default_export);
  }
  /**
   * 普通函数声明的格式如下(function与*字符串已经在上一个函数中被Consume了):
   * 1、'function' Identifier '(' FormalParameters ')' '{' FunctionBody '}'
   * 2、'function' '(' FormalParameters ')' '{' FunctionBody '}'
   * Generator函数声明格式如下:
   * 1、'function' '*' Identifier '(' FormalParameters ')' '{' FunctionBody '}'
   * 2、'function' '*' '(' FormalParameters ')' '{' FunctionBody '}'
   * 均分为正常与匿名 default_export负责标记这个区别
   * @param {int} pos 位置
   * @param {ParseFunctionFlags} flags 函数类型推断
   * @param {AstRawString*} names 函数名
   * @param {Boolean} default_export 
   */
  ParseHoistableDeclaration(pos, flags, names, default_export) {
    // this.CheckStackOverflow(); TODO
    if ((flags & kIsAsync) !== 0 && this.Check('Token::MUL')) flag |= kIsGenerator;

    // 函数名
    let name = null;
    let variable_name = null;
    // 函数名的严格模式检测
    let name_validity = null;
    /**
     * 匿名函数
     * 内部依然会默认设置函数名 并跳过函数名检测阶段
     * function(){}
     */
    if (this.peek() === 'Token::LPAREN') {
      if (default_export) {
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
      // 对函数名进行标识符的解析
      name = this.ParseIdentifier(this.function_state_.kind());
      name_validity = is_strict_reserved ? kFunctionNameIsStrictReserved : kFunctionNameValidityUnknown;
      // C++深拷贝跟喝水一样 这里暂时同一个引用
      variable_name = name;
    }

    /**
     * FuncNameInferrerState fni_state(&fni_);
     * 构造 => fni_(fni),top_(fni_names_stack_.size()),++fni_->scope_depth_;
     * 析构 => fni_names_stack_.resize(top_),--fni_->scope_depth_
     */
    let top_ = this.fni_.names_stack_.length;
    this.fni_.scope_depth_++;
    this.PushEnclosingName(name);
    let function_kind = this.FunctionKindFor(flags);
    /**
     * 解析函数参数与函数体 跳去parser类
     * @returns {FunctionLiteral}
     */
    let functionLiteral = this.ParseFunctionLiteral(name, this.scanner_.location(), name_validity, function_kind, pos, kDeclaration, this.language_mode(), null);

    let mode = (!this.scope_.is_declaration_scope() || this.scope_.is_module_scope()) ? kLet : kVar;
    let kind = is_sloppy(this.language_mode()) && 
    !this.scope_.is_declaration_scope() &&
    flags === kIsNormal ? SLOPPY_BLOCK_FUNCTION_VARIABLE : NORMAL_VARIABLE;
    let result = this.DeclareFunction(variable_name, functionLiteral, mode, kind, pos, this.end_position(), names);
    // 析构
    this.fni_.names_stack_.length = top_;
    --this.fni_.scope_depth_;
    return result;
  }
  ParseIdentifier(function_kind) {
    let next = this.Next();
    if (!IsValidIdentifier(next, this.language_mode(), 
    IsGeneratorFunction(function_kind), this.parsing_module_ || IsAsyncFunction(function_kind))) {
      throw new Error('UnexpectedToken');
    }
    return this.GetIdentifier();
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
  /**
   * @description 以下内容为解析函数参数
   * @param {ParserFormalParameters*} parameters 
   * @return {void}
   */
  ParseFormalParameterList(parameters) {
    /**
     * C++有很多声明但是不调用的类
     * 实际操作都在构造和析构函数中 比如这里的声明
     * 目的是缓存当前scope的parameters_ 解析完后还原 源码如下
     * ParameterParsingScope scope(impl(), parameters);
     * 构造 => parser_(parser),parent_parameters_(parser_->parent_parameters_),parser_->parameters_ = parameters
     * 析构 => parser_->parameters_ = parent_parameters_
     */
    let old_parent_parameters_ = this.parent_parameters_;
    this.parameters_ = parameters;
    /**
     * 所有可能的函数参数形式如下
     * (a, b = 1, c = function(){}, d = class {}, {e, f}, [g, h], ...i)
     */
    if (this.peek() !== 'Token::RPAREN') {
      while(true) {
        // 形参数量有限制
        if (parameters.arity + 1 > kMaxArguments) throw new Error(kTooManyParameters);
        // 检查'...'运算符
        parameters.has_rest = this.Check('Token::ELLIPSIS');
        this.ParseFormalParameter(parameters);

        if (parameters.has_rest) {
          parameters.is_simple = false;
          // function a(a, ...b,) {} 这种也是不合法的 rest后面不能加逗号
          if (this.peek() === 'Token::COMMA') throw new Error(kParamAfterRest);
          break;
        }
        // 代表解析完了
        if (!this.Check('Token::COMMA')) break;
        // 形参最后的逗号 function a(a, b,) {}
        if (this.peek() === 'Token::RPAREN') break;
      }
    }
    this.DeclareFormalParameters(parameters);
    // 析构
    this.parameters_ = old_parent_parameters_;
  }
  /**
   * @description 解析单个参数
   * @returns {void}
   */
  ParseFormalParameter(parameters) {
    // FuncNameInferrerState fni_state(&fni_);
    let top_ = this.fni_.names_stack_.length;
    this.fni_.scope_depth_++;

    let pos = this.peek_position();
    let decls = this.scope_.decls_;
    let declaration_it = decls.length;
    // 解析形参
    let pattern = this.ParseBindingPattern();
    /**
     * 区分简单与复杂形参
     * 简单 (a, b) => {}
     * 复杂 ({a,b }, [c, d]) => {}
     */
    if (this.IsIdentifier(pattern)) this.ClassifyParameter(pattern, pos, this.end_position());
    else parameters.is_simple = false;

    let initializer = null;
    // 解析参数默认值
    if (this.Check('Token::ASSIGN')) {
      parameters.is_simple = false;
      // rest参数不能有默认值
      if (parameters.has_rest) throw new Error(kRestDefaultInitializer);
      
      /**
       * AcceptINScope accept_in_scope(this, true);
       * 构造 => parser_(parser),previous_accept_IN_(parser->accept_IN_),parser_->accept_IN_ = accept_IN_
       * 析构 => parser_->accept_IN_ = previous_accept_IN_;
       */
      let previous_accept_IN_ = this.accept_IN_;
      this.accept_IN_ = true;
      initializer = this.ParseAssignmentExpression();
      /**
       * 这一步基本上不会进
       * 处理形式为function(a = function(){}, b = class c{})这样子的参数
       * 一般人不会这么设置默认值
       */
      this.SetFunctionNameFromIdentifierRef(initializer, pattern);
      // 析构
      this.accept_IN_ = previous_accept_IN_;
    }
    let declaration_end = decls.length;
    let initializer_end = this.end_position();
    for(; declaration_it < declaration_end; ++declaration_it) {
      decls[declaration_it].var().initializer_position_ = initializer_end;
    }

    this.AddFormalParameter(parameters, pattern, initializer, this.end_position(), parameters.has_rest);
    // 析构
    this.fni_.names_stack_.length = top_;
    --this.fni_.scope_depth_;
  }
  ClassifyParameter(parameters, begin, end) {
    if (this.IsEvalOrArguments(parameters)) throw new Error(kStrictEvalArguments);
  }

  ParseClassDeclaration() {}
  ParseAsyncFunctionDeclaration() {}

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
        return is_sloppy(this.language_mode());
      default:
        return false;
    }
  }
  /**
   * 处理var、let、const声明语句
   * 语句的形式应该是 (var | const | let) (Identifier) (=) (AssignmentExpression)
   * @param {VariableDeclarationContext} var_context kStatementListItem
   * @param {ZonePtrList<const AstRawString>*} names null
   */
  ParseVariableStatement(var_context, names) {
    let parsing_result = new DeclarationParsingResult();
    this.ParseVariableDeclarations(var_context, parsing_result, names);
    /**
     * 处理自动插入semicolon
     * 见ECMA-262 11.9 Automatic Semicolon Insertion
     * 简要翻译如下；
     * 在若干情况下 源代码需要自动插入分号
     */
    this.ExpectSemicolon();
    return this.BuildInitializationBlock(parsing_result);
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
     * VariableDeclarationParsingScope declaration(impl(), parsing_result->descriptor.mode, names);
     * 这一步的目的是设置parser的expression_scope_参数 设置方式十分狗
     * 在父类ExpressionScope上存在析构 截取析构相关的逻辑
     * 构造 => parent_(parser->expression_scope_),parser->expression_scope_ = this;
     * 析构 => parser_->expression_scope_ = parent_;
     * 由于初始化的东西较多 不展开了 函数结尾将此实例置null
     */
    let expression_scope_ = new VariableDeclarationParsingScope(this, parsing_result.descriptor.mode, names);
    // 获取合适的作用域
    let target_scope = IsLexicalVariableMode(parsing_result.descriptor.mode) ? this.scope_ : this.scope_.GetDeclarationScope();
    let decls = target_scope.decls_;
    let declaration_it = decls.length;

    let bindings_start = this.peek_position();
    /**
     * 可以一次性声明多个变量 循环处理
     * let a = 1, b, c;
     */
    do {
      // FuncNameInferrerState fni_state(&fni_);
      let top_ = this.fni_.names_stack_.length;
      this.fni_.scope_depth_++;

      let decl_pos = this.peek_position();
      // 变量名 => AstRawString*
      let name = null;
      // 变量的值 => Expression*
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
          pattern = null;
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

      let value = null;
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
      let declaration_end = decls.length;
      for(; declaration_it < declaration_end; declaration_it++) {
        decls[declaration_it].var().initializer_position_ = initializer_position;
      }

      let decl = new Declaration(pattern, value);
      decl.value_beg_pos = value_beg_pos;

      parsing_result.declarations.push(decl);
      
      // 析构
      this.fni_.names_stack_.length = top_;
      --this.fni_.scope_depth_;
    } while (this.Check('Token::COMMA'));

    parsing_result.bindings_loc = new Location(bindings_start, this.end_position());
    // 析构
    this.expression_scope_ = expression_scope_.parent_;
    expression_scope_ = null;
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
  // NewRawVariable(name, pos) { return this.ast_node_factory_.NewVariableProxy(name, NORMAL_VARIABLE, pos); }

  /**
   * 处理赋值表达式
   * @returns {Assignment} 返回赋值右值
   */
  ParseAssignmentExpression() {
    let expression_scope = new ExpressionParsingScope(this);
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
    if (this.peek() === 'Token:YIELD' && this.is_generator()) return this.ParseYieldExpression();
    // FuncNameInferrerState fni_state(&fni_);
    let top_ = this.fni_.names_stack_.length;
    this.fni_.scope_depth_++;
    /**
     * 解析条件表达式
     */
    let expression = this.ParseConditionalExpression();

    let op = this.peek();
    if (!IsArrowOrAssignmentOp(op)) return expression;

    // 箭头函数 V8_UNLIKELY
    if (op === 'Token::ARROW') {
      let loc = new Location(lhs_beg_pos, this.end_position());
      // if (...) return this.FailureExpression();
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

    let result = this.ast_node_factory_.NewAssignment(op, expression, right, op_position);
    // 析构
    this.fni_.names_stack_.length = top_;
    --this.fni_.scope_depth_;
    return result;
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
    if (prec < 4) throw new Error('We start using the binary expression parser for prec >= 4 only!');
    let x = this.ParseUnaryExpression();
    let prec1 = Precedence(this.peek(), this.accept_IN_);
    if (prec1 >= prec) return this.ParseBinaryContinuation(x, prec, prec1);
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
    if (!IsCountOp(this.peek()) || this.scanner_.HasLineTerminatorBeforeNext()) return expression;
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
      && !this.scanner_.HasLineTerminatorBeforeNext()
      && !this.scanner_.literal_contains_escapes()) {
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
        let value = this.scanner_.smi_value();
        return this.ast_node_factory_.NewSmiLiteral(value, pos);
      }
      case 'Token:NUMBER': {
        let value = this.scanner_.DoubleValue();
        return this.ast_node_factory_.NewNumberLiteral(value, pos);
      }
      case 'Token::BIGINT':
        return this.ast_node_factory_.NewBigIntLiteral(new AstBigInt(this.scanner_.CurrentLiteralAsCString()), pos);
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
          if (this.scanner_.current_token() === 'Token::IDENTIFIER') pos = this.position();
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
      let top_ = this.fni_.names_stack_.length;
      this.fni_.scope_depth_++;
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
      // 析构
      this.fni_.names_stack_.length = top_;
      --this.fni_.scope_depth_;
    }
    if (has_rest_property && properties.length > kMaxArguments) {
      this.expression_scope_.RecordPatternError(new Location(pos, this.position(), kTooManyArguments));
    }
    return this.InitializeObjectLiteral(this.ast_node_factory_.NewObjectLiteral(properties, number_of_boilerplate_properties, pos, has_rest_property));
  }
  ParseObjectPropertyDefinition(prop_info, has_seen_proto) {
    let name_token = this.peek();
    let next_loc = this.scanner_.peek_location();

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
        if (!prop_info.is_computed_name && this.scanner_.CurrentLiteralEquals('__proto__')) {
          if (has_seen_proto) throw new Error(kDuplicateProto);
          has_seen_proto = true;
        }
        this.Consume('Token::COLON');
        // AcceptINScope scope(this, true);
        let previous_accept_IN_ = this.accept_IN_;
        this.accept_IN_ = true;
        let value = this.ParsePossibleDestructuringSubPattern(prop_info.accumulation_scope);
        /**
         * 返回一个管理键值对的对象 标记了值的类型
         * @returns {ObjectLiteralProperty}
         */
        let result = this.ast_node_factory_.NewObjectLiteralProperty(name_expression, value, prop_info.is_computed_name);
        this.SetFunctionNameFromPropertyName(result, name);
        // 析构
        this.accept_IN_ = previous_accept_IN_;
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
        // if (IsValidIdentifier(...))
        // if (name_token === 'Token::AWAIT') {}
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
        return null;
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
      || this.scanner_.HasLineTerminatorBeforeNext()) {
        prop_info.name = this.GetIdentifier();
        this.PushLiteralName(prop_info.name);
        return this.NewStringLiteral(prop_info.name, this.position());
      }
      // V8_UNLIKELY
      if (this.scanner_.literal_contains_escapes()) throw new Error('UnexpectedToken Token::ESCAPED_KEYWORD');
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
      if (this.scanner_.literal_contains_escapes()) throw new Error('UnexpectedToken Token::ESCAPED_KEYWORD');
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
        if (prop_info.kind === kNotSet) prop_info.ParsePropertyKindFromToken(this.peek());
        prop_info.name = this.GetIdentifier();
        // V8_UNLIKELY
        if (prop_info.position === kObjectLiteral) throw new Error('UnexpectedToken Token::PRIVATE_NAME');
        // if (allow_harmony_private_methods() && )
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
        index = this.scanner_.smi_value();
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
        let previous_accept_IN_ = this.accept_IN_;
        this.accept_IN_ = true;
        /**
         * 直接走了赋值解析 我靠
         */
        let expression = this.ParseAssignmentExpression();
        this.Expect('Token::RBRACK');
        if (prop_info.kind === kNotSet) prop_info.ParsePropertyKindFromToken(this.peek());
        this.accept_IN_ = previous_accept_IN_;
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
          let previous_accept_IN_ = this.accept_IN_;
          this.accept_IN_ = true;
          let start_pos = this.peek_position();
          /**
           * TODO 不晓得这个解析什么
           */
          let expression = this.ParsePossibleDestructuringSubPattern(prop_info.accumulation_scope);
          prop_info.kind = kSpread;

          if (this.peek() !== 'Token::RBRACE') throw new Error(kElementAfterRest);
          // 析构
          this.accept_IN_ = previous_accept_IN_;
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
    if (IsAnyIdentifier(token)) {
      let name = this.ParseAndClassifyIdentifier(this.Next());
      // 严格模式禁用eval与arguments
      if (is_strict(this.language_mode()) && this.IsEvalOrArguments(name)) throw new Error(kStrictEvalArguments);
      return this.ExpressionFromIdentifier(name, beg_pos);
    }
    // CheckStackOverflow();
    if (token === 'Token::LBRACK') result = this.ParseArrayLiteral();
    else if (token === 'Token::LBRACE') result = this.ParseObjectLiteral();
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
    if (next !== token) {
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
    if (tok === 'Token::SEMICOLON') {
      this.Next();
      return;
    }
    /**
     * ;, }, EOS
     */
    if (this.scanner_.HasLineTerminatorBeforeNext() || IsAutoSemicolon(tok)) {
      return ;
    }
    throw new Error('UnexpectedToken');
  }

  FailureExpression() { throw new Error('UnexpectedExpression'); }
}

class NextArrowFunctionInfo {}