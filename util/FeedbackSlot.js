export default class FeedbackSlot {
  constructor(id = -1) {
    this.id_ = id;
  }
  static Invalid() {
    return new FeedbackSlot();
  }
  ToInt() {
    return this.id_;
  }
  IsInvalid() {
    return this.id_ === -1;
  }
}