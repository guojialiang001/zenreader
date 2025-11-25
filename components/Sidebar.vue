<script setup lang="ts">
import { ref } from 'vue';
import { Plus, FileText, Trash2, ChevronLeft, Menu } from 'lucide-vue-next';
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
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);

const handleUploadClick = () => {
  fileInputRef.value?.click();
};

const onUploadChange = (e: Event) => {
  emit('upload', e);
};
</script>

<template>
  <button 
    v-if="!isOpen"
    @click="emit('toggle')"
    class="fixed top-4 left-4 z-20 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 text-slate-600 transition-colors"
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
    class="fixed md:static inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl md:shadow-none transition-transform duration-300"
  >
    <div class="p-6 border-b border-slate-100 flex items-center justify-between">
      <h1 class="font-bold text-xl text-slate-800 tracking-tight flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-brand-500"></span>
        ZenReader
      </h1>
      <button @click="emit('toggle')" class="md:hidden text-slate-400 hover:text-slate-600">
        <ChevronLeft class="w-6 h-6" />
      </button>
    </div>

    <div class="p-4">
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
        class="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow active:scale-95"
      >
        <Plus class="w-5 h-5" />
        <span class="font-medium">Open File</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-2 space-y-1">
      <div v-if="files.length === 0" class="text-center py-10 px-4">
        <p class="text-sm text-slate-400 italic">No files opened yet.</p>
      </div>
      <template v-else>
        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-2 mt-2">
          Recently Opened
        </h3>
        <div
          v-for="file in files"
          :key="file.id"
          class="group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200"
          :class="activeFileId === file.id ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200' : 'text-slate-600 hover:bg-slate-50'"
          @click="emit('select-file', file.id)"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <FileText class="w-4 h-4 flex-shrink-0" :class="activeFileId === file.id ? 'text-brand-500' : 'text-slate-400'" />
            <span class="truncate text-sm font-medium">{{ file.name }}</span>
          </div>
          <button
            @click.stop="emit('delete-file', file.id)"
            class="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
            title="Remove from history"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </template>
    </div>

    <div class="p-4 border-t border-slate-100">
       <div class="text-xs text-slate-400 text-center">
         Built with Vue 3 & Tailwind
       </div>
    </div>
  </div>
</template>
