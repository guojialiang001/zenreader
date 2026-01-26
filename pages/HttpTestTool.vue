<script setup lang="ts">
import { computed, ref, watchEffect, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Play, 
  Settings, 
  Clock, 
  Globe, 
  Shield, 
  ArrowRightLeft, 
  FileJson, 
  LayoutList,
  History,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  XCircle,
  AlertCircle
} from 'lucide-vue-next'

type HttpTestResult =
  | {
      ok: true
      input: {
        url: string
        method: string
        timeoutMs: number
        followRedirects: boolean
        maxRedirects: number
      }
      finalUrl: string
      redirects: Array<{ url: string; statusCode: number; location: string }>
      response: {
        statusCode: number
        statusMessage: string
        headers: Record<string, unknown>
        httpVersion: string
        bodyBytes: number
        bodyPreview: string
        bodyPreviewEncoding: string
        remoteAddress: string
        remotePort: number
        tls:
          | null
          | {
              alpnProtocol: string
              authorized: boolean
              authorizationError: string
              servername: string
              subject: unknown
              issuer: unknown
              valid_from: string
              valid_to: string
              fingerprint256: string
            }
      }
      timings: Record<string, number | null>
    }
  | { ok: false; error: string }

type HistoryItem = {
  id: string
  ts: number
  method: string
  url: string
  status?: number
  duration?: number
}

const HISTORY_KEY = 'zenreader_http_test_history_v1'

const route = useRoute()
const router = useRouter()

const urlInput = ref('')
const method = ref<'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET')
const followRedirects = ref(true)
const timeoutMs = ref(15000)
const maxRedirects = ref(5)

const loading = ref(false)
const result = ref<HttpTestResult | null>(null)
const activeTab = ref<'body' | 'headers' | 'timings' | 'redirects' | 'tls' | 'raw'>('body')
const showOptions = ref(false)
const showHistory = ref(false)
const history = ref<HistoryItem[]>([])

const apiBase = (import.meta as any).env?.VITE_HTTP_TEST_API_BASE || ''

const methodColors: Record<string, string> = {
  GET: 'text-blue-600 bg-blue-50 border-blue-200',
  POST: 'text-green-600 bg-green-50 border-green-200',
  PUT: 'text-orange-600 bg-orange-50 border-orange-200',
  DELETE: 'text-red-600 bg-red-50 border-red-200',
  PATCH: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  HEAD: 'text-purple-600 bg-purple-50 border-purple-200',
}

function normalizeUrl(raw: string) {
  const s = raw.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

onMounted(() => {
  const rawHistory = localStorage.getItem(HISTORY_KEY)
  if (rawHistory) {
    try {
      history.value = JSON.parse(rawHistory)
    } catch {}
  }
})

watch(history, (newVal) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newVal.slice(0, 50)))
}, { deep: true })

watchEffect(() => {
  const encoded = route.params.encodedUrl
  if (typeof encoded === 'string' && encoded.length > 0) {
    try {
      urlInput.value = decodeURIComponent(encoded)
    } catch {
      urlInput.value = encoded
    }
  } else if (typeof route.query.url === 'string' && route.query.url) {
    urlInput.value = route.query.url
  }
})

const prettyResult = computed(() => (result.value ? JSON.stringify(result.value, null, 2) : ''))

const statusColor = (code: number) => {
  if (code >= 200 && code < 300) return 'text-green-700 bg-green-50 border-green-200'
  if (code >= 300 && code < 400) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  if (code >= 400 && code < 500) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

async function run() {
  const url = normalizeUrl(urlInput.value)
  if (!url) {
    result.value = { ok: false, error: 'Missing URL' }
    return
  }

  // Keep the URL in the address bar
  router.replace({ path: `/http/${encodeURIComponent(url)}` }).catch(() => {})

  loading.value = true
  result.value = null
  const startTime = Date.now()

  try {
    const resp = await fetch(`${apiBase}/api/http-test`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        url,
        method: method.value,
        followRedirects: followRedirects.value,
        timeoutMs: timeoutMs.value,
        maxRedirects: maxRedirects.value,
      }),
    })
    const data = (await resp.json()) as HttpTestResult
    result.value = data
    
    // Add to history
    const duration = Date.now() - startTime
    const item: HistoryItem = {
      id: Date.now().toString(),
      ts: Date.now(),
      method: method.value,
      url,
      status: data.ok ? data.response.statusCode : undefined,
      duration
    }
    history.value = [item, ...history.value].slice(0, 50)
    
  } catch (e: any) {
    result.value = { ok: false, error: e?.message || String(e) }
  } finally {
    loading.value = false
  }
}

const loadHistoryItem = (item: HistoryItem) => {
  urlInput.value = item.url
  method.value = item.method as any
  showHistory.value = false
}

const clearHistory = () => {
  history.value = []
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div class="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Globe class="w-5 h-5" />
          </div>
          <h1 class="text-xl font-bold text-slate-800 tracking-tight">HTTP Test Tool</h1>
        </div>
        
        <button 
          @click="showHistory = !showHistory"
          :class="[
            'p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium',
            showHistory ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
          ]"
        >
          <History class="w-5 h-5" />
          <span class="hidden sm:inline">History</span>
        </button>
      </div>
    </div>

    <div class="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 flex flex-col gap-6 relative">
      
      <!-- History Sidebar/Overlay -->
      <div v-if="showHistory" class="absolute right-4 md:right-6 top-20 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-30 flex flex-col max-h-[calc(100vh-150px)] animate-in slide-in-from-right-4 duration-200">
        <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
          <h3 class="font-semibold text-slate-700 text-sm">Request History</h3>
          <button @click="clearHistory" class="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <Trash2 class="w-3 h-3" /> Clear
          </button>
        </div>
        <div class="overflow-y-auto p-2 space-y-1 custom-scrollbar flex-1">
          <div v-if="history.length === 0" class="text-center py-8 text-slate-400 text-xs">No history yet</div>
          <button
            v-for="h in history"
            :key="h.id"
            @click="loadHistoryItem(h)"
            class="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition group"
          >
            <div class="flex items-center gap-2 mb-1">
              <span :class="['text-[10px] font-bold px-1.5 py-0.5 rounded border', methodColors[h.method] || 'text-slate-600']">
                {{ h.method }}
              </span>
              <span v-if="h.status" :class="['text-[10px] font-bold px-1.5 py-0.5 rounded border', statusColor(h.status)]">
                {{ h.status }}
              </span>
              <span class="text-[10px] text-slate-400 ml-auto">{{ new Date(h.ts).toLocaleTimeString() }}</span>
            </div>
            <div class="text-xs text-slate-600 truncate font-mono" :title="h.url">{{ h.url }}</div>
          </button>
        </div>
      </div>

      <!-- Request Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
        <div class="flex flex-col md:flex-row gap-3">
          <div class="relative min-w-[100px]">
            <select 
              v-model="method" 
              class="w-full appearance-none px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 cursor-pointer"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
              <option value="PATCH">PATCH</option>
            </select>
            <ChevronDown class="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div class="flex-1 relative">
            <input
              v-model="urlInput"
              type="text"
              placeholder="https://api.example.com/v1/..."
              class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono text-sm"
              @keyup.enter="run"
            />
          </div>

          <button
            @click="run"
            :disabled="loading"
            class="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 min-w-[100px]"
          >
            <div v-if="loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span v-else>Send</span>
            <Play v-if="!loading" class="w-4 h-4 fill-current" />
          </button>
        </div>

        <div>
          <button 
            @click="showOptions = !showOptions" 
            class="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Settings class="w-3.5 h-3.5" />
            <span>Advanced Options</span>
            <ChevronRight class="w-3.5 h-3.5 transition-transform duration-200" :class="{ 'rotate-90': showOptions }" />
          </button>

          <div v-show="showOptions" class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in slide-in-from-top-2">
            <label class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input v-model="followRedirects" type="checkbox" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Follow redirects
            </label>
            <div class="flex items-center gap-2 text-sm text-slate-700">
              <span class="whitespace-nowrap">Timeout</span>
              <input v-model.number="timeoutMs" type="number" min="1000" class="w-full px-2 py-1 border border-slate-200 rounded-md text-xs" />
              <span class="text-slate-400 text-xs">ms</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-slate-700">
              <span class="whitespace-nowrap">Max Redirects</span>
              <input v-model.number="maxRedirects" type="number" min="0" max="20" class="w-full px-2 py-1 border border-slate-200 rounded-md text-xs" />
            </div>
          </div>
        </div>
      </div>

      <!-- Result Area -->
      <div v-if="result" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        <!-- Error State -->
        <div v-if="!result.ok" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
           <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
             <AlertCircle class="w-6 h-6" />
           </div>
           <h3 class="text-red-800 font-semibold mb-1">Request Failed</h3>
           <p class="text-red-600 text-sm">{{ result.error }}</p>
        </div>

        <!-- Success State -->
        <div v-else class="space-y-4">
          
          <!-- Status Bar -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
            <div class="flex items-center gap-4">
              <div :class="['px-3 py-1 rounded-lg border text-lg font-bold shadow-sm', statusColor(result.response.statusCode)]">
                {{ result.response.statusCode }} {{ result.response.statusMessage }}
              </div>
              <div class="flex flex-col text-xs text-slate-500">
                <span class="font-medium text-slate-900">{{ result.response.httpVersion }}</span>
                <span>Time: {{ result.timings.total != null ? Math.round(result.timings.total) + 'ms' : '-' }}</span>
              </div>
              <div class="flex flex-col text-xs text-slate-500">
                 <span class="font-medium text-slate-900">{{ (result.response.bodyBytes / 1024).toFixed(2) }} KB</span>
                 <span>Size</span>
              </div>
            </div>
            
            <div class="text-xs text-slate-400 font-mono hidden md:block max-w-xs truncate" :title="result.finalUrl">
              {{ result.finalUrl }}
            </div>
          </div>

          <!-- Tabs Content -->
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            <div class="flex border-b border-slate-200 overflow-x-auto">
              <button 
                v-for="tab in ['body', 'headers', 'timings', 'redirects', 'tls', 'raw'] as const"
                :key="tab"
                @click="activeTab = tab"
                :class="[
                  'px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                ]"
              >
                {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
                <span v-if="tab === 'redirects' && result.redirects.length" class="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">{{ result.redirects.length }}</span>
              </button>
            </div>

            <div class="p-0 flex-1 bg-slate-50/30 overflow-auto relative">
              
              <!-- Body Tab -->
              <div v-if="activeTab === 'body'" class="h-full flex flex-col">
                 <div v-if="method === 'HEAD'" class="p-8 text-center text-slate-400">
                    HEAD requests do not have a body.
                 </div>
                 <template v-else>
                   <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                      <span class="text-xs text-slate-500 uppercase">{{ result.response.bodyPreviewEncoding }}</span>
                      <button @click="copyToClipboard(result.response.bodyPreview)" class="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1">
                        <Copy class="w-3 h-3" /> Copy
                      </button>
                   </div>
                   <pre class="flex-1 p-4 text-xs font-mono text-slate-800 overflow-auto whitespace-pre-wrap break-all">{{ result.response.bodyPreview }}</pre>
                 </template>
              </div>

              <!-- Headers Tab -->
              <div v-if="activeTab === 'headers'" class="p-4">
                 <div class="grid grid-cols-[minmax(120px,auto)_1fr] gap-x-4 gap-y-2 text-sm">
                    <template v-for="(value, key) in result.response.headers" :key="key">
                       <div class="font-semibold text-slate-600 text-right">{{ key }}:</div>
                       <div class="font-mono text-slate-800 break-all">{{ value }}</div>
                    </template>
                 </div>
              </div>

              <!-- Timings Tab -->
              <div v-if="activeTab === 'timings'" class="p-6">
                 <div class="max-w-md space-y-4">
                    <div v-for="(time, key) in result.timings" :key="key" class="relative">
                       <div class="flex items-center justify-between text-sm mb-1">
                          <span class="text-slate-600 capitalize">{{ key.replace(/([A-Z])/g, ' $1').trim() }}</span>
                          <span class="font-mono text-slate-900">{{ time != null ? Math.round(time) + ' ms' : '-' }}</span>
                       </div>
                       <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                             class="h-full bg-blue-500 rounded-full" 
                             :style="{ width: (time && result.timings.total ? (time / result.timings.total) * 100 : 0) + '%' }"
                          ></div>
                       </div>
                    </div>
                 </div>
              </div>

               <!-- Redirects Tab -->
               <div v-if="activeTab === 'redirects'" class="p-4">
                 <div v-if="result.redirects.length === 0" class="text-center text-slate-400 py-8">No redirects</div>
                 <div v-else class="space-y-4">
                    <div v-for="(r, idx) in result.redirects" :key="idx" class="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                       <div class="flex items-center gap-3 mb-2">
                          <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{{ idx + 1 }}</span>
                          <span :class="['px-2 py-0.5 rounded text-xs font-bold border', statusColor(r.statusCode)]">{{ r.statusCode }}</span>
                       </div>
                       <div class="text-xs font-mono text-slate-600 break-all pl-9">
                          <div>From: {{ r.url }}</div>
                          <div class="mt-1 flex items-center gap-1 text-slate-400">
                             <ArrowRightLeft class="w-3 h-3" /> To: {{ r.location }}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

               <!-- TLS Tab -->
               <div v-if="activeTab === 'tls'" class="p-4">
                 <div v-if="!result.response.tls" class="text-center text-slate-400 py-8">No TLS information (HTTP)</div>
                 <div v-else class="grid grid-cols-[minmax(140px,auto)_1fr] gap-x-4 gap-y-3 text-sm">
                    <div class="font-semibold text-slate-600">Authorized</div>
                    <div>
                       <span v-if="result.response.tls.authorized" class="text-green-600 flex items-center gap-1"><Check class="w-4 h-4" /> Yes</span>
                       <span v-else class="text-red-600 flex items-center gap-1"><XCircle class="w-4 h-4" /> No ({{ result.response.tls.authorizationError }})</span>
                    </div>

                    <div class="font-semibold text-slate-600">Server Name</div>
                    <div class="font-mono">{{ result.response.tls.servername }}</div>
                    
                    <div class="font-semibold text-slate-600">Protocol</div>
                    <div class="font-mono">{{ result.response.tls.alpnProtocol || 'unknown' }}</div>

                    <div class="font-semibold text-slate-600">Valid From</div>
                    <div class="font-mono">{{ result.response.tls.valid_from }}</div>

                    <div class="font-semibold text-slate-600">Valid To</div>
                    <div class="font-mono">{{ result.response.tls.valid_to }}</div>
                    
                    <div class="font-semibold text-slate-600">Fingerprint (256)</div>
                    <div class="font-mono break-all text-xs">{{ result.response.tls.fingerprint256 }}</div>
                 </div>
              </div>

               <!-- Raw Tab -->
               <div v-if="activeTab === 'raw'" class="h-full p-4 flex flex-col">
                  <pre class="flex-1 text-xs font-mono text-slate-600 overflow-auto bg-slate-50 p-4 rounded-lg border border-slate-200">{{ prettyResult }}</pre>
               </div>

            </div>
          </div>

        </div>
      </div>

      <!-- Initial State -->
      <div v-else-if="!loading" class="flex-1 flex flex-col items-center justify-center text-slate-300 min-h-[400px]">
        <Globe class="w-24 h-24 mb-4 opacity-20" />
        <p class="text-lg font-medium opacity-50">Enter a URL to start testing</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>

