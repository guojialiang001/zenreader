<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Check, RotateCw, Trash2, Upload, ChevronLeft, HelpCircle, Home } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

const inputText = ref('')
const selectedConversion = ref<'upper' | 'lower' | 'title' | 'camel' | 'pascal' | 'constant' | 'sentence' | 'snake' | 'kebab'>('lower')
const copied = ref(false)

const conversionOptions = [
  { value: 'upper' as const, label: '大写', icon: 'AB' },
  { value: 'lower' as const, label: '小写', icon: 'ab' },
  { value: 'title' as const, label: '标题格式', icon: 'Ab' },
  { value: 'sentence' as const, label: '句首大写', icon: 'Abc' },
  { value: 'camel' as const, label: '驼峰命名', icon: 'aB' },
  { value: 'pascal' as const, label: '帕斯卡命名', icon: 'Ab' },
  { value: 'snake' as const, label: '蛇形命名', icon: 'a_b' },
  { value: 'kebab' as const, label: '烤肉串命名', icon: 'a-b' },
  { value: 'constant' as const, label: '常量命名', icon: 'A_B' },
]

// 转换函数
const convertText = (text: string, type: typeof selectedConversion.value): string => {
  if (!text) return ''

  switch (type) {
    case 'upper':
      return text.toUpperCase()
    case 'lower':
      return text.toLowerCase()
    case 'title':
      return text.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
    case 'sentence':
      return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase())
    case 'camel':
      return text.toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
          .replace(/^./, char => char.toLowerCase())
    case 'pascal':
      return text.toLowerCase()
          .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
          .replace(/^./, char => char.toUpperCase())
    case 'snake':
      return text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_')
    case 'kebab':
      return text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-')
    case 'constant':
      return text.toUpperCase().replace(/[^a-zA-Z0-9]+/g, '_')
    default:
      return text
  }
}

const outputText = computed(() => convertText(inputText.value, selectedConversion.value))

// 统计信息
const charCount = computed(() => inputText.value.length)
const wordCount = computed(() => inputText.value.trim().split(/\s+/).filter(Boolean).length)
const lineCount = computed(() => inputText.value.split('\n').length)

// 操作函数
const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const clearText = () => {
  inputText.value = ''
}

const swapText = () => {
  inputText.value = outputText.value
}

const handleFileUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file && file.type.includes('text')) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      inputText.value = ev.target?.result?.toString() || ''
    }
    reader.readAsText(file)
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-6 relative">
        <RouterLink 
          to="/" 
          class="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 transition-colors"
          aria-label="返回主页"
        >
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
        <h1 class="text-4xl font-bold text-slate-900 tracking-tight">大小写转换工具</h1>
        <p class="text-slate-600 text-lg mt-1">快速转换文本到各种格式，支持驼峰命名、蛇形命名等多种编程命名规范</p>
      </div>

      <!-- Main Card -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6  overflow-auto">
        <!-- Input Section -->
        <div class="mb-8">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-semibold text-slate-700">输入文本</label>
            <input
                type="file"
                @change="handleFileUpload"
                accept=".txt,.md,.log,.json,.xml,.yaml,.yml,.csv"
                class="hidden"
                id="file-upload"
            />
            <label
                for="file-upload"
                class="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors"
            >
              <Upload class="w-4 h-4" />
              上传文件
            </label>
          </div>
          <textarea
              v-model="inputText"
              rows="8"
              placeholder="在此输入或粘贴您的文本..."
              class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none font-mono text-sm bg-slate-50 h-48 overflow-auto whitespace-pre-wrap break-words"
          ></textarea>
          <div class="mt-2 text-xs text-slate-400 flex gap-4">
            <span>字符: {{ charCount }}</span>
            <span>单词: {{ wordCount }}</span>
            <span>行数: {{ lineCount }}</span>
          </div>
        </div>

        <!-- Conversion Options -->
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-slate-700 mb-3">转换选项</h3>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3 max-h-[220px] overflow-auto pr-2">
            <button
                v-for="option in conversionOptions"
                :key="option.value"
                @click="selectedConversion = option.value"
                :class="[
                'group flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-xl border-2 transition-all duration-200',
                selectedConversion === option.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
              ]"
            >
              <span class="text-lg font-bold font-mono">{{ option.icon }}</span>
              <span class="text-xs font-medium">{{ option.label }}</span>
            </button>
          </div>
        </div>

        <!-- Output Section -->
        <div class="mb-6">
          <label class="block text-sm font-semibold text-slate-700 mb-3">转换结果</label>
          <div class="relative">
            <textarea
                :value="outputText"
                readonly
                rows="8"
                placeholder="转换结果将显示在这里..."
                class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-sm resize-none pr-24 h-48 overflow-auto whitespace-pre-wrap break-words"
            ></textarea>
            <div class="absolute top-3 right-3 flex gap-2">
              <button
                  @click="copyToClipboard"
                  :class="[
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                ]"
              >
                <component :is="copied ? Check : Copy" class="w-4 h-4" />
              </button>
              <button
                  @click="swapText"
                  class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-all duration-200"
                  title="交换输入输出"
              >
                <RotateCw class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="text-sm text-slate-500">
            实时预览 • 点击按钮快速切换格式
          </div>
          <button
              @click="clearText"
              class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
          >
            <Trash2 class="w-4 h-4" />
            清空文本
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
