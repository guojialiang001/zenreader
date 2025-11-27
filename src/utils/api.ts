import axios from './axios'

// 通用API响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页参数
export interface PaginationParams {
  page?: number
  pageSize?: number
}

// 分页响应
export interface PaginationResponse<T = any> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 示例API接口
export const api = {
  // 获取用户信息
  getUserInfo: (): Promise<ApiResponse<{ id: number; name: string; email: string }>> => {
    return axios.get('/user/info')
  },

  // 获取工具列表
  getTools: (params?: PaginationParams): Promise<ApiResponse<PaginationResponse>> => {
    return axios.get('/tools', { params })
  },

  // 上传文件
  uploadFile: (file: File): Promise<ApiResponse<{ url: string; filename: string }>> => {
    const formData = new FormData()
    formData.append('file', file)
    return axios.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 转换文本
  convertText: (text: string, type: 'upper' | 'lower' | 'camel'): Promise<ApiResponse<{ result: string }>> => {
    return axios.post('/convert/text', { text, type })
  },

  // 处理JSON
  processJson: (json: string, action: 'format' | 'minify' | 'validate'): Promise<ApiResponse<{ result: string; valid: boolean }>> => {
    return axios.post('/json/process', { json, action })
  },

  // 图片处理
  processImage: (imageData: string, operation: 'resize' | 'compress' | 'convert'): Promise<ApiResponse<{ result: string; size: number }>> => {
    return axios.post('/image/process', { imageData, operation })
  }
}

// 导出默认实例，方便直接使用
export { default as http } from './axios'
export default api