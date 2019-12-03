#define INTRINSICS_LIST(V)                                           \
  V(AsyncFunctionAwaitCaught, async_function_await_caught, 2)        \
  V(AsyncFunctionAwaitUncaught, async_function_await_uncaught, 2)    \
  V(AsyncFunctionEnter, async_function_enter, 2)                     \
  V(AsyncFunctionReject, async_function_reject, 3)                   \
  V(AsyncFunctionResolve, async_function_resolve, 3)                 \
  V(AsyncGeneratorAwaitCaught, async_generator_await_caught, 2)      \
  V(AsyncGeneratorAwaitUncaught, async_generator_await_uncaught, 2)  \
  V(AsyncGeneratorReject, async_generator_reject, 2)                 \
  V(AsyncGeneratorResolve, async_generator_resolve, 3)               \
  V(AsyncGeneratorYield, async_generator_yield, 3)                   \
  V(CreateJSGeneratorObject, create_js_generator_object, 2)          \
  V(GeneratorGetResumeMode, generator_get_resume_mode, 1)            \
  V(GeneratorClose, generator_close, 1)                              \
  V(GetImportMetaObject, get_import_meta_object, 0)                  \
  V(Call, call, -1)                                                  \
  V(CopyDataProperties, copy_data_properties, 2)                     \
  V(CreateIterResultObject, create_iter_result_object, 2)            \
  V(CreateAsyncFromSyncIterator, create_async_from_sync_iterator, 1) \
  V(HasProperty, has_property, 2)                                    \
  V(IsArray, is_array, 1)                                            \
  V(IsJSReceiver, is_js_receiver, 1)                                 \
  V(IsSmi, is_smi, 1)                                                \
  V(ToStringRT, to_string, 1)                                        \
  V(ToLength, to_length, 1)                                          \
  V(ToObject, to_object, 1)