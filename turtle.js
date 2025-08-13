/**
 * Turtle.js - 一个基于命令队列的 JavaScript 海龟绘图库
 *
 * @author Gemini AI
 * @version 3.0.0 (Architecture Refactor)
 * @license MIT
 *
 * v3.0 更新 (架构重构):
 * - 新增(NEW): 构造函数现在更加灵活。您可以直接传入一个 canvas 的 2D 上下文 (context) 来创建一个海龟实例，例如 `new Turtle(ctx)`。
 * - 新增(NEW): 新增 `turtle.expose(targetObject)` 方法。您可以将一个海龟实例的所有绘图方法暴露到指定的对象上，最常见的用法是暴露到 `window` 对象，从而实现全局函数调用，例如 `turtle.expose(window)`。
 * - 调整(REFACTORED): 库本身不再向全局 `window` 对象上挂载任何默认的函数或实例。代码更加干净，由使用者决定如何初始化和暴露。
 * - 调整(REFACTORED): `Screen` 的构造函数现在可以接受 canvas 的 ID、canvas 元素本身或 2D 上下文作为参数，提高了灵活性。
 *
 * v2.9 更新:
 * - 新增(NEW): 实现 turtle.home() 方法。
 * - 新增(NEW): 实现 turtle.setheading(angle) 方法。
 *
 * v2.8 更新:
 * - 新增(NEW): 实现 turtle.write() 方法。
 * - 新增(NEW): 实现 turtle.shape() 方法。
 *
 * v2.7 更新:
 * - 修复(FIXED): 统一了绘图模型，解决了动画虚线和填充问题。
 */
(function(global) {
'use strict';

/**
 * @private
 * 解析颜色的辅助函数
 */
function _parseColor(...args) {
    if (args.length === 0) return null;
    if (typeof args[0] === 'string') return args[0];
    if (Array.isArray(args[0])) return `rgb(${args[0][0]}, ${args[0][1]}, ${args[0][2]})`;
    if (args.length === 3) return `rgb(${args[0]}, ${args[1]}, ${args[2]})`;
    return null;
}

/**
 * Screen 类 - 管理画布、海龟和命令队列
 * 它是所有海龟绘图的“舞台”或“世界”。
 */
class Screen {
    /**
     * Screen 构造函数
     * @param {string|HTMLCanvasElement|CanvasRenderingContext2D} target - Canvas 的 id、Canvas DOM 元素本身，或者是一个 2D 的渲染上下文。
     * @param {number} [width=1000] - 画布宽度 (如果需要创建新的 canvas)。
     * @param {number} [height=800] - 画布高度 (如果需要创建新的 canvas)。
     */
    constructor(target, width = 1000, height = 800) {
        this.turtles      = [];
        this.bgColor      = '#ffffff'; // 默认背景色为白色
        this.commandQueue = [];
        this.isBusy       = false;
        this._shapes      = {};

        if (target instanceof CanvasRenderingContext2D) {
            // 如果传入的是一个 context
            this.ctx    = target;
            this.canvas = this.ctx.canvas;
        } else if (target instanceof HTMLCanvasElement) {
            // 如果传入的是一个 canvas 元素
            this.canvas = target;
            this.ctx    = this.canvas.getContext('2d');
        } else if (typeof target === 'string') {
            // 如果传入的是 canvas 的 id
            const canvas = document.getElementById(target);
            if (canvas) {
                this.canvas = canvas;
                this.ctx    = this.canvas.getContext('2d');
            } else {
                // 如果找不到 id 对应的 canvas，则创建一个新的
                this.canvas      = document.createElement('canvas');
                this.canvas.id   = target;
                document.body.appendChild(this.canvas);
                this.ctx         = this.canvas.getContext('2d');
                this.canvas.width  = width;
                this.canvas.height = height;
            }
        } else {
             // 如果未提供 target，则创建一个默认的
            this.canvas      = document.createElement('canvas');
            this.canvas.id   = 'turtle-canvas';
            document.body.appendChild(this.canvas);
            this.ctx         = this.canvas.getContext('2d');
            this.canvas.width  = width;
            this.canvas.height = height;
        }

        // 确保宽高被设置，以防传入的 canvas 没有设置
        if (!this.canvas.width) this.canvas.width = width;
        if (!this.canvas.height) this.canvas.height = height;

        this._registerDefaultShapes();
        // 启动命令处理循环
        requestAnimationFrame(() => this._processQueue());
    }

    /**
     * @private
     * 注册所有内置的海龟形状
     */
    _registerDefaultShapes() {
        this._shapes = {};
        this._shapes['arrow']   = [[-10, 5], [0, 0], [-10, -5]];
        this._shapes['turtle']  = [[10, 0], [8, -2], [9, -7], [7, -9], [0, -10], [-7, -9], [-9, -7], [-8, -2], [-10, 0], [-8, 2], [-9, 7], [-7, 9], [0, 10], [7, 9], [9, 7], [8, 2]];
        this._shapes['circle']  = 'circle';
        this._shapes['square']  = [[5, 5], [5, -5], [-5, -5], [-5, 5]];
        this._shapes['triangle']= [[8, -7], [-8, -7], [0, 8]].map(pt => [pt[1], -pt[0]]);
        this._shapes['classic'] = [[0, 0], [-10, -5], [-10, 5]];
    }

    /**
     * 创建一个新的海龟实例并将其与此屏幕关联
     * @returns {Turtle} 新创建的海龟实例
     */
    createTurtle() {
        const turtle = new Turtle(this);
        return turtle;
    }
    
    /**
     * 设置画布的背景颜色
     * @param {string} color - CSS 颜色字符串
     */
    bgcolor(color) {
        this.commandQueue.push({name: 'bgcolor', args: [color], turtle: null}); // bgcolor 是屏幕指令，没有关联特定 turtle
        return this;
    }

    /**
     * @private
     * 命令队列处理器，是整个库的“心跳”
     */
    _processQueue() {
        requestAnimationFrame(() => {
            if (this.isBusy || this.commandQueue.length === 0) {
                this._processQueue();
                return;
            }

            this.isBusy      = true;
            const command    = this.commandQueue.shift();
            const onComplete = () => {
                this.isBusy = false;
            };
            
            // bgcolor 是屏幕指令，需要特殊处理
            if (command.name === 'bgcolor') {
                this.bgColor = command.args[0];
                this._redraw();
                onComplete();
                this._processQueue();
                return;
            }

            switch (command.name) {
                case 'forward':
                case 'backward':
                    this._executeMove(command, onComplete);
                    break;
                case 'right':
                case 'left':
                    this._executeRotate(command, onComplete);
                    break;
                case 'goto':
                    this._executeGoto(command, onComplete);
                    break;
                case 'circle':
                    this._executeCircle(command, onComplete);
                    break;
                case 'dot':
                    this._executeDot(command, onComplete);
                    break;
                case 'write':
                    this._executeWrite(command, onComplete);
                    break;
                case 'setheading':
                    const turtle   = command.turtle;
                    const angle    = command.args[0];
                    turtle.heading = (360 + angle % 360) % 360;
                    this._redraw();
                    onComplete();
                    break;
                // ... 其他 case ...
                // 以下是无动画的瞬时命令
                default:
                    this._executeInstantCommand(command);
                    onComplete();
                    break;
            }
            this._processQueue();
        });
    }
    
    /**
     * @private
     * 执行无动画的瞬时命令
     */
    _executeInstantCommand(command) {
        const turtle = command.turtle;
        switch (command.name) {
            case 'pencolor':
                turtle.penState.color = _parseColor(...command.args);
                turtle._startNewPathSegment();
                break;
            case 'fillcolor':
                turtle.penState.fillColor = _parseColor(...command.args);
                break;
            case 'color':
                if (command.args.length === 1) {
                    const color = _parseColor(command.args[0]);
                    turtle.penState.color     = color;
                    turtle.penState.fillColor = color;
                } else if (command.args.length >= 2) {
                    turtle.penState.color     = _parseColor(command.args[0]);
                    turtle.penState.fillColor = _parseColor(command.args[1]);
                }
                turtle._startNewPathSegment();
                break;
            case 'pensize':
                turtle.penState.width = command.args[0];
                turtle._startNewPathSegment();
                break;
            case 'penup':
                turtle.penState.isDown = false;
                turtle._startNewPathSegment();
                break;
            case 'pendown':
                turtle.penState.isDown = true;
                turtle._startNewPathSegment();
                break;
            case 'begin_fill':
                turtle.penState.isFilling = true;
                turtle.fillPath = [{x: turtle.x, y: turtle.y}];
                break;
            case 'end_fill':
                this._executeEndFill(command, () => {});
                break;
            case 'hideturtle':
                turtle.isVisible = false;
                this._redraw();
                break;
            case 'showturtle':
                turtle.isVisible = true;
                this._redraw();
                break;
            case 'shape':
                turtle.shapeName = command.args[0];
                this._redraw();
                break;
            case 'clear':
                this._executeClear(command, () => {});
                break;
            case 'reset':
                this._executeReset(command, () => {});
                break;
        }
    }


    /**
     * @private
     * 重绘整个画布。这是唯一的绘图函数，确保了渲染的一致性。
     */
    _redraw() {
        // 1. 清空画布并填充背景色
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = this.bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. 遍历所有海龟
        this.turtles.forEach(turtle => {
            // 3. 绘制该海龟所有已完成的“填充”区域
            turtle.fills.forEach(fill => {
                this.ctx.beginPath();
                this.ctx.moveTo(fill.path[0].x, fill.path[0].y);
                for (let i = 1; i < fill.path.length; i++) {
                    this.ctx.lineTo(fill.path[i].x, fill.path[i].y);
                }
                this.ctx.closePath();
                this.ctx.fillStyle = fill.color;
                this.ctx.fill();
            });

            // 4. 绘制该海龟的所有“路径段”
            turtle.path.forEach(segment => {
                if (!segment.pen.isDown || segment.points.length < 2) return;
                this.ctx.beginPath();
                this.ctx.strokeStyle = segment.pen.color;
                this.ctx.lineWidth   = segment.pen.width;
                this.ctx.moveTo(segment.points[0].x, segment.points[0].y);
                for (let i = 1; i < segment.points.length; i++) {
                    this.ctx.lineTo(segment.points[i].x, segment.points[i].y);
                }
                this.ctx.stroke();
            });

            // 5. 绘制该海龟所有已书写的文字
            turtle.writings.forEach(w => {
                this.ctx.fillStyle    = w.color;
                this.ctx.font         = w.font;
                this.ctx.textAlign    = w.align;
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(w.text, w.x, w.y);
            });

            // 6. 绘制该海龟所有已画的点
            turtle.dots.forEach(d => {
                this.ctx.beginPath();
                this.ctx.arc(d.x, d.y, d.size / 2, 0, 2 * Math.PI);
                this.ctx.fillStyle = d.color;
                this.ctx.fill();
            });

            // 7. 如果海龟可见，最后绘制海龟图标
            if (turtle.isVisible) {
                turtle._draw();
            }
        });
    }

    _executeClear(command, onComplete) {
        command.turtle._clearDrawings();
        this._redraw();
        onComplete();
    }

    _executeReset(command, onComplete) {
        command.turtle._internal_reset();
        this._redraw();
        onComplete();
    }
    
    _executeEndFill(command, onComplete) {
        const turtle = command.turtle;
        turtle.penState.isFilling = false;
        const path = turtle.fillPath;

        if (path.length > 2) {
            turtle.fills.push({path: [...path], color: turtle.penState.fillColor});
        }
        turtle.fillPath = [];
        this._redraw();
        onComplete();
    }
    
    _executeWrite(command, onComplete) {
        const turtle = command.turtle;
        const [arg, move, align, font] = command.args;
        const [fontName, fontSize, fontType] = font;
        const fontString = `${fontType} ${fontSize}pt ${fontName}`;

        const writing = {
            text: arg,
            x: turtle.x,
            y: turtle.y,
            align: align,
            font: fontString,
            color: turtle.penState.color,
        };
        turtle.writings.push(writing);

        if (move) {
            this.ctx.font = fontString;
            const textWidth = this.ctx.measureText(arg).width;
            const rad = turtle.heading * Math.PI / 180;
            turtle.x += Math.cos(rad) * textWidth;
            turtle.y -= Math.sin(rad) * textWidth;
            turtle._startNewPathSegment();
        }

        this._redraw();
        onComplete();
    }

    _executeDot(command, onComplete) {
        const turtle = command.turtle;
        const size   = command.args[0] || turtle.penState.width + 4;
        const color  = _parseColor(...command.args.slice(1)) || turtle.penState.color;
        
        turtle.dots.push({ x: turtle.x, y: turtle.y, size: size, color: color });
        this._redraw();
        onComplete();
    }

    _executeCircle(command, onComplete) {
        const turtle = command.turtle;
        let [radius, extent = 360, steps] = command.args;
        if (!steps) {
            const circumference = Math.abs(2 * Math.PI * radius * (extent / 360));
            steps = Math.max(12, Math.min(360, Math.floor(circumference / 4) + 6));
        }

        const segmentAngle  = extent / steps;
        const segmentLength = 2 * radius * Math.sin(Math.PI / 180 * segmentAngle / 2);
        const originalSpeed = turtle._speed;
        if (turtle._speed > 0) turtle.speed(10); // 加快画圆速度

        const turnDirection = radius > 0 ? 'left' : 'right';
        let stepsDone = 0;

        const step = () => {
            if (stepsDone >= steps) {
                turtle.speed(originalSpeed);
                onComplete();
                return;
            }

            const rotateCmd1 = {turtle, name: turnDirection, args: [segmentAngle / 2]};
            this._executeRotate(rotateCmd1, () => {
                const moveCmd = {turtle, name: 'forward', args: [segmentLength]};
                this._executeMove(moveCmd, () => {
                    const rotateCmd2 = {turtle, name: turnDirection, args: [segmentAngle / 2]};
                    this._executeRotate(rotateCmd2, () => {
                        stepsDone++;
                        step();
                    });
                });
            });
        };
        step();
    }

    _executeMove(command, onComplete) {
        const turtle   = command.turtle;
        const distance = command.name === 'forward' ? command.args[0] : -command.args[0];
        if (distance === 0) {
            onComplete();
            return;
        }

        const speed    = turtle._speed === 0 ? 0 : 1 / (turtle._speed * 15);
        const duration = Math.abs(distance) * speed * 1000;
        const rad      = turtle.heading * Math.PI / 180;
        const startX = turtle.x, startY = turtle.y;
        const targetX = startX + Math.cos(rad) * distance;
        const targetY = startY - Math.sin(rad) * distance;

        if (duration === 0) {
            turtle.x = targetX;
            turtle.y = targetY;
            turtle._getLastPathSegment().points.push({x: turtle.x, y: turtle.y});
            if (turtle.penState.isFilling) turtle.fillPath.push({x: turtle.x, y: turtle.y});
            this._redraw();
            onComplete();
            return;
        }

        const startTime   = performance.now();
        const lastSegment = turtle._getLastPathSegment();

        const animateMove = (currentTime) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            turtle.x = startX + (targetX - startX) * progress;
            turtle.y = startY + (targetY - startY) * progress;
            
            lastSegment.points.push({x: turtle.x, y: turtle.y});
            if (turtle.penState.isFilling) turtle.fillPath.push({x: turtle.x, y: turtle.y});
            this._redraw();

            if (progress < 1) {
                requestAnimationFrame(animateMove);
            } else {
                onComplete();
            }
        };
        requestAnimationFrame(animateMove);
    }
    
    _executeRotate(command, onComplete) {
        const turtle = command.turtle;
        const angle  = command.name === 'right' ? -command.args[0] : command.args[0];
        if (angle === 0) {
            onComplete();
            return;
        }

        const speed         = turtle._speed === 0 ? 0 : 1 / (turtle._speed * 50);
        const duration      = Math.abs(angle) * speed * 1000;
        const startHeading  = turtle.heading;
        const targetHeading = startHeading + angle;

        if (duration === 0) {
            turtle.heading = (360 + targetHeading % 360) % 360;
            this._redraw();
            onComplete();
            return;
        }

        const startTime = performance.now();
        const animateRotate = (currentTime) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            turtle.heading = startHeading + angle * progress;
            this._redraw();

            if (progress < 1) {
                requestAnimationFrame(animateRotate);
            } else {
                turtle.heading = (360 + targetHeading % 360) % 360;
                onComplete();
            }
        };
        requestAnimationFrame(animateRotate);
    }
    
    _executeGoto(command, onComplete) {
        const turtle   = command.turtle;
        const [targetX, targetY] = command.args;
        const startX = turtle.x, startY = turtle.y;
        const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));

        if (distance < 0.01) {
            onComplete();
            return;
        }

        const speed    = turtle._speed === 0 ? 0 : 1 / (turtle._speed * 15);
        const duration = distance * speed * 1000;

        if (duration === 0) {
            turtle.x = targetX;
            turtle.y = targetY;
            turtle._getLastPathSegment().points.push({x: turtle.x, y: turtle.y});
            if (turtle.penState.isFilling) turtle.fillPath.push({x: turtle.x, y: turtle.y});
            this._redraw();
            onComplete();
            return;
        }

        const startTime   = performance.now();
        const lastSegment = turtle._getLastPathSegment();

        const animateGoto = (currentTime) => {
            const progress = Math.min((currentTime - startTime) / duration, 1);
            turtle.x = startX + (targetX - startX) * progress;
            turtle.y = startY + (targetY - startY) * progress;

            lastSegment.points.push({x: turtle.x, y: turtle.y});
            if (turtle.penState.isFilling) turtle.fillPath.push({x: turtle.x, y: turtle.y});
            this._redraw();

            if (progress < 1) {
                requestAnimationFrame(animateGoto);
            } else {
                onComplete();
            }
        };
        requestAnimationFrame(animateGoto);
    }
}

/**
 * Turtle 类
 * 代表一个可移动、可绘图的海龟。
 */
class Turtle {
    /**
     * Turtle 构造函数
     * @param {Screen|CanvasRenderingContext2D} screenOrCtx - 一个 Screen 实例，或者一个 canvas 的 2D 渲染上下文。
     */
    constructor(screenOrCtx) {
        // 如果传入的不是 Screen 实例（例如是一个 ctx），则为其隐式创建一个 Screen。
        // 这使得 `new Turtle(ctx)` 这种便捷用法成为可能。
        const screen = (screenOrCtx instanceof Screen) ? screenOrCtx : new Screen(screenOrCtx);
        
        this.screen = screen;
        
        // 将当前海龟实例注册到它的 Screen 上
        this.screen.turtles.push(this);
        
        // 初始化海龟状态
        this._internal_reset();
    }
    
    /**
     * @private
     * 重置海龟的内部状态到初始值
     */
    _internal_reset() {
        this.x        = this.screen.canvas.width / 2;  // 初始 x 坐标 (画布中心)
        this.y        = this.screen.canvas.height / 2; // 初始 y 坐标 (画布中心)
        this.heading  = 0;                              // 初始朝向 (向右)
        this._speed   = 6;                              // 初始速度 (normal)
        this.penState = {                               // 初始画笔状态
            isDown: true,
            color: '#000000',
            fillColor: '#000000',
            width: 1,
            isFilling: false,
        };
        this.isVisible = true;                          // 初始可见
        this.shapeName = 'classic';                     // 初始形状
        this._clearDrawings();
    }

    /**
     * @private
     * 清除此海龟的所有绘图数据（路径、填充、文字、点）
     */
    _clearDrawings() {
        this.path     = []; // 路径段数组
        this.fills    = []; // 填充物数组
        this.writings = []; // 书写文字数组
        this.dots     = []; // 点数组
        this.fillPath = []; // 当前正在记录的填充路径
        this._startNewPathSegment();
    }
    
    /**
     * @private
     * 当画笔状态（颜色、粗细、抬笔/落笔）改变或位置被瞬移后，开启一个新的路径段
     */
    _startNewPathSegment() {
        const newSegment = {
            pen: {...this.penState}, // 复制当前的画笔状态
            points: [{x: this.x, y: this.y}] // 新路径的起点是当前位置
        };
        this.path.push(newSegment);
    }

    /**
     * @private
     * 获取当前正在绘制的路径段
     */
    _getLastPathSegment() {
        if (this.path.length === 0) this._startNewPathSegment();
        return this.path[this.path.length - 1];
    }
    
    /**
     * @private
     * 根据 this.shapeName 在画布上绘制海龟自己
     */
    _draw() {
        const ctx             = this.screen.ctx;
        const shapeDefinition = this.screen._shapes[this.shapeName];
        if (!shapeDefinition) return;

        ctx.save(); // 保存当前画布状态
        ctx.translate(this.x, this.y); // 将坐标原点移动到海龟位置
        ctx.rotate(-this.heading * Math.PI / 180); // 根据海龟朝向旋转画布

        ctx.beginPath();
        if (shapeDefinition === 'circle') {
            ctx.arc(0, 0, 7, 0, 2 * Math.PI);
        } else {
            const firstPoint = shapeDefinition[0];
            ctx.moveTo(firstPoint[0], firstPoint[1]);
            for (let i = 1; i < shapeDefinition.length; i++) {
                ctx.lineTo(shapeDefinition[i][0], shapeDefinition[i][1]);
            }
            ctx.closePath();
        }

        ctx.fillStyle   = this.penState.fillColor;
        ctx.strokeStyle = this.penState.color;
        ctx.lineWidth   = this.penState.width;
        ctx.fill();
        ctx.stroke();
        ctx.restore(); // 恢复画布状态
    }
    
    /**
     * @private
     * 将一个命令推入屏幕的命令队列等待执行
     */
    _queueCommand(name, args) {
        this.screen.commandQueue.push({turtle: this, name: name, args: args});
        return this; // 返回 this 以支持链式调用
    }

    // --- 公共 API 方法 ---
    
    /**
     * (新增) 将此海龟实例的所有方法暴露到目标对象上
     * @param {object} [target=window] - 要暴露到的目标对象，默认为浏览器的 window 对象
     * @returns {Turtle} 返回海龟实例自身，以支持链式调用
     */
    expose(target = global) {
        if (typeof target !== 'object' || target === null) {
            console.error('expose() requires a valid target object.');
            return this;
        }

        const turtleMethods = [
            'forward', 'fd', 'backward', 'bk', 'right', 'rt', 'left', 'lt',
            'goto', 'setpos', 'penup', 'pu', 'up', 'pendown', 'pd', 'down',
            'pensize', 'width', 'pencolor', 'hideturtle', 'ht',
            'showturtle', 'st', 'clear', 'reset', 'pos', 'position',
            'speed', 'circle', 'dot', 'fillcolor', 'color', 'begin_fill', 'end_fill',
            'shape', 'write',
            'home', 'setheading', 'seth'
        ];
        
        const screenMethods = ['bgcolor'];

        turtleMethods.forEach(methodName => {
            if (typeof this[methodName] === 'function') {
                target[methodName] = this[methodName].bind(this);
            }
        });

        screenMethods.forEach(methodName => {
            if (typeof this.screen[methodName] === 'function') {
                target[methodName] = this.screen[methodName].bind(this.screen);
            }
        });
        
        // 也将实例本身暴露出去，方便访问
        target.turtle = this;
        target.screen = this.screen;

        return this;
    }

    /**
     * 清除此海龟的绘图，并将海龟重置到初始状态。
     */
    reset() {
        return this._queueCommand('reset', []);
    }
    
    /**
     * 将海龟移动到原点 (0,0) 并设置其朝向为0度。
     */
    home() {
        this.goto(0, 0); // goto 会自动处理坐标转换
        this.setheading(0);
        return this;
    }

    /**
     * 立即设置海龟的朝向
     * @param {number} angle - 角度 (0-360)。0为东, 90为北, 180为西, 270为南。
     */
    setheading(angle) {
        return this._queueCommand('setheading', [angle]);
    }
    seth(a) { return this.setheading(a); }

    /**
     * 设置或返回海龟的移动速度
     * @param {string|number} s - 速度值。可以是 'fastest'(0), 'fast'(10), 'normal'(6), 'slow'(3), 'slowest'(1)，或者 0.5-10 的数字。0为无动画。
     */
    speed(s) {
        if (s === undefined) return this._speed;
        const speedMap = {'fastest': 0, 'fast': 10, 'normal': 6, 'slow': 3, 'slowest': 1};
        if (typeof s === 'string' && speedMap[s] !== undefined) {
            this._speed = speedMap[s];
        } else if (typeof s === 'number') {
            this._speed = (s > 10 || s < 0.5) ? 0 : s;
        }
        return this;
    }

    /**
     * 设置或返回海龟的形状
     * @param {string} [name=null] - "classic", "arrow", "turtle", "circle", "square", "triangle"
     */
    shape(name = null) {
        if (name === null) {
            return this.shapeName;
        }
        if (this.screen._shapes[name]) {
            return this._queueCommand('shape', [name]);
        }
        console.warn(`Unknown shape: ${name}`);
        return this;
    }

    /**
     * 在海龟当前位置书写文字
     * @param {string} arg - 要书写的对象
     * @param {object} [options] - 选项
     * @param {boolean} [options.move=false] - 如果为true, 海龟会向前移动文字的宽度
     * @param {string} [options.align='left'] - 'left', 'center', 'right'
     * @param {Array} [options.font=['Arial', 8, 'normal']] - [名称, 大小, 类型]
     */
    write(arg, {move = false, align = 'left', font = ['Arial', 8, 'normal']} = {}) {
        return this._queueCommand('write', [String(arg), move, align, font]);
    }
    
    circle(radius, extent, steps) { return this._queueCommand('circle', [radius, extent, steps]); }
    dot(size, ...colorArgs) { return this._queueCommand('dot', [size, ...colorArgs]); }
    
    fillcolor(...args) {
        if (args.length === 0) return this.penState.fillColor;
        return this._queueCommand('fillcolor', args);
    }
    
    color(...args) {
        if (args.length === 0) return [this.penState.color, this.penState.fillColor];
        return this._queueCommand('color', args);
    }
    
    begin_fill() { return this._queueCommand('begin_fill', []); }
    end_fill() { return this._queueCommand('end_fill', []); }
    
    forward(d) { return this._queueCommand('forward', [d]); }
    fd(d) { return this.forward(d); }
    
    backward(d) { return this._queueCommand('backward', [d]); }
    bk(d) { return this.backward(d); }
    
    right(a) { return this._queueCommand('right', [a]); }
    rt(a) { return this.right(a); }
    
    left(a) { return this._queueCommand('left', [a]); }
    lt(a) { return this.left(a); }
    
    /**
     * 将海龟移动到指定的笛卡尔坐标 (x, y)，(0,0) 在画布中心
     */
    goto(x, y) {
        // 将用户友好的笛卡尔坐标 (0,0 在中心, y轴向上) 转换为 canvas 坐标 (0,0 在左上角, y轴向下)
        const canvasX = x + this.screen.canvas.width / 2;
        const canvasY = -y + this.screen.canvas.height / 2;
        return this._queueCommand('goto', [canvasX, canvasY]);
    }
    setpos(x, y) { return this.goto(x, y); }
    
    penup() { return this._queueCommand('penup', []); }
    pu() { return this.penup(); }
    up() { return this.penup(); }
    
    pendown() { return this._queueCommand('pendown', []); }
    pd() { return this.pendown(); }
    down() { return this.pendown(); }
    
    pensize(w) { return this._queueCommand('pensize', [w]); }
    width(w) { return this.pensize(w); }
    
    pencolor(...args) {
        if (args.length === 0) return this.penState.color;
        return this._queueCommand('pencolor', args);
    }
    
    hideturtle() { return this._queueCommand('hideturtle', []); }
    ht() { return this.hideturtle(); }
    
    showturtle() { return this._queueCommand('showturtle', []); }
    st() { return this.showturtle(); }
    
    /**
     * 仅清除此海龟的绘图，海龟状态和位置不变。
     */
    clear() {
        return this._queueCommand('clear', []);
    }
    
    /**
     * 返回海龟的当前笛卡尔坐标
     * @returns {{x: number, y: number}}
     */
    position() {
        const centerX = this.screen.canvas.width / 2;
        const centerY = this.screen.canvas.height / 2;
        return {x: this.x - centerX, y: -(this.y - centerY)};
    }
    pos() { return this.position(); }
}

// --- 暴露 API 到全局 ---
// 将核心类挂载到传入的 global 对象上 (在浏览器中通常是 window)
global.Turtle = Turtle;
global.Screen = Screen;

}(window));
