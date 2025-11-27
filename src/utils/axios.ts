import axios from 'axios'

// 创建axios实例
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等认证信息
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 开发环境打印请求信息
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config)
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 开发环境打印响应信息
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, response.data)
    }
    
    return response.data
  },
  (error) => {
    // 开发环境打印错误信息
    if (import.meta.env.DEV) {
      console.log(`❌ ${error.response?.status} ${error.config?.url}`, error.response?.data || error.message)
    }
    
    // 统一错误处理
    if (error.response) {
      // 服务器返回错误状态码
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 未授权，跳转到登录页
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          // 权限不足
          console.error('权限不足:', data?.message || '无访问权限')
          break
        case 404:
          // 资源不存在
          console.error('资源不存在:', data?.message || '请求的资源不存在')
          break
        case 500:
          // 服务器内部错误
          console.error('服务器错误:', data?.message || '服务器内部错误')
          break
        default:
          console.error('请求错误:', data?.message || '未知错误')
      }
    } else if (error.request) {
      // 请求未收到响应
      console.error('网络错误:', '请检查网络连接')
    } else {
      // 其他错误
      console.error('请求配置错误:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export default instance