import { 
  kNoSourcePosition, 
  _kVariableDeclaration, 
  _kExpressionStatement,
  _kBlock,
  _kAssignment,
} from "../enum";

export default class Rewriter {
  static Rewrite(info) {
    let func = info.literal_;
    let scope = func.scope_;
    if (!scope.is_script_scope() || scope.is_eval_scope() || scope.is_module_scope()) {
      return true;
    }
    let body = func.body_;
    if (body.length) {
      let result = scope.NewTemporary(info.ast_value_factory_.dot_result_string());
      let processor = new Processor(info.stack_limit_, scope, result, info.ast_value_factory_);
      processor.Process(body);

      if (processor.result_assigned_) {
        let pos = kNoSourcePosition;
        let result_value = processor.factory().NewVariableProxy(result, pos);
        let result_statement = processor.factory().NewReturnStatement(result_value, pos);
        body.push(result_statement);
      }
    }
    return true;
  }
}

class AstVisitor {}

class Processor extends AstVisitor {
  constructor(stack_limit, closure_scope, result, ast_value_factory) {
    super();
    this.result_ = result;
    this.replacement_ = null;
    this.closure_scope_ = closure_scope;
    this.factory_ = ast_value_factory;
    this.result_assigned_ = false;
    this.is_set_ = false;
    this.breakable_ = false;
    this.InitializeAstVisitor(stack_limit);
  }
  InitializeAstVisitor(stack_limit) {
    this.stack_limit_ = stack_limit;
    this.stack_overflow_ = false;
  }
  Process(statements) {
    for (let i = statements.length - 1; i >= 0 && (this.breakable_ || !this.is_set_); --i) {
      this.Visit(statements[i]);
      statements[i] = this.replacement_;
    }
  }
  Visit(node) {
    // if (CheckStackOverflow()) return;
    this.VisitNoStackOverflowCheck(node);
  }
  VisitNoStackOverflowCheck(node) {
    let node_type = node.node_type();
    switch(node_type) {
      case _kVariableDeclaration:
        return this.VisitVariableDeclaration(node);
      case _kExpressionStatement:
        return this.VisitExpressionStatement(node);
      case _kBlock:
        return this.VisitBlock(node);
      case _kAssignment:
        return this.VisitAssignment(node);
    }
  }

  VisitBlock(node) {
    if (!node.ignore_completion_value()) {
      // let scope = new BreakableScope(this, node.labels !== null);
      let previous_ = this.breakable_;
      this.breakable_ = this.breakable_ || node.labels_ !== null;
      this.Process(node.statement_);
      // 析构
      this.breakable_ = previous_;
    }
    this.replacement_ = node;
  }
}