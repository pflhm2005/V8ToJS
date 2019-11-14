import { ENUMERATE, kNoSourcePosition } from "../../enum";
import { DeclarationParsingResult } from "../DeclarationParsingResult";

export class ClassInfo {
  constructor() {
    this.extends = null;
    this.public_members = [];
    this.private_members = [];
    this.static_fields = [];
    this.instance_fields = [];
    this.constructor = null;
    this.has_seen_constructor = false;
    this.has_name_static_property = false;
    this.has_static_computed_names = false;
    this.has_static_class_fields = false;
    this.has_instance_members = false;
    this.requires_brand = false;
    this.is_anonymous = false;
    this.has_private_methods = false;
    this.static_fields_scope = false;
    this.instance_members_scope = false;
    this.computed_field_count = 0;
  }
}

export class ForInfo {
  constructor() {
    this.bound_names = [];
    this.mode = ENUMERATE;
    this.position = kNoSourcePosition;
    this.parsing_result = new DeclarationParsingResult();
  }
}

export class CatchInfo {
  constructor() {
    this.pattern = null;
    this.variable = null;
    this.scope = null;
  }
}