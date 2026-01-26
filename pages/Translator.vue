<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Home,
  Languages,
  ArrowLeftRight,
  Copy,
  Play,
  Square,
  Trash2,
  Settings,
  History,
  Check,
  ChevronDown,
  RotateCcw
} from 'lucide-vue-next'

type Provider = 'libretranslate' | 'openai_compatible'

type HistoryItem = {
  id: string
  ts: number
  provider: Provider
  from: string
  to: string
  input: string
  output: string
}

const SETTINGS_KEY = 'zenreader_translator_settings_v1'
const HISTORY_KEY = 'zenreader_translator_history_v1'

const languageOptions = [
  { value: 'auto', label: '自动检测' },
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'ru', label: 'Русский' },
  { value: 'pt', label: 'Português' },
  { value: 'it', label: 'Italiano' },
  { value: 'ar', label: 'Al-Arabiya' },
]

const langLabel = (value: string) => languageOptions.find(x => x.value === value)?.label || value

const provider = ref<Provider>('libretranslate')

// LibreTranslate
const ltUrl = ref('https://libretranslate.de')
const ltApiKey = ref('')

// OpenAI-compatible
const oaUrl = ref('https://api.openai.com/v1/chat/completions')
const oaApiKey = ref('')
const oaModel = ref('gpt-4o-mini')
const oaTemperature = ref(0.2)
const oaStream = ref(true)

const fromLang = ref('auto')
const toLang = ref('zh')

const extraInstruction = ref('')

const inputText = ref('')
const outputText = ref('')
const errorText = ref('')
const translating = ref(false)
const abortController = ref<AbortController | null>(null)

const history = ref<HistoryItem[]>([])
const showSettings = ref(false)
const showHistory = ref(false)
const copied = ref(false)

const canTranslate = computed(() => !translating.value && inputText.value.trim().length > 0)

const saveState = () => {
  try {
    const payload = {
      provider: provider.value,
      ltUrl: ltUrl.value,
      ltApiKey: ltApiKey.value,
      oaUrl: oaUrl.value,
      oaApiKey: oaApiKey.value,
      oaModel: oaModel.value,
      oaTemperature: oaTemperature.value,
      oaStream: oaStream.value,
      fromLang: fromLang.value,
      toLang: toLang.value,
      extraInstruction: extraInstruction.value,
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload))
  } catch {}
}

const loadState = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return
    const s = JSON.parse(raw)
    if (s.provider) provider.value = s.provider
    if (typeof s.ltUrl === 'string') ltUrl.value = s.ltUrl
    if (typeof s.ltApiKey === 'string') ltApiKey.value = s.ltApiKey
    if (typeof s.oaUrl === 'string') oaUrl.value = s.oaUrl
    if (typeof s.oaApiKey === 'string') oaApiKey.value = s.oaApiKey
    if (typeof s.oaModel === 'string') oaModel.value = s.oaModel
    if (typeof s.oaTemperature === 'number') oaTemperature.value = s.oaTemperature
    if (typeof s.oaStream === 'boolean') oaStream.value = s.oaStream
    if (typeof s.fromLang === 'string') fromLang.value = s.fromLang
    if (typeof s.toLang === 'string') toLang.value = s.toLang
    if (typeof s.extraInstruction === 'string') extraInstruction.value = s.extraInstruction
  } catch {}
}

const saveHistory = () => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value.slice(0, 50)))
  } catch {}
}

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return
    const items = JSON.parse(raw)
    if (Array.isArray(items)) history.value = items
  } catch {}
}

onMounted(() => {
  loadState()
  loadHistory()
})

watch(
  [provider, ltUrl, ltApiKey, oaUrl, oaApiKey, oaModel, oaTemperature, oaStream, fromLang, toLang, extraInstruction],
  saveState,
  { deep: false }
)

watch(history, saveHistory, { deep: true })

const swapLang = () => {
  if (fromLang.value === 'auto') {
    fromLang.value = toLang.value
    toLang.value = 'en' // Default fallback when swapping from auto
  } else {
    const a = fromLang.value
    fromLang.value = toLang.value
    toLang.value = a
  }
}

const stop = () => {
  abortController.value?.abort()
}

const copyOutput = async () => {
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    errorText.value = '复制失败：浏览器可能未授予剪贴板权限'
  }
}

const clearHistory = () => {
  if (!confirm('确定清空历史记录？')) return
  history.value = []
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {}
}

async function translateWithLibreTranslate() {
  const url = ltUrl.value.replace(/\/+$/, '') + '/translate'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: inputText.value,
      source: fromLang.value,
      target: toLang.value,
      format: 'text',
      api_key: ltApiKey.value || undefined,
    }),
    signal: abortController.value?.signal,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const text = json?.translatedText
  if (typeof text !== 'string') throw new Error('响应格式不正确')
  return text
}

function buildTranslatorPrompt() {
  const from = fromLang.value === 'auto' ? 'auto-detect' : langLabel(fromLang.value)
  const to = langLabel(toLang.value)
  const extra = extraInstruction.value.trim()

  const sys = [
    'You are a professional translator.',
    'Rules:',
    '- Output ONLY the translated text (no quotes, no explanation).',
    '- Preserve line breaks and formatting.',
    '- Keep code blocks unchanged; translate comments/strings only when it is clearly natural.',
  ].join('\n')

  const user = [
    `Source language: ${from}`,
    `Target language: ${to}`,
    extra ? `Extra instruction: ${extra}` : '',
    'Text:',
    inputText.value,
  ]
    .filter(Boolean)
    .join('\n')

  return { sys, user }
}

async function translateWithOpenAICompatible() {
  if (!oaApiKey.value.trim()) throw new Error('请先填写 API Key')
  if (!oaUrl.value.trim()) throw new Error('请先填写 API URL')
  if (!oaModel.value.trim()) throw new Error('请先填写 Model')

  const { sys, user } = buildTranslatorPrompt()

  const res = await fetch(oaUrl.value, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${oaApiKey.value}`,
    },
    body: JSON.stringify({
      model: oaModel.value,
      temperature: oaTemperature.value,
      stream: oaStream.value,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
    signal: abortController.value?.signal,
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  if (!oaStream.value) {
    const json = await res.json()
    const text = json?.choices?.[0]?.message?.content
    if (typeof text !== 'string') throw new Error('响应格式不正确')
    return text
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('浏览器不支持流式读取')
  const dec = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })

    if (!buf.includes('\n')) continue
    const lines = buf.split('\n')
    buf = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line) continue
      if (line.startsWith('event:')) continue
      if (!line.startsWith('data:')) continue

      const d = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim()
      if (!d || d === '[DONE]') continue

      try {
        const p = JSON.parse(d)
        const delta = p?.choices?.[0]?.delta?.content
        if (typeof delta === 'string' && delta) outputText.value += delta
      } catch {
        // ignore
      }
    }
  }

  return outputText.value
}

const translate = async () => {
  if (!inputText.value.trim()) return

  outputText.value = ''
  errorText.value = ''
  translating.value = true

  abortController.value = new AbortController()

  try {
    let out = ''

    if (provider.value === 'libretranslate') {
      out = await translateWithLibreTranslate()
      outputText.value = out
    } else {
      out = await translateWithOpenAICompatible()
    }

    const item: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ts: Date.now(),
      provider: provider.value,
      from: fromLang.value,
      to: toLang.value,
      input: inputText.value,
      output: outputText.value,
    }

    history.value = [item, ...history.value].slice(0, 50)
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      errorText.value = '已停止'
    } else {
      errorText.value = e?.message || '翻译失败'
    }
  } finally {
    translating.value = false
    abortController.value = null
  }
}

const loadFromHistory = (item: HistoryItem) => {
  provider.value = item.provider
  fromLang.value = item.from
  toLang.value = item.to
  inputText.value = item.input
  outputText.value = item.output
  errorText.value = ''
  showHistory.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-sm">
            <Languages class="w-5 h-5" />
          </div>
          <h2 class="text-xl font-bold text-slate-800 tracking-tight">AI 翻译助手</h2>
        </div>

        <div class="flex items-center gap-2">
           <button
            @click="showHistory = !showHistory"
            :class="[
              'p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium',
              showHistory ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <History class="w-5 h-5" />
            <span class="hidden sm:inline">历史记录</span>
          </button>
          
          <button
            @click="showSettings = !showSettings"
            :class="[
              'p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium',
              showSettings ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <Settings class="w-5 h-5" />
            <span class="hidden sm:inline">设置</span>
          </button>

          <RouterLink
            to="/"
            class="ml-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Home class="w-5 h-5" />
          </RouterLink>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4 md:p-6 gap-6">
      
      <!-- Settings Panel (Collapsible) -->
      <div v-show="showSettings" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 animate-in slide-in-from-top-4 duration-200">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-slate-800">配置参数</h3>
          <button @click="showSettings = false" class="text-slate-400 hover:text-slate-600">
            <ChevronDown class="w-5 h-5 rotate-180" />
          </button>
        </div>

        <div class="grid md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">翻译服务提供方</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" v-model="provider" value="libretranslate" class="text-brand-600 focus:ring-brand-500">
                  <span class="text-sm text-slate-700">LibreTranslate</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" v-model="provider" value="openai_compatible" class="text-brand-600 focus:ring-brand-500">
                  <span class="text-sm text-slate-700">OpenAI 兼容</span>
                </label>
              </div>
            </div>

            <div v-if="provider === 'libretranslate'" class="space-y-3">
               <div>
                <label class="block text-xs text-slate-500 mb-1">API URL</label>
                <input v-model="ltUrl" placeholder="https://libretranslate.de" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs text-slate-500 mb-1">API Key (Optional)</label>
                <input v-model="ltApiKey" type="password" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
              </div>
            </div>

            <div v-else class="space-y-3">
              <div>
                <label class="block text-xs text-slate-500 mb-1">API URL</label>
                <input v-model="oaUrl" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
              </div>
              <div>
                <label class="block text-xs text-slate-500 mb-1">API Key</label>
                <input v-model="oaApiKey" type="password" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-slate-500 mb-1">Model</label>
                  <input v-model="oaModel" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
                </div>
                <div>
                  <label class="block text-xs text-slate-500 mb-1">Temperature</label>
                  <input v-model.number="oaTemperature" type="number" step="0.1" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
                </div>
              </div>
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input v-model="oaStream" type="checkbox" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                启用流式输出 (SSE)
              </label>
            </div>
          </div>

          <div class="space-y-4">
             <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">额外指令 (Prompt)</label>
              <textarea 
                v-model="extraInstruction"
                placeholder="例如：请使用更专业的术语，或者保留 HTML 标签..."
                class="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
              ></textarea>
              <p class="text-xs text-slate-500 mt-1">此指令将作为 System Prompt 的一部分发送给 AI。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- History Panel (Collapsible) -->
      <div v-show="showHistory" class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 animate-in slide-in-from-top-4 duration-200">
         <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold text-slate-800">最近翻译</h3>
           <button @click="clearHistory" class="text-slate-400 hover:text-red-500 flex items-center gap-1 text-sm">
            <Trash2 class="w-4 h-4" /> 清空
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar">
           <button
            v-for="h in history"
            :key="h.id"
            @click="loadFromHistory(h)"
            class="text-left p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/30 transition group"
          >
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{{ langLabel(h.from) }} → {{ langLabel(h.to) }}</span>
              <span class="text-xs text-slate-400">{{ new Date(h.ts).toLocaleTimeString() }}</span>
            </div>
            <div class="text-sm text-slate-700 line-clamp-2">{{ h.input }}</div>
          </button>
          <div v-if="history.length === 0" class="col-span-full text-center py-8 text-slate-400 text-sm">暂无历史记录</div>
        </div>
      </div>

      <!-- Translation Area -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[500px] flex-1">
        <!-- Input Section -->
        <div class="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-slate-200">
          <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <select v-model="fromLang" class="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer hover:text-brand-600 transition-colors">
              <option v-for="l in languageOptions" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>
            
            <div class="flex items-center gap-2">
               <button v-if="inputText" @click="inputText = ''" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition" title="清空">
                  <RotateCcw class="w-4 h-4" />
               </button>
            </div>
          </div>
          
          <textarea
            v-model="inputText"
            placeholder="在此输入要翻译的文本..."
            class="flex-1 w-full p-4 md:p-6 text-lg text-slate-800 placeholder:text-slate-300 outline-none resize-none bg-transparent"
            spellcheck="false"
          ></textarea>

          <div class="p-4 flex items-center justify-between">
             <div class="text-xs text-slate-400">
               {{ inputText.length }} 字符
             </div>
             <!-- Translation Action Button (Visible on Mobile mostly) -->
          </div>
        </div>

        <!-- Middle Actions (Desktop) -->
        <div class="hidden md:flex flex-col justify-center items-center -ml-4 w-8 z-10 relative">
           <button @click="swapLang" class="bg-white border border-slate-200 shadow-sm p-1.5 rounded-full text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all hover:rotate-180">
              <ArrowLeftRight class="w-4 h-4" />
           </button>
        </div>

        <!-- Middle Actions (Mobile) -->
        <div class="md:hidden flex justify-center -my-4 z-10 relative">
           <button @click="swapLang" class="bg-white border border-slate-200 shadow-sm p-2 rounded-full text-slate-500 hover:text-brand-600 hover:border-brand-200 transition-all">
              <ArrowLeftRight class="w-4 h-4" />
           </button>
        </div>

        <!-- Output Section -->
        <div class="flex-1 flex flex-col bg-slate-50/30">
          <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <select v-model="toLang" class="bg-transparent text-sm font-semibold text-brand-700 focus:outline-none cursor-pointer hover:text-brand-800 transition-colors">
              <option v-for="l in languageOptions.filter(x => x.value !== 'auto')" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>

            <div class="flex items-center gap-1">
              <button 
                @click="copyOutput" 
                :disabled="!outputText"
                class="p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                :class="copied ? 'text-green-600 bg-green-50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'"
              >
                <component :is="copied ? Check : Copy" class="w-4 h-4" />
                <span v-if="copied">已复制</span>
              </button>
            </div>
          </div>

          <div class="flex-1 relative group">
            <div v-if="translating && !outputText" class="absolute inset-0 flex items-center justify-center">
               <div class="flex flex-col items-center gap-3 text-brand-500/50">
                 <div class="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                 <div class="text-sm font-medium">正在翻译...</div>
               </div>
            </div>

            <textarea
              v-model="outputText"
              readonly
              placeholder="翻译结果..."
              class="w-full h-full p-4 md:p-6 text-lg text-slate-800 placeholder:text-slate-300 outline-none resize-none bg-transparent"
            ></textarea>
          </div>

           <div class="p-4 flex justify-end gap-2 border-t border-slate-100 bg-white">
              <div v-if="errorText" class="mr-auto text-sm text-red-600 flex items-center">
                {{ errorText }}
              </div>

              <button
                v-if="translating"
                @click="stop"
                class="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center gap-2 transition-all"
              >
                <Square class="w-4 h-4 fill-current" />
                停止
              </button>
              
              <button
                v-else
                @click="translate"
                :disabled="!canTranslate"
                class="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 flex items-center gap-2 transition-all active:scale-95"
              >
                <Play class="w-4 h-4 fill-current" />
                立即翻译
              </button>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
