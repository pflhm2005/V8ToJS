import Script from './Script';
import ByteArray from './ByteArray';
import { 
  kEmptyFixedArray, 
  SCRIPT_TYPE, 
  TYPE_NORMAL, 
  Builtins_kCompileLazy,
  Builtins_kIllegal,
  AllocationType_kOld,
  BytecodeArray_kNoAgeBytecodeAge,
} from "../enum";
import { Builtins_IsBuiltinId } from '../util';
import SharedFunctionInfo from './SharedFunctionInfo';
import Register from '../codegen/Register';

export default class Factory {
  constructor(isolate) {
    this.isolate = isolate;
  }
  empty_fixed_array() {
    return this.isolate.roots_table[kEmptyFixedArray];
  }
  NewByteArray(length, allocation) {
    if (length < 0 || length > 1073741800) throw new Error('invalid array length');
    let size = ByteArray.SizeFor(length);
    let result = new ByteArray();
    // let result = this.AllocateRawWithImmortalMap(size, allocation, this.byte_array_map());
    result.length = length;
    // result.clear_padding();
    return result;
  }
  NewBytecodeArray(length, raw_bytecodes, frame_size, parameter_count, constant_pool) {
    if (length < 0 || length > 1073741800) throw new Error('invalid array length');
    // BytecodeArray::SizeFor(length); 实际上跟上面一样
    let size = ByteArray.SizeFor(length);
    // let result = this.AllocateRawWithImmortalMap(size, AllocationType_kOld, this.byte_array_map());
    let instance = new BytecodeArray();
    instance.set_length(length);
    instance.set_frame_size(frame_size);
    instance.set_parameter_count(parameter_count);
    instance.set_incoming_new_target_or_generator_register(new Register());
    instance.set_osr_loop_nesting_level(0);
    instance.set_bytecode_age(BytecodeArray_kNoAgeBytecodeAge);
    instance.set_constant_pool(constant_pool);
    instance.set_handler_table(this.empty_byte_array());
    instance.set_source_position_table(undefined);
    // instance.clear_padding();

    return instance;
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
  NewSharedFunctionInfoForLiteral(literal, script, is_toplevel) {
    let kind = literal.kind();
    let shared = this.NewSharedFunctionInfoForBuiltin(literal.name(), Builtins_kCompileLazy, kind);
    SharedFunctionInfo.InitFromFunctionLiteral(shared, literal, is_toplevel);
    SharedFunctionInfo.SetScript(shared, script, literal.function_literal_id_, false);
    return shared;
  }
  NewSharedFunctionInfoForBuiltin(maybe_name, builtin_index, kind) {
    return this.NewSharedFunctionInfo(maybe_name, null, builtin_index, kind);
  }
  NewSharedFunctionInfo(maybe_name, maybe_function_data, maybe_builtin_index, kind) {
    let shared = new SharedFunctionInfo();
    if (maybe_name) {
      // TODO
    }
    if (maybe_function_data) {
      shared.set_function_data(maybe_function_data);
    } else if (Builtins_IsBuiltinId(maybe_builtin_index)) {
      shared.set_builtin_id(maybe_builtin_index);
    } else {
      shared.set_builtin_id(Builtins_kIllegal);
    }
    shared.CalculateConstructAsBuiltin();
    shared.set_kind(kind);
    return shared;
  }
}

class FixedArray {}