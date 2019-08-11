enum VariableDeclarationContext {
  kStatementListItem,
  kStatement,
  kForStatement
};

/**
 * Impl就是Parser
 */
template <typename Impl>
typename ParserBase<Impl>::StatementT
ParserBase<Impl>::ParseStatementListItem() {
  // ECMA 262 6th Edition
  // StatementListItem[Yield, Return] :
  //   Statement[?Yield, ?Return]
  //   Declaration[?Yield]
  //
  // Declaration[Yield] :
  //   HoistableDeclaration[?Yield]
  //   ClassDeclaration[?Yield]
  //   LexicalDeclaration[In, ?Yield]
  //
  // HoistableDeclaration[Yield, Default] :
  //   FunctionDeclaration[?Yield, ?Default]
  //   GeneratorDeclaration[?Yield, ?Default]
  //
  // LexicalDeclaration[In, Yield] :
  //   LetOrConst BindingList[?In, ?Yield] ;

  switch (peek()) {
    case Token::FUNCTION:
      return ParseHoistableDeclaration(nullptr, false);
    case Token::CLASS:
      Consume(Token::CLASS);
      return ParseClassDeclaration(nullptr, false);
    case Token::VAR:
    case Token::CONST:
      return ParseVariableStatement(kStatementListItem, nullptr);
    case Token::LET:
      if (IsNextLetKeyword()) {
        return ParseVariableStatement(kStatementListItem, nullptr);
      }
      break;
    case Token::ASYNC:
      if (PeekAhead() == Token::FUNCTION &&
          !scanner()->HasLineTerminatorAfterNext()) {
        Consume(Token::ASYNC);
        return ParseAsyncFunctionDeclaration(nullptr, false);
      }
      break;
    default:
      break;
  }
  return ParseStatement(nullptr, nullptr, kAllowLabelledFunctionStatement);
}

/**
 * 前两个参数代表break、continue的跳转标记
 * 该语法本基本上已经没人用了
 * 处理各种特殊关键词
 */
template <typename Impl>
typename ParserBase<Impl>::StatementT ParserBase<Impl>::ParseStatement(
    ZonePtrList<const AstRawString>* labels,
    ZonePtrList<const AstRawString>* own_labels,
    AllowLabelledFunctionStatement allow_function) {
  // Statement ::
  //   Block
  //   VariableStatement
  //   EmptyStatement
  //   ExpressionStatement
  //   IfStatement
  //   IterationStatement
  //   ContinueStatement
  //   BreakStatement
  //   ReturnStatement
  //   WithStatement
  //   LabelledStatement
  //   SwitchStatement
  //   ThrowStatement
  //   TryStatement
  //   DebuggerStatement

  switch (peek()) {
    // ...
    default:
      return ParseExpressionOrLabelledStatement(labels, own_labels,
                                                allow_function);
  }
}

/**
 * 处理表达式
 */
template <typename Impl>
typename ParserBase<Impl>::StatementT
ParserBase<Impl>::ParseExpressionOrLabelledStatement(
    ZonePtrList<const AstRawString>* labels,
    ZonePtrList<const AstRawString>* own_labels,
    AllowLabelledFunctionStatement allow_function) {
  int pos = peek_position();

  switch (peek()) {
    // ...
  }

  bool starts_with_identifier = peek_any_identifier();
  // 表达式
  ExpressionT expr = ParseExpression();
  // ...

  // Parsed expression statement, followed by semicolon.
  ExpectSemicolon();
  if (expr->IsFailureExpression()) return impl()->NullStatement();
  return factory()->NewExpressionStatement(expr, pos);
}

template <typename Impl>
typename ParserBase<Impl>::ExpressionT ParserBase<Impl>::ParseExpression() {
  ExpressionParsingScope expression_scope(impl());
  AcceptINScope scope(this, true);
  ExpressionT result = ParseExpressionCoverGrammar();
  expression_scope.ValidateExpression();
  return result;
}

template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseExpressionCoverGrammar() {
  // Expression ::
  //   AssignmentExpression
  //   Expression ',' AssignmentExpression

  ExpressionListT list(pointer_buffer());
  ExpressionT expression;
  AccumulationScope accumulation_scope(expression_scope());
  while (true) {
    if (V8_UNLIKELY(peek() == Token::ELLIPSIS)) {
      return ParseArrowParametersWithRest(&list, &accumulation_scope);
    }

    int expr_pos = peek_position();
    expression = ParseAssignmentExpressionCoverGrammar();

    ClassifyArrowParameter(&accumulation_scope, expr_pos, expression);
    list.Add(expression);

    // ...
  }

  // Return the single element if the list is empty. We need to do this because
  // callers of this function care about the type of the result if there was
  // only a single assignment expression. The preparser would lose this
  // information otherwise.
  if (list.length() == 1) return expression;
  return impl()->ExpressionListToExpression(list);
}

// Precedence = 3
template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseConditionalExpression() {
  // ConditionalExpression ::
  //   LogicalOrExpression
  //   LogicalOrExpression '?' AssignmentExpression ':' AssignmentExpression

  int pos = peek_position();
  ExpressionT expression = ParseBinaryExpression(4);
  return peek() == Token::CONDITIONAL
             ? ParseConditionalContinuation(expression, pos)
             : expression;
}

// Precedence >= 4
template <typename Impl>
typename ParserBase<Impl>::ExpressionT ParserBase<Impl>::ParseBinaryExpression(
    int prec) {
  DCHECK_GE(prec, 4);
  /**
   * 解析出一个字符串字面量
   */
  ExpressionT x = ParseUnaryExpression();
  int prec1 = Token::Precedence(peek(), accept_IN_);
  if (prec1 >= prec) {
    return ParseBinaryContinuation(x, prec, prec1);
  }
  return x;
}

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

/**
 * MLGB一个表达式这么麻烦
 */
template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParsePrimaryExpression() {
  // ...

  if (Token::IsLiteral(token)) {
    return impl()->ExpressionFromLiteral(Next(), beg_pos);
  }

  // ...

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

// Precedence >= 4
template <typename Impl>
typename ParserBase<Impl>::ExpressionT
ParserBase<Impl>::ParseBinaryContinuation(ExpressionT x, int prec, int prec1) {
  do {
    // prec1 >= 4
    while (Token::Precedence(peek(), accept_IN_) == prec1) {
      SourceRange right_range;
      int pos = peek_position();
      ExpressionT y;
      Token::Value op;
      {
        SourceRangeScope right_range_scope(scanner(), &right_range);
        op = Next();

        const bool is_right_associative = op == Token::EXP;
        const int next_prec = is_right_associative ? prec1 : prec1 + 1;
        y = ParseBinaryExpression(next_prec);
      }

      // For now we distinguish between comparisons and other binary
      // operations.  (We could combine the two and get rid of this
      // code and AST node eventually.)
      if (Token::IsCompareOp(op)) {
        // We have a comparison.
        Token::Value cmp = op;
        switch (op) {
          case Token::NE: cmp = Token::EQ; break;
          case Token::NE_STRICT: cmp = Token::EQ_STRICT; break;
          default: break;
        }
        x = factory()->NewCompareOperation(cmp, x, y, pos);
        if (cmp != op) {
          // The comparison was negated - add a NOT.
          x = factory()->NewUnaryOperation(Token::NOT, x, pos);
        }
      } else if (!impl()->ShortcutNumericLiteralBinaryExpression(&x, y, op,
                                                                 pos) &&
                 !impl()->CollapseNaryExpression(&x, y, op, pos, right_range)) {
        // We have a "normal" binary operation.
        x = factory()->NewBinaryOperation(op, x, y, pos);
        if (op == Token::OR || op == Token::AND) {
          impl()->RecordBinaryOperationSourceRange(x, right_range);
        }
      }
    }
    --prec1;
  } while (prec1 >= prec);

  return x;
}

BinaryOperation* NewBinaryOperation(Token::Value op, Expression* left, Expression* right, int pos) {
  return new (zone_) BinaryOperation(op, left, right, pos);
}

BinaryOperation(Token::Value op, Expression* left, Expression* right, int pos)
    : Expression(pos, kBinaryOperation), left_(left), right_(right) {
  bit_field_ |= OperatorField::encode(op);
  DCHECK(Token::IsBinaryOp(op));
}