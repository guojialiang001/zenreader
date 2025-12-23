# 全屏编辑器 (VIM/nano/vi) 显示问题修复方案

## 问题描述

1. **VIM 等全屏编辑器输出格式混乱**：所有 `~` 行挤在一起，没有正确分行显示
2. **编辑区域没有依靠面板对齐左侧**

## 问题分析

### 核心矛盾

| 场景 | 需要 convertEol | 原因 |
|------|----------------|------|
| 普通命令 (ls, cat 等) | `true` | 后端返回 `\n`，需要转换为 `\r\n` 才能正确换行 |
| 全屏编辑器 (vim, nano) | `false` | 使用光标绝对定位 `ESC[row;colH`，convertEol 会干扰 |

### 全屏编辑器工作原理

VIM/nano 等编辑器使用以下机制：
- **Alternate Screen Buffer**: 进入时发送 `\x1b[?1049h`，退出时发送 `\x1b[?1049l`
- **绝对光标定位**: `\x1b[2;1H` 表示移动到第2行第1列
- **不依赖换行符**: 通过光标定位来控制每行内容的位置

### 当前输出数据分析

```json
{"type": "output", "data": {"output": "\n\u001b[>4;2m\u001b=..."}}
```

问题：输出中缺少光标定位序列 `\x1b[row;colH`，说明：
1. 后端 PTY 尺寸未正确设置，VIM 不知道终端大小
2. 或后端在传输时过滤/破坏了某些控制序列

---

## 方案一：动态检测全屏模式（推荐）

### 原理
检测 Alternate Screen Buffer 切换序列，动态调整处理方式。

### 修改位置
`SshTerminal.vue` 约 995-1037 行，output 消息处理部分

### 实现逻辑

```typescript
// 在 SSHTerminal 类中添加状态
private isAlternateScreen = false

// 在 output 处理中检测
case 'output':
case 'data':
  // ... 现有代码 ...

  if (typeof outputData === 'string') {
    // 检测进入 alternate screen (全屏模式)
    if (outputData.includes('\x1b[?1049h') || outputData.includes('\x1b[?47h')) {
      this.isAlternateScreen = true
    }
    // 检测退出 alternate screen
    if (outputData.includes('\x1b[?1049l') || outputData.includes('\x1b[?47l')) {
      this.isAlternateScreen = false
    }

    // 只有非全屏模式才做 ESM 消息过滤
    if (!this.isAlternateScreen) {
      outputData = outputData.replace(/Expanded Security Maintenance.../g, '')
    }
  }

  // 直接写入，xterm.js 会正确处理
  if (outputData) {
    this.terminal.write(outputData)
  }
```

### 优点
- 不改变 `convertEol` 设置
- 自动区分普通命令和全屏应用
- 对现有逻辑影响最小

### 缺点
- 如果后端已经破坏了 alternate screen 序列，此方案无效

---

## 方案二：后端修复（根本解决）

### 问题根源
后端 PTY 配置或数据传输存在问题。

### 需要后端确认的点

#### 1. PTY 创建时设置正确尺寸
```javascript
// 后端 SSH 连接代码
conn.shell({
  term: 'xterm-256color',
  cols: connectMessage.data.width || 120,
  rows: connectMessage.data.height || 24
}, (err, stream) => {
  // ...
})
```

#### 2. 收到 resize 消息时更新 PTY 尺寸
```javascript
// 后端 WebSocket 消息处理
if (message.type === 'resize') {
  stream.setWindow(
    message.data.height,  // rows
    message.data.width,   // cols
    0,  // height in pixels (可选)
    0   // width in pixels (可选)
  )
}
```

#### 3. 数据传输保持原始二进制
```javascript
// 后端发送数据
stream.on('data', (data) => {
  // 必须保持原始 Buffer，不要做字符串处理
  ws.send(JSON.stringify({
    type: 'output',
    data: {
      output: data.toString('binary'),  // 或 'utf8'，但不要过滤
      currentPath: currentPath
    }
  }))
})
```

### 验证方法
在后端添加调试日志，输出原始数据的 hex 值：
```javascript
console.log('Raw data hex:', data.toString('hex'))
```

检查是否包含：
- `1b5b` (ESC[) - CSI 序列开始
- `1b5b3f31303439` - alternate screen 序列

---

## 方案三：前端数据预处理

### 原理
如果后端返回的数据中光标定位序列完整，但 xterm 没有正确渲染，可能需要手动处理。

### 检测方法
在浏览器控制台添加调试：

```typescript
// 在 output 处理中添加
console.log('Raw output hex:',
  outputData.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')
)
```

### 如果数据完整但显示异常
可能是 xterm.js 版本问题，尝试：
1. 升级 `@xterm/xterm` 到最新版本
2. 检查是否有其他 addon 干扰

---

## 方案四：左对齐问题修复

### 修改位置
`SshTerminal.vue` 第 1965-2016 行 `<style scoped>` 部分

### 添加样式
```css
/* 确保终端内容左对齐 */
:deep(.xterm-screen) {
  padding-left: 0 !important;
  margin-left: 0 !important;
}

:deep(.xterm-viewport) {
  padding-left: 0 !important;
}

:deep(.xterm-rows) {
  padding-left: 0 !important;
  margin-left: 0 !important;
}
```

---

## 测试验证步骤

### 步骤 1：确认后端数据完整性
1. 打开浏览器开发者工具
2. 在 Console 中运行：
```javascript
// 临时 hook WebSocket 消息
const originalOnMessage = window.sshTerminalManager.ws.onmessage
window.sshTerminalManager.ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.type === 'output' && msg.data?.output) {
    console.log('=== OUTPUT DEBUG ===')
    console.log('Length:', msg.data.output.length)
    console.log('Contains ESC[:', msg.data.output.includes('\x1b['))
    console.log('Contains cursor pos:', /\x1b\[\d+;\d+H/.test(msg.data.output))
    console.log('Contains alt screen:', msg.data.output.includes('\x1b[?1049'))
  }
  originalOnMessage.call(this, event)
}
```
3. 执行 `vim test.txt`
4. 查看控制台输出

### 步骤 2：根据结果选择方案

| 调试结果 | 推荐方案 |
|---------|---------|
| Contains cursor pos: false | 方案二（后端问题） |
| Contains cursor pos: true, Contains alt screen: false | 方案二（后端问题） |
| Contains cursor pos: true, Contains alt screen: true | 方案一或方案三 |

### 步骤 3：测试修复效果
1. 执行 `vim test.txt`，检查 `~` 行是否正确分行
2. 执行 `nano test.txt`，检查界面是否正常
3. 退出编辑器后执行 `ls -la`，检查普通命令是否正常
4. 检查终端内容是否左对齐

---

## 总结

| 优先级 | 方案 | 修改范围 | 风险 |
|-------|------|---------|------|
| 1 | 方案四（左对齐） | 仅 CSS | 无 |
| 2 | 方案二（后端修复） | 后端 | 低 |
| 3 | 方案一（动态检测） | 前端 output 处理 | 低 |
| 4 | 方案三（数据预处理） | 前端 | 中 |

**建议执行顺序**：
1. 先用测试验证步骤确认问题根源
2. 执行方案四修复左对齐
3. 根据测试结果选择方案一或方案二
