<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed, ref } from 'vue'

const route = useRoute()
const showHeader = computed(() => route.name === 'home')
const search = ref('')
</script>

<template>
  <div class="min-h-[100vh] bg-gray-50 flex flex-col">
    <header v-if="showHeader" class="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-slate-200 z-10">
      <div class="max-w-6xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between">
        <div class="flex items-center">
          <h1 class="font-bold text-xl text-slate-900 tracking-tight flex items-center gap-2 mr-6 whitespace-nowrap">
            <span class="w-3 h-3 rounded-full bg-brand-500"></span>
            工具集
          </h1>
          <!-- 搜索框 -->
          <div class="relative w-full max-w-xl mx-2">
            <input v-model="search" type="text" placeholder="搜索工具，如 JSON、Markdown" class="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all" />
            <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">搜索</div>
          </div>
        </div>
        <nav class="flex items-center text-slate-600">
          <RouterLink class="hover:text-brand-600 font-medium transition-colors px-1 py-0.5 rounded-sm" to="/">主页</RouterLink>
        </nav>
      </div>
    </header>
    <RouterView class="flex-grow" />
  </div>
</template>
