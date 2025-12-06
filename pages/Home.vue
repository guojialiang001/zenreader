<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { FileText, Braces, Clock, Type, Image as ImageIcon, Code, Hash } from 'lucide-vue-next'

const tools = [
  { name: 'Markdown 阅读器', desc: '导入阅读 Markdown，优雅排版', route: '/reader', icon: 'file', tags: ['阅读', '预览', '文档'], features: ['实时渲染', '多主题支持', '暗黑模式'], usageCount: '12.5k+' },
  { name: 'JSON 工具', desc: '校验与优美格式化，支持展开收起与行号', route: '/json', icon: 'braces', tags: ['格式', '验证', '开发'], features: ['语法高亮', '错误检查', '压缩/美化'], usageCount: '9.3k+' },
  { name: '时间戳工具', desc: '时间与时间戳互转，实时展示当前时间', route: '/timestamp', icon: 'clock', tags: ['时间', '时区', '计算'], features: ['时区转换', '倒计时', '时间差计算'], usageCount: '7.8k+' },
  { name: '大小写转换', desc: '快速转换文本大小写，支持批量操作', route: '/case', icon: 'case', tags: ['文本', '转换', '编辑'], features: ['大小写转换', '文本清洗', '字数统计'], usageCount: '5.2k+' },
  { name: 'AI编剧工具', desc: '基于AI生成完整剧本，包括章纲和详细章节内容', route: '/script-writer', icon: 'file', tags: ['剧本', 'AI', '生成'], features: ['智能生成', '章节管理', '一键复制'], usageCount: '0.8k+' },
  { name: '图片转BASE64', desc: '上传图片生成BASE64编码，支持一键复制', route: '/image-to-base64', icon: 'code', tags: ['图片', '编码', '转换'], features: ['拖拽上传', '实时预览', '一键复制'], usageCount: '2.3k+' },
  { name: '字符串拼接', desc: '灵活拼接字符串，支持模板和变量替换', route: '/string', icon: 'string', tags: ['文本', '拼接', '模板'], features: ['模板变量', '批量处理', '实时预览'], usageCount: '1.8k+' },
  { name: '图片去水印', desc: '无损预览，批量去水印与导出', route: '/images', icon: 'image', tags: ['图片', '去水印', '批量'], features: ['多图上传', '手动选择', '角落识别'], usageCount: '3.1k+' },
  { name: '拖拽图片管理', desc: '可拖拽定位，支持ZIP导入，鼠标位置添加图片', route: '/images-new', icon: 'image', tags: ['图片', '拖拽', '管理'], features: ['自由拖拽', 'ZIP导入', '鼠标定位'], usageCount: '1.5k+' },
]
const filtered = computed(() => {
  // Search functionality moved to App.vue
  return tools
})
</script>

<template>
  <div class="min-h-[100vh] bg-gradient-to-b from-brand-50 to-white">
    <!-- 主内容区域 -->
    <main class="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <!-- 标题部分已移动到 App.vue 中 -->

        <!-- 工具卡片网格 -->
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <RouterLink v-for="t in filtered" :key="t.route" :to="t.route" class="group rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden hover:border-brand-200 hover:shadow-brand-500/10 transition duration-300 flex flex-col">
            <!-- 卡片头部 -->
            <div class="p-6 border-b border-slate-100 flex-1">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                  <component :is="t.icon === 'file' ? FileText : (t.icon === 'braces' ? Braces : (t.icon === 'clock' ? Clock : (t.icon === 'case' ? Type : (t.icon === 'code' ? Code : (t.icon === 'string' ? Hash : ImageIcon)))))" class="w-5 h-5" />
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
