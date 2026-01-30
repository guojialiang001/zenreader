<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Check, RotateCw, Trash2, Upload, Home } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

type ConversionType =
  | 'upper'
  | 'lower'
  | 'title'
  | 'sentence'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot'
  | 'space'
  | 'path'
  | 'slug'

const inputText = ref('')
const selectedConversion = ref<ConversionType>('lower')
const batchByLine = ref(true)
const copied = ref(false)

const conversionOptions = [
  { value: 'upper' as const, label: '大写', icon: 'AB' },
  { value: 'lower' as const, label: '小写', icon: 'ab' },
  { value: 'title' as const, label: '标题格式', icon: 'Ab' },
  { value: 'sentence' as const, label: '句首大写', icon: 'Abc' },
  { value: 'camel' as const, label: 'camelCase', icon: 'aB' },
  { value: 'pascal' as const, label: 'PascalCase', icon: 'Ab' },
  { value: 'snake' as const, label: 'snake_case', icon: 'a_b' },
  { value: 'kebab' as const, label: 'kebab-case', icon: 'a-b' },
  { value: 'constant' as const, label: 'CONSTANT_CASE', icon: 'A_B' },
  { value: 'dot' as const, label: 'dot.case', icon: 'a.b' },
  { value: 'space' as const, label: '空格分词', icon: 'a b' },
  { value: 'path' as const, label: 'path/case', icon: 'a/b' },
  { value: 'slug' as const, label: 'URL Slug', icon: 'URL' },
]

const splitLines = (text: string): { lines: string[]; newline: '\n' | '\r\n' } => {
  const newline: '\n' | '\r\n' = text.includes('\r\n') ? '\r\n' : '\n'
  return { lines: text.split(/\r?\n/), newline }
}

const stripDiacritics = (input: string): string =>
  input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')

const splitIntoWords = (input: string): string[] => {
  const normalized = stripDiacritics(input)
  const spaced = normalized
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .trim()

  if (!spaced) return []
  return spaced.split(/\s+/).filter(Boolean)
}

const capitalizeWord = (word: string): string => {
  if (!word) return ''
  if (/^[0-9]+$/.test(word)) return word
  return word[0].toUpperCase() + word.slice(1).toLowerCase()
}

const convertWords = (words: string[], type: ConversionType): string => {
  if (!words.length) return ''

  switch (type) {
    case 'camel':
      return [words[0].toLowerCase(), ...words.slice(1).map(capitalizeWord)].join('')
    case 'pascal':
      return words.map(capitalizeWord).join('')
    case 'snake':
      return words.map(w => w.toLowerCase()).join('_')
    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-')
    case 'constant':
      return words.map(w => w.toUpperCase()).join('_')
    case 'dot':
      return words.map(w => w.toLowerCase()).join('.')
    case 'space':
      return words.map(w => w.toLowerCase()).join(' ')
    case 'path':
      return words.map(w => w.toLowerCase()).join('/')
    case 'slug':
      return words.map(w => w.toLowerCase()).join('-')
    default:
      return words.join(' ')
  }
}

const convertLine = (line: string, type: ConversionType): string => {
  if (!line) return ''

  switch (type) {
    case 'upper':
      return line.toUpperCase()
    case 'lower':
      return line.toLowerCase()
    case 'title':
      return line.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
    case 'sentence':
      return line.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase())
    default: {
      const m = line.match(/^(\s*)(.*?)(\s*)$/)
      const leading = m?.[1] ?? ''
      const core = m?.[2] ?? ''
      const trailing = m?.[3] ?? ''
      const words = splitIntoWords(core)
      const converted = convertWords(words, type)
      return `${leading}${converted}${trailing}`
    }
  }
}

// 转换函数（支持按行批量）
const convertText = (text: string, type: ConversionType): string => {
  if (!text) return ''

  if (!batchByLine.value) return convertLine(text, type)

  const { lines, newline } = splitLines(text)
  return lines.map(line => convertLine(line, type)).join(newline)
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
  <div class="min-h-[100vh] bg-gray-50 p-4 md:p-6 lg:p-8">
    <div class="max-w-4xl mx-auto min-h-[100%] flex flex-col">
      <!-- Header -->
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">命名/大小写转换工具</h1>
          <p class="text-slate-600 text-lg mt-1">支持 camelCase / PascalCase / snake_case / kebab-case / CONSTANT_CASE / slug 等格式，支持按行批量互转</p>
        </div>
        <RouterLink 
          to="/" 
          class="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 transition-colors"
          aria-label="返回主页"
        >
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
      </div>

      <!-- Main Card -->
      <div class="bg-white rounded-2xl shadow-md border border-slate-200 p-4 md:p-6 lg:p-8 flex-grow overflow-hidden">
        <!-- Input Section -->
        <div class="mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
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
                class="flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg cursor-pointer transition-colors"
            >
              <Upload class="w-4 h-4" />
              上传文件
            </label>
          </div>
          <textarea
              v-model="inputText"
              rows="8"
              placeholder="在此输入或粘贴您的文本..."
              class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none font-mono text-sm bg-slate-50 min-h-[24vh] max-h-[calc(100vh-450px)] overflow-y-auto whitespace-pre-wrap break-words shadow-sm transition-all duration-200"
          ></textarea>
          <div class="mt-2 text-xs text-slate-400 flex gap-4">
            <span>字符: {{ charCount }}</span>
            <span>单词: {{ wordCount }}</span>
            <span>行数: {{ lineCount }}</span>
          </div>
        </div>

        <!-- Conversion Options -->
        <div class="mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <h3 class="text-sm font-semibold text-slate-700">转换选项</h3>
            <label class="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input v-model="batchByLine" type="checkbox" class="accent-brand-600" />
              按行批量转换（每行一个词条）
            </label>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 min-h-[14vh] max-h-[calc(100vh-550px)] overflow-y-auto pr-2">
            <button
                v-for="option in conversionOptions"
                :key="option.value"
                @click="selectedConversion = option.value"
                :class="[
                'group flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 transition-all duration-200 hover:shadow-sm',
                selectedConversion === option.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
              ]"
            >
              <span class="text-lg sm:text-xl font-bold font-mono">{{ option.icon }}</span>
              <span class="text-xs sm:text-sm font-medium">{{ option.label }}</span>
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
                class="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 font-mono text-sm resize-none pr-24 min-h-[24vh] max-h-[calc(100vh-450px)] overflow-y-auto whitespace-pre-wrap break-words shadow-sm transition-all duration-200"
            ></textarea>
            <div class="absolute top-3 right-3 flex gap-2">
              <button
                  @click="copyToClipboard"
                  :class="[
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  copied
                    ? 'bg-green-100 text-green-700 shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:shadow-sm'
                ]"
              >
                <component :is="copied ? Check : Copy" class="w-4 h-4" />
              </button>
              <button
                  @click="swapText"
                  class="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-slate-50 hover:shadow-sm"
                  title="交换输入输出"
              >
                <RotateCw class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div class="text-sm text-slate-500">
            实时预览 • 支持 camel/snake/kebab/constant/slug 等命名互转
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
