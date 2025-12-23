<template>
  <div class="h-screen bg-gradient-to-b from-brand-50 to-white flex overflow-hidden">
    <!-- 预览弹窗 -->
    <div v-if="previewModal.show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" @click.self="closePreview">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-gradient-to-r from-brand-500 to-brand-600"></div>
            <h3 class="font-bold text-lg text-slate-800">{{ previewModal.title }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <button @click="copyContent" class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors" :class="copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'">
              <Check v-if="copied" class="w-4 h-4" />
              <Copy v-else class="w-4 h-4" />
              <span>{{ copied ? '已复制' : '复制' }}</span>
            </button>
            <button @click="closePreview" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X class="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div class="markdown-content prose prose-sm max-w-none text-slate-700" v-html="renderMd(previewModal.content)"></div>
        </div>
        <div class="px-6 py-3 border-t border-slate-200 bg-white text-right">
          <span class="text-xs text-slate-400">{{ previewModal.content.length }} 字</span>
        </div>
      </div>
    </div>
    <!-- 左侧历史记录面板 -->
    <div :class="['bg-white border-r border-slate-200 transition-all duration-300 flex flex-col flex-shrink-0 h-full', historyPanelOpen ? 'w-72' : 'w-0']">
      <div v-if="historyPanelOpen" class="flex flex-col h-full overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 class="font-bold text-slate-800 flex items-center gap-2"><History class="w-5 h-5" />历史记录</h2>
          <span class="text-xs text-slate-400">{{ chatHistory.length }}/100</span>
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
    <button @click="historyPanelOpen = !historyPanelOpen" class="fixed top-1/2 -translate-y-1/2 z-20 bg-white border border-slate-200 rounded-r-lg p-2 shadow-sm hover:bg-slate-50" :style="{ left: historyPanelOpen ? '288px' : '0' }">
      <ChevronLeft v-if="historyPanelOpen" class="w-4 h-4 text-slate-600" /><ChevronRight v-else class="w-4 h-4 text-slate-600" />
    </button>
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <div class="flex-1 flex flex-col px-4 py-4 overflow-hidden">
        <div class="flex items-center justify-between mb-4 flex-shrink-0">
          <div class="text-center flex-1">
            <h1 class="text-2xl font-bold text-slate-900">多模型问答</h1>
            <p class="text-sm text-slate-600">同时调用多个AI模型，DeepSeek 3.2 智能总结</p>
          </div>
          <RouterLink to="/" class="flex items-center gap-2 px-3 py-2 bg-white/80 rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600"><Home class="w-5 h-5" /></RouterLink>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
            <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500">
              <div class="w-20 h-20 mb-6 bg-brand-100 rounded-full flex items-center justify-center"><MessageSquare class="w-10 h-10 text-brand-600" /></div>
              <p class="text-lg font-medium mb-2">开始对话</p>
              <p class="text-sm text-slate-400 mb-8">9个模型并发响应 → DeepSeek 3.1 智能总结</p>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl">
                <div v-for="m in modelConfigs" :key="m.key" class="flex flex-col items-center gap-2 p-3 rounded-lg bg-white border border-slate-200">
                  <div :class="['w-3 h-3 rounded-full', m.dotColor]"></div>
                  <span class="text-xs text-slate-600 text-center leading-tight">{{ m.name }}</span>
                </div>
              </div>
            </div>
            <div v-for="(msg, idx) in messages" :key="idx" class="space-y-3">
              <div v-if="msg.role === 'user'" class="flex justify-end">
                <div class="max-w-3xl px-4 py-3 rounded-lg bg-brand-500 text-white"><div class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</div></div>
              </div>
              <div v-else class="space-y-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <button @click="toggleAllModels(idx)" class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors">
                      <ChevronRight :class="['w-4 h-4 transition-transform', isAllModelsExpanded(idx) ? 'rotate-90' : '']" />
                      <span>{{ isAllModelsExpanded(idx) ? '收起全部模型' : '展开全部模型' }}</span>
                      <span class="text-xs text-slate-400">({{ getCompletedCount(msg) }}/9)</span>
                    </button>
                  </div>
                  <div v-if="isAllModelsExpanded(idx)" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div v-for="m in modelConfigs" :key="m.key" class="bg-white border border-slate-200 rounded-lg overflow-hidden group relative">
                      <div :class="['flex items-center gap-2 px-3 py-2 border-b', m.bgColor, m.borderColor]">
                        <div @click="toggleExpand(idx, m.key)" class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <ChevronRight :class="['w-4 h-4 transition-transform flex-shrink-0', isExpanded(idx, m.key) ? 'rotate-90' : '']" />
                          <div class="flex items-center gap-2 min-w-0"><div :class="['w-2 h-2 rounded-full flex-shrink-0', m.dotColor]"></div><span class="font-medium text-xs truncate" :title="m.name">{{ m.name }}</span></div>
                        </div>
                        <Loader2 v-if="msg[m.loadingKey]" class="w-4 h-4 animate-spin flex-shrink-0" />
                        <template v-else-if="msg[m.contentKey]">
                          <span class="text-xs flex-shrink-0">{{ getLen(msg[m.contentKey]) }}字</span>
                          <button @click.stop="openPreview(m.name, getStr(msg[m.contentKey]))" class="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0" title="预览完整内容">
                            <Maximize2 class="w-3.5 h-3.5 text-slate-500 hover:text-slate-700" />
                          </button>
                        </template>
                      </div>
                      <div v-if="isExpanded(idx, m.key)" class="relative">
                        <div class="px-3 py-3 max-h-64 overflow-y-auto">
                          <div v-if="msg[m.loadingKey] && !msg[m.contentKey]" class="flex items-center gap-2 text-slate-500"><div class="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div><div class="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div><div class="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div></div>
                          <div v-else class="markdown-content text-sm text-slate-700 break-words" v-html="renderMd(getStr(msg[m.contentKey]) || '等待响应...')"></div>
                        </div>
                        
                        <!-- 停止生成遮罩 -->
                        <div v-if="msg[m.loadingKey]" class="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button @click.stop="confirmStopModel(idx, m.key, m.name)" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center gap-2 shadow-sm transition-colors">
                            <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span class="font-medium text-sm">停止生成</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="msg.summaryContent || msg.summaryLoading" class="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center"><Sparkles class="w-4 h-4 text-white" /></div>
                    <div><h3 class="font-bold text-indigo-800">{{ msg.summaryModel || 'deepseek-v3.1-terminus' }} 智能总结</h3></div>
                    <Loader2 v-if="msg.summaryLoading" class="w-5 h-5 animate-spin text-indigo-500 ml-auto" />
                    <span v-else-if="msg.summaryContent" class="ml-auto text-xs text-indigo-400">{{ msg.summaryContent.length }}字</span>
                  </div>
                  <div v-if="msg.summaryLoading && !msg.summaryContent" class="flex items-center gap-2 text-indigo-500 py-4"><span class="text-sm">正在整合分析...</span></div>
                  <div v-else class="markdown-content prose prose-sm max-w-none text-slate-700 break-words" v-html="renderMd(msg.summaryContent || '')"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t border-slate-200 p-4 bg-white flex-shrink-0">
            <div v-if="isLoading" class="mb-3">
              <button @click="confirmStop" class="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center justify-center gap-2 transition-colors">
                <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span class="font-medium text-sm">正在生成中... 点击停止</span>
              </button>
            </div>
            <div class="flex gap-3">
              <textarea v-model="inputMessage" @keydown="handleKeydown" placeholder="输入你的问题..." rows="2" class="flex-1 px-4 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none" :disabled="isLoading"></textarea>
              <button @click="sendMessage" :disabled="!inputMessage.trim() || isLoading" class="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap min-w-[100px] justify-center">
                <Send class="w-4 h-4 flex-shrink-0" />
                <span class="flex-shrink-0">{{ isLoading ? '处理中' : '发送' }}</span>
              </button>
            </div>
            <div class="mt-2 flex items-center justify-between text-xs text-slate-500">
              <div class="flex items-center gap-4">
                <span>Enter 发送，Shift+Enter 换行</span>
                <div class="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors select-none" title="调整模型随机性 (温度)">
                  <Thermometer class="w-3 h-3 text-slate-400" />
                  <span>温度</span>
                  <input type="range" v-model.number="temperature" min="0" max="1" step="0.1" class="w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-brand-500">
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
import { ref, nextTick, reactive, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, MessageSquare, ChevronRight, ChevronLeft, Loader2, Send, Sparkles, History, Trash2, Plus, Maximize2, X, Copy, Check, Thermometer } from 'lucide-vue-next'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-light.css'

// 覆盖 highlight.js 样式以提供更丰富的色彩 (Light Theme)
const overrideHljsStyles = () => {
  const style = document.createElement('style')
  style.textContent = `
    .hljs { background: #f8faff !important; color: #334155 !important; }
    .hljs-keyword, .hljs-selector-tag { color: #a626a4 !important; font-weight: bold; }
    .hljs-title, .hljs-section, .hljs-selector-id { color: #4078f2 !important; font-weight: bold; }
    .hljs-title.function_ { color: #4078f2 !important; }
    .hljs-title.class_ { color: #c18401 !important; }
    .hljs-string, .hljs-doctag { color: #50a14f !important; }
    .hljs-type, .hljs-number, .hljs-selector-class, .hljs-quote, .hljs-template-tag, .hljs-deletion { color: #986801 !important; }
    .hljs-comment, .hljs-meta { color: #a0a1a7 !important; font-style: italic; }
    .hljs-variable, .hljs-template-variable, .hljs-attr, .hljs-attribute { color: #e45649 !important; }
    .hljs-symbol, .hljs-bullet, .hljs-link, .hljs-selector-attr, .hljs-selector-pseudo { color: #0184bc !important; }
    .hljs-built_in, .hljs-builtin-name { color: #c18401 !important; }
    .hljs-literal { color: #0184bc !important; }
  `
  document.head.appendChild(style)
}
if (typeof window !== 'undefined') overrideHljsStyles()

const renderer = new marked.Renderer()
renderer.code = function(code: string, lang?: string) {
  const l = lang || ''
  let h: string
  if (l && hljs.getLanguage(l)) { try { h = hljs.highlight(code, { language: l }).value } catch { h = hljs.highlightAuto(code).value } }
  else { h = hljs.highlightAuto(code).value }
  
  // 生成唯一的ID用于复制功能
  const codeId = 'code-' + Math.random().toString(36).substr(2, 9)
  
  return `
    <div class="code-block-wrapper my-4 rounded-lg overflow-hidden border border-blue-100 shadow-sm">
      <div class="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-100">
        <span class="text-xs font-bold text-blue-700">${l || 'text'}</span>
        <button onclick="window.copyCode('${codeId}', this)" class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors" title="复制">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
      </div>
      <pre class="hljs-code-block m-0 p-4 bg-[#f8faff] overflow-x-auto"><code id="${codeId}" class="hljs language-${l}">${h}</code></pre>
    </div>
  `
}
marked.setOptions({ renderer, breaks: true, gfm: true })

// 添加全局复制函数
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

const renderMd = (t: string): string => { if (!t) return ''; try { return marked.parse(t) as string } catch { return t.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') } }
const getStr = (c: any): string => typeof c === 'string' ? c : c == null ? '' : String(c)
const getLen = (c: any): number => getStr(c).length

const env = (k: string, d = '') => (import.meta as any).env?.[k] || d
type Msg = { role: 'user' | 'assistant'; content?: string; geminiProContent?: string; mimoContent?: string; glmContent?: string; opusContent?: string; grokContent?: string; geminiFlashContent?: string; minimaxContent?: string; sonnetContent?: string; deepseekContent?: string; summaryContent?: string; summaryModel?: string; geminiProLoading?: boolean; mimoLoading?: boolean; glmLoading?: boolean; opusLoading?: boolean; grokLoading?: boolean; geminiFlashLoading?: boolean; minimaxLoading?: boolean; sonnetLoading?: boolean; deepseekLoading?: boolean; summaryLoading?: boolean; timestamp?: Date }
type Session = { id: string; title: string; messages: Msg[]; timestamp: Date }
type Api = { url: string; key: string; model: string; thinking?: boolean; headers?: Record<string, string> }

const modelConfigs = [
  { key: 'geminiPro', name: 'gemini-3-pro-preview', bgColor: 'bg-purple-50', borderColor: 'border-purple-100', dotColor: 'bg-purple-500', contentKey: 'geminiProContent' as keyof Msg, loadingKey: 'geminiProLoading' as keyof Msg },
  { key: 'mimo', name: 'mimo-v2-flash', bgColor: 'bg-orange-50', borderColor: 'border-orange-100', dotColor: 'bg-orange-500', contentKey: 'mimoContent' as keyof Msg, loadingKey: 'mimoLoading' as keyof Msg },
  { key: 'glm', name: 'glm-4.7', bgColor: 'bg-blue-50', borderColor: 'border-blue-100', dotColor: 'bg-blue-500', contentKey: 'glmContent' as keyof Msg, loadingKey: 'glmLoading' as keyof Msg },
  { key: 'opus', name: 'claude-opus-4-5-20251101', bgColor: 'bg-green-50', borderColor: 'border-green-100', dotColor: 'bg-green-500', contentKey: 'opusContent' as keyof Msg, loadingKey: 'opusLoading' as keyof Msg },
  { key: 'grok', name: 'grok-4.1', bgColor: 'bg-red-50', borderColor: 'border-red-100', dotColor: 'bg-red-500', contentKey: 'grokContent' as keyof Msg, loadingKey: 'grokLoading' as keyof Msg },
  { key: 'geminiFlash', name: 'gemini-3-flash-preview', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-100', dotColor: 'bg-cyan-500', contentKey: 'geminiFlashContent' as keyof Msg, loadingKey: 'geminiFlashLoading' as keyof Msg },
  { key: 'minimax', name: 'minimax-m2', bgColor: 'bg-pink-50', borderColor: 'border-pink-100', dotColor: 'bg-pink-500', contentKey: 'minimaxContent' as keyof Msg, loadingKey: 'minimaxLoading' as keyof Msg },
  { key: 'sonnet', name: 'claude-sonnet-4.5', bgColor: 'bg-teal-50', borderColor: 'border-teal-100', dotColor: 'bg-teal-500', contentKey: 'sonnetContent' as keyof Msg, loadingKey: 'sonnetLoading' as keyof Msg },
  { key: 'deepseek', name: 'deepseek-v3.1-terminus', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100', dotColor: 'bg-indigo-500', contentKey: 'deepseekContent' as keyof Msg, loadingKey: 'deepseekLoading' as keyof Msg }
]

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
const apis: Record<string, Api> = isDev ? {
  geminiPro: { url: '/api/gemini/chat/completions', key: env('VITE_GF5_TOKEN'), model: 'gemini-3-pro-preview', thinking: true },
  mimo: { url: '/api/chat/completions', key: env('VITE_MZ3_TOKEN'), model: 'mimo-v2-flash' },
  glm: { url: '/api/claude/chat/completions', key: env('VITE_XQ7_TOKEN'), model: 'glm-4.7' },
  opus: { url: '/api/opus/chat/completions', key: env('VITE_PK9_TOKEN'), model: 'claude-opus-4-5-20251101' },
  opusBackup: {
    url: '/api/opus-backup/chat/completions',
    key: env('VITE_PK9_TOKEN_BACKUP'),
    model: 'claude-opus-4-5-20251101',
    headers: { 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC': '1', 'DISABLE_TELEMETRY': '1' }
  },
  grok: { url: '/api/claude/chat/completions', key: env('VITE_XQ7_TOKEN'), model: 'grok-4.1', thinking: true },
  geminiFlash: { url: '/api/gemini/chat/completions', key: env('VITE_GF5_TOKEN'), model: 'gemini-3-flash-preview', thinking: true },
  minimax: { url: '/api/minimax/chat/completions', key: env('VITE_MM4_TOKEN'), model: 'minimaxai/minimax-m2' },
  deepseek: { url: '/api/deepseek/chat/completions', key: env('VITE_DS2_TOKEN'), model: 'deepseek-ai/deepseek-v3.1-terminus' },
  sonnet: { url: env('VITE_SONNET_ENDPOINT', 'https://aiai.li/v1/chat/completions'), key: env('VITE_SONNET_TOKEN'), model: 'claude-sonnet-4-5-20250929' },
  sonnetBackup: {
    url: '/api/sonnet-backup/chat/completions',
    key: env('VITE_SONNET_TOKEN_BACKUP'),
    model: 'claude-sonnet-4-5-20250929'
  },
  deepseekCard: { url: '/api/deepseek/chat/completions', key: env('VITE_DS2_TOKEN'), model: 'deepseek-ai/deepseek-v3.1-terminus' }
} : {
  geminiPro: { url: env('VITE_GF5_ENDPOINT', 'https://claude.chiddns.com/v1/chat/completions'), key: env('VITE_GF5_TOKEN'), model: 'gemini-3-pro-preview', thinking: true },
  mimo: { url: env('VITE_MZ3_ENDPOINT', 'https://api.xiaomimimo.com/v1/chat/completions'), key: env('VITE_MZ3_TOKEN'), model: 'mimo-v2-flash' },
  glm: { url: env('VITE_XQ7_ENDPOINT', 'https://api.avoapi.com/v1/chat/completions'), key: env('VITE_XQ7_TOKEN'), model: 'glm-4.7' },
  opus: { url: env('VITE_PK9_ENDPOINT', 'https://aiai.li/v1/chat/completions'), key: env('VITE_PK9_TOKEN'), model: 'claude-opus-4-5-20251101' },
  opusBackup: {
    url: env('VITE_PK9_ENDPOINT_BACKUP', 'https://cifang.xyz/v1/chat/completions'),
    key: env('VITE_PK9_TOKEN_BACKUP'),
    model: 'claude-opus-4-5-20251101',
    headers: { 'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC': '1', 'DISABLE_TELEMETRY': '1' }
  },
  grok: { url: env('VITE_XQ7_ENDPOINT', 'https://api.avoapi.com/v1/chat/completions'), key: env('VITE_XQ7_TOKEN'), model: 'grok-4.1', thinking: true },
  geminiFlash: { url: env('VITE_GF5_ENDPOINT', 'https://claude.chiddns.com/v1/chat/completions'), key: env('VITE_GF5_TOKEN'), model: 'gemini-3-flash-preview', thinking: true },
  minimax: { url: env('VITE_MM4_ENDPOINT', 'https://aicodelink.top/v1/chat/completions'), key: env('VITE_MM4_TOKEN'), model: 'minimaxai/minimax-m2' },
  deepseek: { url: env('VITE_DS2_ENDPOINT', 'https://aicodelink.top/v1/chat/completions'), key: env('VITE_DS2_TOKEN'), model: 'deepseek-ai/deepseek-v3.1-terminus' },
  sonnet: { url: env('VITE_SONNET_ENDPOINT', 'https://aiai.li/v1/chat/completions'), key: env('VITE_SONNET_TOKEN'), model: 'claude-sonnet-4-5-20250929' },
  sonnetBackup: {
    url: env('VITE_SONNET_ENDPOINT_BACKUP', 'https://aicodelink.top/v1/chat/completions'),
    key: env('VITE_SONNET_TOKEN_BACKUP'),
    model: 'claude-sonnet-4-5-20250929'
  },
  deepseekCard: { url: env('VITE_DS2_ENDPOINT', 'https://aicodelink.top/v1/chat/completions'), key: env('VITE_DS2_TOKEN'), model: 'deepseek-ai/deepseek-v3.1-terminus' }
}

const KEY = 'zenreader_multimodel_history'
const historyPanelOpen = ref(true)
const chatHistory = ref<Session[]>([])
const currentSessionId = ref('')
const inputMessage = ref('')
const messages = ref<Msg[]>([])
const isLoading = ref(false)
const chatContainer = ref<HTMLElement>()
const expandedStates = reactive<Record<string, boolean>>({})
const allModelsExpanded = reactive<Record<number, boolean>>({})
const previewModal = ref<{ show: boolean; title: string; content: string }>({ show: false, title: '', content: '' })
const copied = ref(false)
const abortControllers = ref<AbortController[]>([])
const modelControllers = reactive<Record<string, AbortController>>({})
const temperature = ref(0.7)

const stopModel = (idx: number, key: string) => {
  const mapKey = `${idx}-${key}`
  const controller = modelControllers[mapKey]
  if (controller) {
    controller.abort()
    delete modelControllers[mapKey]
  }
}

const confirmStopModel = (idx: number, key: string, name: string) => {
  if (confirm(`确定要停止 ${name} 的生成吗？`)) {
    stopModel(idx, key)
  }
}

const openPreview = (title: string, content: string) => {
  previewModal.value = { show: true, title, content }
  copied.value = false
}

const closePreview = () => {
  previewModal.value.show = false
}

const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(previewModal.value.content)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
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
  Object.keys(expandedStates).forEach(k => delete expandedStates[k])
  Object.keys(allModelsExpanded).forEach(k => delete allModelsExpanded[k as any])
  nextTick(() => scrollToBottom())
}

const deleteSession = (id: string) => {
  chatHistory.value = chatHistory.value.filter(s => s.id !== id)
  if (currentSessionId.value === id) { currentSessionId.value = ''; messages.value = [] }
  saveHistory()
}

const clearAllHistory = () => { if (confirm('确定清空所有历史？')) { chatHistory.value = []; currentSessionId.value = ''; messages.value = []; saveHistory() } }

const startNewSession = () => {
  if (isLoading.value) return
  if (messages.value.length > 0) saveSession()
  currentSessionId.value = ''
  messages.value = []
  inputMessage.value = ''
  Object.keys(expandedStates).forEach(k => delete expandedStates[k])
  Object.keys(allModelsExpanded).forEach(k => delete allModelsExpanded[k as any])
}

watch(messages, () => { if (messages.value.length > 0 && !isLoading.value) saveSession() }, { deep: true })
onMounted(() => loadHistory())

const isExpanded = (i: number, m: string) => { const k = `${i}-${m}`; if (expandedStates[k] === undefined) expandedStates[k] = true; return expandedStates[k] }
const toggleExpand = (i: number, m: string) => { const k = `${i}-${m}`; expandedStates[k] = !isExpanded(i, m) }
const isAllModelsExpanded = (idx: number) => { if (allModelsExpanded[idx] === undefined) allModelsExpanded[idx] = true; return allModelsExpanded[idx] }
const toggleAllModels = (idx: number) => { allModelsExpanded[idx] = !isAllModelsExpanded(idx) }
const collapseAllPreviousModels = () => { let c = 0; for (let i = 0; i < messages.value.length; i++) { if (messages.value[i].role === 'assistant') { allModelsExpanded[c] = false; c++ } } }
const getCompletedCount = (msg: Msg) => { let c = 0; for (const m of modelConfigs) if (!msg[m.loadingKey] && msg[m.contentKey]) c++; return c }

const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const formatDate = (d: Date) => { const days = Math.floor((Date.now() - d.getTime()) / 86400000); if (days === 0) return '今天 ' + formatTime(d); if (days === 1) return '昨天'; if (days < 7) return `${days}天前`; return d.toLocaleDateString('zh-CN') }
const scrollToBottom = async () => { await nextTick(); if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight }
const clearMessages = () => { if (confirm('清空当前对话？')) { messages.value = []; currentSessionId.value = ''; Object.keys(expandedStates).forEach(k => delete expandedStates[k]); Object.keys(allModelsExpanded).forEach(k => delete allModelsExpanded[k as any]) } }
const handleKeydown = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

const stream = async (api: Api, content: string, onChunk: (c: string) => void, onDone: () => void, onErr: (e: string) => void, onController?: (c: AbortController) => void) => {
  const controller = new AbortController()
  if (onController) onController(controller)
  abortControllers.value.push(controller)
  
  try {
    let body: any = {
      model: api.model,
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content }],
      stream: true,
      temperature: temperature.value
    }

    // 针对 Anthropic 原生 API 格式的特殊处理
    const isAnthropicNative = false

    if (api.model.includes('mimo') || api.thinking) body.thinking = { type: 'enabled' }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...api.headers
    }
    
    if (isAnthropicNative) {
      headers['x-api-key'] = api.key
    } else {
      headers['Authorization'] = `Bearer ${api.key}`
    }

    const res = await fetch(api.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    })
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const reader = res.body?.getReader(); if (!reader) throw new Error('No reader')
    const dec = new TextDecoder(); let buf = ''
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const l of lines) {
        // 处理 Anthropic 原生格式 (event: ... data: ...)
        if (l.startsWith('event: ')) continue;
        
        if (l.startsWith('data: ')) {
          const d = l.slice(6).trim();
          if (d === '[DONE]') continue;
          try {
            const p = JSON.parse(d);
            // OpenAI 格式
            if (p.choices?.[0]?.delta?.content) {
              onChunk(p.choices[0].delta.content)
            }
            // Anthropic 原生格式
            else if (p.type === 'content_block_delta' && p.delta?.text) {
              onChunk(p.delta.text)
            }
          } catch {}
        }
      }
    }
    onDone()
  } catch (e: any) {
    if (e.name === 'AbortError') {
      // 用户手动停止，不视为错误
      onDone()
    } else {
      onErr(e instanceof Error ? `${e.message} (URL: ${api.url})` : 'Error')
    }
  } finally {
    // 移除已完成的 controller
    const index = abortControllers.value.indexOf(controller)
    if (index > -1) abortControllers.value.splice(index, 1)
  }
}

const confirmStop = () => {
  if (confirm('确定要停止生成吗？这将中断所有正在进行的请求。')) {
    stopGeneration()
  }
}

const stopGeneration = () => {
  abortControllers.value.forEach(c => c.abort())
  abortControllers.value = []
  Object.keys(modelControllers).forEach(k => delete modelControllers[k])
  isLoading.value = false
  
  // 更新所有正在加载的状态为 false
  if (messages.value.length > 0) {
    const lastMsg = messages.value[messages.value.length - 1]
    if (lastMsg.role === 'assistant') {
      const keys = Object.keys(lastMsg) as (keyof Msg)[]
      keys.forEach(k => {
        if (k.endsWith('Loading')) {
          (lastMsg as any)[k] = false
        }
      })
      // 强制停止总结区的加载状态
      // 停止时，如果总结区正在加载，则停止加载状态
      // 不会覆盖已有的内容，也不会显示错误信息，保持当前状态
      lastMsg.summaryLoading = false
    }
  }
  saveSession()
}

const prompt = (q: string, r: Record<string, string>) => `你是AI答案整合专家。问题：${q}\n\n回答：\n1.gemini-3-pro-preview:${r.geminiPro||'无'}\n2.mimo-v2-flash:${r.mimo||'无'}\n3.glm-4.7:${r.glm||'无'}\n4.claude-opus-4-5-20251101:${r.opus||'无'}\n5.grok-4.1:${r.grok||'无'}\n6.gemini-3-flash-preview:${r.geminiFlash||'无'}\n7.minimax-m2:${r.minimax||'无'}\n8.claude-sonnet-4.5:${r.sonnet||'无'}\n9.deepseek-v3.1-terminus:${r.deepseek||'无'}\n\n请分析：\n### 📊 一致性分析\n### 🔍 逻辑验证\n### ✅ 最终答案\n### 💡 补充建议`

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  collapseAllPreviousModels()
  const q = inputMessage.value.trim(); inputMessage.value = ''; isLoading.value = true
  messages.value.push({ role: 'user', content: q, timestamp: new Date() })
  const msg: Msg = { role: 'assistant', geminiProLoading: true, mimoLoading: true, glmLoading: true, opusLoading: true, grokLoading: true, geminiFlashLoading: true, minimaxLoading: true, sonnetLoading: true, deepseekLoading: true, summaryLoading: false, timestamp: new Date() }
  messages.value.push(msg); const idx = messages.value.length - 1
  const assistantIdx = messages.value.filter(m => m.role === 'assistant').length - 1
  allModelsExpanded[assistantIdx] = true
  await scrollToBottom()
  const done = new Set<string>(); const resp: Record<string, string> = {}
  const finish = () => { isLoading.value = false; saveSession() }
  const check = () => {
    if (done.size === 9 && !messages.value[idx].summaryLoading) {
      // 检查是否已经停止生成
      // 注意：这里不能只检查 isLoading.value，因为如果用户没有点击停止，isLoading 应该在所有模型完成后才变 false
      // 但这里是最后一个步骤，所以我们需要确保没有被手动停止
      // 手动停止时，我们会清空 abortControllers，所以可以通过这个判断
      if (abortControllers.value.length === 0 && !isLoading.value) return

      messages.value[idx].summaryLoading = true
      messages.value[idx].summaryContent = '' // 初始化为空字符串，确保容器显示
      messages.value[idx].summaryModel = 'deepseek-v3.1-terminus'
      
      const tryOpusBackup = (prevError: string) => {
        messages.value[idx].summaryContent = ''
        messages.value[idx].summaryModel = 'claude-sonnet-4-5-20250929 (备用)'
        stream(apis.opusBackup, prompt(q, resp),
          c => {
            messages.value[idx].summaryContent = (messages.value[idx].summaryContent || '') + c
            scrollToBottom()
          },
          () => {
            if (!messages.value[idx].summaryContent && isLoading.value) {
               messages.value[idx].summaryContent = '> ⚠️ 智能总结未返回任何内容'
            }
            messages.value[idx].summaryLoading = false
            finish()
          },
          e => {
            messages.value[idx].summaryContent = `智能总结失败。\nDeepSeek: 失败\nOpus: ${prevError}\nSonnet(备用): ${e}`
            messages.value[idx].summaryLoading = false
            finish()
          }
        )
      }

      const tryOpus = (prevError: string) => {
        messages.value[idx].summaryContent = ''
        messages.value[idx].summaryModel = 'claude-opus-4-5-20251101'
        stream(apis.opus, prompt(q, resp),
          c => {
            messages.value[idx].summaryContent = (messages.value[idx].summaryContent || '') + c
            scrollToBottom()
          },
          () => {
            if (!messages.value[idx].summaryContent && isLoading.value) {
               messages.value[idx].summaryContent = '> ⚠️ 智能总结未返回任何内容'
            }
            messages.value[idx].summaryLoading = false
            finish()
          },
          e => {
            tryOpusBackup(e)
          }
        )
      }

      // 并行执行 DeepSeek 和 Opus
      messages.value[idx].summaryModel = 'DeepSeek V3.1 & Claude Opus 并行生成'
      let deepseekFinished = false
      let opusFinished = false
      let deepseekContent = ''
      let opusContent = ''
      
      // 启动 DeepSeek
      stream(apis.deepseek, prompt(q, resp),
        c => {
          deepseekContent += c
          if (!opusFinished) {
             messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent}\n\n---\n\n### Claude Opus\n${opusContent || '正在生成...'}`
             scrollToBottom()
          }
        },
        () => {
          deepseekFinished = true
          if (opusFinished) {
             messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent}\n\n---\n\n### Claude Opus\n${opusContent}`
             messages.value[idx].summaryLoading = false
             finish()
          }
        },
        e => {
           deepseekContent = `生成失败: ${e}`
           deepseekFinished = true
           if (opusFinished) {
             messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent}\n\n---\n\n### Claude Opus\n${opusContent}`
             messages.value[idx].summaryLoading = false
             finish()
           }
        }
      )

      // 启动 Opus
      stream(apis.opus, prompt(q, resp),
        c => {
          opusContent += c
          if (!deepseekFinished) {
             messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent || '正在生成...'}\n\n---\n\n### Claude Opus\n${opusContent}`
             scrollToBottom()
          }
        },
        () => {
          opusFinished = true
          if (deepseekFinished) {
             messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent}\n\n---\n\n### Claude Opus\n${opusContent}`
             messages.value[idx].summaryLoading = false
             finish()
          }
        },
        e => {
           // Opus 失败尝试备用
           stream(apis.opusBackup, prompt(q, resp),
             c => {
               opusContent += c
               if (!deepseekFinished) {
                  messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent || '正在生成...'}\n\n---\n\n### Claude Sonnet (备用)\n${opusContent}`
                  scrollToBottom()
               }
             },
             () => {
               opusFinished = true
               if (deepseekFinished) {
                  messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent}\n\n---\n\n### Claude Sonnet (备用)\n${opusContent}`
                  messages.value[idx].summaryLoading = false
                  finish()
               }
             },
             e2 => {
               opusContent = `生成失败: ${e}\n备用失败: ${e2}`
               opusFinished = true
               if (deepseekFinished) {
                  messages.value[idx].summaryContent = `### DeepSeek V3.1\n${deepseekContent}\n\n---\n\n### Claude Opus\n${opusContent}`
                  messages.value[idx].summaryLoading = false
                  finish()
               }
             }
           )
        }
      )
    }
  }
  const cKeys: Record<string, keyof Msg> = { geminiPro: 'geminiProContent', mimo: 'mimoContent', glm: 'glmContent', opus: 'opusContent', grok: 'grokContent', geminiFlash: 'geminiFlashContent', minimax: 'minimaxContent', sonnet: 'sonnetContent', deepseek: 'deepseekContent' }
  const lKeys: Record<string, keyof Msg> = { geminiPro: 'geminiProLoading', mimo: 'mimoLoading', glm: 'glmLoading', opus: 'opusLoading', grok: 'grokLoading', geminiFlash: 'geminiFlashLoading', minimax: 'minimaxLoading', sonnet: 'sonnetLoading', deepseek: 'deepseekLoading' }
  for (const k of ['geminiPro', 'mimo', 'glm', 'opus', 'grok', 'geminiFlash', 'minimax', 'sonnet', 'deepseek']) {
    const onController = (c: AbortController) => { modelControllers[`${idx}-${k}`] = c }
    const onChunk = (c: string) => { (messages.value[idx] as any)[cKeys[k]] = ((messages.value[idx] as any)[cKeys[k]] || '') + c; scrollToBottom() }
    const onSuccess = () => {
      delete modelControllers[`${idx}-${k}`];
      (messages.value[idx] as any)[lKeys[k]] = false;
      resp[k] = (messages.value[idx] as any)[cKeys[k]] || '';
      done.add(k);
      check()
    }
    const onError = (e: string) => {
      if (k === 'sonnet') {
        (messages.value[idx] as any)[cKeys[k]] = '';
        stream(apis.sonnetBackup, q, onChunk, onSuccess, (e2) => {
          delete modelControllers[`${idx}-${k}`];
          (messages.value[idx] as any)[cKeys[k]] = `错误: ${e}\n重试失败: ${e2}`;
          (messages.value[idx] as any)[lKeys[k]] = false;
          resp[k] = `错误: ${e}`;
          done.add(k);
          check();
        }, onController)
      } else if (k === 'opus') {
        (messages.value[idx] as any)[cKeys[k]] = '';
        stream(apis.opusBackup, q, onChunk, onSuccess, (e2) => {
          delete modelControllers[`${idx}-${k}`];
          (messages.value[idx] as any)[cKeys[k]] = `错误: ${e}\n重试失败: ${e2}`;
          (messages.value[idx] as any)[lKeys[k]] = false;
          resp[k] = `错误: ${e}`;
          done.add(k);
          check();
        }, onController)
      } else {
        delete modelControllers[`${idx}-${k}`];
        (messages.value[idx] as any)[cKeys[k]] = `错误: ${e}`;
        (messages.value[idx] as any)[lKeys[k]] = false;
        resp[k] = `错误: ${e}`;
        done.add(k);
        check();
      }
    }
    if (k === 'deepseek') {
      stream(apis.deepseekCard, q, onChunk, onSuccess, onError, onController)
    } else {
      stream(apis[k], q, onChunk, onSuccess, onError, onController)
    }
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
</style>
