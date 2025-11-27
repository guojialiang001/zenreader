<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Type } from 'lucide-vue-next'

const code = ref('')
const varName = ref('result')
const status = ref<{ type: 'success' | 'error'; msg: string } | null>(null)
const plainText = ref('')
const javaBlock = ref('')
const javaString = ref('')

const detectVarName = () => {
  const m = code.value.match(/\bString\s+(\w+)\s*=\s*/)
  if (m) varName.value = m[1]
}

const unescapeJava = (s: string): string => {
  try {
    return JSON.parse('"' + s.replace(/"/g, '\\"') + '"')
  } catch {
    return s
  }
}

const extract = () => {
  try {
    detectVarName()
    const segments: string[] = []
    const re = /"([^"\\]|\\.)*"/g
    let m: RegExpExecArray | null
    while ((m = re.exec(code.value)) !== null) {
      const raw = m[0].slice(1, -1)
      segments.push(unescapeJava(raw))
    }
    const joined = segments.join('')
    plainText.value = joined
    status.value = { type: 'success', msg: '提取成功' }
    javaBlock.value = `String ${varName.value} = """\n${joined}\n""";`
    const escaped = joined
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/"/g, '\\"')
    javaString.value = `String ${varName.value} = "${escaped}";`
  } catch (e) {
    status.value = { type: 'error', msg: '解析失败' }
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-6 py-8">
      <div class="mb-6 relative">
        <RouterLink 
          to="/" 
          class="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 transition-colors"
        >
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
        <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2"><Type class="w-5 h-5" /> 字符串整合工具</h2>
        <p class="text-slate-600 mt-1">提取并整合 Java 多段字符串，生成干净文本与 Java 文本块</p>
      </div>

      <div class="grid md:grid-cols-2 gap-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center gap-3 mb-3">
            <label class="text-sm font-semibold text-slate-700">变量名</label>
            <input v-model="varName" class="px-3 py-2 border border-slate-200 rounded-lg text-sm w-40" />
            <button @click="extract" class="ml-auto px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg">提取整合</button>
          </div>
          <textarea v-model="code" placeholder="粘贴Java字符串拼接代码，" class="w-full h-[360px] p-4 font-mono text-sm outline-none resize-none border border-slate-200 rounded-xl bg-slate-50 overflow-auto whitespace-pre-wrap break-words"></textarea>
          <div v-if="status" :class="status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'" class="mt-3 border rounded-lg px-4 py-3">
            {{ status.msg }}
          </div>
        </div>
        <div class="space-y-6">
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div class="text-sm font-semibold text-slate-700 mb-2">纯文本</div>
            <pre class="w-full h-[160px] p-4 font-mono text-sm bg-slate-50 rounded-xl overflow-auto whitespace-pre-wrap break-words">{{ plainText }}</pre>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div class="text-sm font-semibold text-slate-700 mb-2">Java 文本块</div>
            <pre class="w-full h-[160px] p-4 font-mono text-sm bg-slate-50 rounded-xl overflow-auto whitespace-pre-wrap break-words">{{ javaBlock }}</pre>
          </div>
          <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div class="text-sm font-semibold text-slate-700 mb-2">Java 普通字符串</div>
            <pre class="w-full h-[160px] p-4 font-mono text-sm bg-slate-50 rounded-xl overflow-auto whitespace-pre-wrap break-words">{{ javaString }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
