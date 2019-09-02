// ----------------------------------------------------------------------------
// BitField is a help template for encoding and decode bitfield with
// unsigned content.

template <class T, int shift, int size, class U = int>
class BitField {
 public:
  STATIC_ASSERT(std::is_unsigned<U>::value);
  STATIC_ASSERT(shift < 8 * sizeof(U));  // Otherwise shifts by {shift} are UB.
  STATIC_ASSERT(size < 8 * sizeof(U));   // Otherwise shifts by {size} are UB.
  STATIC_ASSERT(shift + size <= 8 * sizeof(U));

  using FieldType = T;

  // A type U mask of bit field.  To use all bits of a type U of x bits
  // in a bitfield without compiler warnings we have to compute 2^x
  // without using a shift count of x in the computation.
  static constexpr U kShift = shift;
  static constexpr U kSize = size;
  static constexpr U kMask = ((U{1} << kShift) << kSize) - (U{1} << kShift);
  static constexpr U kNext = kShift + kSize;
  static constexpr U kNumValues = U{1} << kSize;

  // Value for the field with all bits set.
  static constexpr T kMax = static_cast<T>(kNumValues - 1);

  // Tells whether the provided value fits into the bit field.
  static constexpr bool is_valid(T value) {
    return (static_cast<U>(value) & ~static_cast<U>(kMax)) == 0;
  }

  // Returns a type U with the bit field value encoded.
  static constexpr U encode(T value) {
#if V8_CAN_HAVE_DCHECK_IN_CONSTEXPR
    DCHECK(is_valid(value));
#endif
    return static_cast<U>(value) << kShift;
  }

  // Returns a type U with the bit field value updated.
  static constexpr U update(U previous, T value) {
    return (previous & ~kMask) | encode(value);
  }

  // Extracts the bit field from the value.
  static constexpr T decode(U value) {
    return static_cast<T>((value & kMask) >> kShift);
  }
};

class NodeTypeField : public BitField<NodeType, 0, 6> {};

enum NodeType : int {
  kVariableDeclaration,
  kFunctionDeclaration,
  // ...
};