<template>
  <div class="h-screen bg-gradient-to-b from-brand-50 to-white flex overflow-hidden">
    <!-- 确认弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="confirmModal.show" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="cancelConfirm">
          <div class="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60 backdrop-blur-sm"></div>
          <Transition name="modal-scale">
            <div v-if="confirmModal.show" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform">
              <div class="h-1.5 bg-gradient-to-r" :class="confirmModal.type === 'danger' ? 'from-red-400 via-red-500 to-orange-500' : 'from-brand-400 via-brand-500 to-purple-500'"></div>
              <div class="p-8">
                <div class="flex justify-center mb-6">
                  <div class="w-20 h-20 rounded-full flex items-center justify-center" :class="confirmModal.type === 'danger' ? 'bg-gradient-to-br from-red-100 to-orange-100' : 'bg-gradient-to-br from-brand-100 to-purple-100'">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center" :class="confirmModal.type === 'danger' ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-brand-500 to-purple-500'">
                      <AlertTriangle v-if="confirmModal.type === 'danger'" class="w-7 h-7 text-white" />
                      <HelpCircle v-else class="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>
                <h3 class="text-xl font-bold text-center text-slate-800 mb-3">{{ confirmModal.title }}</h3>
                <p class="text-center text-slate-500 leading-relaxed mb-8">{{ confirmModal.message }}</p>
                <div class="flex gap-3">
                  <button @click="cancelConfirm" class="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 hover:shadow-md">取消</button>
                  <button @click="doConfirm" class="flex-1 py-3 px-4 font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" :class="confirmModal.type === 'danger' ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white' : 'bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600 text-white'">{{ confirmModal.confirmText || '确定' }}</button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- 手机端侧边栏遮罩 -->
    <Transition name="fade">
      <div v-if="isMobile && historyPanelOpen" class="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden" @click="historyPanelOpen = false"></div>
    </Transition>

    <!-- 左侧历史记录面板 -->
    <div :class="['bg-white border-r border-slate-200 transition-all duration-300 flex flex-col flex-shrink-0 h-full z-40', 'fixed md:relative', 'w-[280px] sm:w-72', historyPanelOpen ? 'left-0' : '-left-[280px] sm:-left-72 md:w-0']">
      <div v-if="historyPanelOpen" class="flex flex-col h-full overflow-hidden">
        <div class="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 class="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base"><History class="w-4 h-4 sm:w-5 sm:h-5" />历史记录</h2>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">{{ chatHistory.length }}/100</span>
            <button @click="historyPanelOpen = false" class="md:hidden w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg"><X class="w-4 h-4 text-slate-500" /></button>
          </div>
        </div>
        <div class="p-3 border-b border-slate-100 flex-shrink-0">
          <button @click="startNewSession" :disabled="isLoading" :class="['w-full py-2.5 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg shadow-sm flex items-center justify-center gap-2 font-medium transition-opacity', isLoading ? 'opacity-50 cursor-not-allowed' : '']"><Plus class="w-4 h-4" />新建会话</button>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
          <div v-if="chatHistory.length === 0" class="text-center text-slate-400 py-8 text-sm">暂无历史记录</div>
          <div v-for="session in chatHistory" :key="session.id" @click="loadSession(session)" :class="['p-3 rounded-lg cursor-pointer group', currentSessionId === session.id ? 'bg-brand-100 border border-brand-300' : 'bg-slate-50 hover:bg-slate-100 border border-transparent']">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-700 truncate">{{ session.title }}</p>
                <p class="text-xs text-slate-400 mt-1">{{ formatDate(session.timestamp) }}</p>
              </div>
              <button @click.stop="deleteSession(session.id)" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1"><Trash2 class="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        <div class="p-3 border-t border-slate-200 flex-shrink-0">
          <button @click="clearAllHistory" class="w-full py-2 px-4 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-2 text-sm"><Trash2 class="w-4 h-4" />清空全部</button>
        </div>
      </div>
    </div>
    <button @click="historyPanelOpen = !historyPanelOpen" class="hidden md:flex fixed top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 rounded-r-lg p-2 shadow-sm hover:bg-slate-50" :style="{ left: historyPanelOpen ? '288px' : '0' }">
      <ChevronLeft v-if="historyPanelOpen" class="w-4 h-4 text-slate-600" /><ChevronRight v-else class="w-4 h-4 text-slate-600" />
    </button>
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <div class="flex-1 flex flex-col px-2 sm:px-4 py-2 sm:py-4 overflow-hidden">
        <div class="flex items-center justify-between mb-2 sm:mb-4 flex-shrink-0 gap-2">
          <button @click="historyPanelOpen = true" class="md:hidden w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 flex-shrink-0"><Menu class="w-5 h-5 text-slate-600" /></button>
          <div class="text-center flex-1 min-w-0">
            <h1 class="text-lg sm:text-2xl font-bold text-slate-900 truncate">多模态问答</h1>
            <p class="text-xs sm:text-sm text-slate-600 hidden sm:block">GLM-4.1V-Thinking-Flash 智能视觉问答</p>
          </div>
          <RouterLink to="/" class="flex items-center gap-2 px-2 sm:px-3 py-2 bg-white/80 rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 flex-shrink-0"><Home class="w-5 h-5" /></RouterLink>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50">
            <div v-if="messages.length === 0" class="min-h-full flex flex-col items-center pt-8 sm:pt-12 md:justify-center md:pt-0 text-slate-500">
              <div class="w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <ImageIcon class="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <p class="text-base sm:text-lg font-medium mb-2">多模态问答</p>
              <p class="text-xs sm:text-sm text-slate-400 mb-6 sm:mb-8 text-center px-4">上传图片并提问，GLM-4.1V-Thinking-Flash 将为您智能分析</p>
              <div class="flex flex-col items-center gap-3">
                <div class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg">
                  <div class="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  <span class="text-sm text-slate-600">GLM-4.1V-Thinking-Flash</span>
                </div>
              </div>
            </div>
            <div v-for="(msg, idx) in messages" :key="idx" class="space-y-3">
              <div v-if="msg.role === 'user'" class="flex justify-end">
                <div class="max-w-[85%] sm:max-w-3xl">
                  <div v-if="msg.image" class="mb-2 rounded-lg overflow-hidden border border-slate-200">
                    <img :src="msg.image" class="max-w-full max-h-64 object-contain" alt="上传的图片" />
                  </div>
                  <div v-if="msg.content" class="px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-brand-500 text-white">
                    <div class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="space-y-4">
                <!-- 思考链区域 -->
                <div v-if="msg.reasoning_content" class="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 relative">
                  <div class="flex items-center gap-2 mb-3">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                      <Brain class="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 class="font-bold text-amber-800 text-sm">思考过程</h3>
                    <button @click="toggleReasoning(idx)" class="ml-auto text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
                      <ChevronDown v-if="!msg.reasoningCollapsed" class="w-4 h-4" />
                      <ChevronRight v-else class="w-4 h-4" />
                      {{ msg.reasoningCollapsed ? '收起' : '展开' }}
                    </button>
                  </div>
                  <Transition name="reasoning-slide">
                    <div v-show="!msg.reasoningCollapsed" class="markdown-content prose prose-sm max-w-none text-amber-900 break-words" v-html="renderMd(getStr(msg.reasoning_content))"></div>
                  </Transition>
                </div>
                <!-- 回答区域 -->
                <div class="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4 relative group">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <Sparkles class="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 class="font-bold text-blue-800">GLM-4.1V-Thinking-Flash</h3>
                    </div>
                    <div v-if="msg.loading" class="ml-auto flex items-center gap-2">
                      <Loader2 class="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                    <span v-else-if="msg.content" class="ml-auto text-xs text-blue-400">{{ msg.content.length }}字</span>
                  </div>
                  <div v-if="msg.loading && !msg.content && !msg.reasoning_content" class="flex items-center gap-2 text-blue-500 py-4">
                    <span class="text-sm">正在思考分析...</span>
                  </div>
                  <div v-else class="markdown-content prose prose-sm max-w-none text-slate-700 break-words" v-html="renderMd(getStr(msg.content))"></div>
                  <div v-if="msg.loading" class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-xl">
                    <button @click.stop="confirmStopModel(idx)" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center gap-2 shadow-sm transition-colors">
                      <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span class="font-medium text-sm">停止生成</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t border-slate-200 p-2 sm:p-4 bg-white flex-shrink-0">
            <div v-if="isLoading" class="mb-3">
              <button @click="confirmStop" class="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span class="font-medium text-sm">正在生成中... 点击停止</span>
              </button>
            </div>
            <div v-if="selectedImage" class="mb-3 flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <img :src="selectedImage" class="w-16 h-16 object-cover rounded-lg border border-slate-200" alt="预览" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-700 truncate">{{ selectedImageName }}</p>
                <p class="text-xs text-slate-400">已选择图片</p>
              </div>
              <button @click="removeImage" class="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                <X class="w-4 h-4" />
              </button>
            </div>
            
            <!-- 语音识别状态提示 -->
            <div v-if="isPressRecording || isTranscribing" class="mb-3 flex items-center justify-center gap-2">
              <div v-if="isPressRecording" class="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full text-sm text-red-600 font-medium">
                <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span>正在录制中...（松开停止）</span>
              </div>
              <div v-else-if="isTranscribing" class="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-sm text-blue-600 font-medium">
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>正在识别语音...</span>
              </div>
            </div>
            
            <!-- 语音识别错误提示 -->
            <div v-if="transcriptionError" class="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {{ transcriptionError }}
            </div>

            <div class="flex gap-3">
              <button @click="triggerFileInput" :disabled="isLoading" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0" :class="isLoading ? 'opacity-50 cursor-not-allowed' : ''">
                <ImageIcon class="w-5 h-5" />
                <span class="hidden sm:inline">上传图片</span>
              </button>
              <input ref="fileInput" type="file" accept="image/*" @change="handleFileChange" class="hidden" />
              
              <!-- 按住说话按钮 -->
              <button
                @mousedown="startPressRecording"
                @mouseup="stopPressRecording"
                @mouseleave="stopPressRecording"
                @touchstart.prevent="startPressRecording"
                @touchend.prevent="stopPressRecording"
                :disabled="isLoading"
                :class="[
                  'px-3 py-2 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 select-none touch-manipulation',
                  isPressRecording
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                ]"
                title="按住说话"
              >
                <component :is="isPressRecording ? MicOff : Mic" class="w-5 h-5" />
                <span class="hidden sm:inline">{{ isPressRecording ? '松开' : '按住说话' }}</span>
              </button>
              
              <textarea
                ref="textareaRef"
                v-model="inputMessage"
                @keydown="handleKeydown"
                @input="autoResizeTextarea"
                placeholder="输入你的问题..."
                :rows="isMobile ? 1 : 2"
                class="flex-1 px-3 sm:px-4 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm sm:text-base min-h-[40px] max-h-[150px]"
                :disabled="isLoading"
                :style="{ height: isMobile ? textareaHeight + 'px' : 'auto' }"
              ></textarea>
              <button @click="sendMessage" :disabled="(!inputMessage.trim() && !selectedImage) || isLoading" class="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap min-w-[100px] justify-center">
                <Send class="w-4 h-4 flex-shrink-0" />
                <span class="flex-shrink-0">{{ isLoading ? '处理中' : '发送' }}</span>
              </button>
            </div>
            <div class="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
              <div class="flex flex-wrap items-center gap-2 sm:gap-4">
                <span class="hidden sm:inline">Enter 发送，Shift+Enter 换行</span>
                <div class="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded transition-colors select-none" :class="isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200'" :title="isLoading ? '生成中无法修改温度设置' : '调整模型随机性 (温度)'">
                  <Thermometer class="w-3 h-3 text-slate-400" />
                  <span>温度</span>
                  <input type="range" v-model.number="temperature" min="0" max="1" step="0.1" :disabled="isLoading" class="w-12 sm:w-16 h-1 bg-slate-300 rounded-lg appearance-none accent-brand-500" :class="isLoading ? 'cursor-not-allowed' : 'cursor-pointer'">
                  <span class="w-6 text-center font-medium text-brand-600">{{ temperature }}</span>
                </div>
              </div>
              <button v-if="messages.length > 0" @click="clearMessages" class="text-red-500 hover:text-red-600">清空对话</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, reactive, onMounted, onUnmounted, watch, computed, Teleport, Transition } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, ChevronRight, ChevronLeft, Loader2, Send, Sparkles, History, Trash2, Plus, X, Thermometer, AlertTriangle, HelpCircle, Menu, ImageIcon, Brain, ChevronDown, Mic, MicOff, Volume2 } from 'lucide-vue-next'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-light.css'

const overrideHljsStyles = () => {
  const style = document.createElement('style')
  style.textContent = `.hljs { background: #f8faff !important; color: #334155 !important; } .hljs-keyword, .hljs-selector-tag { color: #a626a4 !important; font-weight: bold; } .hljs-title, .hljs-section, .hljs-selector-id { color: #4078f2 !important; font-weight: bold; } .hljs-title.function_ { color: #4078f2 !important; } .hljs-title.class_ { color: #c18401 !important; } .hljs-string, .hljs-doctag { color: #50a14f !important; } .hljs-type, .hljs-number, .hljs-selector-class, .hljs-quote, .hljs-template-tag, .hljs-deletion { color: #986801 !important; } .hljs-comment, .hljs-meta { color: #a0a1a7 !important; font-style: italic; } .hljs-variable, .hljs-template-variable, .hljs-attr, .hljs-attribute { color: #e45649 !important; } .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-selector-attr, .hljs-selector-pseudo { color: #0184bc !important; } .hljs-built_in, .hljs-builtin-name { color: #c18401 !important; } .hljs-literal { color: #0184bc !important; }`
  document.head.appendChild(style)
}
if (typeof window !== 'undefined') overrideHljsStyles()

const renderer = new marked.Renderer()
renderer.code = function(code: string, lang?: string) {
  const l = lang || ''
  let h: string
  if (l && hljs.getLanguage(l)) { try { h = hljs.highlight(code, { language: l }).value } catch { h = hljs.highlightAuto(code).value } }
  else { h = hljs.highlightAuto(code).value }
  const codeId = 'code-' + Math.random().toString(36).substr(2, 9)
  return `<div class="code-block-wrapper my-4 rounded-lg overflow-hidden border border-blue-100 shadow-sm"><div class="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100"><span class="text-xs font-bold text-blue-700">${l || 'text'}</span><button onclick="window.copyCode('${codeId}', this)" class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors" title="复制"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg></button></div><pre class="hljs-code-block m-0 p-4 bg-[#f8faff] overflow-x-auto"><code id="${codeId}" class="hljs language-${l}">${h}</code></pre></div>`
}
marked.setOptions({ renderer, breaks: true, gfm: true })

if (typeof window !== 'undefined') {
  (window as any).copyCode = (id: string, btn: HTMLElement) => {
    const el = document.getElementById(id)
    if (el) {
      navigator.clipboard.writeText(el.textContent || '').then(() => {
        const originalHtml = btn.innerHTML
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>`
        setTimeout(() => { btn.innerHTML = originalHtml }, 2000)
      })
    }
  }
}

const renderMd = (t: string): string => {
  if (!t) return ''
  let processed = t.replace(/<think>([\s\S]*?)<\/think>/gi, (match, content) => {
    return `\n\n<div class="thinking-block">💭 **思考中...**\n\n${content}\n\n</div>\n\n`
  })
  try {
    return marked.parse(processed) as string
  } catch {
    return processed.replace(/</g, '<').replace(/>/g, '>').replace(/\n/g, '<br>')
  }
}
const getStr = (c: any): string => typeof c === 'string' ? c : c == null ? '' : String(c)

const KEY = 'zenreader_multimodalqa_history'
const historyPanelOpen = ref(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
const chatHistory = ref<Session[]>([])
const currentSessionId = ref('')
const inputMessage = ref('')
const messages = ref<Msg[]>([])
const isLoading = ref(false)
const chatContainer = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const textareaHeight = ref(40)
const confirmModal = ref<{ show: boolean; title: string; message: string; type: 'danger' | 'info'; confirmText?: string; onConfirm?: () => void }>({ show: false, title: '', message: '', type: 'info' })
const abortController = ref<AbortController | null>(null)
const temperature = ref(0.7)
const selectedImage = ref<string>('')
const selectedImageName = ref<string>('')
const fileInput = ref<HTMLInputElement>()
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isMobile = computed(() => windowWidth.value < 768)

// 语音录制相关
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let silenceTimer: number | null = null
let dataArray: Uint8Array<ArrayBufferLike> | null = null

const isPressRecording = ref(false)
const isTranscribing = ref(false)
const transcriptionError = ref<string | null>(null)

// 静音检测配置
const SILENCE_THRESHOLD = 30
const SILENCE_DURATION = 1500

// SiliconFlow API 配置
const SPEECH_API_KEY = 'sk-yyqmrkevamdfuilmfdlfmjzuatoytqlywfalkjkfrzkffvdr'
const SPEECH_API_URL = 'https://api.siliconflow.cn/v1/audio/transcriptions'
const SPEECH_API_MODEL = 'FunAudioLLM/SenseVoiceSmall'

type Msg = { role: 'user' | 'assistant'; content?: string; reasoning_content?: string; image?: string; loading?: boolean; timestamp?: Date; reasoningCollapsed?: boolean }
type Session = { id: string; title: string; messages: Msg[]; timestamp: Date }

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = '5d1a704cb81a40e799c559acd190b0b3.47IAGmXdmx8Wu4Ov'

const handleResize = () => { windowWidth.value = window.innerWidth }

const showConfirm = (options: { title: string; message: string; type?: 'danger' | 'info'; confirmText?: string; onConfirm: () => void }) => {
  confirmModal.value = { show: true, title: options.title, message: options.message, type: options.type || 'info', confirmText: options.confirmText, onConfirm: options.onConfirm }
}

const cancelConfirm = () => { confirmModal.value.show = false }

const doConfirm = () => {
  if (confirmModal.value.onConfirm) confirmModal.value.onConfirm()
  confirmModal.value.show = false
}

const confirmStopModel = (idx: number) => {
  showConfirm({ title: '停止生成', message: '确定要停止生成吗？当前进度将被保留。', type: 'danger', confirmText: '停止', onConfirm: () => stopGeneration() })
}

const confirmStop = () => {
  showConfirm({ title: '停止生成', message: '确定要停止生成吗？这将中断正在进行的请求，当前已生成的内容将被保留。', type: 'danger', confirmText: '停止全部', onConfirm: stopGeneration })
}

const stopGeneration = () => {
  if (abortController.value) abortController.value.abort()
  abortController.value = null
  isLoading.value = false
  if (messages.value.length > 0) {
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg.role === 'assistant') lastMsg.loading = false
  }
  saveSession()
}

const genId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)
const loadHistory = () => { try { const s = localStorage.getItem(KEY); if (s) chatHistory.value = JSON.parse(s).map((x: any) => ({ ...x, timestamp: new Date(x.timestamp), messages: x.messages.map((m: any) => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : undefined })) })) } catch {} }
const saveHistory = () => { try { if (chatHistory.value.length > 100) chatHistory.value = chatHistory.value.slice(0, 100); localStorage.setItem(KEY, JSON.stringify(chatHistory.value)) } catch {} }

const saveSession = () => {
  if (messages.value.length === 0) return
  const t = messages.value.find(m => m.role === 'user')?.content?.slice(0, 50) || '新对话'
  if (currentSessionId.value) {
    const i = chatHistory.value.findIndex(s => s.id === currentSessionId.value)
    if (i !== -1) { chatHistory.value[i].messages = JSON.parse(JSON.stringify(messages.value)); chatHistory.value[i].title = t }
  } else {
    if (chatHistory.value.length >= 100) chatHistory.value.pop()
    const n: Session = { id: genId(), title: t, messages: JSON.parse(JSON.stringify(messages.value)), timestamp: new Date() }
    chatHistory.value.unshift(n)
    currentSessionId.value = n.id
  }
  saveHistory()
}

const loadSession = (s: Session) => {
  if (isLoading.value) return
  if (messages.value.length > 0 && currentSessionId.value !== s.id) saveSession()
  currentSessionId.value = s.id
  messages.value = JSON.parse(JSON.stringify(s.messages)).map((m: any) => ({ ...m, timestamp: m.timestamp ? new Date(m.timestamp) : undefined }))
  nextTick(() => scrollToBottom())
  if (isMobile.value) historyPanelOpen.value = false
}

const deleteSession = (id: string) => {
  chatHistory.value = chatHistory.value.filter(s => s.id !== id)
  if (currentSessionId.value === id) { currentSessionId.value = ''; messages.value = [] }
  saveHistory()
}

const clearAllHistory = () => {
  showConfirm({ title: '清空历史记录', message: '确定要清空所有历史记录吗？此操作不可恢复。', type: 'danger', confirmText: '清空全部', onConfirm: () => { chatHistory.value = []; currentSessionId.value = ''; messages.value = []; saveHistory() } })
}

const startNewSession = () => {
  if (isLoading.value) return
  if (messages.value.length > 0) saveSession()
  currentSessionId.value = ''
  messages.value = []
  inputMessage.value = ''
  selectedImage.value = ''
  selectedImageName.value = ''
  if (isMobile.value) historyPanelOpen.value = false
}

watch(messages, () => { if (messages.value.length > 0 && !isLoading.value) saveSession() }, { deep: true })
// 开始按住录制
const startPressRecording = async () => {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(audioStream)
    audioChunks = []

    // 设置音频分析器用于静音检测
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(audioStream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    dataArray = new Uint8Array(analyser.frequencyBinCount)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      
      // 自动调用 API 进行语音识别
      transcribeAudio(audioBlob)
    }

    mediaRecorder.start()
    isPressRecording.value = true
    transcriptionError.value = null
    
    // 开始静音检测
    detectSilence()
  } catch (err) {
    console.error('录制失败:', err)
    transcriptionError.value = '无法访问麦克风，请检查权限设置'
  }
}

// 停止按住录制
const stopPressRecording = () => {
  if (mediaRecorder && isPressRecording.value) {
    mediaRecorder.stop()
    isPressRecording.value = false
    
    // 停止音频流
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
    }
    
    // 清理静音检测
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
  }
}

// 静音检测
const detectSilence = () => {
  if (!analyser || !dataArray || !isPressRecording.value) return
  
  analyser.getByteFrequencyData(dataArray)
  
  // 计算平均音量
  let sum = 0
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i]
  }
  const average = sum / dataArray.length
  
  // 如果音量低于阈值，开始计时
  if (average < SILENCE_THRESHOLD) {
    if (!silenceTimer) {
      silenceTimer = window.setTimeout(() => {
        stopPressRecording()
      }, SILENCE_DURATION)
    }
  } else {
    // 有声音，清除静音计时器
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
  }
  
  // 继续检测
  if (isPressRecording.value) {
    requestAnimationFrame(detectSilence)
  }
}

// 调用 SiliconFlow API 进行语音识别
const transcribeAudio = async (audioBlob: Blob) => {
  if (!audioBlob) return
  
  isTranscribing.value = true
  transcriptionError.value = null
  
  try {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', SPEECH_API_MODEL)
    
    const response = await fetch(SPEECH_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SPEECH_API_KEY}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }
    
    const result = await response.json()
    const transcribedText = result.text || ''
    
    // 将识别结果添加到输入框
    if (transcribedText) {
      inputMessage.value = inputMessage.value + (inputMessage.value ? ' ' : '') + transcribedText
    }
  } catch (err) {
    console.error('语音识别失败:', err)
    transcriptionError.value = '语音识别失败，请重试'
  } finally {
    isTranscribing.value = false
  }
}

onMounted(() => { loadHistory(); window.addEventListener('resize', handleResize) })
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  
  // 清理音频录制
  if (mediaRecorder && isPressRecording.value) {
    mediaRecorder.stop()
  }
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop())
  }
  if (silenceTimer) {
    clearTimeout(silenceTimer)
  }
  if (audioContext) {
    audioContext.close()
  }
})

const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const formatDate = (d: Date) => { const days = Math.floor((Date.now() - d.getTime()) / 86400000); if (days === 0) return '今天 ' + formatTime(d); if (days === 1) return '昨天'; if (days < 7) return `${days}天前`; return d.toLocaleDateString('zh-CN') }
const scrollToBottom = async () => { await nextTick(); if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight }
const clearMessages = () => {
  showConfirm({ title: '清空对话', message: '确定要清空当前对话吗？所有消息将被删除。', type: 'danger', confirmText: '清空', onConfirm: () => { messages.value = []; currentSessionId.value = '' } })
}
const handleKeydown = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

const autoResizeTextarea = () => {
  if (!isMobile.value || !textareaRef.value) return
  
  const textarea = textareaRef.value
  textarea.style.height = 'auto'
  const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 150)
  textareaHeight.value = newHeight
  textarea.style.height = newHeight + 'px'
}

const toggleReasoning = (idx: number) => {
  const msg = messages.value[idx]
  if (msg) {
    msg.reasoningCollapsed = !msg.reasoningCollapsed
  }
}

const triggerFileInput = () => { fileInput.value?.click() }

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      selectedImage.value = event.target?.result as string
      selectedImageName.value = file.name
    }
    reader.readAsDataURL(file)
  }
  target.value = ''
}

const removeImage = () => {
  selectedImage.value = ''
  selectedImageName.value = ''
}

const sendMessage = async () => {
  if ((!inputMessage.value.trim() && !selectedImage.value) || isLoading.value) return
  const q = inputMessage.value.trim()
  const img = selectedImage.value
  inputMessage.value = ''
  selectedImage.value = ''
  selectedImageName.value = ''
  isLoading.value = true
  
  messages.value.push({ role: 'user', content: q || undefined, image: img || undefined, timestamp: new Date() })
  const msg: Msg = { role: 'assistant', content: '', loading: true, timestamp: new Date() }
  messages.value.push(msg)
  const idx = messages.value.length - 1
  await scrollToBottom()
  
  try {
    const controller = new AbortController()
    abortController.value = controller
    
    const messagesContent: any[] = []
    if (img) {
      messagesContent.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: img } },
          { type: 'text', text: q || '请描述这张图片' }
        ]
      })
    } else {
      messagesContent.push({ role: 'user', content: q })
    }

    const body = {
      model: 'GLM-4.1V-Thinking-Flash',
      stream: true,
      messages: messagesContent,
      thinking: { type: 'enabled' }
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No reader')
    const dec = new TextDecoder()
    let buf = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      
      if (buf.includes('\n')) {
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        
        for (const l of lines) {
          const line = l.trim()
          if (!line) continue
          if (line.startsWith('event: ')) continue
          if (line.startsWith('data:')) {
            const d = line.startsWith('data: ') ? line.slice(6).trim() : line.slice(5).trim()
            if (d === '[DONE]') continue
            try {
              const p = JSON.parse(d)
              if (p.choices && p.choices.length > 0 && p.choices[0].delta) {
                const delta = p.choices[0].delta
                // 处理思考链内容
                if (delta.reasoning_content) {
                  messages.value[idx].reasoning_content = (messages.value[idx].reasoning_content || '') + delta.reasoning_content
                  scrollToBottom()
                }
                // 处理普通内容
                if (delta.content) {
                  messages.value[idx].content = (messages.value[idx].content || '') + delta.content
                  scrollToBottom()
                }
              }
            } catch (err) {
              console.error('解析SSE流失败:', err, 'data:', d)
            }
          }
        }
      }
    }
  } catch (e: any) {
    if (e.name !== 'AbortError') {
      messages.value[idx].content = `生成失败: ${e.message}`
    }
  } finally {
    messages.value[idx].loading = false
    isLoading.value = false
    abortController.value = null
    saveSession()
  }
}
</script>

<style>
.markdown-content { line-height: 1.7; font-size: 0.9rem; color: #374151; }
.markdown-content p { margin-bottom: 0.625rem; }
.markdown-content p:last-child { margin-bottom: 0; }
.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4 { font-weight: 600; margin-top: 0.875rem; margin-bottom: 0.5rem; color: #1f2937; }
.markdown-content h1 { font-size: 1.375rem; }
.markdown-content h2 { font-size: 1.125rem; }
.markdown-content h3 { font-size: 1rem; }
.markdown-content h4 { font-size: 0.9rem; }
.markdown-content ul, .markdown-content ol { margin-left: 1.25rem; margin-bottom: 0.625rem; }
.markdown-content ul { list-style-type: disc; }
.markdown-content ol { list-style-type: decimal; }
.markdown-content li { margin-bottom: 0.25rem; }
.markdown-content code { background-color: #f1f5f9; color: #475569; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.85em; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
.markdown-content pre { margin: 0.625rem 0; border-radius: 0.5rem; overflow-x: auto; }
.markdown-content pre code { background-color: transparent; padding: 0; color: inherit; }
.hljs-code-block { background-color: #f8fafc; padding: 1rem; overflow-x: auto; margin: 0; }
.hljs-code-block code { color: #334155; font-size: 0.85rem; line-height: 1.6; font-family: 'Fira Code', 'JetBrains Mono', Consolas, monospace; }
.markdown-content blockquote { border-left: 3px solid #d1d5db; padding-left: 0.875rem; margin: 0.625rem 0; color: #6b7280; font-style: italic; background-color: #f9fafb; padding: 0.5rem 0.875rem; border-radius: 0 0.25rem 0.25rem 0; }
.markdown-content table { width: 100%; border-collapse: collapse; margin: 0.625rem 0; font-size: 0.85rem; }
.markdown-content th, .markdown-content td { border: 1px solid #e5e7eb; padding: 0.5rem; text-align: left; }
.markdown-content th { background-color: #f9fafb; font-weight: 600; color: #374151; }
.markdown-content a { color: #7c3aed; text-decoration: underline; }
.markdown-content a:hover { color: #6d28d9; }
.markdown-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.875rem 0; }
.markdown-content strong { font-weight: 600; color: #1f2937; }
.markdown-content em { font-style: italic; }

.thinking-block {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-left: 4px solid #f59e0b;
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  font-size: 0.875rem;
  color: #78350f;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);
  position: relative;
  overflow: hidden;
}

.thinking-block::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #f59e0b, transparent);
  animation: thinking-shimmer 2s infinite;
}

@keyframes thinking-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.thinking-block p:first-of-type {
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
}

.thinking-block p:last-child {
  margin-bottom: 0;
}

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-scale-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-scale-leave-active { transition: all 0.2s ease-in; }
.modal-scale-enter-from { opacity: 0; transform: scale(0.9) translateY(10px); }
.modal-scale-leave-to { opacity: 0; transform: scale(0.95) translateY(-5px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.reasoning-slide-enter-active, .reasoning-slide-leave-active { transition: all 0.3s ease; max-height: 1000px; overflow: hidden; }
.reasoning-slide-enter-from, .reasoning-slide-leave-to { max-height: 0; opacity: 0; }
</style>