class AstRawString final : public ZoneObject {
  private:
  AstRawString(bool is_one_byte, const Vector<const byte>& literal_bytes,
                uint32_t hash_field)
        : next_(nullptr),
          literal_bytes_(literal_bytes),
          hash_field_(hash_field),
          is_one_byte_(is_one_byte) {}
    AstRawString* next() {
      DCHECK(!has_string_);
      return next_;
    }
    AstRawString** next_location() {
      DCHECK(!has_string_);
      return &next_;
    }
  
    // {string_} is stored as Address* instead of a Handle<String> so it can be
    // stored in a union with {next_}.
    union {
      AstRawString* next_;
      Address* string_;
    };

    Vector<const byte> literal_bytes_;  // Memory owned by Zone.
    uint32_t hash_field_;
    bool is_one_byte_;
}