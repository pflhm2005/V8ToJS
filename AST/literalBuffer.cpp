class LiteralBuffer final {
  public:
    /**
     * 根据字符Unicode数值判断是单字节还是双字节字符
     */
    void AddChar(uc32 code_unit) {
      if (is_one_byte()) {
        if (code_unit <= static_cast<uc32>(unibrow::Latin1::kMaxChar)) {
          AddOneByteChar(static_cast<byte>(code_unit));
          return;
        }
        ConvertToTwoByte();
      }
      AddTwoByteChar(code_unit);
    }
  private:
    /**
     * 配置
     * constexpr int MB = KB * KB; constexpr int KB = 1024; 
     */
    static const int kInitialCapacity = 16;
    static const int kGrowthFactor = 4;
    static const int kMaxGrowth = 1 * MB;
    /**
     * 向容器加字符
     */
    void AddOneByteChar(byte one_byte_char) {
      if (position_ >= backing_store_.length()) ExpandBuffer();
      backing_store_[position_] = one_byte_char;
      position_ += kOneByteSize;
    }
    /**
     * 容器扩容
     * 初始至少有16的容量 根据需要扩容
     * 会生成一个新容量的vector 把数据复制过去并摧毁老的容器
     */
    void LiteralBuffer::ExpandBuffer() {
      int min_capacity = Max(kInitialCapacity, backing_store_.length());
      Vector<byte> new_store = Vector<byte>::New(NewCapacity(min_capacity));
      if (position_ > 0) {
        MemCopy(new_store.begin(), backing_store_.begin(), position_);
      }
      backing_store_.Dispose();
      backing_store_ = new_store;
    }
    /**
     * 扩容算法
     * min_capacity代表容器最小所需容量
     * (1024 * 1024) / 3 是一个阈值
     * 小于该值容量以3倍的速度扩张 大于该值容量直接写死
     */
    int LiteralBuffer::NewCapacity(int min_capacity) {
      return min_capacity < (kMaxGrowth / (kGrowthFactor - 1))
                ? min_capacity * kGrowthFactor
                : min_capacity + kMaxGrowth;
    }
    /**
     * Vector容器用来装字符
     * potions_根据单/双字符类型影响length的计算
     */
    Vector<byte> backing_store_;
    int position_;
    bool is_one_byte_;
};

// Producing data during the recursive descent.
const AstRawString* GetSymbol() const {
  const AstRawString* result = scanner()->CurrentSymbol(ast_value_factory());
  return result;
}

const AstRawString* Scanner::CurrentSymbol(AstValueFactory* ast_value_factory) const {
  if (is_literal_one_byte()) {
    return ast_value_factory->GetOneByteString(literal_one_byte_string());
  }
  return ast_value_factory->GetTwoByteString(literal_two_byte_string());
}

/**
 * 返回包含字符串Unicode编码的Vector容器
 */
Vector<const uint8_t> literal_one_byte_string() const {
  return current().literal_chars.one_byte_literal();
}
Vector<const uint8_t> one_byte_literal() const { return literal<uint8_t>(); }
template <typename Char>
Vector<const Char> literal() const {
  return Vector<const Char>(
      reinterpret_cast<const Char*>(backing_store_.begin()),
      position_ >> (sizeof(Char) - 1));
}

const AstRawString* GetOneByteString(Vector<const uint8_t> literal) {
  return GetOneByteStringInternal(literal);
}
AstRawString* AstValueFactory::GetOneByteStringInternal(Vector<const uint8_t> literal) {
  // 单个字符的字符串用char
  if (literal.length() == 1 && literal[0] < kMaxOneCharStringValue) {
    // ...
  }
  uint32_t hash_field = StringHasher::HashSequentialString<uint8_t>(literal.begin(), literal.length(), hash_seed_);
  return GetString(hash_field, true, literal);
}

/**
 * 返回字符串的映射Hash值
 */
template <typename schar>
uint32_t StringHasher::HashSequentialString(const schar* chars, int length,uint64_t seed) {
  /**
   * 这里所做的操作是尝试将数字字符串转换为纯数字
   * 判断字符串长度是否在1 - 10之间
   */
  if (IsInRange(length, 1, String::kMaxArrayIndexSize)) {
    /**
     * 1、判断第一位是否是'0' ~ '9'的数字
     * 2、长度为1或者第一位不是0
     */
    if (IsDecimalDigit(chars[0]) && (length == 1 || chars[0] != '0')) {
      /**
       * 这里通过与0的Unicode计算后得到实际数值
       */
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

  uint32_t running_hash = static_cast<uint32_t>(seed);
  const schar* end = &chars[length];
  while (chars != end) {
    running_hash = AddCharacterCore(running_hash, *chars++);
  }
  /**
   * static const int kIsNotArrayIndexMask = 1 << 1;
   * static const int kHashShift = kNofHashBitFields = 2;
   */
  return (GetHashCore(running_hash) << String::kHashShift) | String::kIsNotArrayIndexMask;
}

/**
 * 1、非数字直接返回false
 * 2、if分支判断中的429496729数字是2^32为4294967296 必须比这个小
 * 所能接受的最大值是4294967294
 * 3、结果是一层层叠起来 
 * 例如12345 index初始值为1 叠加过程为 1 => 12 => 123 => 1234 => 12345
 */
bool TryAddIndexChar(uint32_t* index, Char c) {
  if (!IsDecimalDigit(c)) return false;
  int d = c - '0';
  if (*index > 429496729U - ((d + 3) >> 3)) return false;
  *index = (*index) * 10 + d;
  return true;
}
/**
 * 搞不懂这里
 * String::ArrayIndexValueBits::kShift => 2
 * String::ArrayIndexLengthBits::kShift => 2 + 24 => 26
 */
uint32_t StringHasher::MakeArrayIndexHash(uint32_t value, int length) {
  value <<= String::ArrayIndexValueBits::kShift;
  value |= length << String::ArrayIndexLengthBits::kShift;
  return value;
}
/**
 * 长字符串的处理
 */
uint32_t StringHasher::GetTrivialHash(int length) {
  return (length << String::kHashShift) | String::kIsNotArrayIndexMask;
}

/**
 * 第一个参数是个种子
 * 第二个参数是字符的Unicode编码
 * 根据种子做运算 返回一个数
 */
uint32_t StringHasher::AddCharacterCore(uint32_t running_hash, uint16_t c) {
  running_hash += c;
  running_hash += (running_hash << 10);
  running_hash ^= (running_hash >> 6);
  return running_hash;
}

uint32_t StringHasher::GetHashCore(uint32_t running_hash) {
  running_hash += (running_hash << 3);
  running_hash ^= (running_hash >> 11);
  running_hash += (running_hash << 15);
  int32_t hash = static_cast<int32_t>(running_hash & String::kHashBitMask);
  int32_t mask = (hash - 1) >> 31;
  return running_hash | (kZeroHash & mask);
}

/**
 * 最后的封装方法
 * 1、根据hash值、单字节字符标记、字符容器生成一个AstRawString类
 * 2、从一个巨大的hashmap中搜索或添加对应键值对
 */
AstRawString* AstValueFactory::GetString(uint32_t hash_field, bool is_one_byte, Vector<const byte> literal_bytes) {
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