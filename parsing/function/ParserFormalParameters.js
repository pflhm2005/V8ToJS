import Location from "../scanner/Location";
import { kParamDupe } from "../../messageTemplate";

class FormalParametersBase {
  constructor(scope) {
    this.scope = scope;
    this.has_rest = false;
    this.is_simple = true;
    this.function_length = 0;
    this.arity = 0;
  }
  /**
   * 返回形参数量 去除rest
   * 与布尔值计算会自动转换 我就不用管了
   */
  num_parameters() {
    return this.arity - this.has_rest;
  }
  /**
   * 更新函数的参数数量与length属性
   * 任何情况下arity都会增加
   * 而function.length必须满足以下条件才会增加
   * 1、该参数不存在默认值
   * 2、不是rest参数
   * 3、length、arity相等
   * 那么length的意思就是 从第一个形参开始计数 直接碰到有默认值的参数或rest
   * (a,b,c) => length => 3
   * (a,b,c = 1) => length => 2
   * (a=1,b,c) => length => 0
   * @param {bool} is_optional 当前参数是否有默认值
   * @param {bool} is_rest 是否是rest参数
   */
  UpdateArityAndFunctionLength(is_optional, is_rest) {
    if (!is_optional && !is_rest && this.function_length === this.arity) ++this.function_length;
    ++this.arity;
  }
}

export default class ParserFormalParameters extends FormalParametersBase {
  constructor(scope) {
    super(scope);
    this.params = [];
    this.duplicate_loc = new Location().invalid();
    // this.strict_error_loc = new Location().invalid();
  }
  has_duplicate() {
    return this.duplicate_loc.IsValid();
  }
  ValidateDuplicate(parser) {
    if(this.has_duplicate()) throw new Error(kParamDupe);
  }
  // ValidateStrictMode(parser) {
  //   if()
  // }
}