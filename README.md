# turtle-js

> 一个功能强大、基于命令队列的 JavaScript 海龟绘图库。灵感源于经典的 Python `turtle` 模块，为现代 Web 环境而生。

[](https://opensource.org/licenses/MIT)

`turtle-js` 允许您通过简单的指令来控制一个“海龟”在画布上移动和绘图，是学习编程、图形学和进行创意编程的绝佳工具。它采用异步命令队列和 `requestAnimationFrame` 驱动，确保动画流畅；同时，其独特的统一重绘机制保证了绘图的准确性和持久性，杜绝了动画过程中的闪烁或伪影。


-----

### ✨ 核心特性

  * **现代化的 API**: 支持面向对象 (`new Turtle(ctx)`) 和全局函数 (`turtle.expose(window)`) 两种调用方式，灵活易用。
  * **流畅的动画**: 基于 `requestAnimationFrame` 的动画循环，所有移动和旋转都平滑过渡。
  * **强大的命令队列**: 所有操作都按顺序排队执行，完美处理异步动画，保证逻辑的准确性。
  * **丰富的绘图功能**: 支持设置颜色、画笔粗细、填充图形、绘制文字、切换海龟形状等。
  * **零依赖**: 纯原生 JavaScript 实现，无需任何外部库。
  * **易于扩展**: 清晰的 `Screen` 和 `Turtle` 类结构，方便进行二次开发或添加新功能。

### 🚀 安装与使用

1.  **下载**: 直接下载本项目中的 `turtle.js` 文件。
2.  **引入**: 在您的 HTML 文件中，通过 `<script>` 标签引入 `turtle.js`。

您的 HTML 文件结构应该如下所示：

```html
<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>我的海龟绘图</title>
    <style>
        /* 建议添加一些样式让画布居中显示 */
        body { 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        canvas { 
            border: 2px solid #ccc;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>

    <canvas id="my-canvas" width="800" height="600"></canvas>
    
    <script src="turtle.js"></script>
    
    <script>
        // ... 你的代码 ...
    </script>

</body>
</html>
```

### 💡 快速上手

下面是一个最简单的例子：画一个正方形。

```javascript
// 1. 获取 canvas 的 2D 渲染上下文
const canvas = document.getElementById('my-canvas');
const ctx = canvas.getContext('2d');

// 2. 实例化一只海龟
const t = new Turtle(ctx);

// 3. 开始绘图
t.pencolor('blue'); // 设置画笔颜色为蓝色
t.pensize(5);       // 设置画笔粗细为 5px

for (let i = 0; i < 4; i++) {
    t.forward(100); // 向前移动 100px
    t.right(90);    // 右转 90 度
}
```

### 📚 使用示例

#### 1\. 标准用法（推荐）

这是最清晰、最推荐的用法，它不会污染全局命名空间，代码结构更清晰。

```javascript
// 获取 canvas 上下文
const ctx = document.getElementById('my-canvas').getContext('2d');

// 创建海龟实例
const myTurtle = new Turtle(ctx);

// 设置海龟
myTurtle.shape('turtle');
myTurtle.pensize(3);
myTurtle.speed('fast'); // fast, normal, slow, slowest, fastest(0)

// 画一个彩色的五角星
for (let i = 0; i < 5; i++) {
    myTurtle.forward(200);
    myTurtle.right(144);
    // 每次循环更换颜色
    myTurtle.pencolor(['red', 'orange', 'blue', 'green', 'purple'][i]);
}

myTurtle.hideturtle(); // 完成后隐藏海龟
```

#### 2\. 全局函数用法

通过 `expose()` 方法，您可以将海龟实例的方法挂载到 `window` 对象上，实现类似 Python turtle 的全局函数调用。

```javascript
// 获取 canvas 上下文
const ctx = document.getElementById('my-canvas').getContext('2d');

// 创建海龟实例并将其方法暴露到全局
new Turtle(ctx).expose(window);

// 现在可以直接调用全局函数
shape('arrow');
speed('normal');
bgcolor('#f5f5dc'); // 设置背景颜色

// 画一个房子
color('saddlebrown', 'tan'); // (画笔颜色, 填充颜色)
begin_fill();
for(let i = 0; i < 4; i++) {
  forward(150);
  right(90);
}
end_fill();

// 移动到房顶位置
penup();
goto(0, 150);
pendown();

// 画房顶
color('firebrick', 'red');
begin_fill();
right(135);
forward(150 / Math.sqrt(2));
left(90);
forward(150 / Math.sqrt(2));
end_fill();

hideturtle();
```

#### 3\. 高级用法：多海龟操作

`turtle-js` 的架构原生支持在同一个画布上管理多只海龟。

```javascript
// 1. 创建一个 Screen 实例来管理画布
const screen = new Screen('my-canvas');
screen.bgcolor('black');

// 2. 在这个 screen 上创建两只海龟
const t1 = screen.createTurtle();
const t2 = screen.createTurtle();

// --- 配置海龟1 ---
t1.shape('turtle');
t1.color('cyan');
t1.penup();
t1.goto(-250, 50);
t1.pendown();

// --- 配置海龟2 ---
t2.shape('circle');
t2.color('magenta');
t2.penup();
t2.goto(-250, -50);
t2.pendown();

// --- 让它们随机前进，像在比赛一样 ---
for (let i = 0; i < 10; i++) {
    t1.forward(Math.random() * 50);
    t2.forward(Math.random() * 50);
}
```

### 📖 API 参考

下面是主要方法的列表。更详细的参数说明请参考源码中的注释。

\<details\>
\<summary\>\<strong\>点击展开/折叠 API 列表\</strong\>\</summary\>

#### 移动控制

  - `forward(distance)` / `fd(distance)`
  - `backward(distance)` / `bk(distance)`
  - `right(angle)` / `rt(angle)`
  - `left(angle)` / `lt(angle)`
  - `goto(x, y)` / `setpos(x, y)`
  - `setheading(angle)` / `seth(angle)`
  - `home()`
  - `circle(radius, extent, steps)`

#### 画笔控制

  - `pendown()` / `pd()` / `down()`
  - `penup()` / `pu()` / `up()`
  - `pensize(width)` / `width(width)`
  - `dot(size, ...color)`
  - `write(text, options)`

#### 颜色控制

  - `pencolor(...color)`
  - `fillcolor(...color)`
  - `color(pencolor, fillcolor)`
  - `begin_fill()`
  - `end_fill()`

#### 状态与设置

  - `reset()`
  - `clear()`
  - `speed(level)`
  - `shape(name)`
  - `hideturtle()` / `ht()`
  - `showturtle()` / `st()`
  - `position()` / `pos()`

#### Screen (屏幕) 方法

  - `bgcolor(color)`

\</details\>

### 🤝 贡献

欢迎任何形式的贡献！如果您有好的想法、建议或发现了 Bug，请随时提交 [Issue](https://www.google.com/search?q=https://github.com/yviscool/turtle-js/issues)。

如果您想贡献代码，请遵循以下步骤：

1.  **Fork** 本项目。
2.  创建您的特性分支 (`git checkout -b feature/AmazingFeature`)。
3.  提交您的更改 (`git commit -m 'Add some AmazingFeature'`)。
4.  将分支推送到您的 Fork (`git push origin feature/AmazingFeature`)。
5.  提交一个 **Pull Request**。

### 📄 许可证

本项目采用 [MIT](https://opensource.org/licenses/MIT) 许可证。详情请见 `LICENSE` 文件。
