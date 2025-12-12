<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ZenReader - 多功能在线工具集合

一个基于 Vue 3 + TypeScript 的现代化在线工具平台，集成了多种实用工具。

## 功能特性

- 📖 Markdown 阅读器
- 🔧 JSON 格式化工具
- ⏰ 时间戳转换器
- 🔠 大小写转换器
- 🖼️ 图片转 BASE64
- 🔗 字符串拼接工具
- 🌐 完整的 API 请求支持 (Axios)

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **路由**: Vue Router 4
- **HTTP 客户端**: Axios
- **构建工具**: Vite
- **UI 组件**: Tailwind CSS + Lucide 图标

## API 集成

项目已集成 Axios，提供完整的 HTTP 请求解决方案：

### 配置说明

1. 复制环境配置文件：
   ```bash
   cp .env.example .env.local
   ```

2. 在 `.env.local` 中配置 API 地址：
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

3. SSH终端配置（可选）：
   ```env
   # SSH默认连接配置
   VITE_SSH_DEFAULT_HOST=localhost        # 默认SSH主机地址
   VITE_SSH_DEFAULT_PORT=22               # 默认SSH端口
   
   # WebSocket配置 - ⚠️ HTTPS网站必须使用wss://协议
   VITE_SSH_WEBSOCKET_URL=wss://localhost:8002/ws/ssh      # SSH交互式终端WebSocket地址
   VITE_SSH_EXECUTE_URL=wss://localhost:8002/ws/ssh/execute  # SSH单次命令执行WebSocket地址
   
   # HTTP网站可以使用ws://协议
   # VITE_SSH_WEBSOCKET_URL=ws://localhost:8002/ws/ssh
   # VITE_SSH_EXECUTE_URL=ws://localhost:8002/ws/ssh/execute
   ```

### 使用方法

1. **导入 API 工具**：
   ```typescript
   import { api } from '@/utils/api'
   ```

2. **发起请求**：
   ```typescript
   // GET 请求
   const userInfo = await api.getUserInfo()
   
   // POST 请求
   const result = await api.convertText('hello', 'upper')
   
   // 文件上传
   const uploadResult = await api.uploadFile(file)
   ```

3. **直接使用 HTTP 实例**：
   ```typescript
   import { http } from '@/utils/api'
   
   const response = await http.get('/some-endpoint')
   ```

## 运行项目

**环境要求**: Node.js 16+

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量（可选）：
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 文件
   ```

3. 启动开发服务器：
   ```bash
   npm run dev
   ```

4. 构建生产版本：
   ```bash
   npm run build
   ```
