/**
 * 这是一个链表
 * 元素存的是指针 所以游标是一个二维指针
 * JS的话就不管那么多 意思意思得了
 */
class ThreadedList {
  constructor() {
    this.list = [];
  }
  end() {
    if(!this.list.length) return null;
    return this.list[this.list.length - 1];
  }
  /**
   * 相当于push 
   * @param {Declaration} declaration 
   */
  Add(declaration) {
    this.list.push(declaration);
    if (this.list.length > 1) {
      let prev = this.list[this.list.length - 2];
      prev.next_ = declaration;
    }
  }
}

export default ThreadedList;