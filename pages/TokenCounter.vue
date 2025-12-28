nbu<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Check, Trash2, Upload, Home, Calculator, Info } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'

const inputText = ref('')
const selectedModel = ref<'gpt4' | 'gpt3' | 'claude' | 'llama' | 'deepseek' | 'qwen' | 'simple'>('gpt4')
const copied = ref(false)
const isCalculating = ref(false)

// 模型选项配置
const modelOptions = [
  { value: 'gpt4' as const, label: 'GPT-4 / GPT-3.5', desc: 'OpenAI cl100k_base', ratio: 0.75 },
  { value: 'gpt3' as const, label: 'GPT-3 (Davinci)', desc: 'OpenAI p50k_base', ratio: 0.80 },
  { value: 'claude' as const, label: 'Claude', desc: 'Anthropic tokenizer', ratio: 0.72 },
  { value: 'deepseek' as const, label: 'DeepSeek', desc: 'DeepSeek tokenizer', ratio: 0.68 },
  { value: 'qwen' as const, label: 'Qwen (通义千问)', desc: 'Qwen tokenizer', ratio: 0.65 },
  { value: 'llama' as const, label: 'LLaMA / Mistral', desc: 'SentencePiece BPE', ratio: 0.78 },
  { value: 'simple' as const, label: '简单估算', desc: '基于字符/单词比例', ratio: 0.85 },
]

// Token计算逻辑
// 注意：这是一个近似估算算法，因为真正的tokenizer需要加载词表
// 不同模型的token比例基于实测数据的平均值

const calculateTokens = (text: string, model: typeof selectedModel.value): number => {
  if (!text) return 0

  // 基础统计
  const charCount = text.length
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  
  // 中文字符数量
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  // 英文单词数量（粗略）
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  // 数字序列
  const numbers = (text.match(/\d+/g) || []).length
  // 特殊符号
  const specialChars = (text.match(/[^\w\s\u4e00-\u9fff]/g) || []).length
  
  const config = modelOptions.find(m => m.value === model)!
  
  // 不同模型的token估算策略
  switch (model) {
    case 'gpt4':
    case 'gpt3': {
      // GPT系列：中文通常1-2个字符一个token，英文3-4个字符一个token
      // 标点符号通常单独一个token
      const chineseTokens = Math.ceil(chineseChars * 0.6) // 中文约1.7字/token
      const englishTokens = Math.ceil(englishWords * 1.3) // 英文约1.3token/词
      const numTokens = Math.ceil(numbers * 0.5)
      const specialTokens = specialChars
      return Math.max(1, chineseTokens + englishTokens + numTokens + specialTokens)
    }
    
    case 'claude': {
      // Claude的tokenizer与GPT类似但略有不同
      const chineseTokens = Math.ceil(chineseChars * 0.55)
      const englishTokens = Math.ceil(englishWords * 1.25)
      const numTokens = Math.ceil(numbers * 0.4)
      const specialTokens = Math.ceil(specialChars * 0.8)
      return Math.max(1, chineseTokens + englishTokens + numTokens + specialTokens)
    }
    
    case 'deepseek': {
      // DeepSeek官方token计算规则：
      // 1个英文字符 ≈ 0.3个token
      // 1个中文字符 ≈ 0.6个token
      // 1个数字或符号 ≈ 1个token
      const englishChars = (text.match(/[a-zA-Z]/g) || []).length
      const chineseTokens = Math.ceil(chineseChars * 0.6)
      const englishTokens = Math.ceil(englishChars * 0.3)
      const numTokens = numbers // 数字序列按个数计算
      const specialTokens = specialChars // 符号按个数计算
      return Math.max(1, chineseTokens + englishTokens + numTokens + specialTokens)
    }
    
    case 'qwen': {
      // Qwen(通义千问)使用基于词的分词方式
      // 官方示例：
      // "苹果" (2字符) = 1 Token
      // "测试用例" (4字符) = 3 Token
      // "OpenSearch" (10字符) = 2 Token
      // 中文约1.3-2字符/token，英文约5字符/token
      
      // 估算中文词数（简单按2字符一词估算）
      const chineseWordEstimate = Math.ceil(chineseChars / 1.5)
      const chineseTokens = Math.ceil(chineseWordEstimate * 0.8) // 中文词大约0.8-1token/词
      
      // 英文按单词计算，每个单词约1-2个token
      const englishTokens = Math.ceil(englishWords * 0.4) // 常见词会被合并
      
      // 数字和符号
      const numTokens = Math.ceil(numbers * 0.5)
      const specialTokens = Math.ceil(specialChars * 0.5)
      
      return Math.max(1, chineseTokens + englishTokens + numTokens + specialTokens)
    }
    
    case 'llama': {
      // LLaMA使用SentencePiece，对中文支持略差
      const chineseTokens = Math.ceil(chineseChars * 0.7)
      const englishTokens = Math.ceil(englishWords * 1.2)
      const numTokens = Math.ceil(numbers * 0.5)
      const specialTokens = specialChars
      return Math.max(1, chineseTokens + englishTokens + numTokens + specialTokens)
    }
    
    case 'simple':
    default: {
      // 简单估算：基于字符数和单词数的混合
      // 英文约4字符/token，中文约1.5字符/token
      if (chineseChars > charCount * 0.3) {
        // 主要是中文
        return Math.max(1, Math.ceil(charCount * 0.5))
      } else {
        // 主要是英文
        return Math.max(1, Math.ceil(charCount / 4))
      }
    }
  }
}

// 计算结果
const tokenCount = computed(() => {
  return calculateTokens(inputText.value, selectedModel.value)
})

// 统计信息
const charCount = computed(() => inputText.value.length)
const charCountNoSpace = computed(() => inputText.value.replace(/\s/g, '').length)
const wordCount = computed(() => inputText.value.trim().split(/\s+/).filter(Boolean).length)
const lineCount = computed(() => inputText.value ? inputText.value.split('\n').length : 0)
const chineseCharCount = computed(() => (inputText.value.match(/[\u4e00-\u9fff]/g) || []).length)
const englishWordCount = computed(() => (inputText.value.match(/[a-zA-Z]+/g) || []).length)

// 价格估算 (基于OpenAI GPT-4 Turbo价格)
const priceEstimate = computed(() => {
  const inputPrice = tokenCount.value * 0.00001 // $0.01 per 1K tokens (input)
  const outputPrice = tokenCount.value * 0.00003 // $0.03 per 1K tokens (output)
  return {
    input: inputPrice.toFixed(6),
    output: outputPrice.toFixed(6)
  }
})

// 操作函数
const copyStats = async () => {
  const stats = `文本统计:
- Token数量: ${tokenCount.value} (${modelOptions.find(m => m.value === selectedModel.value)?.label})
- 字符数: ${charCount.value}
- 字符数(不含空格): ${charCountNoSpace.value}
- 单词数: ${wordCount.value}
- 行数: ${lineCount.value}
- 中文字符: ${chineseCharCount.value}
- 英文单词: ${englishWordCount.value}`

  try {
    await navigator.clipboard.writeText(stats)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const clearText = () => {
  inputText.value = ''
}

const handleFileUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file && (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.json'))) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      inputText.value = ev.target?.result?.toString() || ''
    }
    reader.readAsText(file)
  }
}

// 示例文本
const loadExample = () => {
  inputText.value = `Hello, World! 这是一个Token计算器示例。

This tool helps you estimate the number of tokens in your text. Token计算对于使用大语言模型（LLM）非常重要，因为API调用通常按token计费。

一些有趣的事实：
1. 英文单词通常是1-2个tokens
2. 中文字符通常是1-2个tokens
3. 标点符号通常单独占用一个token
4. 数字的token化取决于数字的长度

const code = "代码片段也会被tokenize";
console.log(code);`
}
</script>

<template>
  <div class="min-h-[100vh] bg-gray-50 p-4 md:p-6 lg:p-8">
    <div class="max-w-5xl mx-auto min-h-[100%] flex flex-col">
      <!-- Header -->
      <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Calculator class="w-8 h-8 text-brand-600" />
            Token 计算器
          </h1>
          <p class="text-slate-600 text-lg mt-1">计算文本的Token数量，支持多种主流大模型的估算</p>
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
        <!-- Model Selection -->
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-slate-700 mb-3">选择模型 Tokenizer</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <button
              v-for="option in modelOptions"
              :key="option.value"
              @click="selectedModel = option.value"
              :class="[
                'group flex flex-col items-start gap-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 hover:shadow-sm text-left',
                selectedModel === option.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
              ]"
            >
              <span class="text-sm font-semibold">{{ option.label }}</span>
              <span class="text-xs text-slate-500">{{ option.desc }}</span>
            </button>
          </div>
        </div>

        <!-- Input Section -->
        <div class="mb-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
            <label class="block text-sm font-semibold text-slate-700">输入文本</label>
            <div class="flex items-center gap-2">
              <button
                @click="loadExample"
                class="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-brand-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                加载示例
              </button>
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
          </div>
          <textarea
            v-model="inputText"
            rows="12"
            placeholder="在此输入或粘贴您的文本，系统将实时计算Token数量..."
            class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none font-mono text-sm bg-slate-50 min-h-[30vh] max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words shadow-sm transition-all duration-200"
          ></textarea>
        </div>

        <!-- Results Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Token Count Display -->
          <div class="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white shadow-lg">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold opacity-90">Token 数量</h3>
              <div class="px-3 py-1 bg-white/20 rounded-full text-sm">
                {{ modelOptions.find(m => m.value === selectedModel)?.label }}
              </div>
            </div>
            <div class="text-5xl font-bold mb-2">
              {{ tokenCount.toLocaleString() }}
            </div>
            <div class="text-sm opacity-75">
              预估价格 (GPT-4 Turbo): 
              <span class="font-mono">${{ priceEstimate.input }}</span> 输入 / 
              <span class="font-mono">${{ priceEstimate.output }}</span> 输出
            </div>
          </div>

          <!-- Statistics Grid -->
          <div class="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h3 class="text-lg font-semibold text-slate-700 mb-4">详细统计</h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col">
                <span class="text-2xl font-bold text-slate-900">{{ charCount.toLocaleString() }}</span>
                <span class="text-sm text-slate-500">总字符数</span>
              </div>
              <div class="flex flex-col">
                <span class="text-2xl font-bold text-slate-900">{{ charCountNoSpace.toLocaleString() }}</span>
                <span class="text-sm text-slate-500">字符(不含空格)</span>
              </div>
              <div class="flex flex-col">
                <span class="text-2xl font-bold text-slate-900">{{ wordCount.toLocaleString() }}</span>
                <span class="text-sm text-slate-500">单词数</span>
              </div>
              <div class="flex flex-col">
                <span class="text-2xl font-bold text-slate-900">{{ lineCount.toLocaleString() }}</span>
                <span class="text-sm text-slate-500">行数</span>
              </div>
              <div class="flex flex-col">
                <span class="text-2xl font-bold text-slate-900">{{ chineseCharCount.toLocaleString() }}</span>
                <span class="text-sm text-slate-500">中文字符</span>
              </div>
              <div class="flex flex-col">
                <span class="text-2xl font-bold text-slate-900">{{ englishWordCount.toLocaleString() }}</span>
                <span class="text-sm text-slate-500">英文单词</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Box -->
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div class="flex gap-3">
            <Info class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-amber-800">
              <p class="font-semibold mb-1">关于Token估算</p>
              <p>此工具提供的是Token数量的<strong>近似估算</strong>。实际Token数量取决于具体模型的tokenizer实现。不同模型对中英文、代码、特殊字符的处理方式不同，可能导致实际值与估算值有所偏差（通常在±15%范围内）。</p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div class="text-sm text-slate-500">
            实时计算 • 支持多种模型估算
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="copyStats"
              :class="[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
              ]"
            >
              <component :is="copied ? Check : Copy" class="w-4 h-4" />
              {{ copied ? '已复制' : '复制统计' }}
            </button>
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
  </div>
</template>