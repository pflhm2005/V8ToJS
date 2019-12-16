import { 
  WriteBarrierMode_SKIP_WRITE_BARRIER,
} from "../enum";

export default class SharedFunctionInfo {
  constructor() {
    this.function_data_ = null;
  }
  set_function_data(data, mode) {
    if (mode !== WriteBarrierMode_SKIP_WRITE_BARRIER) {
      // TODO
    }
  }
  set_builtin_id(builtin_id) {
    this.set_function_data(builtin_id, WriteBarrierMode_SKIP_WRITE_BARRIER);
  }
  CalculateConstructAsBuiltin() {
    let uses_builtins_construct_stub = false;
    if (this.function_data_) {
      
    }
  }
  InitFromFunctionLiteral() {

  }
  SetScript() {

  }
}