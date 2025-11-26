<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Clock } from 'lucide-vue-next'

const nowStr = ref('')
const englishTimeStr = ref('')
const localTimeStr = ref('')
const currentMs = ref<number>(Date.now())
const currentSec = computed(() => Math.floor(currentMs.value / 1000))
let timer: number | null = null

// 时区时间变量
const beijingTimeStr = ref('')
const londonTimeStr = ref('')
const newYorkTimeStr = ref('')
const losAngelesTimeStr = ref('')

const pad = (n: number) => String(n).padStart(2, '0')
const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

// 根据UTC时间和时区偏移量计算指定时区的时间
const getTimeInTimezone = (utcTime: number, offsetHours: number): Date => {
  const date = new Date(utcTime)
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  return new Date(utc + (3600000 * offsetHours))
}

// 格式化时区时间显示
const formatTimezone = (d: Date, timezoneName: string): string => {
  return `${format(d)} (${timezoneName})`
}
const formatEnglish = (d: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${pad(d.getDate())} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} GMT${d.getTimezoneOffset() > 0 ? '-' : '+'}${pad(Math.floor(Math.abs(d.getTimezoneOffset()) / 60))}${pad(Math.abs(d.getTimezoneOffset()) % 60)}`
}
const formatLocalTime = (d: Date) => {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

const tick = () => {
  const ms = Date.now()
  currentMs.value = ms
  const date = new Date(ms)
  nowStr.value = `${format(date)}`
  englishTimeStr.value = `${formatEnglish(date)}`
  localTimeStr.value = `${formatLocalTime(date)}`
  
  // 计算并更新各时区时间
  beijingTimeStr.value = formatTimezone(getTimeInTimezone(ms, 8), 'UTC+8')
  londonTimeStr.value = formatTimezone(getTimeInTimezone(ms, 0), 'UTC±0')
  newYorkTimeStr.value = formatTimezone(getTimeInTimezone(ms, -5), 'UTC-5')
  losAngelesTimeStr.value = formatTimezone(getTimeInTimezone(ms, -8), 'UTC-8')
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

const tsInput = ref('')
const tsStatus = ref<{ type: 'success' | 'error'; msg: string } | null>(null)
const tsOutput = ref('')
const tsOutputEnglish = ref('')
const tsOutputLocalTime = ref('')

const convertTs = () => {
  const raw = tsInput.value.trim()
  if (!/^\d+$/.test(raw)) { 
    tsStatus.value = { type: 'error', msg: '时间戳必须为数字' }; 
    tsOutput.value = '';
    tsOutputEnglish.value = '';
    tsOutputLocalTime.value = '';
    return 
  }
  let date: Date;
  if (raw.length === 13) {
    const ms = Number(raw)
    date = new Date(ms)
  } else if (raw.length === 10) {
    const sec = Number(raw)
    date = new Date(sec * 1000)
  } else {
    tsStatus.value = { type: 'error', msg: '仅支持 10 或 13 位时间戳' }
    tsOutput.value = '';
    tsOutputEnglish.value = '';
    tsOutputLocalTime.value = '';
    return
  }
  
  tsOutput.value = `北京时间：${format(date)}`
  tsOutputEnglish.value = `北京时间：${formatEnglish(date)}`
  tsOutputLocalTime.value = `北京时间：${formatLocalTime(date)}`
  tsStatus.value = { type: 'success', msg: '转换成功' }
}

const dtInputStr = ref('')
const dtStatusStr = ref<{ type: 'success' | 'error'; msg: string } | null>(null)
const dtOutputMsStr = ref('')

const dtInputPick = ref('')
const dtStatusPick = ref<{ type: 'success' | 'error'; msg: string } | null>(null)
const dtOutputMsPick = ref('')

const convertDtStr = () => {
  const raw = dtInputStr.value.trim()
  if (!raw) { dtStatusStr.value = { type: 'error', msg: '请输入日期时间字符串' }; dtOutputMsStr.value = ''; return }
  let d = new Date(raw)
  if (isNaN(d.getTime())) {
    const m = raw.match(/^(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
    if (m) {
      const y = Number(m[1]); const mo = Number(m[2]); const da = Number(m[3])
      const hh = Number(m[4] ?? '0'); const mm = Number(m[5] ?? '0'); const ss = Number(m[6] ?? '0')
      d = new Date(y, mo - 1, da, hh, mm, ss)
    }
  }
  if (isNaN(d.getTime())) { dtStatusStr.value = { type: 'error', msg: '无法解析日期时间字符串' }; dtOutputMsStr.value = ''; return }
  dtOutputMsStr.value = String(d.getTime())
  dtStatusStr.value = { type: 'success', msg: '转换成功' }
}

const convertDtPick = () => {
  const raw = dtInputPick.value.trim()
  if (!raw) { dtStatusPick.value = { type: 'error', msg: '请选择日期时间' }; dtOutputMsPick.value = ''; return }
  const d = new Date(raw)
  if (isNaN(d.getTime())) { dtStatusPick.value = { type: 'error', msg: '无效的日期时间' }; dtOutputMsPick.value = ''; return }
  dtOutputMsPick.value = String(d.getTime())
  dtStatusPick.value = { type: 'success', msg: '转换成功' }
}
</script>

<template>
  <div class="min-h-[100vh] bg-gray-50">
    <div class="max-w-6xl mx-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6 min-h-[100%] flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2"><Clock class="w-5 h-5" /> 时间戳工具</h2>
        <RouterLink to="/" class="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600">
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">当前时间</div>
          <div class="text-lg sm:text-xl font-semibold text-slate-900 break-words">{{ nowStr }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">北京时间</div>
          <div class="text-base font-semibold text-slate-900 break-words">{{ beijingTimeStr }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">伦敦时间</div>
          <div class="text-base font-semibold text-slate-900 break-words">{{ londonTimeStr }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">纽约时间</div>
          <div class="text-base font-semibold text-slate-900 break-words">{{ newYorkTimeStr }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">洛杉矶时间</div>
          <div class="text-base font-semibold text-slate-900 break-words">{{ losAngelesTimeStr }}</div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">英文格式时间</div>
          <div class="text-base font-semibold text-slate-900 break-words">{{ englishTimeStr }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">LocalTime</div>
          <div class="text-base font-semibold text-slate-900 break-words">{{ localTimeStr }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">当前时间戳(13位)</div>
          <div class="font-mono text-base text-slate-900 break-all">{{ currentMs }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-400 text-sm mb-1">当前时间戳(10位)</div>
          <div class="font-mono text-base text-slate-900 break-all">{{ currentSec }}</div>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 flex-grow">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-900 font-semibold mb-4">时间戳 → 日期时间</div>
          <div class="flex items-center gap-3 mb-4">
            <input v-model="tsInput" placeholder="输入 10 或 13 位时间戳" class="flex-1 px-4 py-2 rounded-lg border border-slate-200 shadow-sm font-mono text-sm outline-none" />
            <button @click="convertTs" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg">转换</button>
          </div>
          <div v-if="tsStatus" :class="tsStatus.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'" class="mb-4 border rounded-lg px-4 py-3">{{ tsStatus.msg }}</div>
          <div class="space-y-4">
            <div>
              <div class="text-slate-400 text-xs mb-1">标准格式</div>
              <div class="font-mono text-sm text-slate-700 break-words">{{ tsOutput }}</div>
            </div>
            <div>
              <div class="text-slate-400 text-xs mb-1">英文格式</div>
              <div class="font-mono text-sm text-slate-700 break-words">{{ tsOutputEnglish }}</div>
            </div>
            <div>
              <div class="text-slate-400 text-xs mb-1">LocalTime</div>
              <div class="font-mono text-sm text-slate-700 break-words">{{ tsOutputLocalTime }}</div>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="text-slate-900 font-semibold mb-4">日期时间 → 13位时间戳</div>
          <div class="flex items-center gap-3 mb-3">
            <input v-model="dtInputStr" type="text" placeholder="例如 2025-11-25 12:34:56 或 ISO 字符串" class="flex-1 px-4 py-2 rounded-lg border border-slate-200 shadow-sm outline-none" />
            <button @click="convertDtStr" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg">字符串转换</button>
          </div>
          <div v-if="dtStatusStr" :class="dtStatusStr.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'" class="mb-4 border rounded-lg px-4 py-3">{{ dtStatusStr.msg }}</div>
          <div class="font-mono text-sm text-slate-700 mb-6 max-h-[calc(100vh-500px)] overflow-y-auto whitespace-pre-wrap break-words">{{ dtOutputMsStr }}</div>
          <div class="flex items-center gap-3 mb-3">
            <input v-model="dtInputPick" type="datetime-local" step="1" class="flex-1 px-4 py-2 rounded-lg border border-slate-200 shadow-sm outline-none" />
            <button @click="convertDtPick" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg">选择器转换</button>
          </div>
          <div v-if="dtStatusPick" :class="dtStatusPick.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'" class="mb-4 border rounded-lg px-4 py-3">{{ dtStatusPick.msg }}</div>
          <div class="font-mono text-sm text-slate-700 max-h-[calc(100vh-500px)] overflow-y-auto whitespace-pre-wrap break-words">{{ dtOutputMsPick }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
