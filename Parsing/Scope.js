import {
  kVar,
  kDynamic,
  kConst,
  kNotAssigned,
  kSloppy,
  kStrict,
  NORMAL_VARIABLE,
  kCreatedInitialized,
  THIS_VARIABLE,
  kNeedsInitialization,
  kTemporary,
  EVAL_SCOPE,
  FUNCTION_SCOPE,
  MODULE_SCOPE,
  CATCH_SCOPE,
  WITH_SCOPE,
  SCRIPT_SCOPE,
  kNormalFunction,
  kDynamicGlobal,
  kNoSourcePosition,
  kMappedArguments,
  kUnmappedArguments,
  SLOPPY_FUNCTION_NAME_VARIABLE,
  CONTEXT,
  TokenEnumList,
  kMaybeAssigned,
  CLASS_SCOPE,
  kModule,
  BLOCK_SCOPE,
  kDynamicLocal,
  MODULE,
  MIN_CONTEXT_EXTENDED_SLOTS,
  MIN_CONTEXT_SLOTS,
  LOCAL,
} from "../enum";
import { Variable, AstNodeFactory } from "../ast/AST";
import {
  IsConciseMethod,
  IsClassConstructor,
  IsAccessorFunction,
  IsDerivedConstructor,
  IsClassMembersInitializerFunction,
  IsLexicalVariableMode,
  is_sloppy,
  IsArrowFunction
} from "../util";
import { kInvalidPrivateFieldResolution } from "../MessageTemplate";
// import ThreadedList from '../base/ThreadedList';

const kThisFunction = 0;
const kGeneratorObject = 1;

const kParsedScope = 0;
const kDeserializedScope = 1;

const kContinue = 0;
const kDescend = 1;

/**
 * JS不存在HashMap的数据结构
 * 由于不存在指针 所以对象之间的比较十分困难
 * 这里用hash值来做对比
 */
class VariableMap {
  constructor() {
    /**
     * 源码中是一个HashMap
     * 这里暂时用数组代替
     */
    this.variables_ = [];
    this.kIndex = 0;
  }
  Start() {
    if (!this.variables_.length) return null;
    return this.variables_[0];
  }
  Next() {
    this.kIndex++;
    if (this.variables_.length === this.kIndex) {
      this.kIndex = 0;
      return null;
    }
    return this.variables_[this.kIndex];
  }
  Lookup(name) {
    let tar = this.variables_.find(v => v.hash === name.Hash());
    return tar ? tar.value : null;
  }
  LookupOrInsert(name, hash) {
    let tar = this.variables_.find(v => v.hash === hash);
    if (!tar) {
      let p = { hash, value: null };
      this.variables_.push(p);
      return p;
    }
    return tar;
  }
  Declare(scope, name, mode, kind, initialization_flag, maybe_assigned_flag, was_added) {
    let p = this.LookupOrInsert(name, name.Hash());
    was_added = p.value === null;
    if (was_added) {
      let variable = new Variable(scope, name, mode, kind, initialization_flag, maybe_assigned_flag);
      p.value = variable;
    }
    return {
      was_added,
      variable: p.value
    };
  }
  occupancy() { return this.variables_.length; }
}

export default class Scope {
  constructor(outer_scope = null, scope_type = SCRIPT_SCOPE) {
    this.outer_scope_ = outer_scope;
    // The variables declared in this scope:
    //
    // All user-declared variables (incl. parameters).  For script scopes
    // variables may be implicitly 'declared' by being used (possibly in
    // an inner scope) with no intervening with statements or eval calls.
    this.variables_ = new VariableMap();
    this.scope_type_ = scope_type;
    this.scope_info_ = null;
    this.is_strict_ = kSloppy;
    this.scope_calls_eval_ = false;
    /**
     * ThreadedList<Declaration> decls
     * 这是一个类似于链表的数据结构
     * 主属性有tail_、head_两个属性 其中tail_是二维指针、head_是一维指针
     * 这是因为传入该list里的都是指向Declaration实例的指针
     */
    // this.decls_ = new ThreadedList();
    this.decls_ = [];
    // In case of non-scopeinfo-backed scopes, this contains the variables of the
    // map above in order of addition.
    // base::ThreadedList<Variable> locals_;
    this.locals_ = [];

    // this.SetDefaults();
    this.inner_scope_ = null;
    this.sibling_ = null;
    this.unresolved_list_ = [];

    this.start_position_ = kNoSourcePosition;
    this.end_position_ = kNoSourcePosition;

    this.calls_eval_ = false;
    this.sloppy_eval_can_extend_vars_ = false;
    this.scope_nonlinear_ = false;
    this.is_hidden_ = false;
    this.is_debug_evaluate_scope_ = false;

    this.inner_scope_calls_eval_ = false;
    this.force_context_allocation_for_parameters_ = false;

    this.is_declaration_scope_ = false;

    this.private_name_lookup_skips_outer_class_ = false;

    this.must_use_preparsed_scope_data_ = false;
    this.is_repl_mode_scope_ = false;

    this.num_stack_slots_ = 0;
    this.num_heap_slots_ = 0;

    this.set_language_mode(kSloppy);
    if (outer_scope) this.outer_scope_.AddInnerScope(this);
  }
  AddInnerScope(inner_scope) {
    inner_scope.sibling_ = this.inner_scope_;
    this.inner_scope_ = inner_scope;
    inner_scope.outer_scope_ = this;
  }

  set_start_position(statement_pos) { this.start_position_ = statement_pos; }

  is_eval_scope() { return this.scope_type_ === EVAL_SCOPE; }
  is_function_scope() { return this.scope_type_ === FUNCTION_SCOPE; }
  is_arrow_scope() { return this.is_function_scope() && IsArrowFunction(this.function_kind_); }
  is_module_scope() { return this.scope_type_ === MODULE_SCOPE; }
  is_script_scope() { return this.scope_type_ === SCRIPT_SCOPE; }
  is_catch_scope() { return this.scope_type_ === CATCH_SCOPE; }
  is_block_scope() { return this.scope_type_ === BLOCK_SCOPE || this.scope_type_ === CLASS_SCOPE; }
  is_with_scope() { return this.scope_type_ === WITH_SCOPE; }
  is_class_scope() { return this.scope_type_ === CLASS_SCOPE; }

  set_language_mode(language_mode) { this.is_strict_ = this.is_strict(language_mode); }
  set_is_repl_mode_scope() { this.is_repl_mode_scope_ = true; }
  language_mode() { return this.is_strict_ ? kStrict : kSloppy; }
  is_sloppy(language_mode) { return language_mode === kSloppy; }
  is_strict(language_mode) { return language_mode !== kSloppy; }
  ForceContextForLanguageMode() {
    if ((this.scope_type_ === FUNCTION_SCOPE) || (this.scope_type_ === SCRIPT_SCOPE)) {
      return false;
    }
    return (this.language_mode() > this.outer_scope_.language_mode());
  }

  ContextHeaderLength() {
    return this.HasContextExtensionSlot() ? MIN_CONTEXT_EXTENDED_SLOTS : MIN_CONTEXT_SLOTS;
  }
  HasContextExtensionSlot() {
    switch(this.scope_type_) {
      case MODULE_SCOPE:
      case WITH_SCOPE:
        return true;
      default:
        return this.sloppy_eval_can_extend_vars_;
    }
  }
  /**
   * 初始化origin_scope_ 即最外层作用域
   * @param {Isolate*} isolate 
   * @param {ScopeInfo} scope_info null
   * @param {DeclarationScope*} script_scope null
   * @param {AstValueFactory*} ast_value_factory 
   * @param {DeserializationMode} deserialization_mode kIncludingVariables
   */
  // DeserializeScopeChain(isolate, zone, scope_info, script_scope, ast_value_factory, deserialization_mode) {
  //   let current_scope = null;
  //   let innermost_scope = null;
  //   let outer_scope = null;
  //   while(!scope_info) {
  //   }
  // }
  AllowsLazyCompilation() {
    return !this.force_eager_compilation_ && !IsClassMembersInitializerFunction(this.function_kind_);
  }
  AllowsLazyParsingWithoutUnresolvedVariables(outer) {
    for (let s = this; s !== outer; s = s.outer_scope_) {
      if (e.is_eval_scope()) return is_sloppy(s.language_mode());
      if (s.is_catch_scope()) continue;
      if (s.is_with_scope()) continue;
      return false;
    }
    return true;
  }
  /**
   * 遍历作用域链 判定是否有未处理的变量
   * @param {Scope} outer 指定的外层作用域
   */
  AllowsLazyParsingWithoutUnresolvedVariables(outer) {
    for (let s = this; s !== outer; s = s.outer_scope_) {
      if (s.is_eval_scope()) return this.is_sloppy(s.language_mode());
      if (s.is_catch_scope()) continue;
      if (s.is_with_scope()) continue;
      return false;
    }
    return true;
  }
  FinalizeBlockScope() {
    if (this.variables_.occupancy() > 0 || (this.is_declaration_scope_ && this.calls_sloppy_eval())) {
      return this;
    }
    this.outer_scope_.RemoveInnerScope(this);
    // 重新设置作用域关系
    if (this.inner_scope_ !== null) {
      let scope = this.inner_scope_;
      scope.outer_scope_ = this.outer_scope_;
      while (scope.sibling_ !== null) {
        scope = scope.sibling_;
        scope.outer_scope_ = this.outer_scope_;
      }
      scope.sibling_ = this.outer_scope_.inner_scope_;
      this.outer_scope_.inner_scope_ = this.inner_scope_;
      this.inner_scope_ = null;
    }
    // 移动待处理变量
    if (this.unresolved_list_.length) {
      this.outer_scope_.unresolved_list_ = this.unresolved_list_;
      this.unresolved_list_.length = 0;
    }

    if (this.inner_scope_calls_eval_) this.outer_scope_.inner_scope_calls_eval_ = true;
    this.num_heap_slots_ = 0;

    return null;
  }
  RemoveInnerScope(inner_scope) {
    if (inner_scope === this.inner_scope_) {
      this.inner_scope_ = this.inner_scope_.sibling_;
      return true;
    }
    for (let scope = this.inner_scope_; scope !== null; scope = scope.sibling_) {
      if (scope.sibling_ === inner_scope) {
        scope.sibling_ = scope.sibling_.sibling_;
        return true;
      }
    }
    return false;
  }
  GetScriptScope() {
    let scope = this;
    while (!scope.is_script_scope()) {
      scope = scope.outer_scope_;
    }
    return scope;
  }
  // 这里形成一个作用域链
  GetDeclarationScope() {
    let scope = this;
    while (!scope.is_declaration_scope_) {
      scope = scope.outer_scope_;
    }
    return scope;
  }
  // 从内到外获取第一个函数作用域
  GetClosureScope() {
    let scope = this;
    while (!scope.is_declaration_scope_ || scope.is_block_scope()) scope = scope.outer_scope_;
    return scope;
  }
  // 返回第一个有this的作用域
  GetReceiverScope() {
    let scope = this;
    while (!scope.is_declaration_scope_ || (!scope.is_script_scope() && !scope.has_this_declaration_)) scope = scope.outer_scope_;
    return scope;
  }
  GetClassScope() {
    let scope = this;
    while (scope !== null && !scope.is_class_scope()) scope = scope.outer_scope_;
    if (scope !== null && scope.is_class_scope()) return scope;
    return null;
  }
  HasSimpleParameters() {
    let scope = this.GetClosureScope();
    return !scope.is_function_scope() || scope.has_simple_parameters_;
  }
  LookupInScopeOrScopeInfo(name) {
    let variable = this.variables_.Lookup(name);
    if (variable !== null || this.scope_info_) return variable;
    // 这里逻辑太复杂 先简化处理
    return null;
    // return LookupInScopeInfo(name, this);
  }
  // LookupInScopeInfo() {
  //   let name_handle = name.literal_bytes_;
  //   let found = false;
  //   let location = CONTEXT;
  //   let index = 0;
  //   {
  //     index = ScopeInfo.ContextSlotIndex(this.scope_info_, name_handle, mode, )
  //   }
  // }
  /**
   * 根据name生成一个Variable实例 绑定到Declaration上面
   * @param {Declaration} declaration 声明表达式
   * @param {AstRawString*} name 变量名
   * @param {int} pos 声明位置
   * @param {VariableMode} mode kVar、kLet、kConst
   * @param {VariableKind} kind NORMAL_VARIABLE
   * @param {InitializationFlag} init kCreatedInitialized、kNeedsInitialization
   * @param {Boolean} was_added 代表是否第一次声明
   * @param {Boolean} sloppy_mode_block_scope_function_redefinition 函数重定义
   * @param {Boolean} ok 成功声明或赋值
   */
  DeclareVariable(declaration, name, pos, mode, kind, init, was_added, sloppy_mode_block_scope_function_redefinition, ok) {
    // 变量提升 往上搜索第一个有效作用域
    if (mode === kVar && !this.is_declaration_scope_) {
      return this.GetDeclarationScope().DeclareVariable(declaration, name, pos, mode, kind, init, was_added, sloppy_mode_block_scope_function_redefinition, ok);
    }
    let variable = this.LookupLocal(name);
    was_added = variable === null;
    // 第一次声明
    if (was_added) {
      /**
       * "eval(var a = 1;)"
       * 属于动态声明的变量
       */
      if (this.is_eval_scope() && this.is_sloppy(this.language_mode()) && mode === kVar) {
        // variable = this.NonLocal(name, kDynamic);
        variable.set_is_used();
      }
      // 正常声明
      else {
        variable = this.DeclareLocal(name, mode, kind, was_added, init);
      }
    } else {
      variable.set_maybe_assigned();
      // 重复定义处理
      // if () {}
    }

    this.decls_.push(declaration);
    declaration.set_var(variable);
    return { was_added, sloppy_mode_block_scope_function_redefinition };
  }
  DeclareCatchVariableName() {
    let { variable } = this.Declare(name, kVar, NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false);
    return variable;
  }
  DeclareLocal(name, mode, kind, was_added_param, init_flag) {
    let { was_added, variable } = this.variables_.Declare(this, name, mode, kind, init_flag, kNotAssigned, was_added_param);
    if (was_added) this.locals_.push(variable);

    // 作用域判断
    if (this.is_script_scope() || this.is_module_scope()) {
      if (mode !== kConst) variable.set_maybe_assigned();
      variable.set_is_used();
    }
    return variable;
  }
  /**
   * 声明一个特殊变量
   * @param {AstRawString*} name 变量名
   * @param {VariableMode*} mode 声明类型
   * @param {VariableKind*} kind 变量类型
   * @param {InitializationFlag*} initialization_flag 
   * @param {MaybeAssignedFlag*} maybe_assigned_flag 
   * @param {bool*} was_added 
   */
  Declare(name, mode, kind, initialization_flag, maybe_assigned_flag, was_added_param) {
    let { was_added, variable } = this.variables_.Declare(this, name, mode, kind, initialization_flag, maybe_assigned_flag, was_added_param);
    if (was_added) this.locals_.push(variable);
    return { was_added, variable };
  }
  /**
   * JS新出的Map类 has仅仅返回true、false
   * 所以需要对返回值做一些处理
   */
  LookupLocal(name) {
    return this.variables_.Lookup(name);
  }
  FindVariableDeclaredIn(scope, mode_limit) {
    let variables = scope.variables_.variables_;
    let l = variables.length;
    for (let i = 0; i < l; i++) {
      let name = variables[i].value.name_;
      let variable = this.LookupLocal(name);
      if (variable !== null && variable.mode() <= mode_limit) return name;
    }
    return null;
  }
  num_var() { return this.variables_.occupancy(); }

  AddUnresolved(proxy) {
    this.unresolved_list_.push(proxy);
  }

  DeclareDefaultFunctionVariables(ast_value_factory) {
    // 生成this变量
    this.DeclareThis(ast_value_factory);
    // 生成.new.target变量
    this.new_target_ = this.Declare(ast_value_factory.GetOneByteStringInternal(
      ast_value_factory.new_target_string()), kConst, NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false).variable;
    if (IsConciseMethod(this.function_kind_) || IsClassConstructor(this.function_kind_) || IsAccessorFunction(this.function_kind_)) {
      this.EnsureRareData().this_function = this.Declare(ast_value_factory.GetOneByteStringInternal(
        ast_value_factory.this_function_string()), kConst, NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false).variable;
    }
  }
  DeclareThis(ast_value_factory) {
    let derived_constructor = IsDerivedConstructor(this.function_kind_);
    let p1 = derived_constructor ? kConst : kVar;
    let p2 = derived_constructor ? kNeedsInitialization : kCreatedInitialized;
    this.receiver_ = new Variable(this, ast_value_factory.GetOneByteStringInternal(ast_value_factory.this_string()), p1, THIS_VARIABLE, p2, kNotAssigned);
  }
  MakeParametersNonSimple() {
    this.SetHasNonSimpleParameters();
    for (let p of this.variables_.variables_) {
      let variable = p.value;
      if (variable.is_parameter()) variable.MakeParameterNonSimple();
    }
  }
  SetHasNonSimpleParameters() {
    this.has_simple_parameters_ = false;
  }
  SetMustUsePreparseData() {
    if (this.must_use_preparsed_scope_data_) return;
    this.must_use_preparsed_scope_data_ = true;
    if (this.outer_scope_) this.outer_scope_.SetMustUsePreparseData();
  }
  /**
   * ...
   * @param {AstRawString*} name 参数名
   * @param {VariableMode} mode 声明模式
   * @param {bool} is_optional 是否有默认值
   * @param {bool} is_rest rest参数
   * @param {AstValueFactory*} ast_value_factory 
   * @param {int} position 
   */
  DeclareParameter(name, mode, is_optional, is_rest, ast_value_factory, position) {
    let variable = null;
    if (mode === kTemporary) {
      variable = this.NewTemporary(name);
    }
    else {
      variable = this.LookupLocal(name);
    }
    this.has_rest_ = is_rest;
    variable.initializer_position_ = position;
    this.params_.push(variable);
    if (!is_rest) ++this.num_parameters_;
    if (name === ast_value_factory.arguments_string()) this.has_arguments_parameter_ = true;
    variable.set_is_used();
    return variable;
  }

  NeedsContext() { return this.num_heap_slots_ > 0; }
  GetArgumentsType() {
    return this.is_sloppy(this.language_mode()) && this.has_simple_parameters_ ? kMappedArguments : kUnmappedArguments;
  }
  NewTemporary(name, maybe_assigned = kMaybeAssigned) {
    let scope = this.GetClosureScope();
    let variable = new Variable(scope, name, kTemporary, NORMAL_VARIABLE, kCreatedInitialized);
    scope.AddLocal(variable);
    if (maybe_assigned === kMaybeAssigned) variable.set_maybe_assigned();
    return variable;
  }
  NewUnresolved(factory, name, start_pos, kind = NORMAL_VARIABLE) {
    let proxy = factory.NewVariableProxy(name, kind, start_pos);
    this.AddUnresolved(proxy);
    return proxy;
  }
  RecordInnerScopeEvalCall() {
    this.inner_scope_calls_eval_ = true;
    for (let scope = this.outer_scope_; scope !== null; scope = scope.outer_scope_) {
      if (scope.inner_scope_calls_eval_) return;
      scope.inner_scope_calls_eval_ = true;
    }
  }
}

/**
 * 保留该类 但是不作为实例化对象
 */
export class DeclarationScope extends Scope {
  constructor(outer_scope = null, scope_type = SCRIPT_SCOPE, function_kind) {
    super(outer_scope, scope_type);
    this.sloppy_block_functions_ = [];
    this.params_ = [];
    this.function_kind_ = function_kind;
    this.num_parameters_ = 0;
    this.SetDefaults();
  }
  SetDefaults() {
    this.is_declaration_scope_ = true;
    this.has_simple_parameters_ = true;
    this.is_asm_module_ = false;
    this.force_eager_compilation_ = false;
    this.has_arguments_parameter_ = false;
    this.scope_uses_super_property_ = false;
    this.has_checked_syntax_ = false;
    this.has_this_reference_ = false;
    this.has_this_declaration_ = (this.is_function_scope() && !this.is_arrow_scope()) || this.is_module_scope();
    this.has_rest_ = false;
    this.receiver_ = null;
    this.new_target_ = null;
    this.function_ = null;
    this.arguments_ = null;
    this.rare_data_ = null;
    this.should_eager_compile_ = false;
    this.was_lazily_parsed_ = false;
    this.is_skipped_function_ = false;
    this.preparse_data_builder_ = null;
  }
  static Analyze(info) {
    let scope = info.literal_.scope_;
    if (info.maybe_outer_scope_info_ !== null) {
      // TODO
    }

    if (scope.is_eval_scope() && is_sloppy(scope.language_mode())) {
      let factory = new AstNodeFactory(info.ast_value_factory_);
      scope.HoistSloppyBlockFunctions(factory);
    }

    scope.set_should_eager_compile();
    if (scope.must_use_preparsed_scope_data_) {
      // TODO
    }
    if (!scope.AllocateVariables(info)) return false;
    scope.GetScriptScope().RewriteReplGlobalVariables();
    return true;
  }
  AllocateVariables(info) {
    if (this.is_module_scope()) this.AllocateModuleVariables();

    // let private_name_scope_iter = new PrivateNameScopeIterator(this);
    // if (!private_name_scope_iter.Done() && !private_name_scope_iter.GetScope().ResolvePrivateNames()) {
    //   return false;
    // }

    if (!this.ResolveVariablesRecursively(info)) {
      return false;
    }

    if (!this.was_lazily_parsed_) this.AllocateVariablesRecursively();

    return true;
  }
  ResolveVariablesRecursively(info) {
    if (this.WasLazilyParsed(this)) {
      // TODO
    } else {
      for (let proxy of this.unresolved_list_) {
        this.ResolveVariable(info, proxy);
      }
      for (let scope = this.inner_scope_; scope !== null; scope = scope.sibling_) {
        if (!scope.ResolveVariablesRecursively(info)) return false;
      }
    }
    return true;
  }
  ResolveVariable(info, proxy) {
    let variable = this.Lookup(kParsedScope, proxy, this, null);
    this.ResolveTo(info, proxy, variable);
  }
  Lookup(mode, proxy, scope, outer_scope_end, entry_point = null, force_context_allocation = false) {
    if (mode === kDeserializedScope) {
      let variable = entry_point.variables_.Lookup(proxy.raw_name());
      if (variable !== null) return variable;
    }

    while (true) {
      if (mode === kDeserializedScope && scope.is_debug_evaluate_scope_) {
        return entry_point.NonLocal(proxy.raw_name(), kDynamic);
      }

      let variable = mode === kParsedScope ?
        scope.LookupLocal(proxy.raw_name()) : scope.LookupInScopeInfo(proxy.raw_name(), entry_point);

      if (variable !== null && !(scope.is_eval_scope() && variable.mode() === kDynamic)) {
        if (mode === kParsedScope && force_context_allocation && !variable.is_dynamic()) {
          variable.ForceContextAllocation();
        }
        return variable;
      }

      if (scope.outer_scope_ === outer_scope_end) break;

      if (scope.is_with_scope()) {
        return this.LookupWith(proxy, scope, outer_scope_end, entry_point, force_context_allocation);
      }

      if (scope.is_declaration_scope_ && scope.sloppy_eval_can_extend_vars_) {
        return this.LookupSloppyEval(proxy, scope, outer_scope_end, entry_point, force_context_allocation);
      }

      force_context_allocation |= scope.is_function_scope();
      scope = scope.outer_scope_;

      if (mode === kParsedScope && scope.scripe_info_ !== null) {
        return this.Lookup(kDeserializedScope, proxy, scope, outer_scope_end, scope);
      }
    }
    if (mode === kParsedScope && !scope.is_script_scope()) {
      return null;
    }

    return scope.DeclareDynamicGlobal(proxy.raw_name(), NORMAL_VARIABLE, mode === kDeserializedScope ? entry_point : scope);
  }
  LookupWith() { }
  LookupSloppyEval() { }
  ResolveTo(info, proxy, variable) {
    this.UpdateNeedsHoleCheck(variable, proxy, this);
    proxy.BindTo(variable);
  }
  UpdateNeedsHoleCheck(variable, proxy, scope) {
    if (variable.mode() === kDynamicLocal) {
      return this.UpdateNeedsHoleCheck(variable.local_if_not_shadowed_, proxy, scope);
    }
    if (Variable.initialization_flag() === kCreatedInitialized) return;

    if (variable.location() === MODULE && !variable.IsExport()) {
      return this.SetNeedsHoleCheck(variable, proxy);
    }

    if (variable.scope_.GetClosureScope() !== scope.GetClosureScope()) {
      return this.SetNeedsHoleCheck(variable, proxy);
    }

    if (variable.scope_.scope_nonlinear_ || variable.initializer_position_ >= proxy.position_) {
      return this.SetNeedsHoleCheck(variable, proxy);
    }
  }
  SetNeedsHoleCheck(variable, proxy) {
    proxy.set_needs_hole_check();
    variable.ForceHoleInitialization();
  }

  AllocateVariablesRecursively() {
    this.ForEach((scope) => {
      if (this.WasLazilyParsed(scope)) return kContinue;

      if (scope.is_declaration_scope_) {
        if (scope.is_function_scope()) {
          scope.AllocateParameterLocals();
        }
        scope.AllocateReceiver();
      }
      scope.AllocateNonParameterLocalsAndDeclaredGlobals();

      let must_have_context = scope.is_with_scope() || scope.is_module_scope() ||
        scope.is_asm_module_ || scope.ForceContextForLanguageMode() || 
        (scope.is_function_scope() && scope.sloppy_eval_can_extend_vars_) ||
        (scope.is_block_scope() && scope.is_declaration_scope_ && scope.sloppy_eval_can_extend_vars_);

      if (scope.num_heap_slots_ === scope.ContextHeaderLength() && !must_have_context) {
        scope.num_heap_slots_ = 0;
      }

      return kDescend;
    });
  }
  AllocateParameterLocals() {}
  AllocateReceiver() {
    if (!this.has_this_declaration_) return;
    this.AllocateParameter(this.receiver_, -1);
  }
  AllocateNonParameterLocalsAndDeclaredGlobals() {
    for (let local of this.locals_) {
      this.AllocateNonParameterLocal(local);
    }
    if (this.is_declaration_scope_) {
      this.AllocateLocals();
    }
  }
  AllocateNonParameterLocal(variable) {
    if (variable.IsUnallocated() && this.MustAllocate(variable)) {
      if (this.MustAllocateInContext(variable)) {
        this.AllocateHeapSlot(variable);
      } else {
        this.AllocateStackSlot(variable);
      }
    }
  }
  AllocateLocals() {
    if (this.function_ !== null && this.MustAllocate(this.function_)) {
      this.AllocateNonParameterLocal(this.function_);
    } else {
      this.function_ = null;
    }
  }
  AllocateHeapSlot(variable) {
    variable.AllocateTo(CONTEXT, this.num_heap_slots_++);
  }
  AllocateStackSlot(variable) {
    if (this.is_block_scope()) {
      this.outer_scope_.GetDeclarationScope().AllocateStackSlot(variable);
    } else {
      variable.AllocateTo(LOCAL, this.num_stack_slots_++);
    }
  }
  MustAllocate(variable) {
    if (!variable.name_.IsEmpty() && (this.inner_scope_calls_eval_ || this.is_catch_scope() || this.is_script_scope())) {
      variable.set_is_used();
      if (this.inner_scope_calls_eval_ && !variable.is_this()) variable.SetMaybeAssigned();

      return !variable.IsGlobalObjectProperty() && variable.is_used();
    }
  }
  MustAllocateInContext(variable) {
    let mode = variable.mode();
    if (mode === kTemporary) return false;
    if (this.is_catch_scope()) return true;
    if (this.is_script_scope() || this.is_eval_scope()) {
      if (IsLexicalVariableMode(mode)) {
        return true;
      }
    }
    return variable.has_forced_context_allocation() || this.inner_scope_calls_eval_;
  }
  ForEach(callback) {
    let scope = this;
    while (true) {
      let iteration = callback(scope);
      if ((iteration === kDescend) && scope.inner_scope_ !== null) {
        scope = scope.inner_scope_;
      } else {
        while (scope.sibling_ === null) {
          if (scope === this) return;
          scope = scope.outer_scope_;
        }
        if (scope === this) return;
        scope = scope.sibling_;
      }
    }
  }

  RewriteReplGlobalVariables() {
    if (!this.is_repl_mode_scope_) return;
    let vars = this.variables_.variables_;
    for (let p = this.variables_.Start(); p !== null; p = this.variables_.Next()) {
      let variable = p.value;
      variable.RewriteLocationForRepl();
    }
  }

  WasLazilyParsed(scope) {
    return scope.is_declaration_scope_ && scope.was_lazily_parsed_;
  }
  set_should_eager_compile() {
    this.should_eager_compile_ = !this.was_lazily_parsed_;
  }
  EnsureRareData() {
    if (this.rare_data_ === null) {
      this.rare_data_ = {
        this_function: null,
        generator_object: null
      };
    }
    return this.rare_data_;
  }
  AddLocal(variable) {
    this.locals_.push(variable);
  }
  parameter(index) {
    return this.params_[index];
  }
  // rest参数只会出现在最后一位
  rest_parameter() {
    return this.has_rest_ ? this.params_[this.params_.length - 1] : null;
  }
  this_function_var() {
    let this_function = this.GetRareVariable(kThisFunction);
    return this_function;
  }
  GetRareVariable(id) {
    if (this.rare_data_ === null) return null;
    return this.rare_data_.this_function;
  }
  RecordSuperPropertyUsage() {
    this.scope_uses_super_property_ = true;
  }
  DeclareGeneratorObjectVar(name) {
    let result = this.NewTemporary(name, kNotAssigned);
    this.EnsureRareData().generator_object = result;
    return result;
  }
  DeclareDynamicGlobal(name, kind, cache) {
    return cache.variables_.Declare(this, name, kDynamicGlobal, kind, kCreatedInitialized, kNotAssigned, false).variable;
  }
  calls_sloppy_eval() {
    return !this.is_script_scope() && this.scope_calls_eval_ && is_sloppy(this.language_mode());
  }
  DeclareFunctionVar(name, cache = null) {
    if (cache === null) cache = this;
    let kind = is_sloppy(this.language_mode()) ? SLOPPY_FUNCTION_NAME_VARIABLE : NORMAL_VARIABLE;
    this.function_ = new Variable(this, name, kConst, kind, kCreatedInitialized);
    if (this.calls_sloppy_eval()) cache.NonLocal(name, kDynamic);
    else cache.variables_.push(this.function_);
    return this.function_;
  }
  DeclareSloppyBlockFunction(sloppy_block_function) {
    this.sloppy_block_functions_.push(sloppy_block_function);
  }
  ForceEagerCompilation() {
    let s = null;
    for (s = this; !s.is_script_scope(); s = s.outer_scope_.GetClosureScope()) {
      s.force_eager_compilation_ = true;
    }
    s.force_eager_compilation_ = true;
  }
  /**
   * 这个提升说白了就是函数名查重
   * @param {AstNodeFactory*} factory 工厂方法
   */
  HoistSloppyBlockFunctions(factory) {
    if (!this.sloppy_block_functions_.length) return;
    let parameter_scope = this.HasSimpleParameters() ? this : this.outer_scope_;
    let decl_scope = this;
    while (decl_scope.is_eval_scope()) decl_scope = decl_scope.outer_scope_.GetDeclarationScope();

    let outer_scope = decl_scope.outer_scope_;
    for (let sloppy_block_function of this.sloppy_block_functions_) {
      let name = sloppy_block_function.name();
      /**
       * 检测函数名是否与参数名冲突
       * function a(a) {call(a)}; a(1); 此时会优先形参，函数名会被过滤掉
       */
      let maybe_parameter = parameter_scope.LookupLocal(name);
      if (maybe_parameter !== null && maybe_parameter.is_parameter()) continue;

      /**
       * 检测函数名是否与某个let、const声明的变量名冲突
       * function a() { let a = 1; } 此时在函数内部 函数名会被锁死无法获取
       */
      let query_scope = sloppy_block_function.scope().outer_scope_;
      let variable = null;
      let should_hoist = true;
      do {
        variable = query_scope.LookupInScopeOrScopeInfo(name);
        /**
         * 当作用域出现一个var声明类型的变量时 提升取消
         * var a = 1与var a = function(){}均会覆盖后面的function a(){}
         * 函数a会被解析 但是不会进入外部作用域变量池
         */
        if (variable !== null && IsLexicalVariableMode(variable.mode())) {
          should_hoist = false;
          break;
        }
        query_scope = query_scope.outer_scope_;
      } while (query_scope !== outer_scope);

      if (!should_hoist) continue;
      /**
       * @description 
       * 以下是函数声明提升的核心原理
       * 将当前函数名作为变量 插入到外部作用域的变量池中
       * 走一套完整的赋值流程 function fn(){}等于var fn = function() {}
       */
      if (factory) {
        let pos = sloppy_block_function.position_;
        let declaration = factory.NewVariableDeclaration(pos);
        let variable = this.DeclareVariable(declaration, name, pos, kVar, NORMAL_VARIABLE,
          Variable.DefaultInitializationFlag(kVar), false/* &was_added */, null, true/* &ok */);
        let source = factory.NewVariableProxy(sloppy_block_function.var_);
        let target = factory.NewVariableProxy(variable);
        let assignment = factory.NewAssignment(sloppy_block_function.init(), target, source, pos);
        let statement = factory.NewExpressionStatement(assignment, pos);
        sloppy_block_function.statement_ = statement;
      } else {
        let variable = this.DeclareVariableName(name, kVar, false);
        if (sloppy_block_function.init() === TokenEnumList.indexOf('Token::ASSIGN')) variable.set_maybe_assigned();
      }
    }
  }
}

export class FunctionDeclarationScope extends DeclarationScope {
  constructor(outer_scope, scope_type, function_kind = kNormalFunction) {
    super(outer_scope, scope_type, function_kind);
  }
  /**
   * 由于arguments参数仅出现在function中
   * 所以这个方法可以不用放到Scope上
   */
  DeclareArguments(ast_value_factory) {
    let { was_added, variable } = this.Declare(ast_value_factory.GetOneByteStringInternal(ast_value_factory.arguments_string()), kVar,
      NORMAL_VARIABLE, kCreatedInitialized, kNotAssigned, false);
    this.arguments_ = variable;
    /**
     * 若arguments变量已经被定义 且是通过let、const声明
     * 此时默认的arguments变量为null => function fn(){let arguments = 1;}
     * 但是如果是通过var定义arguments 此时会依然生成该变量
     */
    if (!was_added && IsLexicalVariableMode(this.arguments_.mode())) {
      this.arguments_ = null;
    }
  }
}

export class ScriptDeclarationScope extends DeclarationScope {
  constructor(ast_value_factory) {
    super(null, SCRIPT_SCOPE, kNormalFunction);
    this.receiver_ = this.DeclareDynamicGlobal(ast_value_factory.GetOneByteStringInternal(ast_value_factory.this_string()), THIS_VARIABLE, this);
  }
}

class SourceTextModuleDescriptor {
  constructor() {
    this.module_requests_ = null;
    this.special_exports_ = null;
    this.namespace_imports_ = null;
    this.regular_exports_ = null;
    this.regular_imports_ = null;
  }
}

export class ModuleScope extends DeclarationScope {
  constructor(script_scope, avfactory) {
    super(script_scope, MODULE_SCOPE, kModule);
    this.module_descriptor_ = new SourceTextModuleDescriptor();
    this.set_language_mode(kStrict);
    this.DeclareThis(avfactory);
  }
}

export class ClassScope extends Scope {
  constructor(outer_scope, is_anonymous) {
    super(outer_scope, CLASS_SCOPE);
    this.rare_data_ = {
      unresolved_private_names: [],
      private_name_map: [],
      brand: null,
    };
    this.rare_data_and_is_parsing_heritage_ = {
      Pointer: this.rare_data_,
      Payload: false,
    };
    this.is_anonymous_class_ = is_anonymous;
    this.set_language_mode(kStrict);

    this.class_variable_ = null;
    this.has_static_private_methods_ = false;
    this.has_explicit_static_private_methods_access_ = false;
    this.should_save_class_variable_index_ = false;
  }
  GetRareData() {
    return this.rare_data_and_is_parsing_heritage_.Pointer;
  }
  IsParsingHeritage() {
    return this.rare_data_and_is_parsing_heritage_.Payload;
  }
  EnsureRareData() {
    return this.rare_data_;
  }
  brand() {
    return this.rare_data_.brand;
  }
  ResolvePrivateNamesPartially() {
    let rare_data_ = this.rare_data_;
    if (rare_data_ === null || !rare_data_.unresolved_private_names.length) {
      return null;
    }
    return null;
  }
  DeclareBrandVariable(ast_value_factory, is_statis_flag, class_token_pos) {
    let { variable: brand } = this.Declare(ast_value_factory.dot_brand_string(), kConst,
      NORMAL_VARIABLE, kNeedsInitialization, kMaybeAssigned, false);
    brand.set_is_static_flag();
    brand.ForceContextAllocation();
    brand.set_is_used();
    this.EnsureRareData().brand = brand;
    brand.initializer_position_ = class_token_pos;
    return brand;
  }
  GetUnresolvedPrivateNameTail() {
    if (this.rare_data_ === null) return [];
    return this.rare_data_.unresolved_private_names.end();
  }
  AddUnresolvedPrivateName(proxy) {
    this.EnsureRareData().unresolved_private_names.push(proxy);
  }
  should_save_class_variable_index() {
    return this.should_save_class_variable_index_ || this.has_explicit_static_private_methods_access_ ||
      (this.has_static_private_methods_ && this.inner_scope_calls_eval_);
  }
  DeclareClassVariable(ast_value_factory, name, class_token_pos) {
    let { variable } = this.Declare(name === null ? ast_value_factory.dot_string() : name,
      kConst, NORMAL_VARIABLE, kNeedsInitialization, kMaybeAssigned, false);
    this.class_variable_ = variable;
    this.class_variable_.initializer_position_ = class_token_pos;
    return this.class_variable_;
  }
  ResolvePrivateNames() {
    let rare_data_ = this.GetRareData();
    if (rare_data_ === null || !rare_data_.unresolved_private_names.length) {
      return true;
    }

    let list = rare_data_.unresolved_private_names;
    for (let proxy of list) {
      let variable = this.LookupPrivateName(proxy);
      if (variable === null) {
        throw new Error(kInvalidPrivateFieldResolution);
      } else {
        proxy.BindTo(variable);
      }
    }
  }
}

class PrivateNameScopeIterator {
  constructor(start) {
    this.start_scope_ = start;
    this.current_scope_ = start;
    this.skipped_any_scopes_ = false;
    // if (!start.is_class_scope || start.IsParsingHeritage()) {
    //   this.Next();
    // }
  }
  IsParsingHeritage() {
    return false;
  }
  GetScope() {
    return this.current_scope_;
  }
  Next() {
    let inner = this.current_scope_;
    let scope = inner.outer_scope_;
    while (scope !== null) {
      if (scope.is_class_scope()) {
        if (!inner.private_name_lookup_skips_outer_class_) {
          this.current_scope_ = scope;
          return;
        }
        this.skipped_any_scopes_ = true;
      }
      inner = scope;
      scope = scope.outer_scope_;
    }
    this.current_scope_ = null;
  }
  Done() {
    return this.current_scope_ === null;
  }
}
