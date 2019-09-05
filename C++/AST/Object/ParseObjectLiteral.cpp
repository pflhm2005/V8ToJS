// Property is used for passing information
// about an object literal's properties from the parser
// to the code generator.
class ObjectLiteralProperty final : public LiteralProperty {
 public:
  enum Kind : uint8_t {
    CONSTANT,              // Property with constant value (compile time).
    COMPUTED,              // Property with computed value (execution time).
    MATERIALIZED_LITERAL,  // Property value is a materialized literal.
    GETTER,
    SETTER,     // Property is an accessor function.
    PROTOTYPE,  // Property is __proto__.
    SPREAD
  };

  Kind kind() const { return kind_; }

  bool IsCompileTimeValue() const;

  void set_emit_store(bool emit_store);
  bool emit_store() const;

  bool IsNullPrototype() const {
    return IsPrototype() && value()->IsNullLiteral();
  }
  bool IsPrototype() const { return kind() == PROTOTYPE; }

 private:
  friend class AstNodeFactory;

  ObjectLiteralProperty(Expression* key, Expression* value, Kind kind,
                        bool is_computed_name);
  ObjectLiteralProperty(AstValueFactory* ast_value_factory, Expression* key,
                        Expression* value, bool is_computed_name);

  Kind kind_;
  bool emit_store_;
};

struct ParsePropertyInfo {
  public:
  explicit ParsePropertyInfo(ParserBase* parser,
                              AccumulationScope* accumulation_scope = nullptr)
      : accumulation_scope(accumulation_scope),
        name(parser->impl()->NullIdentifier()),
        position(PropertyPosition::kClassLiteral),
        function_flags(ParseFunctionFlag::kIsNormal),
        kind(ParsePropertyKind::kNotSet),
        is_computed_name(false),
        is_private(false),
        is_static(false),
        is_rest(false) {}

  bool ParsePropertyKindFromToken(Token::Value token) {
    // This returns true, setting the property kind, iff the given token is
    // one which must occur after a property name, indicating that the
    // previous token was in fact a name and not a modifier (like the "get" in
    // "get x").
    switch (token) {
      case Token::COLON:
        kind = ParsePropertyKind::kValue;
        return true;
      case Token::COMMA:
        kind = ParsePropertyKind::kShorthand;
        return true;
      case Token::RBRACE:
        kind = ParsePropertyKind::kShorthandOrClassField;
        return true;
      case Token::ASSIGN:
        kind = ParsePropertyKind::kAssign;
        return true;
      case Token::LPAREN:
        kind = ParsePropertyKind::kMethod;
        return true;
      case Token::MUL:
      case Token::SEMICOLON:
        kind = ParsePropertyKind::kClassField;
        return true;
      default:
        break;
    }
    return false;
  }

  AccumulationScope* accumulation_scope;
  IdentifierT name;
  PropertyPosition position;
  ParseFunctionFlags function_flags;
  ParsePropertyKind kind;
  bool is_computed_name;
  bool is_private;
  bool is_static;
  bool is_rest;
};

template <typename Impl>
typename ParserBase<Impl>::ExpressionT ParserBase<Impl>::ParseObjectLiteral() {
  // ObjectLiteral ::
  // '{' (PropertyDefinition (',' PropertyDefinition)* ','? )? '}'

  int pos = peek_position();
  ObjectPropertyListT properties(pointer_buffer());
  int number_of_boilerplate_properties = 0;

  bool has_computed_names = false;
  bool has_rest_property = false;
  bool has_seen_proto = false;

  Consume(Token::LBRACE);
  AccumulationScope accumulation_scope(expression_scope());
  /**
   * 解析'}'符号之前的内容
   */
  while (!Check(Token::RBRACE)) {
    FuncNameInferrerState fni_state(&fni_);

    ParsePropertyInfo prop_info(this, &accumulation_scope);
    prop_info.position = PropertyPosition::kObjectLiteral;
    ObjectLiteralPropertyT property = ParseObjectPropertyDefinition(&prop_info, &has_seen_proto);
    if (impl()->IsNull(property)) return impl()->FailureExpression();

    if (prop_info.is_computed_name) {
      has_computed_names = true;
    }

    if (prop_info.is_rest) {
      has_rest_property = true;
    }

    if (impl()->IsBoilerplateProperty(property) && !has_computed_names) {
      // Count CONSTANT or COMPUTED properties to maintain the enumeration
      // order.
      number_of_boilerplate_properties++;
    }

    properties.Add(property);

    if (peek() != Token::RBRACE) {
      Expect(Token::COMMA);
    }

    fni_.Infer();
  }

  // In pattern rewriter, we rewrite rest property to call out to a
  // runtime function passing all the other properties as arguments to
  // this runtime function. Here, we make sure that the number of
  // properties is less than number of arguments allowed for a runtime
  // call.
  if (has_rest_property && properties.length() > Code::kMaxArguments) {
    expression_scope()->RecordPatternError(Scanner::Location(pos, position()),
                                           MessageTemplate::kTooManyArguments);
  }

  return impl()->InitializeObjectLiteral(factory()->NewObjectLiteral(
      properties, number_of_boilerplate_properties, pos, has_rest_property));
}


template <typename Impl>
typename ParserBase<Impl>::ObjectLiteralPropertyT
ParserBase<Impl>::ParseObjectPropertyDefinition(ParsePropertyInfo* prop_info,
                                                bool* has_seen_proto) {
  DCHECK_EQ(prop_info->position, PropertyPosition::kObjectLiteral);
  Token::Value name_token = peek();
  Scanner::Location next_loc = scanner()->peek_location();

  ExpressionT name_expression = ParseProperty(prop_info);

  DCHECK_IMPLIES(name_token == Token::PRIVATE_NAME, has_error());

  IdentifierT name = prop_info->name;
  ParseFunctionFlags function_flags = prop_info->function_flags;
  ParsePropertyKind kind = prop_info->kind;

  switch (prop_info->kind) {
    case ParsePropertyKind::kSpread:
      DCHECK_EQ(function_flags, ParseFunctionFlag::kIsNormal);
      DCHECK(!prop_info->is_computed_name);
      DCHECK_EQ(Token::ELLIPSIS, name_token);

      prop_info->is_computed_name = true;
      prop_info->is_rest = true;

      return factory()->NewObjectLiteralProperty(
          factory()->NewTheHoleLiteral(), name_expression,
          ObjectLiteralProperty::SPREAD, true);

    case ParsePropertyKind::kValue: {
      DCHECK_EQ(function_flags, ParseFunctionFlag::kIsNormal);

      if (!prop_info->is_computed_name &&
          scanner()->CurrentLiteralEquals("__proto__")) {
        if (*has_seen_proto) {
          expression_scope()->RecordExpressionError(
              scanner()->location(), MessageTemplate::kDuplicateProto);
        }
        *has_seen_proto = true;
      }
      Consume(Token::COLON);
      AcceptINScope scope(this, true);
      ExpressionT value =
          ParsePossibleDestructuringSubPattern(prop_info->accumulation_scope);

      ObjectLiteralPropertyT result = factory()->NewObjectLiteralProperty(
          name_expression, value, prop_info->is_computed_name);
      impl()->SetFunctionNameFromPropertyName(result, name);
      return result;
    }

    case ParsePropertyKind::kAssign:
    case ParsePropertyKind::kShorthandOrClassField:
    case ParsePropertyKind::kShorthand: {
      // PropertyDefinition
      //    IdentifierReference
      //    CoverInitializedName
      //
      // CoverInitializedName
      //    IdentifierReference Initializer?
      DCHECK_EQ(function_flags, ParseFunctionFlag::kIsNormal);

      if (!Token::IsValidIdentifier(name_token, language_mode(), is_generator(),
                                    parsing_module_ || is_async_function())) {
        ReportUnexpectedToken(Next());
        return impl()->NullLiteralProperty();
      }

      DCHECK(!prop_info->is_computed_name);

      if (name_token == Token::AWAIT) {
        DCHECK(!is_async_function());
        expression_scope()->RecordAsyncArrowParametersError(
            next_loc, MessageTemplate::kAwaitBindingIdentifier);
      }
      ExpressionT lhs =
          impl()->ExpressionFromIdentifier(name, next_loc.beg_pos);
      if (!IsAssignableIdentifier(lhs)) {
        expression_scope()->RecordPatternError(
            next_loc, MessageTemplate::kStrictEvalArguments);
      }

      ExpressionT value;
      if (peek() == Token::ASSIGN) {
        Consume(Token::ASSIGN);
        {
          AcceptINScope scope(this, true);
          ExpressionT rhs = ParseAssignmentExpression();
          value = factory()->NewAssignment(Token::ASSIGN, lhs, rhs,
                                           kNoSourcePosition);
          impl()->SetFunctionNameFromIdentifierRef(rhs, lhs);
        }
        expression_scope()->RecordExpressionError(
            Scanner::Location(next_loc.beg_pos, end_position()),
            MessageTemplate::kInvalidCoverInitializedName);
      } else {
        value = lhs;
      }

      ObjectLiteralPropertyT result = factory()->NewObjectLiteralProperty(
          name_expression, value, ObjectLiteralProperty::COMPUTED, false);
      impl()->SetFunctionNameFromPropertyName(result, name);
      return result;
    }

    case ParsePropertyKind::kMethod: {
      // MethodDefinition
      //    PropertyName '(' StrictFormalParameters ')' '{' FunctionBody '}'
      //    '*' PropertyName '(' StrictFormalParameters ')' '{' FunctionBody '}'

      expression_scope()->RecordPatternError(
          Scanner::Location(next_loc.beg_pos, end_position()),
          MessageTemplate::kInvalidDestructuringTarget);

      FunctionKind kind = MethodKindFor(function_flags);

      ExpressionT value = impl()->ParseFunctionLiteral(
          name, scanner()->location(), kSkipFunctionNameCheck, kind,
          next_loc.beg_pos, FunctionLiteral::kAccessorOrMethod, language_mode(),
          nullptr);

      ObjectLiteralPropertyT result = factory()->NewObjectLiteralProperty(
          name_expression, value, ObjectLiteralProperty::COMPUTED,
          prop_info->is_computed_name);
      impl()->SetFunctionNameFromPropertyName(result, name);
      return result;
    }

    case ParsePropertyKind::kAccessorGetter:
    case ParsePropertyKind::kAccessorSetter: {
      DCHECK_EQ(function_flags, ParseFunctionFlag::kIsNormal);
      bool is_get = kind == ParsePropertyKind::kAccessorGetter;

      expression_scope()->RecordPatternError(
          Scanner::Location(next_loc.beg_pos, end_position()),
          MessageTemplate::kInvalidDestructuringTarget);

      if (!prop_info->is_computed_name) {
        // Make sure the name expression is a string since we need a Name for
        // Runtime_DefineAccessorPropertyUnchecked and since we can determine
        // this statically we can skip the extra runtime check.
        name_expression =
            factory()->NewStringLiteral(name, name_expression->position());
      }

      FunctionKind kind = is_get ? FunctionKind::kGetterFunction
                                 : FunctionKind::kSetterFunction;

      FunctionLiteralT value = impl()->ParseFunctionLiteral(
          name, scanner()->location(), kSkipFunctionNameCheck, kind,
          next_loc.beg_pos, FunctionLiteral::kAccessorOrMethod, language_mode(),
          nullptr);

      ObjectLiteralPropertyT result = factory()->NewObjectLiteralProperty(
          name_expression, value,
          is_get ? ObjectLiteralProperty::GETTER
                 : ObjectLiteralProperty::SETTER,
          prop_info->is_computed_name);
      const AstRawString* prefix =
          is_get ? ast_value_factory()->get_space_string()
                 : ast_value_factory()->set_space_string();
      impl()->SetFunctionNameFromPropertyName(result, name, prefix);
      return result;
    }

    case ParsePropertyKind::kClassField:
    case ParsePropertyKind::kNotSet:
      ReportUnexpectedToken(Next());
      return impl()->NullLiteralProperty();
  }
  UNREACHABLE();
}




template <class Impl>
typename ParserBase<Impl>::ExpressionT ParserBase<Impl>::ParseProperty(
    ParsePropertyInfo* prop_info) {
  DCHECK_EQ(prop_info->kind, ParsePropertyKind::kNotSet);
  DCHECK_EQ(prop_info->function_flags, ParseFunctionFlag::kIsNormal);
  DCHECK(!prop_info->is_computed_name);

  if (Check(Token::ASYNC)) {
    Token::Value token = peek();
    if ((token != Token::MUL && prop_info->ParsePropertyKindFromToken(token)) ||
        scanner()->HasLineTerminatorBeforeNext()) {
      prop_info->name = impl()->GetIdentifier();
      impl()->PushLiteralName(prop_info->name);
      return factory()->NewStringLiteral(prop_info->name, position());
    }
    if (V8_UNLIKELY(scanner()->literal_contains_escapes())) {
      impl()->ReportUnexpectedToken(Token::ESCAPED_KEYWORD);
    }
    prop_info->function_flags = ParseFunctionFlag::kIsAsync;
    prop_info->kind = ParsePropertyKind::kMethod;
  }

  if (Check(Token::MUL)) {
    prop_info->function_flags |= ParseFunctionFlag::kIsGenerator;
    prop_info->kind = ParsePropertyKind::kMethod;
  }

  if (prop_info->kind == ParsePropertyKind::kNotSet &&
      IsInRange(peek(), Token::GET, Token::SET)) {
    Token::Value token = Next();
    if (prop_info->ParsePropertyKindFromToken(peek())) {
      prop_info->name = impl()->GetIdentifier();
      impl()->PushLiteralName(prop_info->name);
      return factory()->NewStringLiteral(prop_info->name, position());
    }
    if (V8_UNLIKELY(scanner()->literal_contains_escapes())) {
      impl()->ReportUnexpectedToken(Token::ESCAPED_KEYWORD);
    }
    if (token == Token::GET) {
      prop_info->kind = ParsePropertyKind::kAccessorGetter;
    } else if (token == Token::SET) {
      prop_info->kind = ParsePropertyKind::kAccessorSetter;
    }
  }

  int pos = peek_position();

  // For non computed property names we normalize the name a bit:
  //
  //   "12" -> 12
  //   12.3 -> "12.3"
  //   12.30 -> "12.3"
  //   identifier -> "identifier"
  //
  // This is important because we use the property name as a key in a hash
  // table when we compute constant properties.
  bool is_array_index;
  uint32_t index;
  switch (peek()) {
    case Token::PRIVATE_NAME:
      prop_info->is_private = true;
      is_array_index = false;
      Consume(Token::PRIVATE_NAME);
      if (prop_info->kind == ParsePropertyKind::kNotSet) {
        prop_info->ParsePropertyKindFromToken(peek());
      }
      prop_info->name = impl()->GetIdentifier();
      if (V8_UNLIKELY(prop_info->position ==
                      PropertyPosition::kObjectLiteral)) {
        ReportUnexpectedToken(Token::PRIVATE_NAME);
        prop_info->kind = ParsePropertyKind::kNotSet;
        return impl()->FailureExpression();
      }
      if (V8_UNLIKELY(!allow_harmony_private_methods() &&
                      (IsAccessor(prop_info->kind) ||
                       prop_info->kind == ParsePropertyKind::kMethod))) {
        ReportUnexpectedToken(Next());
        prop_info->kind = ParsePropertyKind::kNotSet;
        return impl()->FailureExpression();
      }
      break;

    case Token::STRING:
      Consume(Token::STRING);
      prop_info->name = peek() == Token::COLON ? impl()->GetSymbol()
                                               : impl()->GetIdentifier();
      is_array_index = impl()->IsArrayIndex(prop_info->name, &index);
      break;

    case Token::SMI:
      Consume(Token::SMI);
      index = scanner()->smi_value();
      is_array_index = true;
      // Token::SMI were scanned from their canonical representation.
      prop_info->name = impl()->GetSymbol();
      break;

    case Token::NUMBER: {
      Consume(Token::NUMBER);
      prop_info->name = impl()->GetNumberAsSymbol();
      is_array_index = impl()->IsArrayIndex(prop_info->name, &index);
      break;
    }
    case Token::LBRACK: {
      prop_info->name = impl()->NullIdentifier();
      prop_info->is_computed_name = true;
      Consume(Token::LBRACK);
      AcceptINScope scope(this, true);
      ExpressionT expression = ParseAssignmentExpression();
      Expect(Token::RBRACK);
      if (prop_info->kind == ParsePropertyKind::kNotSet) {
        prop_info->ParsePropertyKindFromToken(peek());
      }
      return expression;
    }

    case Token::ELLIPSIS:
      if (prop_info->kind == ParsePropertyKind::kNotSet) {
        prop_info->name = impl()->NullIdentifier();
        Consume(Token::ELLIPSIS);
        AcceptINScope scope(this, true);
        int start_pos = peek_position();
        ExpressionT expression =
            ParsePossibleDestructuringSubPattern(prop_info->accumulation_scope);
        prop_info->kind = ParsePropertyKind::kSpread;

        if (!IsValidReferenceExpression(expression)) {
          expression_scope()->RecordDeclarationError(
              Scanner::Location(start_pos, end_position()),
              MessageTemplate::kInvalidRestBindingPattern);
          expression_scope()->RecordPatternError(
              Scanner::Location(start_pos, end_position()),
              MessageTemplate::kInvalidRestAssignmentPattern);
        }

        if (peek() != Token::RBRACE) {
          expression_scope()->RecordPatternError(
              scanner()->location(), MessageTemplate::kElementAfterRest);
        }
        return expression;
      }
      V8_FALLTHROUGH;

    default:
      prop_info->name = ParsePropertyName();
      is_array_index = false;
      break;
  }

  if (prop_info->kind == ParsePropertyKind::kNotSet) {
    prop_info->ParsePropertyKindFromToken(peek());
  }
  impl()->PushLiteralName(prop_info->name);
  return is_array_index ? factory()->NewNumberLiteral(index, pos)
                        : factory()->NewStringLiteral(prop_info->name, pos);
}