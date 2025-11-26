<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Clock, Calendar, Edit, Save, X, Heading1, Heading2, Quote, List, ListOrdered, Image, Link, Bold, Italic, Code, Table, Download } from 'lucide-vue-next';
import type { MarkdownFile } from '../types';

const props = defineProps<{
  file: MarkdownFile;
  className?: string;
  isEditMode: boolean;
}>();

const emit = defineEmits<{
  'update-content': [fileId: string, content: string];
  'toggle-edit-mode': [];
  'update-title': [title: string];
  'export-file': [file: MarkdownFile];
}>();

const editContent = ref(props.file.content);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const hasUnsavedChanges = ref(false);

// 当文件改变时，更新编辑内容
watch(() => props.file, (newFile) => {
  editContent.value = newFile.content;
}, { immediate: true });

// 当编辑模式改变时，确保编辑内容同步
watch(() => props.isEditMode, (newMode) => {
  if (newMode) {
    editContent.value = props.file.content;
    lastSavedContent.value = props.file.content;
  }
});

// 导出文件功能
const handleExport = async () => {
  // 设置默认文件名，确保有.md扩展名
  let fileName = props.file.name;
  if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown') && !fileName.endsWith('.txt')) {
    fileName += '.md';
  }
  
  try {
    // 检查浏览器是否支持File System Access API
    if ('showSaveFilePicker' in window) {
      // 创建Blob对象
      const blob = new Blob([props.file.content], { type: 'text/markdown;charset=utf-8' });
      
      // 显示文件保存对话框
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          { 
            description: 'Markdown文件', 
            accept: { 
              'text/markdown': ['.md', '.markdown'],
              'text/plain': ['.txt']
            } 
          }
        ]
      });
      
      // 写入文件
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      // 触发导出事件，便于父组件处理
      emit('export-file', props.file);
    } else {
      // 兼容不支持File System Access API的浏览器
      // 创建下载链接
      const link = document.createElement('a');
      const url = URL.createObjectURL(new Blob([props.file.content], { type: 'text/markdown;charset=utf-8' }));
      
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      // 添加到文档并触发点击
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // 触发导出事件，便于父组件处理
      emit('export-file', props.file);
    }
  } catch (err) {
    // 用户取消保存或发生错误
    console.error('导出文件失败:', err);
  }
};

const handleSave = () => {
  emit('update-content', props.file.id, editContent.value);
  hasUnsavedChanges.value = false;
  emit('toggle-edit-mode');
};

// 获取文本框选中内容并进行格式化
const formatText = (formatType: string) => {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = editContent.value.substring(start, end);
  
  let formattedText = '';
  let newCursorPosition = start;
  
  switch (formatType) {
    case 'h1':
      formattedText = `# ${selectedText || '标题'}`;
      newCursorPosition = start + 2 + (selectedText ? selectedText.length : 2);
      break;
    case 'h2':
      formattedText = `## ${selectedText || '二级标题'}`;
      newCursorPosition = start + 3 + (selectedText ? selectedText.length : 4);
      break;
    case 'quote':
      formattedText = `> ${selectedText || '引用内容'}`;
      newCursorPosition = start + 2 + (selectedText ? selectedText.length : 4);
      break;
    case 'bullet':
      formattedText = `- ${selectedText || '项目'}`;
      newCursorPosition = start + 2 + (selectedText ? selectedText.length : 2);
      break;
    case 'numbered':
      formattedText = `1. ${selectedText || '步骤'}`;
      newCursorPosition = start + 3 + (selectedText ? selectedText.length : 2);
      break;
    case 'bold':
      formattedText = `**${selectedText || '粗体文本'}**`;
      newCursorPosition = start + 2 + (selectedText ? selectedText.length : 4);
      break;
    case 'italic':
      formattedText = `*${selectedText || '斜体文本'}*`;
      newCursorPosition = start + 1 + (selectedText ? selectedText.length : 3);
      break;
    case 'code':
      formattedText = `\`${selectedText || '代码'}\``;
      newCursorPosition = start + 1 + (selectedText ? selectedText.length : 2);
      break;
    case 'link':
      formattedText = `[${selectedText || '链接文本'}](https://)`;
      newCursorPosition = start + (selectedText ? selectedText.length + 3 : 10);
      break;
    case 'image':
      formattedText = `![${selectedText || '图片描述'}](https://)`;
      newCursorPosition = start + (selectedText ? selectedText.length + 4 : 11);
      break;
    case 'table':
      formattedText = `| 表头1 | 表头2 |\n| --- | --- |\n| 单元格1 | 单元格2 |`;
      newCursorPosition = start + formattedText.length;
      break;
    default:
      return;
  }
  
  // 替换选中内容
  editContent.value = 
    editContent.value.substring(0, start) + 
    formattedText + 
    editContent.value.substring(end);
  
  // 重新设置光标位置
  textarea.focus();
  setTimeout(() => {
    textarea.setSelectionRange(newCursorPosition, newCursorPosition);
  }, 0);
  
  // 标记有未保存的更改
  hasUnsavedChanges.value = true;
};

const handleCancel = () => {
  editContent.value = props.file.content;
  emit('toggle-edit-mode');
};

// 添加自动保存功能，避免编辑内容丢失
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const lastSavedContent = ref(props.file.content);

const handleContentChange = () => {
  hasUnsavedChanges.value = true;
  // 清除之前的定时器
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  // 设置新的自动保存定时器（3秒后自动保存）
  autoSaveTimer = setTimeout(() => {
    if (editContent.value !== lastSavedContent.value) {
      emit('update-content', props.file.id, editContent.value);
      lastSavedContent.value = editContent.value;
      hasUnsavedChanges.value = false;
    }
  }, 3000);
};

// 组件卸载时清除定时器
import { onUnmounted } from 'vue';
onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
});

const parsedContent = computed(() => {
  const rawHtml = marked.parse(props.file.content);
  return DOMPurify.sanitize(rawHtml as string);
});

const wordCount = computed(() => props.file.content.trim().split(/\s+/).length);
const readTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 200)));
const dateStr = computed(() => new Date(props.file.lastModified).toLocaleDateString(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
}));

// 移除标题编辑功能，保持标题只读
// 处理过长标题的显示，提取文件名（不带扩展名）
const displayTitle = computed(() => {
  const name = props.file.name.replace(/\.(md|markdown|txt)$/i, '');
  return name;
});
</script>

<template>
  <div class="h-full w-full overflow-y-auto bg-gradient-to-b from-brand-50 to-white" :class="className">
    <div class="max-w-4xl mx-auto px-4 md:px-6 lg:px-12 py-4 md:py-6 lg:py-10 min-h-[100%] flex flex-col">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 lg:p-8 flex-grow overflow-hidden">
      
      <!-- Header Metadata -->
        <div class="mb-6 pb-6 border-b border-slate-100 flex flex-col gap-4">
          <div class="relative mb-4 w-full md:w-auto">
            <div>
              <h1 
                class="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-normal whitespace-pre-wrap break-words break-all block"
                title="文件标题（不可编辑）"
              >
                {{ displayTitle }}
              </h1>
            </div>
          </div>
        <div class="flex flex-col gap-3 text-sm text-slate-500 font-medium">
          <div class="flex items-center gap-2">
            <Calendar class="w-4 h-4" />
            <span>{{ dateStr }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4" />
            <span>{{ readTime }} min read</span>
          </div>
           <div class="flex items-center gap-2">
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{{ wordCount }} words</span>
          </div>
        </div>
      </div>

      <!-- 编辑模式工具栏 -->
      <div v-if="isEditMode" class="mb-4 pb-3 border-b border-slate-100">
        <div class="flex flex-wrap gap-2 mb-4">
          <button @click="formatText('h1')" class="p-2 rounded hover:bg-slate-100" title="标题 1">
            <Heading1 class="w-4 h-4" />
          </button>
          <button @click="formatText('h2')" class="p-2 rounded hover:bg-slate-100" title="标题 2">
            <Heading2 class="w-4 h-4" />
          </button>
          <span class="w-px h-6 bg-slate-200 mx-1"></span>
          <button @click="formatText('quote')" class="p-2 rounded hover:bg-slate-100" title="引用">
            <Quote class="w-4 h-4" />
          </button>
          <button @click="formatText('bullet')" class="p-2 rounded hover:bg-slate-100" title="无序列表">
            <List class="w-4 h-4" />
          </button>
          <button @click="formatText('numbered')" class="p-2 rounded hover:bg-slate-100" title="有序列表">
            <ListOrdered class="w-4 h-4" />
          </button>
          <span class="w-px h-6 bg-slate-200 mx-1"></span>
          <button @click="formatText('bold')" class="p-2 rounded hover:bg-slate-100" title="粗体">
            <Bold class="w-4 h-4" />
          </button>
          <button @click="formatText('italic')" class="p-2 rounded hover:bg-slate-100" title="斜体">
            <Italic class="w-4 h-4" />
          </button>
          <button @click="formatText('code')" class="p-2 rounded hover:bg-slate-100" title="行内代码">
            <Code class="w-4 h-4" />
          </button>
          <span class="w-px h-6 bg-slate-200 mx-1"></span>
          <button @click="formatText('link')" class="p-2 rounded hover:bg-slate-100" title="链接">
            <Link class="w-4 h-4" />
          </button>
          <button @click="formatText('image')" class="p-2 rounded hover:bg-slate-100" title="图片">
            <Image class="w-4 h-4" />
          </button>
          <button @click="formatText('table')" class="p-2 rounded hover:bg-slate-100" title="表格">
            <Table class="w-4 h-4" />
          </button>
        </div>
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div class="flex items-center gap-2 text-slate-500">
            <Edit class="w-4 h-4" />
            <span class="font-medium">编辑模式</span>
            <span v-if="hasUnsavedChanges" class="text-xs text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">未保存</span>
          </div>
          <div class="flex items-center gap-3">
            <button 
              @click="handleCancel"
              class="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200 transform hover:-translate-y-0.5"
              :disabled="!isEditMode"
            >
              <X class="w-4 h-4 mr-1 inline" /> 取消
            </button>
            <button 
              @click="handleSave"
              class="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm hover:shadow"
            >
              <Save class="w-4 h-4 mr-1 inline" /> 保存
            </button>
          </div>
        </div>
      </div>

      <!-- 预览模式下的编辑和导出按钮 -->
      <div v-else class="mb-6 text-right">
        <div class="flex items-center gap-3 justify-end">
          <button 
            @click="emit('toggle-edit-mode')"
            class="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2 shadow-sm"
          >
            <Edit class="w-4 h-4" /> 编辑文档
          </button>
          <button 
            @click="handleExport"
            class="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200 transform hover:-translate-y-0.5 flex items-center gap-2 shadow-sm"
          >
            <Download class="w-4 h-4" /> 导出
          </button>
        </div>
      </div>

      <!-- Markdown Content or Editor -->
      <div v-if="isEditMode">
        <textarea
          ref="textareaRef"
          v-model="editContent"
          @input="handleContentChange"
          class="w-full min-h-[60vh] max-h-[calc(100vh-350px)] p-5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-800 font-mono text-sm resize-none transition-all shadow-sm overflow-y-auto word-break-break-all whitespace-pre-wrap"
          placeholder="在此编辑您的Markdown内容..."
          spellcheck="false"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
        ></textarea>
      </div>
      <article 
        v-else
        class="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg overflow-x-hidden break-words"
        v-html="parsedContent"
      >
      </article>

      <!-- Footer -->
      <div class="mt-10 pt-6 border-t border-slate-100 text-center">
        <p v-if="!isEditMode" class="text-slate-400 italic text-sm">End of document</p>
        <div v-else class="text-sm text-slate-500">
          {{ editContent.length }} 字符 | {{ editContent.trim().split(/\s+/).length }} 词
        </div>
      </div>
      </div>
    </div>
  </div>
</template>
