// 测试环境设置文件
import { vi } from 'vitest'

// 模拟浏览器环境
global.WebSocket = class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    this.sentMessages = []
    
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) this.onopen()
    }, 10)
  }
  
  send(data) {
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
}

// 模拟性能API
global.performance = {
  now: () => Date.now()
}

// 模拟DOM方法
global.document = {
  createElement: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}