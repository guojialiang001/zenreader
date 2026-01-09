<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Send, Trash2, RefreshCw, Wifi, WifiOff, Loader2, CheckCircle, XCircle, Lock, Eye, EyeOff, Monitor, Clock, SkipForward, ChevronRight, ChevronDown, File, Folder, ExternalLink, ListTodo, FolderTree, Wrench, FileText, Download, Archive, Tv, Maximize2, Minimize2 } from 'lucide-vue-next'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-light.css'

// Markdown
const languageNames: Record<string, string> = { js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java', go: 'Go', bash: 'Bash', json: 'JSON', html: 'HTML', css: 'CSS', vue: 'Vue' }
let codeBlockIdCounter = 0
const generateCodeBlockId = () => `cb-${Date.now()}-${++codeBlockIdCounter}`
const renderer = new marked.Renderer()
renderer.code = function(code: string | { text: string; lang?: string }, lang?: string): string {
  let codeText: string, language: string | undefined
  if (typeof code === 'object') { codeText = code.text || ''; language = code.lang } else { codeText = code as string; language = lang }
  const displayLang = language ? (languageNames[language.toLowerCase()] || language.toUpperCase()) : '代码'
  let highlighted: string
  try { highlighted = language && hljs.getLanguage(language) ? hljs.highlight(codeText, { language }).value : hljs.highlightAuto(codeText).value } catch { highlighted = hljs.highlightAuto(codeText).value }
  const codeForCopy = codeText.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  const blockId = generateCodeBlockId()
  return `<div class="code-block-wrapper" data-code-id="${blockId}"><div class="code-block-header"><span class="code-lang">${displayLang}</span><button class="copy-code-btn" data-code-target="${blockId}" title="复制">📋</button></div><pre class="hljs"><code data-raw-code="${codeForCopy}">${highlighted}</code></pre></div>`
}
marked.setOptions({ breaks: true, gfm: true, renderer })
const renderMarkdown = (content: string): string => {
  if (!content) return ''
  // 先格式化路径（将 /home/sandbox/workspace 替换为 ~/workspace），再进行 markdown 渲染
  const formattedContent = content.replace(/\/home\/sandbox\/workspace/g, '~/workspace')
  return DOMPurify.sanitize(marked.parse(formattedContent) as string)
}
const copyCodeToClipboard = async (event: Event) => {
  const btn = (event.target as HTMLElement).closest('.copy-code-btn') as HTMLElement
  if (!btn) return
  const codeId = btn.getAttribute('data-code-target')
  const wrapper = codeId ? document.querySelector(`[data-code-id="${codeId}"]`) : null
  const codeEl = wrapper?.querySelector('code[data-raw-code]') as HTMLElement
  if (codeEl) {
    const raw = codeEl.getAttribute('data-raw-code')?.replace(/&quot;/g, '"').replace(/&amp;/g, '&') || ''
    try { await navigator.clipboard.writeText(raw); addLog('success', '已复制') } catch { addLog('error', '复制失败') }
  }
}
const handleMessagesClick = (event: Event) => { if ((event.target as HTMLElement).closest('.copy-code-btn')) copyCodeToClipboard(event) }

// 登录
const isAuthenticated = ref(false)
const passwordInput = ref('')
const showPassword = ref(false)
const loginError = ref('')
const isLoggingIn = ref(false)
const CORRECT_PASSWORD = 'sandbox2024'
const handleLogin = () => {
  loginError.value = ''; isLoggingIn.value = true
  setTimeout(() => {
    if (passwordInput.value === CORRECT_PASSWORD) { isAuthenticated.value = true; sessionStorage.setItem('sandbox_authenticated', 'true'); initAfterLogin() }
    else { loginError.value = '密码错误' }
    isLoggingIn.value = false
  }, 500)
}
const chatToken = ref('')
const initAfterLogin = async () => {
  try {
    addLog('info', '获取 Token...')
    const resp = await fetch('https://sandbox.toproject.cloud/endpoint/chat/conversations/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '测试对话' }) })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    if (!data.success) throw new Error(data.message || '失败')
    if (data.data?.access_token) { chatToken.value = data.data.access_token; addLog('success', 'Token 获取成功') }
    if (data.data?.conversation_id) config.conversationId = data.data.conversation_id
    if (data.data?.user_id) config.userId = data.data.user_id
    connectWebSocket()
  } catch (e) { addLog('error', `获取 Token 失败: ${e instanceof Error ? e.message : '未知'}`) }
}
const checkAuthentication = () => { if (sessionStorage.getItem('sandbox_authenticated') === 'true') { isAuthenticated.value = true; return true }; return false }

// 配置
const config = reactive({ orchestratorUrl: 'wss://sandbox.toproject.cloud/endpoint/ws/chat', userId: 'test-user-' + Math.random().toString(36).substring(7), conversationId: '', includeThinking: true })

// 类型
interface TodoItem { id: string; content: string; status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' }
interface TodoList { id: string; title: string; items: TodoItem[]; total_items: number; completed_items: number }
interface FileNode { name: string; path: string; type: 'file' | 'directory'; children?: FileNode[] }
interface FileChange { path: string; status: 'created' | 'modified' | 'deleted' | 'renamed' }
interface PlanStep { id: string; description: string; status: 'pending' | 'in_progress' | 'completed' | 'failed'; tool?: string; error?: string }
interface ExecutionPlan { id: string; title?: string; steps: PlanStep[]; total_steps: number; current_step: number; status: 'pending' | 'running' | 'completed' | 'failed' | 'revising' }
interface ToolCall { id: string; tool: string; arguments: any; status: 'running' | 'success' | 'failed'; result?: any; timestamp: Date; stepId?: number; executionTime?: number }
interface ToolExecutionMessage { id: string; type: 'tool_execution'; tool: string; status: 'running' | 'success' | 'failed'; arguments: any; result?: any; stepId?: number; executionTime?: number; timestamp: Date; description?: string }

// 统一交互协议类型定义
interface InteractionField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'confirm' | 'number'
  required: boolean
  placeholder?: string
  default_value?: any
  options?: Array<{
    value: string
    label: string
    description?: string
  }>
  validation?: {
    min_length?: number
    max_length?: number
    min?: number
    max?: number
    pattern?: string
  }
}

interface UnifiedInteractionData {
  interaction_id: string
  interaction_type: 'clarification' | 'command' | 'confirmation' | 'input'
  title: string
  description?: string
  fields: InteractionField[]
  submit_button_text: string
  cancel_button_text: string
  allow_cancel?: boolean
  context?: any
}

// 流程节点类型
interface FlowNodeData {
  node: 'planning' | 'execution' | 'step_execution' | 'replanning' | 'summarizing' | 'analysis'
  status: 'started' | 'completed' | 'failed'
  message: string
  data?: any
}

// 状态
const sandboxInfo = ref<{ has_sandbox: boolean; session_id?: string; vnc_url?: string; vnc_password?: string; iframe_url?: string } | null>(null)
const showVncEmbed = ref(false)

// VNC 相关状态
const vncContainer = ref<HTMLDivElement | null>(null)
const vncFullscreenContainer = ref<HTMLDivElement | null>(null)
const vncRfb = ref<any>(null)
const vncStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
const vncFullscreen = ref(false)
const vncMode = ref<'iframe' | 'novnc'>('iframe') // VNC 显示模式
const iframeStatus = ref<'disconnected' | 'loading' | 'connected' | 'error'>('disconnected') // iframe 状态
const todoList = ref<TodoList | null>(null)
const todoStats = ref({ total: 0, completed: 0, in_progress: 0, failed: 0, pending: 0 })
const updateTodoStats = () => { if (!todoList.value) return; const items = todoList.value.items; todoStats.value = { total: items.length, completed: items.filter(i => i.status === 'completed').length, in_progress: items.filter(i => i.status === 'in_progress').length, failed: items.filter(i => i.status === 'failed').length, pending: items.filter(i => i.status === 'pending').length } }
const fileTree = ref<FileNode[]>([])
const fileChanges = ref<FileChange[]>([])
const expandedFolders = ref<Set<string>>(new Set())
const toggleFolder = (p: string) => { if (expandedFolders.value.has(p)) expandedFolders.value.delete(p); else expandedFolders.value.add(p) }
const isDownloading = ref(false)
const downloadingFile = ref<string | null>(null)

// 文件下载功能
const downloadSingleFile = async (node: FileNode) => {
  if (!sandboxInfo.value?.session_id || node.type !== 'file') return
  downloadingFile.value = node.path
  try {
    addLog('info', `下载文件: ${node.path}`)
    // 使用正确的 API 端点: /endpoint/file/sandbox/{session_id}/download?path=...
    const resp = await fetch(
      `https://sandbox.toproject.cloud/endpoint/file/sandbox/${sandboxInfo.value.session_id}/download?path=${encodeURIComponent(node.path)}`,
      { headers: chatToken.value ? { 'Authorization': `Bearer ${chatToken.value}` } : {} }
    )
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = node.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addLog('success', `文件下载成功: ${node.name}`)
  } catch (e) {
    addLog('error', `下载失败: ${e instanceof Error ? e.message : '未知错误'}`)
  } finally {
    downloadingFile.value = null
  }
}

const downloadAllFiles = async () => {
  if (!sandboxInfo.value?.session_id || fileTree.value.length === 0) return
  isDownloading.value = true
  try {
    addLog('info', '打包下载所有文件...')
    // 使用正确的 API 端点: /endpoint/file/sandbox/{session_id}/download-workspace
    const resp = await fetch(
      `https://sandbox.toproject.cloud/endpoint/file/sandbox/${sandboxInfo.value.session_id}/download-workspace`,
      { headers: chatToken.value ? { 'Authorization': `Bearer ${chatToken.value}` } : {} }
    )
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    
    // 从响应头获取文件名
    const contentDisposition = resp.headers.get('Content-Disposition')
    let filename = `workspace-${Date.now()}.zip`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/)
      if (match) filename = match[1]
    }
    
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addLog('success', '所有文件下载成功')
  } catch (e) {
    addLog('error', `打包下载失败: ${e instanceof Error ? e.message : '未知错误'}`)
  } finally {
    isDownloading.value = false
  }
}

// 下载指定目录为 ZIP
const downloadDirectory = async (node: FileNode) => {
  if (!sandboxInfo.value?.session_id || node.type !== 'directory') return
  downloadingFile.value = node.path
  try {
    addLog('info', `下载目录: ${node.path}`)
    // 使用 download-workspace 端点并指定 path 参数
    const resp = await fetch(
      `https://sandbox.toproject.cloud/endpoint/file/sandbox/${sandboxInfo.value.session_id}/download-workspace?path=${encodeURIComponent(node.path)}`,
      { headers: chatToken.value ? { 'Authorization': `Bearer ${chatToken.value}` } : {} }
    )
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    
    // 从响应头获取文件名
    const contentDisposition = resp.headers.get('Content-Disposition')
    let filename = `${node.name}-${Date.now()}.zip`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/)
      if (match) filename = match[1]
    }
    
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addLog('success', `目录下载成功: ${node.name}`)
  } catch (e) {
    addLog('error', `目录下载失败: ${e instanceof Error ? e.message : '未知错误'}`)
  } finally {
    downloadingFile.value = null
  }
}

// 扁平化文件树类型
interface FlatFileNode extends FileNode {
  depth: number
}

// 递归渲染文件树节点
const renderFileNode = (node: FileNode, depth: number = 0): FlatFileNode[] => {
  const result: FlatFileNode[] = [{ ...node, depth }]
  if (node.type === 'directory' && node.children && expandedFolders.value.has(node.path)) {
    for (const child of node.children) {
      result.push(...renderFileNode(child, depth + 1))
    }
  }
  return result
}

const flattenedFileTree = computed((): FlatFileNode[] => {
  const result: FlatFileNode[] = []
  for (const node of fileTree.value) {
    result.push(...renderFileNode(node))
  }
  return result
})
const executionPlan = ref<ExecutionPlan | null>(null)
const toolCalls = ref<ToolCall[]>([])
const activeSideTab = ref<'todo' | 'files' | 'tools' | 'vnc'>('todo')

// 标签
const getComplexityLabel = (c: string) => ({ simple: '🟢 简单', moderate: '🟡 中等', complex: '🔴 复杂' }[c] || c)
const getTaskTypeLabel = (t: string) => ({ chat: '💬 对话', code: '💻 代码', file: '📁 文件', shell: '🖥️ 命令', gui: '🖼️ 图形', browser: '🌐 浏览器', analysis: '📊 分析', creative: '🎨 创意' }[t] || t)
// 工具名称和图标映射
const getToolDisplayInfo = (tool: string): { name: string; icon: string; color: string } => {
  const toolMap: Record<string, { name: string; icon: string; color: string }> = {
    'file_manager': { name: '文件管理器', icon: '📁', color: 'text-blue-600' },
    'code_executor': { name: '代码执行器', icon: '⚡', color: 'text-yellow-600' },
    'shell': { name: '终端命令', icon: '🖥️', color: 'text-green-600' },
    'browser': { name: '浏览器', icon: '🌐', color: 'text-purple-600' },
    'search': { name: '搜索', icon: '🔍', color: 'text-indigo-600' },
    'read_file': { name: '读取文件', icon: '📖', color: 'text-cyan-600' },
    'write_file': { name: '写入文件', icon: '✏️', color: 'text-orange-600' },
    'create_file': { name: '创建文件', icon: '📝', color: 'text-teal-600' },
    'delete_file': { name: '删除文件', icon: '🗑️', color: 'text-red-600' },
    'list_files': { name: '列出文件', icon: '📋', color: 'text-slate-600' },
    'execute_command': { name: '执行命令', icon: '⌨️', color: 'text-emerald-600' },
    'python': { name: 'Python 执行', icon: '🐍', color: 'text-yellow-500' },
    'javascript': { name: 'JavaScript 执行', icon: '📜', color: 'text-amber-500' },
    'api_call': { name: 'API 调用', icon: '🔗', color: 'text-violet-600' },
    'database': { name: '数据库操作', icon: '🗄️', color: 'text-rose-600' },
  }
  return toolMap[tool] || { name: tool, icon: '🔧', color: 'text-gray-600' }
}
// 获取工具操作描述
const getToolActionDescription = (tool: string, args: any): string => {
  if (!args) return '执行中...'
  let description = ''
  switch (tool) {
    case 'file_manager':
      if (args.action === 'read') description = `读取文件: ${args.path || args.file_path || '未知'}`
      else if (args.action === 'write') description = `写入文件: ${args.path || args.file_path || '未知'}`
      else if (args.action === 'create') description = `创建文件: ${args.path || args.file_path || '未知'}`
      else if (args.action === 'delete') description = `删除文件: ${args.path || args.file_path || '未知'}`
      else if (args.action === 'list') description = `列出目录: ${args.path || args.directory || '/'}`
      else description = `文件操作: ${args.action || '未知操作'}`
      return formatPathForDisplay(description)
    case 'read_file':
      return formatPathForDisplay(`读取文件: ${args.path || args.file_path || '未知'}`)
    case 'write_file':
      return formatPathForDisplay(`写入文件: ${args.path || args.file_path || '未知'}`)
    case 'create_file':
      return formatPathForDisplay(`创建文件: ${args.path || args.file_path || '未知'}`)
    case 'delete_file':
      return formatPathForDisplay(`删除文件: ${args.path || args.file_path || '未知'}`)
    case 'list_files':
      return formatPathForDisplay(`列出目录: ${args.path || args.directory || '/'}`)
    case 'shell':
    case 'execute_command':
      return formatPathForDisplay(`执行命令: ${args.command || args.cmd || '未知命令'}`)
    case 'code_executor':
      return `执行 ${args.language || '代码'}: ${(args.code || '').substring(0, 50)}${(args.code || '').length > 50 ? '...' : ''}`
    case 'python':
      return `执行 Python: ${(args.code || '').substring(0, 50)}${(args.code || '').length > 50 ? '...' : ''}`
    case 'javascript':
      return `执行 JavaScript: ${(args.code || '').substring(0, 50)}${(args.code || '').length > 50 ? '...' : ''}`
    case 'browser':
      if (args.action === 'navigate') return `导航到: ${args.url || '未知'}`
      if (args.action === 'click') return `点击元素: ${args.selector || '未知'}`
      if (args.action === 'type') return `输入文本: ${args.text || '未知'}`
      if (args.action === 'screenshot') return '截取屏幕'
      return `浏览器操作: ${args.action || '未知'}`
    case 'search':
      return `搜索: ${args.query || args.keyword || '未知'}`
    case 'api_call':
      return `API 调用: ${args.method || 'GET'} ${args.url || '未知'}`
    case 'database':
      return `数据库: ${args.action || args.query?.substring(0, 30) || '未知操作'}`
    default:
      return `执行 ${tool}`
  }
}

// 格式化工具参数显示
const formatToolArguments = (tool: string, args: any): string => {
  if (!args) return '无参数'

  try {
    let result = ''
    // 根据工具类型格式化参数
    switch (tool) {
      case 'file_manager':
      case 'read_file':
      case 'write_file':
      case 'create_file':
      case 'delete_file':
        const filePath = args.path || args.file_path || '未知路径'
        const action = args.action || tool.replace('_', ' ')
        result = `操作: ${action}\n路径: ${filePath}`
        if (args.content) {
          const contentPreview = args.content.length > 200
            ? args.content.substring(0, 200) + '...(省略)'
            : args.content
          result += `\n内容:\n${contentPreview}`
        }
        return formatPathForDisplay(result)

      case 'list_files':
        result = `目录: ${args.path || args.directory || '/'}\n递归: ${args.recursive ? '是' : '否'}`
        return formatPathForDisplay(result)

      case 'shell':
      case 'execute_command':
        const cmd = args.command || args.cmd || '未知命令'
        result = `命令: ${cmd}`
        if (args.cwd) result += `\n工作目录: ${args.cwd}`
        if (args.timeout) result += `\n超时: ${args.timeout}ms`
        return formatPathForDisplay(result)

      case 'code_executor':
      case 'python':
      case 'javascript':
        const lang = args.language || tool
        const code = args.code || ''
        const codePreview = code.length > 300 ? code.substring(0, 300) + '...(省略)' : code
        return `语言: ${lang}\n代码:\n${codePreview}`

      case 'browser':
        result = `操作: ${args.action || '未知'}`
        if (args.url) result += `\nURL: ${args.url}`
        if (args.selector) result += `\n选择器: ${args.selector}`
        if (args.text) result += `\n文本: ${args.text}`
        return result

      case 'search':
        return `关键词: ${args.query || args.keyword || '未知'}`

      case 'api_call':
        result = `方法: ${args.method || 'GET'}\nURL: ${args.url || '未知'}`
        if (args.headers) result += `\n请求头: ${JSON.stringify(args.headers, null, 2)}`
        if (args.body) result += `\n请求体: ${typeof args.body === 'object' ? JSON.stringify(args.body, null, 2) : args.body}`
        return result

      default:
        // 默认格式化为 JSON
        return formatPathForDisplay(JSON.stringify(args, null, 2))
    }
  } catch (e) {
    return formatPathForDisplay(JSON.stringify(args, null, 2))
  }
}

// 格式化工具执行结果
const formatToolResult = (result: any): string => {
  if (result === null || result === undefined) return '无返回结果'

  try {
    if (typeof result === 'string') {
      // 如果是字符串，限制长度并格式化路径
      const truncated = result.length > 1000 ? result.substring(0, 1000) + '\n...(结果过长，已截断)' : result
      return formatPathForDisplay(truncated)
    }

    if (typeof result === 'object') {
      // 处理常见的结果格式
      if (result.success !== undefined) {
        let formatted = `状态: ${result.success ? '成功' : '失败'}`
        if (result.message) formatted += `\n消息: ${result.message}`
        if (result.error) formatted += `\n错误: ${result.error}`
        if (result.output) formatted += `\n输出:\n${result.output}`
        if (result.data) {
          const dataStr = JSON.stringify(result.data, null, 2)
          formatted += `\n数据:\n${dataStr.length > 500 ? dataStr.substring(0, 500) + '...' : dataStr}`
        }
        return formatPathForDisplay(formatted)
      }

      // 默认 JSON 格式化
      const jsonStr = JSON.stringify(result, null, 2)
      const truncated = jsonStr.length > 1000 ? jsonStr.substring(0, 1000) + '\n...(结果过长，已截断)' : jsonStr
      return formatPathForDisplay(truncated)
    }

    return formatPathForDisplay(String(result))
  } catch (e) {
    return formatPathForDisplay(String(result))
  }
}

const getTodoStatusIcon = (s: string) => ({ pending: Clock, in_progress: Loader2, completed: CheckCircle, failed: XCircle, skipped: SkipForward }[s] || Clock)
const getTodoStatusColor = (s: string) => ({ pending: 'text-slate-400', in_progress: 'text-blue-500', completed: 'text-green-500', failed: 'text-red-500', skipped: 'text-orange-500' }[s] || 'text-slate-400')
const getFileStatusColor = (s?: string) => ({ created: 'text-green-600', modified: 'text-yellow-600', deleted: 'text-red-600', renamed: 'text-blue-600' }[s || ''] || 'text-slate-400')
const getFileChangeIcon = (changeType: string) => {
  switch (changeType) {
    case 'created': return '➕'
    case 'modified': return '✏️'
    case 'deleted': return '🗑️'
    case 'renamed': return '📝'
    default: return '📄'
  }
}
const getFileChangeLabel = (changeType: string) => {
  switch (changeType) {
    case 'created': return '新建'
    case 'modified': return '修改'
    case 'deleted': return '删除'
    case 'renamed': return '重命名'
    default: return '变更'
  }
}
const getFileChangeBgColor = (changeType: string) => {
  switch (changeType) {
    case 'created': return 'bg-green-50'
    case 'modified': return 'bg-yellow-50'
    case 'deleted': return 'bg-red-50'
    case 'renamed': return 'bg-blue-50'
    default: return 'bg-gray-50'
  }
}
const getStepStatusIcon = (s: string) => ({ pending: Clock, in_progress: Loader2, completed: CheckCircle, failed: XCircle }[s] || Clock)
const getStepStatusColor = (s: string) => ({ pending: 'text-slate-400', in_progress: 'text-blue-500', completed: 'text-green-500', failed: 'text-red-500' }[s] || 'text-slate-400')

// 会话
const sessionInfo = ref<{ userId: string; conversationId: string; connectionId: string; connectedAt: string } | null>(null)
const taskAnalysis = ref<{ complexity: string; task_type: string; requires_sandbox: boolean } | null>(null)
const wsStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
const ws = ref<WebSocket | null>(null)
const connectionId = ref('')

// 消息类型定义
type MessageType = 'user' | 'assistant' | 'system' | 'error' | 'thinking_chain' | 'analysis_node' | 'todo_list' | 'tool_execution' | 'file_changes' | 'tool_fix' | 'interactive_prompt' | 'interactive_response' | 'user_input_required' | 'flow_node' | 'verification' | 'llm_call' | 'variable_event'

interface Message {
  id: string
  type: MessageType
  content: string
  timestamp: Date
  collapsed?: boolean
  nodeType?: string
  toolData?: {
    tool: string
    status: 'running' | 'success' | 'failed' | 'fixing'
    arguments: any
    result?: any
    stepId?: number
    executionTime?: number
    description?: string
    hasWarning?: boolean
  }
  fileChangesData?: {
    changes: Array<{ path: string; changeType: string; oldPath?: string }>
    totalChanges: number
  }
  toolFixData?: {
    tool: string
    error: string
    fixAttempt: number
    originalArgs?: any
    fixedArgs?: any
    fixedCommand?: string
    explanation?: string
    status: 'fixing' | 'fixed' | 'failed'
  }
  interactiveData?: {
    type: 'prompt' | 'response' | 'user_input_required' | 'user_input_received'
    stepId: number
    tool?: string
    promptText?: string
    options?: string[]
    optionsExplanation?: Array<{ option: string; description: string }>
    promptType?: string
    command?: string
    response?: string
    reasoning?: string
    autoResponded?: boolean
    defaultResponse?: string
    userInput?: string
  }
  flowNodeData?: {
    node: string
    status: string
    message: string
    data?: any
  }
  verificationData?: {
    type: 'start' | 'result'
    expected?: string
    actualPreview?: string
    isValid?: boolean
  }
  llmData?: {
    type: 'call' | 'response'
    purpose?: string
    context?: string
    responsePreview?: string
  }
  variableData?: {
    type: 'set' | 'resolve'
    name?: string
    value?: any
    valueType?: string
    originalArgs?: any
    resolvedArgs?: any
    variablesUsed?: string[]
  }
}

// 消息
const messages = ref<Message[]>([])

// 统一交互对话框状态
const interactionDialog = ref<{
  show: boolean
  data: UnifiedInteractionData | null
  formValues: Record<string, any>
}>({
  show: false,
  data: null,
  formValues: {}
})
const inputMessage = ref('')
const isStreaming = ref(false)
const isProcessing = ref(false)
const currentStreamContent = ref('')
const currentThinkingContent = ref('')
const isInThinkTag = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const currentAssistantMsgId = ref('')
const currentThinkingChainMsgId = ref('')
const currentAnalysisMsgId = ref('')
const isAnalyzing = ref(false)

// 交互式提示检测和解析
const detectInteractivePrompt = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false
  
  // 检测常见的交互式提示模式
  const patterns = [
    /[?？]\s*$/,                           // 以问号结尾
    /是\s*[/／]\s*否/,                      // 是/否
    /yes\s*[/／]\s*no/i,                   // yes/no
    /y\s*[/／]\s*n/i,                      // y/n
    /\[y\/n\]/i,                           // [y/n]
    /\(y\/n\)/i,                           // (y/n)
    /○\s+.*\s+[/／●]\s+/,                  // ○ 选项 / ● 选项 (Vue CLI 风格)
    /●\s+.*\s+[/／○]\s+/,                  // ● 选项 / ○ 选项
    />\s*\(\s*\)/,                         // > ( ) 选择框
    /\[\s*\]\s+.*\s+\[\s*[xX✓]\s*\]/,     // [ ] 选项 [x] 选项
    /请选择|please\s+select|choose/i,      // 请选择
    /确认|confirm/i,                       // 确认
    /是否覆盖|overwrite/i,                 // 是否覆盖
    /是否继续|continue/i,                  // 是否继续
    /\?\s*\[.*\]/,                         // ? [选项]
  ]
  
  return patterns.some(pattern => pattern.test(text))
}

const parseInteractivePrompt = (text: string): {
  promptText: string
  options: string[]
  defaultOption: string
  command: string
} => {
  const result = {
    promptText: '',
    options: [] as string[],
    defaultOption: '',
    command: ''
  }
  
  // 提取命令（通常在 > 之后）
  const cmdMatch = text.match(/>\s*([^\n]+)/)
  if (cmdMatch) {
    result.command = cmdMatch[1].trim()
  }
  
  // 提取问题文本
  const lines = text.split('\n').filter(l => l.trim())
  for (const line of lines) {
    // 查找包含问号的行作为提示文本
    if (line.includes('?') || line.includes('？')) {
      result.promptText = line.replace(/[│┌└├┤┬┴┼]/g, '').trim()
      break
    }
  }
  
  // 如果没找到问题，使用整个文本
  if (!result.promptText) {
    result.promptText = text.replace(/[│┌└├┤┬┴┼\[\]]/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 200)
  }
  
  // 解析选项
  // 模式1: ○ 是 / ● 否 或 ● 是 / ○ 否
  const optionMatch1 = text.match(/([○●])\s*([^\s/]+)\s*[/／]\s*([○●])\s*([^\s\n]+)/)
  if (optionMatch1) {
    const opt1 = optionMatch1[2].trim()
    const opt2 = optionMatch1[4].trim()
    result.options = [opt1, opt2]
    // ● 表示当前选中/默认
    if (optionMatch1[1] === '●') {
      result.defaultOption = opt1
    } else if (optionMatch1[3] === '●') {
      result.defaultOption = opt2
    }
    return result
  }
  
  // 模式2: yes/no, y/n
  const ynMatch = text.match(/\b(yes|no|y|n)\s*[/／]\s*(yes|no|y|n)\b/i)
  if (ynMatch) {
    result.options = ['yes', 'no']
    return result
  }
  
  // 模式3: 是/否
  if (/是\s*[/／]\s*否/.test(text)) {
    result.options = ['是', '否']
    return result
  }
  
  // 模式4: [选项列表]
  const bracketMatch = text.match(/\[([^\]]+)\]/)
  if (bracketMatch) {
    const opts = bracketMatch[1].split(/[,，/／]/).map(o => o.trim()).filter(o => o)
    if (opts.length > 0) {
      result.options = opts
    }
  }
  
  // 如果没有解析出选项，提供默认的是/否选项
  if (result.options.length === 0) {
    result.options = ['是', '否']
  }
  
  return result
}

// 日志
const logs = ref<Array<{ time: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }>>([])
const addLog = (level: 'info' | 'warn' | 'error' | 'success', message: string) => { logs.value.unshift({ time: new Date().toLocaleTimeString(), level, message }); if (logs.value.length > 100) logs.value.pop() }
const scrollToBottom = () => { nextTick(() => { if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight }) }

// 路径格式化：将 /home/sandbox/workspace 替换为 ~/workspace（仅用于显示）
const formatPathForDisplay = (text: string): string => {
  if (!text || typeof text !== 'string') return text
  return text.replace(/\/home\/sandbox\/workspace/g, '~/workspace')
}

// WebSocket
const connectWebSocket = () => {
  if (ws.value?.readyState === WebSocket.OPEN) return
  if (!chatToken.value) { addLog('error', '无 Token'); return }
  wsStatus.value = 'connecting'
  try {
    ws.value = new WebSocket(`wss://sandbox.toproject.cloud/endpoint/ws/chat?token=${encodeURIComponent(chatToken.value)}`)
    ws.value.onopen = () => { wsStatus.value = 'connected'; addLog('success', 'WebSocket 已连接'); messages.value.push({ id: Date.now().toString(), type: 'system', content: '已连接到 AI 助手', timestamp: new Date() }) }
    ws.value.onmessage = (e) => { try { handleWebSocketMessage(JSON.parse(e.data)) } catch { addLog('error', '消息解析失败') } }
    ws.value.onerror = () => { wsStatus.value = 'error'; addLog('error', '连接失败') }
    ws.value.onclose = (e) => { wsStatus.value = 'disconnected'; connectionId.value = ''; addLog('info', `断开: ${e.code}`) }
  } catch (e) { wsStatus.value = 'error'; addLog('error', `连接错误: ${e}`) }
}
const disconnectWebSocket = () => { if (ws.value) { ws.value.close(); ws.value = null; wsStatus.value = 'disconnected'; sessionInfo.value = null } }
const reconnect = async () => { disconnectWebSocket(); await initAfterLogin() }

// VNC 连接管理 - noVNC 作为可选备用方案
const loadNoVncScript = async (): Promise<any> => {
  // 检查是否已加载
  if ((window as any).RFB) {
    return (window as any).RFB
  }

  // noVNC npm 包有兼容性问题，暂时禁用直接导入
  // 如果需要 noVNC 支持，请使用 iframe_url 方案
  throw new Error('noVNC 库暂不可用，请使用 iframe 模式查看远程桌面')
}

const connectVnc = async () => {
  if (!sandboxInfo.value?.vnc_url) {
    addLog('error', 'VNC 连接失败: 缺少 URL')
    return
  }

  // 选择正确的容器
  const container = vncFullscreen.value ? vncFullscreenContainer.value : vncContainer.value
  if (!container) {
    addLog('error', 'VNC 连接失败: 容器未就绪')
    return
  }

  // 断开现有连接
  disconnectVnc()

  vncStatus.value = 'connecting'
  addLog('info', '正在加载 VNC 客户端...')

  try {
    // 动态加载 noVNC
    const RFB = await loadNoVncScript()

    addLog('info', '正在连接 VNC...')

    const rfb = new RFB(container, sandboxInfo.value.vnc_url, {
      credentials: { password: sandboxInfo.value.vnc_password || '' }
    })

    rfb.scaleViewport = true
    rfb.resizeSession = false
    rfb.clipViewport = true

    rfb.addEventListener('connect', () => {
      vncStatus.value = 'connected'
      addLog('success', 'VNC 已连接')
    })

    rfb.addEventListener('disconnect', (e: any) => {
      vncStatus.value = 'disconnected'
      vncRfb.value = null
      if (e.detail?.clean) {
        addLog('info', 'VNC 已断开')
      } else {
        addLog('warn', 'VNC 连接断开')
      }
    })

    rfb.addEventListener('securityfailure', (e: any) => {
      vncStatus.value = 'error'
      addLog('error', `VNC 认证失败: ${e.detail?.reason || '未知原因'}`)
    })

    vncRfb.value = rfb
  } catch (e) {
    vncStatus.value = 'error'
    addLog('error', `VNC 连接错误: ${e instanceof Error ? e.message : '未知错误'}`)
  }
}

const disconnectVnc = () => {
  if (vncRfb.value) {
    try {
      vncRfb.value.disconnect()
    } catch (e) {
      // 忽略断开时的错误
    }
    vncRfb.value = null
  }
  vncStatus.value = 'disconnected'
}

const toggleVncFullscreen = () => {
  const wasConnected = vncStatus.value === 'connected'

  // 断开当前连接
  if (wasConnected) {
    disconnectVnc()
  }

  // 切换全屏状态
  vncFullscreen.value = !vncFullscreen.value

  // 如果之前是连接状态，在新容器中重新连接
  if (wasConnected && sandboxInfo.value?.vnc_url) {
    nextTick(() => {
      connectVnc()
    })
  }
}

// 消息处理
const handleWebSocketMessage = (data: any) => {
  const msgType = data.type, payload = data.payload || {}
  switch (msgType) {
    case 'connected':
      connectionId.value = payload.connection_id || data.connection_id
      sessionInfo.value = { userId: payload.user_id || config.userId, conversationId: config.conversationId, connectionId: connectionId.value, connectedAt: new Date().toLocaleString() }
      addLog('success', `连接 ID: ${connectionId.value}`)
      break
    case 'pong': break
    case 'process_started':
      // 处理开始，初始化状态（不在聊天区域显示消息）
      isProcessing.value = true
      isStreaming.value = false
      currentStreamContent.value = ''
      currentThinkingContent.value = ''
      isInThinkTag.value = false
      currentAssistantMsgId.value = ''
      currentThinkingChainMsgId.value = ''
      currentAnalysisMsgId.value = ''
      isAnalyzing.value = false
      executionPlan.value = null
      toolCalls.value = []
      if (payload.data?.conversation_id) config.conversationId = payload.data.conversation_id
      addLog('info', '处理开始')
      break
    case 'process_completed':
      // 处理完成，重置状态（不在聊天区域显示消息）
      isProcessing.value = false
      isStreaming.value = false
      if (payload.success) {
        addLog('success', '处理完成')
      } else {
        const errorMsg = payload.data?.error || payload.message || '处理失败'
        addLog('error', `处理失败: ${errorMsg}`)
      }
      break
    case 'chat_started':
      isStreaming.value = true; currentStreamContent.value = ''; currentThinkingContent.value = ''; isInThinkTag.value = false
      currentAssistantMsgId.value = ''; currentThinkingChainMsgId.value = ''; currentAnalysisMsgId.value = ''
      executionPlan.value = null; toolCalls.value = []
      config.conversationId = payload.conversation_id || data.conversation_id || config.conversationId
      addLog('info', '对话开始')
      break
    case 'thinking':
      const thinkContent = payload.content || payload.thinking_step?.content || '分析中...'
      const thinkType = payload.type || payload.thinking_step?.type || 'analysis'
      isAnalyzing.value = true
      if (!currentAnalysisMsgId.value) { currentAnalysisMsgId.value = 'analysis-' + Date.now(); messages.value.push({ id: currentAnalysisMsgId.value, type: 'analysis_node', content: thinkContent, timestamp: new Date(), collapsed: false, nodeType: thinkType }) }
      else { const msg = messages.value.find(m => m.id === currentAnalysisMsgId.value); if (msg && !msg.collapsed) { msg.content = thinkContent; msg.nodeType = thinkType } }
      scrollToBottom()
      break
    case 'chat_response': case 'token': case 'chat_token':
      const delta = payload.delta || payload.content || data.delta || data.content || ''
      if (delta) {
        let rem = delta
        while (rem.length > 0) {
          if (isInThinkTag.value) {
            const end = rem.indexOf('</think>')
            if (end !== -1) { currentThinkingContent.value += rem.substring(0, end); isInThinkTag.value = false; rem = rem.substring(end + 8); if (currentThinkingChainMsgId.value) { const m = messages.value.find(x => x.id === currentThinkingChainMsgId.value); if (m) m.content = currentThinkingContent.value.trim() } }
            else { currentThinkingContent.value += rem; rem = ''; if (currentThinkingChainMsgId.value) { const m = messages.value.find(x => x.id === currentThinkingChainMsgId.value); if (m) m.content = currentThinkingContent.value.trim() } }
          } else {
            const start = rem.indexOf('<think>')
            if (start !== -1) { if (start > 0) currentStreamContent.value += rem.substring(0, start); isInThinkTag.value = true; rem = rem.substring(start + 7); if (!currentThinkingChainMsgId.value) { if (currentAnalysisMsgId.value) { const a = messages.value.find(x => x.id === currentAnalysisMsgId.value); if (a && !a.collapsed) { a.collapsed = true; isAnalyzing.value = false } }; currentThinkingChainMsgId.value = 'think-' + Date.now(); messages.value.push({ id: currentThinkingChainMsgId.value, type: 'thinking_chain', content: '思考中...', timestamp: new Date() }) } }
            else { currentStreamContent.value += rem; rem = '' }
          }
        }
        if (currentStreamContent.value.trim()) {
          if (currentAnalysisMsgId.value) { const a = messages.value.find(x => x.id === currentAnalysisMsgId.value); if (a && !a.collapsed) { a.collapsed = true; isAnalyzing.value = false } }
          if (!currentAssistantMsgId.value) { currentAssistantMsgId.value = 'asst-' + Date.now(); messages.value.push({ id: currentAssistantMsgId.value, type: 'assistant', content: currentStreamContent.value.trim(), timestamp: new Date() }) }
          else { const m = messages.value.find(x => x.id === currentAssistantMsgId.value); if (m) m.content = currentStreamContent.value.trim() }
        }
        scrollToBottom()
      }
      break
    case 'task_analysis':
      const ana = payload.analysis || payload
      taskAnalysis.value = { complexity: ana.complexity || 'simple', task_type: ana.task_type || 'chat', requires_sandbox: ana.requires_sandbox || false }
      // 任务分析信息不再在问答区显示
      scrollToBottom()
      break
    case 'task_analysis_complete':
      // 任务分析完成，更新分析节点状态
      isAnalyzing.value = false
      if (currentAnalysisMsgId.value) {
        const analysisMsg = messages.value.find(m => m.id === currentAnalysisMsgId.value)
        if (analysisMsg) {
          analysisMsg.collapsed = true
          analysisMsg.nodeType = 'analysis_complete'
        }
      }
      // 显示分析完成的摘要信息
      const completeData = payload.data || payload
      if (completeData.complexity || completeData.task_type) {
        taskAnalysis.value = {
          complexity: completeData.complexity || taskAnalysis.value?.complexity || 'simple',
          task_type: completeData.task_type || taskAnalysis.value?.task_type || 'chat',
          requires_sandbox: completeData.requires_sandbox ?? taskAnalysis.value?.requires_sandbox ?? false
        }
      }
      addLog('success', '任务分析完成')
      scrollToBottom()
      break
    case 'sandbox_ready':
      // 拼接 iframe_url 和 token
      const iframeUrlWithToken = payload.iframe_url && chatToken.value
        ? `${payload.iframe_url}?token=${encodeURIComponent(chatToken.value)}`
        : payload.iframe_url
      sandboxInfo.value = { has_sandbox: true, session_id: payload.session_id, vnc_url: payload.vnc_url, vnc_password: payload.vnc_password, iframe_url: iframeUrlWithToken }
      messages.value.push({ id: 'sb-' + Date.now(), type: 'system', content: '🖥️ 沙箱就绪', timestamp: new Date() })
      addLog('success', '沙箱就绪')
      // 记录 VNC 访问链接到日志
      if (payload.vnc_url) {
        addLog('info', `VNC 链接: ${payload.vnc_url}`)
      }
      if (iframeUrlWithToken) {
        addLog('info', `iframe 链接: ${iframeUrlWithToken}`)
      }
      if (payload.session_id) {
        addLog('info', `会话 ID: ${payload.session_id}`)
      }
      if (payload.vnc_password) {
        addLog('info', `VNC 密码: ${payload.vnc_password}`)
      }
      // 自动切换到 VNC 标签页并连接
      if (payload.vnc_url) {
        activeSideTab.value = 'vnc'
        nextTick(() => {
          connectVnc()
        })
      }
      scrollToBottom()
      break
    case 'plan_start':
      const pd = payload.data || payload
      executionPlan.value = { id: 'plan-' + Date.now(), title: pd.plan || '计划', steps: (pd.steps_preview || []).map((s: any, i: number) => ({ id: `s${i}`, description: typeof s === 'string' ? s : s.description || `步骤${i+1}`, status: 'pending' as const })), total_steps: pd.total_steps || 0, current_step: 0, status: 'running' }
      messages.value.push({ id: 'ps-' + Date.now(), type: 'system', content: `📋 计划开始 (${executionPlan.value.total_steps} 步)`, timestamp: new Date() })
      scrollToBottom()
      break
    case 'plan_complete':
      const planSuccess = payload.data?.success ?? payload.success
      if (executionPlan.value) executionPlan.value.status = planSuccess ? 'completed' : 'failed'
      // 只有真正失败时才显示失败消息，成功（包括有警告的成功）都显示完成
      messages.value.push({ id: 'pc-' + Date.now(), type: 'system', content: executionPlan.value?.status === 'completed' ? '✅ 计划完成' : '❌ 计划失败', timestamp: new Date() })
      scrollToBottom()
      break
    case 'plan_revision':
      if (executionPlan.value) executionPlan.value.status = 'revising'
      messages.value.push({ id: 'pr-' + Date.now(), type: 'system', content: '🔄 修订计划', timestamp: new Date() })
      scrollToBottom()
      break
    case 'plan_revised':
      if (executionPlan.value) { executionPlan.value.status = 'running'; const ns = payload.data?.new_steps || []; executionPlan.value.steps.push(...ns.map((s: any, i: number) => ({ id: `rs${Date.now()}${i}`, description: typeof s === 'string' ? s : s.description, status: 'pending' as const }))); executionPlan.value.total_steps = executionPlan.value.steps.length }
      messages.value.push({ id: 'prd-' + Date.now(), type: 'system', content: '📝 计划已修订', timestamp: new Date() })
      scrollToBottom()
      break
    case 'step_start':
      if (executionPlan.value) { executionPlan.value.current_step++; const s = executionPlan.value.steps[executionPlan.value.current_step - 1]; if (s) s.status = 'in_progress' }
      break
    case 'step_success':
      if (executionPlan.value) { const s = executionPlan.value.steps[executionPlan.value.current_step - 1]; if (s) s.status = 'completed' }
      break
    case 'step_failed':
      if (executionPlan.value) { const s = executionPlan.value.steps[executionPlan.value.current_step - 1]; if (s) { s.status = 'failed'; s.error = payload.data?.error || payload.error } }
      break
    case 'step_retry':
      addLog('warn', `重试: ${payload.data?.retry_count || 1}/${payload.data?.max_retries || 3}`)
      break
    case 'tool_call':
      const toolName = payload.tool || payload.data?.tool || data.tool
      const toolArgs = payload.arguments || payload.data?.arguments || data.arguments || {}
      const toolStepId = payload.step_id ?? payload.data?.step_id
      const toolInfo = getToolDisplayInfo(toolName)
      const toolDescription = getToolActionDescription(toolName, toolArgs)
      
      // 添加到工具调用列表
      toolCalls.value.unshift({
        id: 'tc-' + Date.now(),
        tool: toolName,
        arguments: toolArgs,
        status: 'running',
        timestamp: new Date(),
        stepId: toolStepId
      })
      if (toolCalls.value.length > 50) toolCalls.value.pop()
      
      // 在聊天区域添加工具执行消息
      messages.value.push({
        id: 'tool-' + Date.now(),
        type: 'tool_execution',
        content: '',
        timestamp: new Date(),
        toolData: {
          tool: toolName,
          status: 'running',
          arguments: toolArgs,
          stepId: toolStepId,
          description: toolDescription
        }
      })
      addLog('info', `🔧 调用工具: ${toolInfo.name} - ${toolDescription}`)
      scrollToBottom()

      // 处理VNC连接 - 当tool_call携带vnc信息时自动连接
      // 根据 vnc-iframe-url-spec.md 规范，使用 vnc.iframeURL 字段
      if (payload.vnc) {
        const vncInfo = payload.vnc
        const vncWaitId = payload.vnc_wait_id
        
        addLog('info', `📺 VNC连接请求: ${vncInfo.app || 'unknown'} (display:${vncInfo.display || 1})`)
        
        // 记录VNC详细信息到日志
        if (vncInfo.sandbox_session_id) {
          addLog('info', `📺 沙箱会话: ${vncInfo.sandbox_session_id}`)
        }
        if (vncInfo.iframeURL) {
          addLog('info', `📺 iframe URL: ${vncInfo.iframeURL}`)
        }

        // 切换到VNC标签
        activeSideTab.value = 'vnc'

        // 使用后端返回的 iframeURL（根据规范）
        if (vncInfo.iframeURL) {
          // 更新sandboxInfo以触发iframe连接
          if (!sandboxInfo.value) {
            sandboxInfo.value = {
              has_sandbox: true,
              session_id: vncInfo.sandbox_session_id
            }
          }
          sandboxInfo.value.iframe_url = vncInfo.iframeURL
          iframeStatus.value = 'loading'
          addLog('success', `📺 VNC iframe 已设置`)

          // 如果有 vnc_wait_id，发送 vnc_connected 通知后端
          if (vncWaitId) {
            setTimeout(() => {
              if (ws.value?.readyState === WebSocket.OPEN) {
                ws.value.send(JSON.stringify({
                  type: 'vnc_connected',
                  payload: { vnc_wait_id: vncWaitId }
                }))
                addLog('success', `📺 VNC已连接，通知后端执行命令`)
              }
            }, 1000)
          }
        } else {
          // 兼容旧格式：如果没有 iframeURL，尝试手动构建
          const sessionId = vncInfo.sandbox_session_id || sandboxInfo.value?.session_id || ''
          if (sessionId && vncInfo.app) {
            const fallbackUrl = `https://vnc.toproject.cloud/vnc/view/${sessionId}?app=${vncInfo.app}&display=${vncInfo.display || 1}`
            addLog('warn', `📺 使用备用URL格式: ${fallbackUrl}`)
            
            if (!sandboxInfo.value) {
              sandboxInfo.value = {
                has_sandbox: true,
                session_id: sessionId
              }
            }
            sandboxInfo.value.iframe_url = fallbackUrl
            iframeStatus.value = 'loading'
          } else {
            addLog('warn', `📺 VNC信息不完整，无法连接`)
          }
        }
      }
      break
    case 'tool_result':
      const resultTool = payload.tool || payload.data?.tool || data.tool
      const resultSuccess = payload.success ?? payload.data?.success ?? true
      const resultData = payload.result || payload.data?.result || data.result
      const resultStepId = payload.step_id ?? payload.data?.step_id
      const resultExecTime = payload.execution_time ?? payload.data?.execution_time
      const stderrIsWarning = payload.stderr_is_warning ?? payload.data?.stderr_is_warning ?? false
      
      // 判断最终状态：成功、成功但有警告、失败
      let finalStatus: 'success' | 'success-with-warning' | 'failed'
      if (resultSuccess !== false) {
        finalStatus = stderrIsWarning ? 'success-with-warning' : 'success'
      } else {
        finalStatus = 'failed'
      }
      
      // 更新工具调用列表中的状态
      const tc = toolCalls.value.find(t => t.tool === resultTool && t.status === 'running')
      if (tc) {
        tc.status = finalStatus === 'failed' ? 'failed' : 'success'
        tc.result = resultData
        tc.executionTime = resultExecTime
      }
      
      // 更新聊天区域中对应的工具执行消息
      const toolMsg = [...messages.value].reverse().find(m =>
        m.type === 'tool_execution' &&
        m.toolData?.tool === resultTool &&
        m.toolData?.status === 'running'
      )
      if (toolMsg && toolMsg.toolData) {
        toolMsg.toolData.status = finalStatus === 'failed' ? 'failed' : 'success'
        toolMsg.toolData.result = resultData
        toolMsg.toolData.executionTime = resultExecTime
        // 添加警告标志
        if (stderrIsWarning) {
          toolMsg.toolData.hasWarning = true
        }
      }
      
      const resultToolInfo = getToolDisplayInfo(resultTool)
      if (finalStatus === 'success') {
        addLog('success', `✅ ${resultToolInfo.name} 执行成功${resultExecTime ? ` (${resultExecTime}ms)` : ''}`)
      } else if (finalStatus === 'success-with-warning') {
        addLog('success', `✅ ${resultToolInfo.name} 执行成功${resultExecTime ? ` (${resultExecTime}ms)` : ''} ⚠️ 有警告`)
      } else {
        addLog('error', `❌ ${resultToolInfo.name} 执行失败`)
      }
      scrollToBottom()
      break
    case 'tool_fix':
      // 工具修复开始
      const fixTool = payload.data?.tool || payload.tool
      const fixError = payload.data?.error || payload.error || '执行失败'
      const fixAttempt = payload.data?.fix_attempt || 1
      const fixStepId = payload.data?.step_id
      const fixOriginalArgs = payload.data?.original_args
      const fixToolInfo = getToolDisplayInfo(fixTool)
      
      // 在聊天区域添加工具修复消息
      messages.value.push({
        id: 'tool-fix-' + Date.now(),
        type: 'tool_fix',
        content: '',
        timestamp: new Date(),
        toolFixData: {
          tool: fixTool,
          error: fixError,
          fixAttempt: fixAttempt,
          originalArgs: fixOriginalArgs,
          status: 'fixing'
        }
      })
      
      // 更新对应的工具执行消息状态为修复中
      const fixingToolMsg = [...messages.value].reverse().find(m =>
        m.type === 'tool_execution' &&
        m.toolData?.tool === fixTool &&
        (m.toolData?.status === 'running' || m.toolData?.status === 'failed')
      )
      if (fixingToolMsg && fixingToolMsg.toolData) {
        fixingToolMsg.toolData.status = 'fixing' as any
      }
      
      addLog('warn', `🔧 工具修复中: ${fixToolInfo.name} - 尝试 ${fixAttempt}`)
      scrollToBottom()
      break
    case 'tool_fixed':
      // 工具修复完成
      const fixedTool = payload.data?.tool || payload.tool
      const fixedStepId = payload.data?.step_id
      const fixedArgs = payload.data?.fixed_args
      const fixedCommand = payload.data?.fixed_command
      const fixExplanation = payload.data?.explanation
      const fixAnalysis = payload.data?.analysis
      const fixedToolInfo = getToolDisplayInfo(fixedTool)
      
      // 更新最近的 tool_fix 消息
      const toolFixMsg = [...messages.value].reverse().find(m =>
        m.type === 'tool_fix' &&
        m.toolFixData?.tool === fixedTool &&
        m.toolFixData?.status === 'fixing'
      )
      if (toolFixMsg && toolFixMsg.toolFixData) {
        toolFixMsg.toolFixData.status = 'fixed'
        toolFixMsg.toolFixData.fixedArgs = fixedArgs
        toolFixMsg.toolFixData.fixedCommand = fixedCommand
        toolFixMsg.toolFixData.explanation = fixExplanation || fixAnalysis
      }
      
      addLog('success', `✅ 工具已修复: ${fixedToolInfo.name}`)
      scrollToBottom()
      break
    case 'todo_list_update':
      todoList.value = { id: payload.todo_list?.id || 'main', title: payload.todo_list?.title || '待办事项', items: (payload.todo_list?.items || []).map((i: any) => ({ id: i.id, content: i.content || i.description || i.title, status: i.status || 'pending' })), total_items: payload.todo_list?.total_items || 0, completed_items: payload.todo_list?.completed_items || 0 }
      updateTodoStats()
      // 在消息区域展示待办事项列表（只添加一次，后续更新会自动反映）
      if (!messages.value.find(m => m.type === 'todo_list')) {
        messages.value.push({ id: 'todo-' + Date.now(), type: 'todo_list' as any, content: '', timestamp: new Date() })
      }
      scrollToBottom()
      break
    case 'todo_item_update':
      if (todoList.value && payload.item) {
        const ex = todoList.value.items.find(i => i.id === payload.item.id)
        if (ex) {
          ex.status = payload.item.status
          if (payload.item.content) ex.content = payload.item.content
        } else {
          todoList.value.items.push({ id: payload.item.id, content: payload.item.content || '', status: payload.item.status || 'pending' })
        }
        updateTodoStats()
        scrollToBottom()
      }
      break
    case 'file_tree_update':
      // 文件树更新 - 只展示最新文件树，不标记状态
      if (payload.file_tree) {
        const processFileNode = (n: any): FileNode => ({
          name: n.name || n.path?.split('/').pop() || '',
          path: n.path || '',
          type: n.type || (n.children ? 'directory' : 'file'),
          // 不保留 status 字段，文件树只展示最新结构，不标记变更状态
          children: n.children ? n.children.map(processFileNode) : undefined
        })
        
        // 处理文件树，递归查找 workspace 文件夹并只展示其内容
        const findWorkspaceContents = (nodes: FileNode[]): FileNode[] => {
          for (const node of nodes) {
            // 如果当前节点是 workspace 目录，返回其子节点
            if (node.type === 'directory' && node.name === 'workspace') {
              return node.children || []
            }
            // 如果当前节点是目录，递归查找
            if (node.type === 'directory' && node.children) {
              const found = findWorkspaceContents(node.children)
              if (found.length > 0 || node.children.some(c => c.name === 'workspace')) {
                return found
              }
            }
          }
          // 如果没找到 workspace，返回原始节点
          return nodes
        }
        
        let processedTree: FileNode[]
        if (Array.isArray(payload.file_tree)) {
          processedTree = payload.file_tree.map(processFileNode)
        } else if (payload.file_tree.root) {
          processedTree = [processFileNode(payload.file_tree.root)]
        } else {
          processedTree = []
        }
        
        // 应用 workspace 解包逻辑，只展示 workspace 目录下的内容
        fileTree.value = findWorkspaceContents(processedTree)
      }
      // 不在日志中显示文件树更新，避免干扰
      break
    case 'file_changes_update':
      // 文件变更记录，只在聊天区域展示，不更新到文件树
      const changes = payload.changes || []
      if (changes.length > 0) {
        // 在聊天区域添加文件变更消息
        messages.value.push({
          id: 'file-changes-' + Date.now(),
          type: 'file_changes' as any,
          content: '',
          timestamp: new Date(),
          fileChangesData: {
            changes: changes.map((c: any) => ({
              path: formatPathForDisplay(c.path),
              changeType: c.change_type || c.status || 'modified',
              oldPath: c.old_path ? formatPathForDisplay(c.old_path) : undefined
            })),
            totalChanges: payload.total_changes || changes.length
          }
        })
        addLog('info', `📝 文件变更: ${changes.length} 个文件`)
        scrollToBottom()
      }
      break
    case 'chat_complete':
      isStreaming.value = false
      if (!currentStreamContent.value.trim() && payload.content) {
        const clean = payload.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        if (clean && clean !== currentThinkingContent.value.trim()) {
          if (!currentAssistantMsgId.value) { currentAssistantMsgId.value = 'asst-' + Date.now(); messages.value.push({ id: currentAssistantMsgId.value, type: 'assistant', content: clean, timestamp: new Date() }) }
          else { const m = messages.value.find(x => x.id === currentAssistantMsgId.value); if (m) m.content = clean }
        }
      }
      if (payload.conversation_id) config.conversationId = payload.conversation_id
      addLog('success', '对话完成')
      scrollToBottom()
      break
    case 'error':
      isStreaming.value = false
      messages.value.push({ id: 'err-' + Date.now(), type: 'error', content: payload.message || payload.error || data.message || '错误', timestamp: new Date() })
      addLog('error', payload.message || '错误')
      scrollToBottom()
      break
    
    // ========== 统一交互协议事件 ==========
    case 'user_interaction_required':
      // 统一交互事件 - 处理所有类型的用户交互
      const interactionData = payload.data || payload
      
      // 初始化表单默认值
      const defaultValues: Record<string, any> = {}
      interactionData.fields?.forEach((field: InteractionField) => {
        if (field.default_value !== undefined) {
          defaultValues[field.id] = field.default_value
        }
      })
      
      // 显示交互对话框
      interactionDialog.value = {
        show: true,
        data: interactionData,
        formValues: defaultValues
      }
      
      // 在聊天区域显示交互提示
      const interactionTypeLabels: Record<string, string> = {
        'clarification': '💬 需求澄清',
        'command': '⚙️ 命令配置',
        'confirmation': '⚠️ 确认操作',
        'input': '📝 参数输入'
      }
      messages.value.push({
        id: 'interaction-' + Date.now(),
        type: 'user_input_required',
        content: '',
        timestamp: new Date(),
        interactiveData: {
          type: 'user_input_required',
          stepId: interactionData.context?.step_id || 0,
          promptText: interactionData.title,
          options: [],
          promptType: interactionData.interaction_type
        }
      })
      addLog('warn', `${interactionTypeLabels[interactionData.interaction_type] || '⚠️ 需要用户输入'}: ${interactionData.title}`)
      scrollToBottom()
      break
    
    case 'user_interaction_response':
      // 用户交互响应已接收（后端确认）
      const responseData = payload.data || payload
      if (!responseData.cancelled) {
        messages.value.push({
          id: 'interaction-response-' + Date.now(),
          type: 'interactive_response',
          content: '',
          timestamp: new Date(),
          interactiveData: {
            type: 'user_input_received',
            stepId: responseData.context?.step_id || 0,
            userInput: JSON.stringify(responseData.values),
            autoResponded: false
          }
        })
        addLog('success', `✅ 用户输入已提交`)
      } else {
        addLog('info', `❌ 用户取消了操作`)
      }
      scrollToBottom()
      break

    case 'user_input_received':
      // 后端确认收到用户输入（关闭对话框）
      interactionDialog.value.show = false
      interactionDialog.value.data = null
      interactionDialog.value.formValues = {}
      addLog('success', '✅ 后端已接收用户输入，继续执行')
      scrollToBottom()
      break

    // 兼容旧事件（向后兼容）
    case 'interactive_prompt':
    case 'user_input_required':
      // 旧的交互式命令事件，转换为统一格式
      const oldData = payload.data || payload
      const convertedData: UnifiedInteractionData = {
        interaction_id: `legacy-${Date.now()}`,
        interaction_type: 'command',
        title: oldData.prompt_text || oldData.prompt || '需要您的选择',
        description: oldData.context?.step_description || oldData.context?.command,
        fields: (oldData.options || []).map((opt: string, idx: number) => ({
          id: `option_${idx}`,
          label: opt,
          type: 'radio' as const,
          required: true,
          default_value: oldData.default_response === opt ? opt : undefined,
          options: oldData.options?.map((o: string) => ({
            value: o,
            label: o,
            description: oldData.options_explanation?.find((e: any) => e.option === o)?.description
          }))
        })).slice(0, 1) || [{
          id: 'input',
          label: oldData.prompt_text || '请输入',
          type: 'text' as const,
          required: true,
          default_value: oldData.default_response
        }],
        submit_button_text: '确认',
        cancel_button_text: '取消',
        allow_cancel: true,
        context: oldData.context
      }
      
      interactionDialog.value = {
        show: true,
        data: convertedData,
        formValues: { [convertedData.fields[0].id]: convertedData.fields[0].default_value }
      }
      
      messages.value.push({
        id: 'legacy-interaction-' + Date.now(),
        type: 'user_input_required',
        content: '',
        timestamp: new Date(),
        interactiveData: {
          type: 'user_input_required',
          stepId: oldData.step_id || 0,
          promptText: oldData.prompt_text || oldData.prompt,
          options: oldData.options || [],
          promptType: oldData.prompt_type || 'select'
        }
      })
      addLog('warn', `⚠️ 需要用户输入: ${oldData.prompt_text || oldData.prompt}`)
      scrollToBottom()
      break
    
    // ========== 流程节点事件 ==========
    case 'flow_node':
      // 注意：payload 结构是 { node, status, message, data, ... }，不是嵌套在 data 里
      const flowNode = payload.node || payload.data?.node
      const flowStatus = payload.status || payload.data?.status
      const flowMessage = payload.message || payload.data?.message || ''
      const flowExtraData = payload.data
      
      // 根据节点类型和状态生成显示内容
      const flowNodeLabels: Record<string, string> = {
        'planning': '📋 规划',
        'execution': '⚡ 执行',
        'step_execution': '🔧 步骤执行',
        'replanning': '🔄 重新规划',
        'summarizing': '📝 总结',
        'analysis': '🔍 分析',
        'sandbox_creation': '🖥️ 沙箱创建',
        'tool_execution': '🔧 工具执行',
        'verification': '✅ 验证'
      }
      const flowStatusLabels: Record<string, string> = {
        'started': '开始',
        'completed': '完成',
        'failed': '失败'
      }
      
      // 如果是 completed 或 failed 状态，尝试更新已有的 started 消息
      if (flowStatus === 'completed' || flowStatus === 'failed') {
        const existingMsg = [...messages.value].reverse().find(m =>
          m.type === 'flow_node' &&
          m.flowNodeData?.node === flowNode &&
          m.flowNodeData?.status === 'started'
        )
        if (existingMsg && existingMsg.flowNodeData) {
          existingMsg.flowNodeData.status = flowStatus
          existingMsg.flowNodeData.message = flowMessage || existingMsg.flowNodeData.message
          if (flowExtraData) existingMsg.flowNodeData.data = flowExtraData
          addLog(flowStatus === 'completed' ? 'success' : 'error', `${flowNodeLabels[flowNode] || flowNode} ${flowStatusLabels[flowStatus]}${flowMessage ? ': ' + flowMessage : ''}`)
          scrollToBottom()
          break
        }
      }
      
      // 否则创建新消息
      messages.value.push({
        id: 'flow-node-' + Date.now(),
        type: 'flow_node',
        content: '',
        timestamp: new Date(),
        flowNodeData: {
          node: flowNode,
          status: flowStatus,
          message: flowMessage,
          data: flowExtraData
        }
      })
      addLog('info', `${flowNodeLabels[flowNode] || flowNode} ${flowStatusLabels[flowStatus] || flowStatus}${flowMessage ? ': ' + flowMessage : ''}`)
      scrollToBottom()
      break
    
    // ========== 验证事件 ==========
    case 'verification_start':
      const verifyStartData = payload.data || payload
      messages.value.push({
        id: 'verify-start-' + Date.now(),
        type: 'verification',
        content: '',
        timestamp: new Date(),
        verificationData: {
          type: 'start',
          expected: verifyStartData.expected
        }
      })
      addLog('info', `🔍 开始验证: ${verifyStartData.expected || '检查执行结果'}`)
      scrollToBottom()
      break
    
    case 'verification_result':
      const verifyResultData = payload.data || payload
      messages.value.push({
        id: 'verify-result-' + Date.now(),
        type: 'verification',
        content: '',
        timestamp: new Date(),
        verificationData: {
          type: 'result',
          isValid: verifyResultData.is_valid ?? verifyResultData.success,
          actualPreview: verifyResultData.actual_preview || verifyResultData.actual
        }
      })
      if (verifyResultData.is_valid ?? verifyResultData.success) {
        addLog('success', `✅ 验证通过`)
      } else {
        addLog('warn', `⚠️ 验证失败: ${verifyResultData.actual_preview || '结果不符合预期'}`)
      }
      scrollToBottom()
      break
    
    // ========== LLM 事件 ==========
    case 'llm_call':
      const llmCallData = payload.data || payload
      const llmCallId = 'llm-call-' + Date.now()
      messages.value.push({
        id: llmCallId,
        type: 'llm_call',
        content: '',
        timestamp: new Date(),
        llmData: {
          type: 'call',
          purpose: llmCallData.purpose,
          context: llmCallData.context
        }
      })
      addLog('info', `🤖 LLM 调用: ${llmCallData.purpose || '处理请求'}`)
      scrollToBottom()
      break
    
    case 'llm_call_complete':
      const llmCompleteData = payload.data || payload
      // 更新最近的 llm_call 消息
      const llmCallMsg = [...messages.value].reverse().find(m =>
        m.type === 'llm_call' && m.llmData?.type === 'call'
      )
      if (llmCallMsg && llmCallMsg.llmData) {
        llmCallMsg.llmData.type = 'response'
        llmCallMsg.llmData.responsePreview = llmCompleteData.message || `${llmCompleteData.purpose || 'LLM'} 完成`
      }
      addLog('success', `✅ LLM 调用完成`)
      scrollToBottom()
      break
    
    case 'llm_response':
      // 兼容旧事件名
      const llmRespData = payload.data || payload
      const llmRespMsg = [...messages.value].reverse().find(m =>
        m.type === 'llm_call' && m.llmData?.type === 'call'
      )
      if (llmRespMsg && llmRespMsg.llmData) {
        llmRespMsg.llmData.type = 'response'
        llmRespMsg.llmData.responsePreview = llmRespData.response_preview || llmRespData.response?.substring(0, 100)
      }
      addLog('success', `✅ LLM 响应完成`)
      scrollToBottom()
      break
    
    // ========== 变量事件 ==========
    case 'variable_set':
      const varSetData = payload.data || payload
      const varName = varSetData.name || ''
      const varValue = varSetData.value || ''
      const varValueStr = typeof varValue === 'string' ? varValue : JSON.stringify(varValue)
      
      // 检测是否是交互式命令输出（包含选择提示）
      const isInteractivePrompt = detectInteractivePrompt(varValueStr)
      
      if (isInteractivePrompt) {
        // 解析交互式提示并转换为统一交互格式
        const parsedPrompt = parseInteractivePrompt(varValueStr)
        const convertedInteraction: UnifiedInteractionData = {
          interaction_id: `var-interactive-${Date.now()}`,
          interaction_type: 'command',
          title: parsedPrompt.promptText || '请选择一个选项',
          description: varName,
          fields: parsedPrompt.options.length > 0 ? [{
            id: 'selection',
            label: '请选择',
            type: 'radio' as const,
            required: true,
            default_value: parsedPrompt.defaultOption,
            options: parsedPrompt.options.map(opt => ({
              value: opt,
              label: opt
            }))
          }] : [{
            id: 'input',
            label: '请输入',
            type: 'text' as const,
            required: true,
            default_value: parsedPrompt.defaultOption,
            placeholder: '请输入...'
          }],
          submit_button_text: '提交',
          cancel_button_text: parsedPrompt.defaultOption ? '使用默认值' : '取消',
          allow_cancel: true,
          context: {
            step_id: varSetData.step_id || 0,
            command: parsedPrompt.command || '',
            variable_name: varName
          }
        }
        
        interactionDialog.value = {
          show: true,
          data: convertedInteraction,
          formValues: { [convertedInteraction.fields[0].id]: convertedInteraction.fields[0].default_value }
        }
        // 在聊天区域也显示提示
        messages.value.push({
          id: 'var-interactive-' + Date.now(),
          type: 'user_input_required',
          content: '',
          timestamp: new Date(),
          interactiveData: {
            type: 'user_input_required',
            stepId: varSetData.step_id || 0,
            promptText: parsedPrompt.promptText || '请选择一个选项',
            options: parsedPrompt.options,
            promptType: parsedPrompt.options.length > 0 ? 'select' : 'input',
            defaultResponse: parsedPrompt.defaultOption
          }
        })
        addLog('warn', `⚠️ 检测到交互式提示，需要用户输入`)
      } else {
        // 普通变量设置
        messages.value.push({
          id: 'var-set-' + Date.now(),
          type: 'variable_event',
          content: '',
          timestamp: new Date(),
          variableData: {
            type: 'set',
            name: varName,
            value: varValue,
            valueType: varSetData.value_type || typeof varValue
          }
        })
        addLog('info', `📌 变量设置: ${varName} = ${varValueStr.substring(0, 50)}`)
      }
      scrollToBottom()
      break
    
    case 'variable_resolve':
      const varResolveData = payload.data || payload
      messages.value.push({
        id: 'var-resolve-' + Date.now(),
        type: 'variable_event',
        content: '',
        timestamp: new Date(),
        variableData: {
          type: 'resolve',
          originalArgs: varResolveData.original_args,
          resolvedArgs: varResolveData.resolved_args,
          variablesUsed: varResolveData.variables_used || []
        }
      })
      addLog('info', `🔗 变量解析: ${(varResolveData.variables_used || []).join(', ')}`)
      scrollToBottom()
      break
    
    // ========== 上下文事件 ==========
    case 'context_update':
      const ctxUpdateData = payload.data || payload
      addLog('info', `📋 上下文更新: ${ctxUpdateData.update_type || '状态变更'}`)
      break
    
    case 'context_compressed':
      const ctxCompressData = payload.data || payload
      addLog('info', `🗜️ 上下文压缩: ${ctxCompressData.original_tokens || '?'} → ${ctxCompressData.compressed_tokens || '?'} tokens`)
      break
    
    default:
      addLog('warn', `未知消息: ${msgType}`)
  }
}

// 发送消息
const sendMessage = () => {
  if (!inputMessage.value.trim() || !ws.value || ws.value.readyState !== WebSocket.OPEN) return
  const msg = inputMessage.value.trim()
  messages.value.push({ id: 'u-' + Date.now(), type: 'user', content: msg, timestamp: new Date() })
  scrollToBottom()
  ws.value.send(JSON.stringify({ type: 'chat', payload: { message: msg, conversation_id: config.conversationId || undefined, include_thinking: config.includeThinking }, request_id: 'req-' + Date.now() }))
  inputMessage.value = ''
  addLog('info', '已发送')
}

// 提交统一交互对话框
const submitInteraction = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !interactionDialog.value.data) return

  const interactionData = interactionDialog.value.data
  const formValues = interactionDialog.value.formValues

  // 发送用户交互响应
  ws.value.send(JSON.stringify({
    type: 'user_interaction_response',
    payload: {
      interaction_id: interactionData.interaction_id,
      values: formValues,
      cancelled: false
    },
    request_id: 'req-' + Date.now()
  }))

  // 关闭对话框
  interactionDialog.value.show = false
  interactionDialog.value.data = null
  interactionDialog.value.formValues = {}

  addLog('success', '已提交用户响应')
}

// 取消统一交互对话框
const cancelInteraction = () => {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN || !interactionDialog.value.data) return

  const interactionData = interactionDialog.value.data

  // 发送取消响应
  ws.value.send(JSON.stringify({
    type: 'user_interaction_response',
    payload: {
      interaction_id: interactionData.interaction_id,
      values: {},
      cancelled: true
    },
    request_id: 'req-' + Date.now()
  }))

  // 关闭对话框
  interactionDialog.value.show = false
  interactionDialog.value.data = null
  interactionDialog.value.formValues = {}

  addLog('info', '已取消用户交互')
}

const sendPing = () => { if (ws.value?.readyState === WebSocket.OPEN) ws.value.send(JSON.stringify({ type: 'ping' })) }
const clearMessages = () => { messages.value = []; currentStreamContent.value = ''; currentThinkingContent.value = ''; isInThinkTag.value = false; isAnalyzing.value = false; isProcessing.value = false; currentAssistantMsgId.value = ''; currentThinkingChainMsgId.value = ''; currentAnalysisMsgId.value = ''; executionPlan.value = null; toolCalls.value = []; todoList.value = null; fileTree.value = []; fileChanges.value = []; addLog('info', '已清空') }
const clearLogs = () => { logs.value = [] }

// 状态计算
const statusIcon = computed(() => ({ connected: CheckCircle, connecting: Loader2, error: XCircle, disconnected: WifiOff }[wsStatus.value]))
const statusColor = computed(() => ({ connected: 'text-green-500', connecting: 'text-yellow-500 animate-spin', error: 'text-red-500', disconnected: 'text-gray-400' }[wsStatus.value]))
const statusText = computed(() => ({ connected: '已连接', connecting: '连接中...', error: '连接失败', disconnected: '未连接' }[wsStatus.value]))

let heartbeatInterval: number | null = null
onMounted(() => { if (checkAuthentication()) initAfterLogin(); heartbeatInterval = window.setInterval(() => { if (ws.value?.readyState === WebSocket.OPEN) sendPing() }, 30000) })
onUnmounted(() => { if (heartbeatInterval) clearInterval(heartbeatInterval); disconnectWebSocket(); disconnectVnc() })
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 登录页面 -->
    <div v-if="!isAuthenticated" class="min-h-screen flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-xl border p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><Lock class="w-8 h-8 text-blue-600" /></div>
          <h1 class="text-2xl font-bold text-gray-800">沙箱测试环境</h1>
          <p class="text-gray-500 mt-2">请输入密码访问</p>
        </div>
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div class="relative">
            <input v-model="passwordInput" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12" :disabled="isLoggingIn" autofocus />
            <button type="button" @click="showPassword = !showPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <component :is="showPassword ? EyeOff : Eye" class="w-5 h-5" />
            </button>
          </div>
          <p v-if="loginError" class="text-red-500 text-sm">{{ loginError }}</p>
          <button type="submit" class="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2" :disabled="isLoggingIn || !passwordInput">
            <Loader2 v-if="isLoggingIn" class="w-5 h-5 animate-spin" />
            <span>{{ isLoggingIn ? '验证中...' : '进入系统' }}</span>
          </button>
        </form>
      </div>
    </div>

    <!-- 主界面 -->
    <div v-else class="flex flex-col h-screen">
      <!-- 顶部导航 -->
      <header class="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <RouterLink to="/" class="text-gray-500 hover:text-gray-700"><Home class="w-5 h-5" /></RouterLink>
          <h1 class="text-lg font-semibold text-gray-800">AI 沙箱助手</h1>
          <div class="flex items-center gap-2 text-sm">
            <component :is="statusIcon" :class="['w-4 h-4', statusColor]" />
            <span :class="statusColor">{{ statusText }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="reconnect" class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="重连"><RefreshCw class="w-5 h-5" /></button>
          <button @click="clearMessages" class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="清空"><Trash2 class="w-5 h-5" /></button>
        </div>
      </header>

      <!-- 主内容区 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 聊天区域 -->
        <div class="flex-1 flex flex-col">
          <!-- 消息列表 -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4" @click="handleMessagesClick">
            <div v-for="msg in messages" :key="msg.id" :class="['max-w-3xl', msg.type === 'user' ? 'ml-auto' : 'mr-auto']">
              <!-- 用户消息 -->
              <div v-if="msg.type === 'user'" class="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3">{{ msg.content }}</div>
              <!-- 助手消息 -->
              <div v-else-if="msg.type === 'assistant'" class="bg-white border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm assistant-message" v-html="renderMarkdown(msg.content)"></div>
              <!-- 系统消息 -->
              <div v-else-if="msg.type === 'system'" class="text-center text-sm text-gray-500 py-2">{{ msg.content }}</div>
              <!-- 错误消息 -->
              <div v-else-if="msg.type === 'error'" class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">{{ msg.content }}</div>
              <!-- 分析节点 - 已移除显示 -->
              <!-- 思考链 -->
              <div v-else-if="msg.type === 'thinking_chain'" class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div class="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                  <Loader2 v-if="isStreaming" class="w-4 h-4 animate-spin" />
                  <CheckCircle v-else class="w-4 h-4" />
                  <span>思考过程</span>
                </div>
                <p class="text-amber-600 text-sm whitespace-pre-wrap">{{ msg.content }}</p>
              </div>
              <!-- 工具执行展示 -->
              <div v-else-if="msg.type === 'tool_execution' && msg.toolData" class="bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200 rounded-xl px-4 py-3 w-full max-w-2xl">
                <!-- 头部：工具信息和状态 -->
                <div class="flex items-center gap-3 mb-3">
                  <!-- 工具图标 -->
                  <div :class="[
                    'w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm',
                    msg.toolData.status === 'running' ? 'bg-blue-100 ring-2 ring-blue-200' :
                    msg.toolData.status === 'success' ? (msg.toolData.hasWarning ? 'bg-yellow-100 ring-2 ring-yellow-200' : 'bg-green-100 ring-2 ring-green-200') : 'bg-red-100 ring-2 ring-red-200'
                  ]">
                    {{ getToolDisplayInfo(msg.toolData.tool).icon }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span :class="['font-semibold text-sm', getToolDisplayInfo(msg.toolData.tool).color]">
                        {{ getToolDisplayInfo(msg.toolData.tool).name }}
                      </span>
                      <span v-if="msg.toolData.stepId !== undefined" class="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                        步骤 #{{ msg.toolData.stepId }}
                      </span>
                      <span :class="[
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        msg.toolData.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        msg.toolData.status === 'success' ? (msg.toolData.hasWarning ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700') : 'bg-red-100 text-red-700'
                      ]">
                        {{ msg.toolData.status === 'running' ? '执行中' : msg.toolData.status === 'success' ? '成功' : '失败' }}
                      </span>
                      <!-- 警告标志 -->
                      <span v-if="msg.toolData.status === 'success' && msg.toolData.hasWarning" class="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ⚠️ 有警告
                      </span>
                    </div>
                    <p class="text-sm text-gray-600 mt-0.5">{{ msg.toolData.description }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="msg.toolData.executionTime" class="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {{ msg.toolData.executionTime }}ms
                    </span>
                    <Loader2 v-if="msg.toolData.status === 'running'" class="w-5 h-5 text-blue-500 animate-spin" />
                    <CheckCircle v-else-if="msg.toolData.status === 'success'" :class="msg.toolData.hasWarning ? 'w-5 h-5 text-yellow-500' : 'w-5 h-5 text-green-500'" />
                    <XCircle v-else class="w-5 h-5 text-red-500" />
                  </div>
                </div>
                
                <!-- 操作详情区域 -->
                <div class="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <!-- 调用参数 -->
                  <div class="px-3 py-2 border-b border-slate-100">
                    <div class="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <span class="font-medium">📋 调用参数</span>
                    </div>
                    <div class="text-xs font-mono bg-slate-50 rounded p-2 overflow-x-auto max-h-24">
                      <pre class="whitespace-pre-wrap break-all">{{ formatToolArguments(msg.toolData.tool, msg.toolData.arguments) }}</pre>
                    </div>
                  </div>
                  
                  <!-- 执行状态 -->
                  <div class="px-3 py-2">
                    <div v-if="msg.toolData.status === 'running'" class="flex items-center gap-3">
                      <div class="flex gap-1">
                        <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                        <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                        <span class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                      </div>
                      <span class="text-sm text-blue-600 font-medium">正在执行操作...</span>
                    </div>
                    <div v-else>
                      <div class="flex items-center gap-2 text-xs mb-2">
                        <span :class="msg.toolData.status === 'success' ? (msg.toolData.hasWarning ? 'text-yellow-600' : 'text-green-600') : 'text-red-600'" class="font-medium">
                          {{ msg.toolData.status === 'success' ? (msg.toolData.hasWarning ? '✓ 执行成功（有警告）' : '✓ 执行成功') : '✗ 执行失败' }}
                        </span>
                      </div>
                      <!-- 警告提示 -->
                      <div v-if="msg.toolData.hasWarning && msg.toolData.result" class="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div class="flex items-start gap-2">
                          <span class="text-yellow-600 text-sm">⚠️</span>
                          <div class="flex-1">
                            <p class="text-xs text-yellow-700 font-medium mb-1">执行成功但有警告信息</p>
                            <p class="text-xs text-yellow-600">命令已成功执行，但产生了一些警告信息。这通常不影响功能，但建议查看详情。</p>
                          </div>
                        </div>
                      </div>
                      <!-- 执行结果 -->
                      <div v-if="msg.toolData.result" class="mt-2">
                        <details class="group">
                          <summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                            <ChevronRight class="w-3 h-3 group-open:rotate-90 transition-transform" />
                            <span>查看执行结果</span>
                          </summary>
                          <div class="mt-2 p-2 bg-slate-50 rounded text-xs font-mono overflow-x-auto max-h-40">
                            <pre class="whitespace-pre-wrap break-all">{{ formatToolResult(msg.toolData.result) }}</pre>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 工具修复展示 -->
              <div v-else-if="msg.type === 'tool_fix' && msg.toolFixData" class="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 mb-2">
                  <!-- 状态图标 -->
                  <div :class="[
                    'w-8 h-8 rounded-lg flex items-center justify-center text-lg',
                    msg.toolFixData.status === 'fixing' ? 'bg-orange-100' :
                    msg.toolFixData.status === 'fixed' ? 'bg-green-100' : 'bg-red-100'
                  ]">
                    🔧
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-sm text-orange-700">
                        工具修复
                      </span>
                      <span class="text-xs bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded">
                        {{ getToolDisplayInfo(msg.toolFixData.tool).name }}
                      </span>
                      <span class="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        尝试 #{{ msg.toolFixData.fixAttempt }}
                      </span>
                      <Loader2 v-if="msg.toolFixData.status === 'fixing'" class="w-4 h-4 text-orange-500 animate-spin" />
                      <CheckCircle v-else-if="msg.toolFixData.status === 'fixed'" class="w-4 h-4 text-green-500" />
                      <XCircle v-else class="w-4 h-4 text-red-500" />
                    </div>
                  </div>
                </div>
                <!-- 错误信息 -->
                <div class="mt-2 p-2 bg-red-50 rounded-lg">
                  <p class="text-xs text-red-600 font-medium mb-1">❌ 错误原因:</p>
                  <p class="text-xs text-red-700">{{ msg.toolFixData.error }}</p>
                </div>
                <!-- 修复详情 -->
                <div v-if="msg.toolFixData.status === 'fixed'" class="mt-2 pt-2 border-t border-orange-200">
                  <div class="flex items-center gap-1 text-xs text-green-600 mb-2">
                    <CheckCircle class="w-3 h-3" />
                    <span>已修复</span>
                  </div>
                  <!-- 修复后的命令 -->
                  <div v-if="msg.toolFixData.fixedCommand" class="p-2 bg-green-50 rounded-lg mb-2">
                    <p class="text-xs text-green-700 font-medium mb-1">✓ 修复后命令:</p>
                    <code class="text-xs text-green-800 break-all">{{ msg.toolFixData.fixedCommand }}</code>
                  </div>
                  <!-- 修复说明 -->
                  <div v-if="msg.toolFixData.explanation" class="p-2 bg-blue-50 rounded-lg">
                    <p class="text-xs text-blue-700 font-medium mb-1">💡 修复说明:</p>
                    <p class="text-xs text-blue-600">{{ msg.toolFixData.explanation }}</p>
                  </div>
                </div>
                <!-- 修复中状态 -->
                <div v-else-if="msg.toolFixData.status === 'fixing'" class="mt-2 pt-2 border-t border-orange-200">
                  <div class="flex items-center gap-2 text-xs text-orange-600">
                    <div class="flex gap-1">
                      <span class="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                      <span class="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                      <span class="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
                    </div>
                    <span>AI 正在分析并修复...</span>
                  </div>
                </div>
              </div>
              <!-- 文件变更展示 -->
              <div v-else-if="msg.type === 'file_changes' && msg.fileChangesData" class="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-amber-700 text-sm font-medium mb-3">
                  <FileText class="w-4 h-4" />
                  <span>文件变更</span>
                  <span class="ml-auto text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                    {{ msg.fileChangesData.totalChanges }} 个文件
                  </span>
                </div>
                <div class="space-y-1.5 max-h-48 overflow-y-auto">
                  <div v-for="(change, idx) in msg.fileChangesData.changes" :key="idx"
                    :class="[
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm',
                      getFileChangeBgColor(change.changeType)
                    ]">
                    <span class="flex-shrink-0">{{ getFileChangeIcon(change.changeType) }}</span>
                    <span :class="['text-xs px-1.5 py-0.5 rounded', getFileStatusColor(change.changeType)]">
                      {{ getFileChangeLabel(change.changeType) }}
                    </span>
                    <span class="text-gray-700 truncate flex-1" :title="change.path">{{ change.path }}</span>
                  </div>
                </div>
              </div>
              <!-- 待办事项展示 -->
              <div v-else-if="msg.type === 'todo_list' && todoList" class="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-blue-700 text-sm font-medium mb-3">
                  <ListTodo class="w-4 h-4" />
                  <span>{{ todoList.title || '待办事项' }}</span>
                  <span class="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    {{ todoStats.completed }}/{{ todoStats.total }}
                  </span>
                </div>
                <div class="space-y-2">
                  <div v-for="item in todoList.items" :key="item.id"
                    :class="[
                      'flex items-start gap-2 p-2 rounded-lg transition-colors',
                      item.status === 'completed' ? 'bg-green-50' :
                      item.status === 'in_progress' ? 'bg-blue-100' :
                      item.status === 'failed' ? 'bg-red-50' : 'bg-white/60'
                    ]">
                    <component
                      :is="getTodoStatusIcon(item.status)"
                      :class="[
                        'w-4 h-4 mt-0.5 flex-shrink-0',
                        getTodoStatusColor(item.status),
                        item.status === 'in_progress' ? 'animate-spin' : ''
                      ]"
                    />
                    <span :class="[
                      'text-sm flex-1',
                      item.status === 'completed' ? 'text-green-700 line-through' :
                      item.status === 'failed' ? 'text-red-700' : 'text-gray-700'
                    ]">{{ item.content }}</span>
                  </div>
                </div>
                <div v-if="todoStats.in_progress > 0" class="mt-3 pt-2 border-t border-blue-200">
                  <div class="flex items-center gap-2 text-xs text-blue-600">
                    <Loader2 class="w-3 h-3 animate-spin" />
                    <span>正在执行中...</span>
                  </div>
                </div>
              </div>
              <!-- 交互式提示展示 -->
              <div v-else-if="msg.type === 'interactive_prompt' && msg.interactiveData" class="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-cyan-700 text-sm font-medium mb-2">
                  <span class="text-lg">🔔</span>
                  <span>交互式提示</span>
                  <span v-if="msg.interactiveData.stepId !== undefined" class="text-xs bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded-full">
                    步骤 #{{ msg.interactiveData.stepId }}
                  </span>
                </div>
                <div class="bg-white rounded-lg p-3 border border-cyan-100">
                  <p class="text-sm text-gray-700 mb-2">{{ msg.interactiveData.promptText }}</p>
                  <div v-if="msg.interactiveData.options && msg.interactiveData.options.length" class="mt-2">
                    <p class="text-xs text-gray-500 mb-1">可选项:</p>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="(opt, idx) in msg.interactiveData.options" :key="idx" class="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">
                        {{ opt }}
                      </span>
                    </div>
                  </div>
                  <div v-if="msg.interactiveData.command" class="mt-2 pt-2 border-t border-cyan-100">
                    <p class="text-xs text-gray-500">命令:</p>
                    <code class="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded block mt-1">{{ msg.interactiveData.command }}</code>
                  </div>
                </div>
              </div>
              <!-- 交互式响应展示 -->
              <div v-else-if="msg.type === 'interactive_response' && msg.interactiveData" class="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                  <CheckCircle class="w-4 h-4" />
                  <span>{{ msg.interactiveData.autoResponded ? '自动响应' : '用户输入' }}</span>
                  <span v-if="msg.interactiveData.stepId !== undefined" class="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                    步骤 #{{ msg.interactiveData.stepId }}
                  </span>
                </div>
                <div class="bg-white rounded-lg p-3 border border-green-100">
                  <p class="text-sm text-gray-700 font-medium">
                    {{ msg.interactiveData.response || msg.interactiveData.userInput }}
                  </p>
                  <p v-if="msg.interactiveData.reasoning" class="text-xs text-gray-500 mt-2 pt-2 border-t border-green-100">
                    💡 {{ msg.interactiveData.reasoning }}
                  </p>
                </div>
              </div>
              <!-- 需要用户输入展示 -->
              <div v-else-if="msg.type === 'user_input_required' && msg.interactiveData" class="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-300 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-yellow-700 text-sm font-medium mb-2">
                  <span class="text-lg animate-pulse">⚠️</span>
                  <span>需要您的输入</span>
                  <span v-if="msg.interactiveData.stepId !== undefined" class="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">
                    步骤 #{{ msg.interactiveData.stepId }}
                  </span>
                </div>
                <div class="bg-white rounded-lg p-3 border border-yellow-200">
                  <p class="text-sm text-gray-700 font-medium mb-2">{{ msg.interactiveData.promptText }}</p>
                  <div v-if="msg.interactiveData.options && msg.interactiveData.options.length" class="space-y-1">
                    <div v-for="(opt, idx) in msg.interactiveData.options" :key="idx" class="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                      <span class="text-sm font-medium text-yellow-700">{{ opt }}</span>
                      <span v-if="msg.interactiveData.optionsExplanation && msg.interactiveData.optionsExplanation[idx]" class="text-xs text-gray-500">
                        - {{ msg.interactiveData.optionsExplanation[idx].description }}
                      </span>
                    </div>
                  </div>
                  <p v-if="msg.interactiveData.defaultResponse" class="text-xs text-gray-500 mt-2">
                    默认: {{ msg.interactiveData.defaultResponse }}
                  </p>
                </div>
              </div>
              <!-- 流程节点展示 -->
              <div v-else-if="msg.type === 'flow_node' && msg.flowNodeData" class="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-indigo-700 text-sm font-medium">
                  <span class="text-lg">{{
                    msg.flowNodeData.node === 'planning' ? '📋' :
                    msg.flowNodeData.node === 'execution' ? '⚡' :
                    msg.flowNodeData.node === 'step_execution' ? '🔧' :
                    msg.flowNodeData.node === 'replanning' ? '🔄' :
                    msg.flowNodeData.node === 'summarizing' ? '📝' :
                    msg.flowNodeData.node === 'analysis' ? '🔍' :
                    msg.flowNodeData.node === 'sandbox_creation' ? '🖥️' :
                    msg.flowNodeData.node === 'tool_execution' ? '🔧' :
                    msg.flowNodeData.node === 'verification' ? '✅' : '📌'
                  }}</span>
                  <span>{{
                    msg.flowNodeData.node === 'planning' ? '规划阶段' :
                    msg.flowNodeData.node === 'execution' ? '执行阶段' :
                    msg.flowNodeData.node === 'step_execution' ? '步骤执行' :
                    msg.flowNodeData.node === 'replanning' ? '重新规划' :
                    msg.flowNodeData.node === 'summarizing' ? '总结阶段' :
                    msg.flowNodeData.node === 'analysis' ? '分析阶段' :
                    msg.flowNodeData.node === 'sandbox_creation' ? '沙箱创建' :
                    msg.flowNodeData.node === 'tool_execution' ? '工具执行' :
                    msg.flowNodeData.node === 'verification' ? '结果验证' : msg.flowNodeData.node
                  }}</span>
                  <span :class="[
                    'text-xs px-2 py-0.5 rounded-full',
                    msg.flowNodeData.status === 'started' ? 'bg-blue-100 text-blue-600' :
                    msg.flowNodeData.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  ]">
                    {{ msg.flowNodeData.status === 'started' ? '进行中' : msg.flowNodeData.status === 'completed' ? '已完成' : '失败' }}
                  </span>
                  <Loader2 v-if="msg.flowNodeData.status === 'started'" class="w-4 h-4 text-indigo-500 animate-spin ml-auto" />
                  <CheckCircle v-else-if="msg.flowNodeData.status === 'completed'" class="w-4 h-4 text-green-500 ml-auto" />
                  <XCircle v-else class="w-4 h-4 text-red-500 ml-auto" />
                </div>
                <p v-if="msg.flowNodeData.message" class="text-sm text-indigo-600 mt-2">{{ msg.flowNodeData.message }}</p>
              </div>
              <!-- 验证结果展示 -->
              <div v-else-if="msg.type === 'verification' && msg.verificationData" class="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-violet-700 text-sm font-medium mb-2">
                  <span class="text-lg">🔍</span>
                  <span>{{ msg.verificationData.type === 'start' ? '开始验证' : '验证结果' }}</span>
                  <span v-if="msg.verificationData.type === 'result'" :class="[
                    'text-xs px-2 py-0.5 rounded-full ml-auto',
                    msg.verificationData.isValid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  ]">
                    {{ msg.verificationData.isValid ? '✓ 通过' : '✗ 失败' }}
                  </span>
                </div>
                <div class="bg-white rounded-lg p-3 border border-violet-100">
                  <p v-if="msg.verificationData.expected" class="text-sm text-gray-700">
                    <span class="text-violet-600 font-medium">预期:</span> {{ msg.verificationData.expected }}
                  </p>
                  <p v-if="msg.verificationData.actualPreview" class="text-sm text-gray-700 mt-1">
                    <span class="text-violet-600 font-medium">实际:</span> {{ msg.verificationData.actualPreview }}
                  </p>
                </div>
              </div>
              <!-- LLM 调用展示 -->
              <div v-else-if="msg.type === 'llm_call' && msg.llmData" class="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-rose-700 text-sm font-medium mb-2">
                  <span class="text-lg">🤖</span>
                  <span>LLM 调用</span>
                  <span :class="[
                    'text-xs px-2 py-0.5 rounded-full ml-auto',
                    msg.llmData.type === 'call' ? 'bg-rose-100 text-rose-600' : 'bg-green-100 text-green-600'
                  ]">
                    {{ msg.llmData.type === 'call' ? '调用中' : '已响应' }}
                  </span>
                  <Loader2 v-if="msg.llmData.type === 'call'" class="w-4 h-4 text-rose-500 animate-spin" />
                  <CheckCircle v-else class="w-4 h-4 text-green-500" />
                </div>
                <div class="bg-white rounded-lg p-3 border border-rose-100">
                  <p v-if="msg.llmData.purpose" class="text-sm text-gray-700">
                    <span class="text-rose-600 font-medium">目的:</span> {{ msg.llmData.purpose }}
                  </p>
                  <p v-if="msg.llmData.context" class="text-xs text-gray-500 mt-1">{{ msg.llmData.context }}</p>
                  <p v-if="msg.llmData.responsePreview" class="text-sm text-gray-600 mt-2 pt-2 border-t border-rose-100">
                    {{ msg.llmData.responsePreview }}...
                  </p>
                </div>
              </div>
              <!-- 变量事件展示 -->
              <div v-else-if="msg.type === 'variable_event' && msg.variableData" class="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl px-4 py-3 w-full max-w-lg">
                <div class="flex items-center gap-2 text-teal-700 text-sm font-medium mb-2">
                  <span class="text-lg">{{ msg.variableData.type === 'set' ? '📌' : '🔗' }}</span>
                  <span>{{ msg.variableData.type === 'set' ? '变量设置' : '变量解析' }}</span>
                </div>
                <div class="bg-white rounded-lg p-3 border border-teal-100">
                  <div v-if="msg.variableData.type === 'set'">
                    <p class="text-sm text-gray-700">
                      <span class="text-teal-600 font-medium font-mono">{{ msg.variableData.name }}</span>
                      <span class="text-gray-400 mx-2">=</span>
                      <span class="text-gray-600 font-mono text-xs bg-gray-50 px-2 py-0.5 rounded">
                        {{ typeof msg.variableData.value === 'object' ? JSON.stringify(msg.variableData.value).substring(0, 50) : msg.variableData.value }}
                      </span>
                    </p>
                    <p class="text-xs text-gray-400 mt-1">类型: {{ msg.variableData.valueType }}</p>
                  </div>
                  <div v-else>
                    <p v-if="msg.variableData.variablesUsed && msg.variableData.variablesUsed.length" class="text-sm text-gray-700 mb-2">
                      使用变量:
                      <span v-for="(v, idx) in msg.variableData.variablesUsed" :key="idx" class="text-teal-600 font-mono text-xs bg-teal-50 px-1.5 py-0.5 rounded mx-0.5">
                        {{ v }}
                      </span>
                    </p>
                    <details v-if="msg.variableData.resolvedArgs" class="group">
                      <summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                        <ChevronRight class="w-3 h-3 group-open:rotate-90 transition-transform" />
                        <span>查看解析结果</span>
                      </summary>
                      <div class="mt-2 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto max-h-32">
                        <pre class="whitespace-pre-wrap break-all">{{ JSON.stringify(msg.variableData.resolvedArgs, null, 2) }}</pre>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
            <!-- 流式输出指示器 -->
            <div v-if="(isStreaming || isProcessing) && !currentStreamContent.trim()" class="flex items-center gap-2 text-gray-500">
              <Loader2 class="w-4 h-4 animate-spin" />
              <span class="text-sm">{{ isProcessing && !isStreaming ? '正在处理...' : 'AI 正在思考...' }}</span>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="border-t bg-white p-4">
            <div class="max-w-3xl mx-auto flex gap-3">
              <input v-model="inputMessage" @keyup.enter="sendMessage" type="text" placeholder="输入消息..." class="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" :disabled="wsStatus !== 'connected' || isStreaming || isProcessing" />
              <button @click="sendMessage" class="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" :disabled="wsStatus !== 'connected' || isStreaming || isProcessing || !inputMessage.trim()">
                <Send class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧面板 -->
        <div class="w-80 border-l bg-white flex flex-col">
          <!-- 标签页 -->
          <div class="flex border-b">
            <button @click="activeSideTab = 'todo'" :class="['flex-1 py-3 text-sm font-medium border-b-2 transition-colors', activeSideTab === 'todo' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']">
              <ListTodo class="w-4 h-4 mx-auto" />
            </button>
            <button @click="activeSideTab = 'files'" :class="['flex-1 py-3 text-sm font-medium border-b-2 transition-colors', activeSideTab === 'files' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']">
              <FolderTree class="w-4 h-4 mx-auto" />
            </button>
            <button @click="activeSideTab = 'tools'" :class="['flex-1 py-3 text-sm font-medium border-b-2 transition-colors', activeSideTab === 'tools' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']">
              <Wrench class="w-4 h-4 mx-auto" />
            </button>
            <button @click="activeSideTab = 'vnc'" :class="['flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative', activeSideTab === 'vnc' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700']">
              <Tv class="w-4 h-4 mx-auto" />
              <span v-if="vncStatus === 'connected'" class="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></span>
              <span v-else-if="vncStatus === 'connecting'" class="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            </button>
          </div>

          <!-- 面板内容 -->
          <div class="flex-1 overflow-y-auto p-4">
            <!-- 待办事项 -->
            <div v-if="activeSideTab === 'todo'">
              <h3 class="font-medium text-gray-800 mb-3">待办事项</h3>
              <div v-if="todoList" class="space-y-2">
                <div class="flex gap-2 text-xs text-gray-500 mb-3">
                  <span class="bg-gray-100 px-2 py-1 rounded">总计: {{ todoStats.total }}</span>
                  <span class="bg-green-100 text-green-700 px-2 py-1 rounded">完成: {{ todoStats.completed }}</span>
                  <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded">进行: {{ todoStats.in_progress }}</span>
                </div>
                <div v-for="item in todoList.items" :key="item.id" class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <component :is="getTodoStatusIcon(item.status)" :class="['w-4 h-4 mt-0.5 flex-shrink-0', getTodoStatusColor(item.status), item.status === 'in_progress' ? 'animate-spin' : '']" />
                  <span class="text-sm text-gray-700">{{ item.content }}</span>
                </div>
              </div>
              <p v-else class="text-gray-400 text-sm">暂无待办事项</p>
            </div>

            <!-- 文件树 -->
            <div v-else-if="activeSideTab === 'files'">
              <div class="flex items-center justify-between mb-3">
                <h3 class="font-medium text-gray-800">文件树</h3>
                <button
                  v-if="fileTree.length && sandboxInfo?.session_id"
                  @click="downloadAllFiles"
                  :disabled="isDownloading"
                  class="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  title="下载所有文件"
                >
                  <Loader2 v-if="isDownloading" class="w-3 h-3 animate-spin" />
                  <Archive v-else class="w-3 h-3" />
                  <span>全部下载</span>
                </button>
              </div>
              <div v-if="fileTree.length" class="space-y-1">
                <div
                  v-for="node in flattenedFileTree"
                  :key="node.path"
                  class="flex items-center gap-1 py-1 px-2 hover:bg-gray-100 rounded group relative"
                  :style="{ paddingLeft: `${node.depth * 16 + 8}px` }"
                >
                  <div
                    class="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                    @click="node.type === 'directory' && toggleFolder(node.path)"
                  >
                    <!-- 目录：显示展开/收起箭头，文件：占位符保持对齐 -->
                    <component
                      v-if="node.type === 'directory'"
                      :is="expandedFolders.has(node.path) ? ChevronDown : ChevronRight"
                      class="w-4 h-4 text-gray-400 flex-shrink-0"
                    />
                    <span v-else class="w-4 h-4 flex-shrink-0"></span>
                    <!-- 文件/文件夹图标 -->
                    <component
                      :is="node.type === 'directory' ? Folder : File"
                      :class="[
                        'w-4 h-4 flex-shrink-0',
                        node.type === 'directory' ? 'text-yellow-500' : 'text-gray-500'
                      ]"
                    />
                    <span class="text-sm text-gray-700 truncate">{{ node.name }}</span>
                  </div>
                  <!-- 文件下载按钮（仅文件显示，文件夹不显示下载按钮） -->
                  <button
                    v-if="sandboxInfo?.session_id && node.type === 'file'"
                    @click.stop="downloadSingleFile(node)"
                    :disabled="downloadingFile === node.path"
                    class="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all disabled:opacity-50"
                    title="下载文件"
                  >
                    <Loader2 v-if="downloadingFile === node.path" class="w-4 h-4 animate-spin" />
                    <Download v-else class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p v-if="!fileTree.length" class="text-gray-400 text-sm">暂无文件</p>
            </div>

            <!-- 工具调用 -->
            <div v-else-if="activeSideTab === 'tools'">
              <h3 class="font-medium text-gray-800 mb-3">工具调用</h3>
              <div v-if="toolCalls.length" class="space-y-2">
                <div v-for="tc in toolCalls" :key="tc.id" class="p-2 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <Loader2 v-if="tc.status === 'running'" class="w-4 h-4 text-blue-500 animate-spin" />
                    <CheckCircle v-else-if="tc.status === 'success'" class="w-4 h-4 text-green-500" />
                    <XCircle v-else class="w-4 h-4 text-red-500" />
                    <span class="text-sm font-medium text-gray-700">{{ tc.tool }}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1 truncate">{{ formatPathForDisplay(JSON.stringify(tc.arguments)) }}</p>
                </div>
              </div>
              <p v-else class="text-gray-400 text-sm">暂无工具调用</p>
            </div>

            <!-- VNC 远程桌面 -->
            <div v-else-if="activeSideTab === 'vnc'" class="h-full flex flex-col -m-4">
              <!-- VNC 头部控制栏 -->
              <div class="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                <div class="flex items-center gap-2">
                  <Tv class="w-4 h-4 text-gray-600" />
                  <span class="text-sm font-medium text-gray-700">远程桌面</span>
                  <!-- 模式切换按钮（带状态指示） -->
                  <div class="flex items-center bg-gray-200 rounded-lg p-0.5 text-xs">
                    <button
                      @click="vncMode = 'iframe'"
                      :class="['px-2 py-1 rounded transition-colors flex items-center gap-1', vncMode === 'iframe' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                    >
                      <span :class="[
                        'w-1.5 h-1.5 rounded-full',
                        iframeStatus === 'connected' ? 'bg-green-500' :
                        iframeStatus === 'loading' ? 'bg-yellow-500 animate-pulse' :
                        iframeStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      ]"></span>
                      iframe
                    </button>
                    <button
                      @click="vncMode = 'novnc'"
                      :class="['px-2 py-1 rounded transition-colors flex items-center gap-1', vncMode === 'novnc' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
                    >
                      <span :class="[
                        'w-1.5 h-1.5 rounded-full',
                        vncStatus === 'connected' ? 'bg-green-500' :
                        vncStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                        vncStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      ]"></span>
                      noVNC
                    </button>
                  </div>
                  <!-- 当前模式状态 -->
                  <span :class="[
                    'text-xs px-2 py-0.5 rounded-full',
                    (vncMode === 'iframe' ? iframeStatus : vncStatus) === 'connected' ? 'bg-green-100 text-green-700' :
                    (vncMode === 'iframe' ? iframeStatus : vncStatus) === 'connecting' || (vncMode === 'iframe' ? iframeStatus : vncStatus) === 'loading' ? 'bg-yellow-100 text-yellow-700' :
                    (vncMode === 'iframe' ? iframeStatus : vncStatus) === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  ]">
                    {{ vncMode === 'iframe'
                      ? (iframeStatus === 'connected' ? '已连接' : iframeStatus === 'loading' ? '加载中' : iframeStatus === 'error' ? '错误' : '未连接')
                      : (vncStatus === 'connected' ? '已连接' : vncStatus === 'connecting' ? '连接中' : vncStatus === 'error' ? '错误' : '未连接')
                    }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    v-if="sandboxInfo?.vnc_url && vncStatus !== 'connected'"
                    @click="connectVnc"
                    :disabled="vncStatus === 'connecting'"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                    title="连接 VNC"
                  >
                    <RefreshCw :class="['w-4 h-4', vncStatus === 'connecting' ? 'animate-spin' : '']" />
                  </button>
                  <button
                    v-if="vncStatus === 'connected'"
                    @click="disconnectVnc"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="断开连接"
                  >
                    <XCircle class="w-4 h-4" />
                  </button>
                  <button
                    @click="toggleVncFullscreen"
                    class="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="全屏"
                  >
                    <component :is="vncFullscreen ? Minimize2 : Maximize2" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- VNC 显示区域 -->
              <div class="flex-1 bg-black relative overflow-hidden">
                <!-- iframe 模式 -->
                <iframe
                  v-if="vncMode === 'iframe' && sandboxInfo?.iframe_url"
                  :src="sandboxInfo.iframe_url"
                  class="w-full h-full border-0"
                  allow="clipboard-read; clipboard-write"
                  @loadstart="iframeStatus = 'loading'; addLog('info', '[iframe] 开始加载...')"
                  @load="iframeStatus = 'connected'; addLog('success', '[iframe] 加载完成，已连接')"
                  @error="iframeStatus = 'error'; addLog('error', '[iframe] 加载失败')"
                ></iframe>

                <!-- iframe 加载中遮罩 -->
                <div
                  v-if="vncMode === 'iframe' && sandboxInfo?.iframe_url && iframeStatus === 'loading'"
                  class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-black/50"
                >
                  <Loader2 class="w-8 h-8 animate-spin mb-2" />
                  <p class="text-sm">iframe 加载中...</p>
                </div>

                <!-- noVNC 容器模式 -->
                <div
                  v-else-if="vncMode === 'novnc'"
                  ref="vncContainer"
                  class="w-full h-full"
                  :class="{ 'cursor-pointer': vncStatus === 'connected' }"
                ></div>

                <!-- iframe 模式但无 URL -->
                <div
                  v-else-if="vncMode === 'iframe' && !sandboxInfo?.iframe_url"
                  class="absolute inset-0 flex flex-col items-center justify-center text-gray-400"
                >
                  <Monitor class="w-12 h-12 mb-2 opacity-50" />
                  <p class="text-sm">等待沙箱启动...</p>
                  <p class="text-xs mt-1">沙箱就绪后将显示桌面</p>
                </div>

                <!-- noVNC 未连接状态 -->
                <div
                  v-if="vncMode === 'novnc' && vncStatus === 'disconnected' && !sandboxInfo?.vnc_url"
                  class="absolute inset-0 flex flex-col items-center justify-center text-gray-400"
                >
                  <Monitor class="w-12 h-12 mb-2 opacity-50" />
                  <p class="text-sm">等待沙箱启动...</p>
                  <p class="text-xs mt-1">沙箱就绪后可连接 VNC</p>
                </div>

                <!-- noVNC 连接中状态 -->
                <div
                  v-else-if="vncMode === 'novnc' && vncStatus === 'connecting'"
                  class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-black/50"
                >
                  <Loader2 class="w-8 h-8 animate-spin mb-2" />
                  <p class="text-sm">正在连接...</p>
                </div>

                <!-- noVNC 错误状态 -->
                <div
                  v-else-if="vncMode === 'novnc' && vncStatus === 'error'"
                  class="absolute inset-0 flex flex-col items-center justify-center text-red-400"
                >
                  <XCircle class="w-12 h-12 mb-2 opacity-50" />
                  <p class="text-sm">连接失败</p>
                  <button
                    @click="connectVnc"
                    class="mt-2 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    重试
                  </button>
                </div>

                <!-- noVNC 未连接但有 URL -->
                <div
                  v-else-if="vncMode === 'novnc' && vncStatus === 'disconnected' && sandboxInfo?.vnc_url"
                  class="absolute inset-0 flex flex-col items-center justify-center text-gray-400"
                >
                  <Monitor class="w-12 h-12 mb-2 opacity-50" />
                  <p class="text-sm">VNC 已断开</p>
                  <button
                    @click="connectVnc"
                    class="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    连接 VNC
                  </button>
                </div>
              </div>

              <!-- VNC 信息 -->
              <div v-if="sandboxInfo?.has_sandbox" class="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
                <div class="flex items-center justify-between">
                  <span>会话: {{ sandboxInfo.session_id?.substring(0, 8) }}...</span>
                  <div class="flex items-center gap-3">
                    <a
                      v-if="sandboxInfo.iframe_url"
                      :href="sandboxInfo.iframe_url"
                      target="_blank"
                      class="flex items-center gap-1 text-green-600 hover:text-green-700"
                    >
                      <Monitor class="w-3 h-3" />
                      桌面
                    </a>
                    <a
                      v-if="sandboxInfo.vnc_url"
                      :href="sandboxInfo.vnc_url"
                      target="_blank"
                      class="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink class="w-3 h-3" />
                      VNC
                    </a>
                  </div>
                </div>
              </div>
            </div>
            </div>

          <!-- 沙箱信息 -->
          <div v-if="sandboxInfo?.has_sandbox" class="border-t p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">沙箱环境</span>
              <button v-if="sandboxInfo.vnc_url" @click="showVncEmbed = !showVncEmbed" class="text-xs text-blue-600 hover:text-blue-700">
                {{ showVncEmbed ? '隐藏' : '显示' }} VNC
              </button>
            </div>
            <div class="text-xs text-gray-500 space-y-1">
              <p>会话: {{ sandboxInfo.session_id }}</p>
              <p v-if="sandboxInfo.vnc_password">密码: {{ sandboxInfo.vnc_password }}</p>
            </div>
            <div v-if="showVncEmbed && sandboxInfo.vnc_url" class="mt-2">
              <a :href="sandboxInfo.vnc_url" target="_blank" class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                <ExternalLink class="w-4 h-4" />
                打开 VNC
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- 日志面板 -->
      <div class="border-t bg-gray-900 text-gray-300 h-32 overflow-y-auto p-2 text-xs font-mono">
        <div class="flex justify-between items-center mb-2">
          <span class="text-gray-500">日志</span>
          <button @click="clearLogs" class="text-gray-500 hover:text-gray-300">清空</button>
        </div>
        <div v-for="(log, idx) in logs" :key="idx" class="flex gap-2">
          <span class="text-gray-500">{{ log.time }}</span>
          <span :class="{ 'text-blue-400': log.level === 'info', 'text-yellow-400': log.level === 'warn', 'text-red-400': log.level === 'error', 'text-green-400': log.level === 'success' }">[{{ log.level }}]</span>
          <span>{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- 统一交互对话框 -->
    <Teleport to="body">
      <div v-if="interactionDialog.show && interactionDialog.data" class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="interactionDialog.data.allow_cancel && cancelInteraction()"></div>
        
        <!-- 对话框内容 -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <!-- 头部 -->
          <div :class="[
            'px-6 py-4',
            interactionDialog.data.interaction_type === 'clarification' ? 'bg-gradient-to-r from-blue-400 to-cyan-500' :
            interactionDialog.data.interaction_type === 'command' ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
            interactionDialog.data.interaction_type === 'confirmation' ? 'bg-gradient-to-r from-orange-400 to-red-500' :
            'bg-gradient-to-r from-purple-400 to-pink-500'
          ]">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span class="text-2xl">{{
                  interactionDialog.data.interaction_type === 'clarification' ? '💬' :
                  interactionDialog.data.interaction_type === 'command' ? '⚙️' :
                  interactionDialog.data.interaction_type === 'confirmation' ? '⚠️' : '📝'
                }}</span>
              </div>
              <div>
                <h3 class="text-white font-semibold text-lg">{{ interactionDialog.data.title }}</h3>
                <p v-if="interactionDialog.data.description" class="text-white/80 text-sm">
                  {{ interactionDialog.data.description }}
                </p>
              </div>
            </div>
          </div>
          
          <!-- 内容区域 -->
          <div class="p-6 space-y-4">
            <!-- 动态渲染表单字段 -->
            <div v-for="field in interactionDialog.data.fields" :key="field.id" class="space-y-2">
              <label class="block text-sm font-medium text-gray-700">
                {{ field.label }}
                <span v-if="field.required" class="text-red-500">*</span>
              </label>
              
              <!-- 文本输入 -->
              <input
                v-if="field.type === 'text'"
                v-model="interactionDialog.formValues[field.id]"
                type="text"
                :placeholder="field.placeholder"
                :required="field.required"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <!-- 多行文本 -->
              <textarea
                v-else-if="field.type === 'textarea'"
                v-model="interactionDialog.formValues[field.id]"
                :placeholder="field.placeholder"
                :required="field.required"
                rows="3"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              ></textarea>
              
              <!-- 数字输入 -->
              <input
                v-else-if="field.type === 'number'"
                v-model.number="interactionDialog.formValues[field.id]"
                type="number"
                :placeholder="field.placeholder"
                :required="field.required"
                :min="field.validation?.min"
                :max="field.validation?.max"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              <!-- 下拉选择 -->
              <select
                v-else-if="field.type === 'select'"
                v-model="interactionDialog.formValues[field.id]"
                :required="field.required"
                class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">请选择...</option>
                <option v-for="opt in field.options" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              
              <!-- 单选按钮 -->
              <div v-else-if="field.type === 'radio'" class="space-y-2">
                <div
                  v-for="opt in field.options"
                  :key="opt.value"
                  @click="interactionDialog.formValues[field.id] = opt.value"
                  :class="[
                    'p-3 rounded-lg border-2 cursor-pointer transition-all',
                    interactionDialog.formValues[field.id] === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  ]"
                >
                  <div class="flex items-start gap-3">
                    <div :class="[
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                      interactionDialog.formValues[field.id] === opt.value
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    ]">
                      <div v-if="interactionDialog.formValues[field.id] === opt.value" class="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    <div class="flex-1">
                      <p class="font-medium text-gray-700">{{ opt.label }}</p>
                      <p v-if="opt.description" class="text-sm text-gray-500 mt-0.5">{{ opt.description }}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 复选框 -->
              <div v-else-if="field.type === 'checkbox'" class="space-y-2">
                <label
                  v-for="opt in field.options"
                  :key="opt.value"
                  class="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :value="opt.value"
                    v-model="interactionDialog.formValues[field.id]"
                    class="mt-1"
                  />
                  <div class="flex-1">
                    <p class="font-medium text-gray-700">{{ opt.label }}</p>
                    <p v-if="opt.description" class="text-sm text-gray-500 mt-0.5">{{ opt.description }}</p>
                  </div>
                </label>
              </div>
              
              <!-- 确认按钮 -->
              <div v-else-if="field.type === 'confirm'" class="flex items-center gap-2">
                <input
                  type="checkbox"
                  v-model="interactionDialog.formValues[field.id]"
                  :required="field.required"
                  class="w-4 h-4"
                />
                <span class="text-sm text-gray-700">{{ field.label }}</span>
              </div>
            </div>
          </div>
          
          <!-- 底部按钮 -->
          <div class="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
            <button
              v-if="interactionDialog.data.allow_cancel"
              @click="cancelInteraction"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              {{ interactionDialog.data.cancel_button_text }}
            </button>
            <button
              @click="submitInteraction"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Send class="w-4 h-4" />
              <span>{{ interactionDialog.data.submit_button_text }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- VNC 全屏覆盖层 -->
    <Teleport to="body">
      <div v-if="vncFullscreen" class="fixed inset-0 z-50 bg-black flex flex-col">
        <!-- 全屏头部 -->
        <div class="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
          <div class="flex items-center gap-3">
            <Tv class="w-5 h-5 text-gray-400" />
            <span class="text-sm font-medium text-gray-200">远程桌面</span>
            <span :class="[
              'text-xs px-2 py-0.5 rounded-full',
              vncStatus === 'connected' ? 'bg-green-900 text-green-300' :
              vncStatus === 'connecting' ? 'bg-yellow-900 text-yellow-300' :
              vncStatus === 'error' ? 'bg-red-900 text-red-300' : 'bg-gray-700 text-gray-400'
            ]">
              {{ vncStatus === 'connected' ? '已连接' : vncStatus === 'connecting' ? '连接中' : vncStatus === 'error' ? '错误' : '未连接' }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="sandboxInfo?.vnc_url && vncStatus !== 'connected'"
              @click="connectVnc"
              :disabled="vncStatus === 'connecting'"
              class="p-2 text-blue-400 hover:bg-gray-800 rounded-lg disabled:opacity-50"
              title="连接 VNC"
            >
              <RefreshCw :class="['w-5 h-5', vncStatus === 'connecting' ? 'animate-spin' : '']" />
            </button>
            <button
              v-if="vncStatus === 'connected'"
              @click="disconnectVnc"
              class="p-2 text-red-400 hover:bg-gray-800 rounded-lg"
              title="断开连接"
            >
              <XCircle class="w-5 h-5" />
            </button>
            <button
              @click="toggleVncFullscreen"
              class="p-2 text-gray-400 hover:bg-gray-800 rounded-lg"
              title="退出全屏"
            >
              <Minimize2 class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- 全屏 VNC 显示区域 -->
        <div class="flex-1 relative overflow-hidden">
          <!-- iframe 模式 (优先使用) -->
          <iframe
            v-if="sandboxInfo?.iframe_url"
            :src="sandboxInfo.iframe_url"
            class="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
          ></iframe>

          <!-- noVNC 容器 (备用) -->
          <div
            v-else
            ref="vncFullscreenContainer"
            class="w-full h-full"
            :class="{ 'cursor-pointer': vncStatus === 'connected' }"
          ></div>

          <!-- 未连接状态 -->
          <div
            v-if="!sandboxInfo?.iframe_url && vncStatus === 'disconnected'"
            class="absolute inset-0 flex flex-col items-center justify-center text-gray-500"
          >
            <Monitor class="w-16 h-16 mb-3 opacity-50" />
            <p class="text-lg">{{ sandboxInfo?.vnc_url ? 'VNC 已断开' : '等待沙箱启动...' }}</p>
            <button
              v-if="sandboxInfo?.vnc_url"
              @click="connectVnc"
              class="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              重新连接
            </button>
          </div>

          <!-- 连接中状态 -->
          <div
            v-else-if="!sandboxInfo?.iframe_url && vncStatus === 'connecting'"
            class="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-black/50"
          >
            <Loader2 class="w-12 h-12 animate-spin mb-3" />
            <p class="text-lg">正在连接...</p>
          </div>

          <!-- 错误状态 -->
          <div
            v-else-if="!sandboxInfo?.iframe_url && vncStatus === 'error'"
            class="absolute inset-0 flex flex-col items-center justify-center text-red-500"
          >
            <XCircle class="w-16 h-16 mb-3 opacity-50" />
            <p class="text-lg">连接失败</p>
            <button
              @click="connectVnc"
              class="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.code-block-wrapper { margin: 1rem 0; border-radius: 0.5rem; overflow: hidden; border: 1px solid #e2e8f0; }
.code-block-header { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 1rem; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
.code-lang { font-size: 0.75rem; color: #64748b; font-weight: 500; }
.copy-code-btn { padding: 0.25rem 0.5rem; background: transparent; border: none; cursor: pointer; font-size: 0.875rem; }
.copy-code-btn:hover { background: #e2e8f0; border-radius: 0.25rem; }
pre.hljs { margin: 0; padding: 1rem; overflow-x: auto; background: #f8fafc !important; }
pre.hljs code { font-family: 'Fira Code', 'Monaco', 'Consolas', monospace; font-size: 0.875rem; line-height: 1.5; }
.assistant-message :deep(p) { margin: 0.5rem 0; }
.assistant-message :deep(ul), .assistant-message :deep(ol) { margin: 0.5rem 0; padding-left: 1.5rem; }
.assistant-message :deep(li) { margin: 0.25rem 0; }
.assistant-message :deep(code:not(pre code)) { background: #f1f5f9; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.875em; }
</style>