<template>
  <div class="min-h-screen bg-gradient-to-b from-brand-50 to-white">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- 页面标题和返回按钮 -->
      <div class="flex items-center justify-between mb-8">
        <div class="text-center flex-1">
          <h1 class="text-3xl font-bold text-slate-900 mb-2">图片转BASE64工具</h1>
          <p class="text-slate-600">上传图片并生成对应的BASE64编码，支持一键复制</p>
        </div>
        <RouterLink to="/" class="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600">
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
      </div>

      <!-- 上传区域 -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div 
          class="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-brand-300 transition-colors"
          @dragover.prevent="dragover = true"
          @dragleave="dragover = false"
          @drop="handleDrop"
          @click="$refs.fileInput.click()"
          :class="{ 'border-brand-400 bg-brand-50': dragover }"
        >
          <input 
            ref="fileInput"
            type="file" 
            accept="image/*" 
            class="hidden" 
            @change="handleFileSelect"
          />
          <div class="w-16 h-16 mx-auto mb-4 bg-brand-100 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 mb-2">点击或拖拽图片到此处</h3>
          <p class="text-slate-500 text-sm">支持 JPG、PNG、GIF、WEBP 等格式</p>
        </div>

        <!-- 图片预览 -->
        <div v-if="imagePreview" class="mt-6">
          <h4 class="text-sm font-medium text-slate-700 mb-3">图片预览</h4>
          <div class="flex flex-col md:flex-row gap-6">
            <div class="flex-1">
              <img :src="imagePreview" class="max-w-full max-h-64 rounded-lg border border-slate-200" alt="图片预览" />
            </div>
            <div class="flex-1">
              <div class="text-sm text-slate-600 space-y-2">
                <div><span class="font-medium">文件名：</span>{{ fileName }}</div>
                <div><span class="font-medium">文件大小：</span>{{ fileSize }}</div>
                <div><span class="font-medium">尺寸：</span>{{ imageWidth }} × {{ imageHeight }} 像素</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- BASE64结果 -->
      <div v-if="base64Result" class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-slate-900">BASE64编码</h3>
          <button 
            @click="copyToClipboard"
            class="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            :class="{ 'bg-green-500': copySuccess }"
          >
            <svg v-if="!copySuccess" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            {{ copySuccess ? '已复制' : '复制' }}
          </button>
        </div>
        
        <div class="relative">
          <textarea 
            ref="base64Textarea"
            v-model="base64Result" 
            readonly 
            class="w-full h-40 p-3 border border-slate-300 rounded-lg bg-slate-50 text-sm font-mono resize-none"
            @click="selectAllText"
          ></textarea>
          <div class="absolute top-2 right-2 text-xs text-slate-500 bg-white px-2 py-1 rounded">
            {{ base64Result.length }} 字符
          </div>
        </div>
        
        <div class="mt-3 text-xs text-slate-500">
          提示：点击文本框可全选内容，或直接点击复制按钮
        </div>
      </div>

      <!-- 使用说明 -->
      <div v-else class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-semibold text-slate-900 mb-4">使用说明</h3>
        <div class="space-y-3 text-slate-600">
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
            <p>点击上传区域或拖拽图片文件到指定区域</p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
            <p>系统将自动生成图片的BASE64编码</p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
            <p>点击复制按钮将BASE64编码复制到剪贴板</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Home } from 'lucide-vue-next'

const fileInput = ref<HTMLInputElement>()
const base64Textarea = ref<HTMLTextAreaElement>()
const dragover = ref(false)
const imagePreview = ref('')
const base64Result = ref('')
const fileName = ref('')
const fileSize = ref('')
const imageWidth = ref(0)
const imageHeight = ref(0)
const copySuccess = ref(false)

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    processFile(target.files[0])
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  dragover.value = false
  
  if (event.dataTransfer && event.dataTransfer.files[0]) {
    processFile(event.dataTransfer.files[0])
  }
}

const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件')
    return
  }

  fileName.value = file.name
  fileSize.value = formatFileSize(file.size)

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    imagePreview.value = result
    base64Result.value = result
    
    // 获取图片尺寸
    const img = new Image()
    img.onload = () => {
      imageWidth.value = img.width
      imageHeight.value = img.height
    }
    img.src = result
  }
  reader.readAsDataURL(file)
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(base64Result.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    // 降级方案
    base64Textarea.value?.select()
    document.execCommand('copy')
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

const selectAllText = () => {
  base64Textarea.value?.select()
}

onMounted(() => {
  // 初始化
})
</script>