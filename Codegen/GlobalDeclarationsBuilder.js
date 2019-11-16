export default class GlobalDeclarationsBuilder {
  constructor() {
    this.declarations_ = [];
    this.constant_pool_entry_ = 0;
    this.has_constant_pool_entry_ = false;
  }
  empty() {
    return this.declarations_.length === 0;
  }
  set_constant_pool_entry(constant_pool_entry) {
    this.constant_pool_entry_ = constant_pool_entry;
    this.has_constant_pool_entry_ = true;
  }
  AddUndefinedDeclaration(name, slot) {
    this.declarations_.push(new Declaration(name, slot));
  }
}

class Declaration {
  constructor(name, slot, feedback_cell_index = -1, func = null) {
    this.name = name;
    this.slot = slot;
    this.feedback_cell_index_for_function = feedback_cell_index;
    this.func = func;
  }
}