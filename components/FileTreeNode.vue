<template>
  <div class="file-tree-node">
    <!-- 当前节点 -->
    <div
      class="flex items-center gap-1.5 py-1.5 px-2 cursor-pointer transition-colors group"
      :class="[
        isSelected ? 'bg-brand-600/30 text-white' : 'hover:bg-slate-700/50',
        node.type === 'folder' ? 'text-slate-300' : 'text-slate-400'
      ]"
      :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
      @click="handleClick"
    >
      <!-- 展开/折叠图标 -->
      <ChevronRight
        v-if="node.type === 'folder'"
        class="w-4 h-4 text-slate-400 transition-transform duration-150 flex-shrink-0"
        :class="{ 'rotate-90': node.expanded }"
      />
      <span v-else class="w-4 h-4 flex-shrink-0"></span>
      
      <!-- 文件/文件夹图标 -->
      <component
        :is="getNodeIcon()"
        class="w-4 h-4 flex-shrink-0"
        :class="getIconClass()"
      />
      
      <!-- 名称 -->
      <span class="text-sm truncate flex-1" :title="node.name">
        {{ node.name }}
      </span>
      
      <!-- 文件数量徽章（仅文件夹且非根节点） -->
      <span
        v-if="node.type === 'folder' && node.children?.length && depth > 0"
        class="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
      >
        {{ node.children.length }}
      </span>
      
      <!-- 关闭按钮 -->
      <button
        v-if="showCloseButton && depth === 0"
        @click.stop="$emit('close', node)"
        class="p-1 hover:bg-slate-600 rounded text-slate-400 hover:text-white transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        :title="node.type === 'folder' ? '关闭文件夹' : '关闭文件'"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
    
    <!-- 子节点 -->
    <Transition name="tree-expand">
      <div v-if="node.type === 'folder' && node.expanded && node.children?.length" class="children">
        <FileTreeNode
          v-for="child in sortedChildren"
          :key="child.path"
          :node="child"
          :depth="depth + 1"
          :currentFilePath="currentFilePath"
          :showCloseButton="false"
          @select="$emit('select', $event)"
          @toggle="$emit('toggle', $event)"
          @close="$emit('close', $event)"
        />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Folder, FolderOpen, FileText, FileJson, FileCode, Braces, ChevronRight,
  FileType, Image, Settings, Database, Terminal, Package, X
} from 'lucide-vue-next'

// 文件树节点接口
interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeNode[]
  fileHandle?: FileSystemFileHandle
  expanded?: boolean
}

const props = defineProps<{
  node: TreeNode
  depth: number
  currentFilePath?: string | null
  showCloseButton?: boolean
}>()

const emit = defineEmits<{
  select: [node: TreeNode]
  toggle: [node: TreeNode]
  close: [node: TreeNode]
}>()

// 计算是否被选中
const isSelected = computed(() => {
  return props.currentFilePath === props.node.path
})

// 排序后的子节点：文件夹在前，文件在后
const sortedChildren = computed(() => {
  if (!props.node.children) return []
  return [...props.node.children].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
})

// 处理点击
const handleClick = () => {
  if (props.node.type === 'folder') {
    emit('toggle', props.node)
  } else {
    emit('select', props.node)
  }
}

// 获取节点图标
const getNodeIcon = () => {
  if (props.node.type === 'folder') {
    return props.node.expanded ? FolderOpen : Folder
  }
  
  const ext = props.node.name.split('.').pop()?.toLowerCase() || ''
  const name = props.node.name.toLowerCase()
  
  // 特殊文件名
  if (name === 'package.json' || name === 'package-lock.json') return Package
  if (name === '.gitignore' || name === '.env' || name.startsWith('.env.')) return Settings
  if (name === 'dockerfile' || name === 'docker-compose.yml') return Terminal
  
  // 根据扩展名
  const iconMap: Record<string, any> = {
    'json': FileJson,
    'js': Braces,
    'jsx': Braces,
    'ts': Braces,
    'tsx': Braces,
    'vue': FileCode,
    'svelte': FileCode,
    'html': FileCode,
    'htm': FileCode,
    'css': FileType,
    'scss': FileType,
    'less': FileType,
    'md': FileText,
    'txt': FileText,
    'sql': Database,
    'db': Database,
    'png': Image,
    'jpg': Image,
    'jpeg': Image,
    'gif': Image,
    'svg': Image,
    'webp': Image,
    'sh': Terminal,
    'bash': Terminal,
    'zsh': Terminal,
  }
  
  return iconMap[ext] || FileText
}

// 获取图标样式
const getIconClass = () => {
  if (props.node.type === 'folder') {
    return 'text-amber-400'
  }
  
  const ext = props.node.name.split('.').pop()?.toLowerCase() || ''
  
  const colorMap: Record<string, string> = {
    'json': 'text-yellow-400',
    'js': 'text-yellow-300',
    'jsx': 'text-cyan-400',
    'ts': 'text-blue-400',
    'tsx': 'text-blue-300',
    'vue': 'text-emerald-400',
    'html': 'text-orange-400',
    'css': 'text-blue-400',
    'scss': 'text-pink-400',
    'md': 'text-slate-300',
    'sql': 'text-purple-400',
  }
  
  return colorMap[ext] || 'text-slate-400'
}
</script>

<style scoped>
.tree-expand-enter-active,
.tree-expand-leave-active {
  transition: all 0.15s ease;
  overflow: hidden;
}

.tree-expand-enter-from,
.tree-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.tree-expand-enter-to,
.tree-expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>