const AstRawString* GetOneByteString(Vector<const uint8_t> literal) {
  return GetOneByteStringInternal(literal);
}

AstRawString* AstValueFactory::GetOneByteStringInternal(
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

AstRawString* AstValueFactory::GetString(uint32_t hash_field, bool is_one_byte,
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