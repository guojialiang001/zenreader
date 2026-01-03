<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Home } from 'lucide-vue-next'
import JsonTree from '../components/JsonTree.vue'

const raw = ref<string>('')
const status = ref<{ type: 'success' | 'error'; msg: string } | null>(null)
const parsed = ref<any>(null)
const treeRef = ref<InstanceType<typeof JsonTree> | null>(null)

const validate = () => {
  try {
    parsed.value = JSON.parse(raw.value)
    status.value = { type: 'success', msg: 'JSON 校验通过' }
  } catch (e: any) {
    parsed.value = null
    status.value = { type: 'error', msg: 'JSON 格式错误' }
  }
}

const formatJson = () => {
  try {
    const obj = JSON.parse(raw.value)
    raw.value = JSON.stringify(obj, null, 2)
    parsed.value = obj
    status.value = { type: 'success', msg: '格式化完成' }
  } catch {
    status.value = { type: 'error', msg: '无法格式化：不是有效 JSON' }
  }
}

const expandAll = () => treeRef.value?.expandAll()
const collapseAll = () => treeRef.value?.collapseAll()
</script>

<template>
  <div class="min-h-[100vh] bg-gray-50">
    <div class="max-w-6xl mx-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6 min-h-[100%] flex flex-col">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-slate-900">JSON 工具</h2>
        <RouterLink to="/" class="flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600">
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 mb-6">
        <div class="flex flex-wrap gap-2 sm:gap-3 items-center">
          <button @click="validate" class="flex-shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors">校验</button>
          <button @click="formatJson" class="flex-shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors">格式化</button>
          <button @click="expandAll" class="flex-shrink-0 px-3 sm:px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors text-sm sm:text-base">展开全部</button>
          <button @click="collapseAll" class="flex-shrink-0 px-3 sm:px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors text-sm sm:text-base">收起全部</button>
        </div>
      </div>
      <div v-if="status" :class="status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'" class="mb-4 border rounded-lg px-4 py-3">
        {{ status.msg }}
      </div>
      <div class="grid md:grid-cols-2 gap-6 flex-grow">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[40vh] sm:min-h-[50vh]">
          <textarea v-model="raw" placeholder="在此粘贴或输入 JSON" class="w-full min-h-[40vh] sm:min-h-[50vh] max-h-[calc(100vh-320px)] p-4 font-mono text-sm outline-none resize-none overflow-y-auto whitespace-pre-wrap break-words" spellcheck="false"></textarea>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[40vh] sm:min-h-[50vh] max-h-[calc(100vh-320px)]">
          <JsonTree v-if="parsed !== null" :data="parsed" ref="treeRef" />
          <div v-else class="p-4 sm:p-8 text-slate-400 text-center min-h-[40vh] sm:min-h-[50vh] max-h-[calc(100vh-320px)] overflow-y-auto">
            粘贴 JSON 后可在此预览并展开收起
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
