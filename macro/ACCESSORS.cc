/* 示例定义 */

ACCESSORS(BytecodeArray, constant_pool, FixedArray, kConstantPoolOffset)

/* 宏定义如下 */

#define ACCESSORS(holder, name, type, offset) \
  ACCESSORS_CHECKED(holder, name, type, offset, true)

#define ACCESSORS_CHECKED(holder, name, type, offset, condition) \
  ACCESSORS_CHECKED2(holder, name, type, offset, condition, condition)

#define ACCESSORS_CHECKED2(holder, name, type, offset, get_condition, \
                           set_condition)                             \
  DEF_GETTER(holder, name, type) {                                    \
    type value = TaggedField<type, offset>::load(isolate, *this);     \
    DCHECK(get_condition);                                            \
    return value;                                                     \
  }                                                                   \
  void holder::set_##name(type value, WriteBarrierMode mode) {        \
    DCHECK(set_condition);                                            \
    TaggedField<type, offset>::store(*this, value);                   \
    CONDITIONAL_WRITE_BARRIER(*this, offset, value, mode);            \
  }

/* 宏展开后如下 */

void BytecodeArray::set_constant_pool(FixedArray value, WriteBarrierMode mode) {
  TaggedField<FixedArray, kConstantPoolOffset>::store(*this, value);
  CONDITIONAL_WRITE_BARRIER(*this, kConstantPoolOffset, value, mode);
}

/* store定义 */

// static
template <typename T, int kFieldOffset>
void TaggedField<T, kFieldOffset>::store(HeapObject host, T value) {]
  *location(host) = full_to_tagged(value.ptr());
}

// static
template <typename T, int kFieldOffset>
Tagged_t* TaggedField<T, kFieldOffset>::location(HeapObject host, int offset = 0) {
  return reinterpret_cast<Tagged_t*>(host.address() + kFieldOffset + offset;);
}