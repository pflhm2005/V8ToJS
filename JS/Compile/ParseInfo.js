import { 
  kNormalFunction, 
  kNoSourcePosition,
  kFunctionLiteralIdInvalid,
  kMightAlwaysOpt,
  kAllowLazyCompile,
  kAllowNativeSyntax,
  kAllowHarmonyDynamicImport,
  kAllowHarmonyImportMeta,
  kAllowHarmonyNumericSeparator,
  kAllowHarmonyPrivateMethods,
  kModule,
  kEager,
  kStrictMode,
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

export default class ParseInfo {
  constructor(isolate) {
    this.zone_ = null;
    this.flags_ = 0;
    this.extension_ = null;
    this.script_scope_ = null;
    this.stack_limit_ = isolate.stack_guard().real_climit();
    this.hash_seed_ = this.HashSeed(isolate);
    this.function_kind_ = kNormalFunction;
    this.script_id_ = isolate.NextScriptId();
    this.start_position_ = 0;
    this.end_position_ = 0;
    this.parameters_end_pos_ = kNoSourcePosition;
    this.function_literal_id_ = kFunctionLiteralIdInvalid;
    this.character_stream_ = null;
    this.ast_value_factory_ = null;
    this.ast_string_constants_ = isolate.ast_string_constants();
    this.function_name_ = null;
    this.runtime_call_stats_ = isolate.counters().runtime_call_stats();
    this.source_range_map_ = null;
    this.literal_ = null;
    this.logger_ = isolate.logger();

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

  CreateScript() {

  }
}