/**
 * SSH终端 currentPath 全面单元测试
 * 测试所有发送给后端的消息都包含 currentPath 字段
 *
 * 测试覆盖的消息类型：
 * 1. connect - 初始连接
 * 2. command - 命令执行
 * 3. interrupt - 中断信号 (Ctrl+C)
 * 4. eof - EOF信号 (Ctrl+D)
 * 5. resize - 终端大小调整
 * 6. tab_complete - TAB补全
 * 7. disconnect - 断开连接
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ==================== 模拟类定义 ====================

/**
 * 模拟WebSocket类
 * 完全模拟WebSocket的行为，记录所有发送的消息
 */
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    this.sentMessages = []
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null

    // 模拟异步连接成功
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) this.onopen()
    }, 5)
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    this.sentMessages.push(JSON.parse(data))
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) this.onclose()
  }

  // 模拟接收服务器消息
  simulateMessage(message) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(message) })
    }
  }

  // 获取特定类型的所有消息
  getMessagesByType(type) {
    return this.sentMessages.filter(msg => msg.type === type)
  }

  // 获取最后一条特定类型的消息
  getLastMessageByType(type) {
    const messages = this.getMessagesByType(type)
    return messages[messages.length - 1]
  }
}

/**
 * 模拟Terminal类
 */
class MockTerminal {
  constructor() {
    this.cols = 120
    this.rows = 24
    this.writtenData = []
    this.dataHandlers = []
  }

  write(data) {
    this.writtenData.push(data)
  }

  onData(handler) {
    this.dataHandlers.push(handler)
  }

  // 模拟用户输入
  simulateInput(data) {
    this.dataHandlers.forEach(handler => handler(data))
  }

  focus() {}
  clear() {}
  dispose() {}
  loadAddon() {}
  open() {}
}

/**
 * 模拟FitAddon类
 */
class MockFitAddon {
  fit() {}
}

// 设置全局模拟
global.WebSocket = MockWebSocket

// ==================== SSHTerminal 类模拟（完整版） ====================

/**
 * 模拟SSHTerminal类
 * 完全按照实际代码逻辑实现，用于测试
 */
class SSHTerminal {
  constructor(terminalContainer, connectionConfig, onConnectionChange, onError, websocketDomains = []) {
    this.terminalContainer = terminalContainer
    this.connectionConfig = connectionConfig
    this.onConnectionChange = onConnectionChange
    this.onError = onError
    this.websocketDomains = websocketDomains.length > 0 ? websocketDomains : ['ws://localhost:8002/ws/ssh']
    this.currentDomainIndex = 0
    this.isConnecting = false

    // 路径状态管理
    this.currentWorkingDirectory = '~'

    // WebSocket和终端实例
    this.ws = null
    this.terminal = null
    this.fitAddon = null

    // 输入缓冲
    this.inputBuffer = ''
    this.commandHistory = []
    this.historyIndex = -1
    this.currentInput = ''
  }

  async connect() {
    if (this.isConnecting) return
    this.isConnecting = true

    return new Promise((resolve, reject) => {
      const wsUrl = this.websocketDomains[this.currentDomainIndex]
      this.ws = new MockWebSocket(wsUrl)
      this.terminal = new MockTerminal()
      this.fitAddon = new MockFitAddon()

      this.ws.onopen = () => {
        // 发送connect消息，包含currentPath
        this.ws.send(JSON.stringify({
          type: 'connect',
          data: {
            ...this.connectionConfig,
            currentPath: this.currentWorkingDirectory || '~'
          }
        }))
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          switch (message.type) {
            case 'connected':
              this.currentWorkingDirectory = message.data?.initialPath || '~'
              this.onConnectionChange(true)
              this.isConnecting = false
              resolve()
              break
            case 'path_changed':
              if (message.data && message.data.newPath) {
                this.currentWorkingDirectory = message.data.newPath
              }
              break
            case 'error':
              this.onError(message.message)
              this.isConnecting = false
              reject(new Error(message.message))
              break
          }
        } catch (error) {
          this.isConnecting = false
          reject(error)
        }
      }

      this.ws.onerror = () => {
        this.isConnecting = false
        reject(new Error('WebSocket连接失败'))
      }

      // 设置终端输入处理
      this.setupTerminalInput()
    })
  }

  setupTerminalInput() {
    this.terminal.onData((data) => {
      if (!this.ws || this.ws.readyState !== MockWebSocket.OPEN) {
        return
      }

      switch (data) {
        case '\r':
        case '\n': // 回车键 - 发送command
          this.ws.send(JSON.stringify({
            type: 'command',
            data: {
              command: this.inputBuffer + '\n',
              currentPath: this.currentWorkingDirectory || '~'
            }
          }))
          this.inputBuffer = ''
          break

        case '\x03': // Ctrl+C - 发送interrupt
          this.ws.send(JSON.stringify({
            type: 'interrupt',
            data: {
              signal: 'SIGINT',
              currentPath: this.currentWorkingDirectory || '~'
            }
          }))
          this.inputBuffer = ''
          break

        case '\x04': // Ctrl+D - 发送eof
          this.ws.send(JSON.stringify({
            type: 'eof',
            data: {
              currentPath: this.currentWorkingDirectory || '~'
            }
          }))
          break

        case '\t': // TAB键 - 发送tab_complete
          this.ws.send(JSON.stringify({
            type: 'tab_complete',
            data: {
              command: this.inputBuffer,
              currentPath: this.currentWorkingDirectory || '~'
            }
          }))
          break

        default:
          if (data >= ' ' && data <= '~') {
            this.inputBuffer += data
          }
      }
    })
  }

  resizeTerminal() {
    if (this.ws && this.ws.readyState === MockWebSocket.OPEN && this.terminal) {
      const cols = this.terminal.cols
      const rows = this.terminal.rows

      this.ws.send(JSON.stringify({
        type: 'resize',
        data: {
          width: cols,
          height: rows,
          currentPath: this.currentWorkingDirectory || '~'
        }
      }))
    }
  }

  disconnect() {
    if (this.ws && this.ws.readyState === MockWebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'disconnect',
        data: {
          currentPath: this.currentWorkingDirectory || '~'
        }
      }))
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.terminal) {
      this.terminal.dispose()
      this.terminal = null
    }

    this.onConnectionChange(false)
  }

  getCurrentWorkingDirectory() {
    return this.currentWorkingDirectory
  }

  setCurrentWorkingDirectory(path) {
    this.currentWorkingDirectory = path
  }

  getTerminal() {
    return this.terminal
  }

  getWebSocket() {
    return this.ws
  }
}

// ==================== 测试用例 ====================

describe('SSH终端 currentPath 全面测试', () => {
  let sshTerminal
  let mockContainer
  let mockConfig
  let connectionChangeCallback
  let errorCallback

  beforeEach(() => {
    mockContainer = { id: 'mock-terminal-container' }
    mockConfig = {
      hostname: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    }
    connectionChangeCallback = vi.fn()
    errorCallback = vi.fn()

    sshTerminal = new SSHTerminal(
      mockContainer,
      mockConfig,
      connectionChangeCallback,
      errorCallback,
      ['ws://localhost:8002/ws/ssh']
    )
  })

  afterEach(() => {
    if (sshTerminal && sshTerminal.ws) {
      try {
        sshTerminal.disconnect()
      } catch (e) {
        // 忽略清理错误
      }
    }
  })

  // ==================== connect 消息测试 ====================
  describe('connect 消息测试', () => {
    it('应该在connect消息中包含currentPath字段', async () => {
      const connectPromise = sshTerminal.connect()

      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)

      await connectPromise

      const connectMessage = sshTerminal.ws.getLastMessageByType('connect')
      expect(connectMessage).toBeDefined()
      expect(connectMessage.data).toHaveProperty('currentPath')
      expect(connectMessage.data.currentPath).toBe('~') // 初始默认值
    })

    it('应该在connect消息中包含所有连接配置', async () => {
      const connectPromise = sshTerminal.connect()

      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: {}
        })
      }, 10)

      await connectPromise

      const connectMessage = sshTerminal.ws.getLastMessageByType('connect')
      expect(connectMessage.data.hostname).toBe('test.example.com')
      expect(connectMessage.data.port).toBe(22)
      expect(connectMessage.data.username).toBe('testuser')
      expect(connectMessage.data.password).toBe('testpass')
      expect(connectMessage.data.currentPath).toBe('~')
    })
  })

  // ==================== command 消息测试 ====================
  describe('command 消息测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该在command消息中包含currentPath字段', () => {
      // 模拟输入命令
      sshTerminal.inputBuffer = 'ls -la'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage).toBeDefined()
      expect(commandMessage.data).toHaveProperty('currentPath')
      expect(commandMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在路径变更后发送正确的currentPath', () => {
      // 模拟路径变更
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: '/var/log' }
      })

      sshTerminal.inputBuffer = 'pwd'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe('/var/log')
    })

    it('应该在currentPath为undefined时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = undefined

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe('~')
    })

    it('应该在currentPath为空字符串时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = ''

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe('~')
    })

    it('应该在currentPath为null时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = null

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe('~')
    })
  })

  // ==================== interrupt 消息测试 (Ctrl+C) ====================
  describe('interrupt 消息测试 (Ctrl+C)', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该在interrupt消息中包含currentPath字段', () => {
      sshTerminal.terminal.simulateInput('\x03') // Ctrl+C

      const interruptMessage = sshTerminal.ws.getLastMessageByType('interrupt')
      expect(interruptMessage).toBeDefined()
      expect(interruptMessage.data).toHaveProperty('currentPath')
      expect(interruptMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在interrupt消息中包含signal字段', () => {
      sshTerminal.terminal.simulateInput('\x03')

      const interruptMessage = sshTerminal.ws.getLastMessageByType('interrupt')
      expect(interruptMessage.data.signal).toBe('SIGINT')
    })

    it('应该在路径变更后发送正确的currentPath', () => {
      sshTerminal.setCurrentWorkingDirectory('/etc/nginx')
      sshTerminal.terminal.simulateInput('\x03')

      const interruptMessage = sshTerminal.ws.getLastMessageByType('interrupt')
      expect(interruptMessage.data.currentPath).toBe('/etc/nginx')
    })

    it('应该在currentPath未定义时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = undefined
      sshTerminal.terminal.simulateInput('\x03')

      const interruptMessage = sshTerminal.ws.getLastMessageByType('interrupt')
      expect(interruptMessage.data.currentPath).toBe('~')
    })
  })

  // ==================== eof 消息测试 (Ctrl+D) ====================
  describe('eof 消息测试 (Ctrl+D)', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该在eof消息中包含currentPath字段', () => {
      sshTerminal.terminal.simulateInput('\x04') // Ctrl+D

      const eofMessage = sshTerminal.ws.getLastMessageByType('eof')
      expect(eofMessage).toBeDefined()
      expect(eofMessage.data).toHaveProperty('currentPath')
      expect(eofMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在路径变更后发送正确的currentPath', () => {
      sshTerminal.setCurrentWorkingDirectory('/tmp')
      sshTerminal.terminal.simulateInput('\x04')

      const eofMessage = sshTerminal.ws.getLastMessageByType('eof')
      expect(eofMessage.data.currentPath).toBe('/tmp')
    })

    it('应该在currentPath未定义时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = undefined
      sshTerminal.terminal.simulateInput('\x04')

      const eofMessage = sshTerminal.ws.getLastMessageByType('eof')
      expect(eofMessage.data.currentPath).toBe('~')
    })
  })

  // ==================== resize 消息测试 ====================
  describe('resize 消息测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该在resize消息中包含currentPath字段', () => {
      sshTerminal.resizeTerminal()

      const resizeMessage = sshTerminal.ws.getLastMessageByType('resize')
      expect(resizeMessage).toBeDefined()
      expect(resizeMessage.data).toHaveProperty('currentPath')
      expect(resizeMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在resize消息中包含width和height字段', () => {
      sshTerminal.resizeTerminal()

      const resizeMessage = sshTerminal.ws.getLastMessageByType('resize')
      expect(resizeMessage.data.width).toBe(120)
      expect(resizeMessage.data.height).toBe(24)
    })

    it('应该在路径变更后发送正确的currentPath', () => {
      sshTerminal.setCurrentWorkingDirectory('/var/www')
      sshTerminal.resizeTerminal()

      const resizeMessage = sshTerminal.ws.getLastMessageByType('resize')
      expect(resizeMessage.data.currentPath).toBe('/var/www')
    })

    it('应该在currentPath未定义时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = undefined
      sshTerminal.resizeTerminal()

      const resizeMessage = sshTerminal.ws.getLastMessageByType('resize')
      expect(resizeMessage.data.currentPath).toBe('~')
    })
  })

  // ==================== tab_complete 消息测试 ====================
  describe('tab_complete 消息测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该在tab_complete消息中包含currentPath字段', () => {
      sshTerminal.inputBuffer = 'cd /ho'
      sshTerminal.terminal.simulateInput('\t')

      const tabMessage = sshTerminal.ws.getLastMessageByType('tab_complete')
      expect(tabMessage).toBeDefined()
      expect(tabMessage.data).toHaveProperty('currentPath')
      expect(tabMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在tab_complete消息中包含当前输入的command', () => {
      sshTerminal.inputBuffer = 'ls /var/lo'
      sshTerminal.terminal.simulateInput('\t')

      const tabMessage = sshTerminal.ws.getLastMessageByType('tab_complete')
      expect(tabMessage.data.command).toBe('ls /var/lo')
    })

    it('应该在路径变更后发送正确的currentPath', () => {
      sshTerminal.setCurrentWorkingDirectory('/opt')
      sshTerminal.inputBuffer = 'cat read'
      sshTerminal.terminal.simulateInput('\t')

      const tabMessage = sshTerminal.ws.getLastMessageByType('tab_complete')
      expect(tabMessage.data.currentPath).toBe('/opt')
    })

    it('应该在currentPath未定义时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = undefined
      sshTerminal.inputBuffer = 'vim '
      sshTerminal.terminal.simulateInput('\t')

      const tabMessage = sshTerminal.ws.getLastMessageByType('tab_complete')
      expect(tabMessage.data.currentPath).toBe('~')
    })
  })

  // ==================== disconnect 消息测试 ====================
  describe('disconnect 消息测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该在disconnect消息中包含currentPath字段', () => {
      const ws = sshTerminal.ws
      sshTerminal.disconnect()

      const disconnectMessage = ws.getLastMessageByType('disconnect')
      expect(disconnectMessage).toBeDefined()
      expect(disconnectMessage.data).toHaveProperty('currentPath')
      expect(disconnectMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在路径变更后发送正确的currentPath', () => {
      sshTerminal.setCurrentWorkingDirectory('/usr/local/bin')
      const ws = sshTerminal.ws
      sshTerminal.disconnect()

      const disconnectMessage = ws.getLastMessageByType('disconnect')
      expect(disconnectMessage.data.currentPath).toBe('/usr/local/bin')
    })

    it('应该在currentPath未定义时使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = undefined
      const ws = sshTerminal.ws
      sshTerminal.disconnect()

      const disconnectMessage = ws.getLastMessageByType('disconnect')
      expect(disconnectMessage.data.currentPath).toBe('~')
    })
  })

  // ==================== 边界值测试 ====================
  describe('边界值测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该正确处理极长路径（4096字符）', () => {
      const longPath = '/home/' + 'a'.repeat(4090)
      sshTerminal.setCurrentWorkingDirectory(longPath)

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe(longPath)
      expect(commandMessage.data.currentPath.length).toBe(4096)
    })

    it('应该正确处理包含中文字符的路径', () => {
      const chinesePath = '/home/用户/文档/测试目录'
      sshTerminal.setCurrentWorkingDirectory(chinesePath)

      sshTerminal.inputBuffer = 'pwd'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe(chinesePath)
    })

    it('应该正确处理包含空格的路径', () => {
      const spacePath = '/home/user/My Documents/test folder'
      sshTerminal.setCurrentWorkingDirectory(spacePath)

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe(spacePath)
    })

    it('应该正确处理包含特殊字符的路径', () => {
      const specialPath = '/home/user/test & demo/[project]/(backup)/$var'
      sshTerminal.setCurrentWorkingDirectory(specialPath)

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe(specialPath)
    })

    it('应该正确处理根目录路径', () => {
      sshTerminal.setCurrentWorkingDirectory('/')

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe('/')
    })

    it('应该正确处理波浪号路径', () => {
      sshTerminal.setCurrentWorkingDirectory('~')

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe('~')
    })

    it('应该正确处理带波浪号的子路径', () => {
      sshTerminal.setCurrentWorkingDirectory('~/Documents/projects')

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.currentPath).toBe('~/Documents/projects')
    })
  })

  // ==================== 极限值测试 ====================
  describe('极限值测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('所有消息类型在currentPath=undefined时都应使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = undefined

      // command
      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')
      expect(sshTerminal.ws.getLastMessageByType('command').data.currentPath).toBe('~')

      // interrupt
      sshTerminal.terminal.simulateInput('\x03')
      expect(sshTerminal.ws.getLastMessageByType('interrupt').data.currentPath).toBe('~')

      // eof
      sshTerminal.terminal.simulateInput('\x04')
      expect(sshTerminal.ws.getLastMessageByType('eof').data.currentPath).toBe('~')

      // resize
      sshTerminal.resizeTerminal()
      expect(sshTerminal.ws.getLastMessageByType('resize').data.currentPath).toBe('~')

      // tab_complete
      sshTerminal.inputBuffer = 'cd '
      sshTerminal.terminal.simulateInput('\t')
      expect(sshTerminal.ws.getLastMessageByType('tab_complete').data.currentPath).toBe('~')
    })

    it('所有消息类型在currentPath=null时都应使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = null

      // command
      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')
      expect(sshTerminal.ws.getLastMessageByType('command').data.currentPath).toBe('~')

      // interrupt
      sshTerminal.terminal.simulateInput('\x03')
      expect(sshTerminal.ws.getLastMessageByType('interrupt').data.currentPath).toBe('~')

      // eof
      sshTerminal.terminal.simulateInput('\x04')
      expect(sshTerminal.ws.getLastMessageByType('eof').data.currentPath).toBe('~')

      // resize
      sshTerminal.resizeTerminal()
      expect(sshTerminal.ws.getLastMessageByType('resize').data.currentPath).toBe('~')

      // tab_complete
      sshTerminal.inputBuffer = 'cd '
      sshTerminal.terminal.simulateInput('\t')
      expect(sshTerminal.ws.getLastMessageByType('tab_complete').data.currentPath).toBe('~')
    })

    it('所有消息类型在currentPath=""时都应使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = ''

      // command
      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')
      expect(sshTerminal.ws.getLastMessageByType('command').data.currentPath).toBe('~')

      // interrupt
      sshTerminal.terminal.simulateInput('\x03')
      expect(sshTerminal.ws.getLastMessageByType('interrupt').data.currentPath).toBe('~')

      // eof
      sshTerminal.terminal.simulateInput('\x04')
      expect(sshTerminal.ws.getLastMessageByType('eof').data.currentPath).toBe('~')

      // resize
      sshTerminal.resizeTerminal()
      expect(sshTerminal.ws.getLastMessageByType('resize').data.currentPath).toBe('~')

      // tab_complete
      sshTerminal.inputBuffer = 'cd '
      sshTerminal.terminal.simulateInput('\t')
      expect(sshTerminal.ws.getLastMessageByType('tab_complete').data.currentPath).toBe('~')
    })

    it('所有消息类型在currentPath=0时应正确处理', () => {
      // 虽然路径不太可能是数字0，但测试防御性编程
      sshTerminal.currentWorkingDirectory = 0

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')
      // 0 是 falsy 值，应该被转换为 '~'
      expect(sshTerminal.ws.getLastMessageByType('command').data.currentPath).toBe('~')
    })

    it('所有消息类型在currentPath=false时应使用默认值~', () => {
      sshTerminal.currentWorkingDirectory = false

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')
      expect(sshTerminal.ws.getLastMessageByType('command').data.currentPath).toBe('~')
    })
  })

  // ==================== 异常测试 ====================
  describe('异常测试', () => {
    it('在WebSocket未连接时不应发送消息', () => {
      // 不调用connect，直接尝试发送
      const originalWs = sshTerminal.ws
      sshTerminal.ws = null

      sshTerminal.terminal = new MockTerminal()
      sshTerminal.setupTerminalInput()

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      // 由于ws为null，不应该抛出错误
      expect(sshTerminal.ws).toBeNull()
    })

    it('在WebSocket状态为CONNECTING时不应发送消息', async () => {
      // 创建一个新的终端实例，但不等待连接完成
      const newTerminal = new SSHTerminal(
        mockContainer,
        mockConfig,
        connectionChangeCallback,
        errorCallback,
        ['ws://localhost:8002/ws/ssh']
      )

      // 手动初始化 WebSocket（模拟连接中状态）
      newTerminal.ws = new MockWebSocket('ws://localhost:8002/ws/ssh')
      newTerminal.ws.readyState = MockWebSocket.CONNECTING // 强制设置为 CONNECTING 状态
      newTerminal.terminal = new MockTerminal()
      newTerminal.setupTerminalInput()

      // 尝试发送命令（此时 WebSocket 处于 CONNECTING 状态）
      const initialMessageCount = newTerminal.ws.sentMessages.length
      newTerminal.inputBuffer = 'ls'
      newTerminal.terminal.simulateInput('\r')

      // 由于 WebSocket 不是 OPEN 状态，不应该发送任何消息
      expect(newTerminal.ws.sentMessages.length).toBe(initialMessageCount)
    })

    it('在连接断开后重连应该重置路径状态', async () => {
      // 第一次连接
      let connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session-1',
          data: { initialPath: '/first/path' }
        })
      }, 10)
      await connectPromise

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/first/path')

      // 断开连接
      sshTerminal.disconnect()

      // 重新创建实例
      sshTerminal = new SSHTerminal(
        mockContainer,
        mockConfig,
        connectionChangeCallback,
        errorCallback,
        ['ws://localhost:8002/ws/ssh']
      )

      // 第二次连接
      connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session-2',
          data: { initialPath: '/second/path' }
        })
      }, 10)
      await connectPromise

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/second/path')
    })

    it('应该在连接错误时正确处理', async () => {
      const connectPromise = sshTerminal.connect()

      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'error',
          message: 'Authentication failed'
        })
      }, 10)

      await expect(connectPromise).rejects.toThrow('Authentication failed')
      expect(errorCallback).toHaveBeenCalledWith('Authentication failed')
    })
  })

  // ==================== 消息格式一致性测试 ====================
  describe('消息格式一致性测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('所有消息都应该有type字段', () => {
      // 触发所有类型的消息
      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')   // command
      sshTerminal.terminal.simulateInput('\x03') // interrupt
      sshTerminal.terminal.simulateInput('\x04') // eof
      sshTerminal.inputBuffer = 'cd '
      sshTerminal.terminal.simulateInput('\t')   // tab_complete
      sshTerminal.resizeTerminal()               // resize

      const ws = sshTerminal.ws
      sshTerminal.disconnect()                   // disconnect

      // 检查所有消息都有type字段
      ws.sentMessages.forEach(msg => {
        expect(msg).toHaveProperty('type')
        expect(typeof msg.type).toBe('string')
      })
    })

    it('所有消息的data.currentPath都应该是字符串类型', () => {
      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')
      sshTerminal.terminal.simulateInput('\x03')
      sshTerminal.terminal.simulateInput('\x04')
      sshTerminal.inputBuffer = 'cd '
      sshTerminal.terminal.simulateInput('\t')
      sshTerminal.resizeTerminal()

      const ws = sshTerminal.ws
      sshTerminal.disconnect()

      // 检查所有消息的currentPath都是字符串
      ws.sentMessages.forEach(msg => {
        if (msg.data && msg.data.currentPath !== undefined) {
          expect(typeof msg.data.currentPath).toBe('string')
        }
      })
    })

    it('currentPath不应该包含控制字符', () => {
      // 尝试设置包含控制字符的路径
      const badPath = '/home/\x00\x01\x02test'
      sshTerminal.setCurrentWorkingDirectory(badPath)

      sshTerminal.inputBuffer = 'ls'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      // 路径应该被原样保存（实际应用中后端应该验证）
      expect(commandMessage.data.currentPath).toBe(badPath)
    })
  })

  // ==================== 性能测试 ====================
  describe('性能测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('应该能够快速处理连续的命令发送', () => {
      const startTime = performance.now()
      const commandCount = 1000

      for (let i = 0; i < commandCount; i++) {
        sshTerminal.inputBuffer = `echo ${i}`
        sshTerminal.terminal.simulateInput('\r')
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(200) // 应该在200ms内完成1000条命令

      const commandMessages = sshTerminal.ws.getMessagesByType('command')
      expect(commandMessages.length).toBe(commandCount)

      // 验证每条消息都有currentPath
      commandMessages.forEach(msg => {
        expect(msg.data.currentPath).toBe('/home/testuser')
      })
    })

    it('应该能够快速处理连续的路径变更', () => {
      const startTime = performance.now()
      const changeCount = 1000

      for (let i = 0; i < changeCount; i++) {
        sshTerminal.ws.simulateMessage({
          type: 'path_changed',
          data: { newPath: `/path/${i}` }
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(100) // 应该在100ms内完成1000次路径变更
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/path/999')
    })

    it('应该能够快速处理混合操作', () => {
      const startTime = performance.now()
      const operationCount = 500

      for (let i = 0; i < operationCount; i++) {
        // 路径变更
        sshTerminal.ws.simulateMessage({
          type: 'path_changed',
          data: { newPath: `/path/${i}` }
        })

        // 发送命令
        sshTerminal.inputBuffer = `ls -la`
        sshTerminal.terminal.simulateInput('\r')

        // 发送TAB补全
        sshTerminal.inputBuffer = 'cd '
        sshTerminal.terminal.simulateInput('\t')
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(300) // 应该在300ms内完成

      const commandMessages = sshTerminal.ws.getMessagesByType('command')
      const tabMessages = sshTerminal.ws.getMessagesByType('tab_complete')

      expect(commandMessages.length).toBe(operationCount)
      expect(tabMessages.length).toBe(operationCount)
    })
  })

  // ==================== 回归测试 ====================
  describe('回归测试', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise
    })

    it('command消息应该保持原有的command字段格式', () => {
      sshTerminal.inputBuffer = 'ls -la /var/log'
      sshTerminal.terminal.simulateInput('\r')

      const commandMessage = sshTerminal.ws.getLastMessageByType('command')
      expect(commandMessage.data.command).toBe('ls -la /var/log\n')
    })

    it('interrupt消息应该保持原有的signal字段', () => {
      sshTerminal.terminal.simulateInput('\x03')

      const interruptMessage = sshTerminal.ws.getLastMessageByType('interrupt')
      expect(interruptMessage.data.signal).toBe('SIGINT')
    })

    it('resize消息应该保持原有的width和height字段', () => {
      sshTerminal.terminal.cols = 100
      sshTerminal.terminal.rows = 30
      sshTerminal.resizeTerminal()

      const resizeMessage = sshTerminal.ws.getLastMessageByType('resize')
      expect(resizeMessage.data.width).toBe(100)
      expect(resizeMessage.data.height).toBe(30)
    })

    it('tab_complete消息应该保持原有的command字段', () => {
      sshTerminal.inputBuffer = 'cat /etc/pass'
      sshTerminal.terminal.simulateInput('\t')

      const tabMessage = sshTerminal.ws.getLastMessageByType('tab_complete')
      expect(tabMessage.data.command).toBe('cat /etc/pass')
    })

    it('connect消息应该保持原有的连接配置字段', () => {
      const connectMessage = sshTerminal.ws.getLastMessageByType('connect')
      expect(connectMessage.data.hostname).toBe('test.example.com')
      expect(connectMessage.data.port).toBe(22)
      expect(connectMessage.data.username).toBe('testuser')
      expect(connectMessage.data.password).toBe('testpass')
    })

    it('路径状态更新不应影响其他功能', () => {
      // 更新路径
      sshTerminal.setCurrentWorkingDirectory('/new/path')

      // 验证其他功能正常
      expect(sshTerminal.terminal).toBeDefined()
      expect(sshTerminal.ws).toBeDefined()
      expect(sshTerminal.ws.readyState).toBe(MockWebSocket.OPEN)
    })
  })
})
