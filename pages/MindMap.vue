
<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  ArrowLeft, Home, Hand, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  Palette, FileJson, Upload, Plus, ChevronRight, ChevronDown, X, Keyboard,
  LayoutGrid, Link2, Sparkles, Menu, Clock, Trash2, AlertTriangle, Image as ImageIcon, Download, ChevronUp
} from 'lucide-vue-next'

type LayoutType = 'mind-map' | 'org-chart' | 'right-only'
type LineStyle = 'curve' | 'straight' | 'polyline'

interface MindNode {
  id: string
  text: string
  children: MindNode[]
  collapsed?: boolean
  x?: number
  y?: number
  width?: number
  height?: number
  parent?: MindNode
  level?: number
}

interface Theme {
  name: string
  bg: string
  colors: string[]
}

const mindMapName = ref('未命名')
const rootNode = ref<MindNode>({ id: '1', text: '中心主题', children: [] })

const themes: Theme[] = [
  { name: '极简白', bg: '#f8fafc', colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'] },
  { name: '商务蓝', bg: '#f1f5f9', colors: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'] },
  { name: '森林绿', bg: '#f0fdf4', colors: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'] },
  { name: '深邃黑', bg: '#0f172a', colors: ['#38bdf8', '#818cf8', '#c084fc', '#fb7185', '#fb923c', '#fbbf24'] },
  { name: '优雅紫', bg: '#faf5ff', colors: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'] },
]

const currentTheme = ref<Theme>(themes[0])
const showThemePanel = ref(false)
const layoutType = ref<LayoutType>('mind-map')
const lineStyle = ref<LineStyle>('curve')
const showLayoutPanel = ref(false)

const zoom = ref(1)
const panOffset = reactive({ x: 0, y: 0 })
const isPanMode = ref(false)
const isPanning = ref(false)
const isSpacePressed = ref(false)
const panStart = reactive({ x: 0, y: 0, panX: 0, panY: 0 })

// 布局版本号，用于强制触发 flatNodes 重新计算
const layoutVersion = ref(0)

// 坐标偏移量，用于确保所有节点坐标都是正数（避免 SVG 裁剪问题）
const layoutOffset = reactive({ x: 0, y: 0 })

const selectedNode = ref<MindNode | null>(null)
const editingNode = ref<MindNode | null>(null)
const editingText = ref('')
const showShortcuts = ref(false)
const showHistory = ref(false)
const showNameDialog = ref(false)
const tempName = ref('')
const currentFileId = ref<string | null>(null)  // 当前文件ID
const previousState = ref<string | null>(null)  // 新建前的状态（用于取消）
const contextMenu = reactive({ show: false, x: 0, y: 0, node: null as MindNode | null })
const showExportMenu = ref(false)  // 导出菜单显示状态

// 确认弹窗状态
const confirmDialog = reactive({
  show: false,
  title: '',
  message: '',
  type: 'warning' as 'warning' | 'danger',
  onConfirm: null as (() => void) | null
})

interface HistoryRecord {
  id: string
  name: string
  timestamp: number
  data: string
}

const historyRecords = ref<HistoryRecord[]>([])

const openContextMenu = (e: MouseEvent, node: MindNode) => {
  e.preventDefault()
  contextMenu.show = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.node = node
  selectedNode.value = node
}

const closeContextMenu = () => {
  contextMenu.show = false
}

const history = ref<string[]>([])
const historyIndex = ref(-1)

const canvasContainer = ref<HTMLElement | null>(null)
const canvasWrapper = ref<HTMLElement | null>(null)
const canvasContent = ref<HTMLElement | null>(null)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

const measureText = (text: string, fontSize: number = 14, isRoot: boolean = false): { width: number; height: number } => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { width: 120, height: 40 }
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

  // 统一使用 500px 宽度
  const maxWidth = 500
  const lineHeight = fontSize * 1.5
  const padding = 40
  const contentWidth = maxWidth - padding

  // 按换行符分割文本
  const paragraphs = text.split('\n')
  let maxLineWidth = 0
  let actualLines = 0

  // 计算每个段落的宽度和行数
  paragraphs.forEach(paragraph => {
    if (paragraph.length === 0) {
      actualLines += 1
    } else {
      const paragraphWidth = ctx.measureText(paragraph).width
      maxLineWidth = Math.max(maxLineWidth, paragraphWidth)
      const linesNeeded = Math.ceil(paragraphWidth / contentWidth)
      actualLines += Math.max(1, linesNeeded)
    }
  })

  // 计算最终尺寸
  const needsWrap = maxLineWidth > contentWidth || actualLines > 1

  if (needsWrap) {
    // 需要换行或有多行
    const height = Math.max(38, actualLines * lineHeight + 16)
    return {
      width: maxWidth,
      height: height
    }
  }

  // 短文字：使用实际宽度
  return {
    width: Math.max(80, maxLineWidth + padding),
    height: isRoot ? 50 : 38
  }
}

const flatNodes = computed(() => {
  // 依赖 layoutVersion 以便在布局更新时强制重新计算
  const _version = layoutVersion.value
  const nodes: MindNode[] = []
  const traverse = (node: MindNode, parent: MindNode | null = null, level = 0) => {
    const size = measureText(node.text, level === 0 ? 20 : 15, level === 0)
    node.width = size.width
    node.height = size.height
    // 确保包含最新的 x 和 y 值，并应用偏移量
    nodes.push({
      ...node,
      parent,
      level,
      x: (node.x ?? 0) + layoutOffset.x,
      y: (node.y ?? 0) + layoutOffset.y,
      width: node.width,
      height: node.height
    })
    if (!node.collapsed && node.children) {
      node.children.forEach(child => traverse(child, node, level + 1))
    }
  }
  traverse(rootNode.value)
  return nodes
})


const canvasSize = computed(() => {
  let maxX = 0, maxY = 0
  flatNodes.value.forEach(n => {
    if (n.x !== undefined && n.y !== undefined && n.width && n.height) {
      // 计算节点的右边界和下边界
      maxX = Math.max(maxX, n.x + n.width / 2)
      maxY = Math.max(maxY, n.y + n.height / 2)
    }
  })
  // 添加边距，确保画布足够大
  const padding = 500
  return {
    width: Math.max(3000, maxX + padding),
    height: Math.max(2000, maxY + padding)
  }
})

const generateId = () => Math.random().toString(36).substr(2, 9)

const getNodeColor = (node: MindNode): string => {
  if (node.level === 0) return currentTheme.value.colors[0]
  const idx = parseInt(node.id, 36) % (currentTheme.value.colors.length - 1)
  return currentTheme.value.colors[idx + 1]
}

// 获取节点的第二颜色（用于渐变和边框）
const getNodeSecondColor = (node: MindNode): string => {
  if (node.level === 0) return currentTheme.value.colors[1]
  const idx = parseInt(node.id, 36) % (currentTheme.value.colors.length - 1)
  return currentTheme.value.colors[(idx + 2) % currentTheme.value.colors.length]
}

const adjustColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, Math.min(255, (num >> 16) + amt))
  const G = Math.max(0, Math.min(255, (num >> 8 & 0x00FF) + amt))
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt))
  return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)
}

const calculateLayout = () => {
  const root = rootNode.value
  // 基础间距：edgeGap 是节点边缘之间的固定间距，y 是垂直间距
  const edgeGap = 60  // 节点边缘之间的固定间距
  const spacing = { y: 40 }

  // 首先更新所有节点的尺寸
  const updateNodeSizes = (node: MindNode, level: number = 0) => {
    const size = measureText(node.text, level === 0 ? 20 : 15, level === 0)
    node.width = size.width
    node.height = size.height
    if (node.children) {
      node.children.forEach(child => updateNodeSizes(child, level + 1))
    }
  }
  updateNodeSizes(root)

  if (layoutType.value === 'mind-map') {
    root.x = 1500
    root.y = 1000

    // 计算分支所需的总高度
    // 这个高度必须能容纳：1) 节点自身 2) 所有子节点的分支
    const getBranchHeight = (node: MindNode): number => {
      // 对于高节点，增加额外的间距
      const extraSpacing = Math.max(0, ((node.height || 40) - 100) * 0.2)
      const nodeHeight = (node.height || 40) + spacing.y + extraSpacing
      if (node.collapsed || !node.children || node.children.length === 0) {
        return nodeHeight
      }
      const childrenHeight = node.children.reduce((sum, child) => sum + getBranchHeight(child), 0)
      // 分支高度必须能同时容纳节点自身和所有子节点
      return Math.max(nodeHeight, childrenHeight)
    }

    // 布局分支，返回子节点占用的实际高度范围
    // parentNode 是父节点，用于计算基于边缘的间距
    const layoutBranch = (children: MindNode[], startY: number, isRight: boolean, parentNode: MindNode): void => {
      // 计算所有子节点的总高度
      const totalChildrenHeight = children.reduce((sum, child) => sum + getBranchHeight(child), 0)

      // 如果父节点存在且其高度大于子节点总高度，需要调整起始位置使子节点居中
      let adjustedStartY = startY
      const parentHeight = (parentNode.height || 40) + spacing.y
      if (parentHeight > totalChildrenHeight) {
        // 子节点需要相对于父节点居中
        adjustedStartY = parentNode.y! - totalChildrenHeight / 2
      }

      let currentY = adjustedStartY
      children.forEach(child => {
        const branchHeight = getBranchHeight(child)
        const childNodeHeight = (child.height || 40) + spacing.y

        // 基于边缘间距计算子节点的 x 位置
        // 父节点边缘 + 固定间距 + 子节点半宽 = 子节点中心位置
        const parentEdge = parentNode.x! + (isRight ? (parentNode.width || 120) / 2 : -(parentNode.width || 120) / 2)
        const childHalfWidth = (child.width || 120) / 2
        child.x = parentEdge + (isRight ? edgeGap + childHalfWidth : -edgeGap - childHalfWidth)

        // 节点在其分支空间中居中
        child.y = currentY + branchHeight / 2

        if (!child.collapsed && child.children && child.children.length > 0) {
          // 计算子节点的起始Y位置
          const childrenTotalHeight = child.children.reduce((sum, c) => sum + getBranchHeight(c), 0)
          // 子节点应该相对于当前节点居中
          const childStartY = child.y! - childrenTotalHeight / 2
          layoutBranch(child.children, childStartY, isRight, child)
        }
        currentY += branchHeight
      })
    }

    if (!root.collapsed && root.children && root.children.length > 0) {
      // 按索引奇偶交替分配左右，避免节点位置剧变
      // 偶数索引 (0, 2, 4...) -> 右边
      // 奇数索引 (1, 3, 5...) -> 左边
      const rightChildren: MindNode[] = []
      const leftChildren: MindNode[] = []
      root.children.forEach((child, index) => {
        if (index % 2 === 0) {
          rightChildren.push(child)
        } else {
          leftChildren.push(child)
        }
      })

      const rightHeight = rightChildren.reduce((sum, c) => sum + getBranchHeight(c), 0)
      const leftHeight = leftChildren.reduce((sum, c) => sum + getBranchHeight(c), 0)

      if (rightChildren.length > 0) layoutBranch(rightChildren, root.y! - rightHeight / 2, true, root)
      if (leftChildren.length > 0) layoutBranch(leftChildren, root.y! - leftHeight / 2, false, root)
    }
  } else if (layoutType.value === 'right-only') {
    // 计算分支所需的总高度
    const getBranchHeight = (node: MindNode): number => {
      // 对于高节点，增加额外的间距
      const extraSpacing = Math.max(0, ((node.height || 40) - 100) * 0.2)
      const nodeHeight = (node.height || 40) + spacing.y + extraSpacing
      if (node.collapsed || !node.children || node.children.length === 0) {
        return nodeHeight
      }
      const childrenHeight = node.children.reduce((sum, child) => sum + getBranchHeight(child), 0)
      return Math.max(nodeHeight, childrenHeight)
    }

    // 递归布局函数，使用边缘间距
    const layoutNode = (node: MindNode, startY: number, parentNode: MindNode | null): number => {
      const branchHeight = getBranchHeight(node)

      // 计算节点的 x 位置：基于父节点边缘 + 固定间距 + 自身半宽
      if (parentNode) {
        const parentRightEdge = parentNode.x! + (parentNode.width || 120) / 2
        const nodeHalfWidth = (node.width || 120) / 2
        node.x = parentRightEdge + edgeGap + nodeHalfWidth
      } else {
        // 根节点
        node.x = 300
      }

      // 节点在其分支空间中居中
      node.y = startY + branchHeight / 2

      if (node.collapsed || !node.children || node.children.length === 0) {
        return startY + branchHeight
      }

      // 计算子节点的总高度
      const childrenTotalHeight = node.children.reduce((sum, child) => sum + getBranchHeight(child), 0)
      // 子节点相对于当前节点居中
      let currentY = node.y! - childrenTotalHeight / 2

      node.children.forEach(child => {
        const childBranchHeight = getBranchHeight(child)
        layoutNode(child, currentY, node)
        currentY += childBranchHeight
      })

      return startY + branchHeight
    }

    layoutNode(root, 1000, null)
  } else if (layoutType.value === 'org-chart') {
    const horizontalGap = 60  // 组织图的水平间距

    const getSubtreeWidth = (node: MindNode): number => {
      if (node.collapsed || !node.children || node.children.length === 0) {
        return node.width || 120
      }
      const childrenWidth = node.children.reduce((sum, child) => sum + getSubtreeWidth(child), 0)
      const gaps = (node.children.length - 1) * horizontalGap
      return Math.max(node.width || 120, childrenWidth + gaps)
    }

    // 计算子树高度（用于垂直间距）
    const getSubtreeHeight = (node: MindNode): number => {
      const nodeHeight = (node.height || 40)
      if (node.collapsed || !node.children || node.children.length === 0) {
        return nodeHeight
      }
      const maxChildHeight = Math.max(...node.children.map(child => getSubtreeHeight(child)))
      return nodeHeight + 120 + maxChildHeight
    }

    const layout = (node: MindNode, x: number, y: number) => {
      node.x = x
      node.y = y

      if (!node.collapsed && node.children && node.children.length > 0) {
        const subtreeWidth = getSubtreeWidth(node)
        let currentX = x - subtreeWidth / 2

        // 计算垂直间距，考虑节点自身高度
        const verticalSpacing = Math.max(120, (node.height || 40) + 80)

        node.children.forEach(child => {
          const childWidth = getSubtreeWidth(child)
          layout(child, currentX + childWidth / 2, y + verticalSpacing)
          currentX += childWidth + horizontalGap
        })
      }
    }

    layout(root, 1500, 200)
  }
  
  // 布局计算完成后，计算偏移量确保所有节点坐标都是正数
  // 这样可以避免 SVG 坐标为负数时连接线被裁剪的问题
  // 注意：不直接修改节点坐标，而是使用 layoutOffset，避免触发 watch 导致无限循环
  const allNodes: MindNode[] = []
  const collectNodes = (node: MindNode) => {
    allNodes.push(node)
    if (!node.collapsed && node.children) {
      node.children.forEach(collectNodes)
    }
  }
  collectNodes(root)
  
  // 计算最小坐标
  let minX = Infinity, minY = Infinity
  allNodes.forEach(n => {
    if (n.x !== undefined && n.width) minX = Math.min(minX, n.x - n.width / 2)
    if (n.y !== undefined && n.height) minY = Math.min(minY, n.y - n.height / 2)
  })
  
  // 如果最小坐标小于边距，计算需要的偏移量
  const padding = 500
  const newOffsetX = minX < padding ? padding - minX : 0
  const newOffsetY = minY < padding ? padding - minY : 0
  
  // 计算偏移量的变化，用于调整视图位置
  const deltaX = newOffsetX - layoutOffset.x
  const deltaY = newOffsetY - layoutOffset.y
  
  // 更新偏移量（这不会触发 rootNode 的 watch）
  layoutOffset.x = newOffsetX
  layoutOffset.y = newOffsetY
  
  // 如果偏移量发生变化，同时调整 panOffset 来保持视图稳定
  // 这样节点在屏幕上的位置不会因为 layoutOffset 变化而跳动
  if (deltaX !== 0 || deltaY !== 0) {
    panOffset.x -= deltaX
    panOffset.y -= deltaY
  }
  
  // 布局计算完成后，增加版本号强制 flatNodes 重新计算
  layoutVersion.value++
}

// 防抖函数
let layoutTimer: ReturnType<typeof setTimeout> | null = null
const debouncedCalculateLayout = () => {
  if (layoutTimer) clearTimeout(layoutTimer)
  layoutTimer = setTimeout(() => {
    calculateLayout()
  }, 16) // 约60fps
}

// Watch for changes that require layout recalculation
watch([rootNode, layoutType], () => {
  debouncedCalculateLayout()
}, { deep: true, immediate: true })

const getNodeStyle = (node: MindNode) => ({
  left: `${node.x}px`,
  top: `${node.y}px`,
  transform: 'translate(-50%, -50%)'
})

// 将带透明度的十六进制颜色转换为实心颜色（与背景混合）
const blendWithBackground = (hexColor: string, alpha: number, bgColor: string = '#ffffff'): string => {
  // 解析颜色
  const parseHex = (hex: string) => {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    }
  }
  
  const fg = parseHex(hexColor)
  const bg = parseHex(bgColor)
  
  // 混合颜色
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha))
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha))
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha))
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

const getNodeContentStyle = (node: MindNode) => {
  const color = getNodeColor(node)
  const secondColor = getNodeSecondColor(node)
  const isRoot = node.level === 0
  const isFirstLevel = node.level === 1
  const isDark = currentTheme.value.name === '深邃黑'
  const bgBase = isDark ? '#1e293b' : '#ffffff'
  
  // 根节点：实心渐变背景 + 阴影（无边框）
  if (isRoot) {
    return {
      background: `linear-gradient(135deg, ${color} 0%, ${secondColor} 100%)`,
      border: 'none',
      boxSizing: 'border-box' as const,
      boxShadow: `0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)`,
      color: '#fff',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
    }
  }
  
  // 一级子节点：实心背景渐变
  if (isFirstLevel) {
    const bgColor1 = blendWithBackground(color, isDark ? 0.35 : 0.2, bgBase)
    const bgColor2 = blendWithBackground(secondColor, isDark ? 0.2 : 0.12, bgBase)
    return {
      background: `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%)`,
      borderColor: color,
      borderWidth: '2px',
      borderStyle: 'solid' as const,
      boxSizing: 'border-box' as const,
      boxShadow: selectedNode.value?.id === node.id
        ? `0 0 0 3px ${blendWithBackground(color, 0.3, bgBase)}, 0 6px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)`
        : `0 3px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)`,
      color: isDark ? '#f1f5f9' : '#1e293b',
      fontWeight: '600'
    }
  }

  // 二级及以下节点：实心质感设计
  const thirdColor = currentTheme.value.colors[(parseInt(node.id, 36) + 2) % currentTheme.value.colors.length]
  const bgColor1 = blendWithBackground(color, isDark ? 0.25 : 0.15, bgBase)
  const bgColor2 = blendWithBackground(secondColor, isDark ? 0.15 : 0.08, bgBase)
  
  return {
    background: `linear-gradient(145deg, ${bgColor1} 0%, ${bgColor2} 25%, ${bgBase} 100%)`,
    borderColor: selectedNode.value?.id === node.id ? color : secondColor,
    borderWidth: '2px',
    borderStyle: 'solid' as const,
    boxSizing: 'border-box' as const,
    borderLeftWidth: '5px',
    borderLeftColor: color,
    borderRightWidth: '1px',
    borderRightColor: blendWithBackground(thirdColor, isDark ? 0.4 : 0.3, bgBase),
    borderTopWidth: '1px',
    borderTopColor: blendWithBackground(secondColor, isDark ? 0.5 : 0.4, bgBase),
    borderBottomWidth: '2px',
    borderBottomColor: thirdColor,
    boxShadow: selectedNode.value?.id === node.id
      ? `0 0 0 3px ${blendWithBackground(color, 0.3, bgBase)},
         0 8px 16px -4px rgba(0, 0, 0, 0.2),
         0 4px 8px -2px rgba(0, 0, 0, 0.1)`
      : `0 3px 8px -2px rgba(0, 0, 0, 0.12),
         0 2px 4px -1px rgba(0, 0, 0, 0.08)`,
    color: isDark ? '#f1f5f9' : '#334155'
  }
}

const getConnectionPath = (node: MindNode) => {
  if (!node.parent) return ''
  
  // 使用 undefined 检查而不是 falsy 检查，避免坐标为 0 时被误判
  // 注意：node.x 和 node.y 已经在 flatNodes 中应用了偏移量
  // 但 node.parent 指向的是原始节点，需要手动应用偏移量
  const px = node.parent.x
  const py = node.parent.y
  const nx = node.x
  const ny = node.y
  
  if (px === undefined || py === undefined || nx === undefined || ny === undefined) return ''
  
  const pw = node.parent.width || 120
  const ph = node.parent.height || 40
  const nw = node.width || 120
  const nh = node.height || 40
  
  // 暴力修复：让连接线深入节点内部，彻底消除缝隙
  // 父节点是根节点时延伸更多（因为根节点边框更粗 3px）
  // 增大 overlap 值确保在高缩放比例（如180%）下也没有缝隙
  const parentOverlap = node.parent.level === 0 ? 10 : 6
  const nodeOverlap = node.level === 0 ? 10 : 6
  
  // 给父节点坐标也应用偏移量（因为 node.parent 指向原始节点）
  let sx = (node.parent.x ?? 0) + layoutOffset.x
  let sy = (node.parent.y ?? 0) + layoutOffset.y
  let ex = node.x
  let ey = node.y
  
  if (layoutType.value === 'org-chart') {
    // 组织架构图：从父节点底部连接到子节点顶部
    sy += ph / 2 - parentOverlap
    ey -= nh / 2 - nodeOverlap
    
    if (lineStyle.value === 'straight') return `M ${sx} ${sy} L ${ex} ${ey}`
    else if (lineStyle.value === 'polyline') {
      const my = (sy + ey) / 2
      return `M ${sx} ${sy} L ${sx} ${my} L ${ex} ${my} L ${ex} ${ey}`
    } else {
      const cy = (sy + ey) / 2
      return `M ${sx} ${sy} C ${sx} ${cy}, ${ex} ${cy}, ${ex} ${ey}`
    }
  } else {
    // 思维导图/逻辑图：从父节点侧边连接到子节点侧边
    // 连接线稍微延伸进入节点内部，消除缝隙
    if (ex > sx) {
      sx += pw / 2 - parentOverlap
      ex -= nw / 2 - nodeOverlap
    } else {
      sx -= pw / 2 - parentOverlap
      ex += nw / 2 - nodeOverlap
    }
    
    if (lineStyle.value === 'straight') return `M ${sx} ${sy} L ${ex} ${ey}`
    else if (lineStyle.value === 'polyline') {
      const mx = (sx + ex) / 2
      return `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ey} L ${ex} ${ey}`
    } else {
      const cx = (sx + ex) / 2
      return `M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ey}, ${ex} ${ey}`
    }
  }
}

// 同步锁，防止快速按键时重复添加节点
let isAddingNode = false
// 上次添加节点的时间戳，用于防抖
let lastAddNodeTime = 0
const ADD_NODE_DEBOUNCE_MS = 300

const addChildNode = (parent: MindNode) => {
  // 同步锁检查 - 防止在添加过程中重复调用
  if (isAddingNode) {
    return
  }

  // 时间戳防抖检查 - 防止快速连续按键
  const now = Date.now()
  if (now - lastAddNodeTime < ADD_NODE_DEBOUNCE_MS) {
    return
  }

  // 如果正在编辑，不添加新节点
  if (editingNode.value) {
    return
  }

  // 设置同步锁和时间戳
  isAddingNode = true
  lastAddNodeTime = now
  
  // 找到原始节点（rootNode 中的节点，而不是 flatNodes 中的副本）
  const originalParent = findNodeById(parent.id)
  if (!originalParent) {
    isAddingNode = false
    return
  }
  
  const newNodeId = generateId()
  const newNode: MindNode = { id: newNodeId, text: '新节点', children: [] }
  if (!originalParent.children) originalParent.children = []
  originalParent.children.push(newNode)
  originalParent.collapsed = false  // 自动展开父节点
  
  // 立即计算布局，确保新节点立即显示
  calculateLayout()
  
  // 强制访问 flatNodes 触发重新计算，然后从 flatNodes 中找到新节点
  // 这样可以确保 selectedNode 指向的是 flatNodes 中的节点副本
  const flatNodesList = flatNodes.value
  const newNodeInFlat = flatNodesList.find(n => n.id === newNodeId)
  
  // 使用 flatNodes 中的节点副本来设置 selectedNode
  // 如果找不到（理论上不应该发生），则使用原始节点
  selectedNode.value = newNodeInFlat || newNode
  
  // 立即进入编辑模式，这样后续的Tab键会被 editingNode 检查阻止
  // 同步设置 editingNode，确保下一次按键时能检测到
  editingNode.value = newNodeInFlat || newNode
  editingText.value = newNode.text
  
  // 使用 nextTick 确保 DOM 更新后再保存历史和聚焦输入框
  nextTick(() => {
    saveHistory()
    // 聚焦输入框
    const input = document.querySelector('.node-editing-input') as HTMLInputElement
    if (input) {
      input.focus()
      input.select()
    }
    // 在 nextTick 完成后释放锁
    isAddingNode = false
  })
}

const findParentNode = (target: MindNode, current: MindNode = rootNode.value): MindNode | null => {
  if (current.children) {
    for (const child of current.children) {
      if (child.id === target.id) return current
      const found = findParentNode(target, child)
      if (found) return found
    }
  }
  return null
}

// 根据 ID 查找原始节点
const findNodeById = (id: string, current: MindNode = rootNode.value): MindNode | null => {
  if (current.id === id) return current
  if (current.children) {
    for (const child of current.children) {
      const found = findNodeById(id, child)
      if (found) return found
    }
  }
  return null
}

// 获取节点的层级
const getNodeLevel = (node: MindNode): number => {
  if (node.id === rootNode.value.id) return 0
  let level = 0
  let current: MindNode | null = node
  while (current) {
    const parent = findParentNode(current)
    if (parent) {
      level++
      current = parent
    } else {
      break
    }
  }
  return level
}

const deleteNode = (node: MindNode) => {
  if (node.id === rootNode.value.id) return alert('不能删除根节点')
  const parent = findParentNode(node)
  if (parent?.children) {
    parent.children = parent.children.filter(c => c.id !== node.id)
    saveHistory()
    if (selectedNode.value?.id === node.id) selectedNode.value = null
  }
}

const toggleCollapse = (node: MindNode) => {
  // 找到原始节点（rootNode 中的节点，而不是 flatNodes 中的副本）
  const originalNode = findNodeById(node.id)
  if (!originalNode) return
  
  originalNode.collapsed = !originalNode.collapsed
  // 不再手动调用 calculateLayout()，让 watch 来处理
  nextTick(() => {
    saveHistory()
  })
}

const startEditingNode = (node: MindNode) => {
  editingNode.value = node
  editingText.value = node.text
  nextTick(() => {
    const input = document.querySelector('.node-editing-input') as HTMLTextAreaElement
    if (input) {
      input.focus()
      input.select()
      autoResizeTextarea()
    }
  })
}

const autoResizeTextarea = () => {
  nextTick(() => {
    const textarea = document.querySelector('.node-editing-input') as HTMLTextAreaElement
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  })
}

const finishEditingNode = () => {
  if (!editingNode.value) {
    return
  }
  
  // 找到原始节点（rootNode 中的节点，而不是 flatNodes 中的副本）
  const originalNode = findNodeById(editingNode.value.id)
  if (!originalNode) {
    editingNode.value = null
    return
  }
  
  const oldText = originalNode.text
  // 如果文本为空，使用默认值
  const newText = editingText.value.trim() || '新节点'
  
  // 更新原始节点的文本
  originalNode.text = newText
  
  // 如果文本发生变化，更新尺寸（布局会由 watch 自动触发）
  if (oldText !== newText) {
    // 获取节点层级并计算新的尺寸
    const level = getNodeLevel(originalNode)
    const size = measureText(newText, level === 0 ? 20 : 15, level === 0)
    originalNode.width = size.width
    originalNode.height = size.height
    
    // 布局会由 watch 自动触发，这里只需要保存历史
    nextTick(() => {
      saveHistory()
    })
  }
  
  editingNode.value = null
}

const onCanvasMouseDown = (e: MouseEvent) => {
  closeContextMenu()
  // 中键点击用于拖动画布
  if (e.button === 1) {
    isPanning.value = true
    panStart.x = e.clientX
    panStart.y = e.clientY
    panStart.panX = panOffset.x
    panStart.panY = panOffset.y
    e.preventDefault()
    e.stopPropagation()
    return
  }
  // 左键 + Alt/空格/拖动模式 用于拖动画布
  if (e.button === 0 && (e.altKey || isPanMode.value || isSpacePressed.value)) {
    isPanning.value = true
    panStart.x = e.clientX
    panStart.y = e.clientY
    panStart.panX = panOffset.x
    panStart.panY = panOffset.y
    e.preventDefault()
    return
  }
  // 左键点击空白区域取消选择
  if (e.button === 0 && e.target === canvasWrapper.value) {
    selectedNode.value = null
  }
}

// 阻止中键点击的默认行为（自动滚动）
const onCanvasAuxClick = (e: MouseEvent) => {
  if (e.button === 1) {
    e.preventDefault()
    e.stopPropagation()
  }
}

const onCanvasMouseMove = (e: MouseEvent) => {
  if (isPanning.value) {
    panOffset.x = panStart.panX + (e.clientX - panStart.x) / zoom.value
    panOffset.y = panStart.panY + (e.clientY - panStart.y) / zoom.value
  }
}

const onCanvasMouseUp = () => { isPanning.value = false }

const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    zoom.value = Math.min(2, Math.max(0.25, zoom.value + delta))
    e.preventDefault()
  }
}

const zoomIn = () => { zoom.value = Math.min(2, zoom.value + 0.1) }
const zoomOut = () => { zoom.value = Math.max(0.25, zoom.value - 0.1) }
const resetZoom = () => { zoom.value = 1; panOffset.x = 0; panOffset.y = 0 }
const centerRoot = () => {
  zoom.value = 1
  // 使用根节点的实际位置（加上偏移量）进行居中
  const rootX = (rootNode.value.x ?? 1500) + layoutOffset.x
  const rootY = (rootNode.value.y ?? 1000) + layoutOffset.y
  panOffset.x = (window.innerWidth / 2 - rootX)
  panOffset.y = (window.innerHeight / 2 - rootY)
}

// 初始化撤销/重做历史（不保存到历史记录列表）
const initUndoHistory = () => {
  const state = JSON.stringify({ name: mindMapName.value, root: rootNode.value, layout: layoutType.value, theme: currentTheme.value.name, lineStyle: lineStyle.value })
  history.value = [state]
  historyIndex.value = 0
  localStorage.setItem('mindmap_data', state)
}

const saveHistory = () => {
  const state = JSON.stringify({ name: mindMapName.value, root: rootNode.value, layout: layoutType.value, theme: currentTheme.value.name, lineStyle: lineStyle.value })
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(state)
  if (history.value.length > 50) history.value.shift()
  else historyIndex.value++
  localStorage.setItem('mindmap_data', state)

  // 同步更新当前文件在历史文件列表中的数据
  if (currentFileId.value) {
    const currentRecord = historyRecords.value.find(r => r.id === currentFileId.value)
    if (currentRecord) {
      currentRecord.name = mindMapName.value
      currentRecord.data = JSON.stringify({
        name: mindMapName.value,
        root: rootNode.value,
        layout: layoutType.value,
        theme: currentTheme.value.name,
        lineStyle: lineStyle.value
      })
      currentRecord.timestamp = Date.now()
      localStorage.setItem('mindmap_history', JSON.stringify(historyRecords.value))
    }
  }
}

// 添加新文件到历史文件列表
const addToHistoryFiles = () => {
  const newId = Date.now().toString()
  const record: HistoryRecord = {
    id: newId,
    name: mindMapName.value,
    timestamp: Date.now(),
    data: JSON.stringify({
      name: mindMapName.value,
      root: rootNode.value,
      layout: layoutType.value,
      theme: currentTheme.value.name,
      lineStyle: lineStyle.value
    })
  }

  // 设置当前文件ID
  currentFileId.value = newId

  // 添加新文件
  historyRecords.value.unshift(record)
  // 限制文件数量
  if (historyRecords.value.length > 20) {
    historyRecords.value = historyRecords.value.slice(0, 20)
  }

  localStorage.setItem('mindmap_history', JSON.stringify(historyRecords.value))
}

// 新建思维导图
const createNewMindMap = () => {
  // 保存当前状态（用于取消时恢复）
  previousState.value = JSON.stringify({
    name: mindMapName.value,
    root: rootNode.value,
    layout: layoutType.value,
    theme: currentTheme.value.name,
    lineStyle: lineStyle.value,
    fileId: currentFileId.value
  })

  // 重置为默认状态
  mindMapName.value = '未命名'
  rootNode.value = { id: '1', text: '中心主题', children: [] }
  layoutType.value = 'mind-map'
  lineStyle.value = 'curve'
  currentTheme.value = themes[0]
  selectedNode.value = null
  currentFileId.value = null

  // 显示命名对话框
  tempName.value = ''
  showNameDialog.value = true

  nextTick(() => {
    centerRoot()
    const input = document.querySelector('.fixed input[type="text"]') as HTMLInputElement
    if (input) input.focus()
  })
}

const loadHistoryRecords = () => {
  const saved = localStorage.getItem('mindmap_history')
  if (saved) {
    try {
      historyRecords.value = JSON.parse(saved)
    } catch {
      historyRecords.value = []
    }
  }
}

const loadHistoryRecord = (record: HistoryRecord) => {
  try {
    const data = JSON.parse(record.data)
    mindMapName.value = data.name || '导入的思维导图'
    rootNode.value = data.root
    layoutType.value = data.layout || 'mind-map'
    lineStyle.value = data.lineStyle || 'curve'
    if (data.theme) {
      const theme = themes.find(t => t.name === data.theme)
      if (theme) currentTheme.value = theme
    }
    // 设置当前文件ID
    currentFileId.value = record.id
    initUndoHistory()
    showHistory.value = false
  } catch {
    alert('加载失败')
  }
}

// 显示确认弹窗
const showConfirmDialog = (options: { title: string; message: string; type?: 'warning' | 'danger'; onConfirm: () => void }) => {
  confirmDialog.title = options.title
  confirmDialog.message = options.message
  confirmDialog.type = options.type || 'warning'
  confirmDialog.onConfirm = options.onConfirm
  confirmDialog.show = true
}

// 确认弹窗操作
const handleConfirmDialog = () => {
  if (confirmDialog.onConfirm) {
    confirmDialog.onConfirm()
  }
  confirmDialog.show = false
}

const cancelConfirmDialog = () => {
  confirmDialog.show = false
  confirmDialog.onConfirm = null
}

const deleteHistoryRecord = (id: string) => {
  showConfirmDialog({
    title: '删除文件',
    message: '确定要删除这个文件吗？删除后无法恢复。',
    type: 'warning',
    onConfirm: () => {
      historyRecords.value = historyRecords.value.filter(r => r.id !== id)
      localStorage.setItem('mindmap_history', JSON.stringify(historyRecords.value))

      // If no more history records, start new mind map
      if (historyRecords.value.length === 0) {
        // Reset to default state
        mindMapName.value = '未命名'
        rootNode.value = { id: '1', text: '中心主题', children: [] }
        layoutType.value = 'mind-map'
        lineStyle.value = 'curve'
        currentTheme.value = themes[0]
        selectedNode.value = null

        // Clear localStorage
        localStorage.removeItem('mindmap_data')

        // Close history panel and show name dialog
        showHistory.value = false
        tempName.value = ''
        showNameDialog.value = true

        nextTick(() => {
          centerRoot()
          const input = document.querySelector('.fixed input[type="text"]') as HTMLInputElement
          if (input) input.focus()
        })
      }
    }
  })
}

const deleteAllHistoryRecords = () => {
  showConfirmDialog({
    title: '删除全部文件',
    message: '确定要删除全部文件吗？此操作将清空所有文件并重置当前脑图，无法恢复！',
    type: 'danger',
    onConfirm: () => {
      // 清空历史文件
      historyRecords.value = []
      localStorage.setItem('mindmap_history', JSON.stringify(historyRecords.value))

      // 重置当前脑图为初始状态
      mindMapName.value = '未命名'
      rootNode.value = { id: '1', text: '中心主题', children: [] }
      layoutType.value = 'mind-map'
      lineStyle.value = 'curve'
      currentTheme.value = themes[0]
      selectedNode.value = null

      // 清空本地存储的脑图数据
      localStorage.removeItem('mindmap_data')

      // 关闭历史面板，显示命名对话框
      showHistory.value = false
      tempName.value = ''
      showNameDialog.value = true

      nextTick(() => {
        centerRoot()
        const input = document.querySelector('.fixed input[type="text"]') as HTMLInputElement
        if (input) input.focus()
      })
    }
  })
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--
    const state = JSON.parse(history.value[historyIndex.value])
    if (state.name) mindMapName.value = state.name
    rootNode.value = state.root
    layoutType.value = state.layout || 'mind-map'
    lineStyle.value = state.lineStyle || 'curve'
  }
}

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++
    const state = JSON.parse(history.value[historyIndex.value])
    if (state.name) mindMapName.value = state.name
    rootNode.value = state.root
    layoutType.value = state.layout || 'mind-map'
    lineStyle.value = state.lineStyle || 'curve'
  }
}

const exportJSON = () => {
  const data = { name: mindMapName.value, root: rootNode.value, layout: layoutType.value, theme: currentTheme.value.name, lineStyle: lineStyle.value }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = `${mindMapName.value}.json`
  link.href = URL.createObjectURL(blob)
  link.click()
}

// 导出SVG图片
const exportSVG = () => {
  // 计算内容边界
  const nodes = flatNodes.value
  if (nodes.length === 0) return

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.forEach(n => {
    const hw = (n.width || 120) / 2
    const hh = (n.height || 40) / 2
    minX = Math.min(minX, n.x! - hw)
    minY = Math.min(minY, n.y! - hh)
    maxX = Math.max(maxX, n.x! + hw)
    maxY = Math.max(maxY, n.y! + hh)
  })

  const exportPadding = 60
  const exportWidth = (maxX - minX) + exportPadding * 2
  const exportHeight = (maxY - minY) + exportPadding * 2
  const offsetX = -minX + exportPadding
  const offsetY = -minY + exportPadding

  // 创建SVG元素
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', exportWidth.toString())
  svg.setAttribute('height', exportHeight.toString())
  svg.setAttribute('viewBox', `0 0 ${exportWidth} ${exportHeight}`)
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  // 添加背景矩形
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bgRect.setAttribute('width', exportWidth.toString())
  bgRect.setAttribute('height', exportHeight.toString())
  bgRect.setAttribute('fill', currentTheme.value.bg)
  svg.appendChild(bgRect)

  // 创建一个组来处理偏移
  const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  mainGroup.setAttribute('transform', `translate(${offsetX}, ${offsetY})`)

  // 添加渐变定义
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  currentTheme.value.colors.forEach((color, idx) => {
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradient.setAttribute('id', `lineGradient-${idx}`)
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse')

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop1.setAttribute('offset', '0%')
    stop1.setAttribute('stop-color', color)

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop2.setAttribute('offset', '100%')
    stop2.setAttribute('stop-color', currentTheme.value.colors[(idx + 1) % currentTheme.value.colors.length])

    gradient.appendChild(stop1)
    gradient.appendChild(stop2)
    defs.appendChild(gradient)
  })
  svg.appendChild(defs)

  // 添加连接线到主组
  flatNodes.value.forEach(node => {
    if (node.parent && node.x !== undefined && node.y !== undefined) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', getConnectionPath(node))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', `url(#lineGradient-${(parseInt(node.id, 36) % (currentTheme.value.colors.length - 1)) + 1})`)
      path.setAttribute('stroke-width', node.level === 1 ? '3.5' : '2.5')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      mainGroup.appendChild(path)
    }
  })

  // 添加节点到主组
  flatNodes.value.forEach(node => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('transform', `translate(${node.x!}, ${node.y!})`)

    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
    foreignObject.setAttribute('x', '-500')
    foreignObject.setAttribute('y', '-500')
    foreignObject.setAttribute('width', '1000')
    foreignObject.setAttribute('height', '1000')
    foreignObject.setAttribute('overflow', 'visible')

    const wrapper = document.createElement('div')
    wrapper.style.display = 'flex'
    wrapper.style.alignItems = 'center'
    wrapper.style.justifyContent = 'center'
    wrapper.style.width = '1000px'
    wrapper.style.height = '1000px'

    const contentDiv = document.createElement('div')
    const isRoot = node.level === 0
    const isFirstLevel = node.level === 1
    const isDark = currentTheme.value.name === '深邃黑'
    const bgBase = isDark ? '#1e293b' : '#ffffff'

    if (isRoot) {
      const color = getNodeColor(node)
      const secondColor = getNodeSecondColor(node)
      contentDiv.style.background = `linear-gradient(135deg, ${color} 0%, ${secondColor} 100%)`
      contentDiv.style.border = 'none'
      contentDiv.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)`
      contentDiv.style.color = '#fff'
      contentDiv.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.2)'
      contentDiv.style.padding = '16px 32px'
      contentDiv.style.borderRadius = '24px'
    } else if (isFirstLevel) {
      const color = getNodeColor(node)
      const secondColor = getNodeSecondColor(node)
      const bgColor1 = blendWithBackground(color, isDark ? 0.35 : 0.2, bgBase)
      const bgColor2 = blendWithBackground(secondColor, isDark ? 0.2 : 0.12, bgBase)
      contentDiv.style.background = `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%)`
      contentDiv.style.borderColor = color
      contentDiv.style.borderWidth = '2px'
      contentDiv.style.borderStyle = 'solid'
      contentDiv.style.boxShadow = `0 3px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)`
      contentDiv.style.color = isDark ? '#f1f5f9' : '#1e293b'
      contentDiv.style.fontWeight = '600'
      contentDiv.style.padding = '12px 24px'
      contentDiv.style.borderRadius = '16px'
    } else {
      const color = getNodeColor(node)
      const secondColor = getNodeSecondColor(node)
      const thirdColor = currentTheme.value.colors[(parseInt(node.id, 36) + 2) % currentTheme.value.colors.length]
      const bgColor1 = blendWithBackground(color, isDark ? 0.25 : 0.15, bgBase)
      const bgColor2 = blendWithBackground(secondColor, isDark ? 0.15 : 0.08, bgBase)
      contentDiv.style.background = `linear-gradient(145deg, ${bgColor1} 0%, ${bgColor2} 25%, ${bgBase} 100%)`
      contentDiv.style.borderColor = secondColor
      contentDiv.style.borderWidth = '2px'
      contentDiv.style.borderStyle = 'solid'
      contentDiv.style.borderLeftWidth = '5px'
      contentDiv.style.borderLeftColor = color
      contentDiv.style.borderRightWidth = '1px'
      contentDiv.style.borderRightColor = blendWithBackground(thirdColor, isDark ? 0.4 : 0.3, bgBase)
      contentDiv.style.borderTopWidth = '1px'
      contentDiv.style.borderTopColor = blendWithBackground(secondColor, isDark ? 0.5 : 0.4, bgBase)
      contentDiv.style.borderBottomWidth = '2px'
      contentDiv.style.borderBottomColor = thirdColor
      contentDiv.style.boxShadow = `0 3px 8px -2px rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.08)`
      contentDiv.style.color = isDark ? '#f1f5f9' : '#334155'
      contentDiv.style.padding = '12px 24px'
      contentDiv.style.borderRadius = '16px'
    }

    contentDiv.style.boxSizing = 'border-box'
    contentDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    const textSpan = document.createElement('span')
    textSpan.textContent = node.text
    textSpan.style.display = 'block'
    textSpan.style.fontWeight = 'bold'
    textSpan.style.whiteSpace = 'pre-wrap'
    textSpan.style.fontSize = isRoot ? '22px' : '15px'
    textSpan.style.letterSpacing = isRoot ? '0.02em' : '-0.025em'
    textSpan.style.maxWidth = '460px'
    textSpan.style.wordBreak = 'break-word'
    textSpan.style.lineHeight = '1.5'

    contentDiv.appendChild(textSpan)
    wrapper.appendChild(contentDiv)
    foreignObject.appendChild(wrapper)
    g.appendChild(foreignObject)
    mainGroup.appendChild(g)
  })

  svg.appendChild(mainGroup)

  // 下载SVG
  const svgData = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([svgData], { type: 'image/svg+xml' })
  const link = document.createElement('a')
  link.download = `${mindMapName.value}.svg`
  link.href = URL.createObjectURL(blob)
  link.click()
}

// 导出PNG图片（通过 SVG 转换）
const exportPNG = () => {
  // 计算内容边界
  const nodes = flatNodes.value
  if (nodes.length === 0) return

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.forEach(n => {
    const hw = (n.width || 120) / 2
    const hh = (n.height || 40) / 2
    minX = Math.min(minX, n.x! - hw)
    minY = Math.min(minY, n.y! - hh)
    maxX = Math.max(maxX, n.x! + hw)
    maxY = Math.max(maxY, n.y! + hh)
  })

  const exportPadding = 100
  const exportWidth = (maxX - minX) + exportPadding * 2
  const exportHeight = (maxY - minY) + exportPadding * 2
  const offsetX = -minX + exportPadding
  const offsetY = -minY + exportPadding

  // 创建SVG元素（与 exportSVG 相同的逻辑）
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', exportWidth.toString())
  svg.setAttribute('height', exportHeight.toString())
  svg.setAttribute('viewBox', `0 0 ${exportWidth} ${exportHeight}`)
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  bgRect.setAttribute('width', exportWidth.toString())
  bgRect.setAttribute('height', exportHeight.toString())
  bgRect.setAttribute('fill', currentTheme.value.bg)
  svg.appendChild(bgRect)

  const mainGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  mainGroup.setAttribute('transform', `translate(${offsetX}, ${offsetY})`)

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
  currentTheme.value.colors.forEach((color, idx) => {
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradient.setAttribute('id', `lineGradient-png-${idx}`)
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse')

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop1.setAttribute('offset', '0%')
    stop1.setAttribute('stop-color', color)

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    stop2.setAttribute('offset', '100%')
    stop2.setAttribute('stop-color', currentTheme.value.colors[(idx + 1) % currentTheme.value.colors.length])

    gradient.appendChild(stop1)
    gradient.appendChild(stop2)
    defs.appendChild(gradient)
  })
  svg.appendChild(defs)

  flatNodes.value.forEach(node => {
    if (node.parent && node.x !== undefined && node.y !== undefined) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', getConnectionPath(node))
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', `url(#lineGradient-png-${(parseInt(node.id, 36) % (currentTheme.value.colors.length - 1)) + 1})`)
      path.setAttribute('stroke-width', node.level === 1 ? '3.5' : '2.5')
      path.setAttribute('stroke-linecap', 'round')
      path.setAttribute('stroke-linejoin', 'round')
      mainGroup.appendChild(path)
    }
  })

  flatNodes.value.forEach(node => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('transform', `translate(${node.x!}, ${node.y!})`)

    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
    foreignObject.setAttribute('x', '-500')
    foreignObject.setAttribute('y', '-500')
    foreignObject.setAttribute('width', '1000')
    foreignObject.setAttribute('height', '1000')
    foreignObject.setAttribute('overflow', 'visible')

    const wrapper = document.createElement('div')
    wrapper.style.display = 'flex'
    wrapper.style.alignItems = 'center'
    wrapper.style.justifyContent = 'center'
    wrapper.style.width = '1000px'
    wrapper.style.height = '1000px'

    const contentDiv = document.createElement('div')
    const isRoot = node.level === 0
    const isFirstLevel = node.level === 1
    const isDark = currentTheme.value.name === '深邃黑'
    const bgBase = isDark ? '#1e293b' : '#ffffff'

    if (isRoot) {
      const color = getNodeColor(node)
      const secondColor = getNodeSecondColor(node)
      contentDiv.style.background = `linear-gradient(135deg, ${color} 0%, ${secondColor} 100%)`
      contentDiv.style.border = 'none'
      contentDiv.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)`
      contentDiv.style.color = '#fff'
      contentDiv.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.2)'
      contentDiv.style.padding = '16px 32px'
      contentDiv.style.borderRadius = '24px'
    } else if (isFirstLevel) {
      const color = getNodeColor(node)
      const secondColor = getNodeSecondColor(node)
      const bgColor1 = blendWithBackground(color, isDark ? 0.35 : 0.2, bgBase)
      const bgColor2 = blendWithBackground(secondColor, isDark ? 0.2 : 0.12, bgBase)
      contentDiv.style.background = `linear-gradient(135deg, ${bgColor1} 0%, ${bgColor2} 100%)`
      contentDiv.style.borderColor = color
      contentDiv.style.borderWidth = '2px'
      contentDiv.style.borderStyle = 'solid'
      contentDiv.style.boxShadow = `0 3px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)`
      contentDiv.style.color = isDark ? '#f1f5f9' : '#1e293b'
      contentDiv.style.fontWeight = '600'
      contentDiv.style.padding = '12px 24px'
      contentDiv.style.borderRadius = '16px'
    } else {
      const color = getNodeColor(node)
      const secondColor = getNodeSecondColor(node)
      const thirdColor = currentTheme.value.colors[(parseInt(node.id, 36) + 2) % currentTheme.value.colors.length]
      const bgColor1 = blendWithBackground(color, isDark ? 0.25 : 0.15, bgBase)
      const bgColor2 = blendWithBackground(secondColor, isDark ? 0.15 : 0.08, bgBase)
      contentDiv.style.background = `linear-gradient(145deg, ${bgColor1} 0%, ${bgColor2} 25%, ${bgBase} 100%)`
      contentDiv.style.borderColor = secondColor
      contentDiv.style.borderWidth = '2px'
      contentDiv.style.borderStyle = 'solid'
      contentDiv.style.borderLeftWidth = '5px'
      contentDiv.style.borderLeftColor = color
      contentDiv.style.borderRightWidth = '1px'
      contentDiv.style.borderRightColor = blendWithBackground(thirdColor, isDark ? 0.4 : 0.3, bgBase)
      contentDiv.style.borderTopWidth = '1px'
      contentDiv.style.borderTopColor = blendWithBackground(secondColor, isDark ? 0.5 : 0.4, bgBase)
      contentDiv.style.borderBottomWidth = '2px'
      contentDiv.style.borderBottomColor = thirdColor
      contentDiv.style.boxShadow = `0 3px 8px -2px rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.08)`
      contentDiv.style.color = isDark ? '#f1f5f9' : '#334155'
      contentDiv.style.padding = '12px 24px'
      contentDiv.style.borderRadius = '16px'
    }

    contentDiv.style.boxSizing = 'border-box'
    contentDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    const textSpan = document.createElement('span')
    textSpan.textContent = node.text
    textSpan.style.display = 'block'
    textSpan.style.fontWeight = 'bold'
    textSpan.style.whiteSpace = 'pre-wrap'
    textSpan.style.fontSize = isRoot ? '22px' : '15px'
    textSpan.style.letterSpacing = isRoot ? '0.02em' : '-0.025em'
    textSpan.style.maxWidth = '460px'
    textSpan.style.wordBreak = 'break-word'
    textSpan.style.lineHeight = '1.5'

    contentDiv.appendChild(textSpan)
    wrapper.appendChild(contentDiv)
    foreignObject.appendChild(wrapper)
    g.appendChild(foreignObject)
    mainGroup.appendChild(g)
  })

  svg.appendChild(mainGroup)

  // 将 SVG 转换为 PNG
  const svgData = new XMLSerializer().serializeToString(svg)
  const svgBase64 = btoa(unescape(encodeURIComponent(svgData)))
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = exportWidth * 2  // 2倍分辨率
    canvas.height = exportHeight * 2
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0)

      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a')
          link.download = `${mindMapName.value}.png`
          link.href = URL.createObjectURL(blob)
          link.click()
          URL.revokeObjectURL(link.href)
        }
      }, 'image/png')
    }
  }

  img.onerror = () => {
    alert('PNG 导出失败，请重试')
  }

  img.src = dataUrl
}

const importJSON = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (data.root) {
          mindMapName.value = data.name || '导入的思维导图'
          rootNode.value = data.root
          layoutType.value = data.layout || 'mind-map'
          lineStyle.value = data.lineStyle || 'curve'
          if (data.theme) {
            const theme = themes.find(t => t.name === data.theme)
            if (theme) currentTheme.value = theme
          }
          saveHistory()
        }
      } catch { alert('导入失败，文件格式错误') }
    }
    reader.readAsText(file)
  }
  input.click()
}

const handleKeyDown = (e: KeyboardEvent) => {
  // 如果正在编辑，不处理快捷键（Tab键除外，让浏览器处理）
  if (editingNode.value) return
  if (e.code === 'Space' && !e.repeat) { isSpacePressed.value = true; e.preventDefault(); return }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo() }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo() }
  if (!selectedNode.value) return
  // 添加 !e.repeat 检查，防止按住 Tab 键时重复添加节点
  // 同时检查 isAddingNode 同步锁和时间戳防抖
  if (e.key === 'Tab' && !e.repeat && !isAddingNode) {
    const now = Date.now()
    if (now - lastAddNodeTime < ADD_NODE_DEBOUNCE_MS) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    addChildNode(selectedNode.value)
  }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteNode(selectedNode.value) }
  if (e.key === 'F2' || e.key === 'Enter') { e.preventDefault(); startEditingNode(selectedNode.value) }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') isSpacePressed.value = false
}

watch(layoutType, () => {
  saveHistory()
  // 切换布局后自动定位到中心节点
  nextTick(() => {
    centerRoot()
  })
})
watch(lineStyle, () => saveHistory())

const confirmNameDialog = () => {
  const name = tempName.value.trim()
  if (name) {
    mindMapName.value = name
    showNameDialog.value = false
    previousState.value = null  // 清除保存的状态
    initUndoHistory()
    addToHistoryFiles()
  }
}

const cancelNameDialog = () => {
  showNameDialog.value = false

  // 如果有保存的状态（用户点击了新建按钮），则恢复之前的状态
  if (previousState.value) {
    try {
      const data = JSON.parse(previousState.value)
      mindMapName.value = data.name
      rootNode.value = data.root
      layoutType.value = data.layout || 'mind-map'
      lineStyle.value = data.lineStyle || 'curve'
      currentFileId.value = data.fileId
      if (data.theme) {
        const theme = themes.find(t => t.name === data.theme)
        if (theme) currentTheme.value = theme
      }
      previousState.value = null
      nextTick(() => centerRoot())
    } catch {
      // 恢复失败，创建新文件
      mindMapName.value = '未命名'
      initUndoHistory()
      addToHistoryFiles()
    }
  } else {
    // 初始化时取消（没有历史文件），使用默认名创建
    mindMapName.value = '未命名'
    initUndoHistory()
    addToHistoryFiles()
  }
}

onMounted(() => {
  // Load history records first to check if there are any
  loadHistoryRecords()

  const saved = localStorage.getItem('mindmap_data')
  const hasHistoryRecords = historyRecords.value.length > 0

  if (saved && hasHistoryRecords) {
    // Has saved data and history records, load normally
    try {
      const data = JSON.parse(saved)
      mindMapName.value = data.name || '未命名'
      rootNode.value = data.root
      layoutType.value = data.layout || 'mind-map'
      lineStyle.value = data.lineStyle || 'curve'
      if (data.theme) {
        const theme = themes.find(t => t.name === data.theme)
        if (theme) currentTheme.value = theme
      }
      // 找到匹配的历史文件，设置当前文件ID
      const matchingRecord = historyRecords.value.find(r => {
        try {
          const recordData = JSON.parse(r.data)
          return recordData.name === data.name
        } catch {
          return false
        }
      })
      if (matchingRecord) {
        currentFileId.value = matchingRecord.id
      } else {
        // 如果找不到匹配的，使用第一个历史文件
        currentFileId.value = historyRecords.value[0]?.id || null
      }
    } catch {}
    initUndoHistory()
    centerRoot()
  } else {
    // No saved data or no history records, show name dialog for new mind map
    // Reset to default state
    mindMapName.value = '未命名'
    rootNode.value = { id: '1', text: '中心主题', children: [] }
    layoutType.value = 'mind-map'
    lineStyle.value = 'curve'
    currentTheme.value = themes[0]

    tempName.value = ''
    showNameDialog.value = true
    centerRoot()
    nextTick(() => {
      const input = document.querySelector('.fixed input[type="text"]') as HTMLInputElement
      if (input) input.focus()
    })
  }
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden select-none font-sans">
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-50">
      <div class="flex items-center gap-3">
        <button @click="createNewMindMap" class="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all" style="background-color: #0ea5e9; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);" title="新建思维导图">
          <Plus class="w-5 h-5" />
        </button>

        <button @click="showHistory = !showHistory" :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-all', showHistory ? 'text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200']" :style="showHistory ? { backgroundColor: '#0ea5e9', boxShadow: '0 10px 15px -3px rgba(14, 165, 233, 0.3)' } : {}" title="历史文件">
          <Menu class="w-5 h-5" />
        </button>

        <div class="flex items-center gap-3">
          <RouterLink to="/" class="group">
            <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-all">
              <Home class="w-5 h-5 text-slate-600" />
            </div>
          </RouterLink>
          <div class="flex flex-col">
            <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">我的思维导图</span>
            <input v-model="mindMapName" @change="saveHistory" @blur="saveHistory" class="text-sm font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-300 rounded px-1 -ml-1 text-slate-800 min-w-[120px]" placeholder="未命名" />
          </div>
        </div>
      </div>

      <div class="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
        <button @click="undo" :disabled="!canUndo" class="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all" title="撤销">
          <Undo2 class="w-4 h-4 text-slate-600" />
        </button>
        <button @click="redo" :disabled="!canRedo" class="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all" title="重做">
          <Redo2 class="w-4 h-4 text-slate-600" />
        </button>
        
        <div class="w-px h-4 bg-slate-300 mx-2"></div>
        
        <button @click="zoomOut" class="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all">
          <ZoomOut class="w-4 h-4 text-slate-600" />
        </button>
        <button @click="resetZoom" class="px-2 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors min-w-[48px]">
          {{ Math.round(zoom * 100) }}%
        </button>
        <button @click="zoomIn" class="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all">
          <ZoomIn class="w-4 h-4 text-slate-600" />
        </button>
        <button @click="centerRoot" class="p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all" title="居中">
          <Maximize2 class="w-4 h-4 text-slate-600" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 mr-2">
          <button @click="showLayoutPanel = !showLayoutPanel" :class="['p-2 rounded-lg transition-all', showLayoutPanel ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white hover:shadow-sm']">
            <LayoutGrid class="w-4 h-4" />
          </button>
          <button @click="showThemePanel = !showThemePanel" :class="['p-2 rounded-lg transition-all', showThemePanel ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:bg-white hover:shadow-sm']">
            <Palette class="w-4 h-4" />
          </button>
        </div>

        <div class="relative">
          <button @click="showExportMenu = !showExportMenu" class="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-lg" style="background-color: #0ea5e9; box-shadow: 0 10px 15px -3px rgba(14, 165, 233, 0.3);">
            <ImageIcon class="w-4 h-4" />
            <span>导出</span>
            <ChevronUp :class="['w-4 h-4 transition-transform', showExportMenu ? 'rotate-180' : '']" />
          </button>

          <!-- 导出菜单 -->
          <div v-if="showExportMenu" class="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <button @click="exportPNG(); showExportMenu = false" class="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
              <ImageIcon class="w-4 h-4" />
              导出 PNG
            </button>
            <button @click="exportSVG(); showExportMenu = false" class="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
              <Download class="w-4 h-4" />
              导出 SVG
            </button>
            <div class="my-1 border-t border-slate-100"></div>
            <button @click="exportJSON(); showExportMenu = false" class="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
              <FileJson class="w-4 h-4" />
              导出 JSON
            </button>
          </div>
        </div>

        <button @click="showShortcuts = !showShortcuts" class="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-slate-500">
          <Keyboard class="w-4 h-4" />
        </button>
      </div>
    </header>

    <main class="flex-1 relative overflow-hidden flex" ref="canvasContainer">
      <!-- History Sidebar -->
      <div v-if="showHistory" class="w-80 bg-white border-r border-slate-200 flex flex-col shadow-xl z-40 animate-in slide-in-from-left duration-300">
        <div class="p-6 border-b border-slate-200">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock class="w-5 h-5 text-blue-600" />
              历史文件
            </h2>
            <button @click="showHistory = false" class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X class="w-4 h-4 text-slate-400" />
            </button>
          </div>
          <p class="text-xs text-slate-500">最近 20 个思维导图文件</p>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="historyRecords.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400 px-6">
            <Clock class="w-12 h-12 mb-3 opacity-20" />
            <p class="text-sm">暂无历史文件</p>
          </div>
          
          <div v-else class="p-4 space-y-2">
            <button v-for="record in historyRecords" :key="record.id"
              @click="loadHistoryRecord(record)"
              class="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-sm text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {{ record.name }}
                  </h3>
                  <p class="text-xs text-slate-400 mt-1">{{ formatTime(record.timestamp) }}</p>
                </div>
                <button @click.stop="deleteHistoryRecord(record.id)"
                  class="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-100 rounded-lg transition-all text-slate-400 hover:text-rose-600">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </button>
          </div>
        </div>
        
        <!-- 全部删除按钮 -->
        <div v-if="historyRecords.length > 0" class="p-4 border-t border-slate-200">
          <button @click="deleteAllHistoryRecords"
            class="w-full py-2.5 px-4 rounded-xl border-2 border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-2">
            <Trash2 class="w-4 h-4" />
            全部删除
          </button>
        </div>
      </div>
      
      <!-- Canvas Area -->
      <div class="flex-1 relative overflow-hidden" :class="{ 'cursor-grab': (isPanMode || isSpacePressed) && !isPanning, 'cursor-grabbing': isPanning }">
      <div ref="canvasWrapper" class="absolute inset-0 overflow-hidden" :style="{ background: currentTheme.bg }"
        @wheel.prevent="onWheel" @mousedown="onCanvasMouseDown" @mousemove="onCanvasMouseMove" @mouseup="onCanvasMouseUp" @mouseleave="onCanvasMouseUp" @auxclick.prevent="onCanvasAuxClick">
        <!-- Grid Background -->
        <div class="absolute inset-0 pointer-events-none opacity-[0.03]"
          :style="{
            backgroundImage: `radial-gradient(circle, ${currentTheme.name === '深邃黑' ? '#fff' : '#000'} 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }">
        </div>
        <div ref="canvasContent" class="relative" :style="{
          width: `${canvasSize.width}px`, 
          height: `${canvasSize.height}px`,
          transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: '0 0', 
          willChange: isPanning ? 'transform' : 'auto'
        }">
          <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 0;">
            <defs>
              <!-- Gradient definitions using different colors (not brightness variations) -->
              <linearGradient v-for="(color, idx) in currentTheme.colors" :key="'grad-' + idx" :id="'lineGradient-' + idx" gradientUnits="userSpaceOnUse">
                <stop offset="0%" :stop-color="currentTheme.colors[idx]" />
                <stop offset="100%" :stop-color="currentTheme.colors[(idx + 1) % currentTheme.colors.length]" />
              </linearGradient>
            </defs>
            
            <!-- Main line layer (no shadow) -->
            <g v-for="node in flatNodes" :key="'conn-' + node.id">
              <path v-if="node.parent && node.x !== undefined && node.y !== undefined && node.parent.x !== undefined && node.parent.y !== undefined"
                :d="getConnectionPath(node)"
                fill="none"
                :stroke="`url(#lineGradient-${(parseInt(node.id, 36) % (currentTheme.colors.length - 1)) + 1})`"
                :stroke-width="selectedNode?.id === node.id ? (node.level === 1 ? 4.5 : 3.5) : (node.level === 1 ? 3.5 : 2.5)"
                stroke-linecap="round"
                stroke-linejoin="round" />
            </g>
          </svg>

          <div v-for="node in flatNodes" :key="node.id" :style="getNodeStyle(node)"
            :class="['absolute cursor-pointer group', isPanning ? '' : 'transition-all duration-300 ease-out', selectedNode?.id === node.id ? 'z-20' : 'z-10']"
            @mousedown.stop="selectedNode = node" @dblclick.stop="startEditingNode(node)" @contextmenu.stop="openContextMenu($event, node)">
            <div :class="[
                'transition-all duration-300 box-border',
                node.level === 0 ? 'px-8 py-4 rounded-3xl' : 'px-6 py-3 rounded-2xl',
                selectedNode?.id === node.id ? 'scale-105' : 'hover:shadow-md'
              ]" :style="getNodeContentStyle(node)">
              <span v-if="editingNode?.id !== node.id"
                class="font-bold tracking-tight block whitespace-pre-wrap"
                :style="{
                  fontSize: node.level === 0 ? '22px' : '15px',
                  letterSpacing: node.level === 0 ? '0.02em' : 'normal',
                  maxWidth: '460px',
                  wordBreak: 'break-word',
                  lineHeight: '1.5'
                }">{{ node.text }}</span>
              <textarea v-else v-model="editingText" @blur="finishEditingNode" @keydown.esc="editingNode = null" @input="autoResizeTextarea"
                class="node-editing-input bg-transparent border-none outline-none text-inherit placeholder-current/50 resize-none"
                :style="{
                  fontSize: node.level === 0 ? '22px' : '15px',
                  fontWeight: 'inherit',
                  width: Math.max(200, (node.width || 120) - 48) + 'px',
                  minHeight: Math.max(60, (node.height || 40) - 24) + 'px',
                  lineHeight: '1.5',
                  overflow: 'hidden'
                }" />
            </div>

            <!-- Node Actions -->
            <div v-if="selectedNode?.id === node.id" class="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full flex items-center gap-2 pl-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="addChildNode(node)" class="w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-all scale-90 hover:scale-110">
                <Plus class="w-5 h-5" />
              </button>
              <button @click.stop="deleteNode(node)" class="w-8 h-8 rounded-full bg-white shadow-lg border border-slate-100 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all scale-90 hover:scale-110">
                <X class="w-4 h-4" />
              </button>
            </div>

            <button v-if="node.children?.length" @click.stop="toggleCollapse(node)"
              class="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border shadow-sm flex items-center justify-center hover:scale-110 transition-all z-30 opacity-0 group-hover:opacity-100"
              :style="{ borderColor: getNodeColor(node) }">
              <ChevronRight v-if="node.collapsed" class="w-3.5 h-3.5 text-slate-600" />
              <ChevronDown v-else class="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="showLayoutPanel" class="absolute top-20 right-6 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <LayoutGrid class="w-4 h-4 text-blue-600" />
            布局方案
          </h3>
          <button @click="showLayoutPanel = false" class="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <X class="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div class="space-y-2.5">
          <button v-for="layout in [
              { type: 'mind-map', name: '经典脑图', desc: '左右对称，平衡美观', icon: '🎯' },
              { type: 'right-only', name: '右向脑图', desc: '纯右侧展开，简洁清晰', icon: '▶️' },
              { type: 'org-chart', name: '组织架构', desc: '自上而下，层级分明', icon: '📊' }
            ]" :key="layout.type"
            @click="layoutType = layout.type as LayoutType; showLayoutPanel = false"
            :class="['w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 group',
              layoutType === layout.type ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50']">
            <div class="flex items-center gap-4">
              <div :class="['w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-colors', layoutType === layout.type ? 'bg-blue-100' : 'bg-slate-100 group-hover:bg-blue-50']">{{ layout.icon }}</div>
              <div class="flex-1">
                <div class="font-bold text-sm text-slate-800">{{ layout.name }}</div>
                <div class="text-[11px] text-slate-500 mt-0.5">{{ layout.desc }}</div>
              </div>
            </div>
          </button>
        </div>
        
        <div class="mt-6 pt-6 border-t border-slate-100">
          <h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Link2 class="w-3.5 h-3.5" />
            连线风格
          </h4>
          <div class="grid grid-cols-3 gap-2">
            <button v-for="style in [
                { type: 'curve', name: '圆滑' },
                { type: 'straight', name: '干练' },
                { type: 'polyline', name: '规整' }
              ]" :key="style.type"
              @click="lineStyle = style.type as LineStyle"
              :class="['py-2 rounded-xl text-[11px] font-bold border-2 transition-all',
                lineStyle === style.type ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100' : 'border-slate-100 hover:border-blue-200 text-slate-600']">
              {{ style.name }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showThemePanel" class="absolute top-20 right-6 w-[420px] bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Palette class="w-4 h-4 text-blue-600" />
            视觉主题
          </h3>
          <button @click="showThemePanel = false" class="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
            <X class="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <button v-for="theme in themes" :key="theme.name"
            @click="currentTheme = theme; showThemePanel = false"
            :class="['p-4 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden',
              currentTheme.name === theme.name ? 'border-blue-500 bg-blue-50/30 shadow-sm' : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50']">
            <div class="h-20 rounded-xl mb-4 shadow-inner transition-transform group-hover:scale-[1.02]" :style="{ background: theme.bg }">
              <div class="flex gap-1 p-2">
                <div v-for="(c, i) in theme.colors.slice(0, 4)" :key="i" class="w-3 h-3 rounded-full border border-white/20 shadow-sm" :style="{ backgroundColor: c }"></div>
              </div>
            </div>
            <div class="flex items-center justify-between px-1">
              <span class="text-xs font-bold text-slate-700">{{ theme.name }}</span>
              <Sparkles v-if="currentTheme.name === theme.name" class="w-3.5 h-3.5 text-blue-500" />
            </div>
          </button>
        </div>
      </div>

      <div v-if="showShortcuts" class="absolute top-16 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 z-50">
        <div class="flex items-center justify-between mb-5">
          <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
            <Keyboard class="w-5 h-5 text-purple-600" />
            快捷键指南
          </h3>
          <button @click="showShortcuts = false" class="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X class="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors">
            <span class="text-slate-700 font-medium">添加子节点</span>
            <kbd class="px-4 py-2 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 rounded-lg text-xs font-mono shadow-md font-semibold">Tab</kbd>
          </div>
          <div class="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors">
            <span class="text-slate-700 font-medium">删除节点</span>
            <kbd class="px-4 py-2 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 rounded-lg text-xs font-mono shadow-md font-semibold">Del</kbd>
          </div>
          <div class="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors">
            <span class="text-slate-700 font-medium">编辑节点</span>
            <kbd class="px-4 py-2 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 rounded-lg text-xs font-mono shadow-md font-semibold">F2</kbd>
          </div>
          <div class="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors">
            <span class="text-slate-700 font-medium">撤销操作</span>
            <kbd class="px-4 py-2 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 rounded-lg text-xs font-mono shadow-md font-semibold">Ctrl+Z</kbd>
          </div>
          <div class="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors">
            <span class="text-slate-700 font-medium">重做操作</span>
            <kbd class="px-4 py-2 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 rounded-lg text-xs font-mono shadow-md font-semibold">Ctrl+Y</kbd>
          </div>
          <div class="flex justify-between items-center py-3 px-3 rounded-lg hover:bg-slate-50 transition-colors">
            <span class="text-slate-700 font-medium">拖动画布</span>
            <kbd class="px-4 py-2 bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-300 rounded-lg text-xs font-mono shadow-md font-semibold">Space</kbd>
          </div>
        </div>
      </div>

      <div class="absolute bottom-6 left-6 bg-white rounded-xl px-4 py-3 shadow-lg border border-slate-200">
        <div class="flex gap-4 text-xs text-slate-600">
          <span class="flex items-center gap-1.5">
            <kbd class="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono">Tab</kbd>
            <span>添加</span>
          </span>
          <span class="flex items-center gap-1.5">
            <kbd class="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono">Del</kbd>
            <span>删除</span>
          </span>
          <span class="flex items-center gap-1.5">
            <kbd class="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono">双击</kbd>
            <span>编辑</span>
          </span>
        </div>
      </div>

      <!-- Context Menu -->
      <div v-if="contextMenu.show" class="fixed bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 w-48 z-[100]"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }">
        <button @click="addChildNode(contextMenu.node!); closeContextMenu()" class="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
          <Plus class="w-4 h-4" /> 添加子节点
        </button>
        <button @click="startEditingNode(contextMenu.node!); closeContextMenu()" class="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-3 transition-colors">
          <Keyboard class="w-4 h-4" /> 编辑文本
        </button>
        <div class="my-1 border-t border-slate-100"></div>
        <button @click="deleteNode(contextMenu.node!); closeContextMenu()" class="w-full px-4 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors">
          <X class="w-4 h-4" /> 删除节点
        </button>
      </div>
      </div>
    </main>

    <!-- Name Dialog -->
    <div v-if="showNameDialog" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" @click.self="previousState ? cancelNameDialog() : undefined">
      <div class="bg-white rounded-3xl shadow-2xl p-8 w-[420px] animate-in zoom-in-95 duration-200">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles class="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">新建思维导图</h2>
            <p class="text-sm text-slate-500">请为您的思维导图命名</p>
          </div>
        </div>

        <input
          v-model="tempName"
          @keydown.enter="confirmNameDialog"
          @keydown.esc="previousState ? cancelNameDialog() : undefined"
          type="text"
          placeholder="输入思维导图名称..."
          class="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-lg font-medium text-slate-800 placeholder-slate-400 transition-all"
          autofocus
        />

        <div class="flex gap-3 mt-6">
          <button v-if="previousState" @click="cancelNameDialog" class="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all">
            取消
          </button>
          <button v-else @click="cancelNameDialog" class="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all">
            跳过
          </button>
          <button @click="confirmNameDialog" class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-200 transition-all">
            确定
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <div v-if="confirmDialog.show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]" @click.self="cancelConfirmDialog">
      <div class="bg-white rounded-3xl shadow-2xl p-8 w-[420px] animate-in zoom-in-95 duration-200">
        <div class="flex items-center gap-3 mb-6">
          <div :class="['w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg', confirmDialog.type === 'danger' ? 'bg-gradient-to-br from-rose-500 to-red-600' : 'bg-gradient-to-br from-amber-400 to-orange-500']">
            <AlertTriangle class="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-slate-800">{{ confirmDialog.title }}</h2>
            <p class="text-sm text-slate-500">请确认您的操作</p>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
          <p class="text-slate-700 text-sm leading-relaxed">{{ confirmDialog.message }}</p>
        </div>

        <div class="flex gap-3">
          <button @click="cancelConfirmDialog" class="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all">
            取消
          </button>
          <button @click="handleConfirmDialog" :class="['flex-1 px-4 py-3 rounded-xl text-white font-semibold transition-all', confirmDialog.type === 'danger' ? 'bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-lg hover:shadow-rose-200' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-200']">
            确定
          </button>
        </div>
      </div>
    </div>
  </div>
</template>