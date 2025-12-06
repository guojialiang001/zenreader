<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Upload, Download, FolderOpen, FileImage, X, ZoomIn, ZoomOut, Move, RotateCcw, Trash2, Plus, Home, Grid, Zap, Crosshair, Hand } from 'lucide-vue-next'
import JSZip from 'jszip'

// 图片位置和尺寸信息
interface ImagePosition {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  scale: number
  zIndex: number
}

interface Pic {
  id: string
  file: File
  name: string
  type: string
  url: string
  position: ImagePosition
  isSelected: boolean
  isDragging: boolean
}

const pics = ref<Pic[]>([])
const panelRef = ref<HTMLDivElement>()
const selectedImages = ref<Set<string>>(new Set())
const isDraggingOver = ref(false)
const scale = ref(1)
const panelOffset = ref({ x: 0, y: 0 })

// 背景主题状态
const isDarkTheme = ref(true)

// 面板配置
const panelConfig = reactive({
  width: 2000,
  height: 1200,
  backgroundColor: isDarkTheme.value ? '#000000' : '#f8fafc',
  gridSize: 50,
  showGrid: false,
  snapToGrid: false
})

// 目录导入支持
const canImportDirectory = ref(false)
const fileInputRef = ref<HTMLInputElement>()

// 检查浏览器是否支持目录导入
onMounted(async () => {
  if ('showDirectoryPicker' in window) {
    canImportDirectory.value = true
  }
})

// 目录导入函数
const importDirectoryAsFolder = async () => {
  if ('showDirectoryPicker' in window) {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker()
      await importDirectory(dirHandle)
    } catch (error) {
      console.log('用户取消了目录选择')
    }
  }
}

// 切换网格显示
const toggleGrid = () => {
  panelConfig.showGrid = !panelConfig.showGrid
}

// 切换网格吸附
const toggleSnapToGrid = () => {
  panelConfig.snapToGrid = !panelConfig.snapToGrid
}

// 拖拽状态
interface DragState {
  isDragging: boolean
  draggedItem: Pic | null
  startPos: { x: number; y: number }
  startImagePos: { x: number; y: number }
  isDragged: boolean
  selectedImagesStartPos: Map<string, { x: number; y: number }>
}

const dragState = reactive<DragState>({
  isDragging: false,
  draggedItem: null,
  startPos: { x: 0, y: 0 },
  startImagePos: { x: 0, y: 0 },
  isDragged: false,
  selectedImagesStartPos: new Map()
})
  
  // 画布移动工具状态
const moveCanvasActive = ref(false)
const canvasMoveStart = ref({ x: 0, y: 0 })
const canvasOffsetStart = ref({ x: 0, y: 0 })

// 工具栏状态
const toolbarVisible = ref(true)
const currentTool = ref<'select' | 'move'>('select')

// 区域选择状态
const selectionState = reactive({
  isSelecting: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0
})

// 确保默认激活选择工具状态
onMounted(() => {
  // 确保选择工具在组件加载时处于激活状态
  setSelectTool()
})

// 工具状态互斥函数
const setSelectTool = () => {
  currentTool.value = 'select'
  moveCanvasActive.value = false
  panelRef.value?.classList.remove('cursor-grab', 'cursor-grabbing')
  
  // 移除移动画布的事件监听器
  window.removeEventListener('mousedown', startDragOnCanvas)
  window.removeEventListener('mousemove', moveCanvas)
  window.removeEventListener('mouseup', stopDragOnCanvas)
}

const setMoveTool = () => {
  currentTool.value = 'move'
  moveCanvasActive.value = true
  panelRef.value?.classList.add('cursor-grab')
  
  // 添加移动画布的事件监听器
  window.addEventListener('mousedown', startDragOnCanvas, { passive: false })
  window.addEventListener('mouseup', stopDragOnCanvas)
}

// 切换背景主题
const toggleBackgroundTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
  panelConfig.backgroundColor = isDarkTheme.value ? '#000000' : '#f8fafc'
}

// 路由导航
const router = useRouter()

// 返回主页
const goHome = () => {
  router.push('/')
}

// 键盘快捷键
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' && selectedImages.value.size > 0) {
    deleteSelected()
  }
  if (e.key === 'Escape') {
    clearSelection()
  }
  if (e.key === 'a' && e.ctrlKey) {
    e.preventDefault()
    selectAll()
  }
  if (e.key === 'F2') {
    e.preventDefault()
    toggleMoveMode()
  }
}

// 文件上传处理
const handleFileUpload = async (files: FileList | File[], dropPosition?: { x: number; y: number }) => {
  const fileArray = Array.from(files)
  
  for (const file of fileArray) {
    if (file.type.startsWith('image/')) {
      await addImage(file, dropPosition)
    } else if (file.name.endsWith('.zip')) {
      await importZip(file)
    }
  }
}

// 添加图片到面板
const addImage = async (file: File, dropPosition?: { x: number; y: number }) => {
  const url = URL.createObjectURL(file)
  const id = Math.random().toString(36).slice(2)
  
  // 获取图片尺寸
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = url
  })
  
  const initialSize = Math.min(120, Math.max(50, img.width / 8))
  
  // 计算初始位置
  let initialX = Math.random() * (panelConfig.width - initialSize)
  let initialY = Math.random() * (panelConfig.height - initialSize)
  
  // 如果提供了拖拽位置，使用鼠标位置
  if (dropPosition) {
    initialX = dropPosition.x - initialSize / 2
    initialY = dropPosition.y - initialSize / 2
    
    // 全屏拖拽区域 - 使用整个可视区域作为边界
    const viewportWidth = window.innerWidth / scale.value
    const viewportHeight = window.innerHeight / scale.value
    
    // 获取面板偏移量
    const panelRect = panelRef.value?.getBoundingClientRect()
    const panelOffsetX = panelRect ? panelRect.left / scale.value : 0
    const panelOffsetY = panelRect ? panelRect.top / scale.value : 0
    
    // 计算整个可视区域的边界
    const maxVisibleX = Math.max(panelConfig.width, viewportWidth - panelOffsetX) - initialSize
    const maxVisibleY = Math.max(panelConfig.height, viewportHeight - panelOffsetY) - initialSize
    const minVisibleX = -panelOffsetX
    const minVisibleY = -panelOffsetY
    
    // 确保图片在全屏可视区域内
    initialX = Math.max(minVisibleX, Math.min(maxVisibleX, initialX))
    initialY = Math.max(minVisibleY, Math.min(maxVisibleY, initialY))
  }
  
  const newPic: Pic = {
    id,
    file,
    name: file.name,
    type: file.type,
    url,
    position: {
      id,
      x: initialX,
      y: initialY,
      width: initialSize,
      height: initialSize * (img.height / img.width),
      rotation: 0,
      scale: 1,
      zIndex: Date.now()
    },
    isSelected: false,
    isDragging: false
  }
  
  pics.value.push(newPic)
}

// ZIP文件导入
const importZip = async (zipFile: File) => {
  const zip = new JSZip()
  const content = await zip.loadAsync(zipFile)
  
  const imageFiles: File[] = []
  
  for (const [path, entry] of Object.entries(content.files)) {
    if (!entry.dir && entry.name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      const blob = await entry.async('blob')
      const file = new File([blob], entry.name, { type: 'image/*' })
      imageFiles.push(file)
    }
  }
  
  await handleFileUpload(imageFiles)
}

// 目录导入（如果支持）
const importDirectory = async (dirHandle: FileSystemDirectoryHandle) => {
  const imageFiles: File[] = []
  
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && name.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) {
      const file = await handle.getFile()
      imageFiles.push(file)
    }
  }
  
  await handleFileUpload(imageFiles)
}

// 拖拽处理
const onPanelDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDraggingOver.value = true
}

const onPanelDragLeave = (e: DragEvent) => {
  e.preventDefault()
  if (!panelRef.value?.contains(e.relatedTarget as Node)) {
    isDraggingOver.value = false
  }
}

const onPanelDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDraggingOver.value = false
  
  const files = Array.from(e.dataTransfer?.files || [])
  
  // 获取鼠标在面板中的位置
  const rect = panelRef.value?.getBoundingClientRect()
  if (rect) {
    const mouseX = (e.clientX - rect.left) / scale.value
    const mouseY = (e.clientY - rect.top) / scale.value
    const dropPosition = { x: mouseX, y: mouseY }
    await handleFileUpload(files, dropPosition)
  } else {
    await handleFileUpload(files)
  }
}

// 区域选择功能
const startAreaSelection = (e: MouseEvent) => {
  // 只在选择工具激活且没有激活移动画布模式时处理
  if (currentTool.value !== 'select' || moveCanvasActive.value) return
  
  // 防止在图片上开始区域选择
  if ((e.target as HTMLElement).closest('.image-item')) return
  
  e.preventDefault()
  
  // 获取鼠标在面板中的位置
  const rect = panelRef.value?.getBoundingClientRect()
  if (!rect) return
  
  const mouseX = (e.clientX - rect.left) / scale.value
  const mouseY = (e.clientY - rect.top) / scale.value
  
  // 开始区域选择
  selectionState.isSelecting = true
  selectionState.startX = mouseX
  selectionState.startY = mouseY
  selectionState.currentX = mouseX
  selectionState.currentY = mouseY
  
  // 添加事件监听器
  window.addEventListener('mousemove', onAreaSelectionMove, { passive: false })
  window.addEventListener('mouseup', endAreaSelection)
}

const onAreaSelectionMove = (e: MouseEvent) => {
  if (!selectionState.isSelecting) return
  
  e.preventDefault()
  
  // 获取鼠标在面板中的当前位置
  const rect = panelRef.value?.getBoundingClientRect()
  if (!rect) return
  
  selectionState.currentX = (e.clientX - rect.left) / scale.value
  selectionState.currentY = (e.clientY - rect.top) / scale.value
}

const endAreaSelection = (e: MouseEvent) => {
  if (!selectionState.isSelecting) return
  
  e.preventDefault()
  
  // 计算选择区域
  const selectionRect = {
    x: Math.min(selectionState.startX, selectionState.currentX),
    y: Math.min(selectionState.startY, selectionState.currentY),
    width: Math.abs(selectionState.currentX - selectionState.startX),
    height: Math.abs(selectionState.currentY - selectionState.startY)
  }
  
  // 选中区域内的图片
  selectImagesInArea(selectionRect)
  
  // 重置区域选择状态
  selectionState.isSelecting = false
  
  // 移除事件监听器
  window.removeEventListener('mousemove', onAreaSelectionMove)
  window.removeEventListener('mouseup', endAreaSelection)
}

const selectImagesInArea = (area: { x: number; y: number; width: number; height: number }) => {
  // 清除当前选择
  clearSelection()
  
  // 遍历所有图片，检查是否在选择区域内
  pics.value.forEach(pic => {
    const picRect = {
      x: pic.position.x,
      y: pic.position.y,
      width: pic.position.width,
      height: pic.position.height
    }
    
    // 检查图片是否在选择区域内（使用矩形碰撞检测）
    if (isRectInRect(picRect, area)) {
      pic.isSelected = true
      selectedImages.value.add(pic.id)
    }
  })
}

// 矩形碰撞检测函数
const isRectInRect = (rect1: { x: number; y: number; width: number; height: number }, 
                      rect2: { x: number; y: number; width: number; height: number }) => {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y
}

// 图片选择处理
const selectImage = (pic: Pic, e: MouseEvent) => {
  if (e.ctrlKey || e.metaKey) {
    // 多选
    pic.isSelected = !pic.isSelected
    if (pic.isSelected) {
      selectedImages.value.add(pic.id)
    } else {
      selectedImages.value.delete(pic.id)
    }
  } else {
    // 单选
    clearSelection()
    pic.isSelected = true
    selectedImages.value.add(pic.id)
  }
}

// 清除选择
const clearSelection = () => {
  pics.value.forEach(pic => {
    pic.isSelected = false
  })
  selectedImages.value.clear()
}

// 全选
const selectAll = () => {
  pics.value.forEach(pic => {
    pic.isSelected = true
  })
  selectedImages.value = new Set(pics.value.map(p => p.id))
}

// 删除选中图片
const deleteSelected = () => {
  pics.value = pics.value.filter(pic => !selectedImages.value.has(pic.id))
  selectedImages.value.clear()
}

// 图片拖拽开始
const startDrag = (pic: Pic, e: MouseEvent) => {
  // 移动画布模式优先级检查：如果移动画布模式激活，则阻止图片拖拽
  if (moveCanvasActive.value) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  
  e.preventDefault()
  
  // 检查是否是多选拖拽（按住Ctrl键或图片已被选中）
  const isMultiSelectDrag = e.ctrlKey || e.metaKey || selectedImages.value.size > 1
  
  // 如果当前图片未被选中且不是多选拖拽，先选中它
  if (!pic.isSelected && !isMultiSelectDrag) {
    clearSelection()
    pic.isSelected = true
    selectedImages.value.add(pic.id)
  }
  
  dragState.isDragging = true
  dragState.draggedItem = pic
  dragState.startPos = { x: e.clientX, y: e.clientY }
  dragState.startImagePos = { x: pic.position.x, y: pic.position.y }
  dragState.isDragged = false
  
  // 如果是多选拖拽，记录所有选中图片的初始位置
  if (selectedImages.value.size > 1) {
    dragState.selectedImagesStartPos = new Map()
    pics.value.forEach(p => {
      if (p.isSelected) {
        dragState.selectedImagesStartPos.set(p.id, { x: p.position.x, y: p.position.y })
        p.isDragging = true
        p.position.zIndex = Date.now()
      }
    })
  } else {
    // 单图拖拽
    pic.isDragging = true
    pic.position.zIndex = Date.now()
  }
  
  // 使用will-change优化性能
  e.target instanceof HTMLElement && (e.target.style.willChange = 'transform')
  
  window.addEventListener('mousemove', onDrag, { passive: false })
  window.addEventListener('mouseup', endDrag)
}

// 拖拽中 - 超平滑版本
let animationFrameId: number | null = null
let lastMouseX = 0
let lastMouseY = 0

const onDrag = (e: MouseEvent) => {
  e.preventDefault()
  
  if (!dragState.isDragging) return
  
  // 记录鼠标位置用于插值
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  
  // 使用requestAnimationFrame优化性能
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  
  animationFrameId = requestAnimationFrame(() => {
    const deltaX = (lastMouseX - dragState.startPos.x) / scale.value
    const deltaY = (lastMouseY - dragState.startPos.y) / scale.value
    
    // 多选拖拽：同时移动所有选中图片
    if (selectedImages.value.size > 1 && dragState.selectedImagesStartPos.size > 0) {
      pics.value.forEach(pic => {
        if (pic.isSelected && dragState.selectedImagesStartPos.has(pic.id)) {
          const startPos = dragState.selectedImagesStartPos.get(pic.id)!
          let newX = startPos.x + deltaX
          let newY = startPos.y + deltaY
          
          // 全屏拖拽区域 - 使用整个可视区域作为边界
          const viewportWidth = window.innerWidth / scale.value
          const viewportHeight = window.innerHeight / scale.value
          
          // 获取面板偏移量以计算绝对位置
          const panelRect = panelRef.value?.getBoundingClientRect()
          const panelOffsetX = panelRect ? panelRect.left / scale.value : 0
          const panelOffsetY = panelRect ? panelRect.top / scale.value : 0
          
          // 计算整个可视区域的边界
          const maxVisibleX = Math.max(panelConfig.width, viewportWidth - panelOffsetX) - pic.position.width
          const maxVisibleY = Math.max(panelConfig.height, viewportHeight - panelOffsetY) - pic.position.height
          const minVisibleX = -panelOffsetX
          const minVisibleY = -panelOffsetY
          
          // 应用全屏边界限制，确保图片始终在可视区域内
          newX = Math.max(minVisibleX, Math.min(maxVisibleX, newX))
          newY = Math.max(minVisibleY, Math.min(maxVisibleY, newY))
          
          // 柔和的网格吸附 - 仅在接近网格时触发
          if (panelConfig.snapToGrid) {
            const gridSize = panelConfig.gridSize
            const snapThreshold = 8
            
            // X轴吸附
            const nearestX = Math.round(newX / gridSize) * gridSize
            if (Math.abs(newX - nearestX) < snapThreshold) {
              newX = newX + (nearestX - newX) * 0.3 // 渐进式吸附
            }
            
            // Y轴吸附
            const nearestY = Math.round(newY / gridSize) * gridSize
            if (Math.abs(newY - nearestY) < snapThreshold) {
              newY = newY + (nearestY - newY) * 0.3 // 渐进式吸附
            }
          }
          
          // 应用位置更新
          pic.position.x = newX
          pic.position.y = newY
        }
      })
    } else if (dragState.draggedItem) {
      // 单图拖拽
      let newX = dragState.startImagePos.x + deltaX
      let newY = dragState.startImagePos.y + deltaY
      
      // 全屏拖拽区域 - 使用整个可视区域作为边界
      const viewportWidth = window.innerWidth / scale.value
      const viewportHeight = window.innerHeight / scale.value
      
      // 获取面板偏移量以计算绝对位置
      const panelRect = panelRef.value?.getBoundingClientRect()
      const panelOffsetX = panelRect ? panelRect.left / scale.value : 0
      const panelOffsetY = panelRect ? panelRect.top / scale.value : 0
      
      // 计算整个可视区域的边界
      const maxVisibleX = Math.max(panelConfig.width, viewportWidth - panelOffsetX) - dragState.draggedItem.position.width
      const maxVisibleY = Math.max(panelConfig.height, viewportHeight - panelOffsetY) - dragState.draggedItem.position.height
      const minVisibleX = -panelOffsetX
      const minVisibleY = -panelOffsetY
      
      // 应用全屏边界限制，确保图片始终在可视区域内
      newX = Math.max(minVisibleX, Math.min(maxVisibleX, newX))
      newY = Math.max(minVisibleY, Math.min(maxVisibleY, newY))
      
      // 柔和的网格吸附 - 仅在接近网格时触发
      if (panelConfig.snapToGrid) {
        const gridSize = panelConfig.gridSize
        const snapThreshold = 8
        
        // X轴吸附
        const nearestX = Math.round(newX / gridSize) * gridSize
        if (Math.abs(newX - nearestX) < snapThreshold) {
          newX = newX + (nearestX - newX) * 0.3 // 渐进式吸附
        }
        
        // Y轴吸附
        const nearestY = Math.round(newY / gridSize) * gridSize
        if (Math.abs(newY - nearestY) < snapThreshold) {
          newY = newY + (nearestY - newY) * 0.3 // 渐进式吸附
        }
      }
      
      // 应用位置更新
      dragState.draggedItem.position.x = newX
      dragState.draggedItem.position.y = newY
      dragState.isDragged = true
    }
  })
}

// 全屏边界校正函数 - 使用整个可视区域作为边界
const correctImageBounds = (pic: Pic) => {
  const itemWidth = pic.position.width
  const itemHeight = pic.position.height
  
  // 全屏拖拽区域 - 使用整个可视区域作为边界
  const viewportWidth = window.innerWidth / scale.value
  const viewportHeight = window.innerHeight / scale.value
  
  // 获取面板偏移量
  const panelRect = panelRef.value?.getBoundingClientRect()
  const panelOffsetX = panelRect ? panelRect.left / scale.value : 0
  const panelOffsetY = panelRect ? panelRect.top / scale.value : 0
  
  // 计算整个可视区域的边界
  const maxVisibleX = Math.max(panelConfig.width, viewportWidth - panelOffsetX) - itemWidth
  const maxVisibleY = Math.max(panelConfig.height, viewportHeight - panelOffsetY) - itemHeight
  const minVisibleX = -panelOffsetX
  const minVisibleY = -panelOffsetY
  
  // 校正X坐标，确保在全屏可视区域内
  pic.position.x = Math.max(minVisibleX, Math.min(maxVisibleX, pic.position.x))
  
  // 校正Y坐标，确保在全屏可视区域内
  pic.position.y = Math.max(minVisibleY, Math.min(maxVisibleY, pic.position.y))
}

// 拖拽结束
const endDrag = (e?: MouseEvent) => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  
  // 清理拖拽状态
  if (selectedImages.value.size > 1) {
    // 多选拖拽：清理所有选中图片的拖拽状态
    pics.value.forEach(pic => {
      if (pic.isSelected) {
        pic.isDragging = false
        // 拖拽结束后进行边界校正
        correctImageBounds(pic)
      }
    })
    dragState.selectedImagesStartPos.clear()
  } else if (dragState.draggedItem) {
    // 单图拖拽
    // 拖拽结束后进行边界校正
    correctImageBounds(dragState.draggedItem)
    
    dragState.draggedItem.isDragging = false
    // 移除will-change
    e && e.target instanceof HTMLElement && (e.target.style.willChange = '')
  }
  
  dragState.isDragging = false
  dragState.draggedItem = null
  dragState.isDragged = false
  
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', endDrag)
}

// 缩放控制
const zoomIn = () => {
  scale.value = Math.min(scale.value + 0.1, 3)
}

const zoomOut = () => {
  scale.value = Math.max(scale.value - 0.1, 0.1)
}

// 画布移动工具函数
const startMoveCanvas = (e: MouseEvent) => {
  e.preventDefault()
  moveCanvasActive.value = true
  canvasMoveStart.value = { x: e.clientX, y: e.clientY }
  canvasOffsetStart.value = { x: panelOffset.value.x, y: panelOffset.value.y }
  panelRef.value?.classList.add('cursor-grabbing')
  
  window.addEventListener('mousemove', moveCanvas, { passive: false })
  window.addEventListener('mouseup', stopMoveCanvas)
}

const moveCanvas = (e: MouseEvent) => {
  if (!moveCanvasActive.value || !canvasMoveStart.value) return
  
  e.preventDefault()
  const deltaX = e.clientX - canvasMoveStart.value.x
  const deltaY = e.clientY - canvasMoveStart.value.y
  
  panelOffset.value.x = canvasOffsetStart.value.x + deltaX
  panelOffset.value.y = canvasOffsetStart.value.y + deltaY
}

const stopMoveCanvas = () => {
  moveCanvasActive.value = false
  panelRef.value?.classList.remove('cursor-grabbing')
  
  window.removeEventListener('mousemove', moveCanvas)
  window.removeEventListener('mouseup', stopMoveCanvas)
}

// 新的移动模式函数 - 使用互斥机制
const toggleMoveMode = () => {
  if (moveCanvasActive.value) {
    // 如果已经激活，切换到选择工具
    setSelectTool()
  } else {
    // 激活移动工具
    setMoveTool()
  }
}

// 在画布上开始拖拽
const startDragOnCanvas = (event) => {
  // 只在移动模式激活时处理
  if (!moveCanvasActive.value) return
  
  // 防止事件冒泡
  event.preventDefault()
  event.stopPropagation()
  
  // 设置拖动状态（这里不需要再次设置moveCanvasActive.value，因为移动模式已经激活）
  canvasMoveStart.value = { x: event.clientX, y: event.clientY }
  canvasOffsetStart.value = { x: panelOffset.value.x, y: panelOffset.value.y }
  
  // 开始拖拽时才添加mousemove监听器
  window.addEventListener('mousemove', moveCanvas, { passive: false })
}

// 停止画布拖拽
const stopDragOnCanvas = () => {
  // 不取消移动模式，只移除mousemove监听器
  // moveCanvasActive.value 保持为 true，直到手动取消移动模式
  
  // 停止拖拽时移除mousemove监听器
  window.removeEventListener('mousemove', moveCanvas)
}

const cancelMoveMode = () => {
  // 取消移动模式时切换到选择工具
  setSelectTool()
  
  // 重置拖动状态
  canvasMoveStart.value = { x: 0, y: 0 }
  canvasOffsetStart.value = { x: 0, y: 0 }
}



// 重置面板位置
const resetPanelPosition = () => {
  panelOffset.value = { x: 0, y: 0 }
}

const resetZoom = () => {
  scale.value = 1
  panelOffset.value = { x: 0, y: 0 }
}

// 工具栏控制
const toggleToolbar = () => {
  toolbarVisible.value = !toolbarVisible.value
}

// 面板缩放和移动
const onWheel = (e: WheelEvent) => {
  e.preventDefault()
  
  if (e.ctrlKey) {
    // 缩放
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    scale.value = Math.max(0.1, Math.min(3, scale.value + delta))
  } else {
    // 移动
    panelOffset.value.x -= e.deltaX * 0.5
    panelOffset.value.y -= e.deltaY * 0.5
  }
}

// 导出面板为图片
const exportCanvas = async () => {
  const canvas = document.createElement('canvas')
  canvas.width = panelConfig.width
  canvas.height = panelConfig.height
  const ctx = canvas.getContext('2d')!
  
  // 绘制背景
  ctx.fillStyle = isDarkTheme.value ? '#000000' : '#f8fafc'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // 按z-index排序图片
  const sortedPics = [...pics.value].sort((a, b) => a.position.zIndex - b.position.zIndex)
  
  // 绘制图片
  for (const pic of sortedPics) {
    const img = new Image()
    await new Promise((resolve) => {
      img.onload = resolve
      img.src = pic.url
    })
    
    ctx.save()
    ctx.translate(pic.position.x + pic.position.width / 2, pic.position.y + pic.position.height / 2)
    ctx.rotate(pic.position.rotation * Math.PI / 180)
    ctx.drawImage(
      img,
      -pic.position.width / 2,
      -pic.position.height / 2,
      pic.position.width,
      pic.position.height
    )
    ctx.restore()
  }
  
  // 下载
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'canvas-export.png'
      a.click()
      URL.revokeObjectURL(url)
    }
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onMounted(() => {
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<template>
  <div 
    :class="isDarkTheme ? 'bg-black' : 'bg-slate-50'"
    class="h-screen relative overflow-hidden"
  >
    <!-- 工具栏 -->
    <div v-if="toolbarVisible" class="fixed top-4 left-4 right-4 z-20 flex items-center justify-between">
      <div 
        :class="isDarkTheme ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'" 
        class="rounded-xl shadow-lg border p-2 flex items-center gap-2 transition-colors duration-300"
      >
        <!-- 文件操作 -->
        <div 
          :class="isDarkTheme ? 'border-slate-600' : 'border-slate-200'" 
          class="flex items-center gap-1 border-r pr-2"
        >
          <button 
            @click="goHome" 
            :class="isDarkTheme ? 'hover:bg-gray-800 text-white' : 'hover:bg-slate-100 text-slate-800'" 
            class="p-2 rounded-lg transition-colors"
            title="返回主页"
          >
            <Home class="w-4 h-4" />
          </button>
          <input 
            ref="fileInputRef"
            type="file" 
            multiple 
            accept="image/*,.zip" 
            class="hidden" 
            @change="(e) => handleFileUpload((e.target as HTMLInputElement).files!)"
          />
          <button 
            @click="fileInputRef?.click()"
            :class="isDarkTheme ? 'hover:bg-gray-800 text-white' : 'hover:bg-slate-100 text-slate-800'" 
            class="p-2 rounded-lg transition-colors"
            title="选择文件"
          >
            <Upload class="w-4 h-4" />
          </button>
          <button 
            v-if="canImportDirectory"
            @click="importDirectoryAsFolder" 
            :class="isDarkTheme ? 'hover:bg-gray-800 text-white' : 'hover:bg-slate-100 text-slate-800'" 
            class="p-2 rounded-lg transition-colors"
            title="导入文件夹"
          >
            <FolderOpen class="w-4 h-4" />
          </button>
          <button 
            @click="exportCanvas" 
            :class="isDarkTheme ? 'hover:bg-gray-800 text-white' : 'hover:bg-slate-100 text-slate-800'" 
            class="p-2 rounded-lg transition-colors"
            title="导出面板"
          >
            <Download class="w-4 h-4" />
          </button>
        </div>
        

        
        <!-- 缩放控制 -->
        <div 
          :class="isDarkTheme ? 'border-slate-600' : 'border-slate-200'" 
          class="flex items-center gap-1 border-r pr-2"
        >
          <button 
            @click="zoomOut" 
            :class="isDarkTheme ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-800'" 
            class="p-2 rounded-lg transition-colors"
          >
            <ZoomOut class="w-4 h-4" />
          </button>
          <span 
            :class="isDarkTheme ? 'text-white' : 'text-slate-800'" 
            class="px-2 text-sm min-w-[3rem] text-center"
          >
            {{ Math.round(scale * 100) }}%
          </span>
          <button 
            @click="zoomIn" 
            :class="isDarkTheme ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-800'" 
            class="p-2 rounded-lg transition-colors"
          >
            <ZoomIn class="w-4 h-4" />
          </button>
          <button 
            @click="resetZoom" 
            :class="isDarkTheme ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-800'" 
            class="p-2 rounded-lg transition-colors" 
            title="重置缩放"
          >
            <RotateCcw class="w-4 h-4" />
          </button>
        </div>
        

        
        <!-- 编辑操作 -->
          <div class="flex items-center gap-1">
            <button 
              @click="selectAll" 
              :class="isDarkTheme ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-800'" 
              class="p-2 rounded-lg transition-colors" 
              title="全选"
            >
              全选
            </button>
            <button 
              @click="clearSelection" 
              :class="isDarkTheme ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-800'" 
              class="p-2 rounded-lg transition-colors" 
              title="清除选择"
            >
              清除
            </button>
            <button 
              @click="deleteSelected" 
              :disabled="selectedImages.size === 0"
              :class="[
                isDarkTheme ? 'hover:bg-slate-700 text-white' : 'hover:bg-slate-100 text-slate-800',
                selectedImages.size === 0 ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              class="p-2 rounded-lg transition-colors"
              title="删除选中"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
      </div>
      
      <!-- 三个核心控制按钮 -->
        <div 
          :class="isDarkTheme ? 'bg-gray-900 text-white border-slate-700' : 'bg-white text-slate-800 border-slate-200'" 
          class="rounded-xl shadow-lg border p-2 flex items-center gap-2 transition-colors duration-300"
        >
          <!-- 黑白按钮 -->
          <button 
            @click="toggleBackgroundTheme"
            :class="isDarkTheme ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-slate-800 hover:bg-slate-50'"
            class="p-2 rounded-lg border transition-colors shadow-sm"
            title="切换背景颜色（黑/白）"
          >
            <div class="flex items-center gap-2">
              <!-- 深色背景图标 -->
              <svg v-if="isDarkTheme" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="12" cy="12" r="4" fill="white"/>
              </svg>
              <!-- 浅色背景图标 -->
              <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="12" cy="12" r="4" fill="black"/>
              </svg>
              <span class="text-xs">{{ isDarkTheme ? '黑色' : '白色' }}</span>
            </div>
          </button>
          
          <!-- 手型按钮（移动画布） -->
          <button 
            @click="setMoveTool"
            :class="[
              moveCanvasActive ? 
                (isDarkTheme ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : 
                (isDarkTheme ? 'hover:bg-gray-800 text-white' : 'hover:bg-slate-100 text-slate-800')
            ]"
            class="p-3 rounded-lg transition-colors border-2"
            :style="{ borderColor: moveCanvasActive ? (isDarkTheme ? '#2563eb' : '#3b82f6') : 'transparent' }"
            title="移动画布（点击激活）"
          >
            <Hand class="w-5 h-5" />
          </button>
          
          <!-- 选择工具 -->
          <button 
            @click="setSelectTool" 
            :class="[
              currentTool === 'select' ? 
                (isDarkTheme ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : 
                (isDarkTheme ? 'hover:bg-gray-800 text-white' : 'hover:bg-slate-100 text-slate-800')
            ]"
            class="p-3 rounded-lg transition-colors border-2"
            :style="{ borderColor: currentTool === 'select' ? (isDarkTheme ? '#2563eb' : '#3b82f6') : 'transparent' }"
            title="选择工具"
          >
            <Move class="w-5 h-5" />
          </button>
        </div>
      
      <!-- 右侧状态 -->
      <div 
        :class="isDarkTheme ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-slate-800 border-slate-200'" 
        class="rounded-xl shadow-lg border px-4 py-2 transition-colors duration-300"
      >
        <div class="text-sm">
          图片: {{ pics.length }} | 选中: {{ selectedImages.size }}
        </div>
      </div>
    </div>
    

    
    <!-- 主面板 -->
    <div 
      ref="panelRef"
      class="absolute inset-0 overflow-hidden"
      :class="[isDarkTheme ? 'bg-black' : 'bg-slate-50', dragState.isDragging ? 'cursor-grabbing' : '']"
      @dragover="onPanelDragOver"
      @dragleave="onPanelDragLeave"
      @drop="onPanelDrop"
      @wheel="onWheel"
    >
      <!-- 缩放和移动容器 -->
      <div 
        class="relative"
        :style="{
          transform: `translate(${panelOffset.x}px, ${panelOffset.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }"
      >
        <!-- 面板背景 -->
        <div 
        :class="isDarkTheme ? 'bg-black' : 'bg-slate-50'"
        class="absolute inset-0 transition-colors duration-300"
      />
        
        <!-- 网格背景 -->
        <div 
          v-if="panelConfig.showGrid"
          class="absolute inset-0 opacity-20"
          :style="{
            backgroundImage: isDarkTheme ? `
              linear-gradient(to right, #6b7280 1px, transparent 1px),
              linear-gradient(to bottom, #6b7280 1px, transparent 1px)
            ` : `
              linear-gradient(to right, #e2e8f0 1px, transparent 1px),
              linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: `${panelConfig.gridSize}px ${panelConfig.gridSize}px`
          }"
        />
        
        <!-- 拖拽覆盖层 -->
        <div 
          v-if="isDraggingOver"
          class="absolute inset-0 bg-brand-500/10 border-2 border-dashed border-brand-500 flex items-center justify-center z-10"
          :class="{ 'bg-slate-500/20': isDarkTheme }"
        >
          <div 
            :class="isDarkTheme ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-slate-800 border-brand-200'" 
            class="rounded-lg p-6 shadow-lg border"
          >
            <div class="text-center">
              <Upload class="w-12 h-12 text-brand-500 mx-auto mb-2" />
              <p :class="isDarkTheme ? 'text-white' : 'text-brand-700'" class="text-lg font-semibold">拖拽图片到这里</p>
              <p :class="isDarkTheme ? 'text-slate-300' : 'text-brand-600'" class="text-sm">支持 JPG、PNG、GIF、WebP 格式</p>
            </div>
          </div>
        </div>
        
        <!-- 图片容器 -->
        <div 
          class="relative panel-container"
          :style="{ width: panelConfig.width + 'px', height: panelConfig.height + 'px' }"
          @mousedown="startAreaSelection"
        >
          <!-- 区域选择框 -->
          <div
            v-if="selectionState.isSelecting"
            class="absolute border-2 border-blue-500 bg-blue-200/20 pointer-events-none z-50"
            :style="{
              left: Math.min(selectionState.startX, selectionState.currentX) + 'px',
              top: Math.min(selectionState.startY, selectionState.currentY) + 'px',
              width: Math.abs(selectionState.currentX - selectionState.startX) + 'px',
              height: Math.abs(selectionState.currentY - selectionState.startY) + 'px'
            }"
          />
          <!-- 渲染所有图片 -->
          <div
            v-for="pic in pics"
            :key="pic.id"
            class="absolute cursor-move select-none image-item"
            :class="{
              'ring-2 ring-brand-500 ring-offset-2': pic.isSelected,
              'ring-2 ring-amber-400 ring-offset-2': pic.isDragging,
              'hover:shadow-lg transition-shadow': !pic.isDragging,
              'is-dragging': pic.isDragging,
              'optimized-element': true
            }"
            :style="{
              left: pic.position.x + 'px',
              top: pic.position.y + 'px',
              width: pic.position.width + 'px',
              height: pic.position.height + 'px',
              transform: `rotate(${pic.position.rotation}deg) scale(${pic.position.scale})`,
              transformOrigin: 'center',
              zIndex: pic.position.zIndex,
              willChange: pic.isDragging ? 'transform' : 'auto'
            }"
            @mousedown="(e) => startDrag(pic, e)"
            @click="(e) => selectImage(pic, e)"
          >
            <img 
              :src="pic.url" 
              class="w-full h-full object-cover rounded-xl shadow-md pointer-events-none"
              draggable="false"
            />
            
            <!-- 图片信息覆盖 -->
            <div 
              v-if="pic.isSelected" 
              class="absolute -bottom-6 left-0 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
            >
              {{ pic.name }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 键盘快捷键提示 -->
    <div 
      :class="isDarkTheme ? 'bg-gray-900/90 text-white border-gray-700' : 'bg-white/90 text-slate-600 border-slate-200'" 
      class="fixed bottom-4 left-4 backdrop-blur-sm rounded-lg p-3 text-xs border transition-colors duration-300"
    >
      <div class="font-medium mb-1">快捷键:</div>
      <div>Ctrl+A: 全选 | Delete: 删除 | Esc: 清除选择</div>
      <div>Ctrl+滚轮: 缩放 | 滚轮: 移动画布</div>
      <div class="mt-1">F2: 移动画布</div>
    </div>
    
    <!-- 空状态 -->
    <div 
      v-if="pics.length === 0 && !isDraggingOver" 
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <div :class="isDarkTheme ? 'text-slate-400' : 'text-slate-400'" class="text-center">
        <FileImage class="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p class="text-xl font-medium">拖拽图片到面板开始编辑</p>
        <p class="text-sm mt-2">支持 JPG、PNG、GIF、WebP 格式和 ZIP 文件</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 拖拽时的视觉反馈 - 优化动画 */
.dragging {
  opacity: 0.8;
  transform: scale(1.02);
  transition: transform 0.1s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 图片选中状态的动画 - 优化 */
@keyframes pulse-ring {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    transform: scale(1.02);
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.selected {
  animation: pulse-ring 2s infinite;
}

/* 优化图片拖拽的性能 - 超平滑版 */
.image-item {
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
  transform: translateZ(0); /* 启用硬件加速 */
  transition: box-shadow 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
              transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              opacity 0.1s ease;
  /* 禁用用户选择 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.image-item:hover {
  transform: translateZ(0) scale(1.01);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* 拖拽时的过渡效果 - 极致流畅 */
.image-item.is-dragging {
  transition: none !important;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  z-index: 9999 !important;
  /* 移动时轻微缩放和透明度变化，营造物理感 */
  transform: translateZ(0) scale(1.03);
  opacity: 0.9;
  /* 禁用所有过渡动画以获得实时响应 */
  animation: none !important;
}

/* 面板容器优化 */
.panel-container {
  transform: translateZ(0);
  backface-visibility: hidden;
  /* 启用抗锯齿 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 减少重绘和重排 */
.optimized-element {
  contain: layout style paint;
  /* 优化层合成 */
  transform-style: preserve-3d;
}

/* 鼠标光标优化 - 更明显的手形光标 */
.cursor-grabbing {
  cursor: grabbing !important;
}

.cursor-move {
  cursor: move !important;
}

/* 为所有可拖拽图片添加手形光标提示 */
.image-item {
  cursor: move !important;
}

/* 悬停时的手形光标 */
.image-item:hover {
  cursor: move !important;
}

/* 拖拽选择框动画 */
@keyframes selectionPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    transform: scale(1);
  }
}

.image-item.selected {
  animation: selectionPulse 2s ease-in-out infinite;
}

/* 快速移动时的视觉反馈 */
@media (hover: hover) {
  .image-item:hover {
    transition: all 0.12s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

/* 硬件加速的平滑滚动 */
.smooth-scroll {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
</style>