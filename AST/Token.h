#define BINARY_OP_TOKEN_LIST(T, E) \
  E(T, BIT_OR, "|", 6)             \
  E(T, BIT_XOR, "^", 7)            \
  E(T, BIT_AND, "&", 8)            \
  E(T, SHL, "<<", 11)              \
  E(T, SAR, ">>", 11)              \
  E(T, SHR, ">>>", 11)             \
  E(T, MUL, "*", 13)               \
  E(T, DIV, "/", 13)               \
  E(T, MOD, "%", 13)               \
  E(T, EXP, "**", 14)              \
  E(T, ADD, "+", 12)               \
  E(T, SUB, "-", 12)

BINARY_OP_TOKEN_LIST(T, EXPAND_BINOP_ASSIGN_TOKEN)               \
#define EXPAND_BINOP_ASSIGN_TOKEN(T, name, string, precedence) \
  T(ASSIGN_##name, string "=", 2)

BINARY_OP_TOKEN_LIST(T, EXPAND_BINOP_TOKEN)                      \
#define EXPAND_BINOP_TOKEN(T, name, string, precedence) \
  T(name, string, precedence)

#define T(name, string, precedence) name,
  enum Value : uint8_t { TOKEN_LIST(T, T) NUM_TOKENS };
#undef T  