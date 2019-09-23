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

有一些特殊语法的模拟方式需要说明一下

### 析构

V8很多时候会在栈上实例化类，作用域结束自动析构，JS不支持这种语法，如下:
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
  pointer_buffer_.length = start_; // statements也会被重置
  return statements;
  // 非常尴尬的是 C++的析构是在返回之后 而这里的代码在JS不会执行
  pointer_buffer_.length = start_; // never run
}
```
该逻辑场景如下
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
~~这个问题感觉挺大 还没有完美的模拟办法~~

目前采用两种方式模拟
```js
let pointer_buffer_ = [];
// 1. 这种情况必须保证对象的存活 直接浅拷贝
function handle() {
  let statements = pointer_buffer_.slice();
  // do something
  return new xxx(statements);
}
// 2. 块级作用域结尾可以直接重置 符合C++的语义
{
  let start_ = pointer_buffer_.length;
  let statements = pointer_buffer_
  // do something
  pointer_buffer_.length = start_;
}
```

### 枚举

```c++
enum class InferName { kYes, kNo };
```
直接声明 特殊情况特殊处理

虽然说最佳实践是将枚举类型作为对象名，枚举值作为key，这样容易分辨并且可以保证不重复

但是JS复杂类型的使用成本较高 非常影响执行速度 直接采用声明const变量来模拟枚举
```js
const kYes = 0;
const kNo = 0;
```

### 宏

> 直接展开

### 基本类型的引用传递

```c++
void fnc(int* a, bool* b) {
  *b = true;
  // ...
}
// C++很多时候会将一些基本类型(从JS的角度来看)的地址作为参数传入方法 值会在函数内部改变
int a = 1;
bool b = false;
fnc(&a, &b);
if(b) { /* ... */ }
// more
```
JS的基本类型始终是值传递 采用解构实现上述逻辑
```js
function fnc(a, b) {
  // ...
  return { a , b };
}
// 1. 一般不声明变量 将初始值直接传入
let { a, b } = fnc(1, false);
// 2. 特殊情况声明伪变量
let _a2 = 1;
let _b2 = true;
let { a2, b2 } = fnc(_a2, _b2);
// 3. 复杂返回
// 有些时候返回的是一个实例 基本类型的值只是顺便被改变
// 此时修改返回值 解构一并处理
fuction fnc2(a, b) {
  // ...
  let result = {/* 通过某些方法生成的实例 */};
  // C++中仅会返回result一个变量
  return { a, b, result };
}
let { a, b, result } = fnc2(1, false);
// 如此不会影响后续逻辑
```

### 重载

这里的重载包括函数重载与函数的构造重载
一般来说，简单的重载可以直接用默认参数来实现
```c++
void Scan() { Scan(Next()) }
void Scan(TokenDesc* next) { /* ... */ }
```
```js
function Scan(next = this.next_) {
  /* ... */
}
```
但是某些情况重载比较复杂 如下
```c++
// 参数数量不一致 构造参数也不一致
ObjectLiteral::Property* NewObjectLiteralProperty(Expression* key, Expression* value, ObjectLiteralProperty::Kind kind,bool is_computed_name) {
  return new (zone_) ObjectLiteral::Property(key, value, kind, is_computed_name);
}
ObjectLiteral::Property* NewObjectLiteralProperty(Expression* key, Expression* value, bool is_computed_name) {
  return new (zone_) ObjectLiteral::Property(ast_value_factory_, key, value, is_computed_name);
}
```
```js
/**
 * 存在重复的参数 根据参数数量 调整一下顺序
 * 由于不清楚参数数量 直接用rest表示
 * 这里实际上可以通过默认参数实现 => (key, value, is_computed_name, extra_paran = ast_value_factory_)
 * 但是这样一来调用方法的参数顺序就需要修改 对于使用率较高的方法来说十分不妥
 * 因此 外部调用保持与源码一致 差异化的逻辑处理放在工厂函数
 */ 
function NewObjectLiteralProperty(...args) {
  if(args.length === 3) return new Property(ast_value_factory_, ...args);
  else return new Property(args[2], args[0], args[1], args[3]);
}
// 类的构造函数也要进行修改
class Property {
  constructor(ast_value_factory_or_kind/*这是一个动态参数*/,key, value, is_computed_name) {
    if(typeof ast_value_factory_or_kind === 'number') {/*做别的初始化*/}
  }
}
```
极端情况下，存在子类、父类均有多重构造函数(见DeclarationScope)，或者根据构造参数决定是否调用其余构造方法的逻辑，太过于复杂。

目前将其拆分为多个类实现，后续考虑更优实现方法。

### 泛型

实话说，这个语法无法模拟，但是JS的弱类型帮了不少忙，这一块目前没有碰到问题。