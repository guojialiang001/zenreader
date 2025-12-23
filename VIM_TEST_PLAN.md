# VIM功能测试计划

## 测试目标
确保SSH终端中的VIM编辑器功能完整，所有按键和编辑操作正常工作。

## 测试环境
- 浏览器: Chrome/Firefox/Edge
- SSH服务器: 已配置的远程服务器
- VIM版本: 服务器上安装的VIM

---

## 1. VIM模式检测测试

### 1.1 VIM启动检测
**测试步骤:**
1. 连接SSH服务器
2. 执行命令: `vim test.txt`
3. 观察VIM模式指示器是否显示

**预期结果:**
- 终端底部显示VIM模式指示器
- 显示"VIM NORMAL"模式

**代码位置:** `SshTerminal.vue:854-860`

### 1.2 模式切换检测
**测试各种模式切换:**

| 起始模式 | 按键 | 目标模式 | 预期显示 |
|---------|------|---------|---------|
| NORMAL | i | INSERT | VIM INSERT |
| NORMAL | a | INSERT | VIM INSERT |
| NORMAL | o | INSERT | VIM INSERT |
| NORMAL | v | VISUAL | VIM VISUAL |
| NORMAL | V | VISUAL LINE | VIM VISUAL LINE |
| NORMAL | Ctrl+v | VISUAL BLOCK | VIM VISUAL BLOCK |
| NORMAL | R | REPLACE | VIM REPLACE |
| NORMAL | : | COMMAND | VIM COMMAND |
| INSERT | ESC | NORMAL | VIM NORMAL |
| VISUAL | ESC | NORMAL | VIM NORMAL |
| COMMAND | ESC | NORMAL | VIM NORMAL |

**代码位置:** `SshTerminal.vue:1666-1727` (predictVimModeChange)

---

## 2. NORMAL模式测试

### 2.1 光标移动
**测试步骤:**
1. 在NORMAL模式下
2. 测试以下按键:
   - h (左移)
   - j (下移)
   - k (上移)
   - l (右移)
   - w (下一个单词)
   - b (上一个单词)
   - 0 (行首)
   - $ (行尾)
   - gg (文件开头)
   - G (文件结尾)

**预期结果:**
- 光标按预期移动
- 屏幕内容正确更新

### 2.2 删除操作
**测试按键:**
- x (删除字符)
- dd (删除行)
- dw (删除单词)
- D (删除到行尾)

**预期结果:**
- 内容正确删除
- 屏幕正确刷新

### 2.3 复制粘贴
**测试按键:**
- yy (复制行)
- yw (复制单词)
- p (粘贴)
- P (在前面粘贴)

**预期结果:**
- 内容正确复制和粘贴

---

## 3. INSERT模式测试

### 3.1 本地回显测试
**测试步骤:**
1. 按 `i` 进入INSERT模式
2. 输入字符: `Hello World`
3. 观察字符是否立即显示

**预期结果:**
- 字符立即显示在光标位置
- 无延迟或重复显示

**代码位置:** `SshTerminal.vue:785-803` (本地回显逻辑)

**关键代码:**
```javascript
// 在INSERT/REPLACE模式下本地显示字符
else if (this.vimCurrentMode === 'INSERT' || this.vimCurrentMode === 'REPLACE') {
  const charCode = data.charCodeAt(0)
  if (charCode >= 32 && charCode <= 126) {
    // 立即在终端显示字符（本地回显）
    this.terminal?.write(data)
  }
}
```

### 3.2 特殊按键测试
**测试按键:**
- Backspace (删除前一个字符)
- Enter (换行)
- Tab (制表符)
- ESC (返回NORMAL模式)

**预期结果:**
- Backspace正确删除字符
- Enter正确换行
- Tab正确插入制表符
- ESC正确返回NORMAL模式

### 3.3 中文输入测试
**测试步骤:**
1. 在INSERT模式下
2. 切换到中文输入法
3. 输入中文字符

**预期结果:**
- 中文字符正确显示
- 无乱码或显示问题

---

## 4. COMMAND模式测试 (关键修复)

### 4.1 命令行显示测试
**测试步骤:**
1. 在NORMAL模式下按 `:`
2. 观察冒号是否显示在终端最后一行

**预期结果:**
- 冒号显示在终端最后一行（底部）
- 不是在当前光标位置新建一行

**代码位置:** `SshTerminal.vue:754-761`

**修复代码:**
```javascript
// 刚进入COMMAND模式（从NORMAL按:）
if (previousMode === 'NORMAL' && data === ':') {
  this.vimCommandLineBuffer = ':'
  // 移动到终端最后一行并显示冒号
  const lastRow = this.terminal?.rows || 24
  this.terminal?.write(`\x1b[${lastRow};1H\x1b[K:`)
}
```

### 4.2 命令输入测试
**测试命令:**
- `:w` (保存)
- `:q` (退出)
- `:wq` (保存并退出)
- `:q!` (强制退出)
- `:set number` (显示行号)
- `:123` (跳转到第123行)

**测试步骤:**
1. 按 `:` 进入COMMAND模式
2. 输入命令字符
3. 观察字符是否显示在底部命令行
4. 按Enter执行命令

**预期结果:**
- 命令字符显示在底部命令行
- Backspace正确删除字符
- Enter正确执行命令
- ESC正确取消命令

### 4.3 命令行编辑测试
**测试步骤:**
1. 输入 `:wq`
2. 按Backspace删除 `q`
3. 输入 `!`
4. 最终命令应为 `:w!`

**预期结果:**
- Backspace正确删除字符
- 命令行正确更新显示

**代码位置:** `SshTerminal.vue:768-774`

---

## 5. VISUAL模式测试

### 5.1 字符选择
**测试步骤:**
1. 按 `v` 进入VISUAL模式
2. 使用 h/j/k/l 移动光标
3. 观察选中区域高亮

**预期结果:**
- 选中区域正确高亮
- 光标移动时选中区域正确扩展

### 5.2 行选择
**测试步骤:**
1. 按 `V` 进入VISUAL LINE模式
2. 使用 j/k 移动光标
3. 观察整行高亮

**预期结果:**
- 整行正确高亮
- 多行选择正确显示

### 5.3 块选择
**测试步骤:**
1. 按 `Ctrl+v` 进入VISUAL BLOCK模式
2. 移动光标选择矩形区域

**预期结果:**
- 矩形区域正确高亮

---

## 6. REPLACE模式测试

### 6.1 字符替换
**测试步骤:**
1. 按 `R` 进入REPLACE模式
2. 输入字符替换现有内容

**预期结果:**
- 新字符替换旧字符（不是插入）
- 本地回显正常工作

**代码位置:** `SshTerminal.vue:785-803` (与INSERT模式共享本地回显)

---

## 7. ESC键处理测试

### 7.1 ESC键响应
**测试所有模式下的ESC键:**

| 当前模式 | 按ESC | 预期结果 |
|---------|-------|---------|
| INSERT | ESC | 返回NORMAL |
| VISUAL | ESC | 返回NORMAL |
| VISUAL LINE | ESC | 返回NORMAL |
| VISUAL BLOCK | ESC | 返回NORMAL |
| REPLACE | ESC | 返回NORMAL |
| COMMAND | ESC | 取消命令，返回NORMAL |

**代码位置:** `SshTerminal.vue:1669-1676`

**关键代码:**
```javascript
// ESC 或 Ctrl+[ - 返回NORMAL模式
if (key === '\x1b' || key === '\x1b[') {
  if (currentMode !== 'NORMAL') {
    this.vimCurrentMode = 'NORMAL'
  }
  return
}
```

---

## 8. 边界情况测试

### 8.1 快速按键测试
**测试步骤:**
1. 在INSERT模式下快速输入大量字符
2. 观察是否有字符丢失或重复

**预期结果:**
- 所有字符正确显示
- 无丢失或重复

### 8.2 模式快速切换
**测试步骤:**
1. 快速切换模式: i -> ESC -> i -> ESC -> i
2. 观察模式指示器是否正确更新

**预期结果:**
- 模式指示器正确更新
- 无状态混乱

### 8.3 长文件编辑
**测试步骤:**
1. 打开一个大文件 (>1000行)
2. 测试滚动和编辑

**预期结果:**
- 滚动流畅
- 编辑操作正常

---

## 9. 已知问题和修复

### 9.1 ✅ 命令行显示问题 (已修复)
**问题描述:**
- 按 `:` 进入COMMAND模式时，冒号不显示或显示位置错误

**修复方案:**
- 使用ANSI转义序列移动光标到最后一行
- 代码: `\x1b[${lastRow};1H\x1b[K:`

**修复位置:** `SshTerminal.vue:758-759`

### 9.2 ✅ INSERT模式本地回显 (已实现)
**功能描述:**
- INSERT/REPLACE模式下字符立即显示，无需等待服务器响应

**实现位置:** `SshTerminal.vue:785-803`

---

## 10. 测试检查清单

### 基础功能
- [ ] VIM启动检测正常
- [ ] 模式指示器显示正确
- [ ] NORMAL模式光标移动正常
- [ ] INSERT模式字符输入正常
- [ ] COMMAND模式命令行显示在底部
- [ ] ESC键在所有模式下正常工作

### 编辑功能
- [ ] 字符插入正常
- [ ] 字符删除正常
- [ ] 行删除正常
- [ ] 复制粘贴正常
- [ ] 撤销重做正常

### 高级功能
- [ ] VISUAL模式选择正常
- [ ] REPLACE模式替换正常
- [ ] 搜索功能正常 (/, ?, n, N)
- [ ] 命令执行正常 (:w, :q, :wq)

### 性能测试
- [ ] 快速输入无字符丢失
- [ ] 大文件编辑流畅
- [ ] 模式切换无延迟

---

## 11. 代码审查要点

### 11.1 VIM模式状态管理
**关键变量:**
- `inVimMode`: 是否在VIM模式
- `vimCurrentMode`: 当前VIM模式 (NORMAL/INSERT/VISUAL/COMMAND/REPLACE)
- `vimCommandLineBuffer`: 命令行缓冲区

**代码位置:** `SshTerminal.vue:620-624`

### 11.2 按键处理流程
1. 用户按键 -> `terminal.onData()`
2. 检查是否在VIM模式
3. 如果在VIM模式:
   - 预测模式变化 (`predictVimModeChange`)
   - 处理特殊模式显示 (COMMAND模式)
   - 本地回显 (INSERT/REPLACE模式)
   - 发送到服务器
4. 如果不在VIM模式:
   - 正常Shell命令处理

**代码位置:** `SshTerminal.vue:728-817`

### 11.3 服务器响应处理
1. 接收服务器输出
2. 检测VIM模式变化 (`detectVimModeFromOutput`)
3. 检测VIM退出 (Shell提示符出现)
4. 写入终端显示

**代码位置:** `SshTerminal.vue:1333-1413`

---

## 12. 测试结论

### 测试通过标准
- 所有基础功能测试通过
- 所有编辑功能测试通过
- 无字符丢失或重复
- 模式切换正确
- 命令行显示正确

### 测试失败处理
如果测试失败，记录:
1. 失败的测试场景
2. 预期结果 vs 实际结果
3. 复现步骤
4. 相关代码位置

---

## 附录: 关键代码片段

### A. COMMAND模式显示修复
```javascript
// 刚进入COMMAND模式（从NORMAL按:）
if (previousMode === 'NORMAL' && data === ':') {
  this.vimCommandLineBuffer = ':'
  // 移动到终端最后一行并显示冒号
  const lastRow = this.terminal?.rows || 24
  this.terminal?.write(`\x1b[${lastRow};1H\x1b[K:`)
  console.log('Entering COMMAND mode, showing ":" at bottom line')
}
```

### B. INSERT模式本地回显
```javascript
// 在INSERT/REPLACE模式下本地显示字符
else if (this.vimCurrentMode === 'INSERT' || this.vimCurrentMode === 'REPLACE') {
  const charCode = data.charCodeAt(0)
  if (charCode >= 32 && charCode <= 126) {
    // 立即在终端显示字符（本地回显）
    this.terminal?.write(data)
    console.log('Local echo:', data)
  }
}
```

### C. ESC键处理
```javascript
// ESC 或 Ctrl+[ - 返回NORMAL模式
if (key === '\x1b' || key === '\x1b[') {
  if (currentMode !== 'NORMAL') {
    this.vimCurrentMode = 'NORMAL'
    console.debug('Mode predicted: NORMAL (ESC pressed)')
  }
  return
}
```
