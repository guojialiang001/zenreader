<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { RouterLink } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import MarkdownViewer from '../components/MarkdownViewer.vue';
import EmptyState from '../components/EmptyState.vue';
import type { MarkdownFile } from '../types';
import { Menu, Home, FilePlus } from 'lucide-vue-next';

const files = ref<MarkdownFile[]>([]);
const activeFileId = ref<string | null>(null);
const sidebarOpen = ref(true);

const generateId = () => Math.random().toString(36).substr(2, 9);

onMounted(() => {
  const savedFiles = localStorage.getItem('zenreader_files');
  if (savedFiles) {
    try {
      const parsed = JSON.parse(savedFiles);
      files.value = parsed;
      if (parsed.length > 0) {
        activeFileId.value = parsed[0].id;
      }
    } catch (e) {
      console.error('Failed to parse saved files', e);
    }
  }
  if (window.innerWidth < 768) {
    sidebarOpen.value = false;
  }
});

watch(files, (newFiles) => {
  localStorage.setItem('zenreader_files', JSON.stringify(newFiles));
}, { deep: true });

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const fileList = input.files;
  if (!fileList || fileList.length === 0) return;

  const filesArr = Array.from(fileList);
  const readText = (f: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target?.result as string);
    r.onerror = (e) => reject(e);
    r.readAsText(f);
  });

  const contents = await Promise.all(filesArr.map(readText));
  const newFiles: MarkdownFile[] = contents.map((content, idx) => ({
    id: generateId(),
    name: filesArr[idx].name,
    content,
    lastModified: Date.now(),
  }));

  files.value = [...newFiles, ...files.value];
  activeFileId.value = newFiles[0].id;
  if (window.innerWidth < 768) {
    sidebarOpen.value = false;
  }
  input.value = '';
};

const handleSelectFile = (id: string) => {
  activeFileId.value = id;
  if (window.innerWidth < 768) {
    sidebarOpen.value = false;
  }
};

const handleDeleteFile = (id: string) => {
  files.value = files.value.filter(f => f.id !== id);
  if (activeFileId.value === id) {
    activeFileId.value = null;
  }
};

const activeFile = computed(() => files.value.find(f => f.id === activeFileId.value) || null);
const isEditMode = ref(false);

const handleContentUpdate = (fileId: string, newContent: string) => {
  const fileIndex = files.value.findIndex(f => f.id === fileId);
  if (fileIndex !== -1) {
    files.value[fileIndex] = {
      ...files.value[fileIndex],
      content: newContent,
      lastModified: Date.now()
    };
  }
};

const handleTitleUpdate = (newTitle: string) => {
  if (activeFile) {
    const fileIndex = files.value.findIndex(f => f.id === activeFile.id);
    if (fileIndex !== -1) {
      // 保留文件扩展名
      const extension = activeFile.name.match(/\.(md|markdown|txt)$/i)?.[0] || '';
      const newFileName = extension ? `${newTitle}${extension}` : newTitle;
      files.value[fileIndex] = {
        ...activeFile,
        name: newFileName,
        lastModified: Date.now()
      };
    }
  }
};

const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value;
};

// 处理文件名重命名
const handleRenameFile = (id: string, newName: string) => {
  const fileIndex = files.value.findIndex(f => f.id === id);
  if (fileIndex !== -1) {
    files.value[fileIndex] = {
      ...files.value[fileIndex],
      name: newName,
      lastModified: Date.now()
    };
  }
};

const triggerUpload = () => {
  const input = document.getElementById('global-upload-trigger') as HTMLInputElement;
  if (input) input.click();
};

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};

// 新建 Markdown 文件
const createNewFile = () => {
  const newFile: MarkdownFile = {
    id: generateId(),
    name: `新文档-${new Date().toLocaleDateString('zh-CN')}.md`,
    content: '# 新文档\n\n开始编写你的内容...\n',
    lastModified: Date.now(),
  };
  files.value = [newFile, ...files.value];
  activeFileId.value = newFile.id;
  isEditMode.value = true; // 自动进入编辑模式
  if (window.innerWidth < 768) {
    sidebarOpen.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen h-screen w-full bg-gray-50 font-sans">
    <input
      id="global-upload-trigger"
      type="file"
      @change="handleFileUpload"
      accept=".md,.markdown,.txt"
      multiple
      class="hidden"
    />

    <!-- 右上角按钮组 -->
    <div class="fixed top-3 sm:top-4 right-3 sm:right-4 z-20 flex items-center gap-2">
      <button
        @click="createNewFile"
        class="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-slate-600 hover:text-green-600 transition-colors"
        title="新建 Markdown"
      >
        <FilePlus class="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
      <RouterLink
        to="/"
        class="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-slate-600 hover:text-brand-600 transition-colors"
        title="返回主页"
      >
        <Home class="w-5 h-5 sm:w-6 sm:h-6" />
      </RouterLink>
    </div>

    <Sidebar 
      :files="files"
      :active-file-id="activeFileId"
      :is-open="sidebarOpen"
      @select-file="handleSelectFile"
      @upload="handleFileUpload"
      @delete-file="handleDeleteFile"
      @toggle="toggleSidebar"
      @rename-file="handleRenameFile"
    />

    <main class="flex-1 flex flex-col min-w-0 transition-all duration-300">
      <div class="flex-1 overflow-hidden">
        <div v-if="activeFile" class="h-full">
          <MarkdownViewer 
            :key="activeFile.id" 
            :file="activeFile" 
            :is-edit-mode="isEditMode"
            @update-content="handleContentUpdate"
            @toggle-edit-mode="toggleEditMode"
            @update-title="handleTitleUpdate"
            class="animate-fade-in h-full w-full overflow-y-auto overflow-x-hidden"
          />
        </div>
        <EmptyState v-else @upload-trigger="triggerUpload" />
      </div>
    </main>
  </div>
  
</template>
