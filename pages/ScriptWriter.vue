<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../src/utils/api'

// 定义剧本章节接口
interface ScriptChapter {
  id: string
  title: string
  content: string
  isExpanded: boolean
}

// 定义剧本结构
interface Script {
  outline: string
  chapters: ScriptChapter[]
}

const router = useRouter()

// 输入状态
const inputText = ref('')
const isGenerating = ref(false)
const generationError = ref('')
const generationProgress = ref(0)
const generationStatus = ref('')
const isCancelled = ref(false)

// 剧本结果
const scriptResult = ref<Script>({
  outline: '',
  chapters: []
})

// 章节列表（用于分步生成）
const chapterList = ref<Array<{ title: string; summary: string }>>([])

// 复制状态
const copySuccess = ref(false)

// 生成取消函数
const cancelGeneration = () => {
  isCancelled.value = true
  generationStatus.value = '生成已取消'
  isGenerating.value = false
}

// 解析AI生成的剧本内容
const parseScriptContent = (content: string): Script => {
  // 初始化结果
  const result: Script = {
    outline: '',
    chapters: []
  }

  // 提取大纲部分（从开头到第一个章节标题之前）
  const outlineMatch = content.match(/^(.*?)(?=### 第[零一二三四五六七八九十百]+章：)/s)
  if (outlineMatch) {
    result.outline = outlineMatch[1].trim()
  } else {
    // 如果没有识别到章节，将整个内容作为大纲
    result.outline = content
    return result
  }

  // 提取所有章节
  const chapterRegex = /### (第[零一二三四五六七八九十百]+章：[^\n]+)\n\n(.*?)(?=### 第[零一二三四五六七八九十百]+章：|$)/gs
  let chapterMatch
  let chapterIndex = 1

  while ((chapterMatch = chapterRegex.exec(content)) !== null) {
    const title = chapterMatch[1]
    const chapterContent = chapterMatch[2].trim()
    
    result.chapters.push({
      id: chapterIndex.toString(),
      title: title,
      content: chapterContent,
      isExpanded: chapterIndex === 1 // 第一章默认展开
    })
    
    chapterIndex++
  }

  // 如果没有识别到章节结构，将整个内容作为大纲
  if (result.chapters.length === 0) {
    result.outline = content
  }

  return result
}

// 生成剧本（分步骤）
const generateScript = async () => {
  if (!inputText.value.trim()) {
    generationError.value = '请输入剧本主题或大纲'
    return
  }

  // 初始化生成状态
  isGenerating.value = true
  generationError.value = ''
  copySuccess.value = false
  generationProgress.value = 0
  generationStatus.value = '开始生成剧本...'
  isCancelled.value = false
  scriptResult.value = { outline: '', chapters: [] }
  chapterList.value = []

  try {
    // 步骤1：生成剧本大纲
    generationStatus.value = '生成剧本大纲...'
    generationProgress.value = 10
    const outline = await api.generateOutline(inputText.value)
    scriptResult.value.outline = outline
    
    if (isCancelled.value) return
    
    // 步骤2：生成章节列表
    generationStatus.value = '生成章节列表...'
    generationProgress.value = 30
    chapterList.value = await api.generateChapterList(outline)
    
    if (isCancelled.value) return
    
    // 步骤3：逐个生成章节内容
    generationStatus.value = `开始生成章节内容（共${chapterList.value.length}章）...`
    const totalChapters = chapterList.value.length
    
    for (let i = 0; i < totalChapters; i++) {
      if (isCancelled.value) return
      
      const chapter = chapterList.value[i]
      generationStatus.value = `生成第${i + 1}章：${chapter.title}...`
      generationProgress.value = 30 + Math.round((i / totalChapters) * 60)
      
      // 生成章节内容
      const chapterContent = await api.generateChapterContent(
        outline,
        chapter.title,
        chapter.summary
      )
      
      // 添加到剧本结果中
      scriptResult.value.chapters.push({
        id: (i + 1).toString(),
        title: chapter.title,
        content: chapterContent,
        isExpanded: i === 0 // 第一章默认展开
      })
    }
    
    if (isCancelled.value) return
    
    // 生成完成
    generationStatus.value = '剧本生成完成！'
    generationProgress.value = 100
  } catch (error) {
    if (!isCancelled.value) {
      generationError.value = '生成剧本失败，请重试'
      generationStatus.value = '生成失败'
      console.error('生成剧本失败:', error)
    }
  } finally {
    if (!isCancelled.value) {
      isGenerating.value = false
    }
  }
}

// 切换章节展开状态
const toggleChapter = (chapter: ScriptChapter) => {
  chapter.isExpanded = !chapter.isExpanded
}

// 复制剧本内容
const copyScript = () => {
  const scriptText = `${scriptResult.value.outline}\n\n${scriptResult.value.chapters.map(chapter => {
    return `${chapter.title}\n${chapter.content}\n`
  }).join('\n')}`
  
  navigator.clipboard.writeText(scriptText).then(() => {
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }).catch(err => {
    console.error('复制失败:', err)
  })
}

// 复制单个章节内容
const copyChapter = (chapter: ScriptChapter) => {
  const chapterText = `${chapter.title}\n${chapter.content}`
  
  navigator.clipboard.writeText(chapterText).then(() => {
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }).catch(err => {
    console.error('复制失败:', err)
  })
}

// 返回主页
const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
    <!-- 顶部导航 -->
    <div class="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700">
      <div class="container mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button 
            @click="goHome" 
            class="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            title="返回主页"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
          </button>
          <h1 class="text-xl font-bold">AI编剧工具</h1>
        </div>
        <div class="text-sm text-slate-400">
          输入剧本主题，生成完整剧本
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="container mx-auto px-4 pt-24 pb-12">
      <!-- 输入区域 -->
      <div class="mb-8">
        <div class="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 p-6">
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-300 mb-2">剧本主题或大纲</label>
            <textarea
              v-model="inputText"
              placeholder="请输入剧本的主题、大纲或灵感..."
              class="w-full h-32 p-4 bg-slate-900 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-white"
              :disabled="isGenerating"
            ></textarea>
          </div>
          
          <div class="space-y-4">
            <div v-if="isGenerating" class="space-y-2">
              <!-- 生成状态 -->
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-300">{{ generationStatus }}</span>
                <button
                  @click="cancelGeneration"
                  class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                >
                  取消生成
                </button>
              </div>
              
              <!-- 进度条 -->
              <div class="w-full bg-slate-700 rounded-full h-2">
                <div 
                  class="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  :style="{ width: generationProgress + '%' }"
                ></div>
              </div>
              
              <!-- 进度百分比 -->
              <div class="text-right text-sm text-slate-400">
                {{ generationProgress }}%
              </div>
            </div>
            
            <div class="flex items-center justify-between">
              <button
                @click="generateScript"
                :disabled="isGenerating || !inputText.trim()"
                class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg v-if="isGenerating" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGenerating ? '生成中...' : '生成剧本' }}
              </button>
              
              <div v-if="generationError" class="text-red-400 text-sm">
                {{ generationError }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 结果区域 -->
      <div v-if="scriptResult.chapters.length > 0" class="space-y-6">
        <!-- 剧本大纲 -->
        <div class="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold">剧本大纲</h2>
            <button
              @click="copyScript"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
              title="复制完整剧本"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-2m-6 12h8M10 10l8-8m0 0l-8-8m8 8H2"></path>
              </svg>
              {{ copySuccess ? '已复制！' : '复制剧本' }}
            </button>
          </div>
          <div class="bg-slate-900/70 rounded-lg p-4 whitespace-pre-wrap text-slate-300">
            {{ scriptResult.outline }}
          </div>
        </div>

        <!-- 章节列表 -->
        <div class="space-y-4">
          <h2 class="text-xl font-bold">剧本章节</h2>
          
          <div v-for="chapter in scriptResult.chapters" :key="chapter.id" class="bg-slate-800/50 rounded-xl shadow-lg border border-slate-700 overflow-hidden">
            <!-- 章节标题栏 -->
            <div 
              @click="toggleChapter(chapter)"
              class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-slate-400 transition-transform" :class="{ 'rotate-90': chapter.isExpanded }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
                <h3 class="font-semibold">{{ chapter.title }}</h3>
              </div>
              <button
                @click.stop="copyChapter(chapter)"
                class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-1 text-xs"
                title="复制章节内容"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-2m-6 12h8M10 10l8-8m0 0l-8-8m8 8H2"></path>
                </svg>
                复制
              </button>
            </div>
            
            <!-- 章节内容 -->
            <div 
              v-if="chapter.isExpanded" 
              class="p-4 bg-slate-900/70 border-t border-slate-700 whitespace-pre-wrap text-slate-300"
            >
              {{ chapter.content }}
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!isGenerating" class="text-center py-16 text-slate-400">
        <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
        </svg>
        <h3 class="text-lg font-medium mb-2">还没有生成剧本</h3>
        <p class="text-sm">输入剧本主题或大纲，点击生成按钮开始创作</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
</style>