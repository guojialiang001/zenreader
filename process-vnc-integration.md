# 进程级VNC前端对接文档

## 架构概述

```
┌─────────────────────────────────────────────────────────────┐
│                        前端                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Chrome VNC  │  │ Terminal VNC│  │  其他应用   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│              VNC代理服务 (8002端口)                          │
│  WebSocket: /websockify?session={session_id}:{app_name}     │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    沙箱容器                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Sandbox Executor (8080)                  │  │
│  │  POST /vnc/app/start  - 启动应用VNC                   │  │
│  │  POST /vnc/app/stop   - 停止应用VNC                   │  │
│  │  GET  /vnc/app/list   - 列出应用VNC                   │  │
│  │  GET  /vnc/app/{name} - 获取应用VNC信息               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │ Xvnc :1     │  │ Xvnc :2     │  ...                     │
│  │ Chrome      │  │ Terminal    │                          │
│  │ ws 6081     │  │ ws 6082     │                          │
│  └─────────────┘  └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

## Shell命令自动拉起VNC流程

执行shell命令时，系统自动拉起终端VNC并执行命令，前端通过 `tool_call` 事件获取VNC信息并连接查看。

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  前端    │     │主服务8000│     │容器8080  │     │VNC代理   │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1.发送消息     │                │                │
     │───────────────>│                │                │
     │                │ 2.调用shell工具│                │
     │                │───────────────>│                │
     │                │                │ 3.拉起终端VNC  │
     │                │                │   并执行命令   │
     │                │<───────────────│                │
     │                │ 4.返回vnc配置  │                │
     │<───────────────│                │                │
     │ 5.tool_call    │                │                │
     │   (带vnc字段)  │                │                │
     │                │                │                │
     │ 6.连接VNC      │                │                │
     │────────────────────────────────────────────────>│
     │<────────────────────────────────────────────────│
     │  实时看到命令  │                │                │
```

**简化流程：前端收到 `tool_call` 事件后连接VNC，连接成功后发送 `vnc_connected` 通知后端，后端才执行命令。**

## WebSocket事件

### tool_call (带VNC信息)

当执行shell命令时，`tool_call` 事件携带 `vnc` 和 `vnc_wait_id` 字段。

**事件格式：**
```json
{
  "type": "tool_call",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "tool": "shell_executor",
    "arguments": { "command": "npm install" },
    "data": { "step_id": 0 },
    "vnc": {
      "app": "terminal",
      "display": 1,
      "novnc_port": 6081,
      "vnc_port": 5901
    },
    "vnc_wait_id": "vnc_0_123456"
  }
}
```

### vnc_connected (前端发送)

前端VNC连接成功后，发送此消息通知后端开始执行命令。

```json
{
  "type": "vnc_connected",
  "payload": {
    "vnc_wait_id": "vnc_0_123456"
  }
}
```

**前端处理示例：**
```javascript
// 监听WebSocket事件
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === "tool_call" && msg.payload.vnc) {
    const { app } = msg.payload.vnc;
    const vnc_wait_id = msg.payload.vnc_wait_id;
    const vncUrl = `wss://vnc.example.com/websockify?session=${sessionId}:${app}`;

    // 连接VNC
    const rfb = new RFB(document.getElementById('vnc-container'), vncUrl);
    rfb.credentials = { password: 'sandbox123' };

    // VNC连接成功后通知后端
    rfb.addEventListener('connect', () => {
      ws.send(JSON.stringify({
        type: 'vnc_connected',
        payload: { vnc_wait_id }
      }));
    });
  }
};
```

## API接口

### 1. 启动应用VNC

**请求**
```http
POST http://{container_ip}:8080/vnc/app/start
Content-Type: application/json

{
  "app": "chrome",
  "command": "google-chrome --no-sandbox --start-maximized",
  "resolution": "1280x720"
}
```

**响应**
```json
{
  "success": true,
  "app": "chrome",
  "display": 1,
  "vnc_port": 5901,
  "novnc_port": 6081
}
```

### 2. 停止应用VNC

**请求**
```http
POST http://{container_ip}:8080/vnc/app/stop
Content-Type: application/json

{
  "app": "chrome"
}
```

**响应**
```json
{
  "success": true
}
```

### 3. 列出应用VNC

**请求**
```http
GET http://{container_ip}:8080/vnc/app/list
```

**响应**
```json
{
  "apps": [
    {"app": "chrome", "display": 1, "vnc_port": 5901, "novnc_port": 6081},
    {"app": "terminal", "display": 2, "vnc_port": 5902, "novnc_port": 6082}
  ]
}
```

### 4. 获取应用VNC信息

**请求**
```http
GET http://{container_ip}:8080/vnc/app/{app_name}
```

**响应**
```json
{
  "app": "chrome",
  "display": 1,
  "vnc_port": 5901,
  "novnc_port": 6081
}
```

## 常用应用启动命令

| 应用 | 命令 |
|------|------|
| Chrome | `google-chrome --no-sandbox --start-maximized` |
| Firefox | `firefox` |
| Terminal | `xfce4-terminal --maximize` |
| VSCode | `code --no-sandbox` |
| 文件管理器 | `thunar` |

## 注意事项

1. **VNC密码**: 默认密码为 `sandbox123`，可通过环境变量 `VNC_PASSWORD` 配置
2. **端口分配**: display N 对应 VNC端口 5900+N，noVNC端口 6080+N
3. **WebSocket格式**: `/websockify?session={session_id}:{app_name}`
4. **应用名称**: 必须唯一，用于标识和管理VNC会话
5. **自动拉起**: 执行shell命令时自动拉起terminal VNC，前端监听`vnc_connect_ready`事件即可
