/**
 * 解析赋值
 */
template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseAssignmentExpression() {
  ExpressionParsingScope expression_scope(impl());
  ExpressionT result = ParseAssignmentExpressionCoverGrammar();
  expression_scope.ValidateExpression();
  return result;
}

// Precedence = 2
template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseAssignmentExpressionCoverGrammar() {
  // AssignmentExpression ::
  //   ConditionalExpression
  //   ArrowFunction
  //   YieldExpression
  //   LeftHandSideExpression AssignmentOperator AssignmentExpression
  int lhs_beg_pos = peek_position();

  if (peek() == Token::YIELD && is_generator()) {
    return ParseYieldExpression();
  }

  FuncNameInferrerState fni_state(&fni_);

  // 解析条件表达式
  ExpressionT expression = ParseConditionalExpression();

  Token::Value op = peek();

  if (!Token::IsArrowOrAssignmentOp(op)) return expression;

  // Arrow functions.
  if (V8_UNLIKELY(op == Token::ARROW)) {
    Scanner::Location loc(lhs_beg_pos, end_position());

    if (!impl()->IsIdentifier(expression) && !expression->is_parenthesized()) {
      impl()->ReportMessageAt(
          Scanner::Location(expression->position(), position()),
          MessageTemplate::kMalformedArrowFunParamList);
      return impl()->FailureExpression();
    }

    DeclarationScope* scope = next_arrow_function_info_.scope;
    scope->set_start_position(lhs_beg_pos);

    FormalParametersT parameters(scope);
    parameters.set_strict_parameter_error(
        next_arrow_function_info_.strict_parameter_error_location,
        next_arrow_function_info_.strict_parameter_error_message);
    parameters.is_simple = scope->has_simple_parameters();
    next_arrow_function_info_.Reset();

    impl()->DeclareArrowFunctionFormalParameters(&parameters, expression, loc);

    expression = ParseArrowFunctionLiteral(parameters);

    return expression;
  }

  if (V8_LIKELY(impl()->IsAssignableIdentifier(expression))) {
    if (expression->is_parenthesized()) {
      expression_scope()->RecordDeclarationError(
          Scanner::Location(lhs_beg_pos, end_position()),
          MessageTemplate::kInvalidDestructuringTarget);
    }
    expression_scope()->MarkIdentifierAsAssigned();
  } else if (expression->IsProperty()) {
    expression_scope()->RecordDeclarationError(
        Scanner::Location(lhs_beg_pos, end_position()),
        MessageTemplate::kInvalidPropertyBindingPattern);
  } else if (expression->IsPattern() && op == Token::ASSIGN) {
    // Destructuring assignmment.
    if (expression->is_parenthesized()) {
      Scanner::Location loc(lhs_beg_pos, end_position());
      if (expression_scope()->IsCertainlyDeclaration()) {
        impl()->ReportMessageAt(loc,
                                MessageTemplate::kInvalidDestructuringTarget);
      } else {
        // Reference Error if LHS is neither object literal nor an array literal
        // (Parenthesized literals are
        // CoverParenthesizedExpressionAndArrowParameterList).
        // #sec-assignment-operators-static-semantics-early-errors
        impl()->ReportMessageAt(loc, MessageTemplate::kInvalidLhsInAssignment,
                                static_cast<const char*>(nullptr),
                                kReferenceError);
      }
    }
    expression_scope()->ValidateAsPattern(expression, lhs_beg_pos,
                                          end_position());
  } else {
    DCHECK(!IsValidReferenceExpression(expression));
    expression = RewriteInvalidReferenceExpression(
        expression, lhs_beg_pos, end_position(),
        MessageTemplate::kInvalidLhsInAssignment);
  }

  Consume(op);
  int op_position = position();

  ExpressionT right = ParseAssignmentExpression();

  if (op == Token::ASSIGN) {
    // We try to estimate the set of properties set by constructors. We define a
    // new property whenever there is an assignment to a property of 'this'. We
    // should probably only add properties if we haven't seen them before.
    // Otherwise we'll probably overestimate the number of properties.
    if (impl()->IsThisProperty(expression)) function_state_->AddProperty();

    impl()->CheckAssigningFunctionLiteralToProperty(expression, right);

    // Check if the right hand side is a call to avoid inferring a
    // name if we're dealing with "a = function(){...}();"-like
    // expression.
    if (right->IsCall() || right->IsCallNew()) {
      fni_.RemoveLastFunction();
    } else {
      fni_.Infer();
    }

    impl()->SetFunctionNameFromIdentifierRef(right, expression);
  } else {
    expression_scope()->RecordPatternError(
        Scanner::Location(lhs_beg_pos, end_position()),
        MessageTemplate::kInvalidDestructuringTarget);
    fni_.RemoveLastFunction();
  }

  return factory()->NewAssignment(op, expression, right, op_position);
}

// Precedence = 3
/*
 * 解析条件表达式
 * 即三元运算
 */
template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseConditionalExpression() {
  // ConditionalExpression ::
  //   LogicalOrExpression
  //   LogicalOrExpression '?' AssignmentExpression ':' AssignmentExpression

  int pos = peek_position();
  // We start using the binary expression parser for prec >= 4 only!
  // 二元运算表达式
  ExpressionT expression = ParseBinaryExpression(4);
  return peek() == Token::CONDITIONAL ? ParseConditionalContinuation(expression, pos) : expression;
}


// Precedence >= 4
/*
 * 解析二元运算 1+2,'a' + 'b'
 */
template <typename Impl>
typename ParserBase<Impl>::ExpressionT ParserBase<Impl>::ParseBinaryExpression(int prec) {
  ExpressionT x = ParseUnaryExpression();
  int prec1 = Token::Precedence(peek(), accept_IN_);
  if (prec1 >= prec) {
    return ParseBinaryContinuation(x, prec, prec1);
  }
  return x;
}

/*
 * 解析一元运算 ++a
 */
template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseUnaryExpression() {
  // UnaryExpression ::
  //   PostfixExpression
  //   'delete' UnaryExpression
  //   'void' UnaryExpression
  //   'typeof' UnaryExpression
  //   '++' UnaryExpression
  //   '--' UnaryExpression
  //   '+' UnaryExpression
  //   '-' UnaryExpression
  //   '~' UnaryExpression
  //   '!' UnaryExpression
  //   [+Await] AwaitExpression[?Yield]

  Token::Value op = peek();
  /**
   * IsInRange(op, ADD, DEC)
   * ++ -- + -
   */
  if (Token::IsUnaryOrCountOp(op)) return ParseUnaryOrPrefixExpression();
  if (is_async_function() && op == Token::AWAIT) {
    return ParseAwaitExpression();
  }
  return ParsePostfixExpression();
}

template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParsePostfixExpression() {
  // PostfixExpression ::
  //   LeftHandSideExpression ('++' | '--')?

  int lhs_beg_pos = peek_position();
  ExpressionT expression = ParseLeftHandSideExpression();
  if (V8_LIKELY(!Token::IsCountOp(peek()) ||
                scanner()->HasLineTerminatorBeforeNext())) {
    return expression;
  }
  return ParsePostfixContinuation(expression, lhs_beg_pos);
}

template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseMemberExpression() {
  // MemberExpression ::
  //   (PrimaryExpression | FunctionLiteral | ClassLiteral)
  //     ('[' Expression ']' | '.' Identifier | Arguments | TemplateLiteral)*
  //
  // CallExpression ::
  //   (SuperCall | ImportCall)
  //     ('[' Expression ']' | '.' Identifier | Arguments | TemplateLiteral)*
  //
  // The '[' Expression ']' and '.' Identifier parts are parsed by
  // ParseMemberExpressionContinuation, and everything preceeding it is merged
  // into ParsePrimaryExpression.

  // Parse the initial primary or function expression.
  ExpressionT result = ParsePrimaryExpression();
  return ParseMemberExpressionContinuation(result);
}

template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseLeftHandSideExpression() {
  // LeftHandSideExpression ::
  //   (NewExpression | MemberExpression) ...

  ExpressionT result = ParseMemberExpression();
  if (!Token::IsPropertyOrCall(peek())) return result;
  return ParseLeftHandSideContinuation(result);
}

template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseUnaryOrPrefixExpression() {
  Token::Value op = Next();
  int pos = position();

  // Assume "! function ..." indicates the function is likely to be called.
  // 解析!function(){}这种立即调用
  if (op == Token::NOT && peek() == Token::FUNCTION) {
    function_state_->set_next_function_is_likely_called();
  }

  CheckStackOverflow();

  int expression_position = peek_position();
  ExpressionT expression = ParseUnaryExpression();

  if (Token::IsUnaryOp(op)) {
    if (op == Token::DELETE) {
      if (impl()->IsIdentifier(expression) && is_strict(language_mode())) {
        // "delete identifier" is a syntax error in strict mode.
        ReportMessage(MessageTemplate::kStrictDelete);
        return impl()->FailureExpression();
      }

      if (impl()->IsPropertyWithPrivateFieldKey(expression)) {
        ReportMessage(MessageTemplate::kDeletePrivateField);
        return impl()->FailureExpression();
      }
    }

    if (peek() == Token::EXP) {
      impl()->ReportMessageAt(
          Scanner::Location(pos, peek_end_position()),
          MessageTemplate::kUnexpectedTokenUnaryExponentiation);
      return impl()->FailureExpression();
    }

    // Allow the parser's implementation to rewrite the expression.
    return impl()->BuildUnaryExpression(expression, op, pos);
  }

  DCHECK(Token::IsCountOp(op));

  if (V8_LIKELY(IsValidReferenceExpression(expression))) {
    if (impl()->IsIdentifier(expression)) {
      expression_scope()->MarkIdentifierAsAssigned();
    }
  } else {
    expression = RewriteInvalidReferenceExpression(
        expression, expression_position, end_position(),
        MessageTemplate::kInvalidLhsInPrefixOp);
  }

  return factory()->NewCountOperation(op, true /* prefix */, expression,
                                      position());
}