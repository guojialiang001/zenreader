# AI Agent 沙箱系统前端对接指南

本指南旨在帮助前端开发人员快速接入后端服务，实现沙箱创建、对话交互、终端操作及 VNC 访问。

## 0. 前置准备

### 0.1 运行安装脚本
安装脚本会自动完成依赖镜像拉取和沙箱镜像构建：

```bash
# Windows
scripts\install.bat

# Linux/Mac
chmod +x scripts/install.sh
./scripts/install.sh
```

### 0.2 验证沙箱镜像
安装完成后，验证沙箱镜像是否构建成功：
```bash
docker images ai-sandbox
# 应显示 ai-sandbox:latest 镜像
```

### 0.3 启动服务
```bash
# Windows
scripts\start.bat

# Linux/Mac
./scripts/start.sh
```

## 1. 基础环境
- **后端地址**: `http://localhost:8000`
- **API 前缀**: `/endpoint`
- **WebSocket 前缀**: `ws://localhost:8000/ws`

## 2. 认证机制

### 2.1 开发模式（匿名用户）

开发模式下，系统支持匿名用户自动创建，无需登录即可使用。

#### 首次访问 - 开始对话并获取 Token

使用专门的 `/conversations/start` 接口：

```bash
# 首次请求：不带任何认证头，自动创建匿名用户和对话
curl -X POST http://localhost:8000/endpoint/chat/conversations/start \
  -H "Content-Type: application/json" \
  -d '{"title": "新对话"}'
```

**响应示例**：
```json
{
  "code": 0,
  "message": "对话创建成功",
  "data": {
    "user_id": "user-uuid-xxx",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "conversation_id": "conv-uuid-xxx",
    "conversation_title": "新对话"
  }
}
```

#### 后续请求 - 使用 Token

前端应保存返回的 `user_id` 和 `access_token`，后续请求使用：

```bash
# 方式1（推荐）：使用 Authorization 头
curl -X GET http://localhost:8000/endpoint/chat/conversations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 方式2（备用）：使用 X-Session-ID 头（Token 失效时的降级方案）
curl -X GET http://localhost:8000/endpoint/chat/conversations \
  -H "X-Session-ID: user-uuid-xxx"

# 创建更多对话（需要认证）
curl -X POST http://localhost:8000/endpoint/chat/conversations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"title": "第二个对话"}'
```

#### 前端存储建议

```javascript
// 首次访问：开始对话
async function startConversation(title = '新对话') {
  const response = await fetch('/endpoint/chat/conversations/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  const data = await response.json();

  // 保存到 localStorage
  localStorage.setItem('user_id', data.data.user_id);
  localStorage.setItem('access_token', data.data.access_token);
  localStorage.setItem('refresh_token', data.data.refresh_token);
  localStorage.setItem('current_conversation_id', data.data.conversation_id);
  
  return data.data;
}

// 后续请求：带认证头
function getAuthHeaders() {
  const token = localStorage.getItem('access_token');
  const userId = localStorage.getItem('user_id');
  return {
    'Authorization': `Bearer ${token}`,
    'X-Session-ID': userId  // 备用
  };
}

// 创建更多对话
async function createConversation(title) {
  const response = await fetch('/endpoint/chat/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ title })
  });
  return response.json();
}

// 获取对话列表
async function listConversations() {
  const response = await fetch('/endpoint/chat/conversations', {
    headers: getAuthHeaders()
  });
  return response.json();
}
```

### 2.2 生产模式（JWT 认证）

生产模式下，所有请求需在 Header 中携带 Token：
`Authorization: Bearer {your_access_token}`

WebSocket 认证通过 Query Parameter 传递：
`ws://localhost:8000/ws/chat?token={your_access_token}`

## 3. 核心业务流程

### 3.1 开始对话（首次访问，自动创建用户）
- **接口**: `POST /endpoint/chat/conversations/start`
- **认证**: 无需认证
- **Payload**:
```json
{
  "title": "新对话"  // 可选
}
```
- **响应**: 返回 `user_id`、`access_token`、`refresh_token`、`conversation_id`

### 3.2 创建对话（已认证用户）
- **接口**: `POST /endpoint/chat/conversations`
- **认证**: 需要 `Authorization: Bearer <token>`
- **Payload**:
```json
{
  "title": "新对话"
}
```
- **响应**: 返回对话信息

### 3.3 发送消息并获取 AI 响应（REST API）
- **接口**: `POST /endpoint/chat/chat`
- **认证**: 需要 `Authorization: Bearer <token>`
- **Payload**:
```json
{
  "message": "你好，请帮我写一个 Python 脚本",
  "conversation_id": "conv-uuid",  // 可选，不提供则创建新对话
  "wait_for_response": true  // 是否等待 AI 响应（默认 true）
}
```
- **响应**（wait_for_response=true）:
```json
{
  "code": 0,
  "message": "对话完成",
  "data": {
    "conversation_id": "conv-uuid",
    "user_message": {
      "id": "msg-uuid",
      "role": "user",
      "content": "你好，请帮我写一个 Python 脚本",
      "status": "completed"
    },
    "assistant_message": {
      "id": "msg-uuid",
      "role": "assistant",
      "content": "好的，我来帮你写一个 Python 脚本...",
      "status": "completed"
    },
    "is_processing": false
  }
}
```

**前端示例**:
```javascript
// 发送消息并等待 AI 响应
async function sendMessage(message, conversationId = null) {
  const response = await fetch('/endpoint/chat/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      wait_for_response: true
    })
  });
  return response.json();
}

// 使用示例
const result = await sendMessage('你好，请帮我写一个 Python 脚本');
console.log('AI 回复:', result.data.assistant_message.content);
```

### 3.4 创建沙箱会话
- **接口**: `POST /endpoint/sandbox/sessions`
- **Payload**:
```json
{
  "sandbox_type": "linux-desktop",
  "timeout": 3600
}
```
- **重要返回字段**:
    - `id`: 会话 ID (Session ID)，后续所有操作的基石。
    - `novnc_port`: 访问桌面所需的端口。
    - `vnc_password`: VNC 访问密码。

### 3.3 获取 VNC 连接信息
- **接口**: `GET /endpoint/sandbox/sessions/{session_id}/vnc`
- **用途**: 获取 `vnc_url` (通常是 `ws://localhost:{novnc_port}/websockify`)。

## 4. WebSocket 交互

### 4.1 AI 对话 (`/ws/chat`)

#### 连接方式
```
ws://localhost:8000/ws/chat?token={access_token}
```

#### 客户端发送消息类型

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `chat` | 发送对话消息 | `message`, `conversation_id?`, `include_thinking?` |
| `ping` | 心跳检测 | 无 |
| `subscribe` | 订阅对话频道 | `conversation_id` |
| `unsubscribe` | 取消订阅 | `conversation_id` |

**发送消息示例**:
```json
{
  "type": "chat",
  "payload": {
    "message": "帮我写一个 python 脚本并运行",
    "conversation_id": "可选，不传则创建新对话",
    "include_thinking": true
  },
  "request_id": "可选，用于关联响应"
}
```

#### 服务端响应消息类型

##### 连接与基础消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `connected` | 连接成功 | `connection_id`, `user_id` |
| `pong` | 心跳响应 | 无 |
| `subscribed` | 订阅成功 | `conversation_id` |
| `error` | 错误消息 | `message`, `error?` |

##### 对话流程消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `chat_started` | 对话开始 | `conversation_id`, `message_id`, `user_message_id` |
| `thinking` | AI 思考过程 | `conversation_id`, `message_id`, `thinking_step` |
| `chat_response` | 增量文本输出 | `conversation_id`, `message_id`, `delta` |
| `chat_complete` | 对话完成 | `conversation_id`, `message_id`, `content` |

##### 任务分析与流程消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `task_analysis` | 任务分析结果 | `analysis: {complexity, task_type, requires_sandbox, reasoning}` |
| `flow_node` | 流程节点状态 | `node`, `status`, `message`, `data` |

##### 计划执行消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `plan_start` | 计划开始执行 | `message`, `data: {plan, total_steps, steps_preview}` |
| `plan_complete` | 计划执行完成 | `message`, `data: {success, duration, statistics, summary}` |
| `plan_revision` | 计划修订中 | `message`, `data: {failed_step, error, revision_count}` |
| `plan_revised` | 计划已修订 | `message`, `data: {plan, new_steps, revision_count}` |

##### 步骤执行消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `step_start` | 步骤开始 | `message`, `data: {step, progress, tool_info}` |
| `step_success` | 步骤成功 | `message`, `data: {step, result_summary, variables_created}` |
| `step_failed` | 步骤失败 | `message`, `data: {step, error, retry_count, can_revise}` |
| `step_retry` | 步骤重试 | `data: {step_id, retry_count, max_retries, error}` |

##### 工具调用消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `tool_call` | 工具调用开始 | `tool`, `arguments`, `data` |
| `tool_result` | 工具执行结果 | `tool`, `result`, `data: {success, execution_time}` |

##### LLM 与变量消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `llm_call` | LLM 调用 | `purpose`, `message` |
| `llm_response` | LLM 响应 | `response_preview` |
| `variable_set` | 变量设置 | `data: {name, value, value_type}` |
| `variable_resolve` | 变量解析 | `data: {original_args, resolved_args, variables_used}` |

##### 任务列表消息 (TODO List)

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `todo_list_update` | 任务列表更新 | `todo_list`, `changed_item_id`, `change_type`, `timestamp` |
| `todo_item_update` | 单个任务项更新 | `item`, `list_id`, `change_type`, `statistics`, `timestamp` |

##### 文件树消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `file_tree_update` | 文件树更新 | `file_tree`, `context`, `related_task_id`, `highlighted_paths` |
| `file_changes_update` | 文件变更列表 | `changes`, `total_changes`, `related_task_id` |

##### 沙箱消息

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `sandbox_ready` | 沙箱就绪 | `session_id`, `vnc_url`, `vnc_password` |

#### 状态枚举值

##### 消息状态 (MessageStatus)
| 值 | 说明 |
|----|------|
| `pending` | 待处理 |
| `streaming` | 流式输出中 |
| `completed` | 已完成 |
| `error` | 错误 |

##### 消息角色 (MessageRole)
| 值 | 说明 |
|----|------|
| `user` | 用户消息 |
| `assistant` | AI 助手消息 |
| `system` | 系统消息 |
| `tool` | 工具消息 |

##### 任务复杂度 (complexity)
| 值 | 说明 |
|----|------|
| `simple` | 简单问答，直接回答 |
| `moderate` | 中等复杂度，可能需要工具 |
| `complex` | 复杂任务，需要多步骤执行 |

##### 任务类型 (task_type)
| 值 | 说明 |
|----|------|
| `chat` | 普通对话问答 |
| `code` | 代码编写、执行、调试 |
| `file` | 文件创建、读取、修改 |
| `shell` | 系统命令执行 |
| `gui` | 图形界面操作 |
| `browser` | 网页浏览、操作 |
| `analysis` | 数据分析处理 |
| `creative` | 创意内容生成 |

##### 思考步骤类型 (thinking step_type)
| 值 | 说明 |
|----|------|
| `analyzing` | 正在分析用户请求 |
| `routing` | 路由决策 |
| `planning` | 制定执行计划 |
| `executing` | 执行计划中 |
| `tool_execution` | 执行工具 |
| `step_complete` | 步骤完成 |
| `step_failed` | 步骤失败 |
| `replanning` | 修订计划 |
| `warning` | 警告信息 |

##### 流程节点 (flow_node)
| 值 | 说明 |
|----|------|
| `planning` | 规划阶段 |
| `execution` | 执行阶段 |
| `step_execution` | 步骤执行 |
| `replanning` | 重新规划 |
| `summarizing` | 总结阶段 |

##### 流程节点状态 (flow_node status)
| 值 | 说明 |
|----|------|
| `started` | 已开始 |
| `completed` | 已完成 |
| `failed` | 失败 |

##### TODO 任务状态 (TodoStatus)
| 值 | 说明 |
|----|------|
| `pending` | 待执行 |
| `in_progress` | 执行中 |
| `completed` | 已完成 |
| `failed` | 失败 |
| `skipped` | 跳过 |

##### TODO 变更类型 (change_type)
| 值 | 说明 |
|----|------|
| `created` | 任务列表创建 |
| `updated` | 任务列表更新 |
| `completed` | 任务列表执行完成 |
| `status_change` | 状态变化 |
| `progress_update` | 进度更新 |
| `failed` | 任务失败 |

##### 文件类型 (FileType)
| 值 | 说明 |
|----|------|
| `file` | 文件 |
| `directory` | 目录 |
| `symlink` | 符号链接 |

##### 文件状态 (FileStatus)
| 值 | 说明 |
|----|------|
| `unchanged` | 未变更 |
| `created` | 新创建 |
| `modified` | 已修改 |
| `deleted` | 已删除 |
| `renamed` | 重命名 |

#### 前端处理示例

```javascript
// WebSocket 连接和消息处理
class ChatWebSocket {
    constructor(token) {
        this.token = token;
        this.ws = null;
        this.handlers = {};
    }
    
    connect() {
        this.ws = new WebSocket(`ws://localhost:8000/ws/chat?token=${this.token}`);
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket 连接关闭');
            // 可以实现自动重连
        };
    }
    
    handleMessage(data) {
        const { type, payload, request_id } = data;
        
        switch (type) {
            case 'connected':
                console.log('连接成功:', payload.connection_id);
                break;
                
            case 'chat_started':
                this.onChatStarted(payload);
                break;
                
            case 'thinking':
                this.onThinking(payload);
                break;
                
            case 'chat_response':
                this.onChatResponse(payload);
                break;
                
            case 'task_analysis':
                this.onTaskAnalysis(payload);
                break;
                
            case 'plan_start':
                this.onPlanStart(payload);
                break;
                
            case 'step_start':
                this.onStepStart(payload);
                break;
                
            case 'step_success':
                this.onStepSuccess(payload);
                break;
                
            case 'step_failed':
                this.onStepFailed(payload);
                break;
                
            case 'tool_call':
                this.onToolCall(payload);
                break;
                
            case 'tool_result':
                this.onToolResult(payload);
                break;
                
            case 'todo_list_update':
                this.onTodoListUpdate(payload);
                break;
                
            case 'todo_item_update':
                this.onTodoItemUpdate(payload);
                break;
                
            case 'file_tree_update':
                this.onFileTreeUpdate(payload);
                break;
                
            case 'file_changes_update':
                this.onFileChangesUpdate(payload);
                break;
                
            case 'sandbox_ready':
                this.onSandboxReady(payload);
                break;
                
            case 'plan_complete':
                this.onPlanComplete(payload);
                break;
                
            case 'chat_complete':
                this.onChatComplete(payload);
                break;
                
            case 'error':
                this.onError(payload);
                break;
        }
    }
    
    // 发送消息
    sendMessage(message, conversationId = null, includeThinking = true) {
        this.ws.send(JSON.stringify({
            type: 'chat',
            payload: {
                message,
                conversation_id: conversationId,
                include_thinking: includeThinking
            },
            request_id: this.generateRequestId()
        }));
    }
    
    // 心跳
    ping() {
        this.ws.send(JSON.stringify({ type: 'ping' }));
    }
    
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // 事件处理方法（由使用者覆盖）
    onChatStarted(payload) {}
    onThinking(payload) {}
    onChatResponse(payload) {}
    onTaskAnalysis(payload) {}
    onPlanStart(payload) {}
    onStepStart(payload) {}
    onStepSuccess(payload) {}
    onStepFailed(payload) {}
    onToolCall(payload) {}
    onToolResult(payload) {}
    onTodoListUpdate(payload) {}
    onTodoItemUpdate(payload) {}
    onFileTreeUpdate(payload) {}
    onFileChangesUpdate(payload) {}
    onSandboxReady(payload) {}
    onPlanComplete(payload) {}
    onChatComplete(payload) {}
    onError(payload) {}
}

// 使用示例
const chat = new ChatWebSocket(accessToken);
chat.onChatResponse = (payload) => {
    // 追加增量文本到消息区域
    appendText(payload.delta);
};
chat.onTodoListUpdate = (payload) => {
    // 更新任务列表 UI
    updateTodoList(payload.todo_list);
};
chat.onFileTreeUpdate = (payload) => {
    // 更新文件树 UI
    updateFileTree(payload.file_tree);
};
chat.connect();
```

### 4.2 实时终端 (`/ws/terminal/{session_id}`)

#### 连接方式
```
ws://localhost:8000/ws/terminal/{session_id}?token={access_token}
```

#### 客户端发送消息类型

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `input` | 终端输入 | `data` (字符串) |
| `resize` | 调整终端大小 | `cols`, `rows` |

**输入示例**:
```json
{
  "type": "input",
  "payload": {
    "data": "ls -la\n"
  }
}
```

#### 服务端响应消息类型

| 类型 | 说明 | payload 字段 |
|------|------|-------------|
| `output` | 终端输出 | `data` (字符串) |
| `exit` | 终端退出 | `code` (退出码) |
| `error` | 错误 | `message` |

**输出示例**:
```json
{
  "type": "output",
  "payload": {
    "data": "total 24\ndrwxr-xr-x  5 user user 4096 Jan  3 12:00 .\n..."
  }
}
```

#### 前端集成示例 (xterm.js)

```javascript
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

class TerminalWebSocket {
    constructor(sessionId, token, container) {
        this.sessionId = sessionId;
        this.token = token;
        this.container = container;
        this.terminal = null;
        this.ws = null;
    }
    
    init() {
        // 初始化 xterm.js
        this.terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace'
        });
        
        const fitAddon = new FitAddon();
        this.terminal.loadAddon(fitAddon);
        this.terminal.open(this.container);
        fitAddon.fit();
        
        // 连接 WebSocket
        this.ws = new WebSocket(
            `ws://localhost:8000/ws/terminal/${this.sessionId}?token=${this.token}`
        );
        
        // 处理终端输入
        this.terminal.onData((data) => {
            this.ws.send(JSON.stringify({
                type: 'input',
                payload: { data }
            }));
        });
        
        // 处理 WebSocket 消息
        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'output') {
                this.terminal.write(msg.payload.data);
            } else if (msg.type === 'exit') {
                this.terminal.write(`\r\n[进程已退出，退出码: ${msg.payload.code}]\r\n`);
            }
        };
        
        // 处理窗口大小变化
        window.addEventListener('resize', () => {
            fitAddon.fit();
            this.ws.send(JSON.stringify({
                type: 'resize',
                payload: {
                    cols: this.terminal.cols,
                    rows: this.terminal.rows
                }
            }));
        });
    }
    
    dispose() {
        this.ws?.close();
        this.terminal?.dispose();
    }
}
```

## 5. 文件管理 API

文件管理 API 提供对沙箱工作空间的完整文件操作能力，包括单文件下载和整个工作空间的 ZIP 打包下载。

### 5.1 API 端点总览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/endpoint/file/sandbox/{session_id}/list` | GET | 列出目录内容 |
| `/endpoint/file/sandbox/{session_id}/read` | GET | 读取文件内容 |
| `/endpoint/file/sandbox/{session_id}/download` | GET | 下载单个文件 |
| `/endpoint/file/sandbox/{session_id}/download-workspace` | GET | 下载整个工作空间为 ZIP |
| `/endpoint/file/sandbox/{session_id}/download-directory` | GET | 下载指定目录为 ZIP |
| `/endpoint/file/sandbox/{session_id}/write` | POST | 写入文件 |
| `/endpoint/file/sandbox/{session_id}/upload` | POST | 上传文件 |
| `/endpoint/file/sandbox/{session_id}/delete` | DELETE | 删除文件 |

### 5.2 列出目录内容

```bash
GET /endpoint/file/sandbox/{session_id}/list?path=/home/sandbox/workspace
```

**响应示例**:
```json
{
  "code": 0,
  "data": [
    {
      "name": "main.py",
      "path": "/home/sandbox/workspace/main.py",
      "type": "file",
      "size": 1024
    },
    {
      "name": "src",
      "path": "/home/sandbox/workspace/src",
      "type": "directory",
      "size": null
    }
  ]
}
```

### 5.3 读取文件内容

```bash
GET /endpoint/file/sandbox/{session_id}/read?path=/home/sandbox/workspace/main.py
```

**响应示例**:
```json
{
  "code": 0,
  "data": {
    "content": "print('Hello, World!')\n",
    "path": "/home/sandbox/workspace/main.py"
  }
}
```

### 5.4 下载单个文件

```bash
GET /endpoint/file/sandbox/{session_id}/download?path=/home/sandbox/workspace/main.py
```

**响应**: 文件流（`application/octet-stream`）

**前端示例**:
```javascript
// 下载单个文件
async function downloadFile(sessionId, filePath, fileName) {
    const response = await fetch(
        `/endpoint/file/sandbox/${sessionId}/download?path=${encodeURIComponent(filePath)}`,
        {
            headers: getAuthHeaders()
        }
    );
    
    if (!response.ok) {
        throw new Error('下载失败');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || filePath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

// 使用文件树节点中的 download_url
function downloadFromFileNode(fileNode) {
    const link = document.createElement('a');
    link.href = fileNode.download_url;
    link.download = fileNode.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
```

### 5.5 下载整个工作空间为 ZIP

下载整个工作空间或指定目录，打包为 ZIP 文件。

```bash
# 下载默认工作空间
GET /endpoint/file/sandbox/{session_id}/download-workspace

# 下载指定目录
GET /endpoint/file/sandbox/{session_id}/download-workspace?path=/home/sandbox/workspace/src
```

**参数**:
- `path` (可选): 要下载的目录路径，默认为 `/home/sandbox/workspace`

**响应**: ZIP 文件流（`application/zip`）

**响应头**:
```
Content-Type: application/zip
Content-Disposition: attachment; filename="workspace_20240103_120000.zip"
```

**前端示例**:
```javascript
// 下载整个工作空间为 ZIP
async function downloadWorkspaceAsZip(sessionId, customPath = null) {
    let url = `/endpoint/file/sandbox/${sessionId}/download-workspace`;
    if (customPath) {
        url += `?path=${encodeURIComponent(customPath)}`;
    }
    
    const response = await fetch(url, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '下载失败');
    }
    
    // 从响应头获取文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'workspace.zip';
    if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
            filename = match[1];
        }
    }
    
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
}

// 下载指定目录为 ZIP
async function downloadDirectoryAsZip(sessionId, directoryPath) {
    return downloadWorkspaceAsZip(sessionId, directoryPath);
}
```

### 5.6 上传文件

```bash
POST /endpoint/file/sandbox/{session_id}/upload?path=/home/sandbox/workspace
Content-Type: multipart/form-data
```

**前端示例**:
```javascript
// 上传文件到沙箱
async function uploadFile(sessionId, file, targetPath = '/home/sandbox/workspace') {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(
        `/endpoint/file/sandbox/${sessionId}/upload?path=${encodeURIComponent(targetPath)}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                // 注意：不要设置 Content-Type，让浏览器自动设置 multipart/form-data
            },
            body: formData
        }
    );
    
    return response.json();
}

// 使用示例
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const result = await uploadFile(sessionId, file);
        console.log('上传成功:', result.data.path);
    }
});
```

### 5.7 写入文件

```bash
POST /endpoint/file/sandbox/{session_id}/write
Content-Type: application/json

{
  "path": "/home/sandbox/workspace/new_file.py",
  "content": "print('Hello!')"
}
```

**前端示例**:
```javascript
// 写入文件内容
async function writeFile(sessionId, filePath, content) {
    const response = await fetch(
        `/endpoint/file/sandbox/${sessionId}/write`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                path: filePath,
                content: content
            })
        }
    );
    
    return response.json();
}
```

### 5.8 删除文件

```bash
DELETE /endpoint/file/sandbox/{session_id}/delete?path=/home/sandbox/workspace/old_file.py
```

**前端示例**:
```javascript
// 删除文件
async function deleteFile(sessionId, filePath) {
    const response = await fetch(
        `/endpoint/file/sandbox/${sessionId}/delete?path=${encodeURIComponent(filePath)}`,
        {
            method: 'DELETE',
            headers: getAuthHeaders()
        }
    );
    
    return response.json();
}
```

### 5.9 文件树 UI 组件示例

结合文件树事件和文件管理 API，实现完整的文件管理界面：

```javascript
// 文件树组件（带下载按钮）
function FileTreePanel({ fileTree, sessionId, highlightedPaths }) {
    // 下载整个工作空间
    const handleDownloadWorkspace = async () => {
        try {
            await downloadWorkspaceAsZip(sessionId);
        } catch (error) {
            alert('下载失败: ' + error.message);
        }
    };
    
    return (
        <div className="file-tree-panel">
            <div className="panel-header">
                <h3>项目文件</h3>
                <button
                    className="download-all-btn"
                    onClick={handleDownloadWorkspace}
                    title="下载整个工作空间为 ZIP"
                >
                    📦 下载全部
                </button>
            </div>
            <div className="tree-stats">
                文件: {fileTree.total_files} | 目录: {fileTree.total_directories}
                {fileTree.modified_count > 0 && ` | 变更: ${fileTree.modified_count}`}
            </div>
            <FileTreeNode
                node={fileTree.root}
                sessionId={sessionId}
                highlightedPaths={highlightedPaths}
            />
        </div>
    );
}

function FileTreeNode({ node, sessionId, highlightedPaths, depth = 0 }) {
    const isHighlighted = highlightedPaths?.includes(node.path);
    const statusClass = node.status !== 'unchanged' ? `status-${node.status}` : '';
    
    // 下载单个文件
    const handleDownloadFile = async (e) => {
        e.stopPropagation();
        if (node.download_url) {
            // 使用文件节点中的下载链接
            window.open(node.download_url, '_blank');
        } else {
            await downloadFile(sessionId, node.path, node.name);
        }
    };
    
    // 下载目录为 ZIP
    const handleDownloadDirectory = async (e) => {
        e.stopPropagation();
        try {
            await downloadDirectoryAsZip(sessionId, node.path);
        } catch (error) {
            alert('下载失败: ' + error.message);
        }
    };
    
    return (
        <div className={`tree-node ${statusClass} ${isHighlighted ? 'highlighted' : ''}`}>
            <div className="node-content" style={{ paddingLeft: depth * 16 }}>
                {node.type === 'directory' ? (
                    <>
                        <span className="folder-icon">📁</span>
                        <span className="name">{node.name}</span>
                        <button
                            className="download-btn"
                            onClick={handleDownloadDirectory}
                            title="下载此目录为 ZIP"
                        >
                            📥
                        </button>
                    </>
                ) : (
                    <>
                        <span className="file-icon">{getFileIcon(node.language)}</span>
                        <span className="name">{node.name}</span>
                        <button
                            className="download-btn"
                            onClick={handleDownloadFile}
                            title="下载此文件"
                        >
                            ⬇️
                        </button>
                    </>
                )}
                {node.status !== 'unchanged' && (
                    <span className={`status-badge ${node.status}`}>
                        {node.status}
                    </span>
                )}
            </div>
            {node.children && node.is_expanded && (
                <div className="children">
                    {node.children.map(child => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            sessionId={sessionId}
                            highlightedPaths={highlightedPaths}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// 文件图标映射
function getFileIcon(language) {
    const icons = {
        'python': '🐍',
        'javascript': '📜',
        'typescript': '📘',
        'html': '🌐',
        'css': '🎨',
        'json': '📋',
        'markdown': '📝',
        'shell': '💻',
        'yaml': '⚙️',
        'default': '📄'
    };
    return icons[language] || icons.default;
}
```

### 5.10 CSS 样式示例

```css
.file-tree-panel {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 16px;
    background: #fafafa;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.panel-header h3 {
    margin: 0;
    font-size: 16px;
}

.download-all-btn {
    padding: 6px 12px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.download-all-btn:hover {
    background: #45a049;
}

.tree-stats {
    font-size: 12px;
    color: #666;
    margin-bottom: 12px;
}

.tree-node {
    margin: 2px 0;
}

.node-content {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
}

.node-content:hover {
    background: #e8e8e8;
}

.node-content .name {
    flex: 1;
    margin-left: 8px;
}

.download-btn {
    opacity: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 6px;
    font-size: 14px;
}

.node-content:hover .download-btn {
    opacity: 1;
}

.status-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
}

.status-badge.created {
    background: #c8e6c9;
    color: #2e7d32;
}

.status-badge.modified {
    background: #fff3e0;
    color: #ef6c00;
}

.status-badge.deleted {
    background: #ffcdd2;
    color: #c62828;
}

.tree-node.highlighted > .node-content {
    background: #e3f2fd;
    border-left: 3px solid #2196F3;
}
```

## 6. VNC 桌面接入

系统使用 `noVNC` 提供 Web 桌面。

1. 前端集成 `noVNC` 库。
2. 连接到地址：`ws://{ip}:{novnc_port}/websockify`。
3. 提示用户输入接口返回的 `vnc_password`。

---
*注：详细接口定义请参考后端 Swagger 文档：http://localhost:8000/endpoint/docs*