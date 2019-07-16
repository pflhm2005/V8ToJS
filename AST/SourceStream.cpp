/**
 * 根据源字符串生成一个(假的)stream赋值到parseInfo上
 * 该属性后面转换成AST会用到
 */
std::unique_ptr<Utf16CharacterStream> stream(ScannerStream::For(isolate, source));
info->set_character_stream(std::move(stream));

/**
 * For
 * ScannerStream::For(isolate, data, 0, data->length());
 */
Utf16CharacterStream* ScannerStream::For(Isolate* isolate, Handle<String> data, int start_pos, int end_pos) {
  size_t start_offset = 0;
  return new BufferedCharacterStream<OnHeapStream>(
      static_cast<size_t>(start_pos), Handle<SeqOneByteString>::cast(data),
      start_offset, static_cast<size_t>(end_pos));
}

// ---------------------------------------------------------------------
// Buffered stream of UTF-16 code units, using an internal UTF-16 buffer.
// A code unit is a 16 bit value representing either a 16 bit code point
// or one part of a surrogate pair that make a single 21 bit code point.
class Utf16CharacterStream {
  private:
    const uint16_t* buffer_start_;
    const uint16_t* buffer_cursor_;
    const uint16_t* buffer_end_;
    size_t buffer_pos_;
}

// Provides a buffered utf-16 view on the bytes from the underlying ByteStream.
// Chars are buffered if either the underlying stream isn't utf-16 or the
// underlying utf-16 stream might move (is on-heap).
/**
 * 构造函数第一个参数初始化本类属性
 * 剩下3个构造模版类 即下面的OnHeapStream
 */
template <template <typename T> class ByteStream>
class BufferedCharacterStream : public Utf16CharacterStream {
  public:
    template <class... TArgs>
    BufferedCharacterStream(size_t pos, TArgs... args) : byte_stream_(args...) {
      buffer_pos_ = pos;
    }
  private:
    static const size_t kBufferSize = 512;
    uc16 buffer_[kBufferSize];
    ByteStream<uint16_t> byte_stream_;
}

// A Char stream backed by an on-heap SeqOneByteString or SeqTwoByteString.
template <typename Char>
struct Range {
  const Char* start;
  const Char* end;

  size_t length() { return static_cast<size_t>(end - start); }
  bool unaligned_start() const {
    return reinterpret_cast<intptr_t>(start) % sizeof(Char) == 1;
  }
};

template <typename Char>
class OnHeapStream {
  public:
    OnHeapStream(Handle<String> string, size_t start_offset, size_t end)
     : string_(string), start_offset_(start_offset), length_(end) {}
    // The no_gc argument is only here because of the templated way this class
    // is used along with other implementations that require V8 heap access.
    Range<Char> GetDataAt(size_t pos, RuntimeCallStats* stats, DisallowHeapAllocation* no_gc) {
      return {&string_->GetChars(*no_gc)[start_offset_ + Min(length_, pos)],
              &string_->GetChars(*no_gc)[start_offset_ + length_]};
    }
  private:
    Handle<String> string_;
    const size_t start_offset_;
    const size_t length_;
}