import Location from '../scanner/Location';

/**
 * mode、kind分别是声明类型
 * 两个pos
 */
class DeclarationDescriptor {
  constructor() {
    this.mode = null;
    this.kind = null;
    this.declaration_pos = 0;
    this.initialization_pos = 0;
  }
}

export default class DeclarationParsingResult {
  constructor() {
    this.descriptor = new DeclarationDescriptor();
    this.declarations = [];
    this.first_initializer_loc = new Location(-1, -1);
    this.bindings_loc = new Location(-1, -1);
  }
}