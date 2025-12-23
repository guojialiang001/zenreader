#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修改 SshTerminal.vue 中的 clear 命令处理逻辑
"""

# 读取文件
with open('pages/SshTerminal.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 原始片段 - 查找并替换
old_text = """          case '\\r':
          case '\\n': // 回车键
            console.debug('Enter key pressed, processing command')
            // 保存命令到历史记录（如果非空）
            if (this.inputBuffer.trim()) {
              // 避免重复命令
              if (this.commandHistory[this.commandHistory.length - 1] !== this.inputBuffer) {
                this.commandHistory.push(this.inputBuffer)
                // 限制历史记录长度
                if (this.commandHistory.length > 50) {
                  this.commandHistory.shift()
                }
              }
            }

            // 发送完整的命令行，包含当前工作目录信息
            console.debug('Sending command to server:', this.inputBuffer)
            this.ws.send(JSON.stringify({
              type: 'command',
              data: {
                command: this.inputBuffer + '\\n',
                // 确保总是发送当前路径，如果未定义则默认为~
                currentPath: this.currentWorkingDirectory || '~'
              }
            }))
            console.debug('Command sent to server with current path:', this.currentWorkingDirectory)

            // 重置状态
            this.inputBuffer = ''
            this.historyIndex = -1
            this.currentInput = ''

            this.terminal.write('\\r\\n')
            break"""

new_text = """          case '\\r':
          case '\\n': // 回车键
            const commandTrimmed = this.inputBuffer.trim()
            console.debug('Enter key pressed, processing command:', commandTrimmed)

            // 检测 'clear' 命令 - 本地处理，保留CWD和所有环境信息
            if (commandTrimmed === 'clear') {
              console.debug('Clear command detected, handling locally')
              this.terminal.clear()
              this.terminal.write('\\x1b[1;32mSSH连接工具 v3.0\\x1b[0m\\r\\n')
              this.terminal.write('输入 \\x1b[33mhelp\\x1b[0m 查看可用命令\\r\\n')
              const prompt = `\\x1b[32m${this.connectionConfig.username}@${this.connectionConfig.hostname}\\x1b[0m:\\x1b[34m${this.currentWorkingDirectory}\\x1b[0m$ `
              this.terminal.write(prompt)
              this.inputBuffer = ''
              this.historyIndex = -1
              this.currentInput = ''
              break
            }

            // 保存命令到历史记录（如果非空）
            if (commandTrimmed) {
              // 避免重复命令
              if (this.commandHistory[this.commandHistory.length - 1] !== this.inputBuffer) {
                this.commandHistory.push(this.inputBuffer)
                // 限制历史记录长度
                if (this.commandHistory.length > 50) {
                  this.commandHistory.shift()
                }
              }
            }

            // 发送完整的命令行，包含当前工作目录信息
            console.debug('Sending command to server:', this.inputBuffer)
            this.ws.send(JSON.stringify({
              type: 'command',
              data: {
                command: this.inputBuffer + '\\n',
                // 确保总是发送当前路径，如果未定义则默认为~
                currentPath: this.currentWorkingDirectory || '~'
              }
            }))
            console.debug('Command sent to server with current path:', this.currentWorkingDirectory)

            // 重置状态
            this.inputBuffer = ''
            this.historyIndex = -1
            this.currentInput = ''

            this.terminal.write('\\r\\n')
            break"""

if old_text in content:
    content = content.replace(old_text, new_text)
    with open('pages/SshTerminal.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ 成功修改 clear 命令处理逻辑")
else:
    print("✗ 未找到目标文本")
    # 检查是否存在
    if "case '\\r':" in content:
        print("  找到 case '\\r': 但内容不完全匹配")
        print("  请手动检查文件")
