<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Calculator as CalcIcon, Copy, Trash2 } from 'lucide-vue-next'
import { evaluateExpression, type CalcMode } from '../utils/calculator'

const input = ref<string>('')
const mode = ref<CalcMode>('auto')
const warnings = ref<string[]>([])
const error = ref<string | null>(null)
const resultText = ref<string>('')
const resultMode = ref<'number' | 'bigint' | null>(null)

type HistoryItem = {
  ts: number
  expr: string
  mode: CalcMode
  ok: boolean
  result: string
}

const history = ref<HistoryItem[]>([])

const STORAGE_KEY = 'zenreader_calculator_state_v1'

const canEval = computed(() => input.value.trim().length > 0)

const persist = () => {
  try {
    const payload = {
      input: input.value,
      mode: mode.value,
      history: history.value.slice(0, 50),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

const restore = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (typeof parsed?.input === 'string') input.value = parsed.input
    if (parsed?.mode === 'auto' || parsed?.mode === 'number' || parsed?.mode === 'bigint') mode.value = parsed.mode
    if (Array.isArray(parsed?.history)) history.value = parsed.history
  } catch {
    // ignore
  }
}

const append = (s: string) => {
  input.value += s
  persist()
}

const backspace = () => {
  input.value = input.value.slice(0, -1)
  persist()
}

const clearAll = () => {
  input.value = ''
  warnings.value = []
  error.value = null
  resultText.value = ''
  resultMode.value = null
  persist()
}

const clearHistory = () => {
  history.value = []
  persist()
}

const evalNow = () => {
  warnings.value = []
  error.value = null
  resultText.value = ''
  resultMode.value = null

  const expr = input.value.trim()
  if (!expr) return

  const r = evaluateExpression(expr, mode.value)
  warnings.value = r.warnings

  if (!r.ok) {
    error.value = r.error
    history.value.unshift({ ts: Date.now(), expr, mode: mode.value, ok: false, result: r.error })
    history.value = history.value.slice(0, 50)
    persist()
    return
  }

  resultText.value = r.text
  resultMode.value = r.mode
  history.value.unshift({ ts: Date.now(), expr, mode: mode.value, ok: true, result: r.text })
  history.value = history.value.slice(0, 50)
  persist()
}

const useHistory = (h: HistoryItem) => {
  input.value = h.expr
  mode.value = h.mode
  evalNow()
}

const copyResult = async () => {
  try {
    if (!resultText.value) return
    await navigator.clipboard.writeText(resultText.value)
  } catch {
    // ignore
  }
}

onMounted(() => {
  restore()
  if (input.value.trim()) evalNow()
})
</script>

<template>
  <div class="min-h-[100vh] bg-gray-50">
    <div class="max-w-6xl mx-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6 min-h-[100%] flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalcIcon class="w-5 h-5" /> 计算器
        </h2>
        <RouterLink to="/" class="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600">
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 lg:gap-6 flex-grow">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <label class="text-sm text-slate-600">计算模式：</label>
            <select v-model="mode" @change="persist" class="px-3 py-2 rounded-lg border border-slate-200 text-sm">
              <option value="auto">自动（优先 BigInt）</option>
              <option value="number">Number（科学计算/小数）</option>
              <option value="bigint">BigInt（超大整数）</option>
            </select>
            <button @click="evalNow" :disabled="!canEval" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-300 text-white rounded-lg">计算</button>
            <button @click="backspace" class="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg">退格</button>
            <button @click="clearAll" class="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg">清空</button>
          </div>

          <textarea
            v-model="input"
            @input="persist"
            @keydown.enter.exact.prevent="evalNow"
            placeholder="输入表达式，例如： (1+2)*3, 2^64, sin(pi/2), log(8,2), 100!"
            class="w-full min-h-[160px] p-4 font-mono text-sm outline-none resize-y rounded-xl border border-slate-200"
            spellcheck="false"
          ></textarea>

          <div class="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-4">
            <button class="btn" @click="append('7')">7</button>
            <button class="btn" @click="append('8')">8</button>
            <button class="btn" @click="append('9')">9</button>
            <button class="btn" @click="append('+')">+</button>
            <button class="btn" @click="append('(')">(</button>
            <button class="btn" @click="append(')')">)</button>

            <button class="btn" @click="append('4')">4</button>
            <button class="btn" @click="append('5')">5</button>
            <button class="btn" @click="append('6')">6</button>
            <button class="btn" @click="append('-')">-</button>
            <button class="btn" @click="append('^')">^</button>
            <button class="btn" @click="append('!')">!</button>

            <button class="btn" @click="append('1')">1</button>
            <button class="btn" @click="append('2')">2</button>
            <button class="btn" @click="append('3')">3</button>
            <button class="btn" @click="append('*')">*</button>
            <button class="btn" @click="append('/')">/</button>
            <button class="btn" @click="append('%')">%</button>

            <button class="btn" @click="append('0')">0</button>
            <button class="btn" @click="append('.')">.</button>
            <button class="btn" @click="append(',')">,</button>
            <button class="btn" @click="append('pi')">pi</button>
            <button class="btn" @click="append('e')">e</button>
            <button class="btn" @click="append('sqrt(')">sqrt(</button>

            <button class="btn" @click="append('sin(')">sin(</button>
            <button class="btn" @click="append('cos(')">cos(</button>
            <button class="btn" @click="append('tan(')">tan(</button>
            <button class="btn" @click="append('log(')">log(</button>
            <button class="btn" @click="append('ln(')">ln(</button>
            <button class="btn" @click="append('pow(')">pow(</button>
          </div>

          <div class="mt-4">
            <div class="flex items-center justify-between">
              <div class="text-slate-900 font-semibold">结果</div>
              <div class="flex items-center gap-2">
                <span v-if="resultMode" class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{{ resultMode }}</span>
                <button @click="copyResult" class="p-2 text-slate-400 hover:text-slate-600" title="复制结果">
                  <Copy class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-if="error" class="mt-2 border rounded-lg px-4 py-3 bg-red-50 text-red-700 border-red-200">
              {{ error }}
            </div>

            <div v-else class="mt-2 border rounded-lg px-4 py-3 bg-slate-50 text-slate-800 border-slate-200 font-mono break-all min-h-[44px]">
              {{ resultText || '—' }}
            </div>

            <div v-if="warnings.length" class="mt-3 space-y-2">
              <div v-for="(w, idx) in warnings" :key="idx" class="text-xs border rounded-lg px-3 py-2 bg-amber-50 text-amber-800 border-amber-200">
                {{ w }}
              </div>
            </div>

            <div class="mt-4 text-xs text-slate-500">
              支持：+ - * / % ^ !，括号，函数：sin/cos/tan/asin/acos/atan/sqrt/abs/ln/log/exp/pow/min/max，常量：pi,e。
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
          <div class="flex items-center justify-between mb-3">
            <div class="text-slate-900 font-semibold">历史记录</div>
            <button @click="clearHistory" class="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg">
              <Trash2 class="w-4 h-4" /> 清空历史
            </button>
          </div>

          <div v-if="history.length === 0" class="text-slate-400 text-sm text-center py-10">
            暂无历史记录
          </div>

          <div v-else class="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
            <button
              v-for="h in history"
              :key="h.ts"
              @click="useHistory(h)"
              class="w-full text-left border rounded-xl px-4 py-3 hover:border-brand-200 hover:bg-brand-50/20 transition"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="font-mono text-sm text-slate-800 break-all">{{ h.expr }}</div>
                <span class="text-[10px] px-2 py-1 rounded-full" :class="h.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'">
                  {{ h.ok ? 'OK' : 'ERR' }} · {{ h.mode }}
                </span>
              </div>
              <div class="mt-2 font-mono text-xs text-slate-600 break-all">= {{ h.result }}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: #fff;
  border: 1px solid rgb(226 232 240);
  color: rgb(51 65 85);
  transition: background-color 150ms, border-color 150ms;
  font-size: 0.875rem;
  line-height: 1.25rem;
}
.btn:hover {
  border-color: rgb(191 219 254);
  background: rgba(59, 130, 246, 0.06);
}
</style>
