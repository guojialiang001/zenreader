<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ data: any }>()

type NodeType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
interface Node {
  id: number
  type: NodeType
  key?: string
  value?: string | number | boolean | null
  children?: Node[]
  collapsed?: boolean
}

let nid = 0
const build = (key: string | undefined, val: any): Node => {
  const id = ++nid
  if (val === null) return { id, type: 'null', key, value: null }
  if (Array.isArray(val)) {
    return { id, type: 'array', key, children: val.map((v) => build(undefined, v)), collapsed: false }
  }
  const t = typeof val
  if (t === 'object') {
    const children: Node[] = Object.keys(val).map((k) => build(k, val[k]))
    return { id, type: 'object', key, children, collapsed: false }
  }
  if (t === 'string') return { id, type: 'string', key, value: val as string }
  if (t === 'number') return { id, type: 'number', key, value: val as number }
  if (t === 'boolean') return { id, type: 'boolean', key, value: val as boolean }
  return { id, type: 'null', key, value: null }
}

const root = ref<Node>(build(undefined, props.data))

const toggle = (nodeId: number) => {
  const walk = (n: Node): boolean => {
    if (n.id === nodeId) {
      if (n.type === 'object' || n.type === 'array') n.collapsed = !n.collapsed
      return true
    }
    if (n.children) return n.children.some(walk)
    return false
  }
  walk(root.value)
}

const setAll = (collapsed: boolean) => {
  const walk = (n: Node) => {
    if (n.type === 'object' || n.type === 'array') n.collapsed = collapsed
    n.children?.forEach(walk)
  }
  walk(root.value)
}

defineExpose({ expandAll: () => setAll(false), collapseAll: () => setAll(true) })

interface Line {
  id: number
  depth: number
  text: string
  canToggle: boolean
}

const visibleLines = computed<Line[]>(() => {
  const lines: Line[] = []
  const push = (depth: number, text: string, id: number, canToggle: boolean) => {
    lines.push({ id, depth, text, canToggle })
  }
  const renderVal = (n: Node): string => {
    if (n.type === 'string') return '"' + String(n.value) + '"'
    if (n.type === 'number' || n.type === 'boolean') return String(n.value)
    if (n.type === 'null') return 'null'
    return ''
  }
  const walk = (n: Node, depth: number, isLast: boolean, keyWrap = true) => {
    if (n.type === 'object') {
      const k = n.key && keyWrap ? '"' + n.key + '": ' : ''
      push(depth, k + '{', n.id, true)
      if (!n.collapsed && n.children) {
        n.children.forEach((c, idx) => walk(c, depth + 1, idx === n.children!.length - 1))
      }
      push(depth, '}' + (isLast ? '' : ','), n.id, true)
    } else if (n.type === 'array') {
      const k = n.key && keyWrap ? '"' + n.key + '": ' : ''
      push(depth, k + '[', n.id, true)
      if (!n.collapsed && n.children) {
        n.children.forEach((c, idx) => walk(c, depth + 1, idx === n.children!.length - 1, false))
      }
      push(depth, ']' + (isLast ? '' : ','), n.id, true)
    } else {
      const k = n.key ? '"' + n.key + '": ' : ''
      push(depth, k + renderVal(n) + (isLast ? '' : ','), n.id, false)
    }
  }
  walk(root.value, 0, true)
  return lines
})

const colorClass = (text: string) => {
  if (/^".*":\s*$/.test(text)) return 'text-slate-800'
  if (/^\{|\}|\[|\]/.test(text)) return 'text-slate-700'
  if (/^".*"(,)?$/.test(text)) return 'text-emerald-700'
  if (/^(true|false)(,)?$/.test(text)) return 'text-purple-700'
  if (/^(null)(,)?$/.test(text)) return 'text-gray-500'
  if (/^-?\d+(\.\d+)?(,)?$/.test(text)) return 'text-orange-700'
  return 'text-slate-800'
}
</script>

<template>
  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-auto min-h-[100%] max-h-[calc(100vh-300px)]">
    <div class="grid min-w-full" style="grid-template-columns: 40px 24px 1fr">
      <div class="bg-slate-50 border-r border-slate-200">
        <div v-for="(line, i) in visibleLines" :key="line.id + '-' + i" class="px-2 text-slate-400 tabular-nums text-sm h-7 leading-7">
          {{ i + 1 }}
        </div>
      </div>
      <div class="bg-slate-50 border-r border-slate-200">
        <div v-for="line in visibleLines" :key="line.id + '-a'" class="h-7 leading-7 flex items-center justify-center">
          <button v-if="line.canToggle" @click="toggle(line.id)" class="text-slate-500 hover:text-brand-600">
            ▶
          </button>
        </div>
      </div>
      <div class="overflow-x-auto min-w-0">
        <div v-for="line in visibleLines" :key="line.id + '-c'" class="h-7 leading-7 pr-4">
          <span :style="{ marginLeft: (line.depth * 20) + 'px' }" :class="colorClass(line.text)" class="font-mono text-sm whitespace-nowrap">
            {{ line.text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
