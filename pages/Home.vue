<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { FileText, Braces, Clock, Type, Image as ImageIcon, Code, Hash, MessageSquare, Search, X, FileCode, Palette, FileEdit, GitBranch, Brain, Calculator, ImageIcon as ImageIcon2, LayoutTemplate, Wand2, Mic, FlaskConical } from 'lucide-vue-next'

const searchQuery = ref('')

const tools = [
  // { name: '语音识别', desc: '将语音转换为文本，支持多种语言和实时识别', route: '/speech', icon: 'speech', tags: ['语音', '识别', '转换', 'ASR'], features: ['实时识别', '多语言支持', '语音合成'], usageCount: '0k+' },
  { name: '去AI味润色', desc: '将AI生成的文本改写得更自然、更具人情味', route: '/humanizer', icon: 'humanizer', tags: ['AI', '文案', '润色', '去AI味'], features: ['多种风格', '流式响应', '一键复制'], usageCount: '0k+' },
  { name: '流程画布', desc: '类似ProcessOn的流程图绘制工具，支持多种形状和连接线', route: '/flow', icon: 'flow', tags: ['流程图', '画布', '设计'], features: ['拖拽编辑', '自动保存', '导出PNG/JSON'], usageCount: '0k+' },
  { name: '多模态问答', desc: '上传图片进行AI视觉问答，GLM-4.1V Thinking Flash智能分析', route: '/multimodal', icon: 'multimodal', tags: ['AI', '视觉', '问答', '图片'], features: ['图片上传', 'thinking模式', '流式响应'], usageCount: '0k+' },
  { name: '多模型问答', desc: '支持多种 AI 模型的智能对话，流式响应', route: '/chat', icon: 'chat', tags: ['AI', '对话', '问答'], features: ['多模型选择', '流式响应', '上下文记忆'], usageCount: '0.1k+' },
  { name: 'Markdown 编辑器', desc: '左右分栏实时预览，支持快捷键和格式工具栏', route: '/markdown', icon: 'markdown', tags: ['编辑', '预览', 'Markdown'], features: ['实时预览', '快捷键支持', '自动保存'], usageCount: '0k+' },
  { name: 'Markdown 阅读器', desc: '导入阅读 Markdown，优雅排版', route: '/reader', icon: 'file', tags: ['阅读', '预览', '文档'], features: ['实时渲染', '多主题支持', '暗黑模式'], usageCount: '12.5k+' },
  { name: '文档预览', desc: '浏览器内预览 PDF、Word、Excel、PPT', route: '/doc-preview', icon: 'doc-preview', tags: ['文档', '预览', 'PDF', 'Office'], features: ['拖拽上传', 'PDF 预览', '原文件下载'], usageCount: '0k+' },
  { name: '代码编辑器', desc: '基于Monaco的在线代码编辑器，支持多种语言', route: '/editor', icon: 'editor', tags: ['代码', '编辑', '开发'], features: ['语法高亮', '多语言支持', '本地保存'], usageCount: '0k+' },
  { name: 'JSON 工具', desc: '校验与优美格式化，支持展开收起与行号', route: '/json', icon: 'braces', tags: ['格式', '验证', '开发'], features: ['语法高亮', '错误检查', '压缩/美化'], usageCount: '9.3k+' },
  { name: '时间戳工具', desc: '时间与时间戳互转，实时展示当前时间', route: '/timestamp', icon: 'clock', tags: ['时间', '时区', '计算'], features: ['时区转换', '倒计时', '时间差计算'], usageCount: '7.8k+' },
  { name: '计算器', desc: '支持表达式、科学函数与BigInt超大整数计算，带溢出/精度提示', route: '/calculator', icon: 'calculator', tags: ['计算', '表达式', 'BigInt'], features: ['函数与常量', '历史记录', '溢出/精度提示'], usageCount: '0k+' },
  { name: '大小写转换', desc: '快速转换文本大小写，支持批量操作', route: '/case', icon: 'case', tags: ['文本', '转换', '编辑'], features: ['大小写转换', '文本清洗', '字数统计'], usageCount: '5.2k+' },
  // { name: 'AI编剧工具', desc: '基于AI生成完整剧本，包括章纲和详细章节内容', route: '/script-writer', icon: 'file', tags: ['剧本', 'AI', '生成'], features: ['智能生成', '章节管理', '一键复制'], usageCount: '0.8k+' },
  // { name: '3D动作生成器', desc: '输入提示词生成3D动作，支持关节调节和动画播放', route: '/3d-action', icon: 'image', tags: ['3D', '动作', 'AI'], features: ['提示词生成', '关节调节', '动画播放', '截图保存'], usageCount: '0.5k+' },
  { name: 'SSH终端', desc: '前端SSH终端模拟器', route: '/ssh', icon: 'string', tags: ['SSH', '终端', '连接'], features: ['终端模拟', '命令执行', '安全连接'], usageCount: '0k+' },
  { name: '图片转BASE64', desc: '上传图片生成BASE64编码，支持一键复制', route: '/image-to-base64', icon: 'code', tags: ['图片', '编码', '转换'], features: ['拖拽上传', '实时预览', '一键复制'], usageCount: '2.3k+' },
  { name: '字符串拼接', desc: '灵活拼接字符串，支持模板和变量替换', route: '/string', icon: 'string', tags: ['文本', '拼接', '模板'], features: ['模板变量', '批量处理', '实时预览'], usageCount: '1.8k+' },
  // { name: '图片去水印', desc: '无损预览，批量去水印与导出', route: '/images', icon: 'image', tags: ['图片', '去水印', '批量'], features: ['多图上传', '手动选择', '角落识别'], usageCount: '3.1k+' },
  { name: '图片画布', desc: '可拖拽定位，支持ZIP导入，鼠标位置添加图片', route: '/images-new', icon: 'image', tags: ['图片', '拖拽', '管理'], features: ['自由拖拽', 'ZIP导入', '鼠标定位'], usageCount: '1.5k+' },
  { name: 'RGBA颜色工具', desc: '前端调色神器，支持多种颜色格式转换与渐变生成', route: '/color', icon: 'palette', tags: ['颜色', '调色', '前端'], features: ['RGBA调节', '格式转换', '渐变生成'], usageCount: '0k+' },
  { name: '脑图工具', desc: '类似XMind/GitMind的思维导图工具，支持多种主题和快捷键', route: '/mindmap', icon: 'brain', tags: ['脑图', '思维导图', '设计'], features: ['多彩主题', '快捷键操作', '导出JSON'], usageCount: '0k+' },
  { name: 'Token计算器', desc: '计算文本Token数量，支持GPT、Claude、LLaMA等模型', route: '/token', icon: 'calculator', tags: ['Token', 'AI', '计算'], features: ['多模型支持', '实时计算', '价格估算'], usageCount: '0k+' },
  { name: '测试-沙箱', desc: '功能测试沙箱环境，用于开发调试和实验', route: '/sandbox', icon: 'sandbox', tags: ['测试', '沙箱', '开发'], features: ['功能测试', '调试环境', '实验场地'], usageCount: '0k+' },
]

const getIcon = (icon: string) => {
  switch (icon) {
    case 'file': return FileText
    case 'braces': return Braces
    case 'clock': return Clock
    case 'case': return Type
    case 'code': return Code
    case 'string': return Hash
    case 'chat': return MessageSquare
    case 'image': return ImageIcon
    case 'multimodal': return ImageIcon2
    case 'editor': return FileCode
    case 'palette': return Palette
    case 'markdown': return FileEdit
    case 'flow': return GitBranch
    case 'brain': return Brain
    case 'calculator': return Calculator
    case 'humanizer': return Wand2
    case 'speech': return Mic
    case 'sandbox': return FlaskConical
    case 'doc-preview': return LayoutTemplate
    default: return FileText
  }
}

// 计算匹配分数：匹配的字段越多、越靠前，分数越高
const getMatchScore = (tool: typeof tools[0], query: string): number => {
  if (!query) return 0
  const q = query.toLowerCase()
  let score = 0
  
  // 名称匹配（权重最高）
  if (tool.name.toLowerCase().includes(q)) {
    score += 100
    // 如果是开头匹配，额外加分
    if (tool.name.toLowerCase().startsWith(q)) score += 50
  }
  
  // 标签匹配（权重次高）
  tool.tags.forEach(tag => {
    if (tag.toLowerCase().includes(q)) score += 30
  })
  
  // 描述匹配
  if (tool.desc.toLowerCase().includes(q)) score += 20
  
  // 功能匹配
  tool.features.forEach(feature => {
    if (feature.toLowerCase().includes(q)) score += 10
  })
  
  return score
}

const filtered = computed(() => {
  const query = searchQuery.value.trim()
  if (!query) return tools
  
  // 计算每个工具的匹配分数并排序
  return [...tools]
    .map(tool => ({ tool, score: getMatchScore(tool, query) }))
    .filter(item => item.score > 0) // 只显示匹配的
    .sort((a, b) => b.score - a.score) // 分数高的排前面
    .map(item => item.tool)
})

const clearSearch = () => {
  searchQuery.value = ''
}
</script>

<template>
  <div class="min-h-[100vh] bg-gradient-to-b from-brand-50 to-white">
    <!-- 主内容区域 -->
    <main class="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <!-- 搜索框 -->
      <div class="mb-8">
        <div class="relative max-w-xl mx-auto">
          <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search class="w-5 h-5 text-slate-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索工具名称、标签或功能..."
            class="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 text-slate-700 placeholder-slate-400"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
        <!-- 搜索结果提示 -->
        <div v-if="searchQuery" class="text-center mt-3 text-sm text-slate-500">
          <span v-if="filtered.length > 0">找到 <span class="font-medium text-brand-600">{{ filtered.length }}</span> 个匹配的工具</span>
          <span v-else class="text-slate-400">没有找到匹配的工具，试试其他关键词</span>
        </div>
      </div>

        <!-- 工具卡片网格 -->
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <RouterLink v-for="t in filtered" :key="t.route" :to="t.route" class="group rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:border-brand-200 hover:shadow-brand-500/10 transition duration-300 flex flex-col">
            <!-- 卡片头部 -->
            <div class="p-6 border-b border-slate-100 flex-1">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                  <component :is="getIcon(t.icon)" class="w-5 h-5" />
                </div>
                <h2 class="text-xl font-bold text-slate-900">{{ t.name }}</h2>
              </div>
              <p class="text-slate-600 mb-3">{{ t.desc }}</p>
              
              <!-- 工具标签 -->
              <div class="flex flex-wrap gap-2 mb-3">
                <span v-for="(tag, idx) in t.tags" :key="idx" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  {{ tag }}
                </span>
              </div>
              
              <!-- 核心功能 -->
              <div class="space-y-1">
                <div v-for="(feature, idx) in t.features.slice(0, 2)" :key="idx" class="flex items-center gap-1.5 text-sm text-slate-500">
                  <svg class="w-3 h-3 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>{{ feature }}</span>
                </div>
              </div>
            </div>
            
            <!-- 卡片底部 -->
              <div class="p-4 bg-slate-50 flex items-center justify-end mt-auto">
                <span class="text-xs text-brand-600 font-medium flex items-center gap-1">
                  开始使用
                  <svg class="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
                  </svg>
                </span>
              </div>
          </RouterLink>
        </div>

        <!-- 底部装饰元素 -->
        <div class="mt-16 flex justify-center">
          <div class="flex gap-2">
            <div class="w-2 h-2 rounded-full bg-slate-300"></div>
            <div class="w-2 h-2 rounded-full bg-brand-500"></div>
            <div class="w-2 h-2 rounded-full bg-slate-300"></div>
          </div>
        </div>
      </main>
    </div>
  </template>
