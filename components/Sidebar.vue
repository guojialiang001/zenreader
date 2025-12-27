<script setup lang="ts">
import { ref, computed } from 'vue';
import { Plus, FileText, Trash2, ChevronLeft, Menu, Home, PanelLeftClose } from 'lucide-vue-next';
import type { MarkdownFile } from '../types';

const props = defineProps<{
  files: MarkdownFile[];
  activeFileId: string | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-file', id: string): void;
  (e: 'delete-file', id: string): void;
  (e: 'upload', event: Event): void;
  (e: 'toggle'): void;
  (e: 'rename-file', id: string, newName: string): void;
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const fileNameInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const showDragHint = ref(false);

const handleUploadClick = () => {
  fileInputRef.value?.click();
};

const onUploadChange = (e: Event) => {
  emit('upload', e);
};

// 处理拖放事件
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // 避免重复设置相同的值导致渲染闪烁
  if (!isDragging.value) {
    isDragging.value = true;
  }
  if (!showDragHint.value) {
    showDragHint.value = true;
  }
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // 验证是否真正离开整个侧边栏区域
  // 检查 relatedTarget 是否在侧边栏内部
  const sidebar = e.currentTarget as HTMLElement;
  const relatedTarget = e.relatedTarget as Node | null;
  
  // 如果 relatedTarget 不在侧边栏内部，则重置状态
  if (!sidebar.contains(relatedTarget)) {
    isDragging.value = false;
    showDragHint.value = false;
  }
};

// 移除冗余的 dragenter 处理，避免与 dragover 冲突

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  // 立即重置拖动状态，确保样式恢复
  isDragging.value = false;
  showDragHint.value = false;
  
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    // 创建一个FileList对象的简单包装器
    const mockInput = {
      target: {
        files: e.dataTransfer.files
      }
    };
    // 直接传递mockInput作为事件对象
    emit('upload', mockInput as Event);
  }
};

// 拖放区域的样式类
const dropAreaClass = computed(() => {
  return {
    'border-dashed border-2 border-slate-200': true,
    'border-brand-400 bg-brand-50': isDragging.value,
    'hover:border-slate-300': !isDragging.value
  };
});

// 文件名编辑相关状态
const editingFileId = ref<string | null>(null);
const editingFileName = ref('');

// 处理文件名编辑
const handleFileRename = (id: string, name: string) => {
  editingFileId.value = id;
  editingFileName.value = name;
};

const handleFileNameSave = (id: string) => {
  if (editingFileName.value.trim()) {
    // 保留文件扩展名
    const originalFile = props.files.find(f => f.id === id);
    if (originalFile) {
      const extension = originalFile.name.match(/\.(md|markdown|txt)$/i)?.[0] || '';
      const newName = extension ? 
        `${editingFileName.value.trim()}${extension}` : 
        editingFileName.value.trim();
      emit('rename-file', id, newName);
    }
  }
  editingFileId.value = null;
};

const handleFileNameCancel = () => {
  editingFileId.value = null;
};

const handleFileNameKeydown = (e: KeyboardEvent, id: string) => {
  if (e.key === 'Enter') {
    handleFileNameSave(id);
  } else if (e.key === 'Escape') {
    handleFileNameCancel();
  }
};
</script>

<template>
  <button 
        v-if="!isOpen"
        @click="emit('toggle')"
        class="fixed top-3 sm:top-4 left-3 sm:left-4 z-20 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-slate-600 transition-colors"
        aria-label="Open sidebar"
      >
    <Menu class="w-6 h-6" />
  </button>

  <!-- Mobile overlay -->
  <div 
    v-if="isOpen"
    class="fixed inset-0 bg-black/20 backdrop-blur-sm z-10 md:hidden"
    @click="emit('toggle')"
  ></div>
  
  <div 
    v-if="isOpen"
    class="fixed md:static inset-0 left-0 w-64 sm:w-72 md:w-80 flex flex-col z-20 shadow-xl md:shadow-none transition-transform duration-300 h-full"
    :class="isDragging ? 'bg-brand-50 border-r-2 border-brand-300' : 'bg-white border-r border-slate-200'"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div class="p-4 sm:p-5 md:p-6 border-b border-slate-100 flex items-center justify-between">
      <h1 class="font-bold text-xl text-slate-800 tracking-tight flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-brand-500"></span>
        ZenReader
      </h1>
      <button @click="emit('toggle')" class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="收起侧边栏">
        <PanelLeftClose class="w-5 h-5" />
      </button>
    </div>

    <div class="p-3 sm:p-4 rounded-lg">
      <input
        type="file"
        ref="fileInputRef"
        @change="onUploadChange"
        accept=".md,.markdown,.txt"
        multiple
        class="hidden"
      />
      <button
        @click="handleUploadClick"
        class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 sm:py-3 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow active:scale-[0.98]"
      >
        <Plus class="w-5 h-5" />
        <span class="font-medium">打开文件</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-2 py-0 space-y-1 min-h-0 flex flex-col">
      <div v-if="files.length === 0" class="text-center py-8 sm:py-10 px-4">
        <p class="text-sm text-slate-400 italic">No files opened yet.</p>
      </div>
      <template v-else>
        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 sm:px-4 mb-2 mt-2">
          Recently Opened
        </h3>
        <div
          v-for="file in files"
          :key="file.id"
          class="group flex items-center justify-between p-2.5 sm:p-2 rounded-lg cursor-pointer transition-all duration-200 active:bg-slate-100"
          :class="activeFileId === file.id ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200' : 'text-slate-600 hover:bg-slate-50'"
          @click="emit('select-file', file.id)"
          @dblclick.stop="handleFileRename(file.id, file.name.replace(/\.(md|markdown|txt)$/i, ''))"
        >
          <div class="flex items-center gap-2.5 sm:gap-3 overflow-hidden flex-1">
            <FileText class="w-4 h-4 flex-shrink-0" :class="activeFileId === file.id ? 'text-brand-500' : 'text-slate-400'" />
            <div v-if="editingFileId === file.id" class="relative flex items-center min-w-0 flex-1">
              <input
                v-model="editingFileName"
                type="text"
                class="text-sm font-medium border-b-2 border-brand-400 focus:outline-none focus:border-brand-600 px-1 py-1 w-full min-w-0 bg-transparent"
                @blur="handleFileNameSave(file.id)"
                @keydown="handleFileNameKeydown($event, file.id)"
                ref="fileNameInputRef"
                title="按Enter保存，按Escape取消"
                autofocus
              />
              <span class="ml-1 whitespace-nowrap text-slate-500 text-sm">
                {{ file.name.match(/\.(md|markdown|txt)$/i)?.[0] || '' }}
              </span>
            </div>
            <span v-else class="truncate text-sm font-medium hover:text-brand-600 transition-colors cursor-default flex-1 whitespace-nowrap overflow-hidden text-ellipsis" :title="file.name">
              {{ file.name }}
            </span>
          </div>
          <div class="flex items-center gap-0.5 sm:gap-1 ml-2">
            <button
              v-if="editingFileId !== file.id"
              @click.stop="handleFileRename(file.id, file.name.replace(/\.(md|markdown|txt)$/i, ''))"
              class="opacity-60 sm:opacity-0 sm:group-hover:opacity-50 p-2 sm:p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 rounded-md transition-all"
              title="重命名"
            >
              ✏️
            </button>
            <button
              @click.stop="emit('delete-file', file.id)"
              class="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-md transition-all"
              title="移除"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- 拖动提示覆盖层 -->
    <div
      v-if="showDragHint"
      class="absolute inset-0 flex flex-col items-center justify-center bg-brand-50/90 backdrop-blur-sm z-30 w-full"
    >
      <div class="text-center p-6 sm:p-8">
        <div class="text-brand-600 text-5xl sm:text-6xl mb-3 sm:mb-4">📄</div>
        <h3 class="text-lg sm:text-xl font-bold text-brand-800 mb-2">放置文件</h3>
        <p class="text-sm sm:text-base text-brand-700">将Markdown或文本文件拖放到此处</p>
      </div>
    </div>

    <div class="p-2.5 sm:p-3 border-t border-slate-100 mt-auto flex-shrink-0">
      <div class="flex items-center justify-between">
        <RouterLink
          to="/"
          class="flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 active:bg-slate-200 transition-colors text-sm"
        >
          <Home class="w-4 h-4" />
          <span>返回主页</span>
        </RouterLink>
        <span class="text-xs text-slate-300">v1.0</span>
      </div>
    </div>
  </div>
</template>
