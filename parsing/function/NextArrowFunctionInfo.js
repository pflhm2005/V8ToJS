import Location from "../scanner/Location";
import { kNone } from "../../enum";

export default class NextArrowFunctionInfo {
  constructor() {
    this.strict_parameter_error_location = new Location().invalid();
    this.strict_parameter_error_message = kNone;
    this.scope = null;
  }
  HasInitialState() { return this.scope === null; }
  Reset() {
    this.scope = null;
    this.ClearStrictParameterError();
  }
  ClearStrictParameterError() {
    this.strict_parameter_error_location = new Location().invalid();
    this.strict_parameter_error_message = kNone;
  }
}