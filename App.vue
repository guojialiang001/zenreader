<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const showHeader = computed(() => route.name === 'home')
</script>

<template>
  <div class="min-h-screen bg-[#f8fafc]">
    <header v-if="showHeader" class="sticky top-0 bg-white/70 backdrop-blur-md border-b border-slate-200/60 z-50">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <RouterLink to="/" class="group flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <span class="w-2 h-2 rounded-full bg-white"></span>
          </div>
          <h1 class="font-bold text-xl text-slate-900 tracking-tight">工具集</h1>
        </RouterLink>
        <nav class="hidden md:flex items-center gap-8 text-slate-500">
          <RouterLink class="hover:text-brand-600 font-medium transition-colors relative after:absolute after:bottom-[-18px] after:left-0 after:w-0 after:h-0.5 after:bg-brand-500 hover:after:w-full after:transition-all" to="/">工具集</RouterLink>
          <RouterLink class="hover:text-brand-600 font-medium transition-colors" to="/json">JSON</RouterLink>
          <RouterLink class="hover:text-brand-600 font-medium transition-colors" to="/timestamp">时间戳</RouterLink>
          <RouterLink class="hover:text-brand-600 font-medium transition-colors" to="/case">转换</RouterLink>
          <RouterLink class="hover:text-brand-600 font-medium transition-colors" to="/string">拼接</RouterLink>
        </nav>
        <div class="flex items-center gap-4">
          <button class="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </button>
        </div>
      </div>
    </header>
    <RouterView />
  </div>
</template>
