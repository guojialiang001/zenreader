/**
 * SshTerminal VIM编辑器功能测试脚本
 * 用于验证前端VIM编辑器 FrontendVimEditor 的正确性
 *
 * 运行方式: node pages/__tests__/SshTerminal.vimEditor.test.js
 */

// 模拟 Terminal 类
class MockTerminal {
  constructor() {
    this.writeBuffer = []
    this.cols = 120
    this.rows = 24
  }

  write(data) {
    this.writeBuffer.push(data)
  }

  clear() {
    this.writeBuffer = []
  }

  getWrittenContent() {
    return this.writeBuffer.join('')
  }

  getLastWrite() {
    return this.writeBuffer[this.writeBuffer.length - 1] || ''
  }
}

// 模拟 WebSocket
class MockWebSocket {
  constructor() {
    this.sentMessages = []
    this.readyState = 1 // WebSocket.OPEN
  }

  send(data) {
    this.sentMessages.push(JSON.parse(data))
  }

  getLastMessage() {
    return this.sentMessages[this.sentMessages.length - 1]
  }

  clearMessages() {
    this.sentMessages = []
  }
}

/**
 * 前端VIM编辑器类 - 测试版本
 * 与 SshTerminal.vue 中的 FrontendVimEditor 实现保持一致
 */
class FrontendVimEditor {
  constructor(terminal, ws, filePath, initialContent, currentWorkingDirectory, onModeChange, onExit) {
    this.terminal = terminal
    this.ws = ws
    this.filePath = filePath
    this.fileContent = initialContent ? initialContent.split('\n') : ['']
    this.cursorRow = 0
    this.cursorCol = 0
    this.mode = 'NORMAL'
    this.commandBuffer = ''
    this.yankBuffer = ''
    this.scrollOffset = 0
    this.terminalRows = terminal.rows - 2
    this.terminalCols = terminal.cols
    this.onModeChange = onModeChange
    this.onExit = onExit
    this.currentWorkingDirectory = currentWorkingDirectory
    this.modified = false
  }

  handleInput(data) {
    switch (this.mode) {
      case 'NORMAL':
        this.handleNormalMode(data)
        break
      case 'INSERT':
        this.handleInsertMode(data)
        break
      case 'COMMAND':
        this.handleCommandMode(data)
        break
    }
  }

  handleNormalMode(data) {
    switch (data) {
      case 'i':
        this.setMode('INSERT')
        break
      case 'I':
        this.cursorCol = 0
        this.setMode('INSERT')
        break
      case 'a':
        this.cursorCol = Math.min(this.cursorCol + 1, this.getCurrentLineLength())
        this.setMode('INSERT')
        break
      case 'A':
        this.cursorCol = this.getCurrentLineLength()
        this.setMode('INSERT')
        break
      case 'o':
        this.insertLineBelow()
        this.setMode('INSERT')
        break
      case 'O':
        this.insertLineAbove()
        this.setMode('INSERT')
        break
      case ':':
        this.setMode('COMMAND')
        this.commandBuffer = ''
        break
      case 'h':
      case '\x1b[D':
        this.moveCursorLeft()
        break
      case 'j':
      case '\x1b[B':
        this.moveCursorDown()
        break
      case 'k':
      case '\x1b[A':
        this.moveCursorUp()
        break
      case 'l':
      case '\x1b[C':
        this.moveCursorRight()
        break
      case '0':
        this.cursorCol = 0
        break
      case '$':
        this.cursorCol = Math.max(0, this.getCurrentLineLength() - 1)
        break
      case 'x':
        this.deleteCharAtCursor()
        break
      case 'G':
        this.cursorRow = this.fileContent.length - 1
        this.cursorCol = 0
        break
    }
  }

  handleInsertMode(data) {
    switch (data) {
      case '\x1b': // ESC
        this.setMode('NORMAL')
        if (this.cursorCol > 0) {
          this.cursorCol--
        }
        break
      case '\r':
      case '\n':
        this.insertNewLine()
        break
      case '\x7f':
      case '\b':
        this.backspace()
        break
      default:
        if (data.length === 1 && data >= ' ' && data <= '~') {
          this.insertChar(data)
        }
    }
  }

  handleCommandMode(data) {
    switch (data) {
      case '\x1b': // ESC
        this.setMode('NORMAL')
        this.commandBuffer = ''
        break
      case '\r':
      case '\n':
        this.executeCommand()
        break
      case '\x7f':
      case '\b':
        if (this.commandBuffer.length > 0) {
          this.commandBuffer = this.commandBuffer.slice(0, -1)
        } else {
          this.setMode('NORMAL')
        }
        break
      default:
        if (data.length === 1 && data >= ' ' && data <= '~') {
          this.commandBuffer += data
        }
    }
  }

  executeCommand() {
    const cmd = this.commandBuffer.trim()
    switch (cmd) {
      case 'w':
        this.saveFile()
        break
      case 'q':
        if (!this.modified) {
          this.onExit()
        }
        break
      case 'q!':
        this.onExit()
        break
      case 'wq':
      case 'x':
        this.saveFile()
        this.onExit()
        break
    }
    this.commandBuffer = ''
    this.setMode('NORMAL')
  }

  saveFile() {
    const content = this.fileContent.join('\n')
    this.ws.send(JSON.stringify({
      type: 'vim_save',
      data: {
        filePath: this.filePath,
        content: content,
        currentPath: this.currentWorkingDirectory
      }
    }))
    this.modified = false
  }

  // 编辑操作
  insertChar(char) {
    const line = this.fileContent[this.cursorRow] || ''
    this.fileContent[this.cursorRow] = line.slice(0, this.cursorCol) + char + line.slice(this.cursorCol)
    this.cursorCol++
    this.modified = true
  }

  insertNewLine() {
    const line = this.fileContent[this.cursorRow] || ''
    const beforeCursor = line.slice(0, this.cursorCol)
    const afterCursor = line.slice(this.cursorCol)
    this.fileContent[this.cursorRow] = beforeCursor
    this.fileContent.splice(this.cursorRow + 1, 0, afterCursor)
    this.cursorRow++
    this.cursorCol = 0
    this.modified = true
  }

  insertLineBelow() {
    this.fileContent.splice(this.cursorRow + 1, 0, '')
    this.cursorRow++
    this.cursorCol = 0
    this.modified = true
  }

  insertLineAbove() {
    this.fileContent.splice(this.cursorRow, 0, '')
    this.cursorCol = 0
    this.modified = true
  }

  backspace() {
    if (this.cursorCol > 0) {
      const line = this.fileContent[this.cursorRow] || ''
      this.fileContent[this.cursorRow] = line.slice(0, this.cursorCol - 1) + line.slice(this.cursorCol)
      this.cursorCol--
      this.modified = true
    } else if (this.cursorRow > 0) {
      const currentLine = this.fileContent[this.cursorRow] || ''
      const prevLine = this.fileContent[this.cursorRow - 1] || ''
      this.cursorCol = prevLine.length
      this.fileContent[this.cursorRow - 1] = prevLine + currentLine
      this.fileContent.splice(this.cursorRow, 1)
      this.cursorRow--
      this.modified = true
    }
  }

  deleteCharAtCursor() {
    const line = this.fileContent[this.cursorRow] || ''
    if (this.cursorCol < line.length) {
      this.fileContent[this.cursorRow] = line.slice(0, this.cursorCol) + line.slice(this.cursorCol + 1)
      this.modified = true
    }
  }

  // 光标移动
  moveCursorLeft() {
    if (this.cursorCol > 0) {
      this.cursorCol--
    }
  }

  moveCursorRight() {
    const maxCol = this.mode === 'INSERT' ? this.getCurrentLineLength() : Math.max(0, this.getCurrentLineLength() - 1)
    if (this.cursorCol < maxCol) {
      this.cursorCol++
    }
  }

  moveCursorUp() {
    if (this.cursorRow > 0) {
      this.cursorRow--
      this.cursorCol = Math.min(this.cursorCol, this.getCurrentLineLength())
    }
  }

  moveCursorDown() {
    if (this.cursorRow < this.fileContent.length - 1) {
      this.cursorRow++
      this.cursorCol = Math.min(this.cursorCol, this.getCurrentLineLength())
    }
  }

  getCurrentLineLength() {
    return (this.fileContent[this.cursorRow] || '').length
  }

  setMode(newMode) {
    this.mode = newMode
    this.onModeChange(newMode)
  }

  getMode() {
    return this.mode
  }

  getFileContent() {
    return this.fileContent.join('\n')
  }

  getCursorPosition() {
    return { row: this.cursorRow, col: this.cursorCol }
  }

  isModified() {
    return this.modified
  }
}

// ============ 测试用例 ============

let passedTests = 0
let failedTests = 0
const testResults = []

function assertEqual(actual, expected, testName) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passedTests++
    testResults.push({ name: testName, status: 'PASS', actual, expected })
    console.log(`✓ ${testName}`)
  } else {
    failedTests++
    testResults.push({ name: testName, status: 'FAIL', actual, expected })
    console.log(`✗ ${testName}`)
    console.log(`  Expected: ${JSON.stringify(expected)}`)
    console.log(`  Actual:   ${JSON.stringify(actual)}`)
  }
}

function assertTrue(condition, testName) {
  if (condition) {
    passedTests++
    testResults.push({ name: testName, status: 'PASS' })
    console.log(`✓ ${testName}`)
  } else {
    failedTests++
    testResults.push({ name: testName, status: 'FAIL' })
    console.log(`✗ ${testName}`)
  }
}

// ============ 测试组1: 模式切换 ============
console.log('\n=== 测试组1: 模式切换 ===\n')

function testModeSwitch_NormalToInsert_i() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let lastMode = 'NORMAL'

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', (mode) => { lastMode = mode }, () => {}
  )

  assertEqual(editor.getMode(), 'NORMAL', '初始模式应为NORMAL')

  editor.handleInput('i')
  assertEqual(editor.getMode(), 'INSERT', '按i后应切换到INSERT模式')
  assertEqual(lastMode, 'INSERT', '回调应收到INSERT模式')
}

function testModeSwitch_InsertToNormal_ESC() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let lastMode = 'NORMAL'

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', (mode) => { lastMode = mode }, () => {}
  )

  editor.handleInput('i')  // 进入INSERT
  assertEqual(editor.getMode(), 'INSERT', 'INSERT模式')

  editor.handleInput('\x1b')  // ESC
  assertEqual(editor.getMode(), 'NORMAL', 'ESC后应回到NORMAL模式')
  assertEqual(lastMode, 'NORMAL', '回调应收到NORMAL模式')
}

function testModeSwitch_NormalToCommand_Colon() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let lastMode = 'NORMAL'

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', (mode) => { lastMode = mode }, () => {}
  )

  editor.handleInput(':')
  assertEqual(editor.getMode(), 'COMMAND', '按:后应切换到COMMAND模式')
  assertEqual(lastMode, 'COMMAND', '回调应收到COMMAND模式')
}

function testModeSwitch_CommandToNormal_ESC() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => {}
  )

  editor.handleInput(':')
  assertEqual(editor.getMode(), 'COMMAND', 'COMMAND模式')

  editor.handleInput('\x1b')  // ESC
  assertEqual(editor.getMode(), 'NORMAL', 'ESC后应回到NORMAL模式')
}

function testModeSwitch_InsertVariants() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  // 测试 I (行首插入)
  const editor1 = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => {}
  )
  editor1.cursorCol = 5
  editor1.handleInput('I')
  assertEqual(editor1.getMode(), 'INSERT', 'I应进入INSERT模式')
  assertEqual(editor1.getCursorPosition().col, 0, 'I应将光标移到行首')

  // 测试 a (光标后插入)
  const editor2 = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => {}
  )
  editor2.cursorCol = 0
  editor2.handleInput('a')
  assertEqual(editor2.getMode(), 'INSERT', 'a应进入INSERT模式')
  assertEqual(editor2.getCursorPosition().col, 1, 'a应将光标向右移动一位')

  // 测试 A (行尾插入)
  const editor3 = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => {}
  )
  editor3.cursorCol = 0
  editor3.handleInput('A')
  assertEqual(editor3.getMode(), 'INSERT', 'A应进入INSERT模式')
  assertEqual(editor3.getCursorPosition().col, 11, 'A应将光标移到行尾')
}

testModeSwitch_NormalToInsert_i()
testModeSwitch_InsertToNormal_ESC()
testModeSwitch_NormalToCommand_Colon()
testModeSwitch_CommandToNormal_ESC()
testModeSwitch_InsertVariants()

// ============ 测试组2: 文本编辑 ============
console.log('\n=== 测试组2: 文本编辑 ===\n')

function testEdit_InsertCharacter() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello',
    '~', () => {}, () => {}
  )

  editor.handleInput('i')  // 进入INSERT模式
  editor.handleInput('X')  // 插入字符

  assertEqual(editor.getFileContent(), 'XHello', '应在光标位置插入字符X')
  assertEqual(editor.getCursorPosition().col, 1, '光标应向右移动')
  assertTrue(editor.isModified(), '文件应标记为已修改')
}

function testEdit_InsertMultipleCharacters() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', '',
    '~', () => {}, () => {}
  )

  editor.handleInput('i')
  editor.handleInput('H')
  editor.handleInput('i')
  editor.handleInput('!')

  assertEqual(editor.getFileContent(), 'Hi!', '应正确插入多个字符')
  assertEqual(editor.getCursorPosition().col, 3, '光标应在正确位置')
}

function testEdit_Backspace() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello',
    '~', () => {}, () => {}
  )

  editor.cursorCol = 3  // 光标在'l'前
  editor.handleInput('i')
  editor.handleInput('\x7f')  // 退格

  assertEqual(editor.getFileContent(), 'Helo', '退格应删除光标前的字符')
  assertEqual(editor.getCursorPosition().col, 2, '光标应向左移动')
}

function testEdit_NewLine() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'HelloWorld',
    '~', () => {}, () => {}
  )

  editor.cursorCol = 5  // 光标在'W'前
  editor.handleInput('i')
  editor.handleInput('\r')  // 回车

  assertEqual(editor.getFileContent(), 'Hello\nWorld', '回车应分割行')
  assertEqual(editor.getCursorPosition().row, 1, '光标应在新行')
  assertEqual(editor.getCursorPosition().col, 0, '光标应在行首')
}

function testEdit_DeleteCharAtCursor() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello',
    '~', () => {}, () => {}
  )

  editor.cursorCol = 0
  editor.handleInput('x')  // 删除光标处字符

  assertEqual(editor.getFileContent(), 'ello', 'x应删除光标处字符')
}

function testEdit_InsertLineBelow() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Line1\nLine2',
    '~', () => {}, () => {}
  )

  editor.cursorRow = 0
  editor.handleInput('o')

  assertEqual(editor.getFileContent(), 'Line1\n\nLine2', 'o应在当前行下方插入新行')
  assertEqual(editor.getCursorPosition().row, 1, '光标应在新行')
  assertEqual(editor.getMode(), 'INSERT', '应进入INSERT模式')
}

function testEdit_InsertLineAbove() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Line1\nLine2',
    '~', () => {}, () => {}
  )

  editor.cursorRow = 1
  editor.handleInput('O')

  assertEqual(editor.getFileContent(), 'Line1\n\nLine2', 'O应在当前行上方插入新行')
  assertEqual(editor.getCursorPosition().row, 1, '光标应在新行')
  assertEqual(editor.getMode(), 'INSERT', '应进入INSERT模式')
}

testEdit_InsertCharacter()
testEdit_InsertMultipleCharacters()
testEdit_Backspace()
testEdit_NewLine()
testEdit_DeleteCharAtCursor()
testEdit_InsertLineBelow()
testEdit_InsertLineAbove()

// ============ 测试组3: 光标移动 ============
console.log('\n=== 测试组3: 光标移动 ===\n')

function testCursor_hjkl() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Line1\nLine2\nLine3',
    '~', () => {}, () => {}
  )

  // 初始位置
  editor.cursorRow = 1
  editor.cursorCol = 2

  // h - 左移
  editor.handleInput('h')
  assertEqual(editor.getCursorPosition().col, 1, 'h应向左移动')

  // l - 右移
  editor.handleInput('l')
  assertEqual(editor.getCursorPosition().col, 2, 'l应向右移动')

  // k - 上移
  editor.handleInput('k')
  assertEqual(editor.getCursorPosition().row, 0, 'k应向上移动')

  // j - 下移
  editor.handleInput('j')
  assertEqual(editor.getCursorPosition().row, 1, 'j应向下移动')
}

function testCursor_ArrowKeys() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Line1\nLine2\nLine3',
    '~', () => {}, () => {}
  )

  editor.cursorRow = 1
  editor.cursorCol = 2

  // 左箭头
  editor.handleInput('\x1b[D')
  assertEqual(editor.getCursorPosition().col, 1, '左箭头应向左移动')

  // 右箭头
  editor.handleInput('\x1b[C')
  assertEqual(editor.getCursorPosition().col, 2, '右箭头应向右移动')

  // 上箭头
  editor.handleInput('\x1b[A')
  assertEqual(editor.getCursorPosition().row, 0, '上箭头应向上移动')

  // 下箭头
  editor.handleInput('\x1b[B')
  assertEqual(editor.getCursorPosition().row, 1, '下箭头应向下移动')
}

function testCursor_LineStartEnd() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => {}
  )

  editor.cursorCol = 5

  // 0 - 行首
  editor.handleInput('0')
  assertEqual(editor.getCursorPosition().col, 0, '0应移动到行首')

  // $ - 行尾
  editor.handleInput('$')
  assertEqual(editor.getCursorPosition().col, 10, '$应移动到行尾（最后一个字符）')
}

function testCursor_FileEnd() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Line1\nLine2\nLine3',
    '~', () => {}, () => {}
  )

  editor.cursorRow = 0

  // G - 文件末尾
  editor.handleInput('G')
  assertEqual(editor.getCursorPosition().row, 2, 'G应移动到文件末尾')
}

function testCursor_Boundary() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello',
    '~', () => {}, () => {}
  )

  // 测试边界：在行首时不能再左移
  editor.cursorCol = 0
  editor.handleInput('h')
  assertEqual(editor.getCursorPosition().col, 0, '在行首时h不应移动')

  // 测试边界：在第一行时不能再上移
  editor.cursorRow = 0
  editor.handleInput('k')
  assertEqual(editor.getCursorPosition().row, 0, '在第一行时k不应移动')
}

testCursor_hjkl()
testCursor_ArrowKeys()
testCursor_LineStartEnd()
testCursor_FileEnd()
testCursor_Boundary()

// ============ 测试组4: 命令执行 ============
console.log('\n=== 测试组4: 命令执行 ===\n')

function testCommand_Save() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '/home/user', () => {}, () => {}
  )

  // 进入命令模式并执行保存
  editor.handleInput(':')
  editor.handleInput('w')
  editor.handleInput('\r')

  const lastMsg = ws.getLastMessage()
  assertEqual(lastMsg.type, 'vim_save', '应发送vim_save消息')
  assertEqual(lastMsg.data.filePath, 'test.txt', '应包含正确的文件路径')
  assertEqual(lastMsg.data.content, 'Hello World', '应包含正确的文件内容')
  assertEqual(lastMsg.data.currentPath, '/home/user', '应包含正确的当前路径')
}

function testCommand_Quit() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let exitCalled = false

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => { exitCalled = true }
  )

  // 未修改时退出
  editor.handleInput(':')
  editor.handleInput('q')
  editor.handleInput('\r')

  assertTrue(exitCalled, ':q应调用退出回调')
}

function testCommand_QuitModifiedFile() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let exitCalled = false

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => { exitCalled = true }
  )

  // 修改文件
  editor.handleInput('i')
  editor.handleInput('X')
  editor.handleInput('\x1b')

  // 尝试退出
  editor.handleInput(':')
  editor.handleInput('q')
  editor.handleInput('\r')

  assertTrue(!exitCalled, ':q在文件修改后不应退出')
}

function testCommand_ForceQuit() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let exitCalled = false

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => { exitCalled = true }
  )

  // 修改文件
  editor.handleInput('i')
  editor.handleInput('X')
  editor.handleInput('\x1b')

  // 强制退出
  editor.handleInput(':')
  editor.handleInput('q')
  editor.handleInput('!')
  editor.handleInput('\r')

  assertTrue(exitCalled, ':q!应强制退出')
}

function testCommand_WriteQuit() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let exitCalled = false

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => { exitCalled = true }
  )

  editor.handleInput(':')
  editor.handleInput('w')
  editor.handleInput('q')
  editor.handleInput('\r')

  assertTrue(exitCalled, ':wq应退出')
  assertTrue(ws.sentMessages.length > 0, ':wq应发送保存消息')
}

function testCommand_Backspace() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello World',
    '~', () => {}, () => {}
  )

  editor.handleInput(':')
  editor.handleInput('w')
  editor.handleInput('q')
  editor.handleInput('\x7f')  // 退格
  editor.handleInput('\x7f')  // 退格

  // 命令缓冲区应为空
  assertEqual(editor.commandBuffer, '', '退格应删除命令缓冲区字符')
}

testCommand_Save()
testCommand_Quit()
testCommand_QuitModifiedFile()
testCommand_ForceQuit()
testCommand_WriteQuit()
testCommand_Backspace()

// ============ 测试组5: 复杂场景 ============
console.log('\n=== 测试组5: 复杂场景 ===\n')

function testScenario_EditAndSave() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()
  let exitCalled = false

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'Hello',
    '~', () => {}, () => { exitCalled = true }
  )

  // 移动到行尾
  editor.handleInput('A')
  // 插入文字
  editor.handleInput(' ')
  editor.handleInput('W')
  editor.handleInput('o')
  editor.handleInput('r')
  editor.handleInput('l')
  editor.handleInput('d')
  // 退出插入模式
  editor.handleInput('\x1b')
  // 保存并退出
  editor.handleInput(':')
  editor.handleInput('w')
  editor.handleInput('q')
  editor.handleInput('\r')

  assertEqual(editor.getFileContent(), 'Hello World', '应正确编辑文件内容')
  assertTrue(exitCalled, '应成功退出')

  const saveMsg = ws.sentMessages.find(m => m.type === 'vim_save')
  assertEqual(saveMsg.data.content, 'Hello World', '保存的内容应正确')
}

function testScenario_MultiLineEdit() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', '',
    '~', () => {}, () => {}
  )

  // 插入多行
  editor.handleInput('i')
  editor.handleInput('L')
  editor.handleInput('i')
  editor.handleInput('n')
  editor.handleInput('e')
  editor.handleInput('1')
  editor.handleInput('\r')  // 新行
  editor.handleInput('L')
  editor.handleInput('i')
  editor.handleInput('n')
  editor.handleInput('e')
  editor.handleInput('2')
  editor.handleInput('\x1b')

  assertEqual(editor.getFileContent(), 'Line1\nLine2', '应正确创建多行内容')
  assertEqual(editor.getCursorPosition().row, 1, '光标应在第二行')
}

function testScenario_NavigateAndEdit() {
  const terminal = new MockTerminal()
  const ws = new MockWebSocket()

  const editor = new FrontendVimEditor(
    terminal, ws, 'test.txt', 'AAAA\nBBBB\nCCCC',
    '~', () => {}, () => {}
  )

  // 移动到第二行
  editor.handleInput('j')
  // 移动到第3列
  editor.handleInput('l')
  editor.handleInput('l')
  // 删除字符
  editor.handleInput('x')

  assertEqual(editor.getFileContent(), 'AAAA\nBBB\nCCCC', '应删除正确位置的字符')
}

testScenario_EditAndSave()
testScenario_MultiLineEdit()
testScenario_NavigateAndEdit()

// ============ 测试报告 ============
console.log('\n========================================')
console.log('VIM编辑器单元测试报告')
console.log('========================================')
console.log(`测试总数: ${passedTests + failedTests}`)
console.log(`通过: ${passedTests}`)
console.log(`失败: ${failedTests}`)
console.log(`通过率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`)
console.log('========================================')

if (failedTests > 0) {
  console.log('\n失败的测试:')
  testResults.filter(r => r.status === 'FAIL').forEach(r => {
    console.log(`  - ${r.name}`)
    if (r.expected !== undefined) {
      console.log(`    Expected: ${JSON.stringify(r.expected)}`)
      console.log(`    Actual:   ${JSON.stringify(r.actual)}`)
    }
  })
}

// 退出码
process.exit(failedTests > 0 ? 1 : 0)
