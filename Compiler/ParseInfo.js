import AstValueFactory from '../ast/AstValueFactory';

import { 
  kNormalFunction, 
  kNoSourcePosition,
  kFunctionLiteralIdInvalid,
  EXTENSION_CODE,
  TYPE_EXTENSION,
  INSPECTOR_CODE,
  TYPE_INSPECTOR,
  NOT_NATIVES_CODE,
  kCollect,
  TYPE_NORMAL,
  kWrapped,
  kDeclaration,
} from "../enum";

import { 
  FLAG_always_opt, 
  FLAG_prepare_always_opt, 
  FLAG_lazy,
  FLAG_allow_natives_syntax,
  FLAG_harmony_dynamic_import,
  FLAG_harmony_import_meta,
  FLAG_harmony_private_methods,
  FLAG_harmony_optional_chaining,
  FLAG_harmony_nullish,
  FLAG_harmony_top_level_await
} from "./Flag";

// ---------- Input flags ---------------------------
const kToplevel = 1 << 0;
const kEager = 1 << 1;
const kEval = 1 << 2;
const kStrictMode = 1 << 3;
const kNative = 1 << 4;
const kParseRestriction = 1 << 5;
const kModule = 1 << 6;
const kAllowLazyParsing = 1 << 7;
const kLazyCompile = 1 << 8;
const kCollectTypeProfile = 1 << 9;
const kCoverageEnabled = 1 << 10;
const kBlockCoverageEnabled = 1 << 11;
const kIsAsmWasmBroken = 1 << 12;
const kOnBackgroundThread = 1 << 13;
const kAllowEvalCache = 1 << 14;
const kRequiresInstanceMembersInitializer = 1 << 15;
const kContainsAsmModule = 1 << 16;
const kMightAlwaysOpt = 1 << 17;
const kAllowLazyCompile = 1 << 18;
const kAllowNativeSyntax = 1 << 19;
const kAllowHarmonyPublicFields = 1 << 20;
const kAllowHarmonyStaticFields = 1 << 21;
const kAllowHarmonyDynamicImport = 1 << 22;
const kAllowHarmonyImportMeta = 1 << 23;
const kAllowHarmonyOptionalChaining = 1 << 24;
const kAllowHarmonyPrivateFields = 1 << 25;
const kAllowHarmonyPrivateMethods = 1 << 26;
const kIsOneshotIIFE = 1 << 27;
const kCollectSourcePositions = 1 << 28;
const kAllowHarmonyNullish = 1 << 29;
const kAllowHarmonyTopLevelAwait = 1 << 30;
const kREPLMode = 1 << 31;

export default class ParseInfo {
  constructor(isolate) {
    this.zone_ = null;
    this.flags_ = 0;
    this.extension_ = null;
    this.script_scope_ = null;
    // this.stack_limit_ = isolate.stack_guard().real_climit();
    // this.runtime_call_stats_ = isolate.counters().runtime_call_stats();
    // this.logger_ = isolate.logger();
    // this.ast_string_constants_ = isolate.ast_string_constants();
    this.ast_string_constants_ = null;
    this.logger_ = null;
    this.stack_limit_ = 0;
    this.runtime_call_stats_ = null;
    // this.hash_seed_ = this.HashSeed(isolate);
    this.function_kind_ = kNormalFunction;
    this.script_id_ = isolate.NextScriptId();
    this.start_position_ = 0;
    this.end_position_ = 0;
    this.parameters_end_pos_ = kNoSourcePosition;
    this.function_literal_id_ = kFunctionLiteralIdInvalid;
    this.character_stream_ = null;
    
    this.function_name_ = null;
    this.max_function_literal_id_ = 0;
   
    this.source_range_map_ = null;
    this.literal_ = null;
    
    this.script_ = null;
    this.ast_value_factory_ = new AstValueFactory();
    this.pending_error_handler_ = null;
    this.consumed_preparse_data_ = new ConsumedPreparseData();

    this.maybe_outer_scope_info_ = null;
    this.function_syntax_kind_ = kDeclaration;

    this.SetFlag(kMightAlwaysOpt, FLAG_always_opt || FLAG_prepare_always_opt);
    this.SetFlag(kAllowLazyCompile, FLAG_lazy);
    this.SetFlag(kAllowNativeSyntax, FLAG_allow_natives_syntax);
    this.SetFlag(kAllowHarmonyDynamicImport, FLAG_harmony_dynamic_import);
    this.SetFlag(kAllowHarmonyImportMeta, FLAG_harmony_import_meta);
    this.SetFlag(kAllowHarmonyOptionalChaining, FLAG_harmony_optional_chaining);
    this.SetFlag(kAllowHarmonyNullish, FLAG_harmony_nullish);
    this.SetFlag(kAllowHarmonyPrivateMethods, FLAG_harmony_private_methods);
    this.SetFlag(kAllowHarmonyTopLevelAwait, FLAG_harmony_top_level_await);
  }

  is_eval() { return this.GetFlag(kEval); }
  is_module() { return this.GetFlag(kModule); }
  set_module(v) { this.SetFlag(kModule); }

  allow_lazy_compile() { return this.GetFlag(kAllowLazyCompile); }
  allow_lazy_parsing() { return this.GetFlag(kAllowLazyParsing); }

  is_eager() { return this.GetFlag(kEager); }
  set_eager(v) { this.SetFlag(kEager, v); }

  is_wrapped_as_function() { return this.function_syntax_kind_ === kWrapped; }
  is_asm_wasm_broken() { return this.GetFlag(kIsAsmWasmBroken); }

  set_language_mode(v) { this.SetFlag(kStrictMode, v); }
  set_contains_asm_module(v) { this.SetFlag(kContainsAsmModule, v); }
  is_strict_mode() { return this.GetFlag(kStrictMode); }

  set_allow_eval_cache(v) { this.SetFlag(kAllowEvalCache, v); }
  coverage_enabled() { return this.GetFlag(kCoverageEnabled); }

  is_repl_mode() { return this.GetFlag(kREPLMode); }

  collect_type_profile() { return this.GetFlag(kCollectTypeProfile); }
  might_always_opt() { return this.GetFlag(kMightAlwaysOpt); }
  collect_source_positions() { return this.GetFlag(kCollectSourcePositions); }

  allow_natives_syntax() { return this.GetFlag(kAllowNativeSyntax); }
  allow_harmony_dynamic_import() { return this.GetFlag(kAllowHarmonyDynamicImport); }
  allow_harmony_import_meta() { return this.GetFlag(kAllowHarmonyImportMeta); }
  allow_harmony_nullish() { return this.GetFlag(kAllowHarmonyNullish); }
  allow_harmony_optional_chaining() { return this.GetFlag(kAllowHarmonyOptionalChaining); }
  allow_harmony_private_methods() { return this.GetFlag(kAllowHarmonyPrivateMethods); }

  GetFlag(f) { return (this.flags_ & f) !== 0; }
  SetFlag(f, v = false) {
    if (v) this.flags_ |= f;
    else this.flags_ &= ~f;
  }
  /**
   * 
   * @param {Isolate*} isolate V8实例
   * @param {String} source 待编译字符串
   * @param {ScriptOriginOptions} origin_options 默认构造
   * @param {NativesFlag} natives NOT_NATIVES_CODE
   */
  CreateScript(isolate, source, origin_options, natives) {
    let script = null;
    if (this.script_id_ === -1) isolate.factory_.NewScript(source);
    else script = isolate.factory_.NewScriptWithId(source, this.script_id_);
    // if (isolate.NeedsSourcePositionsForProfiling()) Script.InitLineEnds(script);

    switch(natives) {
      case EXTENSION_CODE:
        script.set_type(TYPE_EXTENSION);
        break;
      case INSPECTOR_CODE:
        script.set_type(TYPE_INSPECTOR);
        break;
      case NOT_NATIVES_CODE:
        break;
    }
    script.origin_options_ = origin_options;
    this.SetScriptForToplevelCompile(isolate, script);
    return script;
  }
  SetScriptForToplevelCompile(isolate, script) {
    this.set_script(script);
    // this.set_allow_lazy_parsing();
    this.SetFlag(kAllowLazyParsing);
    this.SetFlag(kToplevel);
    this.SetFlag(kCollectTypeProfile, isolate.type_profile_mode_ === kCollect && script.type_ === TYPE_NORMAL);
    if (script.is_wrapped()) this.function_syntax_kind_ = kWrapped;
  }
  set_script(script) {
    this.script_= script;
    // this.SetFlag(kEval, )
    this.SetFlag(kModule, script.origin_options_.IsModule());
    // if (block_coverage_enabled() && script->IsUserJavaScript()) {
    //   AllocateSourceRangeMap();
    // }
  }

  scope() {
    return this.literal_.scope_;
  }
}

class ConsumedPreparseData {}