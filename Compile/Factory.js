import Script from './ScriptCompiler';
import { kEmptyFixedArray, SCRIPT_TYPE, TYPE_NORMAL } from "../enum";

export default class Factory {
  constructor(isolate) {
    this.isolate = isolate;
  }
  empty_fixed_array() {
    return this.isolate.roots_table[kEmptyFixedArray];
  }
  NewScript(source) {
    return this.NewScriptWithId(source, this.isolate.NextScriptId());
  }
  NewScriptWithId(source, script_id) {
    let script = new Script(SCRIPT_TYPE);
    // TODO 这块的内容值得研究 后期再看
    script.source_ = source;
    // 此处可参考https://www.cnblogs.com/QH-Jimmy/p/9317297.html
    script.name_ = undefined;
    script.id_ = script_id;
    script.line_offset_ = 0;
    script.column_offset_ = 0;
    script.context_data_ = undefined;
    script.type_ = TYPE_NORMAL;
    script.line_ends_ = undefined;
    script.eval_from_shared_or_wrapped_arguments_ = undefined;
    script.eval_from_position_ = 0;
    // script.shared_function_infos_ = 
    script.flags_ = 0;
    script.host_defined_options = null;

    script.origin_options_ = null;

    // more

    return script;
  }
  empty_fixed_array() {
    return new FixedArray();
  }
  NewSharedFunctionInfoForLiteral() {}
}

class FixedArray {}