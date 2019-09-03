class ScopedPtrList final {
  public:
    void Add(T* value) {
      buffer_.push_back(value);
      ++end_;
    }

    void AddAll(const ZonePtrList<T>& list) {
      buffer_.reserve(buffer_.size() + list.length());
      for (int i = 0; i < list.length(); i++) {
        buffer_.push_back(list.at(i));
      }
      end_ += list.length();
    }
  private:
    std::vector<void*>& buffer_;
    size_t start_;
    size_t end_;
}