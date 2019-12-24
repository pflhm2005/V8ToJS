const kHeaderSize = 16;

/**
 * 返回一个等宽的内存长度
 * 数值为比当前数字大的最小8的倍数
 * 0 ~ 0
 * 1 ~ 8
 * 9 ~ 16
 * 等等
 * @param {int} value 实际长度
 */
function OBJECT_POINTER_ALIGN(value) {
  return (value + 7) & (~7);
}

export default class ByteArray {
  constructor() {
    this.length = 0;
    this.frame_size = 0;
    this.parameter_coun = 0;
    this.incoming_new_target_or_generator_register = null;
    this.depth = 0;
    this.age = -1;
    this.constant_pool = null;
    this.handler_table = null;
    this.source_position_table = null;
    this.bytecodes = [];
  }
  set_length(length) {
    this.length = length;
  }
  set_frame_size(frame_size) {
    this.frame_size = frame_size;
  }
  set_parameter_count(parameter_coun) {
    this.parameter_coun = parameter_coun;
  }
  set_incoming_new_target_or_generator_register(incoming_new_target_or_generator_register) {
    this.incoming_new_target_or_generator_register = incoming_new_target_or_generator_register;
  }
  set_osr_loop_nesting_level(depth) {
    this.depth = depth;
  }
  set_bytecode_age(age) {
    this.age = age;
  }
  set_constant_pool(constant_pool) {
    this.constant_pool = constant_pool;
  }
  set_handler_table(handler_table) {
    this.handler_table = handler_table;
  }
  set_source_position_table(source_position_table) {
    this.source_position_table = source_position_table;
  }
  static SizeFor(length) {
    return OBJECT_POINTER_ALIGN(kHeaderSize + length);
  }
}