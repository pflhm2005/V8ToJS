// For generating constants.
#define AST_STRING_CONSTANTS(F)                 \
  F(anonymous, "anonymous")                     \
  F(anonymous_function, "(anonymous function)") \
  F(arguments, "arguments")                     \
  F(as, "as")                                   \
  F(async, "async")                             \
  F(await, "await")                             \
  F(bigint, "bigint")                           \
  F(boolean, "boolean")                         \
  F(computed, "<computed>")                     \
  F(dot_brand, ".brand")                        \
  F(constructor, "constructor")                 \
  F(default, "default")                         \
  F(done, "done")                               \
  F(dot, ".")                                   \
  F(dot_default, ".default")                    \
  F(dot_for, ".for")                            \
  F(dot_generator_object, ".generator_object")  \
  F(dot_iterator, ".iterator")                  \
  F(dot_promise, ".promise")                    \
  F(dot_result, ".result")                      \
  F(dot_switch_tag, ".switch_tag")              \
  F(dot_catch, ".catch")                        \
  F(empty, "")                                  \
  F(eval, "eval")                               \
  F(from, "from")                               \
  F(function, "function")                       \
  F(get, "get")                                 \
  F(get_space, "get ")                          \
  F(length, "length")                           \
  F(let, "let")                                 \
  F(meta, "meta")                               \
  F(name, "name")                               \
  F(native, "native")                           \
  F(new_target, ".new.target")                  \
  F(next, "next")                               \
  F(number, "number")                           \
  F(object, "object")                           \
  F(of, "of")                                   \
  F(private_constructor, "#constructor")        \
  F(proto, "__proto__")                         \
  F(prototype, "prototype")                     \
  F(return, "return")                           \
  F(set, "set")                                 \
  F(set_space, "set ")                          \
  F(string, "string")                           \
  F(symbol, "symbol")                           \
  F(target, "target")                           \
  F(this, "this")                               \
  F(this_function, ".this_function")            \
  F(throw, "throw")                             \
  F(undefined, "undefined")                     \
  F(value, "value")

#define F(name, str)                           \
  const AstRawString* name##_string() const {  \
    return string_constants_->name##_string(); \
  }
  AST_STRING_CONSTANTS(F)
#undef F

class AstValueFactory {
  public:
    AstValueFactory(Zone* zone, const AstStringConstants* string_constants,
                    uint64_t hash_seed)
        : string_table_(string_constants->string_table()),
          strings_(nullptr),
          strings_end_(&strings_),
          cons_strings_(nullptr),
          cons_strings_end_(&cons_strings_),
          string_constants_(string_constants),
          empty_cons_string_(nullptr),
          zone_(zone),
          hash_seed_(hash_seed) {
      std::fill(one_character_strings_,
                one_character_strings_ + arraysize(one_character_strings_),
                nullptr);
      empty_cons_string_ = NewConsString();
    }
    const AstRawString* GetOneByteString(Vector<const uint8_t> literal) {
      return GetOneByteStringInternal(literal);
    }
    AstRawString* GetOneByteStringInternal(
      Vector<const uint8_t> literal) {
      if (literal.length() == 1 && literal[0] < kMaxOneCharStringValue) {
        int key = literal[0];
        if (V8_UNLIKELY(one_character_strings_[key] == nullptr)) {
          uint32_t hash_field = StringHasher::HashSequentialString<uint8_t>(
              literal.begin(), literal.length(), hash_seed_);
          one_character_strings_[key] = GetString(hash_field, true, literal);
        }
        return one_character_strings_[key];
      }
      uint32_t hash_field = StringHasher::HashSequentialString<uint8_t>(
          literal.begin(), literal.length(), hash_seed_);
      return GetString(hash_field, true, literal);
    }
    AstRawString* GetString(uint32_t hash_field, bool is_one_byte,
                                         Vector<const byte> literal_bytes) {
      // literal_bytes here points to whatever the user passed, and this is OK
      // because we use vector_compare (which checks the contents) to compare
      // against the AstRawStrings which are in the string_table_. We should not
      // return this AstRawString.
      AstRawString key(is_one_byte, literal_bytes, hash_field);
      base::HashMap::Entry* entry = string_table_.LookupOrInsert(&key, key.Hash());
      if (entry->value == nullptr) {
        // Copy literal contents for later comparison.
        int length = literal_bytes.length();
        byte* new_literal_bytes = zone_->NewArray<byte>(length);
        memcpy(new_literal_bytes, literal_bytes.begin(), length);
        AstRawString* new_string = new (zone_) AstRawString(
            is_one_byte, Vector<const byte>(new_literal_bytes, length), hash_field);
        CHECK_NOT_NULL(new_string);
        AddString(new_string);
        entry->key = new_string;
        entry->value = reinterpret_cast<void*>(1);
      }
      return reinterpret_cast<AstRawString*>(entry->key);
    }
  private:
    // All strings are copied here, one after another (no zeroes inbetween).
    base::CustomMatcherHashMap string_table_;

    // We need to keep track of strings_ in order since cons strings require their
    // members to be internalized first.
    AstRawString* strings_;
    AstRawString** strings_end_;
    AstConsString* cons_strings_;
    AstConsString** cons_strings_end_;

    // Holds constant string values which are shared across the isolate.
    const AstStringConstants* string_constants_;
    const AstConsString* empty_cons_string_;

    // Caches one character lowercase strings (for minified code).
    static const int kMaxOneCharStringValue = 128;
    AstRawString* one_character_strings_[kMaxOneCharStringValue];

    Zone* zone_;

    uint64_t hash_seed_;
}

template <typename schar>
uint32_t StringHasher::HashSequentialString(const schar* chars, int length,
                                            uint64_t seed) {
  // Check whether the string is a valid array index. In that case, compute the
  // array index hash. It'll fall through to compute a regular string hash from
  // the start if it turns out that the string isn't a valid array index.
  if (IsInRange(length, 1, String::kMaxArrayIndexSize)) {
    if (IsDecimalDigit(chars[0]) && (length == 1 || chars[0] != '0')) {
      uint32_t index = chars[0] - '0';
      int i = 1;
      do {
        if (i == length) {
          return MakeArrayIndexHash(index, length);
        }
      } while (TryAddIndexChar(&index, chars[i++]));
    }
  } else if (length > String::kMaxHashCalcLength) {
    return GetTrivialHash(length);
  }

  // Non-array-index hash.
  DCHECK_LE(0, length);
  DCHECK_IMPLIES(0 < length, chars != nullptr);
  uint32_t running_hash = static_cast<uint32_t>(seed);
  const schar* end = &chars[length];
  while (chars != end) {
    running_hash = AddCharacterCore(running_hash, *chars++);
  }

  return (GetHashCore(running_hash) << String::kHashShift) |
         String::kIsNotArrayIndexMask;
}

uint32_t StringHasher::MakeArrayIndexHash(uint32_t value, int length) {
  // For array indexes mix the length into the hash as an array index could
  // be zero.
  value <<= String::ArrayIndexValueBits::kShift;
  value |= length << String::ArrayIndexLengthBits::kShift;
  return value;
}

template <typename Char>
bool TryAddIndexChar(uint32_t* index, Char c) {
  if (!IsDecimalDigit(c)) return false;
  int d = c - '0';
  if (*index > 429496729U - ((d + 3) >> 3)) return false;
  *index = (*index) * 10 + d;
  return true;
}