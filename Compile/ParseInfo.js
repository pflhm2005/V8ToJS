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
} from "../ParseStatementList/enum";

import { 
  FLAG_always_opt, 
  FLAG_prepare_always_opt, 
  FLAG_lazy,
  FLAG_allow_natives_syntax,
  FLAG_harmony_dynamic_import,
  FLAG_harmony_import_meta,
  FLAG_harmony_numeric_separator,
  FLAG_harmony_private_methods
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
const kIsNamedExpression = 1 << 8;
const kLazyCompile = 1 << 9;
const kCollectTypeProfile = 1 << 10;
const kCoverageEnabled = 1 << 11;
const kBlockCoverageEnabled = 1 << 12;
const kIsAsmWasmBroken = 1 << 13;
const kOnBackgroundThread = 1 << 14;
const kWrappedAsFunction = 1 << 15;  // Implicitly wrapped as function.
const kAllowEvalCache = 1 << 16;
const kIsDeclaration = 1 << 17;
const kRequiresInstanceMembersInitializer = 1 << 18;
const kContainsAsmModule = 1 << 19;
const kMightAlwaysOpt = 1 << 20;
const kAllowLazyCompile = 1 << 21;
const kAllowNativeSyntax = 1 << 22;
const kAllowHarmonyPublicFields = 1 << 23;
const kAllowHarmonyStaticFields = 1 << 24;
const kAllowHarmonyDynamicImport = 1 << 25;
const kAllowHarmonyImportMeta = 1 << 26;
const kAllowHarmonyNumericSeparator = 1 << 27;
const kAllowHarmonyPrivateFields = 1 << 28;
const kAllowHarmonyPrivateMethods = 1 << 29;
const kIsOneshotIIFE = 1 << 30;
const kCollectSourcePositions = 1 << 31;

export default class ParseInfo {
  constructor(isolate) {
    this.zone_ = null;
    this.flags_ = 0;
    this.extension_ = null;
    this.script_scope_ = null;
    // this.stack_limit_ = isolate.stack_guard().real_climit();
    // this.hash_seed_ = this.HashSeed(isolate);
    this.function_kind_ = kNormalFunction;
    this.script_id_ = isolate.NextScriptId();
    this.start_position_ = 0;
    this.end_position_ = 0;
    this.parameters_end_pos_ = kNoSourcePosition;
    this.function_literal_id_ = kFunctionLiteralIdInvalid;
    this.character_stream_ = null;
    this.ast_value_factory_ = null;
    // this.ast_string_constants_ = isolate.ast_string_constants();
    this.function_name_ = null;
    // this.runtime_call_stats_ = isolate.counters().runtime_call_stats();
    this.source_range_map_ = null;
    this.literal_ = null;
    // this.logger_ = isolate.logger();
    this.script_ = null;

    this.SetFlag(kMightAlwaysOpt, FLAG_always_opt || FLAG_prepare_always_opt);
    this.SetFlag(kAllowLazyCompile, FLAG_lazy);
    this.SetFlag(kAllowNativeSyntax, FLAG_allow_natives_syntax);
    this.SetFlag(kAllowHarmonyDynamicImport, FLAG_harmony_dynamic_import);
    this.SetFlag(kAllowHarmonyImportMeta, FLAG_harmony_import_meta);
    this.SetFlag(kAllowHarmonyNumericSeparator, FLAG_harmony_numeric_separator);
    this.SetFlag(kAllowHarmonyPrivateMethods, FLAG_harmony_private_methods);
  }
  SetFlag(f, v = false) {
    if(v) this.flags_ |= f;
    else this.flags_ &= ~f;
  }
  set_module(v) { this.SetFlag(kModule); }
  set_eager(v) { this.SetFlag(kEager, v); }
  set_language_mode(v) { this.SetFlag(kStrictMode, v); }
  GetFlag() { return (this.flags_ & f) !== 0; }
  /**
   * 
   * @param {Isolate*} isolate V8实例
   * @param {String} source 待编译字符串
   * @param {ScriptOriginOptions} origin_options 默认构造
   * @param {NativesFlag} natives NOT_NATIVES_CODE
   */
  CreateScript(isolate, source, origin_options, natives) {
    let script = null;
    if(this.script_id_ === -1) isolate.factory_.NewScript(source);
    else script = isolate.factory_.NewScriptWithId(source, this.script_id_);
    // if(isolate.NeedsSourcePositionsForProfiling()) Script.InitLineEnds(script);

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
    this.SetFlag(kWrappedAsFunction, script.is_wrapped());
  }
  set_script(script) {
    this.script_= script;
    // this.SetFlag(kEval, )
    this.SetFlag(kModule, script.origin_options_.IsModule());
    // if (block_coverage_enabled() && script->IsUserJavaScript()) {
    //   AllocateSourceRangeMap();
    // }
  }
}