/* 基本宏 */

// Layout description.
static const int Object::kHeaderSize = 0;  // Object does not take up any space.
static const int kTaggedSize = 0;

#define DEFINE_ONE_FIELD_OFFSET(Name, Size) Name, Name##End = Name + (Size)-1,

#define DEFINE_FIELD_OFFSET_CONSTANTS(StartOffset, LIST_MACRO) \
  enum {                                                       \
    LIST_MACRO##_StartOffset = StartOffset - 1,                \
    LIST_MACRO(DEFINE_ONE_FIELD_OFFSET)                        \
  };

/* 定义宏 */

#define HEAP_OBJECT_FIELDS(V) \
  V(kMapOffset, kTaggedSize)  \
  /* Header size. */          \
  V(kHeaderSize, 0)

DEFINE_FIELD_OFFSET_CONSTANTS(Object::kHeaderSize, HEAP_OBJECT_FIELDS)

#define TORQUE_GENERATED_FIXED_ARRAY_BASE_FIELDS(V) \
V(kStartOfStrongFieldsOffset, 0) \
V(kLengthOffset, kTaggedSize) \
V(kEndOfStrongFieldsOffset, 0) \
V(kStartOfWeakFieldsOffset, 0) \
V(kEndOfWeakFieldsOffset, 0) \
V(kHeaderSize, 0) \

// Layout description.
DEFINE_FIELD_OFFSET_CONSTANTS(HeapObject::kHeaderSize, TORQUE_GENERATED_FIXED_ARRAY_BASE_FIELDS)

/* 展开后 */

// HeapObject
enum {
  HEAP_OBJECT_FIELDS_StartOffset = 0 - 1, // -1
  kMapOffset, // 0
  kMapOffsetEnd = kMapOffset + 8 - 1, // 7
  kHeaderSize,  // 8
  kHeaderSizeEnd = kHeaderSize + 0 - 1, // 7
}

// FixedArrayBase
enum {
  TORQUE_GENERATED_FIXED_ARRAY_BASE_FIELDS_StartOffset = 8 - 1, // 7
  kStartOfStrongFieldsOffset, // 8
  kStartOfStrongFieldsOffsetEnd = kStartOfStrongFieldsOffset + 0 - 1,  // 7
  kLengthOffset,  // 8
  kLengthOffsetEnd = kLengthOffset + 8 - 1, // 15
  kEndOfStrongFieldsOffset, // 16
  kEndOfStrongFieldsOffsetEnd = kEndOfStrongFieldsOffset + 0 - 1, // 15
  kStartOfWeakFieldsOffset, // 16
  kStartOfWeakFieldsOffsetEnd = kStartOfWeakFieldsOffset + 0 - 1, // 15
  kEndOfWeakFieldsOffset, // 16
  kEndOfWeakFieldsOffsetEnd = kEndOfWeakFieldsOffset + 0 - 1, // 15
  kHeaderSize,  // 16
  kHeaderSizeEnd = kHeaderSize + 0 - 1, // 15
}