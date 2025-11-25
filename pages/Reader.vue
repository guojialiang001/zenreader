<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { RouterLink } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import MarkdownViewer from '../components/MarkdownViewer.vue';
import EmptyState from '../components/EmptyState.vue';
import type { MarkdownFile } from '../types';
import { Menu, Home } from 'lucide-vue-next';

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

const triggerUpload = () => {
  const input = document.getElementById('global-upload-trigger') as HTMLInputElement;
  if (input) input.click();
};

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value;
};
</script>

<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden font-sans">
    <input
      id="global-upload-trigger"
      type="file"
      @change="handleFileUpload"
      accept=".md,.markdown,.txt"
      multiple
      class="hidden"
    />

    <Sidebar 
      :files="files"
      :active-file-id="activeFileId"
      :is-open="sidebarOpen"
      @select-file="handleSelectFile"
      @upload="handleFileUpload"
      @delete-file="handleDeleteFile"
      @toggle="toggleSidebar"
    />

    <main class="flex-1 h-full relative flex flex-col min-w-0 transition-all duration-300">
      <button 
        v-if="!sidebarOpen"
        @click="sidebarOpen = true"
        class="absolute top-4 left-4 z-30 p-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 transition-colors md:hidden"
      >
        <Menu class="w-6 h-6" />
      </button>
      <RouterLink 
        to="/" 
        class="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 transition-colors"
        aria-label="返回主页"
      >
        <Home class="w-5 h-5" />
        <span class="hidden md:inline">返回主页</span>
      </RouterLink>
      <MarkdownViewer v-if="activeFile" :key="activeFile.id" :file="activeFile" class="animate-fade-in" />
      <EmptyState v-else @upload-trigger="triggerUpload" />
    </main>
  </div>
  
</template>
