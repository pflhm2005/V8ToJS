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
ParserBase<Impl>::ParseLeftHandSideExpression() {
  // LeftHandSideExpression ::
  //   (NewExpression | MemberExpression) ...

  ExpressionT result = ParseMemberExpression();
  if (!Token::IsPropertyOrCall(peek())) return result;
  return ParseLeftHandSideContinuation(result);
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
ParserBase<Impl>::ParsePrimaryExpression() {
  CheckStackOverflow();

  // PrimaryExpression ::
  //   'this'
  //   'null'
  //   'true'
  //   'false'
  //   Identifier
  //   Number
  //   String
  //   ArrayLiteral
  //   ObjectLiteral
  //   RegExpLiteral
  //   ClassLiteral
  //   '(' Expression ')'
  //   TemplateLiteral
  //   do Block
  //   AsyncFunctionLiteral

  int beg_pos = peek_position();
  Token::Value token = peek();

  if (Token::IsAnyIdentifier(token)) {
    Consume(token);

    FunctionKind kind = FunctionKind::kArrowFunction;

    if (V8_UNLIKELY(token == Token::ASYNC &&
                    !scanner()->HasLineTerminatorBeforeNext() &&
                    !scanner()->literal_contains_escapes())) {
      // async function ...
      if (peek() == Token::FUNCTION) return ParseAsyncFunctionLiteral();

      // async Identifier => ...
      if (peek_any_identifier() && PeekAhead() == Token::ARROW) {
        token = Next();
        beg_pos = position();
        kind = FunctionKind::kAsyncArrowFunction;
      }
    }

    if (V8_UNLIKELY(peek() == Token::ARROW)) {
      ArrowHeadParsingScope parsing_scope(impl(), kind);
      IdentifierT name = ParseAndClassifyIdentifier(token);
      ClassifyParameter(name, beg_pos, end_position());
      ExpressionT result =
          impl()->ExpressionFromIdentifier(name, beg_pos, InferName::kNo);
      next_arrow_function_info_.scope = parsing_scope.ValidateAndCreateScope();
      return result;
    }

    IdentifierT name = ParseAndClassifyIdentifier(token);
    return impl()->ExpressionFromIdentifier(name, beg_pos);
  }

  if (Token::IsLiteral(token)) {
    return impl()->ExpressionFromLiteral(Next(), beg_pos);
  }

  switch (token) {
    case Token::NEW:
      return ParseMemberWithPresentNewPrefixesExpression();

    case Token::THIS: {
      Consume(Token::THIS);
      return impl()->ThisExpression();
    }

    case Token::ASSIGN_DIV:
    case Token::DIV:
      return ParseRegExpLiteral();

    case Token::FUNCTION:
      return ParseFunctionExpression();

    case Token::SUPER: {
      const bool is_new = false;
      return ParseSuperExpression(is_new);
    }
    case Token::IMPORT:
      if (!allow_harmony_dynamic_import()) break;
      return ParseImportExpressions();

    case Token::LBRACK:
      return ParseArrayLiteral();

    case Token::LBRACE:
      return ParseObjectLiteral();

    case Token::LPAREN: {
      Consume(Token::LPAREN);
      if (Check(Token::RPAREN)) {
        // ()=>x.  The continuation that consumes the => is in
        // ParseAssignmentExpressionCoverGrammar.
        if (peek() != Token::ARROW) ReportUnexpectedToken(Token::RPAREN);
        next_arrow_function_info_.scope =
            NewFunctionScope(FunctionKind::kArrowFunction);
        return factory()->NewEmptyParentheses(beg_pos);
      }
      Scope::Snapshot scope_snapshot(scope());
      ArrowHeadParsingScope maybe_arrow(impl(), FunctionKind::kArrowFunction);
      // Heuristically try to detect immediately called functions before
      // seeing the call parentheses.
      if (peek() == Token::FUNCTION ||
          (peek() == Token::ASYNC && PeekAhead() == Token::FUNCTION)) {
        function_state_->set_next_function_is_likely_called();
      }
      AcceptINScope scope(this, true);
      ExpressionT expr = ParseExpressionCoverGrammar();
      expr->mark_parenthesized();
      Expect(Token::RPAREN);

      if (peek() == Token::ARROW) {
        next_arrow_function_info_.scope = maybe_arrow.ValidateAndCreateScope();
        scope_snapshot.Reparent(next_arrow_function_info_.scope);
      } else {
        maybe_arrow.ValidateExpression();
      }

      return expr;
    }

    case Token::CLASS: {
      Consume(Token::CLASS);
      int class_token_pos = position();
      IdentifierT name = impl()->NullIdentifier();
      bool is_strict_reserved_name = false;
      Scanner::Location class_name_location = Scanner::Location::invalid();
      if (peek_any_identifier()) {
        name = ParseAndClassifyIdentifier(Next());
        class_name_location = scanner()->location();
        is_strict_reserved_name =
            Token::IsStrictReservedWord(scanner()->current_token());
      }
      return ParseClassLiteral(name, class_name_location,
                               is_strict_reserved_name, class_token_pos);
    }

    case Token::TEMPLATE_SPAN:
    case Token::TEMPLATE_TAIL:
      return ParseTemplateLiteral(impl()->NullExpression(), beg_pos, false);

    case Token::MOD:
      if (allow_natives() || extension_ != nullptr) {
        return ParseV8Intrinsic();
      }
      break;

    default:
      break;
  }

  ReportUnexpectedToken(Next());
  return impl()->FailureExpression();
}

Expression* Parser::ExpressionFromLiteral(Token::Value token, int pos) {
  switch (token) {
    case Token::NULL_LITERAL:
      return factory()->NewNullLiteral(pos);
    case Token::TRUE_LITERAL:
      return factory()->NewBooleanLiteral(true, pos);
    case Token::FALSE_LITERAL:
      return factory()->NewBooleanLiteral(false, pos);
    case Token::SMI: {
      uint32_t value = scanner()->smi_value();
      return factory()->NewSmiLiteral(value, pos);
    }
    case Token::NUMBER: {
      double value = scanner()->DoubleValue();
      return factory()->NewNumberLiteral(value, pos);
    }
    case Token::BIGINT:
      return factory()->NewBigIntLiteral(
          AstBigInt(scanner()->CurrentLiteralAsCString(zone())), pos);
    case Token::STRING: {
      return factory()->NewStringLiteral(GetSymbol(), pos);
    }
    default:
      DCHECK(false);
  }
  return FailureExpression();
}

Literal* NewSmiLiteral(int number, int pos) {
  return new (zone_) Literal(number, pos);
}

ParseMemberExpressionContinuation(ExpressionT expression) {
  if (!Token::IsMember(peek())) return expression;
  return DoParseMemberExpressionContinuation(expression);
}

template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::DoParseMemberExpressionContinuation(ExpressionT expression) {
  DCHECK(Token::IsMember(peek()));
  // Parses this part of MemberExpression:
  // ('[' Expression ']' | '.' Identifier | TemplateLiteral)*
  do {
    switch (peek()) {
      case Token::LBRACK: {
        Consume(Token::LBRACK);
        int pos = position();
        AcceptINScope scope(this, true);
        ExpressionT index = ParseExpressionCoverGrammar();
        expression = factory()->NewProperty(expression, index, pos);
        impl()->PushPropertyName(index);
        Expect(Token::RBRACK);
        break;
      }
      case Token::PERIOD: {
        Consume(Token::PERIOD);
        int pos = peek_position();
        ExpressionT key = ParsePropertyOrPrivatePropertyName();
        expression = factory()->NewProperty(expression, key, pos);
        break;
      }
      default: {
        DCHECK(Token::IsTemplate(peek()));
        int pos;
        if (scanner()->current_token() == Token::IDENTIFIER) {
          pos = position();
        } else {
          pos = peek_position();
          if (expression->IsFunctionLiteral()) {
            // If the tag function looks like an IIFE, set_parenthesized() to
            // force eager compilation.
            expression->AsFunctionLiteral()->SetShouldEagerCompile();
          }
        }
        expression = ParseTemplateLiteral(expression, pos, true);
        break;
      }
    }
  } while (Token::IsMember(peek()));
  return expression;
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