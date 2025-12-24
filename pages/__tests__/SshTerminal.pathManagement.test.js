/**
 * SSH终端路径管理功能单元测试
 * 测试路径状态跟踪、命令发送时的路径信息传递等功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// 模拟WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    this.sentMessages = []
    
    // 模拟连接成功
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) this.onopen()
    }, 10)
  }
  
  send(data) {
    this.sentMessages.push(JSON.parse(data))
  }
  
  close() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) this.onclose()
  }
  
  // 模拟接收消息
  simulateMessage(message) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(message) })
    }
  }
}

// 模拟Terminal
class MockTerminal {
  constructor() {
    this.cols = 80
    this.rows = 24
    this.writtenData = []
  }
  
  write(data) {
    this.writtenData.push(data)
  }
  
  focus() {}
  clear() {}
  dispose() {}
  loadAddon() {}
  open() {}
}

// 模拟FitAddon
class MockFitAddon {
  fit() {}
}

// 设置全局模拟
global.WebSocket = MockWebSocket
global.Terminal = MockTerminal
global.FitAddon = MockFitAddon

// 模拟SSHTerminal类（从SshTerminal.vue中提取）
class SSHTerminal {
  constructor(terminalContainer, connectionConfig, onConnectionChange, onError, websocketDomains = []) {
    this.terminalContainer = terminalContainer
    this.connectionConfig = connectionConfig
    this.onConnectionChange = onConnectionChange
    this.onError = onError
    this.websocketDomains = websocketDomains || ['ws://localhost:8002/ws/ssh']
    this.currentWorkingDirectory = '~'
    this.ws = null
    this.terminal = null
    this.inputBuffer = ''
    this.commandHistory = []
    this.historyIndex = -1
    this.currentInput = ''
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new MockWebSocket(this.websocketDomains[0])
      this.terminal = new MockTerminal()
      
      this.ws.onopen = () => {
        this.ws.send(JSON.stringify({
          type: 'connect',
          data: this.connectionConfig
        }))
      }
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        
        switch (message.type) {
          case 'connected':
            this.currentWorkingDirectory = message.data?.initialPath || '~'
            this.onConnectionChange(true)
            resolve()
            break
          case 'path_changed':
            if (message.data && message.data.newPath) {
              this.currentWorkingDirectory = message.data.newPath
            }
            break
          case 'error':
            this.onError(message.message)
            reject(new Error(message.message))
            break
        }
      }
    })
  }

  sendCommand(command) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'command',
        data: {
          command: command + '\n',
          currentPath: this.currentWorkingDirectory || '~'
        }
      }))
    }
  }

  sendTabCompletion(command) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'tab_complete',
        data: {
          command: command,
          currentPath: this.currentWorkingDirectory || '~'
        }
      }))
    }
  }

  getCurrentWorkingDirectory() {
    return this.currentWorkingDirectory
  }

  setCurrentWorkingDirectory(path) {
    this.currentWorkingDirectory = path
  }

  disconnect() {
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

  getTerminal() {
    return this.terminal
  }
}

describe('SSH终端路径管理功能测试', () => {
  let sshTerminal
  let mockContainer
  let mockConfig
  let connectionChangeCallback
  let errorCallback

  beforeEach(() => {
    // 创建模拟DOM容器
    mockContainer = document.createElement('div')
    
    // 创建模拟配置
    mockConfig = {
      hostname: 'test.example.com',
      port: 22,
      username: 'testuser',
      password: 'testpass'
    }
    
    // 创建回调函数
    connectionChangeCallback = vi.fn()
    errorCallback = vi.fn()
    
    // 创建SSH终端实例
    sshTerminal = new SSHTerminal(
      mockContainer,
      mockConfig,
      connectionChangeCallback,
      errorCallback,
      ['ws://localhost:8002/ws/ssh']
    )
  })

  afterEach(() => {
    if (sshTerminal) {
      sshTerminal.disconnect()
    }
  })

  describe('路径状态初始化', () => {
    it('应该初始化默认工作目录为~', () => {
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~')
    })

    it('应该在连接成功后设置初始路径', async () => {
      const connectPromise = sshTerminal.connect()
      
      // 模拟服务器返回连接成功消息
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 20)
      
      await connectPromise
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
      expect(connectionChangeCallback).toHaveBeenCalledWith(true)
    })

    it('应该在没有初始路径时保持默认路径', async () => {
      const connectPromise = sshTerminal.connect()
      
      // 模拟服务器返回连接成功消息（无初始路径）
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: {}
        })
      }, 20)
      
      await connectPromise
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~')
    })
  })

  describe('命令发送时的路径信息', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 20)
      
      await connectPromise
    })

    it('应该在发送命令时包含当前路径信息', () => {
      sshTerminal.sendCommand('ls -la')
      
      const sentMessages = sshTerminal.ws.sentMessages
      const commandMessage = sentMessages.find(msg => msg.type === 'command')
      
      expect(commandMessage).toBeDefined()
      expect(commandMessage.data.command).toBe('ls -la\n')
      expect(commandMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在TAB补全时包含当前路径信息', () => {
      sshTerminal.sendTabCompletion('cd /ho')
      
      const sentMessages = sshTerminal.ws.sentMessages
      const tabMessage = sentMessages.find(msg => msg.type === 'tab_complete')
      
      expect(tabMessage).toBeDefined()
      expect(tabMessage.data.command).toBe('cd /ho')
      expect(tabMessage.data.currentPath).toBe('/home/testuser')
    })

    it('应该在路径变更后发送正确的路径信息', () => {
      // 模拟路径变更
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: '/var/log' }
      })
      
      // 发送命令
      sshTerminal.sendCommand('pwd')
      
      const sentMessages = sshTerminal.ws.sentMessages
      const commandMessage = sentMessages.find(msg => msg.type === 'command' && msg.data.command === 'pwd\n')
      
      expect(commandMessage).toBeDefined()
      expect(commandMessage.data.currentPath).toBe('/var/log')
    })
  })

  describe('路径状态更新', () => {
    beforeEach(async () => {
      const connectPromise = sshTerminal.connect()
      
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 20)
      
      await connectPromise
    })

    it('应该正确处理path_changed消息', () => {
      const newPath = '/etc/nginx'
      
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: newPath }
      })
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(newPath)
    })

    it('应该忽略无效的path_changed消息', () => {
      const originalPath = sshTerminal.getCurrentWorkingDirectory()
      
      // 发送无效消息
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: {}
      })
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(originalPath)
      
      // 发送空路径
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: '' }
      })
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(originalPath)
    })

    it('应该支持手动设置工作目录', () => {
      const testPath = '/custom/path'
      
      sshTerminal.setCurrentWorkingDirectory(testPath)
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(testPath)
    })
  })

  describe('边界值和异常情况测试', () => {
    it('应该处理极长的路径名', async () => {
      const connectPromise = sshTerminal.connect()
      
      // 创建一个极长的路径（超过4096字符）
      const longPath = '/home/' + 'a'.repeat(4090) + '/test'
      
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: longPath }
        })
      }, 20)
      
      await connectPromise
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(longPath)
      
      // 测试发送命令时是否正常
      sshTerminal.sendCommand('ls')
      
      const sentMessages = sshTerminal.ws.sentMessages
      const commandMessage = sentMessages.find(msg => msg.type === 'command')
      
      expect(commandMessage.data.currentPath).toBe(longPath)
    })

    it('应该处理包含特殊字符的路径', async () => {
      const connectPromise = sshTerminal.connect()
      
      // 包含空格、中文、特殊符号的路径
      const specialPath = '/home/用户/My Documents/test & demo/[project]'
      
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: specialPath }
        })
      }, 20)
      
      await connectPromise
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(specialPath)
      
      sshTerminal.sendCommand('pwd')
      
      const sentMessages = sshTerminal.ws.sentMessages
      const commandMessage = sentMessages.find(msg => msg.type === 'command')
      
      expect(commandMessage.data.currentPath).toBe(specialPath)
    })

    it('应该处理null和undefined路径', () => {
      // 测试null路径
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: null }
      })
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~') // 应该保持原路径
      
      // 测试undefined路径
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: undefined }
      })
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~') // 应该保持原路径
    })

    it('应该在WebSocket断开时保持路径状态', () => {
      const testPath = '/test/path'
      sshTerminal.setCurrentWorkingDirectory(testPath)
      
      // 断开连接
      sshTerminal.ws.close()
      
      // 路径应该保持不变
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(testPath)
    })

    it('应该处理连续的路径变更消息', () => {
      const paths = ['/home', '/var', '/etc', '/tmp', '/usr/local']
      
      paths.forEach(path => {
        sshTerminal.ws.simulateMessage({
          type: 'path_changed',
          data: { newPath: path }
        })
      })
      
      // 应该是最后一个路径
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/usr/local')
    })

    it('应该在currentWorkingDirectory异常丢失时使用默认路径', () => {
      // 强制设置内部状态为 undefined (模拟极端异常状态)
      sshTerminal.currentWorkingDirectory = undefined
      
      sshTerminal.sendCommand('ls')
      
      const sentMessages = sshTerminal.ws.sentMessages
      const commandMessage = sentMessages.find(msg => msg.type === 'command')
      
      expect(commandMessage).toBeDefined()
      expect(commandMessage.data.currentPath).toBe('~')
      
      // 恢复状态以免影响其他测试
      sshTerminal.currentWorkingDirectory = '~'
    })
  })

  describe('兼容性测试', () => {
    it('应该在没有路径信息时正常发送命令', () => {
      // 创建一个没有路径管理的旧版本模拟
      const oldTerminal = new SSHTerminal(mockContainer, mockConfig, connectionChangeCallback, errorCallback)
      
      // 手动设置WebSocket
      oldTerminal.ws = new MockWebSocket('ws://test')
      oldTerminal.ws.readyState = WebSocket.OPEN
      
      // 发送命令
      oldTerminal.sendCommand('echo test')
      
      const sentMessages = oldTerminal.ws.sentMessages
      const commandMessage = sentMessages.find(msg => msg.type === 'command')
      
      expect(commandMessage).toBeDefined()
      expect(commandMessage.data.command).toBe('echo test\n')
      expect(commandMessage.data.currentPath).toBe('~') // 默认路径
    })

    it('应该向后兼容不支持路径管理的服务器', async () => {
      const connectPromise = sshTerminal.connect()
      
      // 模拟旧版本服务器响应（没有initialPath）
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session'
          // 没有data字段
        })
      }, 20)
      
      await connectPromise
      
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~')
      expect(connectionChangeCallback).toHaveBeenCalledWith(true)
    })
  })

  describe('性能测试', () => {
    it('应该高效处理大量路径变更', () => {
      const startTime = performance.now()
      
      // 模拟1000次路径变更
      for (let i = 0; i < 1000; i++) {
        sshTerminal.ws.simulateMessage({
          type: 'path_changed',
          data: { newPath: `/test/path/${i}` }
        })
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 应该在合理时间内完成（小于100ms）
      expect(duration).toBeLessThan(100)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/test/path/999')
    })

    it('应该高效处理大量命令发送', () => {
      const startTime = performance.now()
      
      // 模拟发送100个命令
      for (let i = 0; i < 100; i++) {
        sshTerminal.sendCommand(`echo ${i}`)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // 应该在合理时间内完成（小于50ms）
      expect(duration).toBeLessThan(50)
      
      const sentMessages = sshTerminal.ws.sentMessages
      const commandMessages = sentMessages.filter(msg => msg.type === 'command')
      
      expect(commandMessages).toHaveLength(100)
      // 每个命令都应该包含路径信息
      commandMessages.forEach(msg => {
        expect(msg.data.currentPath).toBeDefined()
      })
    })
  })
})