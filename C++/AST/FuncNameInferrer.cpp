// PointerWithPayload combines a PointerType* an a small PayloadType into
// one. The bits of the storage type get packed into the lower bits of the
// pointer that are free due to alignment. The user needs to specify how many
// bits are needed to store the PayloadType, allowing Types that by default are
// larger to be stored.
//
// Example:
//   PointerWithPayload<int *, bool, 1> data_and_flag;
//
//   Here we store a bool that needs 1 bit of storage state into the lower bits
//   of int *, which points to some int data;

enum class InferName { kYes, kNo };

template <typename PointerType, typename PayloadType, int NumPayloadBits>
class PointerWithPayload {
  // 内存对齐 不知道是啥
  static constexpr int kAvailBits = alignof(PointerType) >= 8 ? 3 : alignof(PointerType) >= 4 ? 2 : 1;
  static_assert(
      kAvailBits >= NumPayloadBits,
      "Ptr does not have sufficient alignment for the selected amount of "
      "storage bits.");

  static constexpr uintptr_t kPayloadMask = (uintptr_t{1} << kAvailBits) - 1;
  static constexpr uintptr_t kPointerMask = ~kPayloadMask;

 public:
  PointerWithPayload() {}

  explicit PointerWithPayload(PointerType* pointer)
      : pointer_(reinterpret_cast<uintptr_t>(pointer)) {}

  explicit PointerWithPayload(PayloadType payload)
      : pointer_(static_cast<uintptr_t>(payload)) {
  }

  PointerWithPayload(PointerType* pointer, PayloadType payload) {
    update(pointer, payload);
  }

  V8_INLINE PointerType* GetPointer() const {
    return reinterpret_cast<PointerType*>(pointer_ & kPointerMask);
  }

  V8_INLINE PointerType* operator->() const { return GetPointer(); }

  V8_INLINE void update(PointerType* new_pointer, PayloadType new_payload) {
    pointer_ = reinterpret_cast<uintptr_t>(new_pointer) |
               static_cast<uintptr_t>(new_payload);
  }

  V8_INLINE PayloadType GetPayload() const {
    return static_cast<PayloadType>(pointer_ & kPayloadMask);
  }

 private:
  uintptr_t pointer_ = 0;
};

class FuncNameInferrer {
  public:
    explicit FuncNameInferrer(AstValueFactory* ast_value_factory)
      : ast_value_factory_(ast_value_factory) {}
    // Returns whether we have entered name collection state.
    bool IsOpen() const { return scope_depth_ > 0; }
    void FuncNameInferrer::PushVariableName(const AstRawString* name) {
      if (IsOpen() && name != ast_value_factory_->dot_result_string()) {
        names_stack_.push_back(Name(name, kVariableName));
      }
    }
  private:
    enum NameType : uint8_t {
      kEnclosingConstructorName,
      kLiteralName,
      kVariableName
    };
    struct Name {
      // Needed for names_stack_.resize()
      Name() { UNREACHABLE(); }
      Name(const AstRawString* name, NameType type)
          : name_and_type_(name, type) {}

      PointerWithPayload<const AstRawString, NameType, 2> name_and_type_;
      inline const AstRawString* name() const {
        return name_and_type_.GetPointer();
      }
      inline NameType type() const { return name_and_type_.GetPayload(); }
    };

    AstValueFactory* ast_value_factory_;
    std::vector<Name> names_stack_;
    std::vector<FunctionLiteral*> funcs_to_infer_;
    size_t scope_depth_ = 0;
};