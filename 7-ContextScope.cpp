/**
 * 进入该上下文
 */
v8::Context::Scope context_scope(context);

/**
 * 该类专门负责管理当前上下文
 * 初始化后调用Enter方法
 */
class Scope {
  public:
    explicit V8_INLINE Scope(Local<Context> context) : context_(context) {
      context_->Enter();
    }
    V8_INLINE ~Scope() { context_->Exit(); }

  private:
    Local<Context> context_;
};

void Context::Enter() {
  i::Handle<i::Context> env = Utils::OpenHandle(this);
  i::Isolate* isolate = env->GetIsolate();
  i::HandleScopeImplementer* impl = isolate->handle_scope_implementer();
  impl->EnterContext(*env);
  impl->SaveContext(isolate->context());
  isolate->set_context(*env);
}