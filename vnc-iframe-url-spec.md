# VNC iframe URL 规范文档

## 概述

本文档定义了 AI Sandbox 项目中 VNC iframe 嵌入的 URL 格式规范。系统支持应用级 VNC 会话，允许前端通过 iframe 嵌入特定应用（如终端、浏览器）的 VNC 视图。

## URL 格式

### 标准格式

```
https://vnc.toproject.cloud/vnc/view/{session_id}?token={vnc_token}&app={app_name}&display={display}
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | ✅ | 沙箱会话 ID（UUID 格式） |
| `token` | string | ✅ | VNC 访问令牌（由后端自动生成，存储在数据库 `sandbox_sessions.vnc_token`） |
| `app` | string | ✅ | 应用名称，如 `terminal`、`browser` 等 |
| `display` | int | ❌ | X Display 编号（默认为 1） |

### 示例

#### 终端 VNC

```html
<iframe 
  src="https://vnc.toproject.cloud/vnc/view/abc123-def456?token=xYz789AbC&app=terminal&display=1"
  width="100%" 
  height="600"
  frameborder="0"
></iframe>
```

#### 浏览器 VNC

```html
<iframe 
  src="https://vnc.toproject.cloud/vnc/view/abc123-def456?token=xYz789AbC&app=browser&display=2"
  width="100%" 
  height="600"
  frameborder="0"
></iframe>
```

## 后端返回格式

### tool_call 事件中的 vnc 字段

当执行 `shell_executor` 等工具时，后端会在 `tool_call` 事件中返回 VNC 信息：

```json
{
  "type": "tool_call",
  "payload": {
    "conversation_id": "6ee415b7-e3b6-4411-9055-3daeaa2a06f6",
    "message_id": "3f9d7349-5a6e-4c00-bd59-123daf6fb90d",
    "data": {
      "tool": "shell_executor",
      "arguments": {
        "command": "ls -la /home/sandbox/workspace"
      },
      "step_id": 1,
      "description": "检查工作目录状态",
      "tool_description": "工具: shell_executor"
    },
    "vnc": {
      "app": "terminal",
      "display": 1,
      "vnc_port": 5901,
      "novnc_port": 6081,
      "sandbox_session_id": "abc123-def456",
      "iframeURL": "https://vnc.toproject.cloud/vnc/view/abc123-def456?token=xYz789AbC&app=terminal&display=1"
    }
  }
}
```

### vnc 字段结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `app` | string | 应用名称 |
| `display` | int | X Display 编号 |
| `vnc_port` | int | VNC 服务端口（容器内部） |
| `novnc_port` | int | noVNC WebSocket 端口（容器内部） |
| `sandbox_session_id` | string | 沙箱会话 ID |
| `iframeURL` | string | 完整的 iframe 嵌入 URL |

## 前端集成指南

### 1. 监听 tool_call 事件

```javascript
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'tool_call' && message.payload.vnc) {
    const vncInfo = message.payload.vnc;
    
    // 显示 VNC iframe
    showVncIframe(vncInfo.iframeURL);
  }
};
```

### 2. 渲染 VNC iframe

```javascript
function showVncIframe(iframeURL) {
  const container = document.getElementById('vnc-container');
  container.innerHTML = `
    <iframe 
      src="${iframeURL}"
      width="100%" 
      height="100%"
      frameborder="0"
      allow="clipboard-read; clipboard-write"
    ></iframe>
  `;
}
```

### 3. 处理 vnc 为 null 的情况

如果 `vnc` 字段为 `null`，表示：
- VNC 服务尚未启动
- 沙箱会话不存在或已过期
- VNC token 生成失败

```javascript
if (message.payload.vnc === null) {
  console.warn('VNC 信息不可用');
  // 可以显示占位符或重试
}
```

## 应用级 VNC 架构

### 支持的应用类型

| 应用名称 | 说明 | 默认 Display |
|----------|------|--------------|
| `terminal` | 终端/命令行界面 | :1 |
| `browser` | 浏览器（Chromium） | :2 |
| `desktop` | 完整桌面环境 | :0 |

### VNC 端口映射

每个应用使用独立的 X Display 和 VNC 端口：

| Display | VNC 端口 | noVNC 端口 | 用途 |
|---------|----------|------------|------|
| :0 | 5900 | 6080 | 桌面环境 |
| :1 | 5901 | 6081 | 终端 |
| :2 | 5902 | 6082 | 浏览器 |

### WebSocket 代理路由

VNC 代理服务使用以下格式路由 WebSocket 连接：

```
/websockify?session={session_id}:{app_name}
```

例如：
- `/websockify?session=abc123:terminal` → 连接到终端 VNC
- `/websockify?session=abc123:browser` → 连接到浏览器 VNC

## 安全机制

### VNC Token 验证

1. **Token 生成**：后端在首次请求 VNC 时自动生成 `vnc_token`
2. **Token 存储**：存储在数据库 `sandbox_sessions.vnc_token` 字段
3. **Token 验证**：VNC 代理服务验证 `session_id` + `vnc_token` 组合

### Token 生命周期

- Token 在沙箱会话创建时生成（或首次 VNC 请求时）
- Token 在沙箱会话销毁时失效
- Token 可通过管理 API 手动失效

### 管理 API

```bash
# 失效 VNC 会话
POST /admin/session/{session_id}/invalidate
X-Admin-Key: {admin_key}

# 关闭所有 VNC 连接
POST /admin/session/{session_id}/close
X-Admin-Key: {admin_key}
```

## 错误处理

### 常见错误码

| HTTP 状态码 | 说明 |
|-------------|------|
| 401 | 缺少或无效的访问令牌 |
| 404 | 会话不存在或 token 无效 |
| 400 | 沙箱未运行 |

### WebSocket 关闭码

| 关闭码 | 说明 |
|--------|------|
| 4000 | 通用错误（沙箱未运行、连接超时等） |
| 4001 | 缺少 session 参数 |
| 4004 | 会话不存在或应用不存在 |

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2026-01-09 | 初始版本，支持应用级 VNC URL 格式 |

## 相关文档

- [VNC 前端集成指南](./vnc-frontend-integration.md)
- [VNC iframe 故障排除](./vnc-iframe-troubleshooting.md)
- [前端事件协议](./frontend-event-protocol.md)