<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Clock, Calendar } from 'lucide-vue-next';
import type { MarkdownFile } from '../types';

const props = defineProps<{
  file: MarkdownFile;
  className?: string;
}>();

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
</script>

<template>
  <div class="h-full overflow-y-auto bg-gradient-to-b from-brand-50 to-white" :class="className">
    <div class="max-w-4xl mx-auto px-6 py-12 md:px-12 md:py-16">
      <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-10">
      
      <!-- Header Metadata -->
      <div class="mb-10 pb-8 border-b border-slate-100">
        <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
          {{ file.name.replace(/\.(md|markdown|txt)$/i, '') }}
        </h1>
        <div class="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
          <div class="flex items中心 gap-2">
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

      <!-- Markdown Content -->
      <article 
        class="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg"
        v-html="parsedContent"
      >
      </article>

      <!-- Footer -->
      <div class="mt-20 pt-10 border-t border-slate-100 text-center">
          <p class="text-slate-400 italic text-sm">End of document</p>
      </div>
      </div>
    </div>
  </div>
</template>
