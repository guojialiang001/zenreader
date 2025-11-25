<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { FileText, Braces, Clock, Type } from 'lucide-vue-next'

const search = ref('')
const tools = [
  { name: 'Markdown 阅读器', desc: '导入并阅读 Markdown，优雅排版', route: '/reader', icon: 'file' },
  { name: 'JSON 工具', desc: '校验与优美格式化，支持展开收起与行号', route: '/json', icon: 'braces' },
  { name: '时间戳工具', desc: '时间与时间戳互转，实时展示当前时间', route: '/timestamp', icon: 'clock' },
  { name: '大小写转换', desc: '快速转换文本大小写，支持批量操作', route: '/case', icon: 'case' },
]
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return tools
  return tools.filter(t => t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q))
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-brand-50 to-white">
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 -z-10 opacity-50">
        <div class="h-64 bg-gradient-to-r from-brand-100 via-brand-50 to-transparent"></div>
      </div>
      <div class="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 class="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">优美、从容的工具集主页</h1>
          <p class="text-lg text-slate-600 leading-relaxed mb-8">简洁大方的设计语言，承载众多实用工具的入口与概览。聚焦体验与效率，随心探索。</p>
          <div class="relative max-w-xl">
            <input v-model="search" type="text" placeholder="搜索工具，如 JSON、Markdown" class="w-full px-5 py-3 rounded-xl border border-slate-200 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none" />
            <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">全局搜索</div>
          </div>
        </div>
        <div class="hidden md:block">
          <img 
            src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80"
            alt="工具集合概念插图"
            class="rounded-3xl shadow-xl border border-slate-200"
          />
        </div>
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-6 pb-20">
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <RouterLink v-for="t in filtered" :key="t.route" :to="t.route" class="group rounded-2xl bg-white border border-slate-200 shadow-sm p-6 hover:border-brand-200 hover:shadow-brand-500/10 transition">
          <div class="flex items-center gap-3 mb-2">
            <component :is="t.icon === 'file' ? FileText : (t.icon === 'braces' ? Braces : (t.icon === 'clock' ? Clock : Type))" class="w-5 h-5 text-brand-600" />
            <div class="font-semibold text-slate-900">{{ t.name }}</div>
          </div>
          <div class="text-slate-600">{{ t.desc }}</div>
          <div class="mt-4 text-brand-600 font-medium opacity-0 group-hover:opacity-100">进入</div>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
