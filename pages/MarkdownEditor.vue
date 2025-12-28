<template>
  <div class="min-h-screen bg-slate-50 flex flex-col" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 顶部导航 -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div class="max-w-full mx-auto px-4 sm:px-6">
        <div class="flex items-center justify-between h-14">
          <div class="flex items-center gap-4">
            <RouterLink v-if="!isFullscreen" to="/" class="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all">
              <ArrowLeft class="w-4 h-4" />
            </RouterLink>
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <FileEdit class="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 class="text-base font-semibold text-slate-900">Markdown 编辑器</h1>
                <p class="text-xs text-slate-500">实时预览</p>
              </div>
            </div>
          </div>
          
          <!-- 工具栏 -->
          <div class="flex items-center gap-2">
            <!-- 视图切换 -->
            <div class="hidden sm:flex items-center bg-slate-100 rounded-lg p-1">
              <button
                v-for="view in viewModes"
                :key="view.key"
                @click="currentView = view.key"
                :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  currentView === view.key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                ]"
              >
                <component :is="view.icon" class="w-3.5 h-3.5" />
                {{ view.name }}
              </button>
            </div>
            
            <div class="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            
            <!-- 工具面板切换 -->
            <button @click="toggleToolPanel('outline')" :class="['p-2 rounded-lg transition-colors', activeToolPanel === 'outline' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100']" title="大纲">
              <ListTree class="w-4 h-4" />
            </button>
            <button @click="toggleToolPanel('search')" :class="['p-2 rounded-lg transition-colors', activeToolPanel === 'search' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100']" title="搜索替换 (Ctrl+F)">
              <Search class="w-4 h-4" />
            </button>
            <button @click="toggleToolPanel('stats')" :class="['p-2 rounded-lg transition-colors', activeToolPanel === 'stats' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100']" title="统计信息">
              <BarChart3 class="w-4 h-4" />
            </button>
            <button @click="toggleToolPanel('cheatsheet')" :class="['p-2 rounded-lg transition-colors', activeToolPanel === 'cheatsheet' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100']" title="Markdown 速查表">
              <HelpCircle class="w-4 h-4" />
            </button>
            
            <div class="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            
            <!-- 操作按钮 -->
            <button @click="handleNew" class="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="新建">
              <FilePlus class="w-4 h-4" />
            </button>
            <button @click="handleOpen" class="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="打开">
              <FolderOpen class="w-4 h-4" />
            </button>
            <button @click="handleSave" class="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="保存">
              <Save class="w-4 h-4" />
            </button>
            <button @click="handleExport" class="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="导出">
              <Download class="w-4 h-4" />
            </button>
            
            <div class="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
            
            <button @click="handlePrint" class="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="打印">
              <Printer class="w-4 h-4" />
            </button>
            <button @click="toggleFullscreen" class="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors" :title="isFullscreen ? '退出全屏' : '全屏'">
              <Minimize2 v-if="isFullscreen" class="w-4 h-4" />
              <Maximize2 v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 格式工具栏 -->
    <div class="bg-white border-b border-slate-200 px-4 py-2">
      <div class="flex items-center gap-1 flex-wrap">
        <button @click="insertFormat('h1')" class="toolbar-btn" title="标题 1 (Ctrl+1)">
          <Heading1 class="w-4 h-4" />
        </button>
        <button @click="insertFormat('h2')" class="toolbar-btn" title="标题 2 (Ctrl+2)">
          <Heading2 class="w-4 h-4" />
        </button>
        <button @click="insertFormat('h3')" class="toolbar-btn" title="标题 3 (Ctrl+3)">
          <Heading3 class="w-4 h-4" />
        </button>
        <div class="w-px h-5 bg-slate-200 mx-1"></div>
        <button @click="insertFormat('bold')" class="toolbar-btn" title="粗体 (Ctrl+B)">
          <Bold class="w-4 h-4" />
        </button>
        <button @click="insertFormat('italic')" class="toolbar-btn" title="斜体 (Ctrl+I)">
          <Italic class="w-4 h-4" />
        </button>
        <button @click="insertFormat('strikethrough')" class="toolbar-btn" title="删除线">
          <Strikethrough class="w-4 h-4" />
        </button>
        <button @click="insertFormat('highlight')" class="toolbar-btn" title="高亮">
          <Highlighter class="w-4 h-4" />
        </button>
        <div class="w-px h-5 bg-slate-200 mx-1"></div>
        <button @click="insertFormat('quote')" class="toolbar-btn" title="引用">
          <Quote class="w-4 h-4" />
        </button>
        <button @click="insertFormat('code')" class="toolbar-btn" title="行内代码">
          <Code class="w-4 h-4" />
        </button>
        <button @click="insertFormat('codeblock')" class="toolbar-btn" title="代码块">
          <FileCode class="w-4 h-4" />
        </button>
        <div class="w-px h-5 bg-slate-200 mx-1"></div>
        <button @click="insertFormat('ul')" class="toolbar-btn" title="无序列表">
          <List class="w-4 h-4" />
        </button>
        <button @click="insertFormat('ol')" class="toolbar-btn" title="有序列表">
          <ListOrdered class="w-4 h-4" />
        </button>
        <button @click="insertFormat('task')" class="toolbar-btn" title="任务列表">
          <CheckSquare class="w-4 h-4" />
        </button>
        <div class="w-px h-5 bg-slate-200 mx-1"></div>
        <button @click="insertFormat('link')" class="toolbar-btn" title="链接 (Ctrl+K)">
          <Link class="w-4 h-4" />
        </button>
        <button @click="insertFormat('image')" class="toolbar-btn" title="图片">
          <ImageIcon class="w-4 h-4" />
        </button>
        <button @click="insertFormat('table')" class="toolbar-btn" title="表格">
          <Table class="w-4 h-4" />
        </button>
        <button @click="insertFormat('hr')" class="toolbar-btn" title="分割线">
          <Minus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 主内容区 -->
    <main class="flex-1 flex overflow-hidden">
      <!-- 编辑器面板 -->
      <div 
        v-show="currentView !== 'preview'"
        :class="[
          'flex flex-col bg-white border-r border-slate-200 transition-all duration-300',
          currentView === 'split' ? 'w-1/2' : 'flex-1'
        ]"
      >
        <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
          <span class="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Edit3 class="w-3.5 h-3.5" />
            编辑器
          </span>
          <span class="text-xs text-slate-400">
            {{ content.length }} 字符 · {{ lineCount }} 行
          </span>
        </div>
        <textarea
          ref="editorRef"
          v-model="content"
          @keydown="handleKeydown"
          @scroll="syncScroll"
          class="flex-1 w-full p-4 font-mono text-sm text-slate-800 bg-white resize-none focus:outline-none leading-relaxed"
          placeholder="在此输入 Markdown 内容..."
          spellcheck="false"
        ></textarea>
      </div>

      <!-- 预览面板 -->
      <div 
        v-show="currentView !== 'editor'"
        :class="[
          'flex flex-col bg-white overflow-hidden transition-all duration-300',
          currentView === 'split' ? 'w-1/2' : 'flex-1'
        ]"
      >
        <div class="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
          <span class="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Eye class="w-3.5 h-3.5" />
            预览
          </span>
          <button 
            @click="copyHtml" 
            class="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <Copy class="w-3 h-3" />
            {{ copied ? '已复制' : '复制 HTML' }}
          </button>
        </div>
        <div 
          ref="previewRef"
          @scroll="syncScroll"
          class="flex-1 overflow-y-auto p-6"
        >
          <article 
            class="prose prose-slate prose-sm sm:prose-base max-w-none
              prose-headings:font-bold prose-headings:text-slate-900
              prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-200 prose-h1:pb-2
              prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2
              prose-h3:text-lg
              prose-p:text-slate-700 prose-p:leading-relaxed
              prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-slate-900
              prose-code:text-emerald-600 prose-code:bg-emerald-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-slate-900 prose-pre:text-slate-100
              prose-blockquote:border-l-emerald-500 prose-blockquote:bg-slate-50 prose-blockquote:py-1
              prose-img:rounded-xl prose-img:shadow-lg
              prose-table:border prose-table:border-slate-200
              prose-th:bg-slate-50 prose-th:border prose-th:border-slate-200 prose-th:px-3 prose-th:py-2
              prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-2
              prose-hr:border-slate-200
              prose-ul:list-disc prose-ol:list-decimal
              prose-li:text-slate-700"
            v-html="renderedContent"
          ></article>
          <div v-if="!content.trim()" class="text-center py-20 text-slate-400">
            <FileText class="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>开始输入 Markdown 内容</p>
            <p class="text-sm mt-1">预览将在此处显示</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部状态栏 -->
    <footer class="bg-white border-t border-slate-200 px-4 py-1.5">
      <div class="flex items-center justify-between text-xs text-slate-500">
        <div class="flex items-center gap-4">
          <span>Markdown</span>
          <span>UTF-8</span>
        </div>
        <div class="flex items-center gap-4">
          <span>行 {{ cursorLine }}, 列 {{ cursorColumn }}</span>
          <span>{{ wordCount }} 词</span>
          <span v-if="lastSaved" class="text-slate-400">
            上次保存: {{ lastSavedText }}
          </span>
        </div>
      </div>
    </footer>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".md,.markdown,.txt"
      @change="handleFileOpen"
      class="hidden"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { 
  ArrowLeft, FileEdit, FilePlus, FolderOpen, Save, Download,
  Heading1, Heading2, Heading3, Bold, Italic, Strikethrough,
  Quote, Code, FileCode, List, ListOrdered, CheckSquare,
  Link, ImageIcon, Table, Minus, Edit3, Eye, Copy, FileText,
  Columns, PanelLeft, PanelRight, ListTree, Search, BarChart3,
  HelpCircle, Printer, Maximize2, Minimize2, Highlighter
} from 'lucide-vue-next'

// 视图模式
const viewModes = [
  { key: 'split', name: '分栏', icon: Columns },
  { key: 'editor', name: '编辑', icon: PanelLeft },
  { key: 'preview', name: '预览', icon: PanelRight }
]
const currentView = ref('split')

// 工具面板
const activeToolPanel = ref<string | null>(null)
const toggleToolPanel = (panel: string) => {
  activeToolPanel.value = activeToolPanel.value === panel ? null : panel
}

// 全屏模式
const isFullscreen = ref(false)
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// 打印功能
const handlePrint = () => {
  window.print()
}

// 编辑器状态
const content = ref(`# 欢迎使用 Markdown 编辑器

这是一个支持**实时预览**的 Markdown 编辑器。

## 功能特点

- ✨ 左右分栏，实时预览
- 🎨 语法高亮显示
- ⌨️ 快捷键支持
- 💾 本地自动保存
- 📤 导出 Markdown 文件

## 代码示例

\`\`\`javascript
function hello() {
  console.log('Hello, Markdown!');
}
\`\`\`

## 表格示例

| 功能 | 快捷键 |
| --- | --- |
| 粗体 | Ctrl+B |
| 斜体 | Ctrl+I |
| 链接 | Ctrl+K |

## 引用

> Markdown 是一种轻量级标记语言，它允许人们使用易读易写的纯文本格式编写文档。

---

开始编辑吧！🚀
`)

const editorRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const copied = ref(false)
const lastSaved = ref<Date | null>(null)
const cursorLine = ref(1)
const cursorColumn = ref(1)

// 计算属性
const lineCount = computed(() => content.value.split('\n').length)
const wordCount = computed(() => {
  const text = content.value.trim()
  if (!text) return 0
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(w => w).length
  return chineseChars + englishWords
})

const lastSavedText = computed(() => {
  if (!lastSaved.value) return ''
  const now = new Date()
  const diff = Math.floor((now.getTime() - lastSaved.value.getTime()) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  return lastSaved.value.toLocaleTimeString()
})

// 渲染 Markdown
const renderedContent = computed(() => {
  if (!content.value.trim()) return ''
  const rawHtml = marked.parse(content.value)
  return DOMPurify.sanitize(rawHtml as string)
})

// 插入格式
const insertFormat = (type: string) => {
  if (!editorRef.value) return
  
  const textarea = editorRef.value
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = content.value.substring(start, end)
  
  let before = ''
  let after = ''
  let placeholder = ''
  let cursorOffset = 0
  
  switch (type) {
    case 'h1':
      before = '# '
      placeholder = '标题'
      break
    case 'h2':
      before = '## '
      placeholder = '标题'
      break
    case 'h3':
      before = '### '
      placeholder = '标题'
      break
    case 'bold':
      before = '**'
      after = '**'
      placeholder = '粗体文本'
      break
    case 'italic':
      before = '*'
      after = '*'
      placeholder = '斜体文本'
      break
    case 'strikethrough':
      before = '~~'
      after = '~~'
      placeholder = '删除线文本'
      break
    case 'highlight':
      before = '=='
      after = '=='
      placeholder = '高亮文本'
      break
    case 'quote':
      before = '> '
      placeholder = '引用内容'
      break
    case 'code':
      before = '`'
      after = '`'
      placeholder = '代码'
      break
    case 'codeblock':
      before = '```\n'
      after = '\n```'
      placeholder = '代码块'
      break
    case 'ul':
      before = '- '
      placeholder = '列表项'
      break
    case 'ol':
      before = '1. '
      placeholder = '列表项'
      break
    case 'task':
      before = '- [ ] '
      placeholder = '任务项'
      break
    case 'link':
      before = '['
      after = '](url)'
      placeholder = '链接文本'
      cursorOffset = -5
      break
    case 'image':
      before = '!['
      after = '](url)'
      placeholder = '图片描述'
      cursorOffset = -5
      break
    case 'table':
      before = '| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |'
      placeholder = ''
      break
    case 'hr':
      before = '\n---\n'
      placeholder = ''
      break
  }
  
  const insertText = selected || placeholder
  const newText = content.value.substring(0, start) + before + insertText + after + content.value.substring(end)
  content.value = newText
  
  nextTick(() => {
    const newPos = start + before.length + insertText.length + cursorOffset
    textarea.focus()
    textarea.setSelectionRange(
      selected ? newPos + after.length : start + before.length,
      selected ? newPos + after.length : start + before.length + insertText.length
    )
  })
}

// 快捷键处理
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 'b':
        e.preventDefault()
        insertFormat('bold')
        break
      case 'i':
        e.preventDefault()
        insertFormat('italic')
        break
      case 'k':
        e.preventDefault()
        insertFormat('link')
        break
      case 's':
        e.preventDefault()
        handleSave()
        break
      case '1':
        e.preventDefault()
        insertFormat('h1')
        break
      case '2':
        e.preventDefault()
        insertFormat('h2')
        break
      case '3':
        e.preventDefault()
        insertFormat('h3')
        break
    }
  }
  
  if (e.key === 'Tab') {
    e.preventDefault()
    const textarea = editorRef.value
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    content.value = content.value.substring(0, start) + '  ' + content.value.substring(end)
    nextTick(() => {
      textarea.setSelectionRange(start + 2, start + 2)
    })
  }
}

// 更新光标位置
const updateCursorPosition = () => {
  if (!editorRef.value) return
  const textarea = editorRef.value
  const text = textarea.value.substring(0, textarea.selectionStart)
  const lines = text.split('\n')
  cursorLine.value = lines.length
  cursorColumn.value = lines[lines.length - 1].length + 1
}

// 同步滚动
const syncScroll = (e: Event) => {
  const source = e.target as HTMLElement
  const target = source === editorRef.value ? previewRef.value : editorRef.value
  if (!target || currentView.value !== 'split') return
  
  const scrollRatio = source.scrollTop / (source.scrollHeight - source.clientHeight)
  target.scrollTop = scrollRatio * (target.scrollHeight - target.clientHeight)
}

// 文件操作
const handleNew = () => {
  if (content.value && !confirm('确定要新建文档吗？当前内容将被清空。')) return
  content.value = ''
  lastSaved.value = null
}

const handleOpen = () => {
  fileInputRef.value?.click()
}

const handleFileOpen = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    content.value = e.target?.result as string
    lastSaved.value = new Date()
  }
  reader.readAsText(file)
  input.value = ''
}

const handleSave = () => {
  localStorage.setItem('markdown_editor_content', content.value)
  lastSaved.value = new Date()
}

const handleExport = async () => {
  const blob = new Blob([content.value], { type: 'text/markdown;charset=utf-8' })
  
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: 'document.md',
        types: [{
          description: 'Markdown 文件',
          accept: { 'text/markdown': ['.md'] }
        }]
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
    } catch (err) {
      // 用户取消
    }
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.md'
    a.click()
    URL.revokeObjectURL(url)
  }
}

// 复制 HTML
const copyHtml = async () => {
  try {
    await navigator.clipboard.writeText(renderedContent.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 自动保存
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
watch(content, () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    localStorage.setItem('markdown_editor_content', content.value)
    lastSaved.value = new Date()
  }, 5000)
})

// 加载保存的内容
onMounted(() => {
  const saved = localStorage.getItem('markdown_editor_content')
  if (saved) {
    content.value = saved
    lastSaved.value = new Date()
  }
  
  editorRef.value?.addEventListener('click', updateCursorPosition)
  editorRef.value?.addEventListener('keyup', updateCursorPosition)
})

onUnmounted(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})
</script>

<style scoped>
.toolbar-btn {
  @apply p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors;
}

.toolbar-btn:active {
  @apply bg-slate-200;
}

textarea {
  tab-size: 2;
  -moz-tab-size: 2;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>