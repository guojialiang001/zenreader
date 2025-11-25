<script setup lang="ts">
import { FileText, Upload } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'upload-trigger'): void;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full text-center p-8 bg-white/50 backdrop-blur-sm animate-fade-in">
    <div class="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6 shadow-sm">
      <FileText class="w-10 h-10 text-brand-500" />
    </div>
    <h2 class="text-3xl font-bold text-slate-800 mb-3">Welcome to ZenReader</h2>
    <p class="text-slate-500 max-w-md mb-8 leading-relaxed">
      A minimalist space to read your Markdown files. 
      Select a file from the history or open a new one to get started.
    </p>
    
    <button 
      @click="emit('upload-trigger')"
      class="group relative flex items-center gap-3 px-8 py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-lg hover:shadow-brand-500/25 transition-all duration-300 transform hover:-translate-y-1"
    >
      <Upload class="w-5 h-5 group-hover:scale-110 transition-transform" />
      <span class="font-semibold text-lg">Open Markdown File</span>
    </button>

    <div class="mt-12 grid grid-cols-3 gap-6 text-sm text-slate-400">
      <div class="flex flex-col items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-slate-300"></div>
        <span>Local Storage</span>
      </div>
      <div class="flex flex-col items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-slate-300"></div>
        <span>Syntax Highlighting</span>
      </div>
      <div class="flex flex-col items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-slate-300"></div>
        <span>Clean Typography</span>
      </div>
    </div>
  </div>
</template>
