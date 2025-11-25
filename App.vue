<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const showHeader = computed(() => route.name === 'home')
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header v-if="showHeader" class="sticky top-0 bg-white/80 backdrop-blur border-b border-slate-200 z-10">
      <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 class="font-bold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-brand-500"></span>
          工具集
        </h1>
        <nav class="flex items-center gap-6 text-slate-600">
          <RouterLink class="hover:text-brand-600 font-medium" to="/">主页</RouterLink>
          <RouterLink class="hover:text-brand-600 font-medium" to="/json">JSON 工具</RouterLink>
          <RouterLink class="hover:text-brand-600 font-medium" to="/timestamp">时间戳工具</RouterLink>
          <RouterLink class="hover:text-brand-600 font-medium" to="/case">大小写转换</RouterLink>
        </nav>
      </div>
    </header>
    <RouterView />
  </div>
</template>
