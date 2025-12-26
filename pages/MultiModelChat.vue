<template>
  <div class="h-screen bg-gradient-to-b from-brand-50 to-white flex overflow-hidden">
    <!-- 确认弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="confirmModal.show" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="cancelConfirm">
          <div class="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/50 to-slate-900/60 backdrop-blur-sm"></div>
          <Transition name="modal-scale">
            <div v-if="confirmModal.show" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform">
              <!-- 顶部装饰条 -->
              <div class="h-1.5 bg-gradient-to-r" :class="confirmModal.type === 'danger' ? 'from-red-400 via-red-500 to-orange-500' : 'from-brand-400 via-brand-500 to-purple-500'"></div>
              
              <div class="p-8">
                <!-- 图标 -->
                <div class="flex justify-center mb-6">
                  <div class="w-20 h-20 rounded-full flex items-center justify-center" :class="confirmModal.type === 'danger' ? 'bg-gradient-to-br from-red-100 to-orange-100' : 'bg-gradient-to-br from-brand-100 to-purple-100'">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center" :class="confirmModal.type === 'danger' ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-brand-500 to-purple-500'">
                      <AlertTriangle v-if="confirmModal.type === 'danger'" class="w-7 h-7 text-white" />
                      <HelpCircle v-else class="w-7 h-7 text-white" />
                    </div>
                  </div>
                </div>
                
                <!-- 标题 -->
                <h3 class="text-xl font-bold text-center text-slate-800 mb-3">{{ confirmModal.title }}</h3>
                
                <!-- 消息 -->
                <p class="text-center text-slate-500 leading-relaxed mb-8">{{ confirmModal.message }}</p>
                
                <!-- 按钮 -->
                <div class="flex gap-3">
                  <button @click="cancelConfirm" class="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-200 hover:shadow-md">
                    取消
                  </button>
                  <button @click="doConfirm" class="flex-1 py-3 px-4 font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5" :class="confirmModal.type === 'danger' ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white' : 'bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600 text-white'">
                    {{ confirmModal.confirmText || '确定' }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- 预览弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="previewModal.show" class="fixed inset-0 z-[99] flex items-center justify-center p-4" @click.self="closePreview">
          <div class="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-purple-900/30 to-slate-900/60 backdrop-blur-sm"></div>
          <Transition name="modal-scale">
            <div v-if="previewModal.show" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden transform">
              <!-- 顶部装饰 -->
              <div class="h-1.5 bg-gradient-to-r from-brand-400 via-purple-500 to-pink-500"></div>
              
              <!-- 头部 -->
              <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-50 via-white to-purple-50/50">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <FileText class="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 class="font-bold text-lg text-slate-800">{{ previewModal.title }}</h3>
                    <p class="text-xs text-slate-400">模型响应内容</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="copyContent" class="flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-all duration-200 hover:shadow-md" :class="copied ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'">
                    <Check v-if="copied" class="w-4 h-4" />
                    <Copy v-else class="w-4 h-4" />
                    <span>{{ copied ? '已复制' : '复制内容' }}</span>
                  </button>
                  <button @click="closePreview" class="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors group">
                    <X class="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </button>
                </div>
              </div>
              
              <!-- 内容区 -->
              <div class="flex-1 overflow-y-auto">
                <div class="p-6 bg-gradient-to-b from-slate-50 to-white min-h-full">
                  <div class="markdown-content prose prose-sm max-w-none text-slate-700" v-html="renderMd(previewModal.content)"></div>
                </div>
              </div>
              
              <!-- 底部状态栏 -->
              <div class="px-6 py-3 border-t border-slate-100 bg-gradient-to-r from-white to-slate-50 flex items-center justify-between">
                <div class="flex items-center gap-4 text-xs text-slate-400">
                  <span class="flex items-center gap-1.5">
                    <div class="w-2 h-2 rounded-full bg-green-500"></div>
                    生成完成
                  </span>
                </div>
                <span class="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{{ previewModal.content.length }} 字符</span>
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
            <h1 class="text-lg sm:text-2xl font-bold text-slate-900 truncate">多模型问答</h1>
            <p class="text-xs sm:text-sm text-slate-600 hidden sm:block">同时调用12个AI模型，DeepSeek 3.1 智能总结</p>
          </div>
          <RouterLink to="/" class="flex items-center gap-2 px-2 sm:px-3 py-2 bg-white/80 rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 flex-shrink-0"><Home class="w-5 h-5" /></RouterLink>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50">
            <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-slate-500">
              <div class="w-20 h-20 mb-6 bg-brand-100 rounded-full flex items-center justify-center"><MessageSquare class="w-10 h-10 text-brand-600" /></div>
              <p class="text-lg font-medium mb-2">开始对话</p>
              <p class="text-sm text-slate-400 mb-8">12个模型并发响应 → DeepSeek 3.1 智能总结</p>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-w-4xl">
                <div v-for="m in modelConfigs" :key="m.key" class="flex flex-col items-center gap-2 p-3 rounded-lg bg-white border border-slate-200">
                  <div :class="['w-3 h-3 rounded-full', m.dotColor]"></div>
                  <span class="text-xs text-slate-600 text-center leading-tight">{{ m.name }}</span>
                </div>
              </div>
            </div>
            <div v-for="(msg, idx) in messages" :key="idx" class="space-y-3">
              <div v-if="msg.role === 'user'" class="flex justify-end">
                <div class="max-w-[85%] sm:max-w-3xl px-3 sm:px-4 py-2 sm:py-3 rounded-lg bg-brand-500 text-white"><div class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</div></div>
              </div>
              <div v-else class="space-y-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <button @click="toggleAllModels(idx)" class="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors">
                      <ChevronRight :class="['w-4 h-4 transition-transform', isAllModelsExpanded(idx) ? 'rotate-90' : '']" />
                      <span>{{ isAllModelsExpanded(idx) ? '收起全部模型' : '展开全部模型' }}</span>
                      <span class="text-xs text-slate-400">({{ getCompletedCount(msg) }}/12)</span>
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
                <div v-if="msg.deepseekSummary || msg.opusSummary || msg.summaryLoading" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- DeepSeek 总结 -->
                  <div class="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 flex items-center justify-center"><Sparkles class="w-4 h-4 text-white" /></div>
                      <div><h3 class="font-bold text-indigo-800">DeepSeek V3.1 总结</h3></div>
                      <Loader2 v-if="msg.deepseekSummaryLoading" class="w-5 h-5 animate-spin text-indigo-500 ml-auto" />
                      <span v-else-if="msg.deepseekSummary" class="ml-auto text-xs text-indigo-400">{{ msg.deepseekSummary.length }}字</span>
                    </div>
                    <div v-if="msg.deepseekSummaryLoading && !msg.deepseekSummary" class="flex items-center gap-2 text-indigo-500 py-4"><span class="text-sm">正在整合分析...</span></div>
                    <div v-else class="markdown-content prose prose-sm max-w-none text-slate-700 break-words" v-html="renderMd(msg.deepseekSummary || '')"></div>
                  </div>
                  <!-- Claude Opus 总结 -->
                  <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center"><Sparkles class="w-4 h-4 text-white" /></div>
                      <div><h3 class="font-bold text-purple-800">{{ msg.opusSummaryModel || 'ClaudeOpus4.5' }} 总结</h3></div>
                      <Loader2 v-if="msg.opusSummaryLoading" class="w-5 h-5 animate-spin text-purple-500 ml-auto" />
                      <span v-else-if="msg.opusSummary" class="ml-auto text-xs text-purple-400">{{ msg.opusSummary.length }}字</span>
                    </div>
                    <div v-if="msg.opusSummaryLoading && !msg.opusSummary" class="flex items-center gap-2 text-purple-500 py-4"><span class="text-sm">正在整合分析...</span></div>
                    <div v-else class="markdown-content prose prose-sm max-w-none text-slate-700 break-words" v-html="renderMd(msg.opusSummary || '')"></div>
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
            <div class="flex gap-3">
              <textarea v-model="inputMessage" @keydown="handleKeydown" placeholder="输入你的问题..." :rows="isMobile ? 1 : 2" class="flex-1 px-3 sm:px-4 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm sm:text-base" :disabled="isLoading"></textarea>
              <button @click="sendMessage" :disabled="!inputMessage.trim() || isLoading" class="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap min-w-[100px] justify-center">
                <Send class="w-4 h-4 flex-shrink-0" />
                <span class="flex-shrink-0">{{ isLoading ? '处理中' : '发送' }}</span>
              </button>
            </div>
            <div class="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
              <div class="flex flex-wrap items-center gap-2 sm:gap-4">
                <span class="hidden sm:inline">Enter 发送，Shift+Enter 换行</span>
                <div
                  class="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded transition-colors select-none"
                  :class="isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200'"
                  :title="isLoading ? '生成中无法修改温度设置' : '调整模型随机性 (温度)'"
                >
                  <Thermometer class="w-3 h-3 text-slate-400" />
                  <span>温度</span>
                  <input type="range" v-model.number="temperature" min="0" max="1" step="0.1" :disabled="isLoading" class="w-12 sm:w-16 h-1 bg-slate-300 rounded-lg appearance-none accent-brand-500" :class="isLoading ? 'cursor-not-allowed' : 'cursor-pointer'">
                  <span class="w-6 text-center font-medium text-brand-600">{{ temperature }}</span>
                </div>
                <div
                  class="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded transition-colors select-none"
                  :class="isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200 cursor-pointer'"
                  @click="!isLoading && (webSearch = !webSearch)"
                  :title="isLoading ? '生成中无法修改联网搜索设置' : '开启联网搜索获取最新信息'"
                >
                  <Globe class="w-3 h-3" :class="webSearch ? 'text-brand-600' : 'text-slate-400'" />
                  <span :class="webSearch ? 'text-brand-600 font-medium' : 'text-slate-500'">联网搜索</span>
                  <div class="relative inline-flex items-center h-4 w-8 rounded-full transition-colors duration-200 focus:outline-none" :class="webSearch ? 'bg-brand-500' : 'bg-slate-300'">
                    <span class="inline-block w-3 h-3 transform bg-white rounded-full transition-transform duration-200" :class="webSearch ? 'translate-x-4' : 'translate-x-1'"></span>
                  </div>
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
import { Home, MessageSquare, ChevronRight, ChevronLeft, Loader2, Send, Sparkles, History, Trash2, Plus, Maximize2, X, Copy, Check, Thermometer, AlertTriangle, HelpCircle, FileText, Menu, Globe } from 'lucide-vue-next'
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

const renderMd = (t: string): string => {
  if (!t) return '';
  
  // 处理 <think> 标签，将其转换为特殊样式的 div
  let processed = t.replace(/<think>([\s\S]*?)<\/think>/gi, (match, content) => {
    return `\n\n<div class="thinking-block">💭 **思考中...**\n\n${content}\n\n</div>\n\n`;
  });
  
  try {
    return marked.parse(processed) as string
  } catch {
    return processed.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  }
}
const getStr = (c: any): string => typeof c === 'string' ? c : c == null ? '' : String(c)
const getLen = (c: any): number => getStr(c).length

const env = (k: string, d = '') => (import.meta as any).env?.[k] || d
type Msg = { role: 'user' | 'assistant'; content?: string; geminiProContent?: string; mimoContent?: string; glmContent?: string; opusContent?: string; grokContent?: string; geminiFlashContent?: string; minimaxContent?: string; minimaxM21Content?: string; qwenContent?: string; deepseekV32Content?: string; sonnetContent?: string; deepseekContent?: string; summaryContent?: string; summaryModel?: string; deepseekSummary?: string; deepseekSummaryLoading?: boolean; opusSummary?: string; opusSummaryLoading?: boolean; opusSummaryModel?: string; geminiProLoading?: boolean; mimoLoading?: boolean; glmLoading?: boolean; opusLoading?: boolean; grokLoading?: boolean; geminiFlashLoading?: boolean; minimaxLoading?: boolean; minimaxM21Loading?: boolean; qwenLoading?: boolean; deepseekV32Loading?: boolean; sonnetLoading?: boolean; deepseekLoading?: boolean; summaryLoading?: boolean; timestamp?: Date }
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
  { key: 'minimaxM21', name: 'MiniMax-M2.1', bgColor: 'bg-rose-50', borderColor: 'border-rose-100', dotColor: 'bg-rose-500', contentKey: 'minimaxM21Content' as keyof Msg, loadingKey: 'minimaxM21Loading' as keyof Msg },
  { key: 'qwen', name: 'Qwen3-235B-A22B', bgColor: 'bg-amber-50', borderColor: 'border-amber-100', dotColor: 'bg-amber-500', contentKey: 'qwenContent' as keyof Msg, loadingKey: 'qwenLoading' as keyof Msg },
  { key: 'deepseekV32', name: 'DeepSeek-V3.2', bgColor: 'bg-lime-50', borderColor: 'border-lime-100', dotColor: 'bg-lime-500', contentKey: 'deepseekV32Content' as keyof Msg, loadingKey: 'deepseekV32Loading' as keyof Msg },
  { key: 'sonnet', name: 'claude-sonnet-4.5', bgColor: 'bg-teal-50', borderColor: 'border-teal-100', dotColor: 'bg-teal-500', contentKey: 'sonnetContent' as keyof Msg, loadingKey: 'sonnetLoading' as keyof Msg },
  { key: 'deepseek', name: 'deepseek-v3.1-terminus', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-100', dotColor: 'bg-indigo-500', contentKey: 'deepseekContent' as keyof Msg, loadingKey: 'deepseekLoading' as keyof Msg }
]

const apiBase = env('VITE_API_BASE_URL', 'https://chat.toproject.cloud')

const apis: Record<string, Api> = {
  geminiPro: { url: `${apiBase}/api/gemini/chat/completions`, key: env('VITE_GF5_TOKEN'), model: 'gemini-3-pro-preview', thinking: true },
  mimo: { url: `${apiBase}/api/chat/completions`, key: env('VITE_MZ3_TOKEN'), model: 'mimo-v2-flash' },
  glm: { url: `${apiBase}/api/claude/chat/completions`, key: env('VITE_XQ7_TOKEN'), model: 'glm-4.7' },
  opus: { url: `${apiBase}/api/opus/chat/completions`, key: env('VITE_PK9_TOKEN'), model: 'claude-opus-4-5-20251101' },
  opusBackup: {
    url: `${apiBase}/api/code-relay/chat/completions`,
    key: env('VITE_CODE_RELAY_TOKEN'),
    model: 'claude-opus-4-5-20251101'
  },
  grok: { url: `${apiBase}/api/claude/chat/completions`, key: env('VITE_XQ7_TOKEN'), model: 'grok-4.1', thinking: true },
  geminiFlash: { url: `${apiBase}/api/gemini/chat/completions`, key: env('VITE_GF5_TOKEN'), model: 'gemini-3-flash-preview', thinking: true },
  minimax: { url: `${apiBase}/api/minimax/chat/completions`, key: env('VITE_MM4_TOKEN'), model: 'minimaxai/minimax-m2' },
  minimaxM21: { url: `${apiBase}/api/minimaxm21/chat/completions`, key: env('VITE_MINIMAX_M21_TOKEN'), model: 'MiniMax-M2.1' },
  qwen: { url: `${apiBase}/api/qwen/chat/completions`, key: env('VITE_QWEN_TOKEN'), model: 'Qwen3-235B-A22B' },
  deepseekV32: { url: `${apiBase}/api/deepseekv32/chat/completions`, key: env('VITE_DEEPSEEK_V32_TOKEN'), model: 'DeepSeek-V3.2' },
  deepseek: { url: `${apiBase}/api/deepseek/chat/completions`, key: env('VITE_DS2_TOKEN'), model: 'deepseek-ai/deepseek-v3.1-terminus' },
  sonnet: { url: `${apiBase}/api/sonnet/chat/completions`, key: env('VITE_SONNET_TOKEN'), model: 'claude-sonnet-4-5-20250929' },
  sonnetBackup: {
    url: `${apiBase}/api/sonnet-backup/chat/completions`,
    key: env('VITE_SONNET_TOKEN_BACKUP'),
    model: 'claude-sonnet-4-5-20250929'
  },
  deepseekCard: { url: `${apiBase}/api/deepseek/chat/completions`, key: env('VITE_DS2_TOKEN'), model: 'deepseek-ai/deepseek-v3.1-terminus' }
}

const KEY = 'zenreader_multimodel_history'
const historyPanelOpen = ref(typeof window !== 'undefined' ? window.innerWidth >= 768 : true)
const chatHistory = ref<Session[]>([])
const currentSessionId = ref('')
const inputMessage = ref('')
const messages = ref<Msg[]>([])
const isLoading = ref(false)
const chatContainer = ref<HTMLElement>()
const expandedStates = reactive<Record<string, boolean>>({})
const allModelsExpanded = reactive<Record<number, boolean>>({})
const previewModal = ref<{ show: boolean; title: string; content: string }>({ show: false, title: '', content: '' })
const confirmModal = ref<{ show: boolean; title: string; message: string; type: 'danger' | 'info'; confirmText?: string; onConfirm?: () => void }>({ show: false, title: '', message: '', type: 'info' })
const copied = ref(false)
const abortControllers = ref<AbortController[]>([])
const modelControllers = reactive<Record<string, AbortController>>({})
const temperature = ref(0.7)
const webSearch = ref(false)
// 移动端检测
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isMobile = computed(() => windowWidth.value < 768)
const handleResize = () => { windowWidth.value = window.innerWidth }

const stopModel = (idx: number, key: string) => {
  const mapKey = `${idx}-${key}`
  const controller = modelControllers[mapKey]
  if (controller) {
    controller.abort()
    delete modelControllers[mapKey]
  }
}

const showConfirm = (options: { title: string; message: string; type?: 'danger' | 'info'; confirmText?: string; onConfirm: () => void }) => {
  confirmModal.value = {
    show: true,
    title: options.title,
    message: options.message,
    type: options.type || 'info',
    confirmText: options.confirmText,
    onConfirm: options.onConfirm
  }
}

const cancelConfirm = () => {
  confirmModal.value.show = false
}

const doConfirm = () => {
  if (confirmModal.value.onConfirm) {
    confirmModal.value.onConfirm()
  }
  confirmModal.value.show = false
}

const confirmStopModel = (idx: number, key: string, name: string) => {
  showConfirm({
    title: '停止生成',
    message: `确定要停止 ${name} 的生成吗？当前进度将被保留。`,
    type: 'danger',
    confirmText: '停止',
    onConfirm: () => stopModel(idx, key)
  })
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
  if (isMobile.value) historyPanelOpen.value = false
}

const deleteSession = (id: string) => {
  chatHistory.value = chatHistory.value.filter(s => s.id !== id)
  if (currentSessionId.value === id) { currentSessionId.value = ''; messages.value = [] }
  saveHistory()
}

const clearAllHistory = () => {
  showConfirm({
    title: '清空历史记录',
    message: '确定要清空所有历史记录吗？此操作不可恢复。',
    type: 'danger',
    confirmText: '清空全部',
    onConfirm: () => {
      chatHistory.value = []
      currentSessionId.value = ''
      messages.value = []
      saveHistory()
    }
  })
}

const startNewSession = () => {
  if (isLoading.value) return
  if (messages.value.length > 0) saveSession()
  currentSessionId.value = ''
  messages.value = []
  inputMessage.value = ''
  Object.keys(expandedStates).forEach(k => delete expandedStates[k])
  Object.keys(allModelsExpanded).forEach(k => delete allModelsExpanded[k as any])
  if (isMobile.value) historyPanelOpen.value = false
}

watch(messages, () => { if (messages.value.length > 0 && !isLoading.value) saveSession() }, { deep: true })
onMounted(() => {
  loadHistory()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const isExpanded = (i: number, m: string) => { const k = `${i}-${m}`; if (expandedStates[k] === undefined) expandedStates[k] = true; return expandedStates[k] }
const toggleExpand = (i: number, m: string) => { const k = `${i}-${m}`; expandedStates[k] = !isExpanded(i, m) }
const isAllModelsExpanded = (idx: number) => { if (allModelsExpanded[idx] === undefined) return false; return allModelsExpanded[idx] }
const toggleAllModels = (idx: number) => { allModelsExpanded[idx] = !isAllModelsExpanded(idx) }
const collapseAllPreviousModels = () => { for (let i = 0; i < messages.value.length; i++) { if (messages.value[i].role === 'assistant') { allModelsExpanded[i] = false } } }
const getCompletedCount = (msg: Msg) => { let c = 0; for (const m of modelConfigs) if (!msg[m.loadingKey] && msg[m.contentKey]) c++; return c }

const formatTime = (d: Date) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
const formatDate = (d: Date) => { const days = Math.floor((Date.now() - d.getTime()) / 86400000); if (days === 0) return '今天 ' + formatTime(d); if (days === 1) return '昨天'; if (days < 7) return `${days}天前`; return d.toLocaleDateString('zh-CN') }
const scrollToBottom = async () => { await nextTick(); if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight }
const clearMessages = () => {
  showConfirm({
    title: '清空对话',
    message: '确定要清空当前对话吗？所有消息将被删除。',
    type: 'danger',
    confirmText: '清空',
    onConfirm: () => {
      messages.value = []
      currentSessionId.value = ''
      Object.keys(expandedStates).forEach(k => delete expandedStates[k])
      Object.keys(allModelsExpanded).forEach(k => delete allModelsExpanded[k as any])
    }
  })
}
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
      temperature: temperature.value,
      web_search: webSearch.value
    }

    // 针对 Anthropic 原生 API 格式的特殊处理
    const isAnthropicNative = false

    if (api.model.includes('mimo') || api.thinking) body.thinking = { type: 'enabled' }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'origin': 'https://www.toproject.cloud',
      'priority': 'u=1, i',
      'referer': 'https://www.toproject.cloud/',
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
  showConfirm({
    title: '停止生成',
    message: '确定要停止生成吗？这将中断所有正在进行的请求，当前已生成的内容将被保留。',
    type: 'danger',
    confirmText: '停止全部',
    onConfirm: stopGeneration
  })
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
      lastMsg.summaryLoading = false
      lastMsg.deepseekSummaryLoading = false
      lastMsg.opusSummaryLoading = false
    }
  }
  saveSession()
}

const prompt = (q: string, r: Record<string, string>) => `你是AI答案整合专家。问题：${q}\n\n回答：\n1.gemini-3-pro-preview:${r.geminiPro||'无'}\n2.mimo-v2-flash:${r.mimo||'无'}\n3.glm-4.7:${r.glm||'无'}\n4.claude-opus-4-5-20251101:${r.opus||'无'}\n5.grok-4.1:${r.grok||'无'}\n6.gemini-3-flash-preview:${r.geminiFlash||'无'}\n7.minimax-m2:${r.minimax||'无'}\n8.MiniMax-M2.1:${r.minimaxM21||'无'}\n9.Qwen3-235B-A22B:${r.qwen||'无'}\n10.DeepSeek-V3.2:${r.deepseekV32||'无'}\n11.claude-sonnet-4.5:${r.sonnet||'无'}\n12.deepseek-v3.1-terminus:${r.deepseek||'无'}\n\n请分析：\n### 📊 一致性分析\n### 🔍 逻辑验证\n### ✅ 最终答案\n### 💡 补充建议`

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return
  collapseAllPreviousModels()
  const q = inputMessage.value.trim(); inputMessage.value = ''; isLoading.value = true
  messages.value.push({ role: 'user', content: q, timestamp: new Date() })
  const msg: Msg = { role: 'assistant', geminiProLoading: true, mimoLoading: true, glmLoading: true, opusLoading: true, grokLoading: true, geminiFlashLoading: true, minimaxLoading: true, minimaxM21Loading: true, qwenLoading: true, deepseekV32Loading: true, sonnetLoading: true, deepseekLoading: true, summaryLoading: false, timestamp: new Date() }
  messages.value.push(msg); const idx = messages.value.length - 1
  allModelsExpanded[idx] = true
  await scrollToBottom()
  const done = new Set<string>(); const resp: Record<string, string> = {}
  const finish = () => { isLoading.value = false; saveSession() }
  const check = () => {
    if (done.size === 12 && !messages.value[idx].summaryLoading) {
      // 检查是否已经停止生成（只检查 isLoading 状态）
      if (!isLoading.value) return

      messages.value[idx].summaryLoading = true
      messages.value[idx].deepseekSummary = ''
      messages.value[idx].deepseekSummaryLoading = true
      messages.value[idx].opusSummary = ''
      messages.value[idx].opusSummaryLoading = true
      messages.value[idx].opusSummaryModel = 'Claude Opus'
      
      let deepseekFinished = false
      let opusFinished = false
      
      const checkAllDone = () => {
        if (deepseekFinished && opusFinished) {
          messages.value[idx].summaryLoading = false
          finish()
        }
      }
      
      // 启动 DeepSeek
      stream(apis.deepseek, prompt(q, resp),
        c => {
          messages.value[idx].deepseekSummary = (messages.value[idx].deepseekSummary || '') + c
          scrollToBottom()
        },
        () => {
          deepseekFinished = true
          messages.value[idx].deepseekSummaryLoading = false
          if (!messages.value[idx].deepseekSummary && isLoading.value) {
            messages.value[idx].deepseekSummary = '> ⚠️ 未返回任何内容'
          }
          checkAllDone()
        },
        e => {
          messages.value[idx].deepseekSummary = `生成失败: ${e}`
          messages.value[idx].deepseekSummaryLoading = false
          deepseekFinished = true
          checkAllDone()
        }
      )

      // 启动 Opus
      stream(apis.opus, prompt(q, resp),
        c => {
          messages.value[idx].opusSummary = (messages.value[idx].opusSummary || '') + c
          scrollToBottom()
        },
        () => {
          opusFinished = true
          messages.value[idx].opusSummaryLoading = false
          if (!messages.value[idx].opusSummary && isLoading.value) {
            messages.value[idx].opusSummary = '> ⚠️ 未返回任何内容'
          }
          checkAllDone()
        },
        e => {
          // Opus 失败尝试备用
          messages.value[idx].opusSummary = ''
          messages.value[idx].opusSummaryModel = 'ClaudeOpus4.5'
          stream(apis.opusBackup, prompt(q, resp),
            c => {
              messages.value[idx].opusSummary = (messages.value[idx].opusSummary || '') + c
              scrollToBottom()
            },
            () => {
              opusFinished = true
              messages.value[idx].opusSummaryLoading = false
              if (!messages.value[idx].opusSummary && isLoading.value) {
                messages.value[idx].opusSummary = '> ⚠️ 未返回任何内容'
              }
              checkAllDone()
            },
            e2 => {
              messages.value[idx].opusSummary = `生成失败: ${e}\n备用失败: ${e2}`
              messages.value[idx].opusSummaryLoading = false
              opusFinished = true
              checkAllDone()
            }
          )
        }
      )
    }
  }
  const cKeys: Record<string, keyof Msg> = { geminiPro: 'geminiProContent', mimo: 'mimoContent', glm: 'glmContent', opus: 'opusContent', grok: 'grokContent', geminiFlash: 'geminiFlashContent', minimax: 'minimaxContent', minimaxM21: 'minimaxM21Content', qwen: 'qwenContent', deepseekV32: 'deepseekV32Content', sonnet: 'sonnetContent', deepseek: 'deepseekContent' }
  const lKeys: Record<string, keyof Msg> = { geminiPro: 'geminiProLoading', mimo: 'mimoLoading', glm: 'glmLoading', opus: 'opusLoading', grok: 'grokLoading', geminiFlash: 'geminiFlashLoading', minimax: 'minimaxLoading', minimaxM21: 'minimaxM21Loading', qwen: 'qwenLoading', deepseekV32: 'deepseekV32Loading', sonnet: 'sonnetLoading', deepseek: 'deepseekLoading' }
  for (const k of ['geminiPro', 'mimo', 'glm', 'opus', 'grok', 'geminiFlash', 'minimax', 'minimaxM21', 'qwen', 'deepseekV32', 'sonnet', 'deepseek']) {
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

/* 思考块样式 */
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

/* 弹窗动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-scale-leave-active {
  transition: all 0.2s ease-in;
}
.modal-scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-5px);
}

/* 遮罩淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
