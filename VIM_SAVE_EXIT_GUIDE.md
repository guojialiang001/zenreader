# VIM 保存退出命令 - 后端通信完整方案

## 1. 概述

本文档详细说明了在 SSH 终端工具中，当用户在 VIM 编辑器中执行保存/退出命令时，前端应如何与后端进行通信。

**采用方案：携带文件内容保存（save_with_content）**

## 2. VIM 保存/退出命令列表

| 命令 | 功能 | 说明 |
|------|------|------|
| `:w` | 保存 | 保存当前文件，不退出 |
| `:w filename` | 另存为 | 保存到指定文件名 |
| `:q` | 退出 | 退出（未修改时） |
| `:q!` | 强制退出 | 放弃修改并退出 |
| `:wq` | 保存并退出 | 保存文件后退出 |
| `:wq!` | 强制保存并退出 | 强制保存并退出 |
| `:x` | 保存并退出 | 仅在有修改时保存 |
| `:x!` | 强制保存并退出 | 强制保存并退出 |
| `ZZ` | 保存并退出 | 等同于 `:x` |
| `ZQ` | 强制退出 | 等同于 `:q!` |

## 3. WebSocket 消息协议

### 3.1 前端发送消息格式

#### 3.1.1 保存文件（save_with_content）

```typescript
interface VimSaveMessage {
  type: 'vim_command'
  data: {
    action: 'save_with_content'
    command: string           // 原始命令：'w', 'wq', 'x' 等
    fileName: string          // 文件名：'test.txt'
    filePath: string          // 完整路径：'/home/user/test.txt'
    content: string           // 文件完整内容
    encoding: string          // 编码：'utf-8'
    createBackup: boolean     // 是否创建备份
    lineEnding: 'unix' | 'dos' // 换行符类型
    currentPath: string       // 当前工作目录
    alsoQuit: boolean         // 保存后是否退出
  }
}
```

**示例：**
```json
{
  "type": "vim_command",
  "data": {
    "action": "save_with_content",
    "command": "wq",
    "fileName": "test.txt",
    "filePath": "/home/user/test.txt",
    "content": "line 1\nline 2\nline 3\n",
    "encoding": "utf-8",
    "createBackup": true,
    "lineEnding": "unix",
    "currentPath": "/home/user",
    "alsoQuit": true
  }
}
```

#### 3.1.2 退出 VIM（exit_vim）

```typescript
interface VimExitMessage {
  type: 'vim_command'
  data: {
    action: 'exit_vim'
    command: string           // 原始命令：'q', 'q!' 等
    forceQuit: boolean        // 是否强制退出
    currentPath: string       // 当前工作目录
  }
}
```

**示例：**
```json
{
  "type": "vim_command",
  "data": {
    "action": "exit_vim",
    "command": "q!",
    "forceQuit": true,
    "currentPath": "/home/user"
  }
}
```

### 3.2 后端响应消息格式

#### 3.2.1 保存结果（vim_save_result）

```typescript
interface VimSaveResult {
  type: 'vim_save_result'
  data: {
    success: boolean
    fileName: string
    filePath: string
    bytesWritten?: number     // 成功时返回
    error?: string            // 失败时返回
    message: string           // 用户友好的消息
    alsoQuit: boolean         // 是否需要退出
    prompt?: string           // 退出后的命令提示符
  }
}
```

**成功示例：**
```json
{
  "type": "vim_save_result",
  "data": {
    "success": true,
    "fileName": "test.txt",
    "filePath": "/home/user/test.txt",
    "bytesWritten": 1234,
    "message": "\"test.txt\" 1234B written",
    "alsoQuit": true,
    "prompt": "user@host:~$ "
  }
}
```

**失败示例：**
```json
{
  "type": "vim_save_result",
  "data": {
    "success": false,
    "fileName": "test.txt",
    "filePath": "/home/user/test.txt",
    "error": "Permission denied",
    "message": "E212: Can't open file for writing",
    "alsoQuit": false
  }
}
```

#### 3.2.2 退出结果（vim_exit_result）

```typescript
interface VimExitResult {
  type: 'vim_exit_result'
  data: {
    success: boolean
    error?: string
    message?: string
    prompt?: string           // 退出后的命令提示符
  }
}
```

## 4. 前端实现代码

### 4.1 FrontendVimEditor 类核心方法

```typescript
type VimModeType = 'NORMAL' | 'INSERT' | 'COMMAND' | 'VISUAL' | 'VISUAL_LINE' | 'VISUAL_BLOCK' | 'REPLACE'

class FrontendVimEditor {
  private mode: VimModeType = 'NORMAL'
  private commandBuffer = ''
  private fileName = ''
  private filePath = ''
  private modified = false
  private fileContent: string[] = []
  private originalContent: string[] = []
  private currentPath = ''
  private cursorLine = 0
  private cursorCol = 0
  
  // 回调函数
  private onModeChange: (mode: VimModeType) => void
  private onCommandBufferChange: (buffer: string) => void
  private onModifiedChange: (modified: boolean) => void
  private onSendToServer: (type: string, data: any) => void
  private onTerminalWrite: (data: string) => void
  
  // ========== 文件内容管理 ==========
  
  public initContent(content: string): void {
    this.fileContent = content.split('\n')
    this.originalContent = [...this.fileContent]
    this.modified = false
  }
  
  public getContent(): string {
    return this.fileContent.join('\n')
  }
  
  public hasUnsavedChanges(): boolean {
    return JSON.stringify(this.fileContent) !== JSON.stringify(this.originalContent)
  }
  
  public markAsSaved(): void {
    this.originalContent = [...this.fileContent]
    this.modified = false
    this.onModifiedChange(false)
  }
  
  // ========== 命令解析 ==========
  
  private parseAndExecuteCommand(cmd: string): void {
    cmd = cmd.trim()
    
    const saveAndExitCommands = ['wq', 'wq!', 'x', 'x!', 'wqa', 'wqa!']
    
    if (this.isSaveCommand(cmd)) {
      const alsoQuit = saveAndExitCommands.some(c => cmd === c || cmd.startsWith(c + ' '))
      this.handleSaveCommand(cmd, alsoQuit)
      return
    }
    
    if (this.isExitCommand(cmd)) {
      const forceQuit = cmd.includes('!')
      this.handleExitCommand(cmd, forceQuit)
      return
    }
    
    // 其他命令
    this.onSendToServer('vim_command', { 
      action: 'ex_command', 
      command: cmd,
      currentPath: this.currentPath
    })
  }
  
  private isSaveCommand(cmd: string): boolean {
    return /^w($|!|\s)/.test(cmd) || 
           /^wq($|!)/.test(cmd) || 
           /^x($|!)/.test(cmd) ||
           /^wqa($|!)/.test(cmd)
  }
  
  private isExitCommand(cmd: string): boolean {
    return /^q($|!|a|a!)/.test(cmd)
  }
  
  // ========== 保存命令处理 ==========
  
  private handleSaveCommand(cmd: string, alsoQuit: boolean = false): void {
    const forceWrite = cmd.includes('!')
    
    let targetFileName = this.fileName
    let targetFilePath = this.getFilePath()
    
    // 解析 :w filename 格式
    const match = cmd.match(/^w\s+(.+)$/)
    if (match) {
      targetFileName = match[1].trim()
      if (this.currentPath) {
        const separator = this.currentPath.endsWith('/') ? '' : '/'
        targetFilePath = `${this.currentPath}${separator}${targetFileName}`
      } else {
        targetFilePath = targetFileName
      }
    }
    
    // :x 命令在没有修改时直接退出
    if ((cmd === 'x' || cmd === 'x!') && !this.hasUnsavedChanges()) {
      if (alsoQuit) {
        this.onSendToServer('vim_command', {
          action: 'exit_vim',
          command: cmd,
          forceQuit: true,
          currentPath: this.currentPath
        })
      }
      return
    }
    
    // 发送保存命令
    this.onSendToServer('vim_command', {
      action: 'save_with_content',
      command: cmd,
      fileName: targetFileName,
      filePath: targetFilePath,
      content: this.getContent(),
      encoding: 'utf-8',
      createBackup: !forceWrite,
      lineEnding: 'unix',
      currentPath: this.currentPath,
      alsoQuit: alsoQuit
    })
  }
  
  // ========== 退出命令处理 ==========
  
  private handleExitCommand(cmd: string, forceQuit: boolean = false): void {
    if (!forceQuit && this.hasUnsavedChanges()) {
      this.onTerminalWrite('\r\nE37: No write since last change (add ! to override)\r\n')
      return
    }
    
    this.onSendToServer('vim_command', {
      action: 'exit_vim',
      command: cmd,
      forceQuit: forceQuit,
      currentPath: this.currentPath
    })
  }
  
  // ========== 后端响应处理 ==========
  
  public handleSaveResult(result: {
    success: boolean
    fileName: string
    bytesWritten?: number
    error?: string
    message: string
    alsoQuit: boolean
    prompt?: string
  }): void {
    if (result.success) {
      this.markAsSaved()
      this.onTerminalWrite(`\r\n"${result.fileName}" ${result.bytesWritten}B written\r\n`)
      
      if (result.alsoQuit && result.prompt) {
        this.reset()
        this.onTerminalWrite(result.prompt)
      }
    } else {
      this.onTerminalWrite(`\r\nE212: ${result.error || "Can't open file for writing"}\r\n`)
    }
  }
  
  public handleExitResult(result: {
    success: boolean
    error?: string
    prompt?: string
  }): void {
    if (result.success) {
      this.reset()
      if (result.prompt) {
        this.onTerminalWrite(result.prompt)
      }
    } else {
      this.onTerminalWrite(`\r\n${result.error || 'Cannot exit'}\r\n`)
    }
  }
}
```

### 4.2 SSHTerminal 类消息处理

```typescript
class SSHTerminal {
  private vimEditor: FrontendVimEditor | null = null
  private isInVimMode = false
  
  private handleWebSocketMessage(event: MessageEvent): void {
    const message = JSON.parse(event.data)
    
    switch (message.type) {
      case 'vim_save_result':
        this.handleVimSaveResult(message.data)
        break
      case 'vim_exit_result':
        this.handleVimExitResult(message.data)
        break
      case 'vim_file_content':
        this.handleVimFileContent(message.data)
        break
    }
  }
  
  private handleVimSaveResult(data: any): void {
    if (this.vimEditor) {
      this.vimEditor.handleSaveResult(data)
      if (data.success && data.alsoQuit) {
        this.exitVimMode()
      }
    }
  }
  
  private handleVimExitResult(data: any): void {
    if (this.vimEditor) {
      this.vimEditor.handleExitResult(data)
      if (data.success) {
        this.exitVimMode()
      }
    }
  }
  
  private handleVimFileContent(data: any): void {
    if (this.vimEditor) {
      this.vimEditor.setFileName(data.fileName)
      this.vimEditor.setFilePath(data.filePath)
      this.vimEditor.initContent(data.content)
    }
  }
}
```

## 5. 后端实现代码

### 5.1 Python FastAPI 实现

```python
from fastapi import FastAPI, WebSocket
import base64
import os

app = FastAPI()

class VimCommandHandler:
    def __init__(self, ssh_session):
        self.ssh_session = ssh_session
    
    async def handle_vim_command(self, websocket: WebSocket, data: dict):
        action = data.get('action')
        
        if action == 'save_with_content':
            await self.handle_save_with_content(websocket, data)
        elif action == 'exit_vim':
            await self.handle_exit_vim(websocket, data)
    
    async def handle_save_with_content(self, websocket: WebSocket, data: dict):
        file_path = data.get('filePath')
        content = data.get('content', '')
        encoding = data.get('encoding', 'utf-8')
        create_backup = data.get('createBackup', True)
        line_ending = data.get('lineEnding', 'unix')
        also_quit = data.get('alsoQuit', False)
        
        try:
            # 处理换行符
            if line_ending == 'dos':
                content = content.replace('\n', '\r\n')
            
            # 创建备份
            if create_backup:
                await self.create_backup(file_path)
            
            # 写入文件
            bytes_written = await self.write_file_via_ssh(file_path, content, encoding)
            
            # 获取命令提示符
            prompt = await self.get_prompt() if also_quit else None
            
            await websocket.send_json({
                'type': 'vim_save_result',
                'data': {
                    'success': True,
                    'fileName': os.path.basename(file_path),
                    'filePath': file_path,
                    'bytesWritten': bytes_written,
                    'message': f'"{os.path.basename(file_path)}" {bytes_written}B written',
                    'alsoQuit': also_quit,
                    'prompt': prompt
                }
            })
            
        except Exception as e:
            await websocket.send_json({
                'type': 'vim_save_result',
                'data': {
                    'success': False,
                    'fileName': os.path.basename(file_path),
                    'filePath': file_path,
                    'error': str(e),
                    'message': f"E212: {str(e)}",
                    'alsoQuit': False
                }
            })
    
    async def handle_exit_vim(self, websocket: WebSocket, data: dict):
        try:
            prompt = await self.get_prompt()
            await websocket.send_json({
                'type': 'vim_exit_result',
                'data': {
                    'success': True,
                    'message': 'Exited vim',
                    'prompt': prompt
                }
            })
        except Exception as e:
            await websocket.send_json({
                'type': 'vim_exit_result',
                'data': {
                    'success': False,
                    'error': str(e)
                }
            })
    
    async def write_file_via_ssh(self, file_path: str, content: str, encoding: str) -> int:
        encoded_content = base64.b64encode(content.encode(encoding)).decode('ascii')
        command = f'echo "{encoded_content}" | base64 -d > "{file_path}"'
        result = await self.ssh_session.execute(command)
        if result.exit_code != 0:
            raise Exception(result.stderr)
        return len(content.encode(encoding))
    
    async def create_backup(self, file_path: str):
        command = f'cp "{file_path}" "{file_path}.bak" 2>/dev/null || true'
        await self.ssh_session.execute(command)
    
    async def get_prompt(self) -> str:
        result = await self.ssh_session.execute('echo "$PS1"')
        return result.stdout.strip() or '$ '
```

### 5.2 Node.js 实现

```javascript
class VimCommandHandler {
  constructor(sshConnection) {
    this.ssh = sshConnection;
  }

  async handleVimCommand(ws, data) {
    const { action } = data;

    switch (action) {
      case 'save_with_content':
        await this.handleSaveWithContent(ws, data);
        break;
      case 'exit_vim':
        await this.handleExitVim(ws, data);
        break;
    }
  }

  async handleSaveWithContent(ws, data) {
    const { filePath, content = '', encoding = 'utf-8', createBackup = true, lineEnding = 'unix', alsoQuit = false } = data;

    try {
      let processedContent = content;
      if (lineEnding === 'dos') {
        processedContent = content.replace(/\n/g, '\r\n');
      }

      if (createBackup) {
        await this.createBackup(filePath);
      }

      const bytesWritten = await this.writeFileViaSSH(filePath, processedContent, encoding);
      const prompt = alsoQuit ? await this.getPrompt() : null;

      ws.send(JSON.stringify({
        type: 'vim_save_result',
        data: {
          success: true,
          fileName: filePath.split('/').pop(),
          filePath,
          bytesWritten,
          message: `"${filePath.split('/').pop()}" ${bytesWritten}B written`,
          alsoQuit,
          prompt
        }
      }));

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'vim_save_result',
        data: {
          success: false,
          fileName: filePath.split('/').pop(),
          filePath,
          error: error.message,
          message: `E212: ${error.message}`,
          alsoQuit: false
        }
      }));
    }
  }

  async handleExitVim(ws, data) {
    try {
      const prompt = await this.getPrompt();
      ws.send(JSON.stringify({
        type: 'vim_exit_result',
        data: { success: true, message: 'Exited vim', prompt }
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'vim_exit_result',
        data: { success: false, error: error.message }
      }));
    }
  }

  writeFileViaSSH(filePath, content, encoding) {
    return new Promise((resolve, reject) => {
      const encodedContent = Buffer.from(content, encoding).toString('base64');
      const command = `echo "${encodedContent}" | base64 -d > "${filePath}"`;

      this.ssh.exec(command, (err, stream) => {
        if (err) return reject(err);
        let stderr = '';
        stream.on('close', (code) => {
          if (code !== 0) reject(new Error(stderr || 'Write failed'));
          else resolve(Buffer.byteLength(content, encoding));
        });
        stream.stderr.on('data', (data) => { stderr += data.toString(); });
      });
    });
  }

  createBackup(filePath) {
    return new Promise((resolve) => {
      this.ssh.exec(`cp "${filePath}" "${filePath}.bak" 2>/dev/null || true`, (err, stream) => {
        stream.on('close', () => resolve());
      });
    });
  }

  getPrompt() {
    return new Promise((resolve) => {
      this.ssh.exec('echo "$PS1"', (err, stream) => {
        let stdout = '';
        stream.on('data', (data) => { stdout += data.toString(); });
        stream.on('close', () => { resolve(stdout.trim() || '$ '); });
      });
    });
  }
}
```

## 6. 消息流程图

```
用户输入 :wq
    │
    ▼
┌─────────────────┐
│ FrontendVimEditor│
│ handleCommandMode│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ handleSaveCommand│
│ alsoQuit=true   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ WebSocket 发送:                                      │
│ {                                                    │
│   type: 'vim_command',                               │
│   data: {                                            │
│     action: 'save_with_content',                     │
│     content: '文件内容...',                           │
│     alsoQuit: true                                   │
│   }                                                  │
│ }                                                    │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
              ┌─────────────────┐
              │   后端服务器     │
              │ 1. 创建备份      │
              │ 2. 写入文件      │
              │ 3. 获取提示符    │
              └────────┬────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ WebSocket 响应:                                      │
│ {                                                    │
│   type: 'vim_save_result',                           │
│   data: {                                            │
│     success: true,                                   │
│     bytesWritten: 1234,                              │
│     alsoQuit: true,                                  │
│     prompt: 'user@host:~$ '                          │
│   }                                                  │
│ }                                                    │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
              ┌─────────────────┐
              │ SSHTerminal     │
              │ 1. 标记已保存    │
              │ 2. 退出VIM模式   │
              │ 3. 显示提示符    │
              └─────────────────┘
```

## 7. 错误处理

### 7.1 错误码列表

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| E212 | 无法打开文件写入 | 检查权限，使用 :w! 强制写入 |
| E37 | 文件已修改未保存 | 使用 :q! 强制退出或先保存 |
| E32 | 没有文件名 | 使用 :w filename 指定文件名 |
| E45 | 文件只读 | 使用 :w! 强制写入 |

### 7.2 前端错误处理

```typescript
public handleError(error: { code: string; message: string }): void {
  const errorMessages: Record<string, string> = {
    'E212': "Can't open file for writing",
    'E37': 'No write since last change (add ! to override)',
    'E32': 'No file name',
    'E45': "'readonly' option is set (add ! to override)"
  }
  
  const displayMessage = errorMessages[error.code] || error.message
  this.onTerminalWrite(`\r\n${error.code}: ${displayMessage}\r\n`)
}
```

## 8. 安全考虑

### 8.1 内容大小限制

```typescript
function validateContent(content: string): boolean {
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB
  return content.length <= MAX_SIZE
}
```

### 8.2 路径验证

```python
import os

def validate_path(file_path: str, allowed_base: str) -> bool:
    real_path = os.path.realpath(file_path)
    real_base = os.path.realpath(allowed_base)
    return real_path.startswith(real_base)
```

### 8.3 Base64 编码传输

使用 Base64 编码传输文件内容，避免特殊字符导致的命令注入问题。

## 9. 测试用例

```typescript
describe('FrontendVimEditor', () => {
  let editor: FrontendVimEditor
  let mockSendToServer: jest.Mock
  
  beforeEach(() => {
    mockSendToServer = jest.fn()
    editor = new FrontendVimEditor(jest.fn(), jest.fn(), jest.fn(), mockSendToServer, jest.fn())
    editor.setFileName('test.txt')
    editor.setCurrentPath('/home/user')
    editor.initContent('line 1\nline 2')
  })
  
  test(':w sends save_with_content with alsoQuit=false', () => {
    editor.handleInput(':'); editor.handleInput('w'); editor.handleInput('\r')
    expect(mockSendToServer).toHaveBeenCalledWith('vim_command', expect.objectContaining({
      action: 'save_with_content',
      alsoQuit: false
    }))
  })
  
  test(':wq sends save_with_content with alsoQuit=true', () => {
    editor.handleInput(':'); editor.handleInput('w'); editor.handleInput('q'); editor.handleInput('\r')
    expect(mockSendToServer).toHaveBeenCalledWith('vim_command', expect.objectContaining({
      action: 'save_with_content',
      alsoQuit: true
    }))
  })
  
  test(':q! sends exit_vim with forceQuit=true', () => {
    editor.handleInput(':'); editor.handleInput('q'); editor.handleInput('!'); editor.handleInput('\r')
    expect(mockSendToServer).toHaveBeenCalledWith('vim_command', expect.objectContaining({
      action: 'exit_vim',
      forceQuit: true
    }))
  })
})
```

## 10. 总结

本方案采用 **save_with_content** 模式，前端在用户执行保存命令时，将完整的文件内容发送给后端。这种方式的优点是：

1. **简单可靠**：前端完全掌控文件内容，不依赖后端的编辑状态同步
2. **易于实现**：后端只需要接收内容并写入文件
3. **支持离线编辑**：即使网络短暂中断，也不会丢失编辑内容
4. **便于调试**：可以清楚地看到发送的完整内容

关键实现要点：
- 前端维护 `fileContent` 数组跟踪文件内容
- 使用 `hasUnsavedChanges()` 检测是否有未保存的修改
- 保存时发送完整内容，后端使用 Base64 编码写入
- 后端返回保存结果，前端根据结果更新状态