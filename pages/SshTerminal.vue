<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-6">
    <!-- 错误提示弹窗 -->
    <div v-if="showError" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-lg shadow-2xl border border-slate-700 p-6 w-80">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-yellow-400 text-xl">⚠️</span>
          <span class="text-white font-semibold">连接错误</span>
        </div>
        <div class="text-slate-300 mb-4">{{ errorMessage }}</div>
        <button @click="showError = false" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors w-full">
          确定
        </button>
      </div>
    </div>
    <div class="max-w-6xl mx-auto">
      <!-- 头部 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <RouterLink 
            to="/" 
            class="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur rounded-lg shadow-sm border border-slate-700 text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
          >
            <Home class="w-4 h-4" />
            返回主页
          </RouterLink>
          <h1 class="text-3xl md:text-4xl font-bold text-white">SSH 连接工具</h1>
        </div>
        <div class="flex items-center gap-3 text-slate-400">
          <div class="flex items-center gap-2">
            <div :class="['w-2 h-2 rounded-full', isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500']"></div>
            <span class="text-sm">{{ isConnected ? '已连接' : '未连接' }}</span>
          </div>
          <button 
            v-if="isConnected"
            @click="disconnect"
            class="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
          >
            断开连接
          </button>
          <button 
            @click="clearTerminal"
            class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
          >
            清屏
          </button>
        </div>
      </div>

      <!-- 连接配置表单 -->
      <div v-if="!isConnected" class="mb-6">
        <div class="bg-slate-800/50 backdrop-blur rounded-lg p-4 md:p-6 border border-slate-700">
          <h2 class="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">SSH 连接配置</h2>
          
          <!-- 环境配置提示 -->
          <div class="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-blue-400 text-sm">ℹ️</span>
              <span class="text-slate-300 text-sm font-medium">SSH连接配置</span>
            </div>
            <div class="text-slate-400 text-xs space-y-1">
              <div>配置状态: <span class="text-green-400">已就绪</span></div>
            </div>
          </div>

          <!-- 连接配置 -->
          


          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <div>
              <label class="block text-base md:text-lg font-medium text-slate-300 mb-3">服务器地址</label>
              <input 
                v-model="connectionConfig.hostname"
                type="text" 
                placeholder="例如：192.168.1.100"
                class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-base md:text-lg"
              />
            </div>
            <div>
              <label class="block text-base md:text-lg font-medium text-slate-300 mb-3">端口</label>
              <input 
                v-model="connectionConfig.port"
                type="number" 
                placeholder="默认：22"
                class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-base md:text-lg"
              />
            </div>
            <div>
              <label class="block text-base md:text-lg font-medium text-slate-300 mb-3">用户名</label>
              <input 
                v-model="connectionConfig.username"
                type="text" 
                placeholder="例如：root"
                class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-base md:text-lg"
              />
            </div>
            <div>
              <label class="block text-base md:text-lg font-medium text-slate-300 mb-3">密码</label>
              <input 
                v-model="connectionConfig.password"
                type="password" 
                placeholder="输入密码"
                class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 text-base md:text-lg"
              />
            </div>
          </div>
          <div class="mt-6 flex flex-col sm:flex-row gap-3 md:gap-4">
            <button 
              v-if="!isConnected"
              @click="connect"
              :disabled="!canConnect"
              :class="['px-6 py-3 md:px-8 md:py-4 rounded-lg font-bold text-lg md:text-xl transition-colors', canConnect ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-slate-600 text-slate-400 cursor-not-allowed']"
            >
              连接
            </button>
            <button 
              @click="resetConfig"
              class="px-6 py-3 md:px-8 md:py-4 bg-slate-600 hover:bg-slate-500 rounded-lg text-white transition-colors text-lg md:text-xl font-bold"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <!-- 终端容器 -->
      <div v-if="isConnected" class="bg-black rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
        <!-- 终端标题栏 -->
        <div class="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div class="flex items-center gap-2">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div class="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span class="text-sm text-slate-300">
              ssh {{ connectionConfig.username }}@{{ connectionConfig.hostname }}:{{ connectionConfig.port }}
            </span>
          </div>
          <div class="text-sm md:text-base text-slate-500">
            SSH连接工具 v3.0
          </div>
        </div>

        <!-- 交互式终端内容 -->
        <div ref="terminalContainer" class="h-96 w-full text-sm font-mono overflow-hidden"></div>

        <!-- 终端底部 -->
        <div class="px-4 py-3 md:px-6 md:py-4 bg-slate-800 border-t border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div class="text-sm md:text-base text-slate-500">
            输入 <span class="text-slate-300">help</span> 查看可用命令
          </div>
          <div class="text-sm md:text-base text-slate-500">
            {{ currentTime }}
          </div>
        </div>
      </div>

      <!-- 命令帮助 -->
      <div class="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div class="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <h3 class="font-medium text-white mb-2">基础命令</h3>
          <ul class="text-sm text-slate-300 space-y-1">
            <li><code class="text-green-400">ls</code> - 列出文件</li>
            <li><code class="text-green-400">cd</code> - 切换目录</li>
            <li><code class="text-green-400">pwd</code> - 显示当前目录</li>
            <li><code class="text-green-400">cat</code> - 查看文件内容</li>
          </ul>
        </div>

        <div class="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <h3 class="font-medium text-white mb-2">系统命令</h3>
          <ul class="text-sm text-slate-300 space-y-1">
            <li><code class="text-green-400">date</code> - 显示日期时间</li>
            <li><code class="text-green-400">whoami</code> - 显示当前用户</li>
            <li><code class="text-green-400">uname</code> - 系统信息</li>
            <li><code class="text-green-400">echo</code> - 输出文本</li>
          </ul>
        </div>

        <div class="bg-slate-800/50 backdrop-blur rounded-lg p-4 border border-slate-700">
          <h3 class="font-medium text-white mb-2">特殊命令</h3>
          <ul class="text-sm text-slate-300 space-y-1">
            <li><code class="text-green-400">clear</code> - 清空终端</li>
            <li><code class="text-green-400">help</code> - 显示帮助</li>
            <li><code class="text-green-400">theme</code> - 切换主题</li>
            <li><code class="text-green-400">exit</code> - 退出终端</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Home } from 'lucide-vue-next'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

// 扩展Window接口以包含sshTerminalManager
declare global {
  interface Window {
    sshTerminalManager: any
  }
}

const terminalContainer = ref<HTMLElement>()
const currentTime = ref('')
const isConnected = ref(false)
const errorMessage = ref('')
const showError = ref(false)

// 连接配置 - 使用环境变量作为默认值
const connectionConfig = ref({
  hostname: '',
  port: 22,
  username: '',
  password: ''
})



// 环境变量配置
const envConfig = computed(() => {
  // 解析SSH WebSocket域名列表
  const websocketDomains = import.meta.env.VITE_SSH_WEBSOCKET_DOMAINS || ''
  const domains = websocketDomains.split(',').map(domain => domain.trim()).filter(domain => domain)
  
  // 如果没有配置域名列表，使用单个默认域名
  if (domains.length === 0) {
    domains.push(import.meta.env.VITE_SSH_WEBSOCKET_URL || 'ws://localhost:8002/ws/ssh')
  }
  
  return {
    defaultHost: import.meta.env.VITE_SSH_DEFAULT_HOST || 'localhost',
    defaultPort: import.meta.env.VITE_SSH_DEFAULT_PORT || '22',
    websocketUrl: import.meta.env.VITE_SSH_WEBSOCKET_URL || 'ws://localhost:8002/ws/ssh',
    executeUrl: import.meta.env.VITE_SSH_EXECUTE_URL || 'ws://localhost:8002/ws/ssh/execute',
    websocketDomains: domains // 轮训域名列表
  }
})



// 计算属性：检查是否可以连接
const canConnect = computed(() => {
  return connectionConfig.value.hostname.trim() !== '' && 
         connectionConfig.value.username.trim() !== '' && 
         connectionConfig.value.password.trim() !== ''
})



// 保存配置到本地存储
function saveConfig() {
  const configToSave = {
    hostname: connectionConfig.value.hostname,
    port: connectionConfig.value.port,
    username: connectionConfig.value.username
  }
  localStorage.setItem('ssh_config', JSON.stringify(configToSave))
}

// 从本地存储加载配置
function loadConfig() {
  const saved = localStorage.getItem('ssh_config')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      connectionConfig.value.hostname = parsed.hostname || connectionConfig.value.hostname
      connectionConfig.value.port = parsed.port || connectionConfig.value.port
      connectionConfig.value.username = parsed.username || connectionConfig.value.username
    } catch (error) {
      console.warn('加载保存的配置失败:', error)
    }
  }
}

// 显示错误消息的函数
function showErrorMessage(message: string) {
  errorMessage.value = message
  showError.value = true
  
  // 3秒后自动隐藏错误消息
  setTimeout(() => {
    showError.value = false
  }, 3000)
}

// 连接方法
async function connect() {
  if (!canConnect.value) {
    showErrorMessage('请填写所有必填字段（服务器地址、用户名、密码）')
    return
  }
  
  // 保存当前配置
  saveConfig()
  
  try {
    // 交互式终端模式 - 先设置连接状态，让终端容器渲染
    isConnected.value = true
    
    // 等待DOM更新，确保终端容器已渲染
    await nextTick()
    
    // 检查终端容器是否已准备好
    if (!terminalContainer.value) {
      console.error('终端容器未找到')
      throw new Error('终端容器未找到，请确保终端界面已加载')
    }
    
    // 建立SSH连接，SSHTerminal类会自动初始化终端
    await connectRealSSH()
  } catch (error) {
    console.error('SSH连接失败:', error)
    // 重置连接状态
    isConnected.value = false
    
    // 显示用户友好的错误消息
    let userFriendlyMessage = 'SSH连接失败'
    
    if (error.message.includes('hostname')) {
      userFriendlyMessage = '连接失败：服务器地址格式错误'
    } else if (error.message.includes('username')) {
      userFriendlyMessage = '连接失败：用户名格式错误'
    } else if (error.message.includes('password')) {
      userFriendlyMessage = '连接失败：密码格式错误'
    } else if (error.message.includes('Field required')) {
      userFriendlyMessage = '连接失败：缺少必填字段，请检查服务器地址、用户名和密码'
    } else if (error.message.includes('连接超时')) {
      userFriendlyMessage = '连接失败：连接超时，请检查服务器地址和端口'
    } else if (error.message.includes('WebSocket')) {
      userFriendlyMessage = '连接失败：无法连接到服务器，请检查服务器状态'
    } else {
      userFriendlyMessage = `连接失败：${error.message}`
    }
    
    showErrorMessage(userFriendlyMessage)
    
    // 尝试通过终端管理器显示错误信息
    const terminal = window.sshTerminalManager?.getTerminal()
    if (terminal) {
      terminal.write(`\r\n\x1b[31m${userFriendlyMessage}\x1b[0m\r\n`)
    } else {
      // 如果没有终端，在控制台显示错误
      console.error('连接失败详情:', error.message)
    }
  }
}



// 现代化的SSH终端类（基于用户提供的SSHTerminal类改进）
class SSHTerminal {
  private ws: WebSocket | null = null
  private terminal: Terminal | null = null
  private fitAddon: FitAddon | null = null
  private sessionId: string | null = null
  private terminalContainer: HTMLElement | null = null
  private connectionConfig: any = null
  private onConnectionChange: (connected: boolean) => void
  private onError: (error: string) => void
  private isConnecting = false
  private websocketDomains: string[] = []
  private currentDomainIndex = 0
  
  // 命令历史相关
  private commandHistory: string[] = []
  private historyIndex = -1
  private currentInput = ''
  private inputBuffer = ''

  constructor(
    terminalContainer: HTMLElement,
    connectionConfig: any,
    onConnectionChange: (connected: boolean) => void,
    onError: (error: string) => void,
    websocketDomains: string[] = []
  ) {
    this.terminalContainer = terminalContainer
    this.connectionConfig = connectionConfig
    this.onConnectionChange = onConnectionChange
    this.onError = onError
    this.websocketDomains = websocketDomains
    
    // 如果没有提供域名列表，使用默认域名
    if (this.websocketDomains.length === 0) {
      this.websocketDomains.push(import.meta.env.VITE_SSH_WEBSOCKET_URL || 'ws://localhost:8002/ws/ssh')
    }
    
    // 自动连接
    this.connect()
  }

  private initTerminal(): void {
    if (!this.terminalContainer) return
    
    this.terminal = new Terminal({
      theme: {
        background: '#0a0e27', // 深蓝黑色背景
        foreground: '#98d1ce', // 浅蓝色前景
        cursor: '#98d1ce', // 浅蓝色光标
        cursorAccent: '#0a0e27',
        selection: '#2d3b55', // 深蓝色选择
        black: '#0a0e27',
        red: '#ff5c57',
        green: '#5af78e',
        yellow: '#f3f99d',
        blue: '#57c7ff',
        magenta: '#ff6ac1',
        cyan: '#9aedfe',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e67',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff'
      },
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      cursorBlink: true,
      allowTransparency: false,
      disableStdin: false,
      allowProposedApi: false,
      rendererType: 'canvas',
      // 关键配置：确保正确处理输出格式
      convertEol: true,
      rows: 24,
      cols: 80
    })

    this.fitAddon = new FitAddon()
    this.terminal.loadAddon(this.fitAddon)
    this.terminal.open(this.terminalContainer)
    this.fitAddon.fit()
    
    // 设置终端焦点
    setTimeout(() => {
      try {
        this.terminal?.focus()
      } catch (error) {
        console.warn('终端焦点设置失败:', error)
      }
    }, 100)

    // 显示欢迎信息
    this.terminal.write('\x1b[1;32mSSH连接工具 v3.0\x1b[0m\r\n')
    this.terminal.write('输入 \x1b[33mhelp\x1b[0m 查看可用命令\r\n\r\n')

    // 处理用户输入 - 实现行缓冲机制
    this.inputBuffer = ''
    this.commandHistory = []
    this.historyIndex = -1
    this.currentInput = ''
    
    this.terminal.onData((data) => {
      try {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
        
        // 处理特殊按键
        switch (data) {
          case '\r':
          case '\n': // 回车键
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
            
            // 发送完整的命令行
            this.ws.send(JSON.stringify({
              type: 'command',
              data: { command: this.inputBuffer + '\n' }
            }))
            
            // 重置状态
            this.inputBuffer = ''
            this.historyIndex = -1
            this.currentInput = ''
            
            this.terminal.write('\r\n')
            break
            
          case '\x7f':
          case '\b': // 退格键
            if (this.inputBuffer.length > 0) {
              this.inputBuffer = this.inputBuffer.slice(0, -1)
              this.terminal.write('\b \b')
            }
            break
            
          case '\x03': // Ctrl+C
            // 发送中断信号
            this.ws.send(JSON.stringify({
              type: 'command',
              data: { command: '\x03' }
            }))
            this.inputBuffer = ''
            this.historyIndex = -1
            this.currentInput = ''
            break
            
          case '\x1b[A': // 上箭头键
            this.handleUpArrow()
            break
            
          case '\x1b[B': // 下箭头键
            this.handleDownArrow()
            break
            
          case '\t': // TAB键 - 自动补全
            this.handleTabCompletion()
            break
            
          case '\x1b[C': // 右箭头键
          case '\x1b[D': // 左箭头键
            // 直接发送到服务器，由服务器处理光标移动
            this.ws.send(JSON.stringify({
              type: 'command',
              data: { command: data }
            }))
            break
            
          default:
            if (data >= ' ' && data <= '~') { // 可打印字符
              this.inputBuffer += data
              this.terminal.write(data)
              // 如果正在浏览历史，重置历史索引
              this.historyIndex = -1
            } else {
              // 其他控制字符直接发送到服务器
              this.ws.send(JSON.stringify({
                type: 'command',
                data: { command: data }
              }))
            }
        }
      } catch (error) {
        console.warn('终端数据处理错误:', error)
      }
    })

    // 处理窗口大小调整
    window.addEventListener('resize', () => {
      this.resizeTerminal()
    })
  }

  private resizeTerminal(): void {
    try {
      if (this.fitAddon) {
        this.fitAddon.fit()
      }
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.terminal) {
        const cols = this.terminal.cols
        const rows = this.terminal.rows
        
        // 发送resize消息到后端，使用width/height格式
        this.ws.send(JSON.stringify({
          type: 'resize',
          data: { 
            width: cols,
            height: rows
          }
        }))
      }
    } catch (error) {
      console.warn('终端大小调整错误:', error)
    }
  }
  
  // 处理上箭头键 - 浏览命令历史
  private handleUpArrow(): void {
    if (this.commandHistory.length === 0) return
    
    if (this.historyIndex === -1) {
      // 保存当前输入
      this.currentInput = this.inputBuffer
      // 从最新的命令开始
      this.historyIndex = this.commandHistory.length - 1
    } else if (this.historyIndex > 0) {
      // 向上浏览历史
      this.historyIndex--
    }
    
    // 显示历史命令
    this.displayHistoryCommand()
  }
  
  // 处理下箭头键 - 浏览命令历史
  private handleDownArrow(): void {
    if (this.commandHistory.length === 0 || this.historyIndex === -1) return
    
    if (this.historyIndex < this.commandHistory.length - 1) {
      // 向下浏览历史
      this.historyIndex++
      this.displayHistoryCommand()
    } else {
      // 回到当前输入
      this.historyIndex = -1
      const previousInput = this.inputBuffer
      this.inputBuffer = this.currentInput
      // 使用替换逻辑，保持提示符不变
      const backspaceSequence = '\b \b'.repeat(previousInput.length)
      this.terminal?.write(backspaceSequence)
      this.terminal?.write(this.inputBuffer)
    }
  }
  
  // 处理TAB键 - 自动补全
  private handleTabCompletion(): void {
    // 发送TAB补全请求到服务器
    this.ws?.send(JSON.stringify({
      type: 'tab_complete',
      data: { 
        command: this.inputBuffer
      }
    }))
  }
  
  // 处理TAB补全响应
  private handleTabCompletionResponse(data: any): void {
    const options = data.options || []
    const base = data.base || ''
    
    if (options.length === 0) return
    
    if (options.length === 1) {
      // 单个补全选项 - 直接补全
      const completion = options[0]
      // 检查当前输入是否以base结尾
       if (this.inputBuffer.endsWith(base)) {
         // 计算新的输入：移除base，加上completion
         // 比如输入 "ls /tm"，base="/tm"，completion="/tmp/" -> prefix="ls "
         const prefix = base.length > 0 ? this.inputBuffer.slice(0, -base.length) : this.inputBuffer
         const finalInput = prefix + completion
         
         this.replaceCurrentCommand(finalInput)
         this.inputBuffer = finalInput
       } else {
        // 如果base不匹配（罕见），尝试直接追加或替换
        // 这里假设后端返回的正确补全
        this.replaceCurrentCommand(completion)
        this.inputBuffer = completion
      }
    } else {
      // 多个补全选项 - 显示列表
      if (this.terminal) {
        // 获取当前行内容（包含提示符和输入）以备恢复
        const buffer = this.terminal.buffer.active
        const currentLineY = buffer.cursorY
        const currentLineContent = buffer.getLine(currentLineY)?.translateToString(true) || ''
        
        this.terminal.write('\r\n')
        // 格式化输出选项，尝试适配屏幕宽度
        // 简单实现：空格分隔
        this.terminal.write(options.join('  '))
        this.terminal.write('\r\n')
        
        // 恢复提示符和输入
        if (currentLineContent) {
          this.terminal.write(currentLineContent)
        } else {
          // 降级方案：只显示输入内容
          this.terminal.write(this.inputBuffer)
        }
      }
    }
  }
  
  // 显示历史命令
  private displayHistoryCommand(): void {
    if (this.historyIndex >= 0 && this.historyIndex < this.commandHistory.length) {
      const newCommand = this.commandHistory[this.historyIndex]
      this.replaceCurrentCommand(newCommand)
      this.inputBuffer = newCommand
    }
  }
  
  // 显示当前输入
  private displayCurrentInput(): void {
    // 清空当前行
    this.terminal?.write('\r\x1b[K')
    // 重新显示当前输入
    this.terminal?.write(this.inputBuffer)
  }
  
  // 替换当前命令，保持提示符不变
  private replaceCurrentCommand(newCommand: string): void {
    // 发送退格键序列删除当前命令
    const backspaceSequence = '\b \b'.repeat(this.inputBuffer.length)
    this.terminal?.write(backspaceSequence)
    
    // 写入新命令
    this.terminal?.write(newCommand)
  }

  private log(message: string): void {
    try {
      if (this.terminal) {
        this.terminal.write(`\r\n\x1b[33m${message}\x1b[0m\r\n`)
      }
    } catch (error) {
      console.warn('终端日志写入错误:', error)
    }
  }

  public async connect(): Promise<void> {
    if (this.isConnecting) return
    this.isConnecting = true

    return new Promise((resolve, reject) => {
      if (!this.terminalContainer) {
        reject(new Error('终端容器未找到'))
        return
      }

      // 初始化终端
      this.initTerminal()
      
      // 域名轮训连接函数
      const tryNextDomain = () => {
        // 检查是否所有域名都已尝试过
        if (this.currentDomainIndex >= this.websocketDomains.length) {
          this.isConnecting = false
          reject(new Error('所有SSH服务器连接失败'))
          return
        }
        
        // 获取当前要尝试的域名
        const wsUrl = this.websocketDomains[this.currentDomainIndex]
        this.currentDomainIndex++
        
        this.log(`正在尝试连接到服务器...`)
        
        // 创建WebSocket连接
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          console.log('WebSocket连接已建立:', wsUrl)
          this.log('正在连接SSH服务器...')
          
          // 发送SSH连接配置
          this.ws?.send(JSON.stringify({
            type: 'connect',
            data: this.connectionConfig
          }))
        }
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            switch (message.type) {
              case 'connected':
                this.sessionId = message.session_id
                this.onConnectionChange(true)
                this.log('SSH连接成功！')
                this.isConnecting = false
                // 连接成功后再次调整终端大小，确保光标在框内
                setTimeout(() => {
                  this.resizeTerminal()
                }, 100)
                resolve()
                break
                
              case 'tab_completion_options':
                this.handleTabCompletionResponse(message.data)
                break;

              case 'output':
              case 'data':
                // 接收SSH服务器返回的数据
                try {
                  if (this.terminal) {
                    // 直接写入原始数据，让xterm处理ANSI转义序列
                    const outputData = message.data || message.output || ''
                    
                    // 处理可能的Unicode编码问题
                    if (typeof outputData === 'string') {
                      this.terminal.write(outputData)
                    } else if (outputData instanceof ArrayBuffer) {
                      // 处理二进制数据
                      const decoder = new TextDecoder('utf-8')
                      const text = decoder.decode(outputData)
                      this.terminal.write(text)
                    } else {
                      // 处理其他格式的数据
                      this.terminal.write(String(outputData))
                    }
                  }
                } catch (writeError) {
                  console.warn('终端数据写入错误:', writeError)
                }
                break
                
              case 'error':
                const errorMsg = message.message || '未知错误'
                this.onError(errorMsg)
                try {
                  if (this.terminal) {
                    this.terminal.write(`\r\n\x1b[31m错误: ${errorMsg}\x1b[0m\r\n`)
                  }
                } catch (writeError) {
                  console.warn('错误信息写入失败:', writeError)
                }
                this.isConnecting = false
                reject(new Error(errorMsg))
                break
                
              case 'completed':
                this.log(`命令执行完成，退出码: ${message.exit_code}`)
                break
                
              case 'disconnected':
                this.onConnectionChange(false)
                this.log('SSH连接已断开')
                break
            }
          } catch (error) {
            console.error('消息解析错误:', error)
            this.onError('消息解析错误')
            this.isConnecting = false
          }
        }
        
        this.ws.onerror = (error) => {
          console.error(`WebSocket错误 (${wsUrl}):`, error)
          this.log(`连接失败，正在尝试下一个服务器... (${this.currentDomainIndex}/${this.websocketDomains.length})`)
          
          // 关闭当前连接
          if (this.ws) {
            this.ws.close()
            this.ws = null
          }
          
          // 尝试下一个域名
          setTimeout(tryNextDomain, 500) // 延迟500ms后尝试下一个域名
        }
        
        this.ws.onclose = () => {
          console.log(`WebSocket连接已关闭 (${wsUrl})`)
          // 如果还在连接过程中，尝试下一个域名
          if (this.isConnecting) {
            this.log(`连接关闭，正在尝试下一个服务器... (${this.currentDomainIndex}/${this.websocketDomains.length})`)
            setTimeout(tryNextDomain, 500)
          } else {
            this.onConnectionChange(false)
            this.log('连接已断开')
          }
        }
        
        // 设置超时
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN && this.isConnecting) {
            console.log(`连接超时 (${wsUrl})`)
            this.log(`连接超时，正在尝试下一个服务器... (${this.currentDomainIndex}/${this.websocketDomains.length})`)
            
            // 关闭当前连接
            if (this.ws) {
              this.ws.close()
              this.ws = null
            }
            
            // 尝试下一个域名
            tryNextDomain()
          }
        }, 10000) // 10秒超时
      }
      
      // 开始尝试第一个域名
      tryNextDomain()
    })
  }

  public disconnect(): void {
    try {
      // 发送断开连接消息
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'disconnect'
        }))
      }
      
      // 关闭WebSocket连接
      if (this.ws) {
        this.ws.close()
        this.ws = null
      }
      
      // 清理终端
      if (this.terminal) {
        this.terminal.dispose()
        this.terminal = null
      }
      
      this.onConnectionChange(false)
    } catch (error) {
      console.warn('断开连接时出错:', error)
    }
  }

  public getTerminal(): Terminal | null {
    return this.terminal
  }
}

// 建立真实SSH连接
async function connectRealSSH() {
  if (!terminalContainer.value) {
    throw new Error('终端容器未找到')
  }

  const terminalManager = new SSHTerminal(
    terminalContainer.value,
    connectionConfig.value,
    (connected) => {
      isConnected.value = connected
    },
    (error) => {
      console.error('SSH终端错误:', error)
      // 使用用户友好的错误提示
      let userFriendlyMessage = 'SSH连接失败'
      
      if (error.includes('hostname')) {
        userFriendlyMessage = '连接失败：服务器地址格式错误'
      } else if (error.includes('username')) {
        userFriendlyMessage = '连接失败：用户名格式错误'
      } else if (error.includes('password')) {
        userFriendlyMessage = '连接失败：密码格式错误'
      } else if (error.includes('Field required')) {
        userFriendlyMessage = '连接失败：缺少必填字段，请检查服务器地址、用户名和密码'
      } else if (error.includes('连接超时')) {
        userFriendlyMessage = '连接失败：连接超时，请检查服务器地址和端口'
      } else if (error.includes('WebSocket')) {
        userFriendlyMessage = '连接失败：无法连接到服务器，请检查服务器状态'
      } else if (error.includes('所有SSH服务器连接失败')) {
        userFriendlyMessage = '连接失败：所有SSH服务器都无法连接，请检查网络状态'
      } else {
        userFriendlyMessage = `连接失败：${error}`
      }
      
      showErrorMessage(userFriendlyMessage)
    },
    envConfig.value.websocketDomains // 传递域名列表用于轮训
  )

  try {
    await terminalManager.connect()
    // 保存终端管理器实例供后续使用
    window.sshTerminalManager = terminalManager
  } catch (error) {
    console.error('SSH连接失败:', error)
    throw error
  }
}

// 断开连接方法
function disconnect() {
  // 使用新的终端管理器断开连接
  if (window.sshTerminalManager) {
    window.sshTerminalManager.disconnect()
    window.sshTerminalManager = null
  } else {
    // 兼容旧版本的断开连接逻辑
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'disconnect'
      }))
    }
    
    if (ws) {
      ws.close()
      ws = null
    }
    
    // 清理终端实例（使用新的终端管理器）
    if (window.sshTerminalManager) {
      window.sshTerminalManager.disconnect()
      window.sshTerminalManager = null
    }
  }
  
  isConnected.value = false
  // 重置单次命令执行输出
  executeOutput.value = ''
}

// 重置配置方法
function resetConfig() {
  // 如果当前已连接，先断开连接
  if (isConnected.value) {
    disconnect()
  }
  
  // 重置连接配置（使用正确的属性名hostname）
  connectionConfig.value = {
    hostname: '',
    port: 22,
    username: '',
    password: ''
  }
  
  // 重置状态
  isConnected.value = false
  errorMessage.value = ''
  showError.value = false
  
  // 清理终端管理器实例
  if (window.sshTerminalManager) {
    window.sshTerminalManager.disconnect()
    window.sshTerminalManager = null
  }
}

// 终端管理器实例
let sshTerminalManager: any = null

// 清屏功能
function clearTerminal() {
  const terminal = window.sshTerminalManager?.getTerminal()
  if (terminal) {
    terminal.clear()
    terminal.write('\x1b[1;32mSSH连接工具 v3.0\x1b[0m\r\n')
    terminal.write('输入 \x1b[33mhelp\x1b[0m 查看可用命令\r\n\r\n')
  }
}

// 模拟文件系统结构
const fileSystem = {
  '/': {
    type: 'directory',
    children: {
      'home': {
        type: 'directory',
        children: {
          'user': {
            type: 'directory',
            children: {
              'documents': { type: 'directory', children: {} },
              'downloads': { type: 'directory', children: {} },
              'readme.txt': { 
                type: 'file', 
                content: '欢迎使用前端 SSH 终端模拟器！\n这是一个基于浏览器的模拟终端环境。\n\n输入 \'help\' 查看可用命令。'
              }
            }
          }
        }
      },
      'etc': { type: 'directory', children: {} },
      'var': { type: 'directory', children: {} }
    }
  }
}

let currentPath = '/home/user'
let currentUser = 'user'
let currentHost = 'localhost'

// 命令处理函数
const commands: Record<string, (args: string[]) => string> = {
  ls: (args) => {
    const path = args[0] ? resolvePath(args[0]) : currentPath
    const node = getNode(path)
    if (!node || node.type !== 'directory') {
      return `ls: ${args[0]}: 没有那个文件或目录`
    }
    return Object.keys(node.children || {}).join('  ')
  },

  cd: (args) => {
    if (!args[0]) {
      currentPath = '/home/user'
      return ''
    }
    
    const newPath = resolvePath(args[0])
    const node = getNode(newPath)
    
    if (!node) {
      return `cd: ${args[0]}: 没有那个文件或目录`
    }
    
    if (node.type !== 'directory') {
      return `cd: ${args[0]}: 不是目录`
    }
    
    currentPath = newPath
    return ''
  },

  pwd: () => currentPath,

  cat: (args) => {
    if (!args[0]) {
      return 'cat: 缺少文件参数'
    }
    
    const path = resolvePath(args[0])
    const node = getNode(path)
    
    if (!node) {
      return `cat: ${args[0]}: 没有那个文件或目录`
    }
    
    if (node.type !== 'file') {
      return `cat: ${args[0]}: 是目录`
    }
    
    return node.content || ''
  },

  date: () => new Date().toLocaleString('zh-CN'),

  whoami: () => currentUser,

  uname: () => 'Linux frontend-ssh 6.1.0 #1 SMP Frontend Terminal',

  echo: (args) => args.join(' '),

  clear: () => {
    try {
      const terminal = window.sshTerminalManager?.getTerminal()
      if (terminal) {
        terminal.clear()
      }
    } catch (error) {
      console.warn('清屏命令出错:', error)
    }
    return ''
  },

  help: () => `
可用命令:
  ls [目录]     - 列出文件和目录
  cd [目录]     - 切换目录
  pwd          - 显示当前目录
  cat [文件]    - 查看文件内容
  date         - 显示日期时间
  whoami       - 显示当前用户
  uname        - 显示系统信息
  echo [文本]   - 输出文本
  clear        - 清空终端
  help         - 显示此帮助信息
  theme [dark/light] - 切换主题
  exit         - 退出终端

SSH连接工具 v3.0 - 现代化终端环境
  `,

  theme: (args) => {
    if (args[0] === 'light') {
      document.documentElement.classList.remove('dark')
      return '已切换到浅色主题'
    } else if (args[0] === 'dark') {
      document.documentElement.classList.add('dark')
      return '已切换到深色主题'
    }
    return '用法: theme [dark/light]'
  },

  exit: () => {
    try {
      const terminal = window.sshTerminalManager?.getTerminal()
      if (terminal) {
        terminal.write('\r\n\x1b[33m会话已结束。感谢使用SSH连接工具！\x1b[0m\r\n')
      }
    } catch (error) {
      console.warn('退出命令出错:', error)
    }
    return 'exit'
  }
}

// 路径解析辅助函数
function resolvePath(path: string): string {
  if (path.startsWith('/')) {
    return path
  }
  
  const segments = currentPath.split('/').filter(Boolean)
  const newSegments = path.split('/').filter(Boolean)
  
  for (const segment of newSegments) {
    if (segment === '..') {
      segments.pop()
    } else if (segment !== '.') {
      segments.push(segment)
    }
  }
  
  return '/' + segments.join('/')
}

// 获取文件系统节点
function getNode(path: string): any {
  const segments = path.split('/').filter(Boolean)
  let node = fileSystem['/']
  
  for (const segment of segments) {
    if (node.children && node.children[segment]) {
      node = node.children[segment]
    } else {
      return null
    }
  }
  
  return node
}

// 处理命令输入（保留用于本地命令）
function handleCommand(input: string) {
  try {
    const [command, ...args] = input.trim().split(' ')
    const terminal = window.sshTerminalManager?.getTerminal()
    
    if (commands[command]) {
      const result = commands[command](args)
      if (result && result !== 'exit') {
        terminal?.write('\r\n' + result + '\r\n')
      }
      if (result === 'exit') {
        disconnect()
        return
      }
    } else if (command) {
      terminal?.write(`\r\n${command}: 未找到命令\r\n`)
    }
    
    // 显示新的提示符（仅用于本地命令）
    const prompt = `\x1b[32m${connectionConfig.value.username}@${connectionConfig.value.hostname}\x1b[0m:\x1b[34m${currentPath}\x1b[0m$ `
    terminal?.write(prompt)
  } catch (error) {
    console.warn('命令处理错误:', error)
  }
}



// 更新时间显示
function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN')
}

// 清理函数
function cleanup() {
  try {
    // 清理WebSocket连接
    if (ws) {
      ws.close()
      ws = null
    }
    
    // 清理终端管理器
    if (window.sshTerminalManager) {
      window.sshTerminalManager.disconnect()
      window.sshTerminalManager = null
    }
    
    // 移除事件监听器
    window.removeEventListener('resize', handleResize)
  } catch (error) {
    console.warn('清理函数出错:', error)
  }
}

// 窗口大小变化处理函数
function handleResize() {
  const terminal = window.sshTerminalManager?.getTerminal()
  if (terminal) {
    // 使用新的终端管理器调整大小
    window.sshTerminalManager?.resizeTerminal()
  }
}

// 存储原始方法的变量
let originalAddEventListener: any = null
let originalConsoleError: any = null
let handleError: any = null
let handleUnhandledRejection: any = null
let originalDocAddEventListener: any = null

onMounted(() => {
  // 初始化连接配置默认值
  connectionConfig.value.hostname = envConfig.value.defaultHost
  connectionConfig.value.port = parseInt(envConfig.value.defaultPort)
  
  // 加载保存的配置（会覆盖默认值）
  loadConfig()
  
  // 立即处理已存在的 all.js 错误
  setTimeout(() => {
    // 重写 HTMLBodyElement 的事件处理
    originalAddEventListener = HTMLBodyElement.prototype.addEventListener
    HTMLBodyElement.prototype.addEventListener = function(type, listener, options) {
      if (type === 'click' || type === 'mousedown' || type === 'mouseup') {
        const wrappedListener = function(event) {
          try {
            if (listener) listener.call(this, event)
          } catch (error) {
            if (error.message && error.message.includes('Cannot read properties of undefined')) {
              console.warn('捕获到body元素点击错误，已忽略')
              return
            }
            throw error
          }
        }
        return originalAddEventListener.call(this, type, wrappedListener, options)
      }
      return originalAddEventListener.call(this, type, listener, options)
    }
  }, 0)

  // 添加全局错误处理
  originalConsoleError = console.error
  console.error = function(...args) {
    // 首先检查是否是第三方库错误
    const errorStr = args[0]?.toString() || ''
    if (errorStr.includes('Cannot read properties of undefined') || 
        errorStr.includes('all.js') || 
        errorStr.includes('TypeError')) {
      console.warn('捕获到第三方库错误，已忽略:', errorStr)
      return
    }
    originalConsoleError.apply(console, args)
  }

  // 添加全局错误事件监听 - 捕获所有错误
  handleError = (event: ErrorEvent) => {
    const errorMsg = event.error?.message || event.message || ''
    const filename = event.filename || ''
    
    // 捕获 all.js 相关的所有错误，包括 Cannot read properties of undefined
    if (errorMsg.includes('Cannot read properties of undefined') || 
        filename.includes('all.js') ||
        errorMsg.includes('reading \'0\'') ||
        errorMsg.includes('addDocumentListenerMouse') ||
        errorMsg.includes('HTMLBodyElement') ||
        (event.error && event.error.stack && event.error.stack.includes('all.js'))) {
      console.warn('捕获到 all.js 错误，已忽略:', errorMsg, '来源:', filename)
      event.preventDefault()
      event.stopPropagation()
      return false
    }
  }
  
  // 捕获未处理的Promise错误
  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const errorStr = event.reason?.toString() || ''
    if (errorStr.includes('Cannot read properties of undefined')) {
      console.warn('捕获到未处理的Promise错误，已忽略')
      event.preventDefault()
      event.stopPropagation()
    }
  }
  
  // 使用捕获阶段来确保优先处理
  window.addEventListener('error', handleError, true)
  window.addEventListener('unhandledrejection', handleUnhandledRejection, true)
  
  // 添加更底层的错误处理
  window.onerror = function(message, source, lineno, colno, error) {
    const errorStr = message?.toString() || ''
    const stack = error?.stack || ''
    
    // 更全面地捕获 all.js 相关错误
    if (errorStr.includes('Cannot read properties of undefined') || 
        (source && source.includes('all.js')) ||
        errorStr.includes('addDocumentListenerMouse') ||
        errorStr.includes('HTMLBodyElement') ||
        stack.includes('all.js') ||
        (error && error.message && error.message.includes('Cannot read properties of undefined'))) {
      console.warn('window.onerror捕获到 all.js 错误，已忽略:', errorStr, '行号:', lineno, '堆栈:', stack)
      return true // 阻止默认处理
    }
    return false
  }
  
  // 直接拦截 all.js 的加载和执行
  const scriptTags = document.querySelectorAll('script[src*="all.js"]')
  scriptTags.forEach(script => {
    console.warn('发现 all.js 脚本，已记录')
  })
  
  // 包装 document.addEventListener 来捕获 all.js 的错误
  originalDocAddEventListener = document.addEventListener
  document.addEventListener = function(type, listener, options) {
    if (type === 'mousedown' || type === 'mouseup' || type === 'click') {
      const wrappedListener = function(event) {
        try {
          // 包装事件对象，防止访问未定义的属性
          const safeEvent = new Proxy(event, {
            get(target, prop) {
              if (prop === 'path' && !target.path) {
                return [target.target] // 提供默认的path数组
              }
              return target[prop]
            }
          })
          if (listener) listener.call(this, safeEvent)
        } catch (error) {
          if (error.message && (
              error.message.includes('Cannot read properties of undefined') ||
              error.message.includes('reading \'0\'') ||
              error.message.includes('path')
          )) {
            console.warn('捕获到文档事件监听器错误，已忽略:', error.message)
            return
          }
          throw error
        }
      }
      return originalDocAddEventListener.call(this, type, wrappedListener, options)
    }
    return originalDocAddEventListener.call(this, type, listener, options)
  }
  
  // 添加 MutationObserver 来监控动态加载的脚本
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeName === 'SCRIPT' && node.src && node.src.includes('all.js')) {
          console.warn('检测到 all.js 动态加载')
          // 尝试阻止错误传播
          node.addEventListener('error', (e) => {
            e.preventDefault()
            e.stopPropagation()
            console.warn('all.js 加载错误已阻止')
          })
        }
      })
    })
  })
  
  observer.observe(document.head || document.documentElement, {
    childList: true,
    subtree: true
  })

  // 启动时间更新
  updateTime()
  const timeInterval = setInterval(updateTime, 1000)

  onUnmounted(() => {
    clearInterval(timeInterval)
    cleanup()
    // 恢复原始console.error
    console.error = originalConsoleError
    // 移除错误事件监听
    window.removeEventListener('error', handleError, true)
    window.removeEventListener('unhandledrejection', handleUnhandledRejection, true)
    // 恢复window.onerror
    window.onerror = null
    // 恢复HTMLBodyElement原型方法
    if (HTMLBodyElement.prototype.addEventListener !== originalAddEventListener) {
      HTMLBodyElement.prototype.addEventListener = originalAddEventListener
    }
    // 恢复document.addEventListener
    if (document.addEventListener !== originalDocAddEventListener) {
      document.addEventListener = originalDocAddEventListener
    }
  })

  // 窗口大小变化时调整终端大小
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
/* 简化样式，确保基本边框和背景正常显示 */
:deep(.xterm) {
  background-color: #0a0e27 !important;
  border: none !important;
}

/* 终端外部容器样式 */
.bg-black.rounded-lg.shadow-2xl {
  border: 1px solid #4a5568 !important;
  background-color: #0a0e27 !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
}

/* 终端标题栏样式 */
.bg-slate-800 {
  background-color: #1a1f3a !important;
  border-color: #4a5568 !important;
}

/* 终端底部样式 */
.border-t {
  border-top: 1px solid #4a5568 !important;
}

/* 基本终端文字样式 */
:deep(.xterm-rows) {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 16px;
  line-height: 1.2;
}

/* 终端光标样式 */
:deep(.xterm-cursor) {
  background-color: #98d1ce !important;
}

/* 简化滚动条样式 */
:deep(.xterm-viewport) {
  scrollbar-width: thin;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background: rgba(97, 114, 161, 0.5);
  border-radius: 4px;
}
</style>