<template>
  <div class="ssh-api-demo">
    <div class="demo-container">
      <h2>SSH连接工具API演示</h2>
      
      <!-- 连接配置 -->
      <div class="config-section">
        <h3>连接配置</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>服务器地址</label>
            <input v-model="sshConfig.host" type="text" placeholder="例如：192.168.1.100" />
          </div>
          <div class="form-group">
            <label>端口</label>
            <input v-model="sshConfig.port" type="number" placeholder="默认：22" />
          </div>
          <div class="form-group">
            <label>用户名</label>
            <input v-model="sshConfig.username" type="text" placeholder="例如：root" />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="sshConfig.password" type="password" placeholder="输入密码" />
          </div>
        </div>
        <div class="button-group">
          <button @click="connectSSH" :disabled="!canConnect || connecting" class="btn-primary">
            {{ connecting ? '连接中...' : '建立连接' }}
          </button>
          <button @click="getConnections" class="btn-secondary">获取连接列表</button>
        </div>
      </div>

      <!-- 命令执行 -->
      <div v-if="currentConnection" class="command-section">
        <h3>命令执行</h3>
        <div class="command-input">
          <input 
            v-model="command" 
            type="text" 
            placeholder="输入要执行的命令" 
            @keyup.enter="executeCommand"
          />
          <button @click="executeCommand" :disabled="!command || executing" class="btn-primary">
            {{ executing ? '执行中...' : '执行' }}
          </button>
        </div>
        <div class="output-section">
          <h4>命令输出</h4>
          <pre class="output">{{ commandOutput }}</pre>
        </div>
        <div class="button-group">
          <button @click="disconnectSSH" class="btn-danger">断开连接</button>
          <button @click="clearOutput" class="btn-secondary">清空输出</button>
        </div>
      </div>

      <!-- 连接列表 -->
      <div v-if="connections.length > 0" class="connections-section">
        <h3>活跃连接</h3>
        <div class="connections-list">
          <div v-for="conn in connections" :key="conn.connectionId" class="connection-item">
            <div class="connection-info">
              <span class="host">{{ conn.username }}@{{ conn.host }}:{{ conn.port }}</span>
              <span :class="['status', conn.status]">{{ conn.status }}</span>
              <span class="time">{{ formatTime(conn.connectedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 状态信息 -->
      <div class="status-section">
        <div :class="['status-indicator', status]"></div>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- 错误信息 -->
      <div v-if="error" class="error-section">
        <h4>错误信息</h4>
        <pre class="error">{{ error }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { api } from '../utils/api'

// SSH配置
const sshConfig = ref({
  host: '',
  port: 22,
  username: '',
  password: ''
})

// 状态变量
const connecting = ref(false)
const executing = ref(false)
const currentConnection = ref<string | null>(null)
const command = ref('')
const commandOutput = ref('')
const connections = ref<any[]>([])
const error = ref('')

// 计算属性
const canConnect = computed(() => {
  return sshConfig.value.host.trim() !== '' && 
         sshConfig.value.username.trim() !== '' && 
         sshConfig.value.password.trim() !== ''
})

const status = computed(() => {
  if (currentConnection.value) return 'connected'
  if (connecting.value) return 'connecting'
  return 'disconnected'
})

const statusText = computed(() => {
  switch (status.value) {
    case 'connected': return '已连接'
    case 'connecting': return '连接中...'
    default: return '未连接'
  }
})

// 方法
async function connectSSH() {
  if (!canConnect.value) return
  
  connecting.value = true
  error.value = ''
  
  try {
    const response = await api.ssh.connect(sshConfig.value)
    if (response.code === 200) {
      currentConnection.value = response.data.connectionId
      commandOutput.value = `连接成功！连接ID: ${response.data.connectionId}\n`
    } else {
      error.value = `连接失败: ${response.message}`
    }
  } catch (err: any) {
    error.value = `连接错误: ${err.message}`
  } finally {
    connecting.value = false
  }
}

async function executeCommand() {
  if (!currentConnection.value || !command.value.trim()) return
  
  executing.value = true
  
  try {
    const response = await api.ssh.execute(currentConnection.value, command.value)
    if (response.code === 200) {
      commandOutput.value += `$ ${command.value}\n${response.data.output}\n`
    } else {
      commandOutput.value += `$ ${command.value}\n错误: ${response.message}\n`
    }
  } catch (err: any) {
    commandOutput.value += `$ ${command.value}\n执行错误: ${err.message}\n`
  } finally {
    executing.value = false
    command.value = ''
  }
}

async function disconnectSSH() {
  if (!currentConnection.value) return
  
  try {
    const response = await api.ssh.disconnect(currentConnection.value)
    if (response.code === 200) {
      commandOutput.value += `连接已断开: ${response.data.status}\n`
    }
  } catch (err: any) {
    commandOutput.value += `断开连接错误: ${err.message}\n`
  } finally {
    currentConnection.value = null
  }
}

async function getConnections() {
  try {
    const response = await api.ssh.getConnections()
    if (response.code === 200) {
      connections.value = response.data
    }
  } catch (err: any) {
    error.value = `获取连接列表失败: ${err.message}`
  }
}

function clearOutput() {
  commandOutput.value = ''
  error.value = ''
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 组件生命周期
onMounted(() => {
  // 可以在这里初始化一些数据
})

onUnmounted(() => {
  // 清理连接
  if (currentConnection.value) {
    disconnectSSH()
  }
})
</script>

<style scoped>
.ssh-api-demo {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.demo-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
}

.config-section, .command-section, .connections-section {
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.command-input {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.command-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.output-section {
  margin-bottom: 15px;
}

.output, .error {
  background: #1e1e1e;
  color: #00ff00;
  padding: 15px;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
}

.error {
  color: #ff6b6b;
}

.connections-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.connection-item {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #dee2e6;
}

.connection-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
}

.status.connected {
  background: #28a745;
}

.status.connecting {
  background: #ffc107;
}

.status.disconnected {
  background: #dc3545;
}

.status-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.connected {
  background: #28a745;
  animation: pulse 2s infinite;
}

.status-indicator.connecting {
  background: #ffc107;
  animation: pulse 1s infinite;
}

.status-indicator.disconnected {
  background: #dc3545;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

h2, h3, h4 {
  margin: 0 0 15px 0;
  color: #333;
}

h2 {
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}
</style>