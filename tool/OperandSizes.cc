ENTRY(Wide, AccumulatorUse::kNone) 

#define ENTRY(Name, ...)  \
    BytecodeTraits<__VA_ARGS__>::kSingleScaleOperandSizes,
  BYTECODE_LIST(ENTRY)
#undef ENTRY

template <AccumulatorUse accumulator_use, OperandType... operands>
const OperandSize
    BytecodeTraits<accumulator_use, operands...>::kSingleScaleOperandSizes[] = {
        OperandScaler<operands, OperandScale::kSingle>::kOperandSize...};

// operand_scale = kSingle = 1
template <OperandType operand_type, OperandScale operand_scale>
struct OperandScaler {
  template <bool, OperandSize, OperandScale>
  struct Helper {
    static const int kSize = 0;
  };
  template <OperandSize size, OperandScale scale>
  struct Helper<false, size, scale> {
    static const int kSize = static_cast<int>(size);
  };
  template <OperandSize size, OperandScale scale>
  struct Helper<true, size, scale> {
    static const int kSize = static_cast<int>(size) * static_cast<int>(scale);
  };

  static const int kSize =
      Helper<OperandTraits<operand_type>::TypeInfoTraits::kIsScalable,
             OperandTraits<operand_type>::TypeInfoTraits::kUnscaledSize,
             operand_scale>::kSize;
  static const OperandSize kOperandSize = static_cast<OperandSize>(kSize);
};

#define OPERAND_TYPE_INFO_LIST(V)                         \
  V(None, false, false, OperandSize::kNone)               \
  V(ScalableSignedByte, true, false, OperandSize::kByte)  \
  V(ScalableUnsignedByte, true, true, OperandSize::kByte) \
  V(FixedUnsignedByte, false, true, OperandSize::kByte)   \
  V(FixedUnsignedShort, false, true, OperandSize::kShort)

#define DECLARE_OPERAND_TYPE_INFO(Name, Scalable, Unsigned, BaseSize) \
  template <>                                                         \
  struct OperandTypeInfoTraits<OperandTypeInfo::k##Name> {            \
    static const bool kIsScalable = Scalable;                         \
    static const bool kIsUnsigned = Unsigned;                         \
    static const OperandSize kUnscaledSize = BaseSize;                \
  };
OPERAND_TYPE_INFO_LIST(DECLARE_OPERAND_TYPE_INFO)
#undef DECLARE_OPERAND_TYPE_INFO

#define DECLARE_OPERAND_TYPE_TRAITS(Name, InfoType)           \
  template <>                                                 \
  struct OperandTraits<OperandType::k##Name> {                \
    using TypeInfoTraits = OperandTypeInfoTraits<InfoType>;   \
    static const OperandTypeInfo kOperandTypeInfo = InfoType; \
  };
OPERAND_TYPE_LIST(DECLARE_OPERAND_TYPE_TRAITS)
#undef DECLARE_OPERAND_TYPE_TRAITS

#define INVALID_OPERAND_TYPE_LIST(V) V(None, OperandTypeInfo::kNone)

#define REGISTER_INPUT_OPERAND_TYPE_LIST(V)        \
  V(Reg, OperandTypeInfo::kScalableSignedByte)     \
  V(RegList, OperandTypeInfo::kScalableSignedByte) \
  V(RegPair, OperandTypeInfo::kScalableSignedByte)

#define REGISTER_OUTPUT_OPERAND_TYPE_LIST(V)          \
  V(RegOut, OperandTypeInfo::kScalableSignedByte)     \
  V(RegOutList, OperandTypeInfo::kScalableSignedByte) \
  V(RegOutPair, OperandTypeInfo::kScalableSignedByte) \
  V(RegOutTriple, OperandTypeInfo::kScalableSignedByte)

#define SIGNED_SCALABLE_SCALAR_OPERAND_TYPE_LIST(V) \
  V(Imm, OperandTypeInfo::kScalableSignedByte)

#define UNSIGNED_SCALABLE_SCALAR_OPERAND_TYPE_LIST(V) \
  V(Idx, OperandTypeInfo::kScalableUnsignedByte)      \
  V(UImm, OperandTypeInfo::kScalableUnsignedByte)     \
  V(RegCount, OperandTypeInfo::kScalableUnsignedByte)

#define UNSIGNED_FIXED_SCALAR_OPERAND_TYPE_LIST(V)    \
  V(Flag8, OperandTypeInfo::kFixedUnsignedByte)       \
  V(IntrinsicId, OperandTypeInfo::kFixedUnsignedByte) \
  V(RuntimeId, OperandTypeInfo::kFixedUnsignedShort)  \
  V(NativeContextIndex, OperandTypeInfo::kScalableUnsignedByte)

// Carefully ordered for operand type range checks below.
#define NON_REGISTER_OPERAND_TYPE_LIST(V)       \
  INVALID_OPERAND_TYPE_LIST(V)                  \
  UNSIGNED_FIXED_SCALAR_OPERAND_TYPE_LIST(V)    \
  UNSIGNED_SCALABLE_SCALAR_OPERAND_TYPE_LIST(V) \
  SIGNED_SCALABLE_SCALAR_OPERAND_TYPE_LIST(V)

// Carefully ordered for operand type range checks below.
#define REGISTER_OPERAND_TYPE_LIST(V) \
  REGISTER_INPUT_OPERAND_TYPE_LIST(V) \
  REGISTER_OUTPUT_OPERAND_TYPE_LIST(V)

// The list of operand types used by bytecodes.
// Carefully ordered for operand type range checks below.
#define OPERAND_TYPE_LIST(V)        \
  NON_REGISTER_OPERAND_TYPE_LIST(V) \
  REGISTER_OPERAND_TYPE_LIST(V)
