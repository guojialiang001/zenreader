<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Upload, FileText, FileDown, Loader2, RefreshCcw, AlertTriangle } from 'lucide-vue-next'

type PreviewStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'failed'

const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || ''
const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const status = ref<PreviewStatus>('idle')
const fileId = ref<string | null>(null)
const previewUrl = ref('')
const errorMessage = ref('')
const fileInfo = ref<{ name: string; size: number; type: string } | null>(null)
let pollTimer: number | undefined

const originalUrl = computed(() => {
  if (!fileId.value) return ''
  return resolveUrl(`/api/preview/${fileId.value}/original`)
})

const statusLabel = computed(() => {
  switch (status.value) {
    case 'uploading':
      return '上传中...'
    case 'processing':
      return '处理中...'
    case 'ready':
      return '预览就绪'
    case 'failed':
      return '处理失败'
    default:
      return '等待上传'
  }
})

const resolveUrl = (url: string) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const base = apiBase.replace(/\/$/, '')
  if (!base) return url.startsWith('/') ? url : `/${url}`
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`
}

const resetState = () => {
  status.value = 'idle'
  fileId.value = null
  previewUrl.value = ''
  errorMessage.value = ''
  fileInfo.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  if (pollTimer) {
    window.clearTimeout(pollTimer)
    pollTimer = undefined
  }
}

const formatSize = (bytes: number) => {
  if (!bytes) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, idx)
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`
}

const schedulePoll = (id: string) => {
  if (pollTimer) window.clearTimeout(pollTimer)
  pollTimer = window.setTimeout(() => {
    fetchStatus(id)
  }, 1200)
}

const fetchStatus = async (id: string) => {
  try {
    const resp = await fetch(resolveUrl(`/api/preview/${id}`))
    if (!resp.ok) throw new Error('查询失败')
    const data = await resp.json()
    if (data.status === 'ready') {
      status.value = 'ready'
      const url = data.previewUrl || `/api/preview/${id}/content`
      previewUrl.value = resolveUrl(url)
      errorMessage.value = ''
      return
    }
    if (data.status === 'failed') {
      status.value = 'failed'
      errorMessage.value = data.error || '转换失败'
      return
    }
    status.value = 'processing'
    schedulePoll(id)
  } catch (err: any) {
    status.value = 'failed'
    errorMessage.value = err?.message || '查询失败'
  }
}

const uploadFile = async (file: File) => {
  resetState()
  fileInfo.value = {
    name: file.name,
    size: file.size,
    type: file.type || 'unknown'
  }
  status.value = 'uploading'

  const form = new FormData()
  form.append('file', file)

  try {
    const resp = await fetch(resolveUrl('/api/preview/upload'), {
      method: 'POST',
      body: form
    })
    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(text || '上传失败')
    }
    const data = await resp.json()
    fileId.value = data.fileId
    if (data.status === 'ready') {
      status.value = 'ready'
      previewUrl.value = resolveUrl(`/api/preview/${data.fileId}/content`)
    } else if (data.status === 'failed') {
      status.value = 'failed'
      errorMessage.value = data.error || '转换失败'
    } else {
      status.value = 'processing'
      schedulePoll(data.fileId)
    }
  } catch (err: any) {
    status.value = 'failed'
    errorMessage.value = err?.message || '上传失败'
  }
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) uploadFile(file)
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  dragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) uploadFile(file)
}

const openFileDialog = () => {
  fileInput.value?.click()
}

onBeforeUnmount(() => {
  if (pollTimer) window.clearTimeout(pollTimer)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-brand-50 to-white">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText class="w-7 h-7 text-brand-600" />
            文档预览
          </h1>
          <p class="text-slate-600 mt-1">上传 PDF / Word / Excel / PPT，浏览器内快速预览</p>
        </div>
        <RouterLink
          to="/"
          class="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600"
        >
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回首页</span>
        </RouterLink>
      </div>

      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <div
          class="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-300 transition-colors"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop="handleDrop"
          @click="openFileDialog"
          :class="{ 'border-brand-400 bg-brand-50': dragOver }"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            class="hidden"
            @change="handleFileSelect"
          />
          <div class="w-16 h-16 mx-auto mb-4 bg-brand-100 rounded-full flex items-center justify-center">
            <Upload class="w-7 h-7 text-brand-600" />
          </div>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">点击或拖拽文件到此处</h3>
          <p class="text-slate-500 text-sm">支持 PDF、Word、Excel、PPT 格式</p>
        </div>

        <div v-if="fileInfo" class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-700">文件名:</span>
            <span class="truncate">{{ fileInfo.name }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-700">大小:</span>
            <span>{{ formatSize(fileInfo.size) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-slate-700">类型:</span>
            <span>{{ fileInfo.type }}</span>
          </div>
        </div>

        <div class="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div class="flex items-center gap-2 text-slate-600">
            <Loader2 v-if="status === 'uploading' || status === 'processing'" class="w-4 h-4 animate-spin text-brand-600" />
            <AlertTriangle v-if="status === 'failed'" class="w-4 h-4 text-red-500" />
            <span class="font-medium">{{ statusLabel }}</span>
            <span v-if="status === 'failed'" class="text-red-500">{{ errorMessage }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 transition-colors"
              @click="resetState"
            >
              <RefreshCcw class="w-4 h-4" />
              重置
            </button>
            <a
              v-if="status === 'ready'"
              :href="originalUrl"
              target="_blank"
              class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              <FileDown class="w-4 h-4" />
              下载原文件
            </a>
          </div>
        </div>
      </div>

      <div v-if="status === 'ready' && previewUrl" class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div class="text-sm text-slate-500 mb-3">预览区域</div>
        <iframe
          :src="previewUrl"
          class="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
        ></iframe>
      </div>

      <div v-else class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-sm text-slate-600">
        <div class="flex items-start gap-3">
          <div class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">1</div>
          <p>上传文件后系统会自动完成格式校验与转换。</p>
        </div>
        <div class="flex items-start gap-3 mt-3">
          <div class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">2</div>
          <p>转换完成后自动加载预览，支持浏览器直接查看。</p>
        </div>
        <div class="flex items-start gap-3 mt-3">
          <div class="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold">3</div>
          <p>随时下载原文件，确保格式一致性。</p>
        </div>
      </div>
    </div>
  </div>
</template>
