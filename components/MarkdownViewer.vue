
<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  Clock, Calendar, Edit, Save, X, Heading1, Heading2, Heading3, Quote, List, ListOrdered,
  Image, Link, Bold, Italic, Code, Table, Download, Strikethrough,
  Highlighter, FileCode, CheckSquare, Minus, Undo2, Redo2, Search,
  ChevronUp, ChevronDown, XCircle, Columns, FileText, Eye
} from 'lucide-vue-next';
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

// ==================== 预览模式 ====================
type PreviewMode = 'edit' | 'preview' | 'split';
const previewMode = ref<PreviewMode>('edit');
const previewRef = ref<HTMLElement | null>(null);
const editorContainerRef = ref<HTMLElement | null>(null);

// 实时预览内容
const livePreviewContent = computed(() => {
  const rawHtml = marked.parse(editContent.value);
  return DOMPurify.sanitize(rawHtml as string);
});

// 同步滚动
const syncScroll = (source: 'editor' | 'preview') => {
  if (previewMode.value !== 'split') return;
  
  const editor = textareaRef.value;
  const preview = previewRef.value;
  
  if (!editor || !preview) return;
  
  if (source === 'editor') {
    const scrollRatio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight);
  } else {
    const scrollRatio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
    editor.scrollTop = scrollRatio * (editor.scrollHeight - editor.clientHeight);
  }
};

// 处理编辑器滚动
const handleEditorScroll = () => {
  syncScroll('editor');
};

// 处理预览区滚动
const handlePreviewScroll = () => {
  syncScroll('preview');
};

// ==================== 撤销/重做功能 ====================
const historyStack = ref<string[]>([]);
const historyIndex = ref(-1);
const maxHistorySize = 100;

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

const pushHistory = (content: string) => {
  if (historyIndex.value < historyStack.value.length - 1) {
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  }
  
  if (historyStack.value[historyStack.value.length - 1] !== content) {
    historyStack.value.push(content);
    if (historyStack.value.length > maxHistorySize) {
      historyStack.value.shift();
    }
    historyIndex.value = historyStack.value.length - 1;
  }
};

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    editContent.value = historyStack.value[historyIndex.value];
    hasUnsavedChanges.value = true;
  }
};

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    editContent.value = historyStack.value[historyIndex.value];
    hasUnsavedChanges.value = true;
  }
};

// ==================== 搜索替换功能 ====================
const showSearchPanel = ref(false);
const searchQuery = ref('');
const replaceQuery = ref('');
const searchOptions = ref({
  caseSensitive: false,
  useRegex: false
});
const searchResults = ref<{ start: number; end: number }[]>([]);
const currentSearchIndex = ref(0);

const performSearch = () => {
  if (!searchQuery.value) {
    searchResults.value = [];
    currentSearchIndex.value = 0;
    return;
  }

  const results: { start: number; end: number }[] = [];
  const content = editContent.value;
  
  try {
    let regex: RegExp;
    if (searchOptions.value.useRegex) {
      regex = new RegExp(searchQuery.value, searchOptions.value.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, searchOptions.value.caseSensitive ? 'g' : 'gi');
    }

    let match;
    while ((match = regex.exec(content)) !== null) {
      results.push({ start: match.index, end: match.index + match[0].length });
    }
  } catch (e) {
    // 正则表达式无效
  }

  searchResults.value = results;
  currentSearchIndex.value = results.length > 0 ? 0 : -1;
  
  if (results.length > 0) {
    scrollToSearchResult(0);
  }
};

const scrollToSearchResult = (index: number) => {
  if (!textareaRef.value || searchResults.value.length === 0) return;
  
  const result = searchResults.value[index];
  textareaRef.value.focus();
  textareaRef.value.setSelectionRange(result.start, result.end);
  
  const textarea = textareaRef.value;
  const textBeforeSelection = editContent.value.substring(0, result.start);
  const lines = textBeforeSelection.split('\n');
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
  textarea.scrollTop = (lines.length - 1) * lineHeight - textarea.clientHeight / 2;
};

const findNext = () => {
  if (searchResults.value.length === 0) return;
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length;
  scrollToSearchResult(currentSearchIndex.value);
};

const findPrev = () => {
  if (searchResults.value.length === 0) return;
  currentSearchIndex.value = (currentSearchIndex.value - 1 + searchResults.value.length) % searchResults.value.length;
  scrollToSearchResult(currentSearchIndex.value);
};

const replaceCurrent = () => {
  if (searchResults.value.length === 0 || currentSearchIndex.value < 0) return;
  
  const result = searchResults.value[currentSearchIndex.value];
  const before = editContent.value.substring(0, result.start);
  const after = editContent.value.substring(result.end);
  
  pushHistory(editContent.value);
  editContent.value = before + replaceQuery.value + after;
  hasUnsavedChanges.value = true;
  
  nextTick(() => {
    performSearch();
  });
};

const replaceAll = () => {
  if (searchResults.value.length === 0) return;
  
  pushHistory(editContent.value);
  
  try {
    let regex: RegExp;
    if (searchOptions.value.useRegex) {
      regex = new RegExp(searchQuery.value, searchOptions.value.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, searchOptions.value.caseSensitive ? 'g' : 'gi');
    }
    
    editContent.value = editContent.value.replace(regex, replaceQuery.value);
    hasUnsavedChanges.value = true;
    
    nextTick(() => {
      performSearch();
    });
  } catch (e) {
    // 正则表达式无效
  }
};

const toggleSearchPanel = () => {
  showSearchPanel.value = !showSearchPanel.value;
};

// 当文件改变时，更新编辑内容
watch(() => props.file, (newFile) => {
  editContent.value = newFile.content;
  historyStack.value = [newFile.content];
  historyIndex.value = 0;
}, { immediate: true });

// 当编辑模式改变时，确保编辑内容同步
watch(() => props.isEditMode, (newMode) => {
  if (newMode) {
    editContent.value = props.file.content;
    lastSavedContent.value = props.file.content;
    historyStack.value = [props.file.content];
    historyIndex.value = 0;
    previewMode.value = 'edit'; // 默认进入纯编辑模式
  }
});

// 处理预览区代码块
const processPreviewCodeBlocks = () => {
  if (!previewRef.value) return;
  
  const preElements = previewRef.value.querySelectorAll('pre');
  preElements.forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block-wrapper')) return;
    
    const codeElement = pre.querySelector('code');
    const code = codeElement?.textContent || '';
    
    let language = 'Code';
    if (codeElement) {
      const classList = codeElement.className.split(' ');
      for (const cls of classList) {
        if (cls.startsWith('language-')) {
          language = cls.replace('language-', '').toUpperCase();
          break;
        }
      }
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper relative my-4';
    
    const header = document.createElement('div');
    header.className = 'code-block-header flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 rounded-t-lg';
    header.innerHTML = `
      <span class="text-xs font-medium text-slate-600">${language}</span>
      <button class="copy-btn flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors">
        <svg class="w-4 h-4 copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <svg class="w-4 h-4 check-icon hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="copy-text">复制</span>
      </button>
    `;
    
    const copyBtn = header.querySelector('.copy-btn');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        const copyIcon = copyBtn.querySelector('.copy-icon');
        const checkIcon = copyBtn.querySelector('.check-icon');
        const copyText = copyBtn.querySelector('.copy-text');
        copyIcon?.classList.add('hidden');
        checkIcon?.classList.remove('hidden');
        if (copyText) copyText.textContent = '已复制';
        setTimeout(() => {
          copyIcon?.classList.remove('hidden');
          checkIcon?.classList.add('hidden');
          if (copyText) copyText.textContent = '复制';
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    });
    
    pre.style.borderTopLeftRadius = '0';
    pre.style.borderTopRightRadius = '0';
    pre.style.marginTop = '0';
    
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
};

// 监听预览内容变化，处理代码块
watch(livePreviewContent, () => {
  if (previewMode.value === 'preview' || previewMode.value === 'split') {
    nextTick(() => processPreviewCodeBlocks());
  }
});

// 监听预览模式变化
watch(previewMode, (newMode) => {
  if (newMode === 'preview' || newMode === 'split') {
    nextTick(() => processPreviewCodeBlocks());
  }
});

// 导出文件功能
const handleExport = async () => {
  let fileName = props.file.name;
  if (!fileName.endsWith('.md') && !fileName.endsWith('.markdown') && !fileName.endsWith('.txt')) {
    fileName += '.md';
  }
  
  try {
    if ('showSaveFilePicker' in window) {
      const blob = new Blob([props.file.content], { type: 'text/markdown;charset=utf-8' });
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'Markdown文件', accept: { 'text/markdown': ['.md', '.markdown'], 'text/plain': ['.txt'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      emit('export-file', props.file);
    } else {
      const link = document.createElement('a');
      const url = URL.createObjectURL(new Blob([props.file.content], { type: 'text/markdown;charset=utf-8' }));
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      emit('export-file', props.file);
    }
  } catch (err) {
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
  
  pushHistory(editContent.value);
  
  let formattedText = '';
  let selectStart = start;
  let selectEnd = start;
  
  switch (formatType) {
    case 'h1':
      formattedText = `# ${selectedText || '标题'}`;
      selectStart = start + 2;
      selectEnd = start + formattedText.length;
      break;
    case 'h2':
      formattedText = `## ${selectedText || '二级标题'}`;
      selectStart = start + 3;
      selectEnd = start + formattedText.length;
      break;
    case 'h3':
      formattedText = `### ${selectedText || '三级标题'}`;
      selectStart = start + 4;
      selectEnd = start + formattedText.length;
      break;
    case 'quote':
      formattedText = `> ${selectedText || '引用内容'}`;
      selectStart = start + 2;
      selectEnd = start + formattedText.length;
      break;
    case 'bullet':
      formattedText = `- ${selectedText || '列表项'}`;
      selectStart = start + 2;
      selectEnd = start + formattedText.length;
      break;
    case 'numbered':
      formattedText = `1. ${selectedText || '列表项'}`;
      selectStart = start + 3;
      selectEnd = start + formattedText.length;
      break;
    case 'task':
      formattedText = `- [ ] ${selectedText || '任务项'}`;
      selectStart = start + 6;
      selectEnd = start + formattedText.length;
      break;
    case 'bold':
      formattedText = `**${selectedText || '粗体文本'}**`;
      selectStart = start + 2;
      selectEnd = start + formattedText.length - 2;
      break;
    case 'italic':
      formattedText = `*${selectedText || '斜体文本'}*`;
      selectStart = start + 1;
      selectEnd = start + formattedText.length - 1;
      break;
    case 'strikethrough':
      formattedText = `~~${selectedText || '删除线'}~~`;
      selectStart = start + 2;
      selectEnd = start + formattedText.length - 2;
      break;
    case 'highlight':
      formattedText = `==${selectedText || '高亮'}==`;
      selectStart = start + 2;
      selectEnd = start + formattedText.length - 2;
      break;
    case 'code':
      formattedText = `\`${selectedText || '代码'}\``;
      selectStart = start + 1;
      selectEnd = start + formattedText.length - 1;
      break;
    case 'codeblock':
      formattedText = `\`\`\`\n${selectedText || '代码块'}\n\`\`\``;
      selectStart = start + 4;
      selectEnd = start + formattedText.length - 4;
      break;
    case 'link':
      formattedText = `[${selectedText || '链接文本'}](https://)`;
      selectStart = start + 1;
      selectEnd = start + (selectedText ? selectedText.length + 1 : 5);
      break;
    case 'image':
      formattedText = `![${selectedText || '图片描述'}](https://)`;
      selectStart = start + 2;
      selectEnd = start + (selectedText ? selectedText.length + 2 : 6);
      break;
    case 'table':
      formattedText = `| 表头1 | 表头2 |\n| --- | --- |\n| 单元格 | 单元格 |`;
      selectStart = start + 2;
      selectEnd = start + 5;
      break;
    case 'hr':
      formattedText = `\n---\n`;
      selectStart = start + formattedText.length;
      selectEnd = selectStart;
      break;
    default:
      return;
  }
  
  editContent.value = editContent.value.substring(0, start) + formattedText + editContent.value.substring(end);
  
  nextTick(() => {
    textarea.focus();
    textarea.setSelectionRange(selectStart, selectEnd);
  });
  
  hasUnsavedChanges.value = true;
};

// 快捷键处理
const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault();
        formatText('bold');
        break;
      case 'i':
        e.preventDefault();
        formatText('italic');
        break;
      case 'k':
        e.preventDefault();
        formatText('link');
        break;
      case 's':
        e.preventDefault();
        handleSave();
        break;
      case 'z':
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
        break;
      case 'y':
        e.preventDefault();
        redo();
        break;
      case 'f':
        e.preventDefault();
        toggleSearchPanel();
        break;
      case '1':
        e.preventDefault();
        formatText('h1');
        break;
      case '2':
        e.preventDefault();
        formatText('h2');
        break;
      case '3':
        e.preventDefault();
        formatText('h3');
        break;
    }
  }
  
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = textareaRef.value;
    if (!textarea) return;
    
    pushHistory(editContent.value);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    editContent.value = editContent.value.substring(0, start) + '  ' + editContent.value.substring(end);
    
    nextTick(() => {
      textarea.setSelectionRange(start + 2, start + 2);
    });
    hasUnsavedChanges.value = true;
  }
};

const handleCancel = () => {
  editContent.value = props.file.content;
  emit('toggle-edit-mode');
};

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const lastSavedContent = ref(props.file.content);
let historyTimer: ReturnType<typeof setTimeout> | null = null;

const handleContentChange = () => {
  hasUnsavedChanges.value = true;
  
  if (historyTimer) clearTimeout(historyTimer);
  historyTimer = setTimeout(() => {
    pushHistory(editContent.value);
  }, 500);
  
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if (editContent.value !== lastSavedContent.value) {
      emit('update-content', props.file.id, editContent.value);
      lastSavedContent.value = editContent.value;
      hasUnsavedChanges.value = false;
    }
  }, 3000);
};

onUnmounted(() => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  if (historyTimer) clearTimeout(historyTimer);
});

const parsedContent = computed(() => {
  const rawHtml = marked.parse(props.file.content);
  return DOMPurify.sanitize(rawHtml as string);
});

const articleRef = ref<HTMLElement | null>(null);

const processCodeBlocks = () => {
  if (!articleRef.value) return;
  
  const preElements = articleRef.value.querySelectorAll('pre');
  preElements.forEach((pre, index) => {
    if (pre.parentElement?.classList.contains('code-block-wrapper')) return;
    
    const codeElement = pre.querySelector('code');
    const code = codeElement?.textContent || '';
    
    let language = 'Code';
    if (codeElement) {
      const classList = codeElement.className.split(' ');
      for (const cls of classList) {
        if (cls.startsWith('language-')) {
          language = cls.replace('language-', '').toUpperCase();
          break;
        }
      }
    }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper relative my-4';
    
    const header = document.createElement('div');
    header.className = 'code-block-header flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 rounded-t-lg';
    header.innerHTML = `
      <span class="text-xs font-medium text-slate-600">${language}</span>
      <button class="copy-btn flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors">
        <svg class="w-4 h-4 copy-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <svg class="w-4 h-4 check-icon hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="copy-text">复制</span>
      </button>
    `;
    
    const copyBtn = header.querySelector('.copy-btn');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        const copyIcon = copyBtn.querySelector('.copy-icon');
        const checkIcon = copyBtn.querySelector('.check-icon');
        const copyText = copyBtn.querySelector('.copy-text');
        copyIcon?.classList.add('hidden');
        checkIcon?.classList.remove('hidden');
        if (copyText) copyText.textContent = '已复制';
        setTimeout(() => {
          copyIcon?.classList.remove('hidden');
          checkIcon?.classList.add('hidden');
          if (copyText) copyText.textContent = '复制';
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    });
    
    pre.style.borderTopLeftRadius = '0';
    pre.style.borderTopRightRadius = '0';
    pre.style.marginTop = '0';
    
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);
  });
};

watch(() => props.file.content, () => {
  if (!props.isEditMode) {
    nextTick(() => processCodeBlocks());
  }
});

watch(() => props.isEditMode, (newMode) => {
  if (!newMode) {
    nextTick(() => processCodeBlocks());
  }
});

onMounted(() => {
  if (!props.isEditMode) {
    nextTick(() => processCodeBlocks());
  }
});

const stats = computed(() => {
  const content = props.isEditMode ? editContent.value : props.file.content;
  const text = content.trim();
  const characters = text.length;
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = text.replace(/[\u4e00-\u9fa5]/g, ' ').trim().split(/\s+/).filter(w => w).length;
  const words = chineseChars + englishWords;
  const lines = text ? text.split('\n').length : 0;
  const readTime = Math.max(1, Math.ceil(words / 300));
  return { characters, words, lines, readTime };
});

const wordCount = computed(() => stats.value.words);
const readTime = computed(() => stats.value.readTime);
const dateStr = computed(() => new Date(props.file.lastModified).toLocaleDateString(undefined, {
  year: 'numeric', month: 'long', day: 'numeric'
}));

const displayTitle = computed(() => props.file.name.replace(/\.(md|markdown|txt)$/i, ''));

// 根据模式计算容器宽度
const containerWidthClass = computed(() => {
  if (!props.isEditMode) {
    return 'max-w-3xl mx-auto'; // 阅读模式使用 A4 纸宽度，居中显示
  }
  return 'w-full'; // 编辑模式全宽
});
</script>

<template>
  <div class="h-full w-full overflow-y-auto bg-gradient-to-b from-slate-50/80 to-white" :class="className">
    <div :class="[containerWidthClass, 'px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8 min-h-[100%] flex flex-col transition-all duration-300']">
      <div class="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-4 md:p-6 lg:p-8 flex-grow overflow-hidden">
        <!-- Header -->
        <div class="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-slate-100">
          <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-normal whitespace-pre-wrap break-words break-all mb-3 sm:mb-4">{{ displayTitle }}</h1>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-slate-500 font-medium">
            <div class="flex items-center gap-1.5 sm:gap-2"><Calendar class="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>{{ dateStr }}</span></div>
            <div class="flex items-center gap-1.5 sm:gap-2"><Clock class="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>{{ readTime }} 分钟</span></div>
            <div class="flex items-center gap-1.5 sm:gap-2"><span class="w-1 h-1 rounded-full bg-slate-300"></span><span>{{ wordCount }} 字</span></div>
          </div>
        </div>

        <!-- 编辑模式工具栏 -->
        <div v-if="isEditMode" class="mb-3 sm:mb-4 pb-3 border-b border-slate-100">
          <!-- 搜索替换面板 -->
          <div v-if="showSearchPanel" class="mb-3 sm:mb-4 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
              <input v-model="searchQuery" @input="performSearch" type="text" placeholder="搜索..." class="flex-1 px-3 py-2 sm:py-1.5 text-sm border border-slate-200 rounded-lg sm:rounded focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <div class="flex items-center justify-between sm:justify-start gap-2">
                <span v-if="searchQuery" class="text-xs text-slate-500">{{ searchResults.length > 0 ? `${currentSearchIndex + 1}/${searchResults.length}` : '0/0' }}</span>
                <div class="flex items-center gap-1">
                  <button @click="findPrev" :disabled="searchResults.length === 0" class="p-2 sm:p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 active:bg-slate-300"><ChevronUp class="w-5 h-5 sm:w-4 sm:h-4" /></button>
                  <button @click="findNext" :disabled="searchResults.length === 0" class="p-2 sm:p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 active:bg-slate-300"><ChevronDown class="w-5 h-5 sm:w-4 sm:h-4" /></button>
                  <button @click="showSearchPanel = false" class="p-2 sm:p-1.5 rounded hover:bg-slate-200 active:bg-slate-300"><XCircle class="w-5 h-5 sm:w-4 sm:h-4" /></button>
                </div>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
              <input v-model="replaceQuery" type="text" placeholder="替换为..." class="flex-1 px-3 py-2 sm:py-1.5 text-sm border border-slate-200 rounded-lg sm:rounded focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <div class="flex items-center gap-2">
                <button @click="replaceCurrent" :disabled="searchResults.length === 0" class="flex-1 sm:flex-none px-4 py-2 sm:px-3 sm:py-1.5 text-sm sm:text-xs bg-brand-600 text-white rounded-lg sm:rounded hover:bg-brand-700 disabled:opacity-50 active:bg-brand-800">替换</button>
                <button @click="replaceAll" :disabled="searchResults.length === 0" class="flex-1 sm:flex-none px-4 py-2 sm:px-3 sm:py-1.5 text-sm sm:text-xs bg-slate-200 text-slate-700 rounded-lg sm:rounded hover:bg-slate-300 disabled:opacity-50 active:bg-slate-400">全部替换</button>
              </div>
            </div>
            <div class="flex items-center gap-4 mt-2">
              <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input v-model="searchOptions.caseSensitive" @change="performSearch" type="checkbox" class="w-4 h-4 rounded border-slate-300" />区分大小写
              </label>
              <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input v-model="searchOptions.useRegex" @change="performSearch" type="checkbox" class="w-4 h-4 rounded border-slate-300" />正则表达式
              </label>
            </div>
          </div>

          <!-- 格式工具栏 - 手机端可横向滚动 -->
          <div class="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 md:mx-0 md:px-0 mb-3 sm:mb-4 scrollbar-hide">
            <div class="flex gap-0.5 sm:gap-1 min-w-max">
              <button @click="undo" :disabled="!canUndo" :class="['p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200', canUndo ? '' : 'opacity-30 cursor-not-allowed']" title="撤销"><Undo2 class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="redo" :disabled="!canRedo" :class="['p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200', canRedo ? '' : 'opacity-30 cursor-not-allowed']" title="重做"><Redo2 class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span class="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 self-center"></span>
              <button @click="toggleSearchPanel" :class="['p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200', showSearchPanel ? 'bg-slate-200' : '']" title="搜索替换"><Search class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span class="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 self-center"></span>
              <button @click="formatText('h1')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="标题 1"><Heading1 class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('h2')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="标题 2"><Heading2 class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('h3')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="标题 3"><Heading3 class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span class="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 self-center"></span>
              <button @click="formatText('bold')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="粗体"><Bold class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('italic')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="斜体"><Italic class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('strikethrough')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="删除线"><Strikethrough class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('highlight')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="高亮"><Highlighter class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span class="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 self-center"></span>
              <button @click="formatText('quote')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="引用"><Quote class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('code')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="行内代码"><Code class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('codeblock')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="代码块"><FileCode class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span class="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 self-center"></span>
              <button @click="formatText('bullet')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="无序列表"><List class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('numbered')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="有序列表"><ListOrdered class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('task')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="任务列表"><CheckSquare class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span class="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 self-center"></span>
              <button @click="formatText('link')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="链接"><Link class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('image')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="图片"><Image class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('table')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="表格"><Table class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <button @click="formatText('hr')" class="p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200" title="分割线"><Minus class="w-5 h-5 sm:w-4 sm:h-4" /></button>
              <span class="w-px h-6 bg-slate-200 mx-0.5 sm:mx-1 self-center"></span>
              <!-- 预览模式切换 -->
              <button @click="previewMode = 'edit'" :class="['p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200', previewMode === 'edit' ? 'bg-brand-100 text-brand-700' : '']" title="纯编辑模式">
                <FileText class="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
              <button @click="previewMode = 'split'" :class="['p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200 hidden sm:block', previewMode === 'split' ? 'bg-brand-100 text-brand-700' : '']" title="分屏预览">
                <Columns class="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
              <button @click="previewMode = 'preview'" :class="['p-2.5 sm:p-2 rounded-lg sm:rounded hover:bg-slate-100 active:bg-slate-200', previewMode === 'preview' ? 'bg-brand-100 text-brand-700' : '']" title="纯预览模式">
                <Eye class="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
            <div class="flex items-center justify-center sm:justify-start gap-2 text-slate-500">
              <Edit class="w-4 h-4" />
              <span class="font-medium text-sm sm:text-base">编辑模式</span>
              <span v-if="hasUnsavedChanges" class="text-xs text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">未保存</span>
            </div>
            <div class="flex items-center gap-2 sm:gap-3">
              <button @click="handleCancel" class="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-all text-sm sm:text-base">
                <X class="w-4 h-4 mr-1 inline" /> 取消
              </button>
              <button @click="handleSave" class="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 transition-all shadow-sm text-sm sm:text-base">
                <Save class="w-4 h-4 mr-1 inline" /> 保存
              </button>
            </div>
          </div>
        </div>

        <!-- 预览模式下的编辑和导出按钮 -->
        <div v-else class="mb-4 sm:mb-6">
          <div class="flex items-center gap-2 sm:gap-3 justify-end">
            <button @click="emit('toggle-edit-mode')" class="px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm text-sm">
              <Edit class="w-4 h-4" /> 编辑
            </button>
            <button @click="handleExport" class="px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-all flex items-center justify-center gap-2 shadow-sm text-sm">
              <Download class="w-4 h-4" /> 导出
            </button>
          </div>
        </div>

        <!-- Markdown Content or Editor -->
        <div v-if="isEditMode" ref="editorContainerRef">
          <!-- 纯编辑模式 -->
          <div v-if="previewMode === 'edit'">
            <textarea
              ref="textareaRef"
              v-model="editContent"
              @input="handleContentChange"
              @keydown="handleKeydown"
              class="w-full min-h-[40vh] sm:min-h-[50vh] md:min-h-[60vh] max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-300px)] md:max-h-[calc(100vh-350px)] p-3 sm:p-4 md:p-5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-800 font-mono text-sm leading-relaxed resize-none transition-all shadow-sm overflow-y-auto whitespace-pre-wrap"
              placeholder="在此编辑您的Markdown内容..."
              spellcheck="false"
            ></textarea>
          </div>

          <!-- 分屏预览模式 - 手机端上下布局，桌面端左右布局 -->
          <div v-else-if="previewMode === 'split'" class="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4 min-h-[40vh] sm:min-h-[50vh] md:min-h-[60vh] max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-300px)] md:max-h-[calc(100vh-350px)]">
            <!-- 编辑区 -->
            <div class="flex-1 flex flex-col min-h-[20vh] sm:min-h-[25vh] md:min-h-0">
              <div class="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 rounded-t-lg border border-b-0 border-slate-200">
                <FileText class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                <span class="text-xs font-medium text-slate-600">Markdown</span>
              </div>
              <textarea
                ref="textareaRef"
                v-model="editContent"
                @input="handleContentChange"
                @keydown="handleKeydown"
                @scroll="handleEditorScroll"
                class="flex-1 p-2 sm:p-3 md:p-4 rounded-b-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-slate-800 font-mono text-sm leading-relaxed resize-none transition-all shadow-sm overflow-y-auto whitespace-pre-wrap"
                placeholder="在此编辑您的Markdown内容..."
                spellcheck="false"
              ></textarea>
            </div>

            <!-- 预览区 -->
            <div class="flex-1 flex flex-col min-h-[20vh] sm:min-h-[25vh] md:min-h-0">
              <div class="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 rounded-t-lg border border-b-0 border-slate-200">
                <Eye class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                <span class="text-xs font-medium text-slate-600">预览</span>
              </div>
              <div
                ref="previewRef"
                @scroll="handlePreviewScroll"
                class="flex-1 p-2 sm:p-3 md:p-4 rounded-b-lg border border-slate-200 bg-white overflow-y-auto"
              >
                <article
                  class="prose prose-slate prose-sm max-w-none prose-headings:font-bold prose-h1:text-lg sm:prose-h1:text-xl md:prose-h1:text-2xl prose-h2:text-base sm:prose-h2:text-lg md:prose-h2:text-xl prose-p:text-sm prose-p:leading-relaxed prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg overflow-x-hidden break-words"
                  v-html="livePreviewContent"
                ></article>
              </div>
            </div>
          </div>

          <!-- 纯预览模式 -->
          <div v-else-if="previewMode === 'preview'">
            <div class="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-100 rounded-t-lg border border-b-0 border-slate-200">
              <Eye class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <span class="text-xs font-medium text-slate-600">预览模式</span>
            </div>
            <div
              ref="previewRef"
              class="min-h-[40vh] sm:min-h-[50vh] md:min-h-[60vh] max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-300px)] md:max-h-[calc(100vh-350px)] p-3 sm:p-4 md:p-5 rounded-b-lg border border-slate-200 bg-white overflow-y-auto"
            >
              <article
                class="prose prose-slate prose-sm sm:prose-base md:prose-lg max-w-none prose-headings:font-bold prose-h1:text-xl sm:prose-h1:text-2xl md:prose-h1:text-3xl prose-h2:text-lg sm:prose-h2:text-xl md:prose-h2:text-2xl prose-p:leading-relaxed prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg overflow-x-hidden break-words"
                v-html="livePreviewContent"
              ></article>
            </div>
          </div>
        </div>
        <article
          v-else
          ref="articleRef"
          class="prose prose-slate prose-sm sm:prose-base md:prose-lg max-w-none prose-headings:font-bold prose-h1:text-xl sm:prose-h1:text-2xl md:prose-h1:text-3xl prose-h2:text-lg sm:prose-h2:text-xl md:prose-h2:text-2xl prose-p:leading-relaxed prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg overflow-x-hidden break-words"
          v-html="parsedContent"
        ></article>

        <!-- Footer -->
        <div class="mt-6 sm:mt-8 md:mt-10 pt-4 sm:pt-6 border-t border-slate-100 text-center">
          <p v-if="!isEditMode" class="text-slate-400 italic text-xs sm:text-sm">End of document</p>
          <div v-else class="text-xs sm:text-sm text-slate-500">
            {{ stats.characters }} 字符 | {{ stats.words }} 词 | {{ stats.lines }} 行
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 隐藏滚动条但保持滚动功能 */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* 移动端触摸优化 */
@media (max-width: 640px) {
  textarea {
    font-size: 16px; /* 防止iOS缩放 */
  }
}
</style>
