/**
 * SSH终端 接收后端 currentPath 功能单元测试
 * 测试从各种消息类型中提取和更新 currentPath
 *
 * 测试覆盖的消息类型：
 * 1. connected - 初始路径 (initialPath / currentPath)
 * 2. output/data - 命令输出中的路径
 * 3. cd_result - cd 命令结果
 * 4. ls_output - ls 命令输出中的路径
 * 5. path_changed - 路径变更通知
 * 6. completed - 命令完成消息
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ==================== 模拟类定义 ====================

/**
 * 模拟WebSocket类
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

  simulateMessage(message) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(message) })
    }
  }

  getMessagesByType(type) {
    return this.sentMessages.filter(msg => msg.type === type)
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

  simulateInput(data) {
    this.dataHandlers.forEach(handler => handler(data))
  }

  focus() {}
  clear() {}
  dispose() {}
  loadAddon() {}
  open() {}
}

class MockFitAddon {
  fit() {}
}

global.WebSocket = MockWebSocket

// ==================== SSHTerminal 模拟类（包含新的路径接收方法） ====================

class SSHTerminal {
  constructor(terminalContainer, connectionConfig, onConnectionChange, onError, websocketDomains = []) {
    this.terminalContainer = terminalContainer
    this.connectionConfig = connectionConfig
    this.onConnectionChange = onConnectionChange
    this.onError = onError
    this.websocketDomains = websocketDomains.length > 0 ? websocketDomains : ['ws://localhost:8002/ws/ssh']
    this.currentDomainIndex = 0
    this.isConnecting = false
    this.currentWorkingDirectory = '~'
    this.ws = null
    this.terminal = null
    this.fitAddon = null
    this.inputBuffer = ''
  }

  /**
   * 从后端消息中安全地更新当前工作目录
   */
  updateCurrentPathFromServer(serverPath, source = 'unknown') {
    try {
      // 1. 类型检查 - 必须是字符串
      if (typeof serverPath !== 'string') {
        console.debug(`[PATH-UPDATE] ${source}: 忽略非字符串路径:`, typeof serverPath, serverPath)
        return false
      }

      // 2. 去除首尾空白
      const trimmedPath = serverPath.trim()

      // 3. 空字符串检查
      if (trimmedPath === '') {
        console.debug(`[PATH-UPDATE] ${source}: 忽略空字符串路径`)
        return false
      }

      // 4. 路径格式验证 - 必须以 / 或 ~ 开头
      if (!trimmedPath.startsWith('/') && !trimmedPath.startsWith('~')) {
        console.debug(`[PATH-UPDATE] ${source}: 忽略无效路径格式:`, trimmedPath)
        return false
      }

      // 5. 路径长度限制 (Linux PATH_MAX = 4096)
      if (trimmedPath.length > 4096) {
        console.debug(`[PATH-UPDATE] ${source}: 忽略过长路径:`, trimmedPath.length)
        return false
      }

      // 6. 检查是否与当前路径相同（避免不必要的更新）
      if (trimmedPath === this.currentWorkingDirectory) {
        console.debug(`[PATH-UPDATE] ${source}: 路径未变化:`, trimmedPath)
        return true
      }

      // 7. 更新路径
      const previousPath = this.currentWorkingDirectory
      this.currentWorkingDirectory = trimmedPath
      console.debug(`[PATH-UPDATE] ${source}: 路径更新 "${previousPath}" -> "${trimmedPath}"`)

      return true
    } catch (error) {
      console.warn(`[PATH-UPDATE] ${source}: 更新路径时出错:`, error)
      return false
    }
  }

  /**
   * 从消息数据对象中提取并更新 currentPath
   */
  extractAndUpdatePath(data, source = 'unknown') {
    if (!data || typeof data !== 'object') {
      return false
    }

    const pathFields = ['currentPath', 'newPath', 'path', 'initialPath']

    for (const field of pathFields) {
      if (data[field] !== undefined && data[field] !== null) {
        const result = this.updateCurrentPathFromServer(data[field], `${source}.${field}`)
        if (result) {
          return true
        }
      }
    }

    return false
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
              // 使用增强的路径更新方法
              if (message.data) {
                const pathUpdated = this.extractAndUpdatePath(message.data, 'connected')
                if (!pathUpdated) {
                  this.currentWorkingDirectory = '~'
                }
              } else {
                this.currentWorkingDirectory = '~'
              }
              this.onConnectionChange(true)
              this.isConnecting = false
              resolve()
              break

            case 'cd_result':
              if (message.data) {
                this.extractAndUpdatePath(message.data, 'cd_result')
              }
              break

            case 'path_changed':
              if (message.data) {
                this.extractAndUpdatePath(message.data, 'path_changed')
              }
              break

            case 'output':
            case 'data':
              if (message.data && typeof message.data === 'object') {
                this.extractAndUpdatePath(message.data, 'output')
              }
              break

            case 'ls_output':
              if (message.data) {
                this.extractAndUpdatePath(message.data, 'ls_output')
              }
              break

            case 'completed':
              if (message.data) {
                this.extractAndUpdatePath(message.data, 'completed')
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
    })
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

describe('SSH终端 接收后端 currentPath 测试', () => {
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

  // ==================== updateCurrentPathFromServer 方法测试 ====================
  describe('updateCurrentPathFromServer 方法测试', () => {
    it('应该正确更新有效的绝对路径', () => {
      const result = sshTerminal.updateCurrentPathFromServer('/home/user', 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/user')
    })

    it('应该正确更新波浪号路径', () => {
      const result = sshTerminal.updateCurrentPathFromServer('~', 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~')
    })

    it('应该正确更新波浪号子路径', () => {
      const result = sshTerminal.updateCurrentPathFromServer('~/Documents', 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~/Documents')
    })

    it('应该拒绝 null 值', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer(null, 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝 undefined 值', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer(undefined, 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝空字符串', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer('', 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝只有空白的字符串', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer('   ', 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝数字类型', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer(123, 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝对象类型', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer({ path: '/home' }, 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝数组类型', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer(['/home'], 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝不以 / 或 ~ 开头的路径', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const result = sshTerminal.updateCurrentPathFromServer('home/user', 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝过长的路径（超过4096字符）', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const longPath = '/' + 'a'.repeat(4096)
      const result = sshTerminal.updateCurrentPathFromServer(longPath, 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该接受正好4096字符的路径', () => {
      const exactPath = '/' + 'a'.repeat(4095)
      const result = sshTerminal.updateCurrentPathFromServer(exactPath, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(exactPath)
    })

    it('应该去除首尾空白', () => {
      const result = sshTerminal.updateCurrentPathFromServer('  /home/user  ', 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/user')
    })

    it('相同路径应返回 true 但不更新', () => {
      sshTerminal.setCurrentWorkingDirectory('/same/path')
      const result = sshTerminal.updateCurrentPathFromServer('/same/path', 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/same/path')
    })

    it('应该处理包含特殊字符的路径', () => {
      const specialPath = '/home/user/My Documents/test & demo'
      const result = sshTerminal.updateCurrentPathFromServer(specialPath, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(specialPath)
    })

    it('应该处理包含中文的路径', () => {
      const chinesePath = '/home/用户/文档'
      const result = sshTerminal.updateCurrentPathFromServer(chinesePath, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(chinesePath)
    })
  })

  // ==================== extractAndUpdatePath 方法测试 ====================
  describe('extractAndUpdatePath 方法测试', () => {
    it('应该优先使用 currentPath 字段', () => {
      const data = {
        currentPath: '/from/currentPath',
        newPath: '/from/newPath',
        initialPath: '/from/initialPath'
      }
      const result = sshTerminal.extractAndUpdatePath(data, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/from/currentPath')
    })

    it('应该在 currentPath 无效时使用 newPath', () => {
      const data = {
        currentPath: '',  // 无效
        newPath: '/from/newPath',
        initialPath: '/from/initialPath'
      }
      const result = sshTerminal.extractAndUpdatePath(data, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/from/newPath')
    })

    it('应该在 currentPath 和 newPath 都无效时使用 path', () => {
      const data = {
        currentPath: null,
        newPath: '',
        path: '/from/path',
        initialPath: '/from/initialPath'
      }
      const result = sshTerminal.extractAndUpdatePath(data, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/from/path')
    })

    it('应该在前三个都无效时使用 initialPath', () => {
      const data = {
        currentPath: null,
        newPath: undefined,
        path: '',
        initialPath: '/from/initialPath'
      }
      const result = sshTerminal.extractAndUpdatePath(data, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/from/initialPath')
    })

    it('应该在所有字段都无效时返回 false', () => {
      sshTerminal.setCurrentWorkingDirectory('/original')
      const data = {
        currentPath: null,
        newPath: '',
        path: 123,
        initialPath: 'invalid'
      }
      const result = sshTerminal.extractAndUpdatePath(data, 'test')
      expect(result).toBe(false)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/original')
    })

    it('应该拒绝 null data', () => {
      const result = sshTerminal.extractAndUpdatePath(null, 'test')
      expect(result).toBe(false)
    })

    it('应该拒绝 undefined data', () => {
      const result = sshTerminal.extractAndUpdatePath(undefined, 'test')
      expect(result).toBe(false)
    })

    it('应该拒绝非对象 data', () => {
      const result = sshTerminal.extractAndUpdatePath('string', 'test')
      expect(result).toBe(false)
    })

    it('应该处理只有一个有效字段的 data', () => {
      const data = { currentPath: '/only/one' }
      const result = sshTerminal.extractAndUpdatePath(data, 'test')
      expect(result).toBe(true)
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/only/one')
    })
  })

  // ==================== connected 消息测试 ====================
  describe('connected 消息测试', () => {
    it('应该从 connected 消息中提取 initialPath', async () => {
      const connectPromise = sshTerminal.connect()

      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)

      await connectPromise
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该从 connected 消息中提取 currentPath（优先于 initialPath）', async () => {
      const connectPromise = sshTerminal.connect()

      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: {
            currentPath: '/from/currentPath',
            initialPath: '/from/initialPath'
          }
        })
      }, 10)

      await connectPromise
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/from/currentPath')
    })

    it('应该在没有路径信息时使用默认值 ~', async () => {
      const connectPromise = sshTerminal.connect()

      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: {}
        })
      }, 10)

      await connectPromise
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~')
    })

    it('应该在没有 data 字段时使用默认值 ~', async () => {
      const connectPromise = sshTerminal.connect()

      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session'
        })
      }, 10)

      await connectPromise
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('~')
    })
  })

  // ==================== cd_result 消息测试 ====================
  describe('cd_result 消息测试', () => {
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

    it('应该从 cd_result 消息中更新路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/var/log' }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/var/log')
    })

    it('应该忽略无效的 cd_result 路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '' }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该处理连续的 cd_result 消息', () => {
      const paths = ['/var', '/etc', '/tmp', '/usr/local']
      paths.forEach(path => {
        sshTerminal.ws.simulateMessage({
          type: 'cd_result',
          data: { currentPath: path }
        })
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/usr/local')
    })
  })

  // ==================== path_changed 消息测试 ====================
  describe('path_changed 消息测试', () => {
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

    it('应该从 path_changed 消息中更新路径 (newPath)', () => {
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: '/new/path' }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/new/path')
    })

    it('应该从 path_changed 消息中更新路径 (currentPath)', () => {
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { currentPath: '/current/path' }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/current/path')
    })

    it('应该忽略无效的 path_changed 数据', () => {
      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: {}
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })
  })

  // ==================== output 消息测试 ====================
  describe('output 消息测试', () => {
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

    it('应该从 output 消息中提取 currentPath', () => {
      sshTerminal.ws.simulateMessage({
        type: 'output',
        data: {
          output: 'file1.txt  file2.txt\n',
          currentPath: '/var/www'
        }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/var/www')
    })

    it('应该在 output 消息没有 currentPath 时保持原路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'output',
        data: {
          output: 'file1.txt  file2.txt\n'
        }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该处理 data 类型消息', () => {
      sshTerminal.ws.simulateMessage({
        type: 'data',
        data: {
          output: 'some output',
          currentPath: '/from/data'
        }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/from/data')
    })
  })

  // ==================== ls_output 消息测试 ====================
  describe('ls_output 消息测试', () => {
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

    it('应该从 ls_output 消息中提取 currentPath', () => {
      sshTerminal.ws.simulateMessage({
        type: 'ls_output',
        data: {
          files: [{ name: 'file1.txt', type: 'file' }],
          layout: { columns: 1 },
          prompt: 'user@host:~$ ',
          currentPath: '/var/log'
        }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/var/log')
    })

    it('应该在 ls_output 没有 currentPath 时保持原路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'ls_output',
        data: {
          files: [],
          layout: { columns: 1 },
          prompt: 'user@host:~$ '
        }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })
  })

  // ==================== completed 消息测试 ====================
  describe('completed 消息测试', () => {
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

    it('应该从 completed 消息中提取 currentPath（如果有）', () => {
      sshTerminal.ws.simulateMessage({
        type: 'completed',
        exit_code: 0,
        data: { currentPath: '/after/command' }
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/after/command')
    })

    it('应该在 completed 没有 data 时保持原路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'completed',
        exit_code: 0
      })

      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
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

    it('应该处理根目录路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/')
    })

    it('应该处理带尾部斜杠的路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/home/user/' }
      })
      // 注意：此实现不会自动移除尾部斜杠
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/user/')
    })

    it('应该处理深层嵌套路径', () => {
      const deepPath = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p'
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: deepPath }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(deepPath)
    })

    it('应该处理带点的路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/home/user/.config' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/user/.config')
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

    it('应该拒绝超长路径', () => {
      const longPath = '/' + 'a'.repeat(5000)
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: longPath }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该处理恰好4096字符的路径', () => {
      const exactPath = '/' + 'a'.repeat(4095)
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: exactPath }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(exactPath)
    })

    it('应该处理单字符路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/')
    })
  })

  // ==================== 异常测试 ====================
  describe('异常测试', () => {
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

    it('应该处理 JSON 数组作为 data', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: ['/array/path']
      })
      // 数组不是有效对象，应该保持原路径
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该处理嵌套对象', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: {
          currentPath: {
            value: '/nested'
          }
        }
      })
      // currentPath 是对象而不是字符串，应该保持原路径
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该处理空对象 data', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: {}
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该处理布尔值 currentPath', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: true }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })

    it('应该处理函数作为 currentPath', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: () => '/function' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')
    })
  })

  // ==================== 多消息交互测试 ====================
  describe('多消息交互测试', () => {
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

    it('应该按消息顺序更新路径', () => {
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/home/testuser')

      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/var' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/var')

      sshTerminal.ws.simulateMessage({
        type: 'output',
        data: { output: 'some output', currentPath: '/etc' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/etc')

      sshTerminal.ws.simulateMessage({
        type: 'ls_output',
        data: { files: [], currentPath: '/tmp' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/tmp')

      sshTerminal.ws.simulateMessage({
        type: 'path_changed',
        data: { newPath: '/usr' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/usr')
    })

    it('无效消息不应影响路径', () => {
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/valid' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/valid')

      // 无效消息
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/valid')

      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: null }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/valid')

      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: {}
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/valid')

      // 有效消息应该能够继续更新
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/new' }
      })
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe('/new')
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

    it('应该能够快速处理大量路径更新', () => {
      const startTime = performance.now()
      const updateCount = 10000

      for (let i = 0; i < updateCount; i++) {
        sshTerminal.updateCurrentPathFromServer(`/path/${i}`, 'perf-test')
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(500) // 10000 次更新应该在 500ms 内完成
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(`/path/${updateCount - 1}`)
    })

    it('应该能够快速处理大量消息', () => {
      const startTime = performance.now()
      const messageCount = 1000

      for (let i = 0; i < messageCount; i++) {
        sshTerminal.ws.simulateMessage({
          type: 'cd_result',
          data: { currentPath: `/path/${i}` }
        })
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(200) // 1000 条消息应该在 200ms 内完成
      expect(sshTerminal.getCurrentWorkingDirectory()).toBe(`/path/${messageCount - 1}`)
    })
  })

  // ==================== 回归测试 ====================
  describe('回归测试', () => {
    it('路径更新不应影响其他状态', async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/home/testuser' }
        })
      }, 10)
      await connectPromise

      // 验证初始状态
      expect(sshTerminal.ws).toBeDefined()
      expect(sshTerminal.terminal).toBeDefined()
      expect(connectionChangeCallback).toHaveBeenCalledWith(true)

      // 更新路径
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/new/path' }
      })

      // 验证其他状态未受影响
      expect(sshTerminal.ws).toBeDefined()
      expect(sshTerminal.terminal).toBeDefined()
      expect(sshTerminal.ws.readyState).toBe(MockWebSocket.OPEN)
    })

    it('发送的消息仍应包含正确的 currentPath', async () => {
      const connectPromise = sshTerminal.connect()
      setTimeout(() => {
        sshTerminal.ws.simulateMessage({
          type: 'connected',
          session_id: 'test-session',
          data: { initialPath: '/initial' }
        })
      }, 10)
      await connectPromise

      // 更新路径
      sshTerminal.ws.simulateMessage({
        type: 'cd_result',
        data: { currentPath: '/updated' }
      })

      // 保存 ws 引用，因为 disconnect 会将其设为 null
      const ws = sshTerminal.ws

      // 发送断开连接消息
      sshTerminal.disconnect()

      // 检查最后发送的 disconnect 消息
      const disconnectMessages = ws.sentMessages.filter(m => m.type === 'disconnect')
      expect(disconnectMessages.length).toBeGreaterThan(0)
      expect(disconnectMessages[disconnectMessages.length - 1].data.currentPath).toBe('/updated')
    })
  })
})
