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

// Mistral AI响应类型
export interface MistralAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
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
  },

  // 通用GLM API调用函数
  async callGLMAPI(messages: Array<{ role: string; content: string }>, maxTokens: number = 2000): Promise<string> {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 00c2e8182184400788489142b6a92323.jOoPIDTX6p4nFxrk',
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Host': 'open.bigmodel.cn',
        'Connection': 'keep-alive'
      },
      body: JSON.stringify({
        model: 'glm-4.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      throw new Error(`GLM API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as any
    // 优先使用reasoning_content字段，如果为空则使用content字段
    const message = data.choices[0].message
    return message.reasoning_content || message.content
  },

  // 生成剧本大纲
  generateOutline: async (topic: string): Promise<string> => {
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的编剧助手，请根据用户提供的主题生成详细的剧本大纲。大纲应包括：1. 故事概述 2. 主要角色介绍 3. 故事结构（起承转合） 4. 预计章节数量和每章主要内容。请使用清晰的结构和简洁的语言。'
      },
      {
        role: 'user',
        content: `请为以下主题生成详细的剧本大纲：${topic}`
      }
    ]
    return await api.callGLMAPI(messages, 2000)
  },

  // 修复截断的JSON
  fixTruncatedJSON(jsonStr: string): string {
    // 移除可能的代码块标记
    let fixedJson = jsonStr.replace(/^```json|```$/g, '').trim()
    
    // 统计括号数量
    const openBraces = (fixedJson.match(/\{/g) || []).length
    const closeBraces = (fixedJson.match(/\}/g) || []).length
    const openBrackets = (fixedJson.match(/\[/g) || []).length
    const closeBrackets = (fixedJson.match(/\]/g) || []).length
    
    // 补全缺失的括号
    for (let i = closeBraces; i < openBraces; i++) {
      fixedJson += '}'
    }
    for (let i = closeBrackets; i < openBrackets; i++) {
      fixedJson += ']'
    }
    
    // 修复可能的尾随逗号
    fixedJson = fixedJson.replace(/,\s*([}\]])/g, '$1')
    
    return fixedJson
  },

  // 生成章节列表
  generateChapterList: async (outline: string): Promise<Array<{ title: string; summary: string }>> => {
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的编剧助手，请根据提供的剧本大纲生成详细的章节列表。每个章节应包含：1. 章节标题 2. 章节主要内容概述。请以JSON格式返回，例如：[{"title":"第1章：开端","summary":"主要内容概述"}]。'
      },
      {
        role: 'user',
        content: `请根据以下剧本大纲生成详细的章节列表：${outline}`
      }
    ]
    const response = await api.callGLMAPI(messages, 1500)
    // 解析JSON格式的章节列表
    try {
      // 尝试直接解析
      return JSON.parse(response)
    } catch (error) {
      console.warn('JSON解析失败，尝试修复截断的JSON:', error)
      try {
        // 尝试修复截断的JSON
        const fixedJson = api.fixTruncatedJSON(response)
        return JSON.parse(fixedJson)
      } catch (fixError) {
        throw new Error(`章节列表解析失败: ${response}`)
      }
    }
  },

  // 生成章节内容
  generateChapterContent: async (outline: string, chapterTitle: string, chapterSummary: string): Promise<string> => {
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的编剧助手，请根据剧本大纲和章节信息生成详细的章节内容。内容应包括：1. 场景描述 2. 人物对话 3. 动作描写 4. 情感表达。请使用清晰的剧本格式，便于阅读和编辑。'
      },
      {
        role: 'user',
        content: `请根据以下剧本大纲和章节信息生成详细的章节内容：\n\n剧本大纲：${outline}\n\n章节标题：${chapterTitle}\n章节概述：${chapterSummary}`
      }
    ]
    return await api.callGLMAPI(messages, 3000)
  },

  // 兼容旧版调用的函数
  chatWithMistral: async (prompt: string): Promise<string> => {
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的编剧助手，能够根据用户提供的主题或大纲生成完整的剧本，包括章纲和详细的章节内容。请按照清晰的结构组织内容，便于用户阅读和编辑。'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
    return await api.callGLMAPI(messages, 4000)
  }
}

// 导出默认实例，方便直接使用
export { default as http } from './axios'
export default api