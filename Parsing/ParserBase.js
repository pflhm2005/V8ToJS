import { Expression, AstNodeFactory, _FIELD, _METHOD, _GETTER } from '../ast/Ast';
import { DeclarationParsingResult, Declaration } from './DeclarationParsingResult';
import AstValueFactory from '../ast/AstValueFactory';
import Location from './scanner/Location';
import {
  VariableDeclarationParsingScope,
  AccumulationScope,
  ExpressionParsingScope,
  ArrowHeadParsingScope,
} from './ExpressionScope';
import Scope, { FunctionDeclarationScope, ScriptDeclarationScope, ClassScope } from './Scope';

import FunctionState from './function/FunctionState';
import { ClassInfo, ForInfo, CatchInfo } from './Info';
import { FuncNameInferrer } from './function/FuncNameInferrer';

import ParsePropertyInfo from './object/ParsePropertyInfo';

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
  kAccessorOrMethod,
  kGetterFunction,
  kSetterFunction,
  GETTER,
  SETTER,
  kExpression,
  kWrapped,
  kLastLexicalVariableMode,
  BLOCK_SCOPE,
  kStrict,
  kClassLiteral,
  kClassField,
  kDerivedConstructor,
  kBaseConstructor,
  kSloppy,
  kNo,
  kParseBackgroundArrowFunctionLiteral,
  kParseArrowFunctionLiteral,
  kPreParseBackgroundArrowFunctionLiteral,
  kPreParseArrowFunctionLiteral,
  kAnonymousExpression,
  kNoDuplicateParameters,
  kBlock,
  ENUMERATE,
  ITERATE,
  SCRIPT_SCOPE,
  EVAL_SCOPE,
  MODULE_SCOPE,
  WITH_SCOPE,
  kMaybeArrowHead,
  NOT_EVAL,
  kCertainlyNotArrowHead,
  IS_POSSIBLY_EVAL,
  kHomeObjectSymbol,
  kNamedExpression,
  CATCH_SCOPE,
  kNotStatic,
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
  IsUnaryOp,
  IsResumableFunction,
  IsAsyncGeneratorFunction,
  IsDerivedConstructor,
  IsConciseMethod,
  IsCallable,
  IsAccessorFunction,
  IsClassConstructor,
  IsCompareOp,
} from '../util';

import {
  kTooManyArguments,
  kElementAfterRest,
  kDuplicateProto,
  kInvalidCoverInitializedName,
  kMissingFunctionName,
  kStrictEvalArguments,
  kDeclarationMissingInitializer,
  kInvalidDestructuringTarget,
  kInvalidPropertyBindingPattern,
  kInvalidLhsInAssignment,
  kStrictDelete,
  kUnexpectedTokenUnaryExponentiation,
  kUnexpectedStrictReserved,
  kInvalidPrivateFieldResolution,
  kIllegalLanguageModeDirective,
  kMalformedArrowFunParamList,
  kAsyncFunctionInSingleStatementContext,
  kUnexpectedLexicalDeclaration,
  kNewlineAfterThrow,
  kStrictWith,
  kMultipleDefaultsInSwitch,
  kImportCallNotNewExpression,
  kUnexpectedPrivateField,
  kImportMetaOutsideModule,
  kImportMissingSpecifier,
  kInvalidEscapedMetaProperty,
  kUnterminatedTemplateExpr,
  kNoCatchOrFinally,
  kConstructorIsPrivate,
  kStaticPrototype,
  kDuplicateConstructor,
} from '../MessageTemplate';
import ParserFormalParameters from './function/ParserFormalParameters';
import NextArrowFunctionInfo from './function/NextArrowFunctionInfo';

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
    this.function_state_ = null;
    this.extension_ = extension;

    this.fni_ = new FuncNameInferrer(ast_value_factory);
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

    /**
     * 下面4个都是实验属性 分别是
     * native code、动态import、new import xxx、class内部使用#开头的属性(被认定是private method)
     */
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
  RaiseLanguageMode(mode) {
    let old = this.scope_.language_mode();
    this.SetLanguageMode(this.scope_, old > mode ? old : mode);
  }
  IsLet(identifier) { return identifier === 'let'; }
  IsAssignableIdentifier(expression) {
    if (!this.IsIdentifier(expression)) return false;
    if (is_strict(this.language_mode()) && this.IsEvalOrArguments(expression)) return false;
    return true;
  }
  is_async_generator() { return IsAsyncGeneratorFunction(this.function_state_.kind()); }
  is_async_function() { return IsAsyncFunction(this.function_state_.kind()); }
  is_generator() { return IsGeneratorFunction(this.function_state_.kind()); }
  UNREACHABLE() { this.scanner_.UNREACHABLE(); }

  NewScope(scope_type) {
    return this.NewScopeWithParent(this.scope_, scope_type);
  }
  NewScopeWithParent(parent, scope_type) {
    return new Scope(null, parent, scope_type);
  }
  /**
   * 这里的DeclarationScope存在构造函数重载 并且初始化方式不一致
   * 差距过大 手动分成两个不同的子类
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
  NewClassScope(parent, is_anonymous) {
    return new ClassScope(null, parent, is_anonymous);
  }
  NewEvalScope(parent) {
    return new DeclarationScope(null, parent, EVAL_SCOPE);
  }
  NewModuleScope(parent) {
    return new ModuleScope(parent, this.ast_value_factory_);
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
  /**
   * 由于of不是关键词 没有对应Token
   * 但是存在for ... of的新语法 这里就需要特殊处理一下
   * for关键词会将语句类型设置为ForStatement 此时的of有特殊意义
   */
  PeekInOrOf() {
    return this.peek() === 'Token::IN'
      || this.PeekContextualKeyword(this.ast_value_factory_.of_string());
  }
  CheckContextualKeyword(name) {
    if (this.PeekContextualKeyword(name)) {
      this.Consume('Token::IDENTIFIER');
      return true;
    }
    return false;
  }
  PeekContextualKeyword(name) {
    return this.peek() === 'Token::IDENTIFIER' &&
      !this.scanner_.next_literal_contains_escapes() &&
      this.scanner_.NextSymbol(this.ast_value_factory_).literal_bytes_ === name;
  }

  peek_any_identifier() {
    return IsAnyIdentifier(this.peek());
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
   * 包含use strict、use asm的解析
   * 没有的话进入语法树parse
   */
  ParseStatementList(body, end_token) {
    while (this.peek() === 'Token::STRING') {
      let use_strict = false;
      let use_asm = false;

      if (this.scanner_.NextLiteralExactlyEquals('use strict')) {
        use_strict = true;
      } else if (this.scanner_.NextLiteralExactlyEquals('use asm')) {
        use_asm = true;
      }
      // 解析对应的'use'标记
      let stat = this.ParseStatementListItem();
      if (stat === null) return;

      body.push(stat);
      // 一般不会进这里吧 毕竟前面严格校验了
      if (!this.IsStringLiteral(stat)) break;

      if (use_strict) {
        this.RaiseLanguageMode(kStrict);
        // 非简单参数的函数不允许手动注明为严格模式
        // function fn(a=1) {'use strict'}
        if (!this.scope_.HasSimpleParameters()) throw new Error(kIllegalLanguageModeDirective);
      } else if (use_asm) {
        this.SetAsmModule();
      } else {
        this.RaiseLanguageMode(kSloppy);
      }
    }

    // TargetScopeT target_scope(this);
    let previous_ = this.target_stack_;
    this.target_stack_ = null;
    while (this.peek() !== end_token) {
      let stat = this.ParseStatementListItem();
      if (stat === null) return;
      // if (stat.IsEmptyStatement()) continue;
      body.push(stat);
    }
    // 析构
    this.target_stack_ = previous_;
  }
  /**
   * 一级解析
   * 处理function、class、var、let、const、async声明语句
   * @returns {Statement}
   */
  ParseStatementListItem() {
    switch (this.peek()) {
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
    switch (next_next) {
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
   * 二级解析
   * 处理各类普通语句
   * 1. 块级作用域 {}
   * 2. 变量语句
   * 3. 空语句
   * 4. 表达式语句 1+2;
   * 5. if语句
   * 6. 迭代语句
   * 7. continue语句
   * 8. break语句
   * 9. return语句
   * 10. with语句
   * 11. label语句(goto)
   * 12. switch语句
   * 13. throw语句
   * 14. try语句
   * 15. debugger语句
   */
  ParseStatement(labels, own_labels, allow_function) {
    switch (this.peek()) {
      case 'Token::LBRACE':
        return this.ParseBlock(labels);
      case 'Token::SEMICOLON':
        this.Next();
        return this.ast_node_factory_.empty_statement_;
      case 'Token::IF':
        return this.ParseIfStatement(labels);
      case 'Token::DO':
        return this.ParseDoWhileStatement(labels, own_labels);
      case 'Token::WHILE':
        return this.ParseWhileStatement(labels, own_labels);
      case 'Token::FOR':
        // V8_UNLIKELY
        if (this.is_async_function() && this.PeekAhead() === 'Token::AWAIT') {
          return this.ParseForAwaitStatement(labels, own_labels);
        }
        return this.ParseForStatement(labels, own_labels);
      case 'Token::CONTINUE':
        return this.ParseContinueStatement();
      case 'Token::BREAK':
        return this.ParseBreakStatement(labels);
      case 'Token::RETURN':
        return this.ParseReturnStatement();
      case 'Token::THROW':
        return this.ParseThrowStatement();
      case 'Token::TRY': {
        if (labels === null) return this.ParseTryStatement();
        let statements = [];
        let result = this.ast_node_factory_.NewBlock(false, labels);
        // TargetT target(this, result);
        statement = this.ParseTryStatement();
        statements.push(statement);
        result.statement_ = statements;
        return result;
      }
      case 'Token::WITH':
        return this.ParseWithStatement(labels);
      case 'Token::SWITCH':
        return this.ParseSwitchStatement(labels);
      case 'Token::FUNCTION':
        throw new Error('UnexpectedToken');
      case 'Token::DEBUGGER':
        return this.ParseDebuggerStatement();
      case 'Token::VAR':
        return this.ParseVariableStatement(kStatement, null);
      case 'Token::ASYNC':
        throw new Error(kAsyncFunctionInSingleStatementContext);
      default:
        return this.ParseExpressionOrLabelledStatement(labels, own_labels, allow_function);
    }
  }
  /**
   * 直接的表达式
   * 比如说v8案例的 'Hello' + 'World'
   */
  ParseExpressionOrLabelledStatement(labels, own_labels, allow_function) {
    let pos = this.peek_position();
    switch (this.peek()) {
      case 'Token::FUNCTION':
      case 'Token::LBRACE':
        this.UNREACHABLE();
      case 'Token::CLASS':
        throw new Error('UnexpectedToken');
      case 'Token::LET': {
        let next_next = this.PeekAhead();
        /**
         * let后面跟着[、{代表解构 不应该出现在这里
         * 然而，ASI may insert a line break before an identifier or a brace.
         */
        if (next_next !== 'Token::LBRACK' &&
          ((next_next !== 'Token::LBRACE' && next_next !== 'Token::IDENTIFIER') ||
            this.scanner_.HasLineTerminatorAfterNext())) {
          break;
        }
        throw new Error(kUnexpectedLexicalDeclaration);
      }
      default:
        break;
    }

    let starts_with_identifier = this.peek_any_identifier();
    // 解析普通表达式
    let expr = this.ParseExpression();
    // labels表达式 即tag: ... break tag;
    if (this.peek() === 'Token::COLON' && starts_with_identifier && this.IsIdentifier(expr)) {
      this.DeclareLabel(labels, own_labels, expr);
      this.Consume('Token::COLON');
      if (this.peek() === 'Token::FUNCTION' && is_sloppy(this.language_mode()) &&
        allow_function === kAllowLabelledFunctionStatement) {
        return this.ParseFunctionDeclaration();
      }
      return this.ParseStatement(labels, own_labels, allow_function);
    }

    // 扩展情况下接受native函数
    // native函数以native function开头
    if (this.extension_ !== null && this.peek() === 'Token::FUNCTION' &&
      !this.scanner_.HasLineTerminatorBeforeNext() && this.IsNative(expr) &&
      !this.scanner_.literal_contains_escapes()) {
      return this.ParseNativeDeclaration();
    }

    this.ExpectSemicolon();
    if (expr === null) return null;
    return this.ast_node_factory_.NewExpressionStatement(expr, pos);
  }

  /**
   * @description function fn() {}
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
    return this.ParseHoistableDeclaration(pos, flags, names, default_export);
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
    // this.CheckStackOverflow();
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
    let functionLiteral = this.ParseFunctionLiteral(name, this.scanner_.location(), name_validity,
      function_kind, pos, kDeclaration, this.language_mode(), null);

    let mode = (!this.scope_.is_declaration_scope_ || this.scope_.is_module_scope()) ? kLet : kVar;
    let kind = is_sloppy(this.language_mode()) &&
      !this.scope_.is_declaration_scope_ &&
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
  ParseNonRestrictedIdentifier() {
    let result = this.ParseIdentifier();
    if (is_strict(this.language_mode()) && this.IsEvalOrArguments(result)) {
      throw new Error(kStrictEvalArguments);
    }
    return result;
  }
  MethodKindFor(flags) {
    return this.FunctionKindForImpl(1, flags);
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
   * 解析函数参数 主要就是以逗号作为分割 处理每一个形参
   * 形参类型主要有以下几种
   * 1. 单标识符 => (a, b) => 标记为简单参数
   * 2. 解构对象、数组 => ({a}, [b]) => 标记为复杂参数
   * 3. rest参数 => (...args) => 标记为复杂参数
   * 4. 有默认值的形参 => (a = 1) => 标记为复杂参数
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
      while (true) {
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
    if (this.IsIdentifier(pattern)) {
      this.ClassifyParameter(pattern, pos, this.end_position());
    }
    else {
      parameters.is_simple = false;
    }

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
    for (; declaration_it < declaration_end; ++declaration_it) {
      decls[declaration_it].var_.initializer_position_ = initializer_end;
    }

    this.AddFormalParameter(parameters, pattern, initializer, this.end_position(), parameters.has_rest);
    // 析构
    this.fni_.names_stack_.length = top_;
    --this.fni_.scope_depth_;
  }
  ClassifyParameter(parameters) {
    if (this.IsEvalOrArguments(parameters)) throw new Error(kStrictEvalArguments);
  }
  /**=
   * 解析函数体 主要步骤如下
   * 1. 判断函数类型是否是function*这种需要保留状态的
   * 注: 内部生成了一个名为.generator_object特殊对象来处理函数状态
   * 2. 检查函数参数是否是复杂类型(带有解构、...rest) 
   * 注: 复杂类型存在变量的赋值操作 需要一个额外的作用域
   * 3. 函数表达式先走赋值逻辑 函数声明直接重新走最外层的语句解析逻辑
   * 4. 解析完函数体后 如果参数是简单类型 直接走变量提升逻辑
   * 注: 变量提升的实质是在外部作用域的变量表中声明一个新变量 变量名是函数名 值是函数
   * 有两种情况在变量提升中处理
   * (1) 形参与函数名相同 function fn(fn) { call(fn) }; 此时形参覆盖函数名
   * (2) 存在var类型的声明(实际上也包括let、const 不过会报错) var fn = 1;function fn(){} 此时函数声明无效
   * 5. 复杂形参
   * 6. 检查是否有重复形参 严格模式会报错
   * 7. 非箭头函数会在变量表声明一个名为arguments变量 如果该变量已经被声明 则跳过这步
   * 8. 合并内外作用域的变量表
   * @param {StatementListT*} body pointer_buffer_
   * @param {Identifier} function_name 函数名
   * @param {int} pos 位置
   * @param {FormalParameters} parameters 函数参数
   * @param {FunctionKind} kind 函数类型 箭头函数、async等等
   * @param {FunctionSyntaxKind} function_type 函数声明类型 匿名函数、具名函数、函数表达式
   * @param {FunctionBodyType} body_type 函数体类型 单表达式还是作用域 适用于箭头函数
   */
  ParseFunctionBody(body, function_name, pos, parameters, kind, function_type, body_type) {
    // FunctionBodyParsingScope body_parsing_scope(impl());
    // 新的函数作用域
    let expression_scope_ = this.expression_scope_;
    this.expression_scope_ = null;

    // 可恢复函数 => function*这种特殊函数
    // 只是生成一个特殊的临时变量
    if (IsResumableFunction(kind)) this.PrepareGeneratorVariables();
    let function_scope = parameters.scope;
    let inner_scope = function_scope;
    /**
     * 复杂参数
     * 1. 解构 => function fn({a}, [b]) {}
     * 2. rest =>  function fn(...rest) {}
     * 3. 默认参数 => function(a = 1) {}
     * 这里为函数参数创建一个新的作用域与语句块
     * V8_UNLIKELY
     */
    if (!parameters.is_simple) {
      let init_block = this.BuildParameterInitializationBlock(parameters);
      // async
      if (IsAsyncFunction(kind) && !IsAsyncGeneratorFunction(kind)) {
        init_block = this.BuildRejectPromiseOnException(init_block);
      }
      body.push(init_block);

      inner_scope = this.NewVarblockScope();
      inner_scope.start_position_ = this.scanner_.location().beg_pos;
    }
    // StatementListT inner_body(pointer_buffer());
    // 这里再次调用了ScopePtrList 需要从上一个list来做slice
    let inner_body = [];
    {
      // BlockState block_state(&scope_, inner_scope);
      // 缓存当前作用域
      let outer_scope_ = this.scope_;
      this.scope_ = inner_scope;
      if (body_type === kExpression) {
        let expression = this.ParseAssignmentExpression();
        if (IsAsyncFunction(kind)) {
          let block = this.ast_node_factory_.NewBlock(true);
          this.RewriteAsyncFunctionBody(inner_body, block, expression);
        } else {
          // 根据函数类型快速确定返回类型
          inner_body.push(this.BuildReturnStatement(expression, expression.position_));
        }
      } else {
        // kWrapped是针对整个作用域的 一般情况是右大括号代表函数结束
        let closing_token = function_type === kWrapped ? 'Token::EOS' : 'Token::RBRACE';
        if (IsAsyncGeneratorFunction(kind)) this.ParseAndRewriteAsyncGeneratorFunctionBody(pos, kind, inner_body);
        else if (IsGeneratorFunction(kind)) this.ParseAndRewriteGeneratorFunctionBody(pos, kind, inner_body);
        else if (IsAsyncFunction(kind)) this.ParseAsyncFunctionBody(inner_scope, inner_body);
        // 正常的函数走原始解析 只是会带入新的body 结束标记变成了右大括号
        else this.ParseStatementList(inner_body, closing_token);
        // 处理构造函数 
        if (IsDerivedConstructor(kind)) {
          // ExpressionParsingScope expression_scope(impl());
          let expression_scope_ = new ExpressionParsingScope(this);
          inner_body.push(this.ast_node_factory_.NewReturnStatement(this.ThisExpression(), kNoSourcePosition));
          // expression_scope_.ValidateExpression();
          // 析构
          this.expression_scope_ = expression_scope_.parent_;
          expression_scope_ = null;
        }
        this.Expect(closing_token);
      }
      // 析构
      this.scope_ = outer_scope_;
    }

    this.scope_.end_position_ = this.end_position();
    let allow_duplicate_parameters = false;
    // CheckConflictingVarDeclarations(inner_scope);

    // V8_LIKELY
    /**
     * 分为简单参数与复杂参数两种情况
     * 简单参数处理十分简单 仅仅进行变量提升
     * 变量提升的实际上是将函数名作为变量插入到外部作用域的变量池中
     */
    if (parameters.is_simple) {
      if (is_sloppy(function_scope.language_mode())) this.InsertSloppyBlockFunctionVarBindings(function_scope);
      // 严格模式下不支持重复形参
      allow_duplicate_parameters = is_sloppy(function_scope.language_mode()) && !IsConciseMethod(kind);
    } else {
      this.SetLanguageMode(function_scope, inner_scope.language_mode());
      if (is_sloppy(inner_scope.language_mode())) this.InsertSloppyBlockFunctionVarBindings(inner_scope);

      inner_scope.end_position_ = this.end_position();
      /**
       * 处理作用域
       * 没有用的作用域会被直接优化
       */
      if (inner_scope.FinalizeBlockScope() !== null) {
        let inner_block = this.ast_node_factory_.NewBlock(true, inner_body);
        // inner_body.Rewind();
        inner_body.push(inner_block);
        inner_block.scope_ = inner_scope;
        if (!this.HasCheckedSyntax()) {
          let conflict = inner_scope.FindVariableDeclaredIn(function_scope, kLastLexicalVariableMode);
          if (conflict !== null) this.ReportVarRedeclarationIn(conflict, inner_scope);
        }
        this.InsertShadowingVarBindingInitializers(inner_block);
      }
    }
    // 检测形参重复 => function fn(a, a){'use strict'}会报错
    this.ValidateFormalParameters(this.language_mode(), parameters, allow_duplicate_parameters);
    // 箭头函数没有argument
    if (!IsArrowFunction(kind)) function_scope.DeclareArguments(this.ast_value_factory_);
    // 函数表达式才会进
    this.DeclareFunctionNameVar(function_name, function_type, function_scope);
    // 合并作用域

    body.push(...inner_body);

    // 析构
    this.expression_scope_ = expression_scope_;
  }
  NewVarblockScope() {
    return new FunctionDeclarationScope(null, this.scope_, BLOCK_SCOPE);
  }
  BuildReturnStatement(expr, pos, end_pos = kNoSourcePosition) {
    if (expr === null) expr = this.ast_node_factory_.NewUndefinedLiteral(kNoSourcePosition);
    else if (this.is_async_generator()) {
      expr = this.ast_node_factory_.NewAwait(expr, kNoSourcePosition);
      this.function_state_.suspend_count_++;
    }
    if (this.is_async_function()) return this.ast_node_factory_.NewAsyncReturnStatement(expr, pos, end_pos);
    return this.ast_node_factory_.NewReturnStatement(expr, pos, end_pos);
  }
  ValidateFormalParameters(language_mode, parameters, allow_duplicates) {
    if (!allow_duplicates) parameters.ValidateDuplicate(this);
    // if(is_strict(language_mode)) parameters.ValidateStrictMode(this);
  }

  CheckFunctionName(language_mode, function_name, function_name_validity, function_name_loc) {
    if (function_name === null) return;
    if (function_name_validity === kSkipFunctionNameCheck) return;
    if (is_sloppy(language_mode)) return;

    if (this.IsEvalOrArguments(function_name)) throw new Error(kStrictEvalArguments);
    if (function_name_validity === kFunctionNameIsStrictReserved) throw new Error(kUnexpectedStrictReserved);
  }

  /**
   * 解析箭头函数函数体
   * @param {ParserFormalParameters} formal_parameters 形参描述类
   */
  ParseArrowFunctionLiteral(formal_parameters) {
    // const counters = [
    //   [kParseBackgroundArrowFunctionLiteral, kParseArrowFunctionLiteral],
    //   [kPreParseBackgroundArrowFunctionLiteral, kPreParseArrowFunctionLiteral]
    // ];
    // RuntimeCallTimerScope runtime_timer(runtime_call_stats_, counters[Impl::IsPreParser()][parsing_on_main_thread_]);

    // 这里有问题
    // if(!this.HasCheckedSyntax() && this.scanner_.HasLineTerminatorBeforeNext()) {
    //   throw new Error('UnexpectedToken "=>"');
    // }

    let expected_property_count = 0;
    let suspend_count = 0;
    let function_literal_id = this.GetNextFunctionLiteralId();

    let kind = formal_parameters.scope.function_kind_;
    let eager_compile_hint = this.default_eager_compile_hint_;
    let can_preparse = this.parse_lazily() && eager_compile_hint === kShouldLazyCompile;

    let is_lazy_top_level_function = can_preparse && this.AllowsLazyParsingWithoutUnresolvedVariables();
    // 标记有函数体没有大括号
    let has_braces = true;
    let produced_preparse_data = Object.create(null);
    let body = [];
    {
      // FunctionState function_state(&function_state_, &scope_, formal_parameters.scope);
      let outer_scope_ = formal_parameters.scope;
      let function_state = new FunctionState(this.function_state_, this.scope_, outer_scope_);
      this.Consume('Token::ARROW');
      // 有大括号的函数体
      if (this.peek() === 'Token::LBRACE') {
        if (is_lazy_top_level_function) {
          // 复杂参数需要一个作用域
          if (!formal_parameters.is_simple) {
            this.BuildParameterInitializationBlock(formal_parameters);
          }

          // 箭头函数不用恢复函数状态(即没有generator)
          let result = this.SkipFunction(
            null, kind, kAnonymousExpression, formal_parameters.scope,
            -1, -1, produced_preparse_data);

          // produced_preparse_data = result.produced_preparse_data;

          if (result.did_preparse_successfully) {
            this.ValidateFormalParameters(this.language_mode(), formal_parameters, false);
          } else {
            // BlockState block_state(&scope_, scope()->outer_scope());
            let outer_scope_ = this.scope_;
            this.scope_ = this.scope_.outer_scope_;

            let expression = this.ParseConditionalExpression();

            let function_scope = this.next_arrow_function_info_.scope;
            new FunctionState(this.function_state_, this.scope_, function_scope);

            let loc = new Location(function_scope.start_position_, this.end_position());
            let parameters = new ParserFormalParameters(function_scope);
            parameters.is_simple = function_scope.has_simple_parameters_;
            this.DeclareArrowFunctionFormalParameters(parameters, expression, loc);
            this.next_arrow_function_info_.Reset();

            this.Consume('Token::ARROW');
            this.Consume('Token::LBRACE');

            // AcceptINScope scope(this, true);
            let previous_accept_IN_ = this.accept_IN_;
            this.accept_IN_ = true;
            this.ParseFunctionBody(body, null, kNoSourcePosition, parameters,
              kind, kAnonymousExpression, kBlock);

            // 析构
            this.scope_ = outer_scope_;
            this.accept_IN_ = previous_accept_IN_;
          }
        } else {
          this.Consume('Token::LBRACE');
          // AcceptINScope scope(this, true);
          let previous_accept_IN_ = this.accept_IN_;
          this.accept_IN_ = true;
          this.ParseFunctionBody(body, null, kNoSourcePosition,
            formal_parameters, kind, kAnonymousExpression, kBlock);
          expected_property_count = function_state.expected_property_count_;
          // 析构
          this.accept_IN_ = previous_accept_IN_;
        }
      }
      // 没有大括号 直接代表返回值
      else {
        has_braces = false;
        this.ParseFunctionBody(body, null, kNoSourcePosition,
          formal_parameters, kind, kAnonymousExpression, kExpression);
        expected_property_count = function_state.expected_property_count_;
      }

      formal_parameters.scope.end_position_ = this.end_position();

      // if(is_strict(this.language_mode())) {} 略
      suspend_count = function_state.suspend_count_;
      // 析构
      this.scope_ = outer_scope_;
    }

    let function_literal = this.ast_node_factory_.NewFunctionLiteral(
      this.EmptyIdentifierString(), formal_parameters.scope, body, expected_property_count,
      formal_parameters.num_parameters(), formal_parameters.function_length, kNoDuplicateParameters,
      kAnonymousExpression, eager_compile_hint, formal_parameters.scope.start_position_,
      has_braces, function_literal_id, produced_preparse_data);

    function_literal.suspend_count_ = suspend_count;
    function_literal.function_token_position_ = formal_parameters.scope.start_position_;

    // this.RecordFunctionLiteralSourceRange(function_literal);
    this.AddFunctionForNameInference(function_literal);

    return function_literal;
  }

  /**
   * @description 解析class声明
   * 'class' Identifier ('extends' LeftHandExpression)? '{' ClassBody '}'
   * 'class' ('extends' LeftHandExpression)? '{' ClassBody '}'
   * 
   * @param names 类名
   * @param default_export export default类型声明
   */
  ParseClassDeclaration(names, default_export) {
    let class_token_pos = this.position();
    let is_strict_reserved = IsStrictReservedWord(this.peek());
    // nullptr
    let name = null
    let variable_name = null
    /**
     * 表达式
     */
    if (default_export && (this.peek() === 'Token::EXTENDS' || this.peek() === 'Token::LBRACE')) {
      // this.GetDefaultStrings(name, variable_name);
      name = this.ast_value_factory_.default_string();
      variable_name = this.ast_value_factory_.dot_default_string();
    }
    /**
     * 声明
     */
    else {
      name = this.ParseIdentifier();
      variable_name = name;
    }

    /**
     * ExpressionParsingScope no_expression_scope(impl());
     */
    let no_expression_scope = new ExpressionParsingScope(this);
    // 解析class体
    let value = this.ParseClassLiteral(name, this.scanner_.location(), is_strict_reserved, class_token_pos);
    // no_expression_scope.ValidateExpression();
    let end_pos = this.position();
    let result = this.DeclareClass(variable_name, value, names, class_token_pos, end_pos);
    // 析构
    this.expression_scope_ = no_expression_scope.parent_;
    no_expression_scope = null;
    return result;
  }
  /**
   * 进行class字面量解析
   * 1、判断类名是否合法
   * 2、将作用域提升为严格模式
   * 3、生成一个class描述类 将类名作为变量插入作用域变量池
   * 4、检查extends关键词 处理继承
   * 注: class声明不存在变量提升 可以直接从变量池中找到extends后面的标识符 然后挂到class_info上
   * 5、以左右大括号为界 解析class体
   * 注: 解析方式参考对象字面量 class的原型方法与对象简写一致
   * 6、处理私有变量(此处存疑 #开头的标识符代表私有变量 但是目前浏览器上似乎不支持)
   * @param {IdentifierT} name 类名 如果是匿名class 该值为null
   * @param {Location} class_name_location 类名位置 用来报错的
   * @param {bool} name_is_strict_reserved 类名是否是严格模式下的保留词
   * @param {int} class_token_pos 整个class开始的位置
   */
  ParseClassLiteral(name, class_name_location, name_is_strict_reserved, class_token_pos) {
    // 匿名class export default class {}
    let is_anonymous = name === null;
    // class内部默认严格模式
    if (!this.HasCheckedSyntax() && !is_anonymous) {
      if (name_is_strict_reserved) throw new Error(kUnexpectedStrictReserved);
      if (this.IsEvalOrArguments(name)) throw new Error(kStrictEvalArguments);
    }

    let class_scope = this.NewClassScope(this.scope_, is_anonymous);
    // BlockState block_state(&scope_, class_scope);
    let outer_scope_ = this.scope_;
    this.scope_ = class_scope;
    this.RaiseLanguageMode(kStrict);

    let class_info = new ClassInfo();
    class_info.is_anonymous = is_anonymous;

    this.scope_.set_start_position(this.end_position());
    if (this.Check('Token::EXTENDS')) {
      // FuncNameInferrerState fni_state(&fni_);
      let top_ = this.fni_.names_stack_.length;
      this.fni_.scope_depth_++;
      // ExpressionParsingScope scope(impl());
      let scope = new ExpressionParsingScope(this);
      /**
       * 由于class声明不存在变量提升 所以这里直接开始左值解析
       * 下一个Token必定是标识符 然后从变量池中找对应的值 如果没有会直接报错
       */
      class_info.extends = this.ParseLeftHandSideExpression();
      // scope.ValidateExpression();

      // 析构
      this.fni_.names_stack_.length = top_;
      --this.fni_.scope_depth_;
      this.expression_scope_ = scope.parent_;
    }

    this.Expect('Token::LBRACE');

    let has_extends = !class_info.extends === null;
    /**
     * 解析class内部结构
     * static? identifier () {}
     */
    while (this.peek() !== 'Token::RBRACE') {
      // 由此看来 class内部加分号确实没什么卵用 白糟蹋一轮循环
      if (this.Check('Token::SEMICOLON')) continue;
      // FuncNameInferrerState fni_state(&fni_);
      let top_ = this.fni_.names_stack_.length;
      this.fni_.scope_depth_++;
      // If we haven't seen the constructor yet, it potentially is the next property.
      // 如果没看到构造函数 那么下一个可能就是(这个注释也太有意思了)
      let is_constructor = !class_info.has_seen_constructor;
      // 这个属性同样应用于对象字面量(倒不如说这里借用了对象字面量的方法?)
      let prop_info = new ParsePropertyInfo();
      prop_info.position = kClassLiteral;
      // 解析class内部的每一个属性定义
      let property = this.ParseClassPropertyDefinition(class_info, prop_info, has_extends);
      let property_kind = this.ClassPropertyKindFor(prop_info.kind);
      if (!class_info.has_static_computed_names && prop_info.is_static && prop_info.is_computed_name) {
        class_info.has_static_computed_names = true;
      }
      // 就不能正常的赋值吗
      is_constructor &= class_info.has_seen_constructor;

      let is_field = property_kind === _FIELD;
      // V8_UNLIKELY
      if (prop_info.is_private) {
        class_info.requires_brand |= (!is_field && !prop_info.is_static);
        class_info.has_private_methods |= property_kind === _METHOD;
        this.DeclarePrivateClassMember(class_scope, prop_info.name, property,
          property_kind, prop_info.is_static, class_info);
        this.InferFunctionName();
        continue;
      }
      // V8_UNLIKELY
      if (is_field) {
        if (prop_info.is_computed_name) class_info.computed_field_count++;
        this.DeclarePublicClassField(class_scope, property, prop_info.is_static, prop_info.is_computed_name, class_info);
        this.InferFunctionName();
        continue;
      }

      this.DeclarePublicClassMethod(name, property, is_constructor, class_info);
      this.InferFunctionName();

      // 析构
      this.fni_.names_stack_.length = top_;
      --this.fni_.scope_depth_;
    }

    this.Expect('Token::RBRACE');
    let end_pos = this.end_position();
    class_scope.end_position_ = end_pos;

    // let unresolvable = class_scope.ResolvePrivateNamesPartially();
    // if (unresolvable !== null) throw new Error(kInvalidPrivateFieldResolution);
    if (class_info.requires_brand) {
      class_scope.DeclareBrandVariable(this.ast_value_factory_, kNotStatic, kNoSourcePosition);
    }

    let should_save_class_variable_index = class_scope.should_save_class_variable_index();
    if (!is_anonymous || should_save_class_variable_index) {
      this.DeclareClassVariable(class_scope, name, class_info, class_token_pos);
    }
    if (should_save_class_variable_index) {
      class_info.class_variable_.set_is_used();
      class_info.class_variable_.ForceContextAllocation();
    }

    let result = this.RewriteClassLiteral(class_scope, name, class_info, class_token_pos, end_pos);
    // 析构
    this.scope_ = outer_scope_;
    return result;
  }
  /**
   * 该方法解析类内部的方法 过程如下
   * 1. 判断static关键词
   * 注: 
   * 2. 按照对象简写方法的模式解析class的原型方法
   * @param {*} class_info 类描述
   * @param {*} prop_info 属性描述 class、object通用
   * @param {*} has_extends 继承标记
   */
  ParseClassPropertyDefinition(class_info, prop_info, has_extends) {
    let name_token = this.peek();
    // 这里的两个pos是为了分辨static属性与普通属性
    let property_beg_pos = this.scanner_.peek_location().beg_pos;
    // 这个是属性名Token的位置 默认与name_expression一致 如果碰到static会改变
    let name_token_position = property_beg_pos;
    let name_expression = null;
    // 静态属性
    if (name_token === 'Token::STATIC') {
      this.Consume('Token::STATIC');
      name_token_position = this.scanner_.peek_location().beg_pos;
      // { static (a) {} } 一个毫无意义的括号
      if (this.peek() === 'Token::LPAREN') {
        prop_info.kind = kMethod;
        prop_info.name = this.GetIdentifier();
        name_expression = this.ast_node_factory_.NewStringLiteral(prop_info.name, this.position());
      }
      /**
       * 这里的三个Token分别是=、;、} 但是static =、static ;、static }都不可能是正常语法
       * 如果进到这里是什么奇怪情况？？？？这他妈不直接报错
       * 我错了 一定要用最新的node版本测试代码 V8在某个版本新增了ClassField语法 上述情况分别对应于
       * { static = 1; }、{ static; }、{ static }
       * 都是比较无意义的情况 static此刻作为标识符 但是确实合法
       */
      else if (this.peek() === 'Token::ASSIGN' || this.peek() === 'Token::SEMICOLON' || this.peek() === 'Token::RBRACE') {
        prop_info.name = this.GetIdentifier();
        name_expression = this.ast_node_factory_.NewStringLiteral(prop_info.name, this.position());
      }
      // 这里是最常见的static声明 
      else {
        prop_info.is_static = true;
        name_expression = this.ParseProperty(prop_info);
      }
    }
    // 普通属性
    else {
      name_expression = this.ParseProperty(prop_info);
    }

    if (!class_info.has_name_static_property && prop_info.is_static && this.IsName(prop_info.name)) {
      class_info.has_name_static_property = true;
    }

    switch (prop_info.kind) {
      /**
       * 处理类域
       * 即a = 1;这种声明
       */
      case kAssign:
      case kClassField:
      case kShorthandOrClassField:
      case kNotSet: {
        prop_info.kind = kClassField;
        if (!prop_info.is_computed_name) this.CheckClassFieldName(prop_info.name, prop_info.is_static);
        let initializer = this.ParseMemberInitializer(class_info, property_beg_pos, prop_info.is_static);
        this.ExpectSemicolon();

        let result = this.ast_node_factory_.NewClassLiteralProperty(name_expression, initializer, _FIELD,
          prop_info.is_static, prop_info.is_computed_name, prop_info.is_private);
        this.SetFunctionNameFromClassPropertyName(result, prop_info.name);
        return result;
      }
      // 普通方法
      case kMethod: {
        if (!prop_info.is_computed_name) {
          this.CheckClassMethodName(prop_info.name, kMethod,
            prop_info.function_flags, prop_info.is_static, class_info);
        }
        let kind = this.MethodKindFor(prop_info.function_flags);
        // static constructor属于普通的静态属性声明
        if (!prop_info.is_static && this.IsConstructor(prop_info.name)) {
          class_info.has_seen_constructor = true;
          kind = has_extends ? kDerivedConstructor : kBaseConstructor;
        }
        let value = this.ParseFunctionLiteral(prop_info.name, this.scanner_.location(), kSkipFunctionNameCheck, kind,
          name_token_position, kAccessorOrMethod, this.language_mode(), null);
        let result = this.ast_node_factory_.NewClassLiteralProperty(name_expression, value, _METHOD,
          prop_info.is_static, prop_info.is_computed_name, prop_info.is_private);
        this.SetFunctionNameFromClassPropertyName(result, prop_info.name);
        return result;
      }
      case kAccessorGetter:
      case kAccessorSetter: {
        let is_get = prop_info.kind === kAccessorGetter;
        if (!prop_info.is_computed_name) {
          this.CheckClassMethodName(
            prop_info.name, prop_info.kind, kIsNormal, prop_info.is_static, class_info);
          name_expression = this.ast_node_factory_.NewStringLiteral(prop_info.name, name_expression.position_);
        }
        let kind = is_get ? kGetterFunction : kSetterFunction;
        let value = this.ParseFunctionLiteral(prop_info.name, this.scanner_.location(), kSkipFunctionNameCheck, kind,
          name_token_position, kAccessorOrMethod, this.language_mode(), null);
        let property_kind = is_get ? GETTER : SETTER;
        let result = this.ast_node_factory_.NewClassLiteralProperty(name_expression, value, property_kind, prop_info.is_static,
          prop_info.is_computed_name, prop_info.is_private);

        let prefix = is_get ? this.ast_value_factory_.get_space_string() : this.ast_value_factory_.set_space_string();
        this.SetFunctionNameFromClassPropertyName(result, prop_info.name, prefix);
        return result;
      }
      // class内部不支持对象简写和...展开
      case kValue:
      case kShorthand:
      case kSpread:
        throw new Error('UnexpectedToken');
    }
    this.UNREACHABLE();
  }
  ClassPropertyKindFor(kind) {
    switch (kind) {
      case kAccessorGetter:
        return _GETTER;
      case kAccessorSetter:
        return _SETTER;
      case kMethod:
        return _METHOD;
      case kClassField:
        return _FIELD;
      default:
        this.UNREACHABLE();
    }
  }
  CheckClassMethodName(name, type, flags, is_static, class_info) {
    let avf = this.ast_value_factory_;
    if (name.literal_bytes_ === avf.private_constructor_string()) {
      throw new Error(kConstructorIsPrivate);
    } else if (is_static) {
      if (name.literal_bytes_ === avf.prototype_string()) {
        throw new Error(kStaticPrototype);
      }
    } else if (name.literal_bytes_ === avf.constructor_string()) {
      if (class_info.has_seen_constructor) {
        throw new Error(kDuplicateConstructor);
      }
      class_info.has_seen_constructor = true;
      return;
    }
  }

  /**
   * 处理var、let、const声明语句
   * 语句的形式应该是 (var | const | let) (Identifier) (=) (AssignmentExpression)
   * @param {VariableDeclarationContext} var_context kStatementListItem
   * @param {ZonePtrList<const AstRawString>*} names null
   * @returns {Statement}
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
    switch (this.peek()) {
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
      // 检查下一个token是否是标识符 V8_LIKELY
      if (IsAnyIdentifier(this.peek())) {
        name = this.ParseAndClassifyIdentifier(this.Next());
        /**
         * 1.下一个token是否是赋值运算符
         * 2.for语句且下一个Token是in、of
         * 3.let声明
         */
        if (this.peek() === 'Token::ASSIGN' ||
          // 判断for in、for of语法 这个暂时不解析
          (var_context === kForStatement && this.PeekInOrOf()) ||
          parsing_result.descriptor.mode === kLet) {
          pattern = this.ExpressionFromIdentifier(name, decl_pos);
        }
        /**
         * 其余声明未定义的语句var a;
         * 跳过了一些步骤 变量的很多属性都是未定义的状态
         * 与赋值声明不同的是 这个不生成VariableProxy
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
        name = null;
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
          // AcceptINScope scope(this, var_context != kForStatement);
          let previous_accept_IN_ = this.accept_IN_;
          this.accept_IN_ = var_context !== kForStatement;
          value = this.ParseAssignmentExpression();
          // 析构
          this.accept_IN_ = previous_accept_IN_;
        }
        variable_loc.end_pos = this.end_position();

        /**
         * 推断匿名函数表达式的名
         * fni_维护一个函数名数组
         */
        if (!parsing_result.first_initializer_loc.IsValid()) parsing_result.first_initializer_loc = variable_loc;
        if (this.IsIdentifier(pattern)) {
          if (!value.IsCall() && !value.IsCallNew()) this.fni_.Infer();
          else this.fni_.RemoveLastFunction();
        }

        this.SetFunctionNameFromIdentifierRef(value, pattern);
      } /** end of ASSIGN */
      /**
       * 处理声明未定义
       */
      else {
        if (var_context !== kForStatement || !this.PeekInOrOf()) {
          /**
           * 这里的name为null不代表变量名是null 而是解构声明语句
           * 即const a、const { a, b }不合法
           */
          if (parsing_result.descriptor.mode === kConst || name === null) {
            throw new Error(kDeclarationMissingInitializer);
          }
          // let a 默认赋值为undefined
          if (parsing_result.descriptor.mode === kLet) value = this.ast_node_factory_.NewUndefinedLiteral(this.position());
        }
      }

      let initializer_position = this.end_position();
      /**
       * 当成简单的遍历
       * 这里的迭代器逻辑JS极难模拟 做简化处理
       */
      let declaration_end = decls.length;
      for (; declaration_it < declaration_end; declaration_it++) {
        decls[declaration_it].var_.initializer_position_ = initializer_position;
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
   * 处理async函数
   */
  ParseAsyncFunctionDeclaration(names, default_export) {
    let pos = this.position();
    this.Consume('Token::FUNCTION');
    let flags = kIsAsync;
    return this.ParseHoistableDeclaration(pos, flags, names, default_export);
  }

  /**
   * 解析块级作用域
   * 主要步骤如下:
   * 1、新建一个作用域类body与语法树容器statements
   * 2、设置作用域的父类 标记当前作用域类型是BLOCK_SCOPE
   * 3、解析{}中间的语法树放入statements中
   * 4、处理作用域之间的交互
   * 5、将statements挂载到body上返回
   */
  ParseBlock(labels) {
    let body = this.ast_node_factory_.NewBlock(false, labels);
    let statements = [];
    // CheckStackOverflow();
    {
      // BlockState block_state(zone(), &scope_);
      let outer_scope_ = this.scope_;
      this.scope_ = new Scope(null, this.scope_, BLOCK_SCOPE);
      this.scope_.set_start_position(this.peek_position());
      // TargetT target(this, body);
      // 工具方法 暂时不知道干啥的
      // new ParserTarget(this, body);

      this.Expect('Token::LBRACE');

      while (this.peek() !== 'Token::RBRACE') {
        let stat = this.ParseStatementListItem();
        if (stat === null) return body;
        if (stat.IsEmptyStatement()) continue;
        statements.push(stat);
      }

      this.Expect('Token::RBRACE');

      let end_pos = this.end_position();
      this.scope_.end_position_ = end_pos;

      // this.RecordBlockSourceRange(body, end_pos);
      body.scope_ = this.scope_.FinalizeBlockScope();

      // 析构
      this.scope_ = outer_scope_;
    }

    // body.InitializeStatements(statements, null);
    body.statement_ = statements;
    return body;
  }
  /**
   * 解析if语句
   * 主要步骤如下：
   * 1、解析if括号中的condition
   * 2、if中的语句名为then_statement else名为else_statement
   * 3、分别尝试解析上面两个语句块
   * 4、将condition、then、else三部分通过工厂方法生成一个IfStatement类返回
   * 有以下几个知识点
   * 1、不存在所谓的else if语法 只是将if语句加入else的语句中
   * 2、if/else语句块都可以为空 但是if的condition必须有一个表达式
   * 3、语句块分为single-expression与block 简单讲就是有没有大括号包住
   * 4、single-expression的语句有诸多限制
   * 5、一种极为特殊的情况是 if(..) function fn() {} 这会默认生成一个新作用域并解析函数声明
   */
  ParseIfStatement(labels) {
    let pos = this.peek_position();
    this.Consume('Token::IF');
    this.Expect('Token::LPAREN');
    let condition = this.ParseExpression();
    this.Expect('Token::RPAREN');

    // let then_range = new SourceRange();
    // let else_range = new SourceRange();
    let then_statement = null;
    {
      // SourceRangeScope range_scope(scanner(), &then_range);
      // then_range.start = this.scanner_.peek_location().beg_pos;
      let labels_copy = labels === null ? labels : labels.slice();
      then_statement = this.ParseScopedStatement(labels_copy);
      // then_range.end = this.scanner_.location().end_pos;
    }
    let else_statement = null;
    if (this.Check('Token::ELSE')) {
      else_statement = this.ParseScopedStatement(labels);
      // else_range = SourceRange.ContinuationOf(then_range, this.end_position());
    } else {
      else_statement = this.ast_node_factory_.empty_statement_;
    }
    let stmt = this.ast_node_factory_.NewIfStatement(condition, then_statement, else_statement, pos);
    // this.RecordIfStatementSourceRange(stmt, then_range, else_range);
    return stmt;
  }
  ParseScopedStatement(labels) {
    if (is_strict(this.language_mode()) || this.peek() !== 'Token::FUNCTION') {
      return this.ParseStatement(labels, null);
    }
    /**
     * 进这个分支的条件十分特殊
     * 1.非严格模式
     * 2.下一个Token是function
     * 即if(true) function fn() {}
     */
    else {
      // BlockState block_state(zone(), &scope_);
      let outer_scope_ = this.scope_;
      this.scope_ = new Scope(null, this.scope_, BLOCK_SCOPE);
      this.scope_.start_position_ = this.scanner_.location().beg_pos;
      let block = this.ast_node_factory_.NewBlock(false);
      let body = this.ParseFunctionDeclaration();
      block.statement_.push(body, null);
      this.scope_.end_position_ = this.end_position();
      block.scope_ = this.scope_.FinalizeBlockScope();

      // 析构
      this.scope_ = outer_scope_;
      return block;
    }
  }
  /**
   * 解析do while语句
   * 去掉SourceRange相关逻辑
   */
  ParseDoWhileStatement(labels, own_labels) {
    // typename FunctionState::LoopScope loop_scope(function_state_);
    this.function_state_.loop_nesting_depth_++;
    let loop = this.ast_node_factory_.NewDoWhileStatement(labels, own_labels, this.peek_position());
    // TargetT target(this, loop);
    let body = null;
    this.Consume('Token::DO');

    // CheckStackOverflow();
    {
      body = this.ParseStatement(null, null);
    }
    this.Expect('Token::WHILE');
    this.Expect('Token::LPAREN');

    let cond = this.ParseExpression();
    this.Expect('Token::RPAREN');

    this.Check('Token::SEMICOLON');
    loop.Initialize(cond, body);

    this.function_state_.loop_nesting_depth_--;
    return loop;
  }

  /**
   * 解析while语句
   */
  ParseWhileStatement(labels, own_labels) {
    // typename FunctionState::LoopScope loop_scope(function_state_);
    this.function_state_.loop_nesting_depth_++;
    let loop = this.ast_node_factory_.NewWhileStatement(labels, own_labels, this.peek_position());
    // TargetT target(this, loop);
    let body = null;
    this.Consume('Token::WHILE');
    this.Expect('Token::LPAREN');
    let cond = this.ParseExpression();
    this.Expect('Token::RPAREN');
    {
      body = this.ParseStatement(null, null);
    }
    loop.Initialize(cond, body);

    this.function_state_.loop_nesting_depth_--;
    return loop;
  }

  /**
   * 解析For循环
   */
  ParseForStatement(labels, own_labels) {
    // typename FunctionState::LoopScope loop_scope(function_state_);
    this.function_state_.loop_nesting_depth_++;

    let stmt_pos = this.peek_position();
    let for_info = new ForInfo();

    this.Consume('Token::FOR');
    this.Expect('Token::LPAREN');

    /**
     * 解析一下for语句
     * for(let/const i = 0;;)
     * for(let/const a in obj)
     * for(let/const a of ar)
     */
    let starts_with_let = this.peek() === 'Token::LET';
    if (this.peek() === 'Token::CONST' || (starts_with_let && this.IsNextLetKeyword())) {
      // BlockState for_state(zone(), &scope_);
      let outer_scope_ = this.scope_;
      this.scope_ = new Scope(null, this.scope_, BLOCK_SCOPE);
      this.scope_.start_position_ = this.position();

      // typename FunctionState::FunctionOrEvalRecordingScope recording_scope(function_state_);
      let inner_block_scope = this.NewScope(BLOCK_SCOPE);
      {
        // BlockState inner_state(&scope_, inner_block_scope);
        let outer_scope_ = this.scope_;
        this.scope_ = inner_block_scope;
        this.ParseVariableDeclarations(kForStatement, for_info.parsing_result, for_info.bound_names);

        // 析构
        this.scope_ = outer_scope_;
      }
      for_info.position = this.position();
      // for in/of
      if (this.CheckInOrOf(for_info)) {
        this.scope_.is_hidden_ = true;
        return this.ParseForEachStatementWithDeclarations(stmt_pos, for_info, labels, own_labels, inner_block_scope);
      }

      this.Expect('Token::SEMICOLON');

      let result = null;
      inner_block_scope.start_position_ = this.scope_.start_position_;
      {
        // BlockState inner_state(&scope_, inner_block_scope);
        let outer_scope_ = this.scope_;
        this.scope_ = inner_block_scope;
        let init = this.BuildInitializationBlock(for_info.parsing_result);
        result = this.ParseStandardForLoopWithLexicalDeclarations(stmt_pos, init, for_info, labels, own_labels);

        // 析构
        this.scope_ = outer_scope_;
      }
      this.scope_.FinalizeBlockScope();

      // 析构
      this.scope_ = outer_scope_;
      return result;
    }

    // 同上 不过声明类型是var
    let init = null;
    if (this.peek() === 'Token::VAR') {
      this.ParseVariableDeclarations(kForStatement, for_info.parsing_result, for_info.bound_names);
      for_info.position = this.scanner_.location().beg_pos;
      if (this.CheckInOrOf(for_info)) {
        return this.ParseForEachStatementWithDeclarations(stmt_pos, for_info, labels, own_labels, this.scope_);
      }

      init = this.BuildInitializationBlock(for_info.parsing_result);
    }
    // for(a=1;)  for(a of ar)
    else if (this.peek() !== 'Token::SEMICOLON') {
      let next_loc = this.scanner_.peek_location();
      let lhs_beg_pos = next_loc.beg_pos;
      let lhs_end_pos;
      let is_for_each;
      let expression = null;

      {
        // ExpressionParsingScope expression_scope(impl());
        let expression_scope_ = new ExpressionParsingScope(this);
        // AcceptINScope scope(this, false);
        let previous_accept_IN_ = this.accept_IN_;
        this.accept_IN_ = false;
        expression = this.ParseExpressionCoverGrammar();
        lhs_end_pos = this.end_position();
        is_for_each = this.CheckInOrOf(for_info);
        if (is_for_each) {

        }

        // 析构
        this.accept_IN_ = previous_accept_IN_;
        this.expression_scope_ = expression_scope_.parent_;
        expression_scope_ = null;
      }
      if (is_for_each) {
        return this.ParseForEachStatementWithoutDeclarations(
          stmt_pos, expression, lhs_beg_pos, lhs_end_pos.for_info, labels, own_labels);
      }

      init = this.ast_node_factory_.NewExpressionStatement(expression, lhs_beg_pos);
    }
    this.Expect('Token::SEMICOLON');

    let cond = this.NullExpression();
    let next = this.NullStatement();
    let body = this.NullStatement();
    let loop = this.ParseStandardForLoop(stmt_pos, labels, own_labels, cond, next, body);
    loop.Initialize(init, cond, next, body);
    this.function_state_.loop_nesting_depth_--;
    return loop;
  }
  // 这个方法用的指针 不好模仿 直接传入整个对象
  CheckInOrOf(for_info) {
    if (this.Check('Token::IN')) {
      for_info.mode = ENUMERATE;
      return true;
    } else if (this.CheckContextualKeyword(this.ast_value_factory_.of_string())) {
      for_info.mode = ITERATE;
      return true;
    }
    return false;
  }
  ParseForEachStatementWithDeclarations(stmt_pos, for_info, labels, own_labels, inner_block_scope) {

  }
  ParseForEachStatementWithoutDeclarations(stmt_pos, expression, lhs_beg_pos, lhs_end_pos, for_info, labels, own_labels) {

  }
  ParseStandardForLoopWithLexicalDeclarations(stmt_pos, init, for_info, labels, own_labels) {
    let inner_scope = this.NewScope(BLOCK_SCOPE);
    let loop = this.NullStatement();
    let cond = this.NullExpression();
    let next = this.NullStatement();
    let body = this.NullStatement();
    {
      // BlockState inner_state(&scope_, inner_block_scope);
      let outer_scope_ = this.scope_;
      this.scope_ = inner_block_scope;
      this.scope_.start_position_ = this.scanner_.location().beg_pos;
      loop = this.ParseStandardForLoop(stmt_pos, labels, own_labels, cond, next, body);
      this.scope_.end_position_ = this.end_position();

      // 析构
      this.scope_ = outer_scope_;
    }
    this.scope_.end_position_ = this.end_position();
    if (for_info.bound_names.length > 0 && this.function_state_.contains_function_or_eval_) {
      this.scope_.is_hidden_ = true;
      return this.DesugarLexicalBindingsInForStatement(loop, init, cond, next, body, inner_scope, for_info);
    } else {
      inner_scope = inner_scope.FinalizeBlockScope();
    }
    let for_scope = this.scope_.FinalizeBlockScope();
    if (for_scope !== null) {
      let block = this.ast_node_factory_.NewBlock(false);
      block.statement_.push(init);
      block.statement_.push(loop);
      block.scope_ = for_scope;
      loop.Initialize(this.NullStatement(), cond, next, body);
      return block;
    }
    loop.Initialize(init, cond, next, body);
    return loop;
  }
  // for(init; cond; next) { body }
  ParseStandardForLoop(stmt_pos, labels, own_labels, cond, next, body) {
    // CheckStackOverflow();
    let loop = this.ast_node_factory_.NewForStatement(labels, own_labels, stmt_pos);
    // TargetT target(this, loop);
    if (this.peek() !== 'Token::SEMICOLON') cond = this.ParseExpression();
    this.Expect('Token::SEMICOLON');
    if (this.peek() !== 'Token::RPAREN') {
      let exp = this.ParseExpression();
      next = this.ast_node_factory_.NewExpressionStatement(exp, exp.position());
    }
    this.Expect('Token::RPAREN');
    {
      body = this.ParseStatement(null, null);
    }
    return loop;
  }

  /**
   * 解析continue语句
   * 'continue' Identifier? ';'
   */
  ParseContinueStatement() {
    let pos = this.peek_position();
    this.Consume('Token:CONTINUE');
    let label = null;
    let tok = this.peek();
    if (!this.scanner_.HasLineTerminatorBeforeNext() && !IsAutoSemicolon(tok)) {
      label = this.ParseIdentifier();
    }
    let target = this.LookupContinueTarget(label);
    if (target === null) throw new Error('IllegalContinue');
    this.ExpectSemicolon();
    let stmt = this.ast_node_factory_.NewContinueStatement(target, pos);
    return stmt;
  }

  /**
   * 解析break语句
   * 'break' Identifier? ';'
   */
  ParseBreakStatement(labels) {
    let pos = this.peek_position();
    this.Consume('Token::BREAK');
    let label = null;
    let tok = this.peek();
    if (!this.scanner_.HasLineTerminatorBeforeNext() && !IsAutoSemicolon(tok)) {
      label = this.ParseIdentifier();
    }
    if (label !== null && this.ContainsLabel(labels, label)) {
      this.ExpectSemicolon();
      return this.ast_node_factory_.empty_statement_;
    }
    let target = this.LookupBreakTarget(label);
    if (target === null) throw new Error('IllegalBreak');
    this.ExpectSemicolon();
    let stmt = this.ast_node_factory_.NewBreakStatement(target, pos);
    return stmt;
  }

  /**
   * 解析return语句
   * 'return' [no line terminator] Expression? ';'
   */
  ParseReturnStatement() {
    this.Consume('Token::RETURN');
    let loc = this.scanner_.location();

    switch (this.scope_.GetDeclarationScope().scope_type_) {
      case SCRIPT_SCOPE:
      case EVAL_SCOPE:
      case MODULE_SCOPE:
        throw new Error('IllegalReturn');
      default:
        break;
    }

    let tok = this.peek();
    let return_value = null;
    if (this.scanner_.HasLineTerminatorBeforeNext() || IsAutoSemicolon(tok)) {
      if (IsDerivedConstructor(this.function_state_.kind())) {
        // ExpressionParsingScope expression_scope(impl());
        let expression_scope_ = new ExpressionParsingScope(this);
        return_value = this.ThisExpression();
        // 析构
        this.expression_scope_ = expression_scope_.parent_;
        expression_scope_ = null;
      }
    } else {
      return_value = this.ParseExpression();
    }
    this.ExpectSemicolon();

    return_value = this.RewriteReturn(return_value, loc.beg_pos);
    let continuation_pos = this.end_position();
    let stmt = this.BuildReturnStatement(return_value, loc.beg_pos, continuation_pos);
    return stmt;
  }

  /**
   * 解析throw语句
   * 'throw' Expression ';'
   */
  ParseThrowStatement() {
    this.Consume('Token::THROW');
    let pos = this.position();
    // throw后面不可另起一行
    if (this.scanner_.HasLineTerminatorBeforeNext()) throw new Error(kNewlineAfterThrow);
    let exception = this.ParseExpression();
    this.ExpectSemicolon();

    let stmt = this.NewThrowStatement(exception, pos);
    return stmt;
  }

  /**
   * 解析try语句
   * TryStatement ::
   *  'try' Block Catch
   *  'try' Block Finally
   *  'try' Block Catch Finally
   * Catch ::
   *  'catch' '(' Identifier ')' Block
   * Finally ::
   *  'finally' Block
   */
  ParseTryStatement() {
    this.Consume('Token::TRY');
    let pos = this.position();
    let try_block = this.ParseBlock(null);
    let catch_info = new CatchInfo();
    if (this.peek() !== 'Token::CATCH' && this.peek() !== 'Token::FINALLY') throw new Error(kNoCatchOrFinally);

    let catch_block = null;
    {
      if (this.Check('Token::CATCH')) {
        // 新标准catch后面可以不用指定错误
        let has_binding = this.Check('Token::LPAREN');
        if (has_binding) {
          catch_info.scope = this.NewScope(CATCH_SCOPE);
          catch_info.scope.start_position_ = this.scanner_.location().beg_pos;
          {
            // BlockState catch_block_state(&scope_, catch_info.scope);
            let outer_scope_ = this.scope_;
            this.scope_ = catch_info.scope;
            let catch_statements = [];
            {
              // BlockState catch_variable_block_state(zone(), &scope_);
              let outer_scope_ = this.scope_;
              this.scope_ = new Scope(null, this.scope_, BLOCK_SCOPE);
              this.scope_.start_position_ = this.position();
              // 解析catch(e)这种标识符变量形式
              if (this.peek_any_identifier()) {
                let identifier = this.ParseNonRestrictedIdentifier();
                catch_info.variable = this.DeclareCatchVariableName(catch_info.scope, identifier);
              }
              // 解析catch({})这种pattern类型
              else {
                catch_info.variable = catch_info.scope.DeclareCatchVariableName(this.ast_value_factory_.dot_catch_string());
                let decls = this.scope_.declarations;
                let declaration_it = decls.length;
                let destructuring = new VariableDeclarationParsingScope(this, kLet, null);
                catch_info.pattern = this.ParseBindingPattern();

                let initializer_position = this.end_position();
                let declaration_end = decls.length;
                for (; declaration_it !== declaration_end; ++declaration_it) {
                  decls[declaration_it].var_.initializer_position_ = initializer_position;
                }
                catch_statements.push(this.RewriteCatchPattern(catch_info));
              }
              this.Expect('Token::RPAREN');
              let inner_block = this.ParseBlock(null);
              catch_statements.push(inner_block);
              // 处理catch(e) { let e; }这种重复声明
              if (this.HasCheckedSyntax()) {
                let inner_scope = inner_block.scope_;
                if (inner_scope !== null) {
                  let conflict = null;
                  if (catch_info.pattern === null) {
                    let name = catch_info.variable.raw_name();
                    if (inner_scope.LookupLocal(name)) conflict = name;
                  } else {
                    conflict = inner_scope.FindVariableDeclaredIn(this.scope_, kVar);
                  }
                  if (conflict !== null) {
                    throw new Error('Identifier has already been declared');
                  }
                }
              }
              catch_info.end_position_ = this.end_position();
              catch_block = ast_node_factory_.NewBlock(false, catch_statements);
              catch_block.scope_ = this.scope_.FinalizeBlockScope();

              this.scope_ = outer_scope_;
            }

            // 析构
            this.scope_ = outer_scope_;
          }
          catch_info.scope.end_position_ = this.end_position();
        } else {
          catch_block = this.ParseBlock(null);
        }
      }
    }

    let finally_block = null;
    {
      if (this.Check('Token::FINALLY')) {
        finally_block = this.ParseBlock(null);
      }
    }
    return this.RewriteTryStatement(try_block, catch_block, null, finally_block, null, catch_info, pos);
  }

  /**
   * 解析with语句
   * 'with' '(' Expression ')' Statement
   */
  ParseWithStatement(labels) {
    this.Consume('Token::WITH');
    let pos = this.position();
    if (is_strict(this.language_mode())) throw new Error(kStrictWith);

    this.Expect('Token::LPAREN');
    let expr = this.ParseExpression();
    this.Expect('Token::RPAREN');

    let with_scope = this.NewScope(WITH_SCOPE);
    let body = null;
    {
      // BlockState block_state(&scope_, with_scope);
      let outer_scope_ = this.scope_;
      this.scope_ = with_scope;
      with_scope.start_position_ = this.scanner_.peek_position().beg_pos;
      body = this.ParseStatement(labels, null);
      with_scope.end_position_ = this.end_position();

      // 析构
      this.scope_ = outer_scope_;
    }
    return this.ast_node_factory_.NewWithStatement(with_scope, expr, body, pos);
  }

  /**
   * 解析switch语句
   * 'switch' '(' Expression ')' '{' CaseClause* '}'
   * 'case' Expression ':' StatementList
   * 'default' ':' StatementList
   */
  ParseSwitchStatement(labels) {
    let switch_pos = this.peek_position();
    this.Consume('Token::SWITCH');
    this.Expect('Token::LPAREN');
    let tag = this.ParseExpression();
    this.Expect('Token::RPAREN');

    let switch_statement = this.ast_node_factory_.NewSwitchStatement(labels, tag, switch_pos);
    {
      // BlockState cases_block_state(zone(), &scope_);
      let outer_scope_ = this.scope_;
      this.scope_ = new Scope(null, this.scope_, BLOCK_SCOPE);
      this.scope_.start_position_ = switch_pos;
      this.scope_.scope_nonlinear_ = true;
      // TargetT target(this, switch_statement);

      let default_seen = false;
      this.Expect('Token::LBRACE');
      while (this.peek() !== 'Token::RBRACE') {
        let label = null;
        let statements = [];
        // 去掉Range相关
        {
          /**
           * 处理case/default条件
           * 只能有一个default
           */
          if (this.Check('Token::CASE')) {
            label = this.ParseExpression();
          } else {
            this.Expect('Token::DEFAULT');
            if (default_seen) throw new Error(kMultipleDefaultsInSwitch);
            default_seen = true;
          }
          this.Expect('Token::COLON');
          // 默认解析语句块
          while (this.peek() !== 'Token::CASE' && this.peek() !== 'Token::DEFAULT' &&
            this.peek() !== 'Token::RBRACE') {
            let stat = this.ParseStatementListItem();
            if (stat === null) return stat;
            if (stat.IsEmptyStatement()) continue;
            statements.push(stat);
          }
        }
        let clause = this.ast_node_factory_.NewCaseClause(label, statements);
        switch_statement.cases_.push(clause);
      }
      this.Expect('Token::RBRACE');

      let end_pos = this.end_position();
      this.scope_.end_position_ = end_pos;
      let switch_scope = this.scope_.FinalizeBlockScope();
      // 析构
      this.scope_ = outer_scope_;
      if (switch_scope !== null) {
        return this.RewriteSwitchStatement(switch_statement, switch_scope);
      }
      return switch_statement;
    }
  }

  /**
   * 解析Debugger语句
   * 'debugger' ';'
   */
  ParseDebuggerStatement() {
    let pos = this.peek_position();
    this.Consume('Token::DEBUGGER');
    this.ExpectSemicolon();
    return this.ast_node_factory_.NewDebuggerStatement(pos);
  }

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
   * (4){}对象、[]数组、``模板字符串复杂字面量
   * 等等情况 实在太过繁琐
   * 除了上述情况 被赋值的可能也是一个左值 比如遇到如下的特殊Token
   * import、async、new、this、function、任意标识符等等
   * 左值的解析相当于一个完整的新表达式
   * @returns {Assignment}
   */
  ParseAssignmentExpression() {
    /**
     * ExpressionParsingScope expression_scope(impl());
     * 该scope类继承于ExpressionScope 需要做析构处理
     */
    let expression_scope_ = new ExpressionParsingScope(this);
    let result = this.ParseAssignmentExpressionCoverGrammar();
    // expression_scope_.ValidateExpression();
    // 析构
    this.expression_scope_ = expression_scope_.parent_;
    expression_scope_ = null;
    return result;
  }
  /**
   * Precedence = 2
   * 大体上赋值表达式分为以下几种情况
   * (1)条件表达式 let a = true ? b : c
   * (2)箭头函数
   * (3)yield表达式
   * (4)LeftHandSideExpression let a = new f()
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
    /**
     * 如果当前Token不是运算符或箭头
     * 这里会判定不是多元运算表达式直接返回
     */
    if (!IsArrowOrAssignmentOp(op)) {
      // 方法存在多处返回 必须同时加上这个析构操作
      this.fni_.names_stack_.length = top_;
      --this.fni_.scope_depth_;
      return expression;
    }

    /**
     * 这个写法被标记为V8_UNLIKELY 意味着任何箭头函数表达式都是负优化
     * 个人理解是 箭头函数作为ES6的新特性 在总的JS代码中仍然占比较小的比重 所以不需要做优化
     * @example
     * let fn = a => a;
     */
    if (op === 'Token::ARROW') {
      let loc = new Location(lhs_beg_pos, this.end_position());
      if (!this.IsIdentifier(expression) && !expression.is_parenthesized()) {
        throw new Error(kMalformedArrowFunParamList);
      }

      let scope = this.next_arrow_function_info_.scope;
      scope.set_start_position(lhs_beg_pos);

      let parameters = new ParserFormalParameters(scope);
      // 这里的错误就不管了
      parameters.is_simple = scope.has_simple_parameters_;
      this.next_arrow_function_info_.Reset();

      this.DeclareArrowFunctionFormalParameters(parameters, expression, loc);
      expression = this.ParseArrowFunctionLiteral(parameters);

      return expression;
    }
    /**
     * V8_LIKELY
     * 多元运算表达式才会继续走
     */
    if (this.IsAssignableIdentifier(expression)) {
      if (expression.is_parenthesized()) throw new Error(kInvalidDestructuringTarget);
      this.expression_scope_.MarkIdentifierAsAssigned();
    } else if (expression.IsProperty()) {
      // throw new Error(kInvalidPropertyBindingPattern);
      // this.expression_scope_.ValidateAsExpression();
    }
    // 解构赋值
    else if (expression.IsPattern() && op === 'Token::ASSIGN') {
      if (expression.is_parenthesized()) {
        let loc = new Location(lhs_beg_pos, this.end_position());
        if (this.expression_scope_.IsCertainlyDeclaration()) throw new Error(kInvalidDestructuringTarget);
        else throw new Error(kInvalidLhsInAssignment);
      }
      this.expression_scope_.ValidatePattern(expression, lhs_beg_pos, this.end_position());
    } else {
      throw new Error(kInvalidLhsInAssignment);
    }

    this.Consume(op);
    let op_position = this.position();
    let right = this.ParseAssignmentExpression();
    // 
    if (op === 'Token::ASSIGN') {
      if (this.IsThisProperty(expression)) {
        this.function_state_.AddProperty();
      }
      this.CheckAssigningFunctionLiteralToProperty(expression, right);
      if (right.IsCall() || right.IsCallNew()) {
        this.fni_.RemoveLastFunction();
      } else {
        this.fni_.Infer();
      }
      this.SetFunctionNameFromIdentifierRef(right, expression);
    }
    else {
      // RecordPatternError
      this.fni_.RemoveLastFunction();
    }

    let result = this.ast_node_factory_.NewAssignment(op, expression, right, op_position);
    // 析构
    this.fni_.names_stack_.length = top_;
    --this.fni_.scope_depth_;
    return result;
  }
  // TODO
  ParseYieldExpression() { }

  /**
   * Precedence = 3
   * 条件表达式 即三元表达式
   */
  ParseConditionalExpression() {
    let pos = this.peek_position();
    /**
     * 二元表达式的优先级为4以上
     * 这里只是单纯的想解析单个非三元表达式 所以传了一个最高优先级的值4
     */
    let expression = this.ParseLogicalExpression();
    return this.peek() === 'Token::CONDITIONAL' ? this.ParseConditionalContinuation(expression, pos) : expression;
  }
  /**
   * 处理逻辑表达式
   * ||、&&、??
   */
  ParseLogicalExpression() {
    let expression = this.ParseBinaryExpression(6);
    if (this.peek() === 'Token::AND' || this.peek() === 'Token::OR') {
      let prec1 = Precedence(this.peek(), this.accept_IN_);
      expression = this.ParseBinaryContinuation(expression, 4, prec1);
    } else if (this.peek() === 'Token::NULLISH') {
      expression = this.ParseCoalesceExpression(expression);
    }
    return expression;
  }
  /**
   * 解析合并表达式
   * CoalesceExpressionHead ?? BitwiseORExpression
   */
  ParseCoalesceExpression(expression) {
    let first_nullish = true;
    while (this.peek() === 'Token::NULLISH') {
      this.Consume('Token::NULLISH');
      let pos = this.peek_position();
      let y = this.ParseBinaryExpression(6);
      if (first_nullish) {
        expression = this.ast_node_factory_.NewBinaryOperation('Token::NULLISH', expression, y, pos);
        first_nullish = false;
      } else {
        this.CollapseNaryExpression(expression, y, 'Token::NULLISH', pos, null);
      }
    }
    return expression;
  }
  ParseConditionalContinuation(expression, pos) {
    let left = null;
    {
      this.Consume('Token::CONDITIONAL');
      // AcceptINScope scope(this, true);
      let previous_accept_IN_ = this.accept_IN_;
      this.accept_IN_ = true;
      left = this.ParseAssignmentExpression();

      // 析构
      this.accept_IN_ = previous_accept_IN_;
    }
    let right = null;
    {
      this.Expect('Token::COLON');
      right = this.ParseAssignmentExpression();
    }
    let expr = this.ast_node_factory_.NewConditional(expression, left, right, pos);
    return expr;
  }
  /**
   * Precedence >= 4
   * 处理二元表达式
   */
  ParseBinaryExpression(prec) {
    if (prec < 4) throw new Error('We start using the binary expression parser for prec >= 4 only!');
    /**
     * 虽然是解析二(多)元表达式 但不一定真的是
     * 所以这里的逻辑很简单 先尝试解析一个一元表达式 然后根据下一个Token实际情况决定逻辑
     * 1. 如果不是二元表达式 这里的prec1必定等于0 直接返回
     * 2. 是二(多)元表达式 但是下一个运算符的优先级比当前的高 会优先继续走下一个
     * 3. 下一个运算优先级较低 与上面相反 直接跳出 外部会处理
     */
    let x = this.ParseUnaryExpression();
    let prec1 = Precedence(this.peek(), this.accept_IN_);
    if (prec1 >= prec) return this.ParseBinaryContinuation(x, prec, prec1);
    return x;
  }
  ParseBinaryContinuation(x, prec, prec1) {
    do {
      while (Precedence(this.peek(), this.accept_IN_) === prec1) {
        let pos = this.peek_position();
        let y = null;
        let op = null;
        {
          op = this.Next();
          let is_right_associative = op === 'Token::EXP';
          let next_prec = is_right_associative ? prec1 : prec1 + 1;
          y = this.ParseBinaryExpression(next_prec);
        }

        if (IsCompareOp(op)) {
          let cmp = op;
          switch (op) {
            case 'Token::NE': cmp = 'Token::EQ'; break;
            case 'Token::NE_STRICT': cmp = 'Token::EQ_STRICT'; break;
            default: break;
          }
          x = this.ast_node_factory_.NewCompareOperation(cmp, x, y, pos);
          if (cmp !== op) {
            x = this.ast_node_factory_.NewUnaryOperation('Token::NOT', x, pos);
          }
        } else if (!this.ShortcutNumericLiteralBinaryExpression(x, y, op, pos) &&
          !this.CollapseNaryExpression(x, y, op, pos)) {
          x = this.ast_node_factory_.NewBinaryOperation(op, x, y, pos);
        }
      }
      --prec1;
    } while (prec1 >= prec);
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
    // 一元运算或前置表达式 --a ++b
    if (IsUnaryOrCountOp(op)) return this.ParseUnaryOrPrefixExpression();
    // await语法
    if (this.is_async_function() && op === 'Token::AWAIT') return this.ParseAwaitExpression();
    // 后置表达式 a++ a-- a[b] a.b
    return this.ParsePostfixExpression();
  }
  ParseUnaryOrPrefixExpression() {
    let op = this.Next();
    let pos = this.position();
    // !function... 后面的函数会被立即执行
    if (op === 'Token::NOT' && this.peek() === 'Token::FUNCTION') this.function_state_.set_next_function_is_likely_called();

    // this.CheckStackOverflow();
    // let expression_position = this.peek_position();
    let expression = this.ParseUnaryExpression();

    if (IsUnaryOp(op)) {
      if (op === 'Token::DELETE') {
        // 'use strict' let a = 1;delete a;
        if (this.IsIdentifier(expression) && is_strict(this.language_mode())) throw new Error(kStrictDelete);
        // if(IsPropertyWithPrivateFieldKey()) 这个不知道怎么触发 #开头的被认定是私有属性
      }
      if (this.peek() === 'Token::EXP') throw new Error(kUnexpectedTokenUnaryExponentiation);
      return this.BuildUnaryExpression(expression, op, pos);
    }

    // V8_LIKELY
    if (this.IsValidReferenceExpression(expression)) {
      if (this.IsIdentifier(expression)) this.expression_scope_.MarkIdentifierAsAssigned();
    }
    // else {
    //   expression = this.RewriteInvalidReferenceExpression(expression, expression_position, this.end_position(), )
    // }
    return this.ast_node_factory_.NewCountOperation(op, true, expression, this.position());
  }
  // TODO
  ParseAwaitExpression() { }
  ParsePostfixExpression() {
    let lhs_beg_pos = this.peek_position();
    let expression = this.ParseLeftHandSideExpression();
    // V8_LIKELY
    if (!IsCountOp(this.peek()) || this.scanner_.HasLineTerminatorBeforeNext()) return expression;
    return this.ParsePostfixContinuation(expression, lhs_beg_pos);
  }
  // TODO
  ParsePostfixContinuation() { }
  /**
   * LeftHandSideExpression
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
   * (1)this.xxx
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
      // V8_UNLIKELY 不要这么写
      if (token === 'Token::ASYNC'
        && !this.scanner_.HasLineTerminatorBeforeNext()
        && !this.scanner_.literal_contains_escapes()) {
        /**
         * @example
         * async function fn() {}
         */
        if (this.peek() === 'Token::FUNCTION') return this.ParseAsyncFunctionLiteral();
        /**
         * @example
         * async fn => fn
         */
        if (this.peek_any_identifier() && this.PeekAhead() === 'Token::ARROW') {
          token = this.Next();
          beg_pos = this.position();
          kind = kAsyncArrowFunction;
        }
      }
      /**
       * V8_UNLIKELY
       * @example 这样声明不可取
       * let a = b => b;
       */
      if (this.peek() === 'Token::ARROW') {
        let parsing_scope = new ArrowHeadParsingScope(this, kind);
        let name = this.ParseAndClassifyIdentifier(token);
        this.ClassifyParameter(name, beg_pos, this.end_position());
        let result = this.ExpressionFromIdentifier(name, beg_pos, kNo);
        this.next_arrow_function_info_ = parsing_scope.ValidateAndCreateScope();
        return result;
      }

      let name = this.ParseAndClassifyIdentifier(token);
      return this.ExpressionFromIdentifier(name, beg_pos);
    }
    /**
     * 简单字面量
     */
    if (IsLiteral(token)) {
      return this.ExpressionFromLiteral(this.Next(), beg_pos);
    }
    /**
     * 处理各种复杂字面量与特殊表达式
     * 比如new、this、[]、{}、super
     */
    switch (token) {
      case 'Token::NEW':
        return this.ParseMemberWithPresentNewPrefixesExpression();
      case 'Token::THIS': {
        this.Consume('Token::THIS');
        return this.ThisExpression();
      }

      case 'Token::ASSIGN_DIV':
      case 'Token::DIV':
        return this.ParseRegExpLiteral();

      case 'Token::FUNCTION':
        return this.ParseFunctionExpression();

      case 'Token::SUPER': {
        const is_new = false;
        return this.ParseSuperExpression(is_new);
      }
      case 'Token::IMPORT':
        if (!allow_harmony_dynamic_import_) break;
        return this.ParseImportExpressions();

      case 'Token::LBRACK':
        return this.ParseArrayLiteral();

      // [Token::ASSIGN, Token::LBRACE, null]
      case 'Token::LBRACE':
        return this.ParseObjectLiteral();
      case 'Token::LPAREN': {
        this.Consume('Token::LPAREN');
        /**
         * @example
         * let a = () => 1;
         */
        if (this.Check('Token::RPAREN')) {
          // 如果是空括号后面必须跟箭头Token表示一个无参箭头函数
          if (this.peek() !== 'Token::ARROW') throw new Error('UnexpectedToken ")"');
          this.next_arrow_function_info_.scope = this.NewFunctionScope(kArrowFunction);
          return this.ast_node_factory_.NewEmptyParentheses(beg_pos);
        }
        // Scope::Snapshot scope_snapshot(scope());
        let maybe_arrow = new ArrowHeadParsingScope(this, kArrowFunction);
        if (this.peek() === 'Token::FUNCTION' ||
          (this.peek() === 'Token::ASYNC' && this.PeekAhead() === 'Token::FUNCTION')) {
          this.function_state_.set_next_function_is_likely_called();
        }
        // AcceptINScope scope(this, true);
        let previous_accept_IN_ = this.accept_IN_;
        this.accept_IN_ = true;
        // 解析括号中的长表达式
        let expr = this.ParseExpressionCoverGrammar();
        expr.mark_parenthesized();
        this.Expect('Token::RPAREN');
        // 下一个Token是箭头时 设置箭头函数的作用域
        if (this.peek() === 'Token::ARROW') {
          this.next_arrow_function_info_.scope = maybe_arrow.ValidateAndCreateScope();
          // scope_snapshot.Reparent(next_arrow_function_info_.scope);
        }

        // 析构
        this.accept_IN_ = previous_accept_IN_;
        return expr;
      }

      case 'Token::CLASS': {
        this.Consume('Token::CLASS');
        let class_token_pos = this.position();
        let name = null;
        let is_strict_reserved_name = false;
        let class_name_location = new Location().invalid();
        if (this.peek_any_identifier()) {
          name = this.ParseAndClassifyIdentifier(this.Next());
          class_name_location = this.scanner_.location();
          is_strict_reserved_name = IsStrictReservedWord(this.scanner_.current_token());
        }
        return this.ParseClassLiteral(name, class_name_location, is_strict_reserved_name, class_token_pos);
      }
      // 这块尚未完善
      case 'Token::TEMPLATE_SPAN':
      case 'Token::TEMPLATE_TAIL':
        return this.ParseTemplateLiteral(null, beg_pos, false);

      case 'Token::MOD':
        // if (this.allow_natives_ || this.extension_ !== null) {
        //   return this.ParseV8Intrinsic();
        // }
        break;

      default:
        break;
    }
    throw new Error('UnexpectedToken');
  }
  /**
   * 负责解析复杂标识符 即a[b] a.b a() 等等
   * @param {Expression*} result 标识符
   */
  ParseLeftHandSideContinuation(result) {
    /**
     * V8_UNLIKELY
     * async()会进入下面的分支
     * 有两种情况
     * 1.async(1, 2, 3)作为函数名被调用
     * 2.async () => {} 定义一个async箭头函数
     * 脑瘫才这么写
     */
    if (this.peek() === 'Token::LPAREN' && this.IsIdentifier(result) &&
      this.scanner_.current_token() === 'Token::ASYNC' &&
      !this.scanner_.HasLineTerminatorBeforeNext() &&
      !this.scanner_.literal_contains_escapes()) {
      let pos = this.position();
      let maybe_arrow = new ArrowHeadParsingScope(this, kAsyncArrowFunction);
      // Scope::Snapshot scope_snapshot(scope());
      let args = [];
      let has_spread = this.ParseArguments(args, kMaybeArrowHead);
      // V8_LIKELY
      if (this.peek() === 'Token::ARROW') {
        this.fni_.RemoveAsyncKeywordFromEnd();
        this.next_arrow_function_info_ = maybe_arrow.ValidateAndCreateScope();
        // scope_snapshot.Reparent(next_arrow_function_info_.scope);
        // async () => ...
        if (!args.length) return this.ast_node_factory_.NewEmptyParentheses(pos);
        // async (a, b, c) => ...
        let result = this.ExpressionListToExpression(args);
        result.mark_parenthesized();
        return result;
      }

      if (has_spread) {
        result = this.SpreadCall(result, args, pos, NOT_EVAL);
      } else {
        result = this.ast_node_factory_.NewCall(result, args, pos, NOT_EVAL);
      }

      this.fni_.RemoveLastFunction();
      if (!IsPropertyOrCall(this.peek())) return result;
    }

    do {
      switch (this.peek()) {
        // IDENTIFIER[index] 数组索引
        case 'Token::LBRACK': {
          this.Consume('Token::LBRACK');
          let pos = this.position();
          // AcceptINScope scope(this, true);
          let previous_accept_IN_ = this.accept_IN_;
          this.accept_IN_ = true;
          let index = this.ParseExpressionCoverGrammar();
          result = this.ast_node_factory_.NewProperty(result, index, pos);
          this.Expect('Token::RBRACK');
          // 析构
          this.accept_IN_ = previous_accept_IN_;
          break;
        }
        // IDENTIFIER.xxx 对象取属性
        case 'Token::PERIOD': {
          this.Consume('Token::PERIOD');
          let pos = this.position();
          let key = this.ParsePropertyOrPrivatePropertyName();
          result = this.ast_node_factory_.NewProperty(result, key, pos);
          break;
        }
        // 函数调用
        case 'Token::LPAREN': {
          let pos;
          // super,static,get,set等等特殊函数
          if (IsCallable(this.scanner_.current_token())) {
            pos = this.position();
          } else {
            pos = this.peek_position();
            if (result.IsFunctionLiteral()) {
              result.SetShouldEagerCompile();
              if (this.scope_.is_script_scope()) {
                result.mark_as_oneshot_iife();
              }
            }
          }
          let args = [];
          let has_spread = this.ParseArguments(args);

          let is_possibly_eval = this.CheckPossibleEvalCall(result, this.scope_);
          if (has_spread) {
            result = this.SpreadCall(result, args, pos, is_possibly_eval);
          } else {
            result = this.ast_node_factory_.NewCall(result, args, pos, is_possibly_eval);
          }

          this.fni_.RemoveLastFunction();
          break;
        }
        default:
          break;
      }
    } while (IsPropertyOrCall(this.peek()));
    return result;
  }
  /**
   * 解析函数参数
   * @param {ExpressionList*} args 参数数组
   * @param {ParsingArrowHeadFlag} maybe_arrow 是否是箭头函数
   * @return {Boolean} has_spread 修改了源码函数 返回一个扩展符标记
   */
  ParseArguments(args, maybe_arrow = kCertainlyNotArrowHead) {
    let has_spread = false;
    this.Consume('Token::LPAREN');
    let accumulation_scope = new AccumulationScope(this.expression_scope_);
    while (this.peek() !== 'Token::RPAREN') {
      let start_pos = this.peek_position();
      let is_spread = this.Check('Token::ELLIPSIS');
      let expr_pos = this.peek_position();
      // AcceptINScope scope(this, true);
      let previous_accept_IN_ = this.accept_IN_;
      this.accept_IN_ = true;
      let argument = this.ParseAssignmentExpressionCoverGrammar();
      // V8_UNLIKELY
      if (maybe_arrow === kMaybeArrowHead) {
        this.ClassifyArrowParameter(accumulation_scope, expr_pos, argument);
        if (is_spread) {
          this.expression_scope_.RecordNonSimpleParameter();
          if (argument.IsAssignment()) throw new Error(kRestDefaultInitializer);
          if (this.peek() === 'Token::COMMA') throw new Error(kParamAfterRest);
        }
      }
      if (is_spread) {
        has_spread = true;
        argument = this.ast_node_factory_.NewSpread(argument, start_pos, expr_pos);
      }
      args.push(argument);
      if (!this.Check('Token::COMMA')) break;
      // 析构
      this.accept_IN_ = previous_accept_IN_;
    }

    if (args.length > kMaxArguments) throw new Error(kTooManyArguments);
    if (!this.Check('Token::RPAREN')) throw new Error(kUnterminatedArgList);

    return has_spread;
  }
  ParsePropertyOrPrivatePropertyName() {
    let pos = this.position();
    let name = null;
    let key = null;
    let next = this.Next();
    // V8_LIKELY
    if (IsPropertyName(next)) {
      name = this.GetSymbol();
      key = this.ast_node_factory_.NewStringLiteral(name, pos);
    } else if (next === 'Token::PRIVATE_NAME') {
      let class_scope = this.scope_.GetClassScope();
      name = this.GetIdentifier();
      if (class_scope === null) throw new Error(kInvalidPrivateFieldResolution);
      key = this.ExpressionFromPrivateName(class_scope, name, pos);
    } else {
      throw new Error('UnexpectedToken');
    }
    this.PushLiteralName(name);
    return key;
  }
  ExpressionFromPrivateName(class_scope, name, start_position) {
    let proxy = this.ast_node_factory_.NewVariableProxy(name, NORMAL_VARIABLE, start_position);
    class_scope.AddUnresolvedPrivateName(proxy);
    return proxy;
  }
  CheckPossibleEvalCall(expression, scope) {
    if (this.IsIdentifier(expression) && this.IsEval(expression)) {
      scope.RecordInnerScopeEvalCall();
      this.function_state_.RecordFunctionOrEvalCall();
      if (is_sloppy(scope.language_mode())) {
        scope.GetDeclarationScope().scope_calls_eval_ = true;
      }

      scope.scope_calls_eval_ = true;
      return IS_POSSIBLY_EVAL;
    }
    return NOT_EVAL;
  }

  /**
   * 这里的所有方法都通过ast_node_factory工厂来生成literal类
   */
  ExpressionFromLiteral(token, pos) {
    switch (token) {
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
      switch (this.peek()) {
        // []
        case 'Token::LBRACK': {
          this.Consume('Token::LBRACK');
          let pos = this.position();
          // AcceptINScope scope(this, true);
          let previous_accept_IN_ = this.accept_IN_;
          this.accept_IN_ = true;
          let index = this.ParseExpressionCoverGrammar();
          expression = this.ast_node_factory_.NewProperty(expression, index, pos);
          this.PushPropertyName(index);
          this.Expect('Token::RBRACK');
          // 析构
          this.accept_IN_ = previous_accept_IN_;
          break;
        }
        case 'Token::PERIOD': {
          this.Consume('Token::PERIOD');
          let pos = this.position();
          let key = this.ParsePropertyOrPrivatePropertyName();
          expression = this.ast_node_factory_.NewProperty(expression, key, pos);
          break;
        }
        default:
          let pos;
          if (this.scanner_.current_token() === 'Token::IDENTIFIER') {
            pos = this.position();
          }
          else {
            pos = this.peek_position();
            if (expression.IsFunctionLiteral()) {
              expression.SetShouldEagerCompile();
            }
          }
          expression = this.ParseTemplateLiteral(expression, pos, true);
          break;
      }
    } while (IsMember(this.peek()));
    return expression;
  }
  ParseExpression() {
    // ExpressionParsingScope expression_scope(impl());
    let expression_scope_ = new ExpressionParsingScope(this);
    // AcceptINScope scope(this, true);
    let previous_accept_IN_ = this.accept_IN_;
    this.accept_IN_ = true;

    let result = this.ParseExpressionCoverGrammar();

    // 析构
    this.accept_IN_ = previous_accept_IN_;
    this.expression_scope_ = expression_scope_.parent_;
    expression_scope_ = null;
    return result;
  }
  ParseExpressionCoverGrammar() {
    let list = [];
    let expression;
    let accumulation_scope = new AccumulationScope(this.expression_scope_);
    while (true) {
      /**
       * V8_UNLIKELY
       * @example
       * let fn = (...args) => args;
       */
      if (this.peek() === 'Token::ELLIPSIS') {
        return this.ParseArrowParametersWithRest(list, accumulation_scope);
      }
      let expr_pos = this.peek_position();
      // 这里解析一个完整的表达式
      expression = this.ParseAssignmentExpressionCoverGrammar();

      this.ClassifyArrowParameter(accumulation_scope, expr_pos, expression);
      list.push(expression);
      // 非逗号break
      if (!this.Check('Token::COMMA')) break;
      // 同时检测右括号与箭头符号 隐式地允许了最后一个形参的逗号
      if (this.peek() === 'Token::RPAREN' && this.PeekAhead() === 'Token::ARROW') break;

      if (this.peek() === 'Token::FUNCTION' && this.function_state_.previous_function_was_likely_called_) {
        this.function_state_.set_next_function_is_likely_called();
      }
    }
    if (list.length === 1) return expression;
    return this.ExpressionListToExpression(list);
  }
  ClassifyArrowParameter(accumulation_scope, position, parameter) {
    accumulation_scope.Accumulate();
    if (parameter.is_parenthesized() ||
      !(this.IsIdentifier(parameter) || parameter.IsPattern() || parameter.IsAssignment())) {
      // throw new Error(kInvalidDestructuringTarget);
    } else if (this.IsIdentifier(parameter)) {
      this.ClassifyParameter(parameter, position, this.end_position());
    } else {
      this.expression_scope_.RecordNonSimpleParameter();
    }
  }

  /**
   * 解析模板字符串
   */
  ParseTemplateLiteral(tag, start, tagged) {
    if (tagged) {
      this.allow_eval_cache_ = false;
    }
    // 判断是否有转义 这里暂不考虑
    let is_valid = true;
    // let forbid_illegal_escapes = !tagged;
    /**
     * 如果直接是TEMPLATE_TAIL
     * 说明这个模板字符串没有插值 相当于普通字符串
     */
    if (this.peek() === 'Token::TEMPLATE_TAIL') {
      this.Consume('Token::TEMPLATE_TAIL');
      let pos = this.position();
      let ts = this.OpenTemplateLiteral(pos);
      // let is_valid = this.CheckTemplateEscapes(forbid_illegal_escapes);
      this.AddTemplateSpan(ts, is_valid, true);
      return this.CloseTemplateLiteral(ts, start, tag);
    }

    this.Consume('Token::TEMPLATE_SPAN');
    let pos = this.position();
    let ts = this.OpenTemplateLiteral(pos);
    // let is_valid = this.CheckTemplateEscapes(forbid_illegal_escapes);
    this.AddTemplateSpan(ts, is_valid, false);
    let next = null;
    do {
      next = this.peek();
      // let expr_pos = this.peek_position();
      // AcceptINScope scope(this, true);
      let previous_accept_IN_ = this.accept_IN_;
      this.accept_IN_ = true;
      // ${expr} 解析中间的表达式
      let expression = this.ParseExpressionCoverGrammar();
      this.AddTemplateExpression(ts, expression);
      // }
      if (this.peek() !== 'Token::RBRACE') {
        throw new Error(kUnterminatedTemplateExpr);
      }
      /**
       * `string${expr}从这里开始继续解析
       * 继续解析模板字符串
       */
      next = this.scanner_.ScanTemplateContinuation();
      pos = this.position();

      // let is_valid = CheckTemplateEscapes(forbid_illegal_escapes);
      this.AddTemplateSpan(ts, is_valid, next === 'Token::TEMPLATE_TAIL');
      // 析构
      this.accept_IN_ = previous_accept_IN_;
    } while (next === 'Token::TEMPLATE_SPAN');
    return this.CloseTemplateLiteral(ts, start, tag);
  }

  /**
   * 解析内部JS方法 不支持
   * '%' Identifier Arguments
   * 很久以前的数组方法是用JS写的 里面的函数名都是百分比符号开头
   */
  // ParseV8Intrinsic() {
  //   let pos = this.peek_position();
  //   this.Consume('Token::MOD');
  //   let name = this.ParseIdentifier();
  //   // (
  //   if (this.peek() !== 'Token::LPAREN') throw new Error('UnexpectedToken');
  //   let args = [];
  //   let has_spread = this.ParseArguments(args);

  //   if (has_spread) throw new Error(kIntrinsicWithSpread);
  //   return this.NewV8Intrinsic(name, args, pos);
  // }

  /**
   * 解析new表达式
   * ('new')+ MemberExpression
   * 'new' '.' 'target'
   * 注释里面说 new表达式狗的一逼 比如以下的一些例子
   * new foo.bar().baz => (new (foo.bar)()).baz
   * new foo()() => (new foo())()
   * new new foo()() => (new (new foo())())
   * new new foo => new (new foo)
   * new new foo() => new (new foo())
   * new new foo().bar().baz =< (new (new foo()).bar()).baz
   * 总结起来就是
   * new会找到后面一连串的MemberExpression中第一个括号 然后进行初始化操作
   */
  ParseMemberWithPresentNewPrefixesExpression() {
    this.Consume('Token::NEW');
    let new_pos = this.position();
    let result = null;
    // CheckStackOverflow();
    // new super() 然而这个语法根本过不了
    if (this.peek() === 'Token::SUPER') {
      const is_new = true;
      result = this.ParseSuperExpression(is_new);
    }
    // new import(xxx)
    else if (this.allow_harmony_dynamic_import_ && this.peek() === 'Token::IMPORT' &&
      (!this.allow_harmony_import_meta_ || this.PeekAhead() === 'Token::LPAREN')) {
      throw new Error(kImportCallNotNewExpression);
    }
    // new.target 
    else if (this.peek() === 'Token::PERIOD') {
      result = this.ParseNewTargetExpression();
      return this.ParseMemberExpressionContinuation(result);
    }
    // new xxx 
    else {
      result = this.ParseMemberExpression();
    }
    // ( => 带参数的new表达式
    if (this.peek() === 'Token::LPAREN') {
      {
        let args = [];
        let has_spread = this.ParseArguments(args);
        if (has_spread) {
          result = this.SpreadCallNew(result, args, new_pos);
        } else {
          result = this.ast_node_factory_.NewCallNew(result, args, new_pos);
        }
      }
      return this.ParseMemberExpressionContinuation();
    }
    // 无参new
    let args = [];
    return this.ast_node_factory_.NewCallNew(result, args, new_pos);
  }

  ParseSuperExpression(is_new) {
    this.Consume('Token::SUPER');
    let pos = this.position();

    let scope = this.GetReceiverScope();
    let kind = scope.function_kind_;
    if (IsConciseMethod(kind) || IsAccessorFunction(kind) || IsClassConstructor(kind)) {
      if (IsProperty(this.peek())) {
        if (this.peek() === 'Token::PERIOD' && this.PeekAhead() === 'Token::PRIVATE_NAME') {
          this.Consume('Token::PERIOD');
          this.Consume('Token::PRIVATE_NAME');
          throw new Error(kUnexpectedPrivateField);
        }
        scope.RecordSuperPropertyUsage();
        this.UseThis();
        return this.NewSuperPropertyReference();
      }
      // 简单讲就是派生类的super()
      // new super() is never allowed.
      // super() is only allowed in derived constructor
      if (!is_new && this.peek() === 'Token::LPAREN' && IsDerivedConstructor(kind)) {
        this.expression_scope_.RecordThisUse();
        this.UseThis().set_maybe_assigned();
        return this.NewSuperCallReference(pos);
      }
    }
    throw new Error(kUnexpectedSuper);
  }
  NewSuperPropertyReference(pos) {
    let this_function_proxy = this.NewUnresolved(this.ast_value_factory_.this_function_string(), pos);
    let home_object_symbol_literal = this.ast_node_factory_.NewSymbolLiteral(kHomeObjectSymbol, kNoSourcePosition);
    let home_object = this.ast_node_factory_.NewProperty(this_function_proxy, home_object_symbol_literal, pos);
    return this.ast_node_factory_.NewSuperPropertyReference(home_object, pos);
  }
  NewSuperCallReference(pos) {
    let new_target_proxy = this.NewUnresolved(this.ast_value_factory_.new_target_string(), pos);
    let this_function_proxy = this.NewUnresolved(this.ast_value_factory_.this_function_string(), pos);
    return this.ast_node_factory_.NewSuperCallReference(new_target_proxy, this_function_proxy, pos);
  }
  NewUnresolved(name, pos = null, kind = NORMAL_VARIABLE) {
    // 怀疑函数参数的作用域this有毒
    if (pos === null) pos = this.scanner_.location().beg_pos;
    return this.scope_.NewUnresolved(this.ast_node_factory_, name, pos, kind);
  }
  NewRawVariable(name, pos) {
    return this.ast_node_factory_.NewVariableProxy(name, NORMAL_VARIABLE, pos);
  }

  /**
   * 解析函数表达式
   */
  ParseFunctionExpression() {
    this.Consume('Token::FUNCTION');
    let function_token_position = this.position();
    let function_kind = this.Check('Token::MUL') ? kGeneratorFunction : kNormalFunction;
    let name = null;
    let is_strict_reserved_name = IsStrictReservedWord(this.peek());
    let function_name_location = new Location().invalid();
    let function_type = kAnonymousExpression;
    if (this.ParsingDynamicFunctionDeclaration()) {
      this.Consume('Token::IDENTIFIER');
    }
    // let a = function b() {} 
    else if (this.peek_any_identifier()) {
      name = this.ParseIdentifier(function_kind);
      function_name_location = this.scanner_.location();
      function_type = kNamedExpression;
    }
    let result = this.ParseFunctionLiteral(name, function_name_location,
      is_strict_reserved_name ? kFunctionNameIsStrictReserved : kFunctionNameValidityUnknown,
      function_kind, function_token_position, function_type, this.language_mode(), null);
    if (result === null) return this.FailureExpression();
    return result;
  }

  /**
   * 解析import表达式
   */
  ParseImportExpressions() {
    this.Consume('Token::IMPORT');
    let pos = this.position();
    if (this.allow_harmony_import_meta_ && this.Check('Token::PERIOD')) {
      this.ExpectContextualKeyword(this.ast_value_factory_.meta_string(), 'import.meta', pos);
      if (!this.parsing_module_) {
        throw new Error(kImportMetaOutsideModule);
      }
      return this.ImportMetaExpression(pos);
    }
    this.Expect('Token::LPAREN');
    if (this.peek() === 'Token::RPAREN') {
      throw new Error(kImportMissingSpecifier);
    }
    // AcceptINScope scope(this, true);
    let previous_accept_IN_ = this.accept_IN_;
    this.accept_IN_ = true;
    let arg = this.ParseAssignmentExpressionCoverGrammar();
    this.Expect('Token::RPAREN');

    // 析构
    this.accept_IN_ = previous_accept_IN_;
    return this.ast_node_factory_.NewImportCallExpression(arg, pos);
  }

  /**
   * 解析数组字面量
   * '[' Expression? (',' Expression?)* ']'
   */
  ParseArrayLiteral() {
    let pos = this.peek_position();
    let values = [];
    let first_spread_index = -1;
    this.Consume('Token::LBRACK');
    let accumulation_scope = new AccumulationScope(this.expression_scope_);

    while (!this.Check('Token::RBRACK')) {
      let elem;
      // 直接逗号会被解析为洞
      if (this.peek() === 'Token::COMMA') {
        elem = this.ast_node_factory_.NewTheHoleLiteral();
      }
      /**
       * 处理扩展运算符
       * 注: Check已经将运算符Consume了
       */
      else if (this.Check('Token::ELLIPSIS')) {
        let start_pos = this.position();
        let expr_pos = this.peek_position();
        // AcceptINScope scope(this, true);
        let previous_accept_IN_ = this.accept_IN_;
        this.accept_IN_ = true;
        let argument = this.ParsePossibleDestructuringSubPattern(accumulation_scope);
        elem = this.ast_node_factory_.NewSpread(argument, start_pos, expr_pos);

        if (first_spread_index < 0) {
          first_spread_index = values.length;
        }

        if (argument.IsAssignment()) {
          throw new Error(kInvalidDestructuringTarget);
        }

        if (this.peek() === 'Token::COMMA') {
          throw new Error(kElementAfterRest);
        }

        this.accept_IN_ = previous_accept_IN_;
      }
      // 正常情况 
      else {
        // AcceptINScope scope(this, true);
        let previous_accept_IN_ = this.accept_IN_;
        this.accept_IN_ = true;
        elem = this.ParsePossibleDestructuringSubPattern(accumulation_scope);

        this.accept_IN_ = previous_accept_IN_;
      }
      values.push(elem);
      if (this.peek() !== 'Token::RBRACK') {
        this.Expect('Token::COMMA');
        if (elem.IsFailureExpression()) return elem;
      }
    }
    return this.ast_node_factory_.NewArrayLiteral(values, first_spread_index, pos);
  }
  ParsePossibleDestructuringSubPattern(scope) {
    if (scope) scope.Accumulate();
    let begin = this.peek_position();
    let result = this.ParseAssignmentExpressionCoverGrammar();
    if (IsValidReferenceExpression(result)) {
      if (this.IsIdentifier(result)) {
        if (result.is_parenthesized()) {
          throw new Error(kInvalidDestructuringTarget);
        }
        this.ClassifyParameter(result, begin, this.end_position());
      } else {
        throw new Error(kInvalidPropertyBindingPattern);
      }
    } else if (result.is_parenthesized() || (!result.IsPattern() && !result.IsAssignment())) {
      throw new Error(kInvalidDestructuringTarget);
    }
    return result;
  }

  /**
   * 解析对象字面量
   * '{' (PropertyDefinition (',' PropertyDefinition)* ','? )? '}'
   * {a:1} {a} {a,} {a, b: 1} 其中一个键值对就是一个PropertyDefinition
   */
  ParseObjectLiteral() {
    let pos = this.peek_position();
    /**
     * ObjectPropertyList = ScopedPtrList<v8::internal::ObjectLiteralProperty>
     * ObjectPropertyList properties(pointer_buffer());
     * ScopedPtrList作为一个公共变量容器 在作用域结束时会进行还原
     */
    // let start_ = this.pointer_buffer_.length;
    let properties = [];
    // 引用属性计数
    let number_of_boilerplate_properties = 0;
    // 是否存在待计算的键 { ['a' + 'b']: 1, ...object } 都是需要计算的
    let has_computed_names = false;
    // 扩展运算符
    let has_rest_property = false;
    // __proto__
    let has_seen_proto = false;
    // [Token::ASSIGN, Token::LBRACE, null] => [Token::LBRACE, xxx, null]
    this.Consume('Token::LBRACE');
    /**
     * 当前作用域类型如果是非表达式类型这里不做任何事
     * AccumulationScope accumulation_scope(expression_scope());
     */
    let accumulation_scope = new AccumulationScope(this.expression_scope_);
    while (!this.Check('Token::RBRACE')) {
      // FuncNameInferrerState fni_state(&fni_);
      let top_ = this.fni_.names_stack_.length;
      this.fni_.scope_depth_++;
      let prop_info = new ParsePropertyInfo(accumulation_scope);
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

      this.fni_.Infer();
      // 析构
      this.fni_.names_stack_.length = top_;
      --this.fni_.scope_depth_;
    }
    if (has_rest_property && properties.length > kMaxArguments) throw new Error(kTooManyArguments);
    let result = this.InitializeObjectLiteral(this.ast_node_factory_.NewObjectLiteral(properties, number_of_boilerplate_properties, pos, has_rest_property));
    // 析构
    // this.pointer_buffer_ = start_;
    return result;
  }
  ParseObjectPropertyDefinition(prop_info, has_seen_proto) {
    let name_token = this.peek();
    let next_loc = this.scanner_.peek_location();
    // 解析key
    let name_expression = this.ParseProperty(prop_info);

    let { name, function_flags, kind } = prop_info;
    switch (kind) {
      /**
       * 扩展运算符 { ...obj }
       */
      case kSpread:
        prop_info.is_computed_name = true;
        prop_info.is_rest = true;
        return this.ast_node_factory_.NewObjectLiteralProperty(this.ast_node_factory_.NewTheHoleLiteral(), name_expression, SPREAD, true);
      /**
       * 最常见的键值对形式 { a: 1 }、{ a: function(){} }
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
        this.SetFunctionNameFromObjectPropertyName(result, name);
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
        // 前面都是错误处理
        let lhs = this.ExpressionFromIdentifier(name, next_loc.beg_pos);
        if (!this.IsAssignableIdentifier()) throw new Error(kStrictEvalArguments);

        let value;
        // 处理{ a=1, }这种结构 虽然会被正常解析 但还是会抛出错误 所以注释算了
        if (this.peek() === 'Token::ASSIGN') {
          // this.Consume('Token::ASSIGN');
          // {
          //   // AcceptINScope scope(this, true);
          //   let previous_accept_IN_ = this.accept_IN_;
          //   this.accept_IN_ = true;
          //   let rhs = this.ParseAssignmentExpression();
          //   value = this.ast_node_factory_.NewAssignment('Token::ASSIGN', lhs, rhs, kNoSourcePosition);
          //   this.SetFunctionNameFromIdentifierRef(rhs, lhs);
          //   // 析构
          //   this.accept_IN_ = previous_accept_IN_;
          // }
          throw new Error(kInvalidCoverInitializedName);
        } else {
          value = lhs;
        }
        let result = this.ast_node_factory_.NewObjectLiteralProperty(name_expression, value, COMPUTED, false);
        // 只有匿名函数等等才会进入这里
        this.SetFunctionNameFromObjectPropertyName(result, name);
        return result;
      }
      // { a(){}, a*(){} }对象方法的简写模式解析
      case kMethod: {
        // RecordPatternError
        let kind = MethodKindFor(function_flags);
        // 解析函数 跳过函数名检测
        let value = this.ParseFunctionLiteral(name, this.scanner_.location(), kSkipFunctionNameCheck, kind,
          next_loc.beg_pos, kAccessorOrMethod, this.language_mode(), null);
        let result = this.ast_node_factory_.NewObjectLiteralProperty(name_expression, value, COMPUTED, prop_info.is_computed_name);
        return result;
      }

      case kAccessorGetter:
      case kAccessorSetter: {
        let is_get = kind === kAccessorGetter;
        if (!prop_info.is_computed_name) name_expression = this.ast_node_factory_.NewStringLiteral(name, name_expression.position_);
        let kind = is_get ? kGetterFunction : kSetterFunction;
        let value = this.ParseFunctionLiteral(name, this.scanner_.location(), kSkipFunctionNameCheck, kind,
          next_loc.beg_pos, kAccessorOrMethod, this.language_mode(), null);

        let result = this.ast_node_factory_.NewObjectLiteralProperty(name_expression, value, is_get ? GETTER : SETTER, prop_info.is_computed_name);

        let prefix = is_get ? this.ast_value_factory_.get_space_string() : this.ast_value_factory_.set_space_string();
        this.SetFunctionNameFromObjectPropertyName(result, name, prefix);
        return result;
      }

      case kClassField:
      case kNotSet:
        throw new Error('ReportUnexpectedToken');
    }
    this.UNREACHABLE();
  }
  /**
   * 这个方法负责解析对象键值对的key或class的属性
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
       * { async: 1 }, { async, }等等
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
        // 判定能否转换成int32以内的数字 因为所有字符串都存在一个HashMap中 计算hash的方式跟字符串本身相关
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
        prop_info.name = null;
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
          prop_info.name = null;
          this.Consume('Token::ELLIPSIS');
          // AcceptINScope scope(this, true);
          let previous_accept_IN_ = this.accept_IN_;
          this.accept_IN_ = true;
          // let start_pos = this.peek_position();
          /**
           * 对于...expr 直接当成简单expr解析
           */
          let expression = this.ParsePossibleDestructuringSubPattern(prop_info.accumulation_scope);
          prop_info.kind = kSpread;
          // 这里有很多其他的错误判断 就不一一列举了
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
    // 一般大部分简单键值对走到这里都是kNotSet
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

  ExpectContextualKeyword(name, fullname = null, pos = -1) {
    this.Expect('Token::IDENTIFIER');
    if (this.scanner_.CurrentSymbol(this.ast_value_factory_).literal_bytes_ !== name) {
      throw new Error('UnexpectedToken');
    }
    if (this.scanner_.literal_contains_escapes()) {
      throw new Error(kInvalidEscapedMetaProperty);
    }
  }
  // 一般用于处理成对Token的闭合推断
  Expect(token) {
    let next = this.Next();
    // V8_UNLIKELY
    if (next !== token) {
      throw new Error('UnexpectedToken');
    }
  }
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
      return;
    }
    throw new Error('UnexpectedToken');
  }

  FailureExpression() { throw new Error('UnexpectedExpression'); }
}