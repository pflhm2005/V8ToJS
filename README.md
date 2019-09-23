# V8record
记录阅读v8源码过程的笔记，尝试用JavaScript翻译V8引擎

支持所有Token的解析，完成了`let a = 1;let b = {a : 1};function fn(a,b,c){}`简单字面量的解析

~~目前C++部分比较杂乱 没有时间整理，也没啥看头(已移除)，看JS文件夹里的内容吧~~

文件分类跟源码不太一致，逻辑上基本按照源码进行了复现，注释极其详细

依次运行
```
npm install babel-cli -g
npm install babel-preset-env -D
```

启动解析 运行对应的测试文件
```
babel-node --presets env xxx(Token.js/Parse.js)
```

支持对Token、简单语句的的全解析 可以自行修改待编译字符串并查看打印结果 更多语法待完善

---

目前有个比较核心的语法无法模拟...
V8很多时候会在栈上实例化类，作用域结束自动析构，JS无法模拟这种语法，如下:
```c++
// 示例代码
template <typename T>
class ScopedPtrList {
public:
  explicit ScopedPtrList(std::vector<void*>* buffer): buffer_(*buffer), start_(buffer->size()) {}
  ~ScopedPtrList() { buffer_.resize(start_); }
private:
  std::vector<void*>& buffer_;
  size_t start_;
}

vector<void*>* pointer_buffer_;
{
  ScopedPtrList<Statement> statements(pointer_buffer_);
  // do something...
  // 析构在return之后 这样可以同时保证返回及清理
  return statements;
}
```
上述逻辑在JS无法实现
```js
// 可能已经有一些值
let pointer_buffer_ = [];
function handle() {
  // 构造很容易模拟
  let start_ = pointer_buffer_.length;
  let statements = pointer_buffer_;
  // do something
  // 假设在返回之前做析构操作 会由于引用类型 两者同时被清理
  pointer_buffer_ = start_; // statements也会被重置
  return statements;
  // 非常尴尬的是 C++的析构是在返回之后 而这里的代码在JS不会执行
  pointer_buffer_ = start_; // never run
}
```
某源码逻辑场景如下
```js
// 假设这里是顶层作用域 pointer_buffer_ = []
function topLevelFunction() {
  // 生成一个ScopedPtrList
  // 当前作用域有两个变量
  // pointer_buffer_ = [a, b]
  let a = 1;
  let b = 2;
  {
    // 此时生成新的ScopedPtrList
    // pointer_buffer_ = [a, b, c]
    let c = 3;
    // 从作用域找到a 输出1
    console.log(a);
  } 
  // 作用域结束后重置成[a, b]
  {
    // 此时生成另的ScopedPtrList
    // pointer_buffer_ = [a, b, d]
    let d = 4;
  }
}
```
这个问题感觉挺大 还没有完美的模拟办法