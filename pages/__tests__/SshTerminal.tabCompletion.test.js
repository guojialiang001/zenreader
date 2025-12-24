/**
 * SshTerminal TAB补全功能测试脚本
 * 用于验证 handleTabCompletionResponse 修复的正确性
 *
 * 运行方式: node pages/__tests__/SshTerminal.tabCompletion.test.js
 */

// 模拟 Terminal 类
class MockTerminal {
  constructor() {
    this.writeBuffer = []
    this.cols = 80
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
}

/**
 * 模拟 handleTabCompletionResponse 的核心逻辑
 * 与 SshTerminal.vue 中的实现保持一致
 */
function handleTabCompletionResponse(data, context) {
  let options = data.options || []
  const base = data.base || ''

  // 过滤逻辑
  if (!Array.isArray(options)) {
    return { inputBuffer: context.inputBuffer, terminalOutput: '' }
  }

  options = options.filter(option => {
    if (typeof option !== 'string') {
      return false
    }
    if (option.includes('Expanded Security Maintenance')) {
      return false
    }
    return true
  })

  if (options.length === 0) {
    return { inputBuffer: context.inputBuffer, terminalOutput: '' }
  }

  let newInputBuffer = context.inputBuffer

  if (options.length === 1) {
    // 单个补全选项
    const completion = options[0]
    if (context.inputBuffer.endsWith(base)) {
      const prefix = base.length > 0 ? context.inputBuffer.slice(0, -base.length) : context.inputBuffer
      newInputBuffer = prefix + completion
      context.replaceCurrentCommand(newInputBuffer)
    } else {
      newInputBuffer = completion
      context.replaceCurrentCommand(newInputBuffer)
    }
    return { inputBuffer: newInputBuffer, terminalOutput: '' }
  } else {
    // 多个补全选项
    if (context.terminal) {
      const savedInput = context.inputBuffer

      context.terminal.write('\r\n')
      context.terminal.write(options.join('  '))
      context.terminal.write('\r\n')
      context.terminal.write(savedInput)

      return { inputBuffer: context.inputBuffer, terminalOutput: context.terminal.getWrittenContent() }
    }
    return { inputBuffer: context.inputBuffer, terminalOutput: '' }
  }
}

// 测试框架
let passed = 0
let failed = 0
const tests = []

function test(name, fn) {
  tests.push({ name, fn })
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`)
      }
    },
    toContain(expected) {
      if (!actual.includes(expected)) {
        throw new Error(`Expected "${actual}" to contain "${expected}"`)
      }
    },
    not: {
      toContain(expected) {
        if (actual.includes(expected)) {
          throw new Error(`Expected "${actual}" not to contain "${expected}"`)
        }
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`)
      }
    }
  }
}

function runTests() {
  console.log('\n========================================')
  console.log('TAB补全功能测试')
  console.log('========================================\n')

  for (const { name, fn } of tests) {
    try {
      fn()
      console.log(`✅ ${name}`)
      passed++
    } catch (error) {
      console.log(`❌ ${name}`)
      console.log(`   错误: ${error.message}`)
      failed++
    }
  }

  console.log('\n----------------------------------------')
  console.log(`总计: ${passed + failed} 测试`)
  console.log(`通过: ${passed}`)
  console.log(`失败: ${failed}`)
  console.log('----------------------------------------\n')

  if (failed > 0) {
    process.exit(1)
  }
}

// ==================== 测试用例 ====================

// 用户报告的场景
test('用户报告场景: cd pr TAB 有两个选项', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const data = {
    options: ['proc', 'project'],
    base: 'pr',
    path_prefix: '/',
    debug_error: ''
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.terminalOutput).toContain('proc')
  expect(result.terminalOutput).toContain('project')
  expect(result.terminalOutput).toContain('cd pr')
})

// 单个选项 - 直接补全
test('单个选项: 应该直接补全', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const data = {
    options: ['project'],
    base: 'pr'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cd project')
  expect(replaceCommandCalls[0]).toBe('cd project')
})

// 空 options 数组
test('边界值: 空 options 数组不应有操作', () => {
  const mockTerminal = new MockTerminal()
  const data = {
    options: [],
    base: 'pr'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: () => {}
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cd pr')
  expect(result.terminalOutput).toBe('')
})

// options 为 null
test('异常: options 为 null 应安全处理', () => {
  const mockTerminal = new MockTerminal()
  const data = {
    options: null,
    base: 'pr'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: () => {}
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cd pr')
})

// options 不是数组
test('异常: options 不是数组应安全处理', () => {
  const mockTerminal = new MockTerminal()
  const data = {
    options: 'not an array',
    base: 'pr'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: () => {}
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cd pr')
})

// options 包含非字符串值
test('异常: 非字符串值应被过滤', () => {
  const mockTerminal = new MockTerminal()
  const data = {
    options: ['proc', 123, null, undefined, { name: 'obj' }, 'project'],
    base: 'pr'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: () => {}
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.terminalOutput).toContain('proc')
  expect(result.terminalOutput).toContain('project')
  expect(result.terminalOutput).not.toContain('123')
})

// Ubuntu ESM 提示应被过滤
test('过滤: Ubuntu ESM 提示应被过滤', () => {
  const mockTerminal = new MockTerminal()
  const data = {
    options: ['proc', 'Expanded Security Maintenance for Applications', 'project'],
    base: 'pr'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: () => {}
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.terminalOutput).toContain('proc')
  expect(result.terminalOutput).toContain('project')
  expect(result.terminalOutput).not.toContain('Expanded Security Maintenance')
})

// terminal 为 null
test('异常: terminal 为 null 多选项时不应崩溃', () => {
  const data = {
    options: ['proc', 'project'],
    base: 'pr'
  }
  const context = {
    terminal: null,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: () => {}
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cd pr')
  expect(result.terminalOutput).toBe('')
})

// base 不在输入末尾
test('边界值: base 不在输入末尾应直接使用 completion', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const data = {
    options: ['project'],
    base: 'xyz'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('project')
})

// 空 base
test('边界值: 空 base 应正确处理', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const data = {
    options: ['file.txt'],
    base: ''
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cat ',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cat file.txt')
})

// 空输入缓冲区
test('边界值: 空输入缓冲区应正常处理', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const data = {
    options: ['ls'],
    base: ''
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: '',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('ls')
})

// 特殊字符测试
test('特殊字符: 选项包含空格', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const data = {
    options: ['my file.txt'],
    base: 'my'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cat my',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cat my file.txt')
})

// 过滤后只剩一个选项
test('回归: 过滤后只剩一个选项应直接补全', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const data = {
    options: ['proc', 'Expanded Security Maintenance'],
    base: 'pr'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cd pr',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cd proc')
  expect(replaceCommandCalls[0]).toBe('cd proc')
})

// 长文件名
test('极限值: 非常长的文件名', () => {
  const mockTerminal = new MockTerminal()
  const replaceCommandCalls = []
  const longName = 'a'.repeat(1000)
  const data = {
    options: [longName],
    base: 'a'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'cat a',
    replaceCurrentCommand: (cmd) => replaceCommandCalls.push(cmd)
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.inputBuffer).toBe('cat ' + longName)
})

// 大量选项
test('极限值: 100个选项', () => {
  const mockTerminal = new MockTerminal()
  const options = Array.from({ length: 100 }, (_, i) => `file${i}.txt`)
  const data = {
    options,
    base: 'file'
  }
  const context = {
    terminal: mockTerminal,
    inputBuffer: 'ls file',
    replaceCurrentCommand: () => {}
  }

  const result = handleTabCompletionResponse(data, context)

  expect(result.terminalOutput).toContain('file0.txt')
  expect(result.terminalOutput).toContain('file99.txt')
})

// 运行所有测试
runTests()
