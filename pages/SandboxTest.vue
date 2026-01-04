<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Send, Trash2, RefreshCw, Terminal, Wifi, WifiOff, Settings, MessageSquare, Loader2, CheckCircle, XCircle, AlertCircle, Lock, Eye, EyeOff, Monitor, Brain, BarChart3, Eraser } from 'lucide-vue-next'

// 登录状态
const isAuthenticated = ref(false)
const passwordInput = ref('')
const showPassword = ref(false)
const loginError = ref('')
const isLoggingIn = ref(false)

// 正确的密码（实际项目中应该从环境变量或后端获取）
const CORRECT_PASSWORD = 'sandbox2024'

// 登录函数
const handleLogin = () => {
  loginError.value = ''
  isLoggingIn.value = true
  
  // 模拟登录验证延迟
  setTimeout(() => {
    if (passwordInput.value === CORRECT_PASSWORD) {
      isAuthenticated.value = true
      // 保存登录状态到 sessionStorage（页面刷新后需要重新登录）
      sessionStorage.setItem('sandbox_authenticated', 'true')
      // 登录成功后进入主界面，然后初始化
      initAfterLogin()
    } else {
      loginError.value = '密码错误，请重试'
    }
    isLoggingIn.value = false
  }, 500)
}

// 存储从 API 获取的 token
const chatToken = ref<string>('')

// 登录后初始化：调用 API 获取 token，然后使用 token 连接 WebSocket
const initAfterLogin = async () => {
  try {
    addLog('info', '正在获取 Token...')
    
    // 调用后端接口获取 token
    const response = await fetch('https://sandbox.toproject.cloud/endpoint/chat/conversations/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '测试对话'
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('获取 Token 成功:', data)
    
    // 检查响应是否成功
    if (!data.success) {
      throw new Error(data.message || '请求失败')
    }
    
    // 保存 access_token
    if (data.data?.access_token) {
      chatToken.value = data.data.access_token
      addLog('success', `Token 获取成功: ${data.data.access_token.substring(0, 30)}...`)
    } else {
      throw new Error('响应中没有 access_token 字段')
    }
    
    // 如果返回了 conversation_id，使用它
    if (data.data?.conversation_id) {
      config.conversationId = data.data.conversation_id
      addLog('info', `会话 ID: ${data.data.conversation_id}`)
    }
    
    // 保存 user_id
    if (data.data?.user_id) {
      config.userId = data.data.user_id
      addLog('info', `用户 ID: ${data.data.user_id}`)
    }
    
    // 使用 token 连接 WebSocket
    connectWebSocket()
  } catch (error) {
    console.error('获取 Token 失败:', error)
    addLog('error', `获取 Token 失败: ${error instanceof Error ? error.message : '未知错误'}`)
    
    // 显示错误消息
    messages.value.push({
      id: Date.now().toString(),
      type: 'error',
      content: `获取 Token 失败: ${error instanceof Error ? error.message : '未知错误'}`,
      timestamp: new Date()
    })
  }
}

// 检查是否已登录
const checkAuthentication = () => {
  const authenticated = sessionStorage.getItem('sandbox_authenticated')
  if (authenticated === 'true') {
    isAuthenticated.value = true
    return true
  }
  return false
}

// 配置
const config = reactive({
  orchestratorUrl: 'wss://sandbox.toproject.cloud/endpoint/ws/chat',
  userId: 'test-user-' + Math.random().toString(36).substring(7),
  conversationId: '',
  includeThinking: true
})

// 沙箱信息
const sandboxInfo = ref<{
  has_sandbox: boolean
  session_id?: string
  vnc_url?: string
  vnc_password?: string
} | null>(null)

// 会话信息（登录后立即显示）
const sessionInfo = ref<{
  userId: string
  conversationId: string
  connectionId: string
  connectedAt: string
} | null>(null)

// 当前任务分析
const taskAnalysis = ref<any>(null)

// 流程节点状态
const flowNodes = ref<Array<{
  node: string
  status: string
  message: string
  data?: any
  timestamp: Date
}>>([])

// WebSocket 状态
const wsStatus = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
const ws = ref<WebSocket | null>(null)
const connectionId = ref<string>('')

// 消息
const messages = ref<Array<{
  id: string
  type: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: Date
  thinking?: boolean
}>>([])

const inputMessage = ref('')
const isStreaming = ref(false)
const currentStreamContent = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// 连接统计
const connectionStats = ref<{
  total_connections: number
  total_users: number
  total_conversations: number
}>({
  total_connections: 0,
  total_users: 0,
  total_conversations: 0
})

// 日志
const logs = ref<Array<{
  time: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}>>([])

const addLog = (level: 'info' | 'warn' | 'error' | 'success', message: string) => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    level,
    message
  })
  // 保留最近100条日志
  if (logs.value.length > 100) {
    logs.value.pop()
  }
}

// 生成会话ID
const generateConversationId = () => {
  config.conversationId = 'conv-' + Date.now() + '-' + Math.random().toString(36).substring(7)
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 连接 WebSocket
const connectWebSocket = () => {
  if (ws.value?.readyState === WebSocket.OPEN) {
    addLog('warn', 'WebSocket 已连接')
    return
  }

  if (!chatToken.value) {
    addLog('error', '没有有效的 Token，无法连接 WebSocket')
    return
  }

  wsStatus.value = 'connecting'
  
  // 使用 token 连接 WebSocket
  const wsUrl = `wss://sandbox.toproject.cloud/endpoint/ws/chat?token=${encodeURIComponent(chatToken.value)}`
  addLog('info', `正在连接到 WebSocket...`)
  
  try {
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      wsStatus.value = 'connected'
      addLog('success', 'WebSocket 连接成功，可以开始对话')
      
      // 添加欢迎消息
      messages.value.push({
        id: Date.now().toString(),
        type: 'system',
        content: '已连接到 AI 助手，请输入您的问题',
        timestamp: new Date()
      })
    }

    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (e) {
        addLog('error', `消息解析失败: ${event.data}`)
      }
    }

    ws.value.onerror = (error) => {
      wsStatus.value = 'error'
      addLog('error', `WebSocket 连接失败，请检查服务是否启动`)
      
      messages.value.push({
        id: Date.now().toString(),
        type: 'error',
        content: '连接失败，请确保后端服务已启动 (python server/orchestrator_service.py)',
        timestamp: new Date()
      })
    }

    ws.value.onclose = (event) => {
      wsStatus.value = 'disconnected'
      connectionId.value = ''
      addLog('info', `WebSocket 连接关闭: ${event.code}`)
    }
  } catch (e) {
    wsStatus.value = 'error'
    addLog('error', `连接失败: ${e}`)
  }
}

// 断开 WebSocket
const disconnectWebSocket = () => {
  if (ws.value) {
    ws.value.close()
    ws.value = null
    wsStatus.value = 'disconnected'
    connectionId.value = ''
    sessionInfo.value = null
    addLog('info', 'WebSocket 已断开')
  }
}

// 重新连接（需要重新获取 token）
const reconnect = async () => {
  disconnectWebSocket()
  // 重新获取 token 并连接
  await initAfterLogin()
}

// 处理 WebSocket 消息
const handleWebSocketMessage = (data: any) => {
  const msgType = data.type
  const payload = data.payload || {}

  switch (msgType) {
    case 'connected':
      connectionId.value = data.connection_id || payload.connection_id
      // 更新会话信息
      sessionInfo.value = {
        userId: data.user_id || payload.user_id || config.userId,
        conversationId: config.conversationId,
        connectionId: data.connection_id || payload.connection_id || '',
        connectedAt: new Date().toLocaleString()
      }
      addLog('success', `连接已建立, ID: ${sessionInfo.value.connectionId}, 用户: ${sessionInfo.value.userId}`)
      break

    case 'pong':
      // 静默处理心跳
      break

    case 'chat_started':
      // 对话开始
      isStreaming.value = true
      currentStreamContent.value = ''
      config.conversationId = data.conversation_id || payload.conversation_id || config.conversationId
      addLog('info', `对话开始, 会话ID: ${config.conversationId}, 消息ID: ${data.message_id || payload.message_id}`)
      break

    case 'thinking':
      // 思考过程
      const thinkingContent = data.content || payload.content || payload.thinking_step || '正在思考...'
      if (!messages.value.find(m => m.type === 'assistant' && m.thinking)) {
        messages.value.push({
          id: Date.now().toString(),
          type: 'assistant',
          content: thinkingContent,
          timestamp: new Date(),
          thinking: true
        })
      } else {
        const thinkingMsg = messages.value.find(m => m.type === 'assistant' && m.thinking)
        if (thinkingMsg) {
          thinkingMsg.content = thinkingContent
        }
      }
      addLog('info', `思考: ${data.step_type || payload.type || ''} - ${thinkingContent.substring(0, 50)}...`)
      scrollToBottom()
      break

    case 'token':
    case 'chat_token':
      // 文本增量
      const tokenContent = data.content || data.delta || payload.content || payload.delta || ''
      currentStreamContent.value += tokenContent
      // 更新最后一条消息
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg && lastMsg.type === 'assistant') {
        lastMsg.content = currentStreamContent.value
        lastMsg.thinking = false
      } else {
        messages.value.push({
          id: Date.now().toString(),
          type: 'assistant',
          content: currentStreamContent.value,
          timestamp: new Date(),
          thinking: false
        })
      }
      scrollToBottom()
      break

    case 'task_analysis':
      // 任务分析结果
      taskAnalysis.value = data.analysis || payload.analysis
      addLog('info', `任务分析完成: ${JSON.stringify(taskAnalysis.value).substring(0, 100)}...`)
      break

    case 'sandbox_ready':
      // 沙箱就绪
      sandboxInfo.value = {
        has_sandbox: true,
        session_id: data.session_id || payload.session_id,
        vnc_url: data.vnc_url || payload.vnc_url,
        vnc_password: data.vnc_password || payload.vnc_password
      }
      addLog('success', `沙箱就绪: ${sandboxInfo.value.session_id}`)
      messages.value.push({
        id: Date.now().toString(),
        type: 'system',
        content: `🖥️ 沙箱环境已就绪 (ID: ${sandboxInfo.value.session_id})`,
        timestamp: new Date()
      })
      scrollToBottom()
      break

    case 'flow_node':
      // 流程节点状态
      flowNodes.value.push({
        node: data.node || payload.node,
        status: data.status || payload.status,
        message: data.message || payload.message,
        data: data.data || payload.data,
        timestamp: new Date()
      })
      addLog('info', `流程节点: ${data.node || payload.node} - ${data.status || payload.status}: ${data.message || payload.message}`)
      break

    case 'plan_start':
    case 'plan_complete':
    case 'plan_revision':
    case 'plan_revised':
      addLog('info', `计划事件 [${msgType}]: ${data.message || payload.message || ''}`)
      break

    case 'step_start':
    case 'step_success':
    case 'step_failed':
    case 'step_retry':
      addLog('info', `步骤事件 [${msgType}]: ${data.message || payload.message || ''}`)
      break

    case 'tool_call':
      addLog('info', `工具调用: ${data.tool || payload.tool} - ${JSON.stringify(data.arguments || payload.arguments || {}).substring(0, 100)}`)
      break

    case 'tool_result':
      addLog('info', `工具结果: ${data.tool || payload.tool} - ${JSON.stringify(data.result || payload.result || {}).substring(0, 100)}`)
      break

    case 'llm_call':
      addLog('info', `LLM 调用: ${data.purpose || payload.purpose || ''} - ${(data.message || payload.message || '').substring(0, 50)}`)
      break

    case 'variable_set':
      addLog('info', `变量设置: ${JSON.stringify(data.data || payload.data || {})}`)
      break

    case 'retry':
      addLog('warn', `重试 ${data.attempt || payload.attempt}/${data.max_retries || payload.max_retries}: ${data.error || payload.error}, 延迟 ${data.delay || payload.delay}s`)
      break

    case 'chat_complete':
      // 对话完成 - 处理 payload 中的内容
      isStreaming.value = false
      
      // 如果 payload 中有完整内容，显示它
      if (payload.content && payload.is_complete) {
        // 查找或创建助手消息
        const existingMsg = messages.value.find(m => m.type === 'assistant' && !m.thinking)
        if (existingMsg) {
          existingMsg.content = payload.content
        } else {
          messages.value.push({
            id: payload.message_id || Date.now().toString(),
            type: 'assistant',
            content: payload.content,
            timestamp: new Date(),
            thinking: false
          })
        }
      }
      
      // 更新会话 ID
      if (payload.conversation_id) {
        config.conversationId = payload.conversation_id
      }
      
      addLog('success', `对话完成, 消息ID: ${data.message_id || payload.message_id}`)
      scrollToBottom()
      break

    case 'sandbox_info':
      // 沙箱信息响应
      sandboxInfo.value = {
        has_sandbox: data.has_sandbox || payload.has_sandbox,
        ...(data.sandbox_info || payload.sandbox_info || {})
      }
      addLog('info', `沙箱信息: ${sandboxInfo.value.has_sandbox ? '已创建' : '未创建'}`)
      break

    case 'memory_cleared':
      addLog('success', '对话记忆已清空')
      break

    case 'stats':
      connectionStats.value = {
        total_connections: data.active_connections || payload.active_connections || 0,
        total_users: data.active_users || payload.active_users || 0,
        total_conversations: data.active_agents || payload.active_agents || 0
      }
      break

    case 'error':
      isStreaming.value = false
      const errorMsg = data.error || data.message || payload.error || payload.message || '发生错误'
      messages.value.push({
        id: Date.now().toString(),
        type: 'error',
        content: errorMsg,
        timestamp: new Date()
      })
      addLog('error', `错误: ${errorMsg}`)
      scrollToBottom()
      break

    default:
      // 记录未知消息类型，但也尝试处理 payload 中的内容
      addLog('warn', `未知消息类型: ${msgType}`)
      console.log('未知消息:', data)
      
      // 如果有 payload.content，尝试显示
      if (payload.content) {
        const lastAssistantMsg = messages.value.find(m => m.type === 'assistant')
        if (lastAssistantMsg) {
          lastAssistantMsg.content = payload.content
          lastAssistantMsg.thinking = false
        } else {
          messages.value.push({
            id: Date.now().toString(),
            type: 'assistant',
            content: payload.content,
            timestamp: new Date(),
            thinking: false
          })
        }
        scrollToBottom()
      }
      break
  }
}

// 发送消息
const sendMessage = () => {
  if (!inputMessage.value.trim() || !ws.value || ws.value.readyState !== WebSocket.OPEN) {
    return
  }

  const message = inputMessage.value.trim()
  const requestId = `req-${Date.now()}`
  
  // 添加用户消息
  messages.value.push({
    id: Date.now().toString(),
    type: 'user',
    content: message,
    timestamp: new Date()
  })
  scrollToBottom()

  // 发送到服务器（新的消息格式）
  ws.value.send(JSON.stringify({
    type: 'chat',
    payload: {
      message: message,
      conversation_id: config.conversationId || undefined,
      include_thinking: config.includeThinking
    },
    request_id: requestId
  }))

  inputMessage.value = ''
  addLog('info', `发送: ${message.substring(0, 30)}${message.length > 30 ? '...' : ''}`)
}

// 发送心跳
const sendPing = () => {
  if (ws.value?.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({
      type: 'ping',
      request_id: `ping-${Date.now()}`
    }))
  }
}

// 获取沙箱信息
const getSandboxInfo = () => {
  if (ws.value?.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({
      type: 'get_sandbox_info',
      request_id: `sandbox-${Date.now()}`
    }))
  }
}

// 清空对话记忆
const clearMemory = () => {
  if (ws.value?.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({
      type: 'clear_memory',
      request_id: `clear-${Date.now()}`
    }))
  }
}

// 获取统计信息
const getStats = () => {
  if (ws.value?.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({
      type: 'get_stats',
      request_id: `stats-${Date.now()}`
    }))
  }
}

// 清空消息
const clearMessages = () => {
  messages.value = []
  currentStreamContent.value = ''
  flowNodes.value = []
  taskAnalysis.value = null
  addLog('info', '消息已清空')
}

// 清空日志
const clearLogs = () => {
  logs.value = []
}

// 状态图标
const statusIcon = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return CheckCircle
    case 'connecting': return Loader2
    case 'error': return XCircle
    default: return WifiOff
  }
})

const statusColor = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return 'text-green-500'
    case 'connecting': return 'text-yellow-500 animate-spin'
    case 'error': return 'text-red-500'
    default: return 'text-gray-400'
  }
})

const statusText = computed(() => {
  switch (wsStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    case 'error': return '连接失败'
    default: return '未连接'
  }
})

// 心跳定时器
let heartbeatInterval: number | null = null

onMounted(() => {
  // 检查是否已登录
  if (checkAuthentication()) {
    // 已登录，执行初始化（调用 API 创建对话，然后连接 WebSocket）
    initAfterLogin()
  }
  
  // 启动心跳
  heartbeatInterval = window.setInterval(() => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      sendPing()
    }
  }, 30000)
})

onUnmounted(() => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }
  disconnectWebSocket()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 登录界面 -->
    <div v-if="!isAuthenticated" class="min-h-screen flex items-center justify-center">
      <div class="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock class="w-8 h-8 text-brand-600" />
          </div>
          <h1 class="text-2xl font-bold text-slate-900">沙箱测试环境</h1>
          <p class="text-slate-500 mt-2">请输入密码以访问测试环境</p>
        </div>
        
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">访问密码</label>
            <div class="relative">
              <input
                v-model="passwordInput"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent pr-12"
                :disabled="isLoggingIn"
                autofocus
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Eye v-if="!showPassword" class="w-5 h-5" />
                <EyeOff v-else class="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div v-if="loginError" class="flex items-center gap-2 text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">
            <XCircle class="w-4 h-4 flex-shrink-0" />
            <span>{{ loginError }}</span>
          </div>
          
          <button
            type="submit"
            :disabled="!passwordInput.trim() || isLoggingIn"
            class="w-full px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Loader2 v-if="isLoggingIn" class="w-5 h-5 animate-spin" />
            <Lock v-else class="w-5 h-5" />
            {{ isLoggingIn ? '验证中...' : '进入测试环境' }}
          </button>
        </form>
        
        <div class="mt-6 pt-6 border-t border-slate-200">
          <RouterLink to="/" class="flex items-center justify-center gap-2 text-slate-500 hover:text-brand-600 transition-colors">
            <Home class="w-4 h-4" />
            <span>返回主页</span>
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- 主界面（登录后显示） -->
    <div v-else class="max-w-6xl mx-auto px-4 py-4">
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Terminal class="w-6 h-6 text-brand-600" />
          AI 对话测试
        </h1>
        <div class="flex items-center gap-3">
          <!-- 连接状态 -->
          <div class="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-sm">
            <component :is="statusIcon" :class="['w-4 h-4', statusColor]" />
            <span class="text-slate-600">{{ statusText }}</span>
          </div>
          <RouterLink to="/" class="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600">
            <Home class="w-5 h-5" />
            <span class="hidden md:inline">返回主页</span>
          </RouterLink>
        </div>
      </div>

      <div class="grid lg:grid-cols-4 gap-4">
        <!-- 左侧：配置 -->
        <div class="space-y-4">
          <!-- 连接配置 -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 class="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Settings class="w-4 h-4" />
              连接配置
            </h2>
            
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">服务地址</label>
                <input v-model="config.orchestratorUrl" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="ws://localhost:8001" />
              </div>
              
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">用户 ID</label>
                <input v-model="config.userId" type="text" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">会话 ID</label>
                <div class="flex gap-2">
                  <input v-model="config.conversationId" type="text" class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <button @click="generateConversationId" class="px-2 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm" title="生成新会话ID">
                    <RefreshCw class="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <!-- 思考过程开关 -->
              <div class="flex items-center justify-between">
                <label class="text-xs font-medium text-slate-500">显示思考过程</label>
                <button
                  @click="config.includeThinking = !config.includeThinking"
                  :class="[
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    config.includeThinking ? 'bg-brand-600' : 'bg-slate-200'
                  ]"
                >
                  <span
                    :class="[
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      config.includeThinking ? 'translate-x-6' : 'translate-x-1'
                    ]"
                  />
                </button>
              </div>
              
              <button
                @click="reconnect"
                class="w-full px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Wifi class="w-4 h-4" />
                重新连接
              </button>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 class="text-sm font-semibold text-slate-700 mb-3">操作</h2>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="getSandboxInfo"
                :disabled="wsStatus !== 'connected'"
                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 rounded-lg text-xs flex items-center justify-center gap-1"
              >
                <Monitor class="w-3 h-3" />
                沙箱信息
              </button>
              <button
                @click="getStats"
                :disabled="wsStatus !== 'connected'"
                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 rounded-lg text-xs flex items-center justify-center gap-1"
              >
                <BarChart3 class="w-3 h-3" />
                统计信息
              </button>
              <button
                @click="clearMemory"
                :disabled="wsStatus !== 'connected'"
                class="px-3 py-2 bg-orange-100 hover:bg-orange-200 disabled:bg-slate-50 disabled:text-slate-300 text-orange-700 rounded-lg text-xs flex items-center justify-center gap-1"
              >
                <Brain class="w-3 h-3" />
                清空记忆
              </button>
              <button
                @click="clearMessages"
                class="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs flex items-center justify-center gap-1"
              >
                <Eraser class="w-3 h-3" />
                清空消息
              </button>
            </div>
          </div>

          <!-- 会话信息（登录后立即显示） -->
          <div v-if="sessionInfo" class="bg-white rounded-xl border border-green-200 shadow-sm p-4">
            <h2 class="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <CheckCircle class="w-4 h-4 text-green-500" />
              会话信息
            </h2>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500">用户 ID:</span>
                <span class="font-mono text-slate-700 truncate max-w-[120px]" :title="sessionInfo.userId">{{ sessionInfo.userId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">会话 ID:</span>
                <span class="font-mono text-slate-700 truncate max-w-[120px]" :title="sessionInfo.conversationId">{{ sessionInfo.conversationId.substring(0, 16) }}...</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">连接 ID:</span>
                <span class="font-mono text-slate-700 truncate max-w-[120px]" :title="sessionInfo.connectionId">{{ sessionInfo.connectionId.substring(0, 12) }}...</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">连接时间:</span>
                <span class="text-slate-700">{{ sessionInfo.connectedAt }}</span>
              </div>
            </div>
          </div>

          <!-- 沙箱信息 -->
          <div v-if="sandboxInfo?.has_sandbox" class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 class="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Monitor class="w-4 h-4 text-green-500" />
              沙箱环境
            </h2>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500">会话 ID:</span>
                <span class="font-mono text-slate-700">{{ sandboxInfo.session_id?.substring(0, 12) }}...</span>
              </div>
              <div v-if="sandboxInfo.vnc_url" class="flex justify-between">
                <span class="text-slate-500">VNC:</span>
                <a :href="sandboxInfo.vnc_url" target="_blank" class="text-brand-600 hover:underline">打开</a>
              </div>
              <div v-if="sandboxInfo.vnc_password" class="flex justify-between">
                <span class="text-slate-500">密码:</span>
                <span class="font-mono text-slate-700">{{ sandboxInfo.vnc_password }}</span>
              </div>
            </div>
          </div>

          <!-- 连接统计 -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h2 class="text-sm font-semibold text-slate-700 mb-2">连接统计</h2>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="bg-slate-50 rounded-lg p-2">
                <div class="text-lg font-bold text-brand-600">{{ connectionStats.total_connections }}</div>
                <div class="text-xs text-slate-500">连接</div>
              </div>
              <div class="bg-slate-50 rounded-lg p-2">
                <div class="text-lg font-bold text-brand-600">{{ connectionStats.total_users }}</div>
                <div class="text-xs text-slate-500">用户</div>
              </div>
              <div class="bg-slate-50 rounded-lg p-2">
                <div class="text-lg font-bold text-brand-600">{{ connectionStats.total_conversations }}</div>
                <div class="text-xs text-slate-500">会话</div>
              </div>
            </div>
          </div>

          <!-- 日志 -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div class="flex items-center justify-between mb-2">
              <h2 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertCircle class="w-4 h-4" />
                日志
              </h2>
              <button @click="clearLogs" class="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600">
                <Trash2 class="w-3 h-3" />
              </button>
            </div>
            
            <div class="h-48 overflow-y-auto font-mono text-xs space-y-1">
              <div v-if="logs.length === 0" class="text-center text-slate-400 py-4">
                暂无日志
              </div>
              
              <div v-for="(log, idx) in logs" :key="idx" :class="[
                'p-1.5 rounded',
                log.level === 'error' ? 'bg-red-50 text-red-600' :
                log.level === 'warn' ? 'bg-yellow-50 text-yellow-600' :
                log.level === 'success' ? 'bg-green-50 text-green-600' :
                'bg-slate-50 text-slate-500'
              ]">
                <span class="text-slate-400">[{{ log.time }}]</span>
                {{ log.message }}
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：对话区域 -->
        <div class="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-120px)]">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare class="w-5 h-5" />
              对话
            </h2>
            <div class="flex items-center gap-2">
              <span v-if="config.conversationId" class="text-xs text-slate-400 font-mono">
                {{ config.conversationId.substring(0, 20) }}...
              </span>
              <button @click="clearMessages" class="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="清空消息">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <!-- 消息列表 -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4">
            <div v-if="messages.length === 0 && wsStatus === 'connecting'" class="text-center text-slate-400 py-8">
              <Loader2 class="w-8 h-8 animate-spin mx-auto mb-2" />
              正在连接服务器...
            </div>
            
            <div v-else-if="messages.length === 0 && wsStatus === 'error'" class="text-center py-8">
              <XCircle class="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p class="text-red-500 mb-2">连接失败</p>
              <p class="text-sm text-slate-500">请确保后端服务已启动</p>
              <code class="text-xs bg-slate-100 px-2 py-1 rounded mt-2 inline-block">python server/orchestrator_service.py</code>
            </div>
            
            <div v-for="msg in messages" :key="msg.id" :class="[
              'max-w-[80%] rounded-xl p-3',
              msg.type === 'user' ? 'ml-auto bg-brand-600 text-white' :
              msg.type === 'assistant' ? 'bg-slate-100 text-slate-800' :
              msg.type === 'system' ? 'mx-auto bg-blue-50 text-blue-700 text-sm max-w-full' :
              'bg-red-50 text-red-800'
            ]">
              <div v-if="msg.thinking" class="flex items-center gap-2">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>{{ msg.content }}</span>
              </div>
              <div v-else class="whitespace-pre-wrap">{{ msg.content }}</div>
              <div :class="[
                'text-xs mt-1 opacity-60',
                msg.type === 'user' ? 'text-right' : ''
              ]">
                {{ msg.timestamp.toLocaleTimeString() }}
              </div>
            </div>
            
            <div v-if="isStreaming && !messages[messages.length - 1]?.thinking" class="flex items-center gap-2 text-slate-400">
              <Loader2 class="w-4 h-4 animate-spin" />
              <span>正在生成...</span>
            </div>
          </div>
          
          <!-- 输入框 -->
          <div class="p-4 border-t border-slate-200">
            <div class="flex gap-2">
              <input 
                v-model="inputMessage" 
                @keyup.enter="sendMessage"
                :disabled="wsStatus !== 'connected' || isStreaming"
                type="text" 
                placeholder="输入消息，按 Enter 发送..." 
                class="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-100 text-base"
              />
              <button 
                @click="sendMessage" 
                :disabled="wsStatus !== 'connected' || isStreaming || !inputMessage.trim()"
                class="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white rounded-xl flex items-center gap-2 transition-colors"
              >
                <Send class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>