SMI_ACCESSORS(FixedArrayBase, length, kLengthOffset)

#define SMI_ACCESSORS(holder, name, offset) \
  SMI_ACCESSORS_CHECKED(holder, name, offset, true)

// Getter that returns a Smi as an int and writes an int as a Smi.
#define SMI_ACCESSORS_CHECKED(holder, name, offset, condition)   \
  int holder::name() const {                                     \
    DCHECK(condition);                                           \
    Smi value = TaggedField<Smi, offset>::load(*this);           \
    return value.value();                                        \
  }                                                              \
  void holder::set_##name(int value) {                           \
    DCHECK(condition);                                           \
    TaggedField<Smi, offset>::store(*this, Smi::FromInt(value)); \
  }

/* 翻译如下 */

FixedArrayBase::length() const {
  Smi value = TaggedField<Smi, kLengthOffset>::load(*this);
  return value.value();
}

FixedArrayBase::set_length(int value) {
  TaggedField<Smi, kLengthOffset>::store(*this, Smi::FromInt(value));
}

// static
template <typename T, int kFieldOffset>
void TaggedField<T, kFieldOffset>::store(HeapObject host, T value) {
  *location(host) = full_to_tagged(value.ptr());
}

// static
template <typename T, int kFieldOffset>
Tagged_t TaggedField<T, kFieldOffset>::full_to_tagged(Address value) {
  return value;
}

// static
template <typename T, int kFieldOffset>
Tagged_t* TaggedField<T, kFieldOffset>::location(HeapObject host, int offset) {
  return reinterpret_cast<Tagged_t*>(address(host, offset));
}

// static
template <typename T, int kFieldOffset>
Address TaggedField<T, kFieldOffset>::address(HeapObject host, int offset = 0) {
  return host.address() + kFieldOffset + offset;
}

/* 整合后如下 */

FixedArrayBase::set_length(int value) {
  reinterpret_cast<Address>(this.address() + kFieldOffset) = Smi::FromInt(value).ptr();
}