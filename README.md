# V8record
记录阅读v8源码过程的笔记，尝试用JavaScript翻译V8引擎 

目前C++部分比较杂乱 没有时间整理，也没啥看头

去看JS文件夹里的内容吧，文件分类跟源码不太一致，逻辑上基本按照源码进行了复现，注释极其详细

依次运行
```
npm install babel-cli -g
npm install babel-preset-env -D
```

进入JS文件夹 运行
```
babel-node --presets env test
```
