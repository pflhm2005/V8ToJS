import { AssignType_NON_PROPERTY } from "../enum";
import Register, { RegisterList } from "./Register";

export class AssignmentLhsData {
  static NonProperty(expr) {
    return new AssignmentLhsData(
      AssignType_NON_PROPERTY, expr, new RegisterList(), new Register(), new Register(), null, null);
  }
  constructor(assign_type, expr, super_property_args, object, key, object_expr, name) {
    this.assign_type_ = assign_type;
    this.expr_ = expr;
    this.super_property_args_ = super_property_args;
    this.object_ = object;
    this.key_ = key;
    this.object_expr_ = object_expr;
    this.name_ = name;
  }
}