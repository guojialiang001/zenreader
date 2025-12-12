# SSH连接工具API使用说明

## 概述

本项目提供了完整的SSH连接工具API调用接口，支持通过HTTP API进行SSH连接管理、命令执行和文件传输操作。

## API端点

### 1. 建立SSH连接
- **端点**: `POST http://localhost:8001/ssh/connect`
- **参数**:
  ```json
  {
    "host": "服务器地址",
    "port": 22,
    "username": "用户名",
    "password": "密码"
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "连接成功",
    "data": {
      "connectionId": "连接唯一标识",
      "status": "connected"
    }
  }
  ```

### 2. 执行SSH命令
- **端点**: `POST http://localhost:8001/ssh/execute`
- **参数**:
  ```json
  {
    "connectionId": "连接ID",
    "command": "要执行的命令"
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "命令执行成功",
    "data": {
      "output": "命令输出",
      "exitCode": 0
    }
  }
  ```

### 3. 断开SSH连接
- **端点**: `POST http://localhost:8001/ssh/disconnect`
- **参数**:
  ```json
  {
    "connectionId": "连接ID"
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "连接已断开",
    "data": {
      "status": "disconnected"
    }
  }
  ```

### 4. 文件传输
- **端点**: `POST http://localhost:8001/ssh/file/transfer`
- **参数**:
  ```json
  {
    "connectionId": "连接ID",
    "localPath": "本地文件路径",
    "remotePath": "远程文件路径",
    "direction": "upload/download"
  }
  ```
- **响应**:
  ```json
  {
    "code": 200,
    "message": "文件传输开始",
    "data": {
      "status": "transferring",
      "progress": 0
    }
  }
  ```

### 5. 获取连接列表
- **端点**: `GET http://localhost:8001/ssh/connections`
- **响应**:
  ```json
  {
    "code": 200,
    "message": "获取成功",
    "data": [
      {
        "connectionId": "连接ID",
        "host": "服务器地址",
        "port": 22,
        "username": "用户名",
        "status": "connected",
        "connectedAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
  ```

## 前端使用方法

### 1. 导入API模块
```typescript
import { api } from '../utils/api'
```

### 2. 建立SSH连接
```typescript
async function connectSSH() {
  try {
    const response = await api.ssh.connect({
      host: '192.168.1.100',
      port: 22,
      username: 'root',
      password: 'password'
    })
    
    if (response.code === 200) {
      const connectionId = response.data.connectionId
      console.log('连接成功:', connectionId)
    }
  } catch (error) {
    console.error('连接失败:', error)
  }
}
```

### 3. 执行命令
```typescript
async function executeCommand(connectionId: string, command: string) {
  try {
    const response = await api.ssh.execute(connectionId, command)
    if (response.code === 200) {
      console.log('命令输出:', response.data.output)
    }
  } catch (error) {
    console.error('命令执行失败:', error)
  }
}
```

### 4. 断开连接
```typescript
async function disconnectSSH(connectionId: string) {
  try {
    await api.ssh.disconnect(connectionId)
    console.log('连接已断开')
  } catch (error) {
    console.error('断开连接失败:', error)
  }
}
```

### 5. 文件传输
```typescript
async function uploadFile(connectionId: string, localPath: string, remotePath: string) {
  try {
    const response = await api.ssh.fileTransfer({
      connectionId,
      localPath,
      remotePath,
      direction: 'upload'
    })
    console.log('文件传输开始:', response.data.progress)
  } catch (error) {
    console.error('文件传输失败:', error)
  }
}
```

### 6. 获取连接列表
```typescript
async function getConnections() {
  try {
    const response = await api.ssh.getConnections()
    if (response.code === 200) {
      console.log('活跃连接:', response.data)
    }
  } catch (error) {
    console.error('获取连接列表失败:', error)
  }
}
```

## 示例组件

项目中包含了一个完整的演示组件 `SSHApiDemo.vue`，展示了如何使用所有API功能：

- 连接配置和建立
- 命令执行和输出显示
- 连接状态管理
- 错误处理
- 连接列表查看

## 错误处理

所有API调用都会返回标准的响应格式，包含错误码和错误信息：

```typescript
try {
  const response = await api.ssh.connect(config)
  if (response.code === 200) {
    // 成功处理
  } else {
    console.error('API错误:', response.message)
  }
} catch (error) {
  console.error('网络错误:', error)
}
```

## 注意事项

1. **服务要求**: 确保SSH连接工具API服务运行在 `localhost:8001`
2. **网络连接**: 前端和后端需要在同一网络环境下
3. **安全性**: 密码等敏感信息通过HTTP传输，建议在生产环境中使用HTTPS
4. **超时处理**: API调用有10秒超时设置，长时间操作需要适当调整

## 开发调试

在开发环境中，API调用会在控制台显示详细的请求和响应信息，方便调试。

---

如有问题或需要进一步定制，请参考源代码或联系开发团队。