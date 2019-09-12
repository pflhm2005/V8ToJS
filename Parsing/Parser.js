import ParserBase from './ParserBase';
import FunctionState from './FunctionState';

import { 
  PARSE_EAGERLY, 
  kNoSourcePosition, 
  kUseCounterFeatureCount,
  kVar,
  PARAMETER_VARIABLE,
  kSloppyModeBlockScopedFunctionRedefinition,
  kWrapped,
  kShouldEagerCompile,
  kShouldLazyCompile,
  PARSE_LAZILY,
  kSloppyMode,
  kStrictMode,
  kIncludingVariables,
  kYes,
} from '../enum';

import { 
  kParamDupe,
  kVarRedeclaration, 
  kArgStringTerminatesParametersEarly, 
  kUnexpectedEndOfArgString, 
  kTooManyParameters, 
  kParamAfterRest 
} from '../MessageTemplate';
import { is_strict } from '../util';
import { Parameter } from '../ast/Ast';


/**
 * 源码中的Parser类作为模板参数impl作为模板参数传入ParseBase 同时也继承于该类
 * class Parser : public ParserBase<Parser>
 * template <typename Impl> class ParserBase {...}
 * Parser、ParserBase基本上是一个类
 */
class Parser extends ParserBase {
  constructor(info) {
    super(null, info.scanner_, info.stack_limit_, info.extension_, info.ast_value_factory_,
      info.pending_error_handler_, info.runtime_call_stats_, info.logger_,0, info.is_module(), true);
    this.info_ = info;
    // this.scanner = info.scanner_;
    this.preparser_zone_ = null;
    this.reusable_preparser_ = null;
    this.mode_ = PARSE_EAGERLY; // Lazy mode must be set explicitly.
    this.source_range_map_ = null;
    this.target_stack_ = null;
    this.total_preparse_skipped_ = 0;
    this.consumed_preparse_data_ = info.consumed_preparse_data_;
    this.preparse_data_buffer_ = null;
    this.parameters_end_pos_ = kNoSourcePosition;

    let can_compile_lazily = info.allow_lazy_compile() && !info.is_eager();
    this.default_eager_compile_hint_ = can_compile_lazily ? kShouldLazyCompile : kShouldEagerCompile;
    this.allow_lazy_ = info.allow_lazy_compile() && info.allow_lazy_parsing() && info.extension_ === null && can_compile_lazily;
    this.allow_natives_ = info.allow_natives_syntax();
    this.allow_harmony_dynamic_import_ = info.allow_harmony_dynamic_import();
    this.allow_harmony_import_meta_ = info.allow_harmony_import_meta();
    this.allow_harmony_nullish_ = info.allow_harmony_nullish();
    this.allow_harmony_optional_chaining_ = info.allow_harmony_optional_chaining();
    this.allow_allow_harmony_private_methods_ = info.allow_harmony_private_methods();
    this.use_counts_ = new Array(kUseCounterFeatureCount).fill(0);
  }
  ParseProgram(isolate, info) {
    // let runtime_timer = new RuntimeCallTimerScope(this.runtime_call_stats_, info.is_eval() ? )
    // 初始化顶层作用域
    this.DeserializeScopeChain(isolate, info, info.maybe_outer_scope_info_, kIncludingVariables);
    this.scanner_.Initialize();
    let result = this.DoParseProgram(isolate, info);

    // MaybeResetCharacterStream(info, result);
    // MaybeProcessSourceRanges(info, result, stack_limit_);
    // HandleSourceURLComments(isolate, info->script());
    return result;
  }
  DoParseProgram(isolate, info) {
    let mode = new ParsingModeScope(this, this.allow_lazy_ ? PARSE_LAZILY : PARSE_EAGERLY);
    this.ResetFunctionLiteralId();
    let result = null;
    {
      let outer = this.original_scope_;
      if (info.is_eval()) outer = this.NewEvalScope(outer);
      else if (this.parsing_module_) outer = this.NewModuleScope(info.script_scope_);
      // C++赋值深拷贝
      let scope = outer;
      scope.set_start_position(0);
      /**
       * C++空指针nullptr依然是引用传递 不同于JS的null
       * 有时候变量会在我不注意时初始化
       * 比如这里的参数是作为引用传递进去 顺便被初始化了
       */
      let function_state = new FunctionState(this.function_state_, this.scope_, scope);
      // 这里暂时不知道是新的内存空间还是旧的
      let body = [];
      if (this.parsing_module_) {}
      else if (info.is_wrapped_as_function()) this.ParseWrapped(isolate, info, body, scope, null);
      else {
        this.scope_.SetLanguageMode(info.is_strict_mode());
        this.ParseStatementList(body, 'Token::EOS');
      }

      this.scope_.end_position_ = this.peek_position();

      let parameter_count = this.parsing_module_ ? 1 : 0;
      result = this.ast_node_factory_.NewScriptOrEvalFunctionLiteral(scope, body, function_state.expected_property_count_, parameter_count);
      result.suspend_count_ = function_state.suspend_count_;
    }

    info.max_function_literal_id_ = this.function_literal_id_;
    // RecordFunctionLiteralSourceRange(result);
    return result;
  }
  DeserializeScopeChain(isolate, info, maybe_outer_scope_info_, mode) {
    this.InitializeEmptyScopeChain(info);
    // this.original_scope_ = Scope.DeserializeScopeChain(isolate, null, maybe_outer_scope_info_, info.script_scope_, this.ast_value_factory_, mode);
  }
  InitializeEmptyScopeChain(info) {
    let script_scope = this.NewScriptScope();
    info.script_scope_ = script_scope;
    this.original_scope_ = script_scope;
  }
  ParseWrapped() {}

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
  NullExpression() { return null; }
  NullIdentifier() { return null; }

  GetIdentifier() {
    return this.GetSymbol();
  }
  GetSymbol() {
    const result = this.scanner_.CurrentSymbol(this.ast_value_factory_);
    return result;
  }
  PushEnclosingName(name) {
    this.fni_.PushEnclosingName(name);
  }

  /**
   * 返回一个变量代理 继承于Expression类
   * @returns {VariableProxy}
   */
  ExpressionFromIdentifier(name, start_position, infer = kYes) {
    // 
    if (infer === kYes) {
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
      if (!declaration.initializer) continue;
      // 这里第二个参数是parsing_result.descriptor.kind 但是没有使用
      this.InitializeVariables(statements, declaration);
    }
    return this.ast_node_factory_.NewBlock(true, statements);
  }
  InitializeVariables(vector, declaration) {
    let pos = declaration.value_beg_pos;
    if (pos === kNoSourcePosition) pos = declaration.initializer.position();
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
    let is_top_level = this.scope_.AllowsLazyParsingWithoutUnresolvedVariables(this.original_scope_);
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
    /**
     * 解析完函数后再检测函数名合法性
     * 因为函数名的严格模式取决于外部作用域
     */
    language_mode = scope.language_mode();
    this.CheckFunctionName(language_mode, function_name, function_name_validity, function_name_location);
    if (is_strict(language_mode)) this.CheckStrictOctalLiteral(scope.start_position(), scope.end_position());
    let duplicate_parameters = has_duplicate_parameters ? kHasDuplicateParameters : kNoDuplicateParameters;

    let function_literal = this.ast_node_factory_.NewFunctionLiteral(
      function_name, scope, body, expected_property_count, num_parameters,
      function_length, duplicate_parameters, function_syntax_kind,
      eager_compile_hint, pos, true, function_literal_id, produced_preparse_data);
    function_literal.set_function_token_position(function_token_pos);
    function_literal.set_suspend_count(suspend_count);

    this.RecordFunctionLiteralSourceRange(function_literal);

    // if (should_post_parallel_task) {}
    if (should_infer_name) this.fni_.AddFunction(function_literal);

    return function_literal;
  }
  parse_lazily() {
    return this.mode_ === PARSE_LAZILY;
  }
  GetNextFunctionLiteralId() {
    return ++this.function_literal_id_;
  }
  SetLanguageMode(scope, mode) {
    let feature;
    if (is_sloppy(mode)) feature = kSloppyMode;
    else if (is_strict(mode)) feature = kStrictMode;
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
    if (expected_parameters_end_pos !== kNoSourcePosition) this.parameters_end_pos_ = kNoSourcePosition;

    let formals = new ParserFormalParameters(function_scope);
    {
      let formals_scope = new ParameterDeclarationParsingScope(this);
      /**
       * 类型待定
       */
      if (is_wrapped) {
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
        if (expected_parameters_end_pos !== kNoSourcePosition) {
          let position = this.peek_position();
          if (position < expected_parameters_end_pos) throw new Error(kArgStringTerminatesParametersEarly);
          else if (position > expected_parameters_end_pos) throw new Error(kUnexpectedEndOfArgString);
          return;
        }
        this.Expect('Token::RPAREN');
        let formals_end_position = this.scanner_.location().end_pos;
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
    this.ParseFunctionBody(body, function_name, pos, formals, kind, function_syntax_kind, _kBlock);
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
    if (this.IsIdentifier(pattern)) this.ClassifyParameter(pattern, pos, this.end_position());
    else parameters.is_simple = false;

    let initializer = this.NullExpression();
    // 解析参数默认值
    if (this.Check('Token::ASSIGN')) {
      parameters.is_simple = false;
      // rest参数不能有默认值
      if (parameters.has_rest) throw new Error(kRestDefaultInitializer);

      // AcceptINScope accept_in_scope(this, true);
      initializer = this.ParseAssignmentExpression();
      /**
       * 这一步基本上不会进
       * function(a = function(){}, b = class c{}) 一般人不会这么设置默认值
       */
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
   * 给函数设名字
   * 其中value可能是function也可能是class
   * @param {Expression*} value 值
   * @param {Expression*} identifier 键
   */
  SetFunctionNameFromIdentifierRef(value, identifier) {
    if (!identifier.IsVariableProxy()) return; 
    this.SetFunctionName(value, identifier.raw_name());
  }
  SetFunctionName(value, name, prefix = null) {
    /**
     * 匿名函数、属性简写、get/set才需要名字
     */
    if (!value.IsAnonymousFunctionDefinition() &&
      !value.IsConciseMethodDefinition() &&
      !value.IsAccessorFunctionDefinition()) return;
    // 这里调用了AsFunctionLiteral方法进行了强转
    let f = value;
    // 如果是class 这里同样会调用AsClassLiteral强转
    if (value.IsClassLiteral()) f = v._constructor();
    /**
     * 到这里最终会变成一个函数字面量
     * 只有FunctionLiteral类才有set_raw_name方法
     */
    if (f !== null) {
      let cons_name = null;
      if (name !== null) {
        if (prefix !== null) cons_name = this.ast_value_factory_.NewConsString(prefix, name);
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
    let parameter = new Parameter(pattern, initializer, this.scanner_.location().beg_pos, initializer_end_position, is_rest);
    parameters.params.push(parameter);
  }
  ClassifyParameter(parameters, begin, end) {
    if (this.IsEvalOrArguments(parameters)) throw new Error(kStrictEvalArguments);
  }
  CheckArityRestrictions(param_count, function_kind, has_rest, formals_start_pos, formals_end_pos) {
    if (this.HasCheckedSyntax()) return;
    if (IsGetterFunction(function_kind) && param_count !== 0) throw new Error(kBadGetterArity);
    else if (IsSetterFunction(function_kind)) {
      if (param_count !== 1) throw new Error(kBadSetterArity);
      if (has_rest) throw new Error(kBadSetterRestParameter);
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
    if (!is_simple) scope.MakeParametersNonSimple();
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

export default Parser;