import { 
  kVar,
  kDynamic,
  kConst,
  kNotAssigned,
} from "../base/Const";
import { Variable } from "../ast/AST";
// import ThreadedList from '../base/ThreadedList';

class ZoneObject {};

const CLASS_SCOPE = 0;  // class作用域 class a {};
const EVAL_SCOPE = 1; // eval作用域 eval("var a = 1;")
const FUNCTION_SCOPE = 2; // 函数作用域 function a() {}
const MODULE_SCOPE = 3; // 模块作用域 export default {}
const SCRIPT_SCOPE = 4; // 最外层作用域 默认作用域
const CATCH_SCOPE = 5;  // catch作用域  try{}catch(){}
const BLOCK_SCOPE = 6;  // 块作用域 {}
const WITH_SCOPE = 7; // with作用域 with() {}

const kSloppy = 0;
const kStrict = 1;

class VariableMap {
  constructor() {
    this.variables_ = new Map();
  }
  Lookup(name) {
    if (this.variables_.has(name)) {
      return this.variables_.get(name);
    }
    return null;
  }
  LookupOrInsert(name, hash) {
    if (!this.variables_.has(name)){
      let p = { hash, value: null };
      this.variables_.set(name, p);
      return p;
    }
    return this.variables_.get(name);
  }
  Declare(zone, scope, name, mode, kind, initialization_flag, maybe_assigned_flag, was_added) {
    let p = this.LookupOrInsert(name, name.Hash(), zone);
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
}

export default class Scope extends ZoneObject {
  constructor(zone, outer_scope = null, scope_type = SCRIPT_SCOPE) {
    super();
    this.outer_scope_ = outer_scope;
    this.inner_scope_ = null;
    this.is_declaration_scope_ = 1;

    this.scope_type_ = scope_type;

    this.is_strict_ = kSloppy;

    // The variables declared in this scope:
    //
    // All user-declared variables (incl. parameters).  For script scopes
    // variables may be implicitly 'declared' by being used (possibly in
    // an inner scope) with no intervening with statements or eval calls.
    this.variables_ = new VariableMap();
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

    /**
     * 内存管理相关
     */
    this.zone_ = null;
  }
  zone() { return this.zone_; }

  is_eval_scope() { return this.scope_type_ == EVAL_SCOPE; }
  is_function_scope() { return this.scope_type_ == FUNCTION_SCOPE; }
  is_module_scope() { return this.scope_type_ == MODULE_SCOPE; }
  is_script_scope() { return this.scope_type_ == SCRIPT_SCOPE; }
  is_catch_scope() { return this.scope_type_ == CATCH_SCOPE; }
  is_block_scope() {
    return this.scope_type_ == BLOCK_SCOPE || this.scope_type_ == CLASS_SCOPE;
  }
  is_with_scope() { return this.scope_type_ == WITH_SCOPE; }
  is_declaration_scope() { return this.is_declaration_scope_; }
  is_class_scope() { return this.scope_type_ == CLASS_SCOPE; }

  language_mode() { return this.is_strict_ ? kStrict : kSloppy; }
  is_sloppy(language_mode) { return language_mode === kSloppy; }
  is_strict(language_mode) { return language_mode !== kSloppy; }

  // 当前作用域标记
  is_declaration_scope() { return this.is_declaration_scope_; }
  declarations() { return this.decls_; }
  outer_scope() { return this.outer_scope_; }
  // 这里形成一个作用域链
  GetDeclarationScope() {
    let scope = this;
    while (!scope.is_declaration_scope()) {
      scope = scope.outer_scope();
    }
    return scope.AsDeclarationScope();
  }
  AsDeclarationScope() {
    return new DeclarationScope();
  }
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
    if (mode === kVar && !this.is_declaration_scope()) {
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
  DeclareLocal(name, mode, kind, was_added_param, init_flag) {
    let { was_added, variable } = this.variables_.Declare(this.zone(), this, name, mode, kind, init_flag, kNotAssigned, was_added_param);
    if (was_added) this.locals_.push(variable);

    // 作用域判断
    if (this.is_script_scope() || this.is_module_scope()) {
      if (mode !== kConst) variable.set_maybe_assigned();
      variable.set_is_used();
    }
    return variable;
  }
  /**
   * JS新出的Map类 has仅仅返回true、false
   * 所以需要对返回值做一些处理
   */
  LookupLocal(name) {
    return this.variables_.Lookup(name);
  }
}

// class DeclarationScope extends Scope {
//   constructor() {
//     super();
//   }
// }

