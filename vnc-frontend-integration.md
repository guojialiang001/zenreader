# VNC 远程桌面前端对接文档

## 概述

本文档描述如何在前端应用中通过 iframe 嵌入 VNC 远程桌面查看器。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           前端应用                                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  <iframe src="https://vnc.toproject.cloud/vnc/view/xxx?token=xxx">│  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    后端 API (vnc.toproject.cloud)                        │
│                                                                          │
│  GET /vnc/view/{session_id}?token=xxx                                   │
│       │                                                                  │
│       ▼                                                                  │
│  返回 vnc.html (包含 noVNC 客户端)                                       │
│       │                                                                  │
│       ▼                                                                  │
│  vnc.html 内部连接 WebSocket:                                            │
│  wss://vnc.toproject.cloud/websockify?session={session_id}              │
│       │                                                                  │
│       ▼                                                                  │
│  WebSocket 代理 (/websockify)                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ws://{container_ip}:6080/websockify (容器内 noVNC)                      │
│       │                                                                  │
│       ▼                                                                  │
│  VNC Server (容器内 :5901)                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

## API 接口

### 1. VNC 查看器页面 (iframe 嵌入)

**URL**: `GET /vnc/view/{session_id}?token={access_token}`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 是 | 沙箱会话 ID |
| token | string | 是 | 用户访问令牌 (JWT) |

**返回**: HTML 页面 (vnc.html)

**示例**:
```
https://vnc.toproject.cloud/vnc/view/2961db6f-da33-4ea0-8376-7c6be602682f?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. VNC 嵌入页面 (一次性密码)

**URL**: `GET /vnc/embed/{session_id}?pwd={one_time_password}`

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 是 | 沙箱会话 ID |
| pwd | string | 是 | 一次性访问密码 |

**返回**: HTML 页面 (vnc.html)

### 3. WebSocket 代理

**URL**: `WSS /websockify?session={session_id}`

**说明**: 此接口由 vnc.html 内部自动调用，前端无需直接调用。

## 前端集成示例

### React 组件示例

```tsx
import React, { useMemo } from 'react';

interface VncViewerProps {
  sessionId: string;
  token: string;
  width?: string | number;
  height?: string | number;
}

const VncViewer: React.FC<VncViewerProps> = ({
  sessionId,
  token,
  width = '100%',
  height = '600px'
}) => {
  const vncUrl = useMemo(() => {
    const baseUrl = 'https://vnc.toproject.cloud/vnc/view';
    return `${baseUrl}/${sessionId}?token=${encodeURIComponent(token)}`;
  }, [sessionId, token]);

  return (
    <iframe
      src={vncUrl}
      width={width}
      height={height}
      style={{
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#1a1a2e'
      }}
      allow="clipboard-read; clipboard-write"
      title="VNC Remote Desktop"
    />
  );
};

export default VncViewer;
```

### Vue 组件示例

```vue
<template>
  <iframe
    :src="vncUrl"
    :width="width"
    :height="height"
    :style="iframeStyle"
    allow="clipboard-read; clipboard-write"
    title="VNC Remote Desktop"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  sessionId: string;
  token: string;
  width?: string | number;
  height?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '600px'
});

const vncUrl = computed(() => {
  const baseUrl = 'https://vnc.toproject.cloud/vnc/view';
  return `${baseUrl}/${props.sessionId}?token=${encodeURIComponent(props.token)}`;
});

const iframeStyle = {
  border: 'none',
  borderRadius: '8px',
  backgroundColor: '#1a1a2e'
};
</script>
```

### 原生 HTML 示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>VNC Viewer</title>
  <style>
    .vnc-container {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
    }
    .vnc-iframe {
      width: 100%;
      height: 720px;
      border: none;
      border-radius: 8px;
      background-color: #1a1a2e;
    }
  </style>
</head>
<body>
  <div class="vnc-container">
    <iframe
      id="vnc-viewer"
      class="vnc-iframe"
      allow="clipboard-read; clipboard-write"
      title="VNC Remote Desktop"
    ></iframe>
  </div>

  <script>
    function loadVncViewer(sessionId, token) {
      const iframe = document.getElementById('vnc-viewer');
      const baseUrl = 'https://vnc.toproject.cloud/vnc/view';
      iframe.src = `${baseUrl}/${sessionId}?token=${encodeURIComponent(token)}`;
    }

    // 使用示例
    loadVncViewer('2961db6f-da33-4ea0-8376-7c6be602682f', 'your_jwt_token');
  </script>
</body>
</html>
```

## 完整使用流程

### 1. 创建沙箱会话

```javascript
// 调用创建沙箱 API
const response = await fetch('https://vnc.toproject.cloud/endpoint/sandbox/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    sandbox_type: 'linux-desktop',
    timeout: 3600
  })
});

const result = await response.json();
const sessionId = result.data.id;
```

### 2. 嵌入 VNC 查看器

```javascript
// 构建 VNC URL
const vncUrl = `https://vnc.toproject.cloud/vnc/view/${sessionId}?token=${accessToken}`;

// 设置 iframe src
document.getElementById('vnc-iframe').src = vncUrl;
```

### 3. 关闭沙箱会话

```javascript
// 调用关闭沙箱 API
await fetch(`https://vnc.toproject.cloud/endpoint/sandbox/sessions/${sessionId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

## 状态说明

vnc.html 页面底部有状态栏，显示连接状态：

| 状态 | 颜色 | 说明 |
|------|------|------|
| 连接中 | 黄色 | 正在建立 WebSocket 连接 |
| 已连接 | 绿色 | VNC 连接成功，可以查看桌面 |
| 已断开 | 红色 | 连接断开，会自动尝试重连 |

## 错误处理

### HTTP 错误码

| 状态码 | 说明 |
|--------|------|
| 401 | 缺少或无效的访问令牌 |
| 404 | 沙箱会话不存在或无权访问 |
| 400 | 沙箱未运行 |
| 500 | 服务器内部错误 |

### WebSocket 关闭码

| 关闭码 | 说明 |
|--------|------|
| 4000 | 沙箱未运行或 VNC 端口未配置 |
| 4001 | 缺少认证参数 |
| 4004 | 会话不存在 |

## 注意事项

1. **Token 安全**: 不要在 URL 中暴露长期有效的 token，建议使用短期 token 或一次性密码
2. **跨域配置**: 确保后端 CORS 配置允许前端域名访问
3. **iframe 权限**: 添加 `allow="clipboard-read; clipboard-write"` 以支持剪贴板功能
4. **响应式设计**: iframe 的宽高建议使用百分比或响应式单位
5. **连接超时**: 沙箱有超时时间限制，超时后会自动关闭

## 后端日志

访问 VNC 页面时，后端会输出以下日志：

```
[VNC View] 收到请求 - session_id: xxx, token: ***
[VNC View] 请求路径: /vnc/view/xxx, 完整URL: ...
[VNC View] 客户端IP: 192.168.1.100
[VNC View] VNC WebSocket URL: wss://vnc.toproject.cloud/websockify?session=xxx
[VNC WS] WebSocket 连接请求 - session_id: xxx
[VNC WS] 代理目标: ws://172.18.0.5:6080/websockify
[VNC WS] 已连接到目标: ws://172.18.0.5:6080/websockify
[VNC WS] 客户端连接已接受: xxx
```

## 依赖

后端需要安装 `websockets` 库：

```bash
pip install websockets
```
