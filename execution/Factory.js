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
import BytecodeArray from './ByteArray';

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
     * 生成一个BytecodeArray对象以下三个步骤
     * 1. 计算字节码所需要的内存长度
     * BytecodeArray::SizeFor(length);
     * 2. 在指定的内存区域(new/old (large) generation)生成一个HeapObject并返回对应地址
     * HeapObject result = AllocateRawWithImmortalMap(size, AllocationType::kOld, *bytecode_array_map());
     * 3. 将生成的对象强转为所需派生类 然后用Handle管理起来
     * Handle<BytecodeArray> instance(BytecodeArray::cast(result), isolate());
     * 注: 
     * 1. V8内部通过直接管理对象地址的数值来管理对象的内容
     * 2. 将对应的指针转换为unsigned long类型的数字 逐个空间进行标记操作
     * 3. 由于过程涉及gc内存管理部分 JS不需要关心 直接new
     * 
     * 继承链为Object => HeapObject => FixedArrayBase => BytecodeArray
     * 其中Object作为基类 没有对应的HeaderSize
     * HeapObject的HeaderSize值为8
     * FixedArrayBase的HeaderSize值为16(包括HeapObject的0 ~ 7)
     * 意思就是 假设Bytecode所需要的长度为8n(SizeFor矫正后为8的倍数)字节
     * 那么会向指定的内存区域申请8n + 16的内存长度
     * 根据宏定义 每一个字节内存地址的意义如下
     * 0 ~ 7 => Map(见src/object/map.h)
     * 8 ~ 15 => Length(即set_length方法所记录的字节码长度)
     * 16 ~ 16 + 8n => 每一个byte存储对应字节码的值
     * (最后一个8n会再做一个整理)
     */
    let instance = new BytecodeArray();
    /* -------- warning:以下的属性设置与常规的getter/setter方法不同 -------- */
    /**
     * set_length是用宏定义的方法 => SMI_ACCESSORS(FixedArrayBase, length, kLengthOffset)
     * 宏展开后方法定义如下(见macro/SMI_ACCESSORS.cc)
     * reinterpret_cast<Address>(this.address() + kLengthOffset) = Smi::FromInt(value).ptr();
     * 即将length转换为Smi(HeapObject派生类)后 将该对象的地址记录在指定偏移位置
     * 关于kLengthOffset等偏移量的宏定义(见macro/DEFINE_FIELD_OFFSET_CONSTANTS.cc)
     */
    instance.set_length(length);
    /**
     * 函数内容 => WriteField<int32_t>(kFrameSizeOffset, frame_size);
     * set_frame_size同样是做地址偏移的 简化后如下
     * *reinterpret_cast<T*>(ptr() + kFrameSizeOffset - kHeapObjectTag) = frame_size
     * 与length一样 对ptr做偏移后设置对应的值
     * kFrameSizeOffset => 40
     */
    instance.set_frame_size(frame_size);
    /**
     * 函数内容 => WriteField<int32_t>(kParameterSizeOffset, (number_of_parameters << kSystemPointerSizeLog2));
     * kParameterSizeOffset => 44
     * kSystemPointerSizeLog2 => 3
     */
    instance.set_parameter_count(parameter_count);
    /**
     * 这里默认生成非法寄存器类 直接写0
     * WriteField<int32_t>(kIncomingNewTargetOrGeneratorRegisterOffset, 0);
     * kIncomingNewTargetOrGeneratorRegisterOffset => 48
     */
    instance.set_incoming_new_target_or_generator_register(new Register());
    /**
     * WriteField<int8_t>(kOsrNestingLevelOffset, depth);
     * kOsrNestingLevelOffset => 52
     */
    instance.set_osr_loop_nesting_level(0);
    /**
     * 其实也是正常的赋值 只不过用了原子写入
     * RELAXED_WRITE_INT8_FIELD(*this, kBytecodeAgeOffset, static_cast<int8_t>(age));
     * kBytecodeAgeOffset => 53
     */
    instance.set_bytecode_age(BytecodeArray_kNoAgeBytecodeAge);
    /**
     * 宏定义的方法
     * ACCESSORS(BytecodeArray, constant_pool, FixedArray, kConstantPoolOffset)
     * ACCESSORS(BytecodeArray, handler_table, ByteArray, kHandlerTableOffset)
     * ACCESSORS(BytecodeArray, source_position_table, Object, kSourcePositionTableOffset)
     * 展开见macro/ACCESSORS.cc 是SMI_ACCESSORS的一般化定义
     * kConstantPoolOffset => 0
     */
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
  empty_byte_array() {
    return null;
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