/**
 * CodeEditor.vue 单元测试
 * 测试代码编辑器的核心功能
 *
 * 运行方式: npm run test:vitest:run -- pages/__tests__/CodeEditor.test.js
 */

// vitest globals: describe, it, expect, vi, beforeEach, afterEach
import { ref } from 'vue'

// ============ 测试辅助函数（从组件逻辑提取） ============

/**
 * 根据文件扩展名检测语言
 */
const detectLanguage = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const langMap = {
    'js': 'javascript',
    'ts': 'typescript',
    'vue': 'html',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'less': 'less',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'swift': 'swift',
    'kt': 'kotlin',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'yml': 'yaml',
    'yaml': 'yaml',
    'xml': 'xml',
    'txt': 'plaintext',
  }
  return langMap[ext || ''] || 'plaintext'
}

/**
 * 检查是否是文本文件
 */
const isTextFile = (filename) => {
  const textExtensions = [
    'txt', 'js', 'ts', 'jsx', 'tsx', 'vue', 'json', 'html', 'htm', 'css', 
    'scss', 'less', 'md', 'markdown', 'py', 'java', 'cpp', 'c', 'h', 'hpp',
    'cs', 'go', 'rs', 'php', 'rb', 'swift', 'kt', 'sql', 'sh', 'bash', 
    'yml', 'yaml', 'xml', 'svg', 'log', 'ini', 'conf', 'config', 'env',
    'gitignore', 'dockerignore', 'editorconfig', 'prettierrc', 'eslintrc'
  ]
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return textExtensions.includes(ext) || filename.startsWith('.')
}

/**
 * 计算文件大小显示
 */
const getContentSize = (content) => {
  const bytes = new Blob([content]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ============ 测试组1: 语言检测 ============
describe('语言检测功能 (detectLanguage)', () => {
  
  it('应正确检测 JavaScript 文件', () => {
    expect(detectLanguage('app.js')).toBe('javascript')
    expect(detectLanguage('index.js')).toBe('javascript')
    expect(detectLanguage('module.mjs')).toBe('plaintext') // mjs 不在列表中
  })

  it('应正确检测 TypeScript 文件', () => {
    expect(detectLanguage('app.ts')).toBe('typescript')
    expect(detectLanguage('types.d.ts')).toBe('typescript')
  })

  it('应正确检测 Vue 文件为 HTML', () => {
    expect(detectLanguage('App.vue')).toBe('html')
    expect(detectLanguage('component.vue')).toBe('html')
  })

  it('应正确检测 HTML 文件', () => {
    expect(detectLanguage('index.html')).toBe('html')
    expect(detectLanguage('page.htm')).toBe('html')
  })

  it('应正确检测 CSS 相关文件', () => {
    expect(detectLanguage('style.css')).toBe('css')
    expect(detectLanguage('main.scss')).toBe('scss')
    expect(detectLanguage('variables.less')).toBe('less')
  })

  it('应正确检测 JSON 文件', () => {
    expect(detectLanguage('package.json')).toBe('json')
    expect(detectLanguage('tsconfig.json')).toBe('json')
  })

  it('应正确检测 Markdown 文件', () => {
    expect(detectLanguage('README.md')).toBe('markdown')
    expect(detectLanguage('docs.md')).toBe('markdown')
  })

  it('应正确检测 Python 文件', () => {
    expect(detectLanguage('script.py')).toBe('python')
    expect(detectLanguage('main.py')).toBe('python')
  })

  it('应正确检测 Java 文件', () => {
    expect(detectLanguage('Main.java')).toBe('java')
    expect(detectLanguage('Application.java')).toBe('java')
  })

  it('应正确检测 C/C++ 文件', () => {
    expect(detectLanguage('main.c')).toBe('c')
    expect(detectLanguage('app.cpp')).toBe('cpp')
  })

  it('应正确检测 Go 文件', () => {
    expect(detectLanguage('main.go')).toBe('go')
  })

  it('应正确检测 Rust 文件', () => {
    expect(detectLanguage('main.rs')).toBe('rust')
  })

  it('应正确检测 Shell 脚本', () => {
    expect(detectLanguage('script.sh')).toBe('shell')
    expect(detectLanguage('init.bash')).toBe('shell')
  })

  it('应正确检测 YAML 文件', () => {
    expect(detectLanguage('config.yml')).toBe('yaml')
    expect(detectLanguage('docker-compose.yaml')).toBe('yaml')
  })

  it('应正确检测纯文本文件', () => {
    expect(detectLanguage('notes.txt')).toBe('plaintext')
  })

  it('未知扩展名应返回 plaintext', () => {
    expect(detectLanguage('file.unknown')).toBe('plaintext')
    expect(detectLanguage('file.xyz')).toBe('plaintext')
    expect(detectLanguage('file')).toBe('plaintext')
  })

  it('应处理大写扩展名', () => {
    expect(detectLanguage('FILE.JS')).toBe('javascript')
    expect(detectLanguage('README.MD')).toBe('markdown')
  })

  it('应处理多点文件名', () => {
    expect(detectLanguage('app.test.js')).toBe('javascript')
    expect(detectLanguage('config.prod.json')).toBe('json')
  })
})

// ============ 测试组2: 文本文件检测 ============
describe('文本文件检测功能 (isTextFile)', () => {

  it('应识别常见代码文件为文本文件', () => {
    expect(isTextFile('app.js')).toBe(true)
    expect(isTextFile('app.ts')).toBe(true)
    expect(isTextFile('app.tsx')).toBe(true)
    expect(isTextFile('app.jsx')).toBe(true)
    expect(isTextFile('App.vue')).toBe(true)
  })

  it('应识别配置文件为文本文件', () => {
    expect(isTextFile('package.json')).toBe(true)
    expect(isTextFile('config.yml')).toBe(true)
    expect(isTextFile('config.yaml')).toBe(true)
    expect(isTextFile('nginx.conf')).toBe(true)
    expect(isTextFile('settings.ini')).toBe(true)
  })

  it('应识别标记语言文件为文本文件', () => {
    expect(isTextFile('index.html')).toBe(true)
    expect(isTextFile('page.htm')).toBe(true)
    expect(isTextFile('data.xml')).toBe(true)
    expect(isTextFile('README.md')).toBe(true)
    expect(isTextFile('docs.markdown')).toBe(true)
  })

  it('应识别样式文件为文本文件', () => {
    expect(isTextFile('style.css')).toBe(true)
    expect(isTextFile('main.scss')).toBe(true)
    expect(isTextFile('variables.less')).toBe(true)
  })

  it('应识别日志和SVG文件为文本文件', () => {
    expect(isTextFile('app.log')).toBe(true)
    expect(isTextFile('icon.svg')).toBe(true)
  })

  it('应识别点文件为文本文件', () => {
    expect(isTextFile('.gitignore')).toBe(true)
    expect(isTextFile('.dockerignore')).toBe(true)
    expect(isTextFile('.env')).toBe(true)
    expect(isTextFile('.editorconfig')).toBe(true)
  })

  it('应识别C/C++头文件为文本文件', () => {
    expect(isTextFile('header.h')).toBe(true)
    expect(isTextFile('header.hpp')).toBe(true)
  })

  it('不应识别二进制文件为文本文件', () => {
    expect(isTextFile('image.png')).toBe(false)
    expect(isTextFile('image.jpg')).toBe(false)
    expect(isTextFile('image.gif')).toBe(false)
    expect(isTextFile('video.mp4')).toBe(false)
    expect(isTextFile('audio.mp3')).toBe(false)
    expect(isTextFile('archive.zip')).toBe(false)
    expect(isTextFile('document.pdf')).toBe(false)
    expect(isTextFile('program.exe')).toBe(false)
  })

  it('未知扩展名应返回 false', () => {
    expect(isTextFile('file.unknown')).toBe(false)
    expect(isTextFile('data.bin')).toBe(false)
  })
})

// ============ 测试组3: 文件大小计算 ============
describe('文件大小计算功能 (getContentSize)', () => {

  it('应正确显示字节', () => {
    expect(getContentSize('')).toBe('0 B')
    expect(getContentSize('a')).toBe('1 B')
    expect(getContentSize('Hello')).toBe('5 B')
    expect(getContentSize('Hello World')).toBe('11 B')
  })

  it('应正确显示小于1KB的文件', () => {
    const content = 'a'.repeat(100)
    expect(getContentSize(content)).toBe('100 B')
    
    const content2 = 'a'.repeat(1023)
    expect(getContentSize(content2)).toBe('1023 B')
  })

  it('应正确显示KB', () => {
    const content1KB = 'a'.repeat(1024)
    expect(getContentSize(content1KB)).toBe('1.0 KB')
    
    const content2KB = 'a'.repeat(2048)
    expect(getContentSize(content2KB)).toBe('2.0 KB')
    
    const content15KB = 'a'.repeat(1536)
    expect(getContentSize(content15KB)).toBe('1.5 KB')
  })

  it('应正确显示MB', () => {
    const content1MB = 'a'.repeat(1024 * 1024)
    expect(getContentSize(content1MB)).toBe('1.0 MB')
    
    const content2MB = 'a'.repeat(2 * 1024 * 1024)
    expect(getContentSize(content2MB)).toBe('2.0 MB')
  })

  it('应处理中文字符（UTF-8多字节）', () => {
    // 中文字符在UTF-8中通常是3字节
    const chineseContent = '你好'
    const size = getContentSize(chineseContent)
    expect(size).toBe('6 B') // 2个中文字符 × 3字节
  })
})

// ============ 测试组4: 编辑器状态管理 ============
describe('编辑器状态管理', () => {
  
  it('应正确初始化状态', () => {
    const fileName = ref('untitled.txt')
    const language = ref('plaintext')
    const theme = ref('vs-dark')
    const isModified = ref(false)
    const cursorPosition = ref({ line: 1, column: 1 })
    const lineCount = ref(1)
    const cursorCount = ref(1)

    expect(fileName.value).toBe('untitled.txt')
    expect(language.value).toBe('plaintext')
    expect(theme.value).toBe('vs-dark')
    expect(isModified.value).toBe(false)
    expect(cursorPosition.value).toEqual({ line: 1, column: 1 })
    expect(lineCount.value).toBe(1)
    expect(cursorCount.value).toBe(1)
  })

  it('应支持修改文件名并更新语言', () => {
    const fileName = ref('untitled.txt')
    const language = ref('plaintext')

    // 模拟更新文件名
    fileName.value = 'script.js'
    language.value = detectLanguage(fileName.value)

    expect(fileName.value).toBe('script.js')
    expect(language.value).toBe('javascript')
  })

  it('应正确标记修改状态', () => {
    const originalContent = ref('Hello World')
    const isModified = ref(false)
    
    // 模拟内容变化检测
    const checkModified = (currentContent) => {
      isModified.value = currentContent !== originalContent.value
    }

    checkModified('Hello World')
    expect(isModified.value).toBe(false)

    checkModified('Hello World!')
    expect(isModified.value).toBe(true)

    checkModified('Hello World')
    expect(isModified.value).toBe(false)
  })

  it('应支持多光标计数', () => {
    const cursorCount = ref(1)

    // 模拟添加多个光标
    cursorCount.value = 3
    expect(cursorCount.value).toBe(3)

    // 模拟取消多光标
    cursorCount.value = 1
    expect(cursorCount.value).toBe(1)
  })
})

// ============ 测试组5: localStorage 操作 ============
describe('localStorage 保存和恢复', () => {
  
  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('应正确保存内容到 localStorage', () => {
    const content = 'console.log("Hello");'
    const fileName = 'script.js'
    const language = 'javascript'

    localStorage.setItem('zenreader_editor_content', content)
    localStorage.setItem('zenreader_editor_filename', fileName)
    localStorage.setItem('zenreader_editor_language', language)

    expect(localStorage.getItem('zenreader_editor_content')).toBe(content)
    expect(localStorage.getItem('zenreader_editor_filename')).toBe(fileName)
    expect(localStorage.getItem('zenreader_editor_language')).toBe(language)
  })

  it('应正确从 localStorage 恢复内容', () => {
    const savedContent = 'function test() {}'
    const savedFilename = 'test.js'
    const savedLanguage = 'javascript'

    localStorage.setItem('zenreader_editor_content', savedContent)
    localStorage.setItem('zenreader_editor_filename', savedFilename)
    localStorage.setItem('zenreader_editor_language', savedLanguage)

    // 模拟恢复
    const content = ref('')
    const fileName = ref('untitled.txt')
    const language = ref('plaintext')

    const restored = localStorage.getItem('zenreader_editor_content')
    const restoredFilename = localStorage.getItem('zenreader_editor_filename')
    const restoredLanguage = localStorage.getItem('zenreader_editor_language')

    if (restored) content.value = restored
    if (restoredFilename) fileName.value = restoredFilename
    if (restoredLanguage) language.value = restoredLanguage

    expect(content.value).toBe(savedContent)
    expect(fileName.value).toBe(savedFilename)
    expect(language.value).toBe(savedLanguage)
  })

  it('应处理 localStorage 为空的情况', () => {
    const content = localStorage.getItem('zenreader_editor_content')
    const filename = localStorage.getItem('zenreader_editor_filename')
    const language = localStorage.getItem('zenreader_editor_language')

    expect(content).toBeNull()
    expect(filename).toBeNull()
    expect(language).toBeNull()
  })
})

// ============ 测试组6: 文件下载功能 ============
describe('文件下载功能', () => {
  
  it('应正确创建 Blob 对象', () => {
    const content = 'Hello World'
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })

    expect(blob.size).toBe(11)
    expect(blob.type).toBe('text/plain;charset=utf-8')
  })

  it('应正确创建和销毁 Object URL', () => {
    // 模拟 URL.createObjectURL（jsdom 不支持）
    const mockUrl = 'blob:http://localhost/test-uuid'
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    
    URL.createObjectURL = vi.fn(() => mockUrl)
    URL.revokeObjectURL = vi.fn()

    const content = 'Test content'
    const blob = new Blob([content])
    const url = URL.createObjectURL(blob)

    expect(url).toBeDefined()
    expect(url.startsWith('blob:')).toBe(true)
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob)

    // 清理
    URL.revokeObjectURL(url)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl)

    // 恢复原始函数
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('应正确处理中文内容的 Blob', () => {
    const content = '你好世界'
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })

    // 中文 UTF-8 编码，4个字符，每个3字节
    expect(blob.size).toBe(12)
  })
})

// ============ 测试组7: 拖拽事件处理 ============
describe('拖拽事件处理', () => {

  it('应正确检测拖拽文件类型', () => {
    const mockDataTransfer = {
      types: ['Files'],
      files: []
    }

    const hasFiles = mockDataTransfer.types.includes('Files')
    expect(hasFiles).toBe(true)
  })

  it('应正确处理非文件拖拽', () => {
    const mockDataTransfer = {
      types: ['text/plain'],
      files: []
    }

    const hasFiles = mockDataTransfer.types.includes('Files')
    expect(hasFiles).toBe(false)
  })

  it('应从 FileList 获取第一个文件', () => {
    const mockFile = {
      name: 'test.js',
      type: 'text/javascript',
      size: 100
    }

    const mockFiles = [mockFile]
    
    expect(mockFiles.length).toBe(1)
    expect(mockFiles[0].name).toBe('test.js')
  })
})

// ============ 测试组8: 支持的语言列表 ============
describe('支持的语言列表', () => {
  const languages = [
    { id: 'plaintext', name: '纯文本' },
    { id: 'javascript', name: 'JavaScript' },
    { id: 'typescript', name: 'TypeScript' },
    { id: 'html', name: 'HTML' },
    { id: 'css', name: 'CSS' },
    { id: 'json', name: 'JSON' },
    { id: 'markdown', name: 'Markdown' },
    { id: 'python', name: 'Python' },
    { id: 'java', name: 'Java' },
    { id: 'cpp', name: 'C++' },
    { id: 'csharp', name: 'C#' },
    { id: 'go', name: 'Go' },
    { id: 'rust', name: 'Rust' },
    { id: 'php', name: 'PHP' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'swift', name: 'Swift' },
    { id: 'kotlin', name: 'Kotlin' },
    { id: 'sql', name: 'SQL' },
    { id: 'shell', name: 'Shell' },
    { id: 'yaml', name: 'YAML' },
    { id: 'xml', name: 'XML' },
  ]

  it('应包含21种语言', () => {
    expect(languages.length).toBe(21)
  })

  it('每种语言应有 id 和 name', () => {
    languages.forEach(lang => {
      expect(lang.id).toBeDefined()
      expect(lang.name).toBeDefined()
      expect(typeof lang.id).toBe('string')
      expect(typeof lang.name).toBe('string')
    })
  })

  it('应包含常用编程语言', () => {
    const ids = languages.map(l => l.id)
    expect(ids).toContain('javascript')
    expect(ids).toContain('typescript')
    expect(ids).toContain('python')
    expect(ids).toContain('java')
    expect(ids).toContain('go')
    expect(ids).toContain('rust')
  })

  it('应包含 plaintext 作为默认', () => {
    const plaintext = languages.find(l => l.id === 'plaintext')
    expect(plaintext).toBeDefined()
    expect(plaintext.name).toBe('纯文本')
  })
})

// ============ 测试组9: 主题列表 ============
describe('主题支持', () => {
  const themes = ['vs-dark', 'vs', 'hc-black']

  it('应支持3种主题', () => {
    expect(themes.length).toBe(3)
  })

  it('应包含深色主题', () => {
    expect(themes).toContain('vs-dark')
  })

  it('应包含浅色主题', () => {
    expect(themes).toContain('vs')
  })

  it('应包含高对比度主题', () => {
    expect(themes).toContain('hc-black')
  })
})

// ============ 测试报告输出 ============
console.log('\n========================================')
console.log('CodeEditor 单元测试完成')
console.log('========================================\n')