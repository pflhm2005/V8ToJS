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

// HeapObject的内存布局偏移量

export default class Factory {
  constructor(isolate) {
    this.isolate = isolate;
  }
  empty_fixed_array() {
    return this.isolate.roots_table[kEmptyFixedArray];
  }
  NewByteArray(length, allocation) {
    if (length < 0 || length > 1073741800) throw new Error('invalid array length');
    // let size = ByteArray.SizeFor(length);
    let result = new ByteArray();
    // let result = this.AllocateRawWithImmortalMap(size, allocation, this.byte_array_map());
    result.length = length;
    // result.clear_padding();
    return result;
  }
  /**
   * 新生成一个BytecodeArray 管理字节码
   * @param {int} length 字节码长度
   * @param {byte*} raw_bytecodes 字节码数组的首位地址 这里改成原数组
   * @param {int} frame_size 寄存器所占内存长度
   * @param {int} parameter_count 参数数量
   * @param {FixedArray} constant_pool 
   */
  NewBytecodeArray(length, raw_bytecodes, frame_size, parameter_count, constant_pool) {
    if (length < 0 || length > 1073741800) throw new Error('invalid array length');
    /**
     * 源码有以下三个步骤
     * 1. 计算对应字节码所需要的内存长度
     * BytecodeArray::SizeFor(length);
     * 2. 在指定的内存区域(new/old (large) generation)生成一个HeapObject并返回对应地址
     * HeapObject result = AllocateRawWithImmortalMap(size, AllocationType::kOld, *bytecode_array_map());
     * 3. 将生成的对象强转为所需派生类
     * Handle<BytecodeArray> instance(BytecodeArray::cast(result), isolate());
     * 注: 
     * 1. V8内部通过直接管理对象地址的数值来管理对象的引用 
     * 2. 将对应的指针转换为unsigned long类型的数字 逐个空间进行标记操作
     * 3. 过程涉及gc内存管理部分 JS不需要关心 直接new
     */
    let instance = new BytecodeArray();
    /* --------以下的属性设置与常规的getter/setter方法不同-------- */
    /**
     * 宏展开后方法如下 见SMI_ACCESSORS.cc
     * reinterpret_cast<Address>(this.address() + kLengthOffset) = Smi::FromInt(value).ptr();
     * 简述即将length转换为Smi(HeapObject派生类)后 将地址记录在指定偏移位置
     * 关于kLengthOffset等偏移量的宏定义 见DEFINE_FIELD_OFFSET_CONSTANTS.cc
     */
    instance.set_length(length);
    instance.set_frame_size(frame_size);
    instance.set_parameter_count(parameter_count);
    instance.set_incoming_new_target_or_generator_register(new Register());
    instance.set_osr_loop_nesting_level(0);
    instance.set_bytecode_age(BytecodeArray_kNoAgeBytecodeAge);
    instance.set_constant_pool(constant_pool);
    instance.set_handler_table(this.empty_byte_array());
    instance.set_source_position_table(undefined);
    /**
     * 最后一步则是将字节码的地址依次复制到类的data区域
     * GetFirstBytecodeAddress方法会根据当前HeapObject的地址计算偏移量并返回对应地址
     * 接着将已知长度的字节码复制过去
     * 由于JS无法操作内存 也不需要这么细粒化的操作 直接用一个数组保存bytecodes
     * CopyBytes(reinterpret_cast<byte*>(instance->GetFirstBytecodeAddress()), raw_bytecodes, length);
     */
    instance.bytecodes = raw_bytecodes;
     /**
      * 这个方法清空尾巴上未用到的内存空间
      * 根据kHeaderSize与字节码长度所分配的字节是8的倍数 最后一块区域可能会出现未使用字节
      * 通过这个方法把最后一个字节没有用到的地址置0 JS这个操作无意义 注释掉
      */
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