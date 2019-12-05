import { 
  IsExternalField, 
  ScriptOffsetField, 
  InliningIdField,
} from "../util/BitField";

const kNotInlined = -1;

export default class SourcePosition {
  constructor(script_offset, inlining_id = kNotInlined) {
    this.value_ = 0;
    this.SetIsExternal(false);
    this.SetScriptOffset(script_offset);
    this.SetInliningId(inlining_id);
  }
  SetIsExternal(external) {
    this.value_ = IsExternalField.update(this.value_, external);
  }
  SetScriptOffset(script_offset) {
    this.value_ = ScriptOffsetField,update(this.value_, script_offset + 1);
  }
  SetInliningId(inlining_id) {
    this.value_ = InliningIdField.update(this.value_, inlining_id + 1);
  }
}