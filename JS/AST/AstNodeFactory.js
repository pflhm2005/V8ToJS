import { VariableProxy } from './AST';

export default class AstNodeFactory {
  ast_node_factory() {
    return this;
  }
  NewVariableProxy(name, variable_kind, start_position = kNoSourcePosition) {
    return new VariableProxy(name, variable_kind, start_position);
  }
}