/**
 * 创建一个作用域
 */
v8::HandleScope handle_scope(isolate);

class V8_EXPORT HandleScope {
  public:
    HandleScope::HandleScope(Isolate* isolate) { Initialize(isolate); }
  private:
    internal::Isolate* isolate_;
    internal::Address* prev_next_;
    internal::Address* prev_limit_;
}

/**
 * 类初始化
 */
void HandleScope::Initialize(Isolate* isolate) {
  i::Isolate* internal_isolate = reinterpret_cast<i::Isolate*>(isolate);
  // We do not want to check the correct usage of the Locker class all over the
  // place, so we do it only here: Without a HandleScope, an embedder can do
  // almost nothing, so it is enough to check in this central place.
  // We make an exception if the serializer is enabled, which means that the
  // Isolate is exclusively used to create a snapshot.
  Utils::ApiCheck(
      !v8::Locker::IsActive() ||
          internal_isolate->thread_manager()->IsLockedByCurrentThread() ||
          internal_isolate->serializer_enabled(),
      "HandleScope::HandleScope",
      "Entering the V8 API without proper locking in place");
  /**
   * 注解1
   */
  i::HandleScopeData* current = internal_isolate->handle_scope_data();
  isolate_ = internal_isolate;
  prev_next_ = current->next;
  prev_limit_ = current->limit;
  current->level++;
}

/**
 * 类析构
 */
void HandleScope::CloseScope(Isolate* isolate, Address* prev_next, Address* prev_limit) {
  HandleScopeData* current = isolate->handle_scope_data();

  std::swap(current->next, prev_next);
  current->level--;
  Address* limit = prev_next;
  if (current->limit != prev_limit) {
    current->limit = prev_limit;
    limit = prev_limit;
    DeleteExtensions(isolate);
  }
  MSAN_ALLOCATED_UNINITIALIZED_MEMORY(
      current->next,
      static_cast<size_t>(reinterpret_cast<Address>(limit) - reinterpret_cast<Address>(current->next)));
}

/**
 * 注解[1]
 * 私有属性 每次调用handleScope会使用
 */
class Isolate final : private HiddenFactory {
  HandleScopeData* handle_scope_data() { return &handle_scope_data_; }
}
struct HandleScopeData final {
  Address* next;
  Address* limit;
  int level;
  int sealed_level;
  CanonicalHandleScope* canonical_scope;

  void Initialize() {
    next = limit = nullptr;
    sealed_level = level = 0;
    canonical_scope = nullptr;
  }
};