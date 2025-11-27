<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Image as ImageIcon, Wand2, Upload, Download } from 'lucide-vue-next'
import JSZip from 'jszip'

interface Pic {
  id: string
  file: File
  name: string
  type: string
  url: string
  canvas?: HTMLCanvasElement
  processedUrl?: string
  processedBlob?: Blob
  status: 'pending' | 'processed' | 'error'
}

const pics = ref<Pic[]>([])
const activeId = ref<string | null>(null)
const mode = ref<'manual' | 'corner' | 'advanced'>('manual')
const corner = ref<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right')
const selection = reactive({ x: 50, y: 50, w: 200, h: 80 })

const onUpload = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) return
  const zips = files.filter(f => /\.zip$/i.test(f.name))
  const images = files.filter(f => /^image\//.test(f.type))
  const added: Pic[] = images.map(f => ({ id: Math.random().toString(36).slice(2), file: f, name: f.name, type: f.type, url: URL.createObjectURL(f), status: 'pending' }))
  pics.value = [...added, ...pics.value]
  activeId.value = added[0].id
  input.value = ''
  for (const z of zips) {
    await importZip(z)
  }
}

const activePic = () => pics.value.find(p => p.id === activeId.value) || null

const drawToCanvas = async (p: Pic) => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = document.createElement('img')
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = p.url
  })
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  p.canvas = c
}

const ensureCanvas = async () => { const p = activePic(); if (!p) return; if (!p.canvas) await drawToCanvas(p) }

const smooth = ref(2)
const quality = ref(3)
const repairMode = ref<'copy' | 'smooth' | 'smart'>('smart')
const canvasEl = ref<HTMLCanvasElement | null>(null)
const scale = reactive({ x: 1, y: 1 })
const applyManual = async () => {
  await ensureCanvas(); const p = activePic(); if (!p || !p.canvas) return
  const ctx = p.canvas.getContext('2d')!
  const { x, y, w, h } = selection
  const sx = Math.max(0, Math.floor(x / (scale.x || 1)))
  const sy = Math.max(0, Math.floor(y / (scale.y || 1)))
  const sw = Math.max(1, Math.floor(w / (scale.x || 1)))
  const sh = Math.max(1, Math.floor(h / (scale.y || 1)))
  
  if (repairMode.value === 'copy') {
    // 简单复制补模式
    ctx.save()
    ctx.globalAlpha = 0.95
    ctx.filter = `blur(${smooth.value}px)`
    const takePatch = (sx0: number, sy0: number, w0: number, h0: number) => {
      const temp = document.createElement('canvas'); temp.width = Math.max(1,w0); temp.height = Math.max(1,h0)
      const tctx = temp.getContext('2d')!
      tctx.drawImage(p.canvas!, sx0, sy0, Math.max(1,w0), Math.max(1,h0), 0, 0, temp.width, temp.height)
      const scaled = document.createElement('canvas'); scaled.width = sw; scaled.height = sh
      const sctx = scaled.getContext('2d')!; sctx.imageSmoothingEnabled = true
      sctx.drawImage(temp, 0, 0, sw, sh)
      return scaled
    }
    const top = takePatch(sx, Math.max(0, sy - sh), sw, Math.min(sh, sy))
    const left = takePatch(Math.max(0, sx - sw), sy, Math.min(sw, sx), sh)
    if (top.width && top.height) ctx.drawImage(top, sx, sy)
    else if (left.width && left.height) ctx.drawImage(left, sx, sy)
    ctx.restore()
  } else if (repairMode.value === 'smooth') {
    // 平滑补模式 - 基于内容感知的平滑填充
    const tempCanvas = document.createElement('canvas'); tempCanvas.width = sw; tempCanvas.height = sh
    const tCtx = tempCanvas.getContext('2d')!
    
    // 分析周围区域的颜色特征
    const borderSize = Math.max(5, Math.floor(Math.min(sw, sh) * 0.1))
    let r=0, g=0, b=0, count=0
    
    try {
      // 获取边界像素数据
      const topB = ctx.getImageData(Math.max(0, sx - borderSize), Math.max(0, sy - borderSize), sw + 2 * borderSize, borderSize).data
      const bottomB = ctx.getImageData(Math.max(0, sx - borderSize), Math.min(p.canvas.height - borderSize, sy + sh), sw + 2 * borderSize, borderSize).data
      const leftB = ctx.getImageData(Math.max(0, sx - borderSize), Math.max(0, sy - borderSize), borderSize, sh + 2 * borderSize).data
      const rightB = ctx.getImageData(Math.min(p.canvas.width - borderSize, sx + sw), Math.max(0, sy - borderSize), borderSize, sh + 2 * borderSize).data
      
      const allPixels = [...topB, ...bottomB, ...leftB, ...rightB]
      for(let i=0; i<allPixels.length; i+=4) { r+=allPixels[i]; g+=allPixels[i+1]; b+=allPixels[i+2]; count++ }
    } catch(e) {}
    
    // 使用平均颜色填充背景
    if(count > 0) { 
      tCtx.fillStyle = `rgb(${r/count},${g/count},${b/count})`
      tCtx.fillRect(0,0,sw,sh)
    }
    
    // 添加轻微纹理变化避免过于平滑
    const noiseLevel = Math.max(1, smooth.value * 2)
    for(let i=0; i<sw*sh*0.01; i++) {
      const px = Math.floor(Math.random() * sw)
      const py = Math.floor(Math.random() * sh)
      const size = Math.max(1, Math.random() * noiseLevel)
      
      // 从周围区域采样颜色
      const sampleX = Math.max(0, Math.min(p.canvas.width-1, sx + px + (Math.random()-0.5)*borderSize*2))
      const sampleY = Math.max(0, Math.min(p.canvas.height-1, sy + py + (Math.random()-0.5)*borderSize*2))
      
      try {
        const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data
        tCtx.fillStyle = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},0.3)`
        tCtx.fillRect(px, py, size, size)
      } catch(e) {}
    }
    
    // 应用平滑效果
    ctx.save()
    ctx.beginPath()
    ctx.rect(sx, sy, sw, sh)
    ctx.clip()
    ctx.drawImage(tempCanvas, sx, sy)
    
    // 边缘模糊以平滑过渡
    if (smooth.value > 0) {
      ctx.filter = `blur(${smooth.value}px)`
      ctx.drawImage(tempCanvas, sx, sy)
    }
    ctx.restore()
  } else {
    // 智能模式 - 结合复制补和平滑补
    await applyAdvanced()
  }
  
  await updateProcessed(p)
}

const applyCorner = async () => {
  await ensureCanvas(); const p = activePic(); if (!p || !p.canvas) return
  const c = p.canvas; const ctx = c.getContext('2d')!
  const margin = 24
  let x = 0, y = 0, w = Math.floor(c.width * 0.25), h = Math.floor(c.height * 0.15)
  if (corner.value.includes('right')) x = c.width - w - margin
  else x = margin
  if (corner.value.includes('bottom')) y = c.height - h - margin
  else y = margin
  selection.x = x; selection.y = y; selection.w = w; selection.h = h
  await applyManual()
}

const applyAdvanced = async () => {
  await ensureCanvas(); const p = activePic(); if (!p || !p.canvas) return
  const ctx = p.canvas.getContext('2d')!
  const { x, y, w, h } = selection
  const sx = Math.max(0, Math.floor(x / (scale.x || 1)))
  const sy = Math.max(0, Math.floor(y / (scale.y || 1)))
  const sw = Math.max(1, Math.floor(w / (scale.x || 1)))
  const sh = Math.max(1, Math.floor(h / (scale.y || 1)))
  
  // 智能纹理合成算法 - 改进版本
  const tempCanvas = document.createElement('canvas'); tempCanvas.width = sw; tempCanvas.height = sh
  const tCtx = tempCanvas.getContext('2d')!
  
  // 1. 分析边界颜色和纹理特征
  const borderSize = Math.max(5, Math.floor(Math.min(sw, sh) * 0.15))
  const borderPixels = []
  const borderColors = { top: [], bottom: [], left: [], right: [] }
  
  try {
    // 获取边界像素数据
    const topB = ctx.getImageData(Math.max(0, sx - borderSize), Math.max(0, sy - borderSize), sw + 2 * borderSize, borderSize)
    const bottomB = ctx.getImageData(Math.max(0, sx - borderSize), Math.min(p.canvas.height - borderSize, sy + sh), sw + 2 * borderSize, borderSize)
    const leftB = ctx.getImageData(Math.max(0, sx - borderSize), Math.max(0, sy - borderSize), borderSize, sh + 2 * borderSize)
    const rightB = ctx.getImageData(Math.min(p.canvas.width - borderSize, sx + sw), Math.max(0, sy - borderSize), borderSize, sh + 2 * borderSize)
    
    borderPixels.push(...topB.data, ...bottomB.data, ...leftB.data, ...rightB.data)
    
    // 分析各边界的平均颜色
    const analyzeBorder = (imageData: ImageData, borderName: keyof typeof borderColors) => {
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        borderColors[borderName].push({ r: data[i], g: data[i+1], b: data[i+2] })
      }
    }
    
    analyzeBorder(topB, 'top')
    analyzeBorder(bottomB, 'bottom')
    analyzeBorder(leftB, 'left')
    analyzeBorder(rightB, 'right')
  } catch(e) {}
  
  // 计算整体平均颜色作为背景
  let r=0, g=0, b=0, count=0
  for(let i=0; i<borderPixels.length; i+=4) { r+=borderPixels[i]; g+=borderPixels[i+1]; b+=borderPixels[i+2]; count++ }
  if(count > 0) { tCtx.fillStyle = `rgb(${r/count},${g/count},${b/count})`; tCtx.fillRect(0,0,sw,sh) }

  // 2. 智能纹理合成 - 基于相似度匹配
  const patchSize = Math.max(8, Math.floor(Math.min(sw, sh) / (quality.value + 1)))
  const searchRadius = Math.max(sw, sh) * 2
  
  // 计算像素相似度
  const calculateSimilarity = (x1: number, y1: number, x2: number, y2: number, patchSize: number) => {
    try {
      const patch1 = ctx.getImageData(x1, y1, patchSize, patchSize)
      const patch2 = ctx.getImageData(x2, y2, patchSize, patchSize)
      let diff = 0
      for (let i = 0; i < patch1.data.length; i += 4) {
        const dr = patch1.data[i] - patch2.data[i]
        const dg = patch1.data[i+1] - patch2.data[i+1]
        const db = patch1.data[i+2] - patch2.data[i+2]
        diff += Math.sqrt(dr*dr + dg*dg + db*db)
      }
      return diff / (patchSize * patchSize)
    } catch {
      return Infinity
    }
  }
  
  // 寻找最佳匹配的纹理块
  const findBestPatch = (tx: number, ty: number, patchSize: number) => {
    let bestX = 0, bestY = 0, bestScore = Infinity
    const attempts = quality.value * 20 + 10
    
    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * searchRadius
      const candX = Math.floor(sx + Math.cos(angle) * dist)
      const candY = Math.floor(sy + Math.sin(angle) * dist)
      
      // 确保候选区域在画布内且不在选择区域内
      if (candX >= 0 && candY >= 0 && 
          candX + patchSize < p.canvas.width && candY + patchSize < p.canvas.height &&
          (candX + patchSize < sx || candX > sx + sw || candY + patchSize < sy || candY > sy + sh)) {
        
        // 计算边界相似度
        let score = 0
        
        // 检查顶部边界匹配
        if (ty === 0 && borderColors.top.length > 0) {
          const borderY = Math.max(0, sy - borderSize)
          score += calculateSimilarity(candX, candY, candX, borderY, patchSize)
        }
        
        // 检查左侧边界匹配
        if (tx === 0 && borderColors.left.length > 0) {
          const borderX = Math.max(0, sx - borderSize)
          score += calculateSimilarity(candX, candY, borderX, candY, patchSize)
        }
        
        if (score < bestScore) {
          bestScore = score
          bestX = candX
          bestY = candY
        }
      }
    }
    
    return { x: bestX, y: bestY, score: bestScore }
  }

  // 3. 分层纹理合成
  const layers = quality.value + 1
  for (let layer = 0; layer < layers; layer++) {
    const currentPatchSize = Math.max(4, patchSize - layer * 2)
    const patchesPerLayer = Math.ceil((sw * sh) / (currentPatchSize * currentPatchSize)) * (layer + 1)
    
    for (let i = 0; i < patchesPerLayer; i++) {
      const tx = Math.floor(Math.random() * (sw - currentPatchSize))
      const ty = Math.floor(Math.random() * (sh - currentPatchSize))
      
      const bestPatch = findBestPatch(tx, ty, currentPatchSize)
      if (bestPatch.score < 1000) { // 合理的相似度阈值
        tCtx.globalAlpha = 0.3 + (layer * 0.2) // 分层透明度
        tCtx.drawImage(p.canvas, bestPatch.x, bestPatch.y, currentPatchSize, currentPatchSize, tx, ty, currentPatchSize, currentPatchSize)
      }
    }
  }
  tCtx.globalAlpha = 1.0

  // 4. 平滑边缘融合
  const featherSize = Math.max(2, Math.min(sw, sh) * 0.05)
  
  // 创建羽化遮罩
  const featherCanvas = document.createElement('canvas'); featherCanvas.width = sw; featherCanvas.height = sh
  const fCtx = featherCanvas.getContext('2d')!
  
  // 绘制中心不透明，边缘透明的渐变
  const gradient = fCtx.createRadialGradient(sw/2, sh/2, 0, sw/2, sh/2, Math.min(sw, sh)/2)
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  
  fCtx.fillStyle = gradient
  fCtx.fillRect(0, 0, sw, sh)
  
  // 应用羽化效果
  const finalCanvas = document.createElement('canvas'); finalCanvas.width = sw; finalCanvas.height = sh
  const finalCtx = finalCanvas.getContext('2d')!
  
  // 先绘制合成纹理
  finalCtx.drawImage(tempCanvas, 0, 0)
  
  // 使用遮罩进行羽化
  finalCtx.globalCompositeOperation = 'destination-in'
  finalCtx.drawImage(featherCanvas, 0, 0)
  finalCtx.globalCompositeOperation = 'source-over'
  
  // 轻微模糊以平滑纹理
  if (smooth.value > 0) {
    const blurCanvas = document.createElement('canvas'); blurCanvas.width = sw; blurCanvas.height = sh
    const bCtx = blurCanvas.getContext('2d')!
    bCtx.filter = `blur(${smooth.value * 0.5}px)`
    bCtx.drawImage(finalCanvas, 0, 0)
    finalCtx.globalAlpha = 0.7
    finalCtx.drawImage(blurCanvas, 0, 0)
    finalCtx.globalAlpha = 1.0
  }
  
  // 5. 应用处理结果
  ctx.save()
  ctx.beginPath()
  ctx.rect(sx, sy, sw, sh)
  ctx.clip()
  ctx.drawImage(finalCanvas, sx, sy)
  ctx.restore()

  await updateProcessed(p)
}

const processActive = async () => { const p = activePic(); if (p) p.status = 'pending'; if (mode.value === 'manual') await applyManual(); else if (mode.value === 'corner') await applyCorner(); else await applyAdvanced(); if (p) p.status = 'processed' }

const processAll = async () => { for (const p of pics.value) { activeId.value = p.id; await processActive() } }

const mimeFromExt = (name: string) => (/\.png$/i.test(name) ? 'image/png' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : /\.webp$/i.test(name) ? 'image/webp' : /\.bmp$/i.test(name) ? 'image/bmp' : 'image/png')
const updateProcessed = async (p: Pic) => {
  const mime = p.type || mimeFromExt(p.name)
  const blob: Blob = await new Promise(resolve => p.canvas!.toBlob(b => resolve(b!), mime, 1))
  p.processedBlob = blob
  p.processedUrl = URL.createObjectURL(blob)
}
const exportAll = async () => {
  for (const p of pics.value) {
    const url = p.processedUrl || p.url
    const name = p.processedBlob ? p.name.replace(/\.[^.]+$/, '') + '_processed' + (p.type.includes('png') ? '.png' : p.type.includes('jpeg') ? '.jpg' : p.type.includes('webp') ? '.webp' : '.png') : p.name
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  }
}
const exportZip = async () => {
  const zip = new JSZip()
  for (const p of pics.value) {
    if (p.processedBlob) {
      zip.file(p.name.replace(/\.[^.]+$/, '') + '_processed' + (p.type.includes('png') ? '.png' : p.type.includes('jpeg') ? '.jpg' : p.type.includes('webp') ? '.webp' : '.png'), p.processedBlob)
    } else {
      zip.file(p.name, p.file)
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'images_processed.zip'; document.body.appendChild(a); a.click(); a.remove()
}
const importZip = async (file: File) => {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const entries: Array<{ name: string; blob: Blob }> = []
  const imageExt = /\.(png|jpe?g|webp|bmp)$/i
  const tasks: Promise<void>[] = []
  zip.forEach((path, entry) => {
    if (!entry.dir && imageExt.test(path)) {
      tasks.push(entry.async('blob').then(blob => { entries.push({ name: path.split('/').pop() || path, blob }) }))
    }
  })
  await Promise.all(tasks)
  const added: Pic[] = entries.map(({ name, blob }) => {
    const type = mimeFromExt(name)
    const file = new File([blob], name, { type })
    return { id: Math.random().toString(36).slice(2), file, name, type, url: URL.createObjectURL(file), status: 'pending' }
  })
  pics.value = [...added, ...pics.value]
  if (!activeId.value && added.length) activeId.value = added[0].id
}
const previewOpen = ref(false)
const previewMode = ref<'side' | 'slider'>('side')
const previewItemId = ref<string | null>(null)
const previewPic = () => pics.value.find(p => p.id === previewItemId.value!) || activePic()
const openPreview = (p: Pic) => { previewItemId.value = p.id; previewOpen.value = true; previewMode.value = 'side' }
const openPreviewWithActive = (mode: 'side' | 'slider') => { previewItemId.value = activeId.value; previewMode.value = mode; previewOpen.value = true }
const downloadOriginal = (p: Pic) => { const a = document.createElement('a'); a.href = p.url; a.download = p.name; document.body.appendChild(a); a.click(); a.remove() }
const downloadProcessed = (p: Pic) => { if (!p.processedUrl) return; const a = document.createElement('a'); a.href = p.processedUrl; const name = p.name.replace(/\.[^.]+$/, '') + '_processed' + (p.type.includes('png') ? '.png' : p.type.includes('jpeg') ? '.jpg' : p.type.includes('webp') ? '.webp' : '.png'); a.download = name; document.body.appendChild(a); a.click(); a.remove() }
const removeOne = (p: Pic) => { pics.value = pics.value.filter(x => x.id !== p.id) }

const downloadOne = (p: Pic) => {
  if (typeof document === 'undefined') return
  const url = p.processedUrl || p.url
  const name = p.processedBlob
    ? p.name.replace(/\.[^.]+$/, '') + '_processed' + (p.type.includes('png') ? '.png' : p.type.includes('jpeg') ? '.jpg' : p.type.includes('webp') ? '.webp' : '.png')
    : p.name
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const onSelectThumb = async (id: string) => { 
  activeId.value = id; 
  await ensureCanvas()
  if (mode.value === 'manual') {
    singleSelectOpen.value = true
  }
}

const openBatchSelect = () => { batchSelectOpen.value = true }
const applyBatchSelection = () => {
  for (const p of pics.value) {
    activeId.value = p.id
    selection.x = batchSelection.x
    selection.y = batchSelection.y
    selection.w = batchSelection.w
    selection.h = batchSelection.h
  }
  batchSelectOpen.value = false
}

const openSingleSelect = (p: Pic) => {
  activeId.value = p.id
  singleSelection.x = selection.x
  singleSelection.y = selection.y
  singleSelection.w = selection.w
  singleSelection.h = selection.h
  singleSelectOpen.value = true
}
const applySingleSelection = () => {
  selection.x = singleSelection.x
  selection.y = singleSelection.y
  selection.w = singleSelection.w
  selection.h = singleSelection.h
  singleSelectOpen.value = false
}

const onCanvasMounted = async (el: HTMLCanvasElement) => {
  const p = activePic(); if (!p) return; if (!p.canvas) await drawToCanvas(p); const ctx = el.getContext('2d')!; ctx.clearRect(0,0,el.width,el.height)
  el.width = p.canvas!.width; el.height = p.canvas!.height; ctx.drawImage(p.canvas!, 0, 0)
  canvasEl.value = el
  scale.x = el.clientWidth / el.width || 1
  scale.y = el.clientHeight / el.height || 1
}
const compareOpen = ref(false)
const split = ref(50)
const batchSelectOpen = ref(false)
const singleSelectOpen = ref(false)
const batchSelection = reactive({ x: 50, y: 50, w: 200, h: 80 })
const singleSelection = reactive({ x: 50, y: 50, w: 200, h: 80 })
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <div class="max-w-6xl mx-auto px-6 py-8">
      <div class="mb-6 relative">
        <RouterLink to="/" class="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600">
          <Home class="w-5 h-5" />
          <span class="hidden md:inline">返回主页</span>
        </RouterLink>
        <h2 class="text-2xl font-bold text-slate-900 flex items-center gap-2"><ImageIcon class="w-5 h-5" /> 图片去水印工具</h2>
        <p class="text-slate-600 mt-1">支持多图片上传、智能纹理合成、平滑补和复制补算法，弹窗选择区域，批量导出</p>
      </div>

  <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
    <div class="flex flex-wrap items-center gap-3">
      <input id="img-upload" type="file" accept="image/*" multiple class="hidden" @change="onUpload" />
      <label for="img-upload" class="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"><Upload class="w-4 h-4" /> 上传图片</label>
      <input id="zip-upload" type="file" accept=".zip" class="hidden" @change="onUpload" />
      <label for="zip-upload" class="flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-lg cursor-pointer"><Upload class="w-4 h-4" /> 导入 ZIP</label>
      <button @click="processActive" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg"><Wand2 class="w-4 h-4 inline" /> 去除当前水印</button>
        <button @click="processAll" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg">批量去水印</button>
        <button @click="openBatchSelect" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg" v-if="mode==='manual'">批量选取位置</button>
        <button @click="exportAll" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg"><Download class="w-4 h-4 inline" /> 批量导出</button>
        <button @click="exportZip" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg"><Download class="w-4 h-4 inline" /> 导出 ZIP</button>
      <div class="ml-auto flex items-center gap-3">
        <select v-model="mode" class="px-3 py-2 border border-slate-200 rounded-lg text-sm">
          <option value="manual">手动选择区域</option>
          <option value="corner">角落自动识别</option>
          <option value="advanced">高级融合</option>
        </select>
        <select v-model="repairMode" class="px-3 py-2 border border-slate-200 rounded-lg text-sm" v-if="mode==='manual'">
          <option value="copy">复制补</option>
          <option value="smooth">平滑补</option>
          <option value="smart">智能模式</option>
        </select>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">平滑度</span>
          <input type="range" min="0" max="6" v-model="smooth" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">质量</span>
          <input type="range" min="1" max="5" v-model="quality" />
        </div>
        <select v-model="corner" class="px-3 py-2 border border-slate-200 rounded-lg text-sm" v-if="mode==='corner'">
          <option value="top-left">左上角</option>
          <option value="top-right">右上角</option>
          <option value="bottom-left">左下角</option>
          <option value="bottom-right">右下角</option>
        </select>
      </div>
    </div>
  </div>

      <div class="w-full">
        <div class="w-full">
          <div v-if="activeId" class="relative" tabindex="0">
            <canvas ref="onCanvasMounted" class="max-h-[60vh] w-full border border-slate-200 rounded-xl"></canvas>
          </div>
          <div v-else class="text-slate-400">请先上传并选择一张图片</div>
        </div>
      </div>

      <div v-if="activeId" class="mt-6">
        <button @click="openPreviewWithActive('side')" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg">预览图片</button>
        <button @click="openPreviewWithActive('slider')" class="ml-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg">预览对比</button>
      </div>

      <div v-if="pics.length" class="mt-6">
        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm font-semibold text-slate-700">文件队列</div>
            <div class="text-xs text-slate-500">共 {{ pics.length }} 项</div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="p in pics" :key="p.id" class="rounded-2xl border border-slate-200 hover:border-brand-200 shadow-sm overflow-hidden">
              <div class="flex h-40">
                <div class="flex-1 relative group cursor-pointer border-r border-white/20" @click="onSelectThumb(p.id)">
                  <img :src="p.url" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span class="text-white text-xs bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100">原图</span>
                  </div>
                </div>
                <div v-if="p.processedUrl" class="flex-1 relative group cursor-pointer" @click="onSelectThumb(p.id)">
                  <img :src="p.processedUrl" class="w-full h-full object-cover" />
                  <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span class="text-white text-xs bg-black/50 px-2 py-1 rounded opacity-0 group-hover:opacity-100">处理后</span>
                  </div>
                </div>
              </div>
              <div class="p-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-sm font-semibold text-slate-800 truncate">{{ p.name }}</div>
                  <span class="text-xs px-2 py-0.5 rounded-full" :class="p.status==='processed' ? 'bg-green-100 text-green-700' : (p.status==='error' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')">{{ p.status }}</span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button @click="openPreview(p)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs">预览</button>
                  <button @click="openSingleSelect(p)" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs" v-if="mode==='manual'">选取位置</button>
                  <button @click="downloadOriginal(p)" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs">下载原图</button>
                  <button @click="downloadProcessed(p)" :disabled="!p.processedUrl" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs disabled:opacity-50">下载处理后</button>
                  <button @click="removeOne(p)" class="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs">移除</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="previewOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-lg w-[90vw] max-w-4xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold text-slate-700">图片预览</div>
            <div class="flex items-center gap-2">
              <button class="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg" @click="previewMode='side'">并排</button>
              <button class="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg" @click="previewMode='slider'">滑杆对比</button>
              <button class="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg" @click="previewOpen=false">关闭</button>
            </div>
          </div>
          <div v-if="previewMode==='side'" class="grid md:grid-cols-2 gap-4">
            <div class="rounded-xl border border-slate-200 overflow-hidden">
              <img :src="previewPic()?.url" class="w-full max-h-[70vh] object-contain" />
            </div>
            <div class="rounded-xl border border-slate-200 overflow-hidden">
              <img :src="previewPic()?.processedUrl || previewPic()?.url" class="w-full max-h-[70vh] object-contain" />
            </div>
          </div>
          <div v-else class="relative w-full">
            <div class="relative overflow-hidden rounded-xl border border-slate-200">
              <img :src="previewPic()?.url" class="w-full max-h-[70vh] object-contain" />
              <img :src="previewPic()?.processedUrl || previewPic()?.url" class="w-full max-h-[70vh] object-contain absolute inset-0" :style="{ clipPath: 'inset(0 ' + (100-split)+'% 0 0)' }" />
              <input type="range" min="0" max="100" v-model="split" class="absolute bottom-3 left-1/2 -translate-x-1/2 w-1/2" />
            </div>
          </div>
        </div>
      </div>

      <!-- 批量选取位置弹窗 -->
      <div v-if="batchSelectOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-lg w-[90vw] max-w-4xl p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="text-lg font-semibold text-slate-700">批量选取位置</div>
            <button @click="batchSelectOpen = false" class="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">关闭</button>
          </div>
          <div class="mb-4">
            <p class="text-slate-600 mb-4">设置所有图片的统一水印位置，设置后所有图片将使用相同的位置进行去水印处理。</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-slate-600">X坐标</label>
                <input type="number" v-model="batchSelection.x" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label class="text-sm text-slate-600">Y坐标</label>
                <input type="number" v-model="batchSelection.y" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label class="text-sm text-slate-600">宽度</label>
                <input type="number" v-model="batchSelection.w" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label class="text-sm text-slate-600">高度</label>
                <input type="number" v-model="batchSelection.h" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button @click="batchSelectOpen = false" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg">取消</button>
            <button @click="applyBatchSelection" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg">应用所有图片</button>
          </div>
        </div>
      </div>

      <!-- 单个选取位置弹窗 -->
      <div v-if="singleSelectOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-lg w-[90vw] max-w-4xl p-6">
          <div class="flex items-center justify-between mb-4">
            <div class="text-lg font-semibold text-slate-700">选取位置 - {{ activePic()?.name }}</div>
            <button @click="singleSelectOpen = false" class="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg">关闭</button>
          </div>
          <div class="mb-4">
            <p class="text-slate-600 mb-4">设置当前图片的水印位置。</p>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-slate-600">X坐标</label>
                <input type="number" v-model="singleSelection.x" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label class="text-sm text-slate-600">Y坐标</label>
                <input type="number" v-model="singleSelection.y" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label class="text-sm text-slate-600">宽度</label>
                <input type="number" v-model="singleSelection.w" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label class="text-sm text-slate-600">高度</label>
                <input type="number" v-model="singleSelection.h" class="w-full px-3 py-2 border border-slate-200 rounded-lg" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3">
            <button @click="singleSelectOpen = false" class="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg">取消</button>
            <button @click="applySingleSelection" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg">应用当前图片</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
