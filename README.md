# V8record
记录阅读v8源码过程的笔记，尝试用JavaScript翻译V8引擎

---

### 运行方法

找一个文件夹，依次运行
```
git clone https://github.com/pflhm2005/V8ToJS.git
cd V8ToJS/
npm install babel-cli -g
npm install babel-preset-env -D
```

准备工作完成

运行对应的文件启动解析(修改文件中的source_code看不一样的输出)
```
// 输出字符的Token
babel-node --presets env token.js
// 输出字符的抽象语法树
babel-node --presets env ast.js
// 输出字符的字节码(目前测试仅支持let a = 1;这一个，完善需要较大工作量)
babel-node --presets env bytecode.js
```

---

### 简单说明

- [x] 支持所有Token的解析
- [x] 支持完成了`let a = 1;let b = {a : 1};if(true){};function fn(a,b,c){log(123);}`等语句解析
- [x] 支持`let a = 1`的字节码生成，复杂语句涉及内存操作基本上无法处理
- [ ] 支持机器码生成

下述内容过于复杂，需要走源码编译看过程，暂未实现。

- [x] template_string 模板字符串 Token解析阶段有点没明白
- [ ] preParse/lazy-compile 懒编译 针对函数声明代码块的懒编译，过程非常复杂
- [x] class 类的解析比想象中复杂 另外V8最近重写了这块内容 还没来得及看
- [ ] yield/async 状态保留函数类型有些复杂

~~目前C++部分比较杂乱 没有时间整理，也没啥看头(已移除)，看JS文件夹里的内容吧~~

文件分类跟源码不太一致，逻辑上基本按照源码进行了复现，注释极其详细，更多功能待完善

---

有一些特殊语法的模拟方式需要说明一下(得益于es6 块级作用域的问题完美解决 不然完蛋了)

语法这块主要是能实现对应功能，不需要刻意保持一致，优先保证逻辑

---

### 析构

除去通过zone内部管理内存，V8很多时候也会在栈上实例化类，作用域结束自动析构，JS不支持这种语法，如下:
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
源码应用中其中一个场景如下
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
// 1. 这种情况必须保证对象的存活
// 直接生成一个新的数组 C++是为了节省内存才重复使用同一个指针变量 JS不搞这个
function handle() {
  let statements = [];
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

---

### 枚举

```c++
enum class InferName { kYes, kNo };
```
直接声明 特殊情况特殊处理
```js
const kYes = 0;
const kNo = 1;
```
虽然说最佳实践是将枚举类型作为对象名，枚举值作为key，这样容易分辨且可以保证枚举名不重复

但是JS复杂类型的使用成本较高 非常影响执行速度(枚举值数量极其多) 直接采用声明const变量来模拟枚举

注: 特殊情况主要指以下两种

1. Token类型的枚举，由于Token值在整个AST中解析中非常关键，所以显式的用字符串来表示，让后续复盘逻辑更加清晰。后果是在很多进行类型判断的运算中，需要用一个TokenEnumList手动将枚举字符串还原成Token对应的数值。
2. Token重名，重名有两种情况。(1)该枚举值仅仅在小范围内使用，例如关于函数返回类型的kNormal、kAsyncReturn(待定)。(2)多个重名枚举值存在较为广泛的应用，将更高级的以下划线开头，例如抽象树节点类型NodeType。

*由于枚举类型较多，目前出现了很多重复的情况，因此已经修改为 类名 + _ + 枚举名 的形式*

例如Bytecode::Function_id::kCallRuntime => Bytecode_Function_id_kCallRuntime，这样可以确保不重复且意义明确

---

### 宏

JS不存在宏的概念，目前用了一个简单的node工具展开枚举声明宏

至于复杂的嵌套宏 需要自行理解并翻译为JS函数

---

### 基本类型的引用传递

```c++
void fnc(int* a, bool* b) {
  *b = true;
  // ...
}
// C++很多时候会将一些基本类型变量的地址作为参数传入方法 值会在函数内部通过解指针操作改变
int a = 1;
bool b = false;
fnc(&a, &b);
if(b) { /* ... */ }
// more
```
JS的基本类型始终是值传递 采用解构赋值实现上述逻辑
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

---

### 重载(运算符重载没什么意义)

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
 * 实际上可以通过默认参数实现 => (key, value, is_computed_name, extra_paran = ast_value_factory_)
 * 但是这样一来外部调用方法参数顺序就需要修改 对于使用率较高的方法来说十分不妥
 * 因此 外部调用保持与源码一致 差异化的逻辑处理放在工厂函数内部
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

目前会将实例化的类进行拆分，保留原始类，但是仅挂载一些方法，不作为new的对象，后续考虑更优实现方法。
```js
// 原有的多重载构造函数类 不作为new的对象 方法可以放上面
class DeclarationScope extends Scope {
  constructor(...args) {
    super(...args);
  }
  allMethod() {}
}

// 拆分出来额外的实例化类 构造函数参数重新设定 仅仅差异化构造过程 所有方法放原有类上
class FunctionDeclarationScope extends DeclarationScope{
  constructor() {
    // ...
  }
}
class ScriptDeclarationScope extends DeclarationScope{
  constructor() {
    // ...
  }
}
```

---

### 泛型

~~实话说，这个语法无法模拟，但是JS的弱类型帮了不少忙，这一块目前没有碰到问题。~~

在处理bytecode生成的时候，遇到了极复杂宏+模板的情况，且模板不作为声明类型使用，因此必须做处理，源码如下

```c++
template <Bytecode bytecode, AccumulatorUse accumulator_use,
          OperandType... operand_types>
class BytecodeNodeBuilder {
 public:
  template <typename... Operands>
  V8_INLINE static BytecodeNode Make(BytecodeArrayBuilder* builder,
                                     Operands... operands) {
    static_assert(sizeof...(Operands) <= Bytecodes::kMaxOperands,
                  "too many operands for bytecode");
    builder->PrepareToOutputBytecode<bytecode, accumulator_use>();
    return BytecodeNode::Create<bytecode, accumulator_use, operand_types...>(
        builder->CurrentSourcePosition(bytecode),
        OperandHelper<operand_types>::Convert(builder, operands)...);
  }
};

template <Bytecode bytecode, AccumulatorUse accum_use,
          OperandType operand0_type, OperandType operand1_type,
          OperandType operand2_type, OperandType operand3_type,
          OperandType operand4_type>
V8_INLINE static BytecodeNode Create(BytecodeSourceInfo source_info,
                                      uint32_t operand0, uint32_t operand1,
                                      uint32_t operand2, uint32_t operand3,
                                      uint32_t operand4) {
  OperandScale scale = OperandScale::kSingle;
  scale = std::max(scale, ScaleForOperand<operand0_type>(operand0));
  scale = std::max(scale, ScaleForOperand<operand1_type>(operand1));
  scale = std::max(scale, ScaleForOperand<operand2_type>(operand2));
  scale = std::max(scale, ScaleForOperand<operand3_type>(operand3));
  scale = std::max(scale, ScaleForOperand<operand4_type>(operand4));
  return BytecodeNode(bytecode, 5, scale, source_info, operand0, operand1,
                      operand2, operand3, operand4);
}
```

模板参数作为实际参数使用，所以需要进行处理，处理方法是将模板参数包装为数组，命名为template作为函数的额外参数，如下
```js
class BytecodeNodeBuilder {
  static Make(builder, operands, template) {
    const [bytecode, accumulator_use] = template;
    const operand_types = template.slice(2);
    builder.PrepareToOutputBytecode(bytecode, accumulator_use);
    let source_info = source_info = builder.CurrentSourcePosition(bytecode);
    switch (operands.length) {
      case 0:
        return BytecodeNode.Create0(bytecode, accumulator_use, source_info);
      case 1:
        return BytecodeNode.Create1(
          bytecode, accumulator_use, source_info,
          OperandHelper(operand_types[0], builder, operands[0]), operand_types[0]);
      case 2:
        // more...
    }
  }
}
```

---

### 多维指针

一维指针不需要额外的逻辑，JS的复杂类型跟指针操作并没有太大区别

多维指针无法模拟，但是换个思路。根据所看的libuv、V8源码，大多数情况下多维指针的应用场景是实现某个数据结构(链表、队列)，而JS的数组无所不能，一般就忽略具体的指针逻辑了。

*当出现取地址作为元数据，此时逻辑无法模仿*

---

### 迭代器

虽然JS也有迭代器，但是跟C++的简约++操作差的比较远，这块直接换一个实现思路
```c++
vector<void*> vec;
auto it = vec.begin();
while(it++ !== vec.end()) {
  // ...
}
```
```js
let vec = [];
// 需要索引
for(/*...*/)
// 不需要索引
for(let it of vec) {/**/}
```

---

### 无符号整数

在进行位运算计算Hash值时，C++用的是unsigned int，但是JS默认是有符号的，这就会导出下列运算结果不一致
```c++
unsigned int n = 111;
n <<= 30; // 3221225472
```
```js
let n = 111;
n <<= 30; // -1073741824
```
目前大规模的位运算出现在String的Hash值计算，见[StringHasher](https://github.com/pflhm2005/V8ToJS/blob/master/ast/StringHasher.js)。

由于两个数的底层是一致的，只是符号类型不一致，所以只需要最后做一次无符号位移。
```js
let n = 111;
n <<= 30; // -1073741824
n >>>= 0; // 3221225472
```

---

### 内存管理

这个就算了吧，若涉及寄存器或操作系统内核操作，无法实现
