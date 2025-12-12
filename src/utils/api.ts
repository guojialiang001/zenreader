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
  
  // SSH连接工具API接口
  ssh: {
    // 建立SSH连接
    connect: (config: {
      host: string;
      port?: number;
      username: string;
      password: string;
    }): Promise<ApiResponse<{ connectionId: string; status: string }>> => {
      return axios.post('http://localhost:8001/ssh/connect', config)
    },

    // 执行SSH命令
    execute: (connectionId: string, command: string): Promise<ApiResponse<{ output: string; exitCode: number }>> => {
      return axios.post('http://localhost:8001/ssh/execute', { connectionId, command })
    },

    // 断开SSH连接
    disconnect: (connectionId: string): Promise<ApiResponse<{ status: string }>> => {
      return axios.post('http://localhost:8001/ssh/disconnect', { connectionId })
    },

    // 文件传输
    fileTransfer: (config: {
      connectionId: string;
      localPath: string;
      remotePath: string;
      direction: 'upload' | 'download';
    }): Promise<ApiResponse<{ status: string; progress: number }>> => {
      return axios.post('http://localhost:8001/ssh/file/transfer', config)
    },

    // 获取连接列表
    getConnections: (): Promise<ApiResponse<Array<{
      connectionId: string;
      host: string;
      port: number;
      username: string;
      status: string;
      connectedAt: string;
    }>>> => {
      return axios.get('http://localhost:8001/ssh/connections')
    }
  },

  // 生成3D动作数据
  generate3DAction: async (prompt: string): Promise<{
    name: string;
    description: string;
    duration: number;
    keyframes: Array<{
      time: number;
      joints: Array<{
        name: string;
        rotation: { x: number; y: number; z: number };
        position: { x: number; y: number; z: number };
      }>;
    }>;
  }> => {
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的3D动画设计师，请根据用户提供的动作提示词生成详细的3D动作数据。返回格式为纯JSON，不要包含任何代码块标记，不要包含任何解释性文字，只返回JSON数据，包含：1. 动作名称 2. 动作描述 3. 持续时间（秒）4. 关键帧数组，每个关键帧包含时间点、关节名称、旋转角度和位置。' + 
        '\n关节名称必须从以下列表中选择：spine1, spine2, head, leftUpperArm, leftLowerArm, rightUpperArm, rightLowerArm, leftUpperLeg, leftLowerLeg, rightUpperLeg, rightLowerLeg。' +
        '\n返回示例：{"name":"挥手","description":"简单的挥手动作","duration":2,"keyframes":[{"time":0,"joints":[{"name":"rightUpperArm","rotation":{"x":0,"y":0,"z":0},"position":{"x":0,"y":0,"z":0}}]}]}'
      },
      {
        role: 'user',
        content: `请生成以下动作的3D数据：${prompt}`
      }
    ]
    
    const response = await api.callGLMAPI(messages, 3000)
    try {
      // 从响应中提取JSON部分
      let jsonStr = response.trim()
      
      // 移除任何代码块标记
      jsonStr = jsonStr.replace(/^```json|```$/g, '').trim()
      
      // 查找JSON的开始和结束位置
      const jsonStart = jsonStr.indexOf('{')
      const jsonEnd = jsonStr.lastIndexOf('}')
      
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1)
      }
      
      // 修复可能的JSON格式问题
      const fixedResponse = api.fixTruncatedJSON(jsonStr)
      return JSON.parse(fixedResponse)
    } catch (error) {
      throw new Error(`3D动作数据解析失败: ${response}`)
    }
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