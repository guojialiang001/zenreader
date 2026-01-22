<template>
  <div class="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden select-none">
    <!-- 顶部工具栏 -->
    <header class="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-50">
      <div class="flex items-center gap-2">
        <RouterLink to="/" class="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-blue-600 transition-colors flex-shrink-0" title="返回首页">
          <Home class="w-4 h-4" />
        </RouterLink>
        <!-- 历史记录按钮 -->
        <button
          @click="showHistorySidebar = !showHistorySidebar"
          :class="[toolbarBtnClass, showHistorySidebar ? 'bg-blue-100 text-blue-600' : '']"
          title="历史文件"
        >
          <FolderOpen class="w-4 h-4" />
        </button>
        <!-- 新建流程图按钮 -->
        <button
          @click="createNewFile"
          :class="toolbarBtnClass"
          title="新建流程图"
        >
          <Plus class="w-4 h-4" />
        </button>
        <!-- 流程图图标 -->
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <GitBranch class="w-4 h-4 text-white" />
        </div>
        <!-- 流程图名称输入框 -->
        <input
          v-model="canvasName"
          class="text-sm font-semibold text-slate-800 bg-transparent border-none focus:outline-none focus:bg-slate-100 px-2 py-1.5 rounded"
          placeholder="未命名流程图"
          @change="updateCurrentFileInHistory"
        />
      </div>

      <div class="flex items-center gap-1">
        <!-- 拖动工具 -->
        <button
          @click="togglePanMode"
          :class="[toolbarBtnClass, isPanMode ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300' : '']"
          title="拖动画布 (Space+拖动)"
        >
          <Hand class="w-4 h-4" />
        </button>
        <!-- 插入文字按钮 -->
        <button
          @click="insertTextNode"
          :class="toolbarBtnClass"
          title="插入文字"
        >
          <MessageSquare class="w-4 h-4" />
        </button>
        <button
          @click="toggleAiPanel"
          :class="[toolbarBtnClass, aiPanelOpen ? 'bg-blue-100 text-blue-600' : '']"
          title="AI 问答改图 (Ctrl+Shift+K)"
        >
          <Sparkles class="w-4 h-4" />
        </button>
        <span class="w-px h-6 bg-slate-200 mx-2"></span>

        <!-- 撤销/重做 -->
        <button @click="undo" :disabled="!canUndo" :class="toolbarBtnClass" title="撤销 (Ctrl+Z)">
          <Undo2 class="w-4 h-4" />
        </button>
        <button @click="redo" :disabled="!canRedo" :class="toolbarBtnClass" title="重做 (Ctrl+Y)">
          <Redo2 class="w-4 h-4" />
        </button>
        <span class="w-px h-6 bg-slate-200 mx-2"></span>

        <!-- 缩放控制 -->
        <button @click="zoomOut" :class="toolbarBtnClass" title="缩小">
          <ZoomOut class="w-4 h-4" />
        </button>
        <span class="text-xs text-slate-600 w-12 text-center font-mono">{{ Math.round(zoom * 100) }}%</span>
        <button @click="zoomIn" :class="toolbarBtnClass" title="放大">
          <ZoomIn class="w-4 h-4" />
        </button>
        <button @click="resetZoom" :class="toolbarBtnClass" title="重置缩放">
          <Maximize2 class="w-4 h-4" />
        </button>
        <span class="w-px h-6 bg-slate-200 mx-2"></span>

        <!-- 网格切换 -->
        <button @click="showGrid = !showGrid" :class="[toolbarBtnClass, showGrid ? 'bg-blue-100 text-blue-600' : '']" title="显示网格">
          <Grid3x3 class="w-4 h-4" />
        </button>
        <button @click="snapToGrid = !snapToGrid" :class="[toolbarBtnClass, snapToGrid ? 'bg-blue-100 text-blue-600' : '']" title="对齐网格">
          <Magnet class="w-4 h-4" />
        </button>
        <span class="w-px h-6 bg-slate-200 mx-2"></span>

        <!-- 导出下拉菜单 -->
        <div class="relative">
          <button
            @click="showExportMenu = !showExportMenu"
            :class="toolbarBtnClass"
            title="导出"
          >
            <Download class="w-4 h-4" />
          </button>

          <!-- 下拉菜单 -->
          <div
            v-if="showExportMenu"
            class="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-40"
            @click="showExportMenu = false"
          >
            <button @click="exportPNG" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 transition-colors">
              <ImageIcon class="w-4 h-4" /> 导出 PNG
            </button>
            <button @click="exportHTML" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 transition-colors">
              <Code class="w-4 h-4" /> 导出 HTML
            </button>
            <button @click="exportJSON" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 transition-colors">
              <FileJson class="w-4 h-4" /> 导出 JSON
            </button>
            <button @click="exportMermaid" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 transition-colors">
              <GitBranch class="w-4 h-4" /> 导出 Mermaid
            </button>
          </div>
        </div>

        <!-- 导入下拉菜单 -->
        <div class="relative">
          <button
            @click="showImportMenu = !showImportMenu"
            :class="toolbarBtnClass"
            title="导入"
          >
            <Upload class="w-4 h-4" />
          </button>

          <!-- 下拉菜单 -->
          <div
            v-if="showImportMenu"
            class="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-40"
            @click="showImportMenu = false"
          >
            <button @click="importJSON" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 transition-colors">
              <FileJson class="w-4 h-4" /> 导入 JSON
            </button>
            <button @click="importMermaid" class="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 transition-colors">
              <GitBranch class="w-4 h-4" /> 导入 Mermaid
            </button>
          </div>
        </div>

        <span class="w-px h-6 bg-slate-200 mx-2"></span>

        <!-- 清空 -->
        <button @click="clearCanvas" class="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          清空画布
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- 历史文件侧边栏 -->
      <aside
        v-if="showHistorySidebar"
        class="w-64 bg-white border-r border-slate-200 flex flex-col overflow-hidden shadow-lg"
      >
        <div class="p-3 border-b border-slate-100">
          <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">历史文件</h3>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="file in historyFiles"
            :key="file.id"
            @click="loadHistoryFile(file.id)"
            :class="[
              'px-3 py-2.5 border-b border-slate-50 cursor-pointer transition-colors group',
              currentFileId === file.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50'
            ]"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-700 truncate">{{ file.name }}</p>
                <p class="text-xs text-slate-400 mt-0.5">
                  {{ formatDate(file.updatedAt) }}
                </p>
              </div>
              <button
                @click.stop="deleteHistoryFile(file.id)"
                class="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-all"
                title="删除"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div v-if="historyFiles.length === 0" class="p-4 text-center text-sm text-slate-400">
            暂无历史文件
          </div>
        </div>
      </aside>

      <!-- 左侧形状面板 -->
      <aside class="w-56 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div class="p-3 border-b border-slate-100">
          <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">形状库</h3>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <!-- 基础形状 -->
          <div class="mb-4">
            <h4 class="text-xs text-slate-400 mb-2">基础形状</h4>
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="shape in basicShapes"
                :key="shape.type"
                draggable="true"
                @dragstart="onShapeDragStart($event, shape)"
                class="aspect-square bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors group"
                :title="shape.name"
              >
                <component :is="shape.icon" class="w-6 h-6 text-slate-400 group-hover:text-blue-500" />
              </div>
            </div>
          </div>

          <!-- 流程图形状 -->
          <div class="mb-4">
            <h4 class="text-xs text-slate-400 mb-2">流程图</h4>
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="shape in flowShapes"
                :key="shape.type"
                draggable="true"
                @dragstart="onShapeDragStart($event, shape)"
                class="aspect-square bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors group"
                :title="shape.name"
              >
                <svg class="w-8 h-8" viewBox="0 0 40 40">
                  <path :d="shape.preview" fill="none" stroke="currentColor" stroke-width="1.5" class="text-slate-400 group-hover:text-blue-500" />
                </svg>
              </div>
            </div>
          </div>

          <!-- 连接线 -->
          <div class="mb-4">
            <h4 class="text-xs text-slate-400 mb-2">连接线</h4>
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="line in lineTypes"
                :key="line.type"
                @click="setLineType(line.type)"
                :class="[
                  'aspect-square bg-slate-50 border rounded-lg flex items-center justify-center cursor-pointer transition-colors',
                  currentLineType === line.type ? 'bg-blue-100 border-blue-300' : 'hover:bg-blue-50 border-slate-200 hover:border-blue-300'
                ]"
                :title="line.name"
              >
                <svg class="w-8 h-8" viewBox="0 0 40 40">
                  <path :d="line.preview" fill="none" stroke="currentColor" stroke-width="1.5" :class="currentLineType === line.type ? 'text-blue-500' : 'text-slate-400'" />
                  <polygon
                    :points="`${line.arrowX},${line.arrowY} ${line.arrowX - 7 * Math.cos(-0.4 + line.arrowAngle)},${line.arrowY - 7 * Math.sin(-0.4 + line.arrowAngle)} ${line.arrowX - 7 * Math.cos(0.4 + line.arrowAngle)},${line.arrowY - 7 * Math.sin(0.4 + line.arrowAngle)}`"
                    :fill="currentLineType === line.type ? '#3b82f6' : '#94a3b8'"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 画布区域 -->
      <main class="flex-1 relative overflow-hidden" ref="canvasContainer" :class="{ 'cursor-grab': (isPanMode || isSpacePressed) && !isPanning, 'cursor-grabbing': isPanning }">
        <!-- 画布背景 -->
        <div
          ref="canvasWrapper"
          class="absolute inset-0 overflow-hidden"
          :style="{
            backgroundColor: '#ffffff',
            backgroundImage: showGrid ? gridBackground : 'none',
            backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
            backgroundPosition: `${panOffset.x * zoom}px ${panOffset.y * zoom}px`
          }"
          @wheel.prevent="onWheel"
          @mousedown="onCanvasMouseDown"
          @mousemove="onCanvasMouseMove"
          @mouseup="onCanvasMouseUp"
          @mouseleave="onCanvasMouseUp"
          @drop.prevent="onCanvasDrop"
          @dragover.prevent="onCanvasDragOver"
          @contextmenu.prevent="onContextMenu"
        >
          <div
            ref="canvasContent"
            class="relative canvas-content overflow-visible"
            :style="{
              width: `${dynamicCanvasSize.width}px`,
              height: `${dynamicCanvasSize.height}px`,
              transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: '0 0'
            }"
          >
            <!-- 形状层 -->
            <div
              v-for="node in nodes"
              :key="node.id"
              :style="getNodeStyle(node)"
              :class="[
                'absolute cursor-move transition-shadow overflow-visible',
                selectedNodes.includes(node.id) ? 'ring-2 ring-blue-500 ring-offset-2' : ''
              ]"
              @mousedown.stop="onNodeMouseDown($event, node)"
              @dblclick.stop="startEditingText(node)"
            >
              <!-- 对于需要特殊形状的节点使用 SVG 绘制 -->
              <svg
                v-if="needsSvgShape(node.type)"
                class="absolute overflow-visible"
                :style="{
                  left: `-${node.strokeWidth + 4}px`,
                  top: `-${node.strokeWidth + 4}px`,
                  width: `${node.width + (node.strokeWidth + 4) * 2}px`,
                  height: `${node.height + (node.strokeWidth + 4) * 2}px`
                }"
                :viewBox="`0 0 ${node.width + (node.strokeWidth + 4) * 2} ${node.height + (node.strokeWidth + 4) * 2}`"
              >
                <path
                  :d="getSvgShapePathWithPadding(node)"
                  :fill="node.fill"
                  :stroke="node.stroke"
                  :stroke-width="node.strokeWidth"
                />
              </svg>
              <!-- 普通形状使用 CSS -->
              <div v-else class="absolute inset-0" :style="getShapeStyle(node)"></div>

              <!-- 文字层 - 使用 flexbox 居中，确保导出时位置正确 -->
              <div
                v-if="editingNode?.id !== node.id"
                class="absolute inset-0 flex items-center justify-center pointer-events-none"
                :style="{
                  padding: '4px'
                }"
              >
                <span
                  class="pointer-events-auto text-center"
                  :style="{
                    color: node.textColor || '#000000',
                    fontSize: `${node.fontSize || 14}px`,
                    lineHeight: '1.4',
                    wordBreak: 'break-word',
                    maxWidth: '100%'
                  }"
                >
                  {{ node.text || '' }}
                </span>
              </div>
              <!-- 编辑模式 -->
              <div
                v-else
                class="absolute inset-0 flex items-center justify-center p-2"
              >
                <textarea
                  ref="textEditor"
                  v-model="editingText"
                  @blur="finishEditingText"
                  @keydown.enter.prevent="finishEditingText"
                  @keydown.escape="cancelEditingText"
                  class="w-full h-full text-center bg-transparent border-none outline-none resize-none pointer-events-auto"
                  :style="{ color: node.textColor || '#000000', fontSize: `${node.fontSize || 14}px`, lineHeight: '1.2' }"
                ></textarea>
              </div>

              <!-- 连接点 -->
              <div
                v-for="anchor in getNodeAnchors(node)"
                :key="anchor.position"
                :style="getAnchorStyle(anchor)"
                class="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-crosshair z-10"
                :class="{ 'opacity-100': selectedNodes.includes(node.id) || isDrawingConnection }"
                @mousedown.stop="startConnection($event, node, anchor)"
              ></div>

              <!-- 调整大小手柄 -->
              <template v-if="selectedNodes.length === 1 && selectedNodes[0] === node.id">
                <div
                  v-for="handle in resizeHandles"
                  :key="handle.position"
                  :style="getResizeHandleStyle(handle)"
                  class="absolute w-2.5 h-2.5 bg-white border border-blue-500 z-20"
                  :class="handle.cursor"
                  @mousedown.stop="startResize($event, node, handle)"
                ></div>
              </template>
            </div>

            <!-- SVG 层用于绘制连接线 - 放在形状层之后确保在最上层 -->
            <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 9999; overflow: visible;">
              <!-- 已有连接线 -->
              <g v-for="conn in connections" :key="conn.id">
                <path
                  :d="getConnectionPath(conn)"
                  fill="none"
                  :stroke="selectedConnection?.id === conn.id ? '#3b82f6' : conn.color || '#000000'"
                  :stroke-width="selectedConnection?.id === conn.id ? 3 : 2"
                  :stroke-dasharray="conn.dashed ? '5,5' : 'none'"
                  class="pointer-events-auto cursor-pointer"
                  @click.stop="selectConnection(conn)"
                />
                <!-- 箭头 -->
                <polygon
                  v-if="conn.arrow !== 'none'"
                  :points="getArrowPoints(conn)"
                  :fill="selectedConnection?.id === conn.id ? '#3b82f6' : conn.color || '#000000'"
                  :stroke="selectedConnection?.id === conn.id ? '#2563eb' : '#000000'"
                  stroke-width="1"
                  stroke-linejoin="round"
                />
                <!-- 连接线标签 -->
                <text
                  v-if="conn.label"
                  :x="getConnectionLabelPosition(conn).x"
                  :y="getConnectionLabelPosition(conn).y"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  :fill="selectedConnection?.id === conn.id ? '#3b82f6' : (conn.labelColor || '#000000')"
                  :font-size="conn.labelFontSize || 14"
                  :font-weight="conn.labelFontWeight || 'normal'"
                  font-family="system-ui, sans-serif"
                  class="pointer-events-auto select-none"
                  :style="{ cursor: isDraggingLabel && draggingLabelConn?.id === conn.id ? 'grabbing' : 'grab' }"
                  @mousedown.stop="startLabelDrag($event, conn)"
                >
                  {{ conn.label }}
                </text>
                <!-- 折线控制点 -->
                <g v-if="getBendControlPoint(conn) && (selectedConnection?.id === conn.id)">
                  <circle
                    :cx="getBendControlPoint(conn)!.x"
                    :cy="getBendControlPoint(conn)!.y"
                    r="6"
                    fill="white"
                    stroke="#3b82f6"
                    stroke-width="2"
                    class="pointer-events-auto"
                    :class="getBendControlPoint(conn)!.direction === 'horizontal' ? 'cursor-ew-resize' : 'cursor-ns-resize'"
                    @mousedown.stop="startBendDrag($event, conn)"
                  />
                </g>
              </g>

              <!-- 正在绘制的连接线 -->
              <path
                v-if="isDrawingConnection"
                :d="tempConnectionPath"
                fill="none"
                stroke="#3b82f6"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            </svg>

            <!-- 选择框 -->
            <div
              v-if="isSelecting"
              class="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-30"
              :style="selectionBoxStyle"
            ></div>
          </div>
        </div>

        <!-- 小地图 -->
        <div
          class="absolute bottom-4 right-4 w-40 h-28 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-40 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
          @mousedown="onMiniMapMouseDown"
          @mousemove="onMiniMapMouseMove"
          @mouseup="onMiniMapMouseUp"
          @mouseleave="onMiniMapMouseUp"
          title="点击或拖动导航"
          ref="miniMapRef"
        >
          <div class="relative w-full h-full bg-slate-50">
            <!-- 显示节点在小地图上的位置 -->
            <div
              v-for="node in nodes"
              :key="'mini-' + node.id"
              class="absolute bg-blue-400"
              :style="getMiniMapNodeStyle(node)"
            ></div>
            <!-- 视口指示器 -->
            <div
              class="absolute border-2 border-red-500 bg-red-500/10"
              :style="miniMapViewportStyle"
            ></div>
          </div>
        </div>

        <!-- 画布位置指示器 -->
        <div class="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-mono z-40">
          X: {{ Math.round(-panOffset.x) }} Y: {{ Math.round(-panOffset.y) }}
        </div>
      </main>

      <!-- 右侧属性面板 -->
      <aside class="w-56 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
        <div class="p-3 border-b border-slate-100">
          <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">属性</h3>
        </div>
        <div class="flex-1 overflow-y-auto p-3">
          <template v-if="selectedNodes.length === 1">
            <div class="space-y-4">
              <!-- 位置 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">位置</label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-slate-400">X</span>
                    <input type="number" v-model.number="selectedNodeProps.x" @change="updateSelectedNode" class="propInput" />
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-slate-400">Y</span>
                    <input type="number" v-model.number="selectedNodeProps.y" @change="updateSelectedNode" class="propInput" />
                  </div>
                </div>
              </div>

              <!-- 尺寸 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">尺寸</label>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-slate-400">W</span>
                    <input type="number" v-model.number="selectedNodeProps.width" @change="updateSelectedNode" class="propInput" />
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-slate-400">H</span>
                    <input type="number" v-model.number="selectedNodeProps.height" @change="updateSelectedNode" class="propInput" />
                  </div>
                </div>
              </div>

              <!-- 填充颜色 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">填充颜色</label>
                <div class="flex items-center gap-2">
                  <input type="color" v-model="selectedNodeProps.fill" @change="updateSelectedNode" class="w-8 h-8 rounded cursor-pointer" />
                  <input type="text" v-model="selectedNodeProps.fill" @change="updateSelectedNode" class="propInput flex-1" />
                </div>
              </div>

              <!-- 边框颜色 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">边框颜色</label>
                <div class="flex items-center gap-2">
                  <input type="color" v-model="selectedNodeProps.stroke" @change="updateSelectedNode" class="w-8 h-8 rounded cursor-pointer" />
                  <input type="text" v-model="selectedNodeProps.stroke" @change="updateSelectedNode" class="propInput flex-1" />
                </div>
              </div>

              <!-- 边框宽度 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">边框宽度</label>
                <input type="range" v-model.number="selectedNodeProps.strokeWidth" min="0" max="10" @change="updateSelectedNode" class="w-full" />
              </div>

              <!-- 文字颜色 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">文字颜色</label>
                <div class="flex items-center gap-2">
                  <input type="color" v-model="selectedNodeProps.textColor" @change="updateSelectedNode" class="w-8 h-8 rounded cursor-pointer" />
                  <input type="text" v-model="selectedNodeProps.textColor" @change="updateSelectedNode" class="propInput flex-1" />
                </div>
              </div>

              <!-- 文字大小 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">文字大小 ({{ selectedNodeProps.fontSize }}px)</label>
                <input type="range" v-model.number="selectedNodeProps.fontSize" min="10" max="32" @change="updateSelectedNode" class="w-full" />
              </div>

              <!-- 圆角 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">圆角</label>
                <input type="range" v-model.number="selectedNodeProps.borderRadius" min="0" max="50" @change="updateSelectedNode" class="w-full" />
              </div>
            </div>
          </template>

          <template v-else-if="selectedConnection">
            <div class="space-y-4">
              <!-- 连接线标签 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">标签文字</label>
                <input
                  type="text"
                  v-model="selectedConnectionProps.label"
                  @change="updateSelectedConnection"
                  class="propInput w-full"
                  placeholder="如：是、否、条件等"
                />
                <p class="text-xs text-slate-400 mt-1">用于判断分支的条件说明</p>
              </div>

              <!-- 标签字体设置 -->
              <div v-if="selectedConnectionProps.label" class="space-y-3 p-3 bg-slate-50 rounded-lg">
                <p class="text-xs font-medium text-slate-600">标签样式</p>

                <!-- 标签字体大小 -->
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">字体大小 ({{ selectedConnectionProps.labelFontSize }}px)</label>
                  <input
                    type="range"
                    v-model.number="selectedConnectionProps.labelFontSize"
                    min="10"
                    max="24"
                    @change="updateSelectedConnection"
                    class="w-full"
                  />
                </div>

                <!-- 标签字体粗细 -->
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">字体粗细</label>
                  <select
                    v-model="selectedConnectionProps.labelFontWeight"
                    @change="updateSelectedConnection"
                    class="propInput w-full"
                  >
                    <option value="normal">正常</option>
                    <option value="500">中等</option>
                    <option value="600">半粗</option>
                    <option value="bold">粗体</option>
                  </select>
                </div>

                <!-- 标签颜色 -->
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">文字颜色</label>
                  <div class="flex items-center gap-2">
                    <input
                      type="color"
                      v-model="selectedConnectionProps.labelColor"
                      @change="updateSelectedConnection"
                      class="w-8 h-8 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      v-model="selectedConnectionProps.labelColor"
                      @change="updateSelectedConnection"
                      class="propInput flex-1"
                    />
                  </div>
                </div>
              </div>

              <!-- 线条颜色 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">线条颜色</label>
                <div class="flex items-center gap-2">
                  <input type="color" v-model="selectedConnectionProps.color" @change="updateSelectedConnection" class="w-8 h-8 rounded cursor-pointer" />
                  <input type="text" v-model="selectedConnectionProps.color" @change="updateSelectedConnection" class="propInput flex-1" />
                </div>
              </div>

              <!-- 虚线 -->
              <div>
                <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" v-model="selectedConnectionProps.dashed" @change="updateSelectedConnection" class="rounded" />
                  虚线
                </label>
              </div>

              <!-- 箭头类型 -->
              <div>
                <label class="text-xs text-slate-500 mb-1 block">箭头</label>
                <select v-model="selectedConnectionProps.arrow" @change="updateSelectedConnection" class="propInput w-full">
                  <option value="none">无</option>
                  <option value="end">终点箭头</option>
                  <option value="start">起点箭头</option>
                  <option value="both">双向箭头</option>
                </select>
              </div>
            </div>
          </template>

          <template v-else>
            <p class="text-sm text-slate-400 text-center py-8">选择一个元素查看属性</p>
          </template>
        </div>

        <!-- 操作按钮 -->
        <div v-if="selectedNodes.length > 0 || selectedConnection" class="p-3 border-t border-slate-100">
          <button @click="deleteSelected" class="w-full py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            删除选中
          </button>
        </div>

        <!-- 对齐工具 -->
        <div v-if="selectedNodes.length > 1" class="p-3 border-t border-slate-100">
          <label class="text-xs text-slate-500 mb-2 block">对齐</label>
          <div class="grid grid-cols-3 gap-1">
            <button @click="alignNodes('left')" :class="alignBtnClass" title="左对齐">
              <AlignLeft class="w-4 h-4" />
            </button>
            <button @click="alignNodes('centerH')" :class="alignBtnClass" title="水平居中">
              <AlignCenterHorizontal class="w-4 h-4" />
            </button>
            <button @click="alignNodes('right')" :class="alignBtnClass" title="右对齐">
              <AlignRight class="w-4 h-4" />
            </button>
            <button @click="alignNodes('top')" :class="alignBtnClass" title="顶部对齐">
              <AlignStartVertical class="w-4 h-4" />
            </button>
            <button @click="alignNodes('centerV')" :class="alignBtnClass" title="垂直居中">
              <AlignCenterVertical class="w-4 h-4" />
            </button>
            <button @click="alignNodes('bottom')" :class="alignBtnClass" title="底部对齐">
              <AlignEndVertical class="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- AI 问答改图面板 -->
    <div
      v-if="aiPanelOpen"
      class="fixed right-2 sm:right-4 top-14 sm:top-16 bottom-4 w-[90vw] sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
    >
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Sparkles class="w-4 h-4 text-white" />
          </div>
          <div>
            <p class="text-sm font-semibold text-slate-800">AI 问答改图</p>
            <p class="text-xs text-slate-500">结构化变更 · 确认后应用</p>
          </div>
        </div>
        <button @click="toggleAiPanel" class="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="px-4 py-3 border-b border-slate-100 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs text-slate-600">
            <span :class="['w-2 h-2 rounded-full', aiStatusDotClass]"></span>
            <span>{{ aiStatusText }}</span>
          </div>
          <button
            v-if="aiChangeSet"
            @click="clearAiPreview"
            class="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            清空预览
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="aiUseFlowContext" class="rounded" />
            基于当前流程
          </label>
          <label class="flex items-center gap-2" :class="selectedNodes.length === 0 ? 'opacity-50' : ''">
            <input type="checkbox" v-model="aiUseSelectionOnly" :disabled="selectedNodes.length === 0" class="rounded" />
            仅对选中节点
          </label>
          <label class="flex items-center gap-2" :class="aiUseSelectionOnly ? 'opacity-50' : ''">
            <input type="checkbox" v-model="aiReplaceAll" :disabled="aiUseSelectionOnly" class="rounded" />
            推倒重来
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in aiPromptPresets"
            :key="preset.label"
            @click="applyAiPreset(preset)"
            class="px-2.5 py-1 rounded-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            {{ preset.label }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="aiMessages.length === 0" class="text-sm text-slate-400 text-center py-6">
          请输入需求，AI 将生成结构化改图建议
        </div>
        <div class="flex flex-col gap-3">
          <div
            v-for="msg in aiMessages"
            :key="msg.id"
            :class="[
              'max-w-[85%] rounded-xl border px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap',
              msg.role === 'user'
                ? 'ml-auto bg-blue-50 border-blue-100 text-blue-700'
                : msg.state === 'error'
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
            ]"
          >
            <p class="text-[10px] uppercase tracking-wide text-slate-400 mb-1">
              {{ msg.role === 'user' ? '我' : 'AI' }}
            </p>
            <p>{{ msg.content }}</p>
          </div>
        </div>

        <div v-if="aiChangeSet" class="space-y-3">
          <div class="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <p class="text-xs text-slate-500 mb-1">变更摘要</p>
            <p class="text-sm text-slate-700">{{ aiChangeSet.summary || 'AI 未返回摘要' }}</p>
          </div>
          <div v-if="aiShouldReplaceAll" class="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs">
            将清空当前流程并重建，请确认后再应用。
          </div>

          <div v-if="aiValidationErrors.length > 0" class="p-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs space-y-1">
            <p class="font-semibold">校验失败</p>
            <p v-for="err in aiValidationErrors" :key="err">{{ err }}</p>
          </div>

          <div v-if="aiWarnings.length > 0" class="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-600 text-xs space-y-1">
            <p class="font-semibold">风险提示</p>
            <p v-for="warn in aiWarnings" :key="warn">{{ warn }}</p>
          </div>

          <div v-if="aiAssumptions.length > 0" class="p-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 space-y-1">
            <p class="font-semibold text-slate-500">假设</p>
            <p v-for="a in aiAssumptions" :key="a">{{ a }}</p>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-slate-500">
              <span>变更清单</span>
              <span>{{ aiSelectedChangeKeys.length }}/{{ aiChangeItems.length }}</span>
            </div>
            <div v-if="aiChangeItems.length === 0" class="text-xs text-slate-400">无可应用的变更</div>
            <label
              v-for="item in aiChangeItems"
              :key="item.key"
              class="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700"
            >
              <input type="checkbox" :value="item.key" v-model="aiSelectedChangeKeys" class="mt-0.5 rounded" />
              <span :class="['px-2 py-0.5 rounded-full text-[10px] font-semibold', getAiActionBadgeClass(item.action)]">
                {{ aiActionLabel(item.action) }}
              </span>
              <span class="flex-1 leading-relaxed">{{ item.label }}</span>
            </label>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="selectAllAiChanges"
              class="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              全选
            </button>
            <button
              @click="clearAiSelection"
              class="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              清空
            </button>
            <button
              @click="confirmApplyAiChanges"
              :disabled="aiSelectedChangeKeys.length === 0 || aiValidationErrors.length > 0"
              class="ml-auto px-3 py-1.5 text-xs text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              应用所选
            </button>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-slate-100 bg-white space-y-2">
        <textarea
          v-model="aiPrompt"
          @keydown.enter.ctrl.prevent="submitAiRequest"
          @keydown.enter.meta.prevent="submitAiRequest"
          class="w-full h-24 p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="描述你想如何修改流程图，例如：新增一个审批节点并在通过后通知人事..."
        ></textarea>
        <div class="flex items-center justify-between">
          <button
            @click="submitAiRequest"
            :disabled="!aiPrompt.trim() || aiStatus === 'loading'"
            class="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Send class="w-3.5 h-3.5" />
            发送
          </button>
          <button
            v-if="aiStatus === 'error'"
            @click="retryAiRequest"
            class="text-xs text-red-600 hover:text-red-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.show"
      class="fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 min-w-40"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click="contextMenu.show = false"
    >
      <button v-if="selectedNodes.length > 0" @click="copyNodes" class="contextMenuItem">
        <Copy class="w-4 h-4" /> 复制
      </button>
      <button v-if="clipboard.length > 0" @click="pasteNodes" class="contextMenuItem">
        <Clipboard class="w-4 h-4" /> 粘贴
      </button>
      <button v-if="selectedNodes.length > 0" @click="duplicateNodes" class="contextMenuItem">
        <CopyPlus class="w-4 h-4" /> 复制一份
      </button>
      <div v-if="selectedNodes.length > 0" class="h-px bg-slate-200 my-1"></div>
      <button v-if="selectedNodes.length > 0" @click="bringToFront" class="contextMenuItem">
        <ArrowUpToLine class="w-4 h-4" /> 移到最前
      </button>
      <button v-if="selectedNodes.length > 0" @click="sendToBack" class="contextMenuItem">
        <ArrowDownToLine class="w-4 h-4" /> 移到最后
      </button>
      <div v-if="selectedNodes.length > 0 || selectedConnection" class="h-px bg-slate-200 my-1"></div>
      <button v-if="selectedNodes.length > 0 || selectedConnection" @click="deleteSelected" class="contextMenuItem text-red-600">
        <Trash2 class="w-4 h-4" /> 删除
      </button>
    </div>

    <!-- 隐藏的文件输入 -->
    <input type="file" ref="fileInput" @change="handleFileImport" accept=".json" class="hidden" />
    <input type="file" ref="mermaidFileInput" @change="handleMermaidImport" accept=".mmd,.mermaid,.txt" class="hidden" />

    <!-- 新建流程图弹窗 -->
    <div
      v-if="showNewFileDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      @click.self="cancelNewFile"
    >
      <div class="bg-white rounded-xl shadow-2xl w-96 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100">
          <h3 class="text-lg font-semibold text-slate-800">新建流程图</h3>
          <p class="text-sm text-slate-500 mt-1">请为您的流程图命名</p>
        </div>
        <div class="px-6 py-4">
          <input
            ref="newFileNameInput"
            v-model="newFileName"
            @keydown.enter="confirmNewFile"
            @keydown.escape="cancelNewFile"
            class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="输入流程图名称..."
            autofocus
          />
        </div>
        <div class="px-6 py-4 bg-slate-50 flex justify-end gap-3">
          <button
            @click="cancelNewFile"
            class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            @click="confirmNewFile"
            class="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            创建
          </button>
        </div>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <Transition name="fade">
      <div
        v-if="showConfirmDialog"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]"
        @click.self="handleCancel"
      >
        <Transition name="scale">
          <div v-if="showConfirmDialog" class="bg-white rounded-2xl shadow-2xl w-96 overflow-hidden transform">
            <!-- 图标区域 -->
            <div class="pt-8 pb-4 flex justify-center">
              <div :class="[
                'w-16 h-16 rounded-full flex items-center justify-center',
                confirmDialogConfig.type === 'danger' ? 'bg-red-100' : 'bg-amber-100'
              ]">
                <svg v-if="confirmDialogConfig.type === 'danger'" class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <svg v-else class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <!-- 内容区域 -->
            <div class="px-6 pb-6 text-center">
              <h3 class="text-xl font-semibold text-slate-800 mb-2">{{ confirmDialogConfig.title }}</h3>
              <p class="text-slate-500 text-sm leading-relaxed">{{ confirmDialogConfig.message }}</p>
            </div>
            <!-- 按钮区域 -->
            <div class="px-6 pb-6 flex gap-3">
              <button
                @click="handleCancel"
                class="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 hover:scale-[1.02]"
              >
                {{ confirmDialogConfig.cancelText }}
              </button>
              <button
                @click="handleConfirm"
                :class="[
                  'flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
                  confirmDialogConfig.type === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 hover:shadow-red-200'
                    : 'bg-amber-500 hover:bg-amber-600 hover:shadow-amber-200'
                ]"
              >
                {{ confirmDialogConfig.confirmText }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Home, GitBranch, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  Grid3x3, Magnet, ImageIcon, FileJson, Upload, Trash2, Code,
  Square, Circle, Triangle, Diamond, Hexagon, Star, MessageSquare,
  Copy, Clipboard, CopyPlus, ArrowUpToLine, ArrowDownToLine,
  AlignLeft, AlignRight, AlignCenterHorizontal,
  AlignStartVertical, AlignEndVertical, AlignCenterVertical,
  Hand, FolderOpen, Plus, Download,
  Sparkles, X, Send
} from 'lucide-vue-next'

// ==================== 类型定义 ====================
interface Node {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  text: string
  fill: string
  stroke: string
  strokeWidth: number
  textColor: string
  borderRadius: number
  zIndex: number
  fontSize: number
}

interface Connection {
  id: string
  fromNode: string
  fromAnchor: string  // 保留用于兼容，但可以是 'top', 'right', 'bottom', 'left' 或 'custom'
  toNode: string
  toAnchor: string
  color: string
  dashed: boolean
  arrow: 'none' | 'start' | 'end' | 'both'
  lineType: string
  // 折线控制点偏移（相对于自动计算的中点）
  bendOffset?: { x: number; y: number }
  // 连接线标签（用于判断分支等）
  label?: string
  // 标签位置偏移（相对于连接线中点）
  labelOffset?: { x: number; y: number }
  // 标签字体样式
  labelFontSize?: number
  labelFontWeight?: string
  labelColor?: string
  // 自定义锚点位置（相对于节点左上角的偏移，0-1 之间的比例）
  fromAnchorOffset?: { x: number; y: number }
  toAnchorOffset?: { x: number; y: number }
}

interface Anchor {
  position: string
  x: number
  y: number
}

interface AiNode {
  id?: string
  type?: string
  name?: string
  text?: string
  props?: Record<string, any>
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  textColor?: string
  borderRadius?: number
  fontSize?: number
}

interface AiEdge {
  id?: string
  from?: string
  to?: string
  source?: string
  target?: string
  fromNode?: string
  toNode?: string
  condition?: string
  label?: string
  lineType?: string
  dashed?: boolean
  arrow?: 'none' | 'start' | 'end' | 'both'
  color?: string
  fromAnchor?: string
  toAnchor?: string
  fromAnchorOffset?: { x: number; y: number }
  toAnchorOffset?: { x: number; y: number }
  props?: Record<string, any>
}

interface ChangeSet {
  adds: { nodes: AiNode[]; edges: AiEdge[] }
  updates: { nodes: AiNode[]; edges: AiEdge[] }
  deletes: { nodes: Array<AiNode | string>; edges: Array<AiEdge | string> }
  summary: string
  replaceAll?: boolean
  warnings?: string[]
  assumptions?: string[]
  layoutHints?: Record<string, any>
}

interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  state?: 'error' | 'ok'
}

interface AiChangeItem {
  key: string
  action: 'add' | 'update' | 'delete'
  entity: 'node' | 'edge'
  label: string
  data: AiNode | AiEdge | string
}

// ==================== 历史文件管理 ====================
interface HistoryFile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  nodes: Node[]
  connections: Connection[]
  // 视图状态
  viewState?: {
    panOffsetX: number
    panOffsetY: number
    zoom: number
  }
}

const HISTORY_STORAGE_KEY = 'flowcanvas_history_files'
const CURRENT_FILE_KEY = 'flowcanvas_current_file_id'

// ==================== 同步初始化数据（避免闪动）====================
// 在组件初始化时同步读取 localStorage，确保首次渲染就使用正确的值
const getInitialData = () => {
  try {
    const savedFiles = localStorage.getItem(HISTORY_STORAGE_KEY)
    const savedCurrentFileId = localStorage.getItem(CURRENT_FILE_KEY)
    const files: HistoryFile[] = savedFiles ? JSON.parse(savedFiles) : []
    
    let currentFile: HistoryFile | undefined
    if (savedCurrentFileId) {
      currentFile = files.find(f => f.id === savedCurrentFileId)
    }
    if (!currentFile && files.length > 0) {
      currentFile = files[0]
    }
    
    return {
      files,
      currentFile,
      currentFileId: currentFile?.id || '',
      canvasName: currentFile?.name || '未命名流程图',
      nodes: currentFile?.nodes?.map(n => ({ ...n, fontSize: n.fontSize || 14 })) || [],
      connections: currentFile?.connections || [],
      viewState: currentFile?.viewState || null
    }
  } catch (e) {
    console.error('初始化数据加载失败:', e)
    return {
      files: [],
      currentFile: undefined,
      currentFileId: '',
      canvasName: '未命名流程图',
      nodes: [],
      connections: [],
      viewState: null
    }
  }
}

const initialData = getInitialData()

const showHistorySidebar = ref(false)
const showNewFileDialog = ref(!initialData.currentFile && initialData.files.length === 0)
const newFileName = ref('')
const newFileNameInput = ref<HTMLInputElement | null>(null)

// 导入菜单状态
const showImportMenu = ref(false)

// 导出菜单状态
const showExportMenu = ref(false)

// 确认弹窗状态
const showConfirmDialog = ref(false)
const confirmDialogConfig = ref({
  title: '确认操作',
  message: '确定要执行此操作吗？',
  confirmText: '确认',
  cancelText: '取消',
  type: 'warning' as 'warning' | 'danger',
  onConfirm: () => {},
  onCancel: () => {}
})

const openConfirmDialog = (config: {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger'
  onConfirm: () => void
  onCancel?: () => void
}) => {
  confirmDialogConfig.value = {
    title: config.title || '确认操作',
    message: config.message,
    confirmText: config.confirmText || '确认',
    cancelText: config.cancelText || '取消',
    type: config.type || 'warning',
    onConfirm: config.onConfirm,
    onCancel: config.onCancel || (() => {})
  }
  showConfirmDialog.value = true
}

const handleConfirm = () => {
  confirmDialogConfig.value.onConfirm()
  showConfirmDialog.value = false
}

const handleCancel = () => {
  confirmDialogConfig.value.onCancel()
  showConfirmDialog.value = false
}
const historyFiles = ref<HistoryFile[]>(initialData.files)
const currentFileId = ref<string>(initialData.currentFileId)
const isInitialized = ref(!!initialData.currentFile)

// ==================== 画布基础配置 ====================
const canvasName = ref(initialData.canvasName)
// 动态画布 - 根据内容和视口自动计算大小
const baseCanvasSize = { width: 2000, height: 1500 } // 基础画布大小
const canvasPadding = 1000 // 画布边缘预留空间，用于扩展
const gridSize = 20
// 使用保存的视图状态初始化，避免闪动
const zoom = ref(initialData.viewState?.zoom || 1)
// 画布平移偏移量 - 使用保存的值初始化
const panOffset = reactive({
  x: initialData.viewState?.panOffsetX || 0,
  y: initialData.viewState?.panOffsetY || 0
})
const showGrid = ref(true)
const snapToGrid = ref(true)
// 拖动模式
const isPanMode = ref(false)

const canvasContainer = ref<HTMLElement | null>(null)
const canvasWrapper = ref<HTMLElement | null>(null)
const canvasContent = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const mermaidFileInput = ref<HTMLInputElement | null>(null)
const textEditor = ref<HTMLTextAreaElement[] | null>(null)
const miniMapRef = ref<HTMLElement | null>(null)

// ==================== 节点和连接数据 ====================
const nodes = ref<Node[]>(initialData.nodes)
const connections = ref<Connection[]>(initialData.connections)
const selectedNodes = ref<string[]>([])
const selectedConnection = ref<Connection | null>(null)

// ==================== 历史记录 ====================
const history = ref<string[]>([])
const historyIndex = ref(-1)
const maxHistory = 50

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

// 加载历史文件列表
const loadHistoryFilesList = () => {
  try {
    const saved = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (saved) {
      historyFiles.value = JSON.parse(saved)
    }
  } catch (e) {
    console.error('加载历史文件列表失败:', e)
    historyFiles.value = []
  }
}

// 保存历史文件列表
const saveHistoryFilesList = () => {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyFiles.value))
  } catch (e) {
    console.error('保存历史文件列表失败:', e)
  }
}

// 保存当前文件到历史
const saveCurrentFileToHistory = () => {
  if (!currentFileId.value || !isInitialized.value) return
  
  const fileIndex = historyFiles.value.findIndex(f => f.id === currentFileId.value)
  if (fileIndex >= 0) {
    historyFiles.value[fileIndex] = {
      ...historyFiles.value[fileIndex],
      name: canvasName.value,
      updatedAt: Date.now(),
      nodes: JSON.parse(JSON.stringify(nodes.value)),
      connections: JSON.parse(JSON.stringify(connections.value)),
      // 保存视图状态
      viewState: {
        panOffsetX: panOffset.x,
        panOffsetY: panOffset.y,
        zoom: zoom.value
      }
    }
    saveHistoryFilesList()
  }
}

// 更新当前文件名到历史
const updateCurrentFileInHistory = () => {
  if (!currentFileId.value) return
  const fileIndex = historyFiles.value.findIndex(f => f.id === currentFileId.value)
  if (fileIndex >= 0) {
    historyFiles.value[fileIndex].name = canvasName.value
    historyFiles.value[fileIndex].updatedAt = Date.now()
    saveHistoryFilesList()
  }
}

// 加载历史文件
const loadHistoryFile = (fileId: string) => {
  const file = historyFiles.value.find(f => f.id === fileId)
  if (!file) return
  
  // 保存当前文件
  saveCurrentFileToHistory()
  
  // 加载新文件
  currentFileId.value = fileId
  canvasName.value = file.name
  nodes.value = JSON.parse(JSON.stringify(file.nodes.map((n: Node) => ({
    ...n,
    fontSize: n.fontSize || 14
  }))))
  connections.value = JSON.parse(JSON.stringify(file.connections))
  
  // 恢复视图状态
  if (file.viewState) {
    panOffset.x = file.viewState.panOffsetX
    panOffset.y = file.viewState.panOffsetY
    zoom.value = file.viewState.zoom
  } else {
    // 没有保存的视图状态，居中显示
    nextTick(() => {
      centerContent()
    })
  }
  
  // 保存当前文件ID
  localStorage.setItem(CURRENT_FILE_KEY, fileId)
  
  // 重置历史记录
  history.value = []
  historyIndex.value = -1
  saveHistory()
  
  clearSelection()
}

// 删除历史文件
const deleteHistoryFile = (fileId: string) => {
  const file = historyFiles.value.find(f => f.id === fileId)
  const fileName = file?.name || '此流程图'

  openConfirmDialog({
    title: '删除流程图',
    message: `确定要删除「${fileName}」吗？此操作无法撤销。`,
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger',
    onConfirm: () => {
      historyFiles.value = historyFiles.value.filter(f => f.id !== fileId)
      saveHistoryFilesList()

      // 如果删除的是当前文件，创建新文件
      if (currentFileId.value === fileId) {
        if (historyFiles.value.length > 0) {
          loadHistoryFile(historyFiles.value[0].id)
        } else {
          showNewFileDialog.value = true
          newFileName.value = ''
          nextTick(() => {
            newFileNameInput.value?.focus()
          })
        }
      }
    }
  })
}

// 创建新文件
const createNewFile = () => {
  showNewFileDialog.value = true
  newFileName.value = ''
  nextTick(() => {
    newFileNameInput.value?.focus()
  })
}

// 确认创建新文件
const confirmNewFile = () => {
  const name = newFileName.value.trim() || '未命名流程图'
  
  // 保存当前文件
  if (currentFileId.value) {
    saveCurrentFileToHistory()
  }
  
  // 创建新文件
  const newFile: HistoryFile = {
    id: generateId(),
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [],
    connections: []
  }
  
  historyFiles.value.unshift(newFile)
  saveHistoryFilesList()
  
  // 切换到新文件
  currentFileId.value = newFile.id
  canvasName.value = name
  nodes.value = []
  connections.value = []
  
  localStorage.setItem(CURRENT_FILE_KEY, newFile.id)
  
  // 重置历史记录
  history.value = []
  historyIndex.value = -1
  saveHistory()
  
  showNewFileDialog.value = false
  clearSelection()
  
  // 重置视图
  panOffset.x = 0
  panOffset.y = 0
  zoom.value = 1
}

// 取消创建新文件
const cancelNewFile = () => {
  showNewFileDialog.value = false
  // 如果没有当前文件且没有历史文件，必须创建
  if (!currentFileId.value && historyFiles.value.length === 0) {
    confirmNewFile()
  }
}

// 格式化日期
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return `${date.getMonth() + 1}/${date.getDate()}`
}


const saveHistory = () => {
  const state = JSON.stringify({ nodes: nodes.value, connections: connections.value })
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }
  history.value.push(state)
  if (history.value.length > maxHistory) {
    history.value.shift()
  } else {
    historyIndex.value++
  }
  // 触发自动保存到历史文件
  scheduleAutoSave()
}

// 自动保存定时器
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null
const scheduleAutoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => {
    saveCurrentFileToHistory()
  }, 1000) // 1秒后自动保存
}

const undo = () => {
  if (canUndo.value) {
    historyIndex.value--
    const state = JSON.parse(history.value[historyIndex.value])
    nodes.value = state.nodes
    connections.value = state.connections
    clearSelection()
  }
}

const redo = () => {
  if (canRedo.value) {
    historyIndex.value++
    const state = JSON.parse(history.value[historyIndex.value])
    nodes.value = state.nodes
    connections.value = state.connections
    clearSelection()
  }
}

// ==================== 形状库定义 ====================
const basicShapes = [
  { type: 'rectangle', name: '矩形', icon: Square, defaultWidth: 120, defaultHeight: 60 },
  { type: 'roundedRect', name: '圆角矩形', icon: Square, defaultWidth: 120, defaultHeight: 60 },
  { type: 'circle', name: '圆形', icon: Circle, defaultWidth: 80, defaultHeight: 80 },
  { type: 'diamond', name: '菱形', icon: Diamond, defaultWidth: 100, defaultHeight: 100 },
  { type: 'triangle', name: '三角形', icon: Triangle, defaultWidth: 100, defaultHeight: 80 },
  { type: 'hexagon', name: '六边形', icon: Hexagon, defaultWidth: 100, defaultHeight: 80 },
]

const flowShapes = [
  { type: 'process', name: '处理', preview: 'M5,10 L35,10 L35,30 L5,30 Z', defaultWidth: 120, defaultHeight: 60 },
  { type: 'decision', name: '判断', preview: 'M20,5 L35,20 L20,35 L5,20 Z', defaultWidth: 100, defaultHeight: 80 },
  { type: 'terminator', name: '开始/结束', preview: 'M10,10 L30,10 A10,10 0 0,1 30,30 L10,30 A10,10 0 0,1 10,10', defaultWidth: 120, defaultHeight: 50 },
  { type: 'data', name: '数据', preview: 'M8,10 L35,10 L32,30 L5,30 Z', defaultWidth: 120, defaultHeight: 60 },
  { type: 'document', name: '文档', preview: 'M5,8 L35,8 L35,28 Q20,35 5,28 Z', defaultWidth: 120, defaultHeight: 70 },
  { type: 'database', name: '数据库', preview: 'M8,12 L32,12 M8,12 A12,4 0 0,0 32,12 L32,28 A12,4 0 0,1 8,28 Z', defaultWidth: 80, defaultHeight: 100 },
]

const lineTypes = [
  { type: 'straight', name: '直线', preview: 'M5,20 L35,20', arrowX: 35, arrowY: 20, arrowAngle: 0 },
  { type: 'orthogonal', name: '折线', preview: 'M5,15 L20,15 L20,25 L35,25', arrowX: 35, arrowY: 25, arrowAngle: 0 },
  { type: 'curved', name: '曲线', preview: 'M5,25 Q20,5 35,20', arrowX: 35, arrowY: 20, arrowAngle: 0.5 },
]

const currentLineType = ref('orthogonal')

const setLineType = (type: string) => {
  currentLineType.value = type
}

// ==================== AI 问答改图 ====================
const aiPanelOpen = ref(false)
const aiPrompt = ref('')
const aiUseFlowContext = ref(true)
const aiUseSelectionOnly = ref(false)
const aiReplaceAll = ref(false)
const aiStatus = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const aiMessages = ref<AiMessage[]>([])
const aiChangeSet = ref<ChangeSet | null>(null)
const aiChangeItems = ref<AiChangeItem[]>([])
const aiSelectedChangeKeys = ref<string[]>([])
const aiValidationErrors = ref<string[]>([])
const aiValidationWarnings = ref<string[]>([])
const aiRawResponse = ref('')
const aiLastRequest = ref<{ system: string; user: string } | null>(null)

const aiPromptPresets = [
  { label: '生成审批流程', prompt: '生成一个请假审批流程，包含提交、主管审批、HR备案和通知。' },
  { label: '新增审批节点', prompt: '在现有流程中新增一个复核节点，并在通过后通知负责人。' },
  { label: '优化异常处理', prompt: '把异常处理移动到流程末尾，并增加通知步骤。' }
]

const allowedNodeTypes = computed(() => {
  const types = [...basicShapes.map(s => s.type), ...flowShapes.map(s => s.type)]
  return Array.from(new Set(types))
})

const aiStatusText = computed(() => {
  switch (aiStatus.value) {
    case 'loading':
      return '处理中'
    case 'error':
      return '失败可重试'
    case 'ready':
      return '已生成'
    default:
      return '可用'
  }
})

const aiStatusDotClass = computed(() => {
  switch (aiStatus.value) {
    case 'loading':
      return 'bg-blue-500 animate-pulse'
    case 'error':
      return 'bg-red-500'
    case 'ready':
      return 'bg-emerald-500'
    default:
      return 'bg-slate-400'
  }
})

const aiWarnings = computed(() => [
  ...(aiChangeSet.value?.warnings || []),
  ...aiValidationWarnings.value
])

const aiAssumptions = computed(() => aiChangeSet.value?.assumptions || [])
const aiShouldReplaceAll = computed(() => aiReplaceAll.value)

// ==================== 交互状态 ====================
const isDragging = ref(false)
const isPanning = ref(false)
const isResizing = ref(false)
const isSelecting = ref(false)
const isDrawingConnection = ref(false)
const isDraggingMiniMap = ref(false)
const isSpacePressed = ref(false)

const dragStart = reactive({ x: 0, y: 0 })
const panDragStart = reactive({ x: 0, y: 0, panX: 0, panY: 0 })
const dragNodeOffsets = ref<Map<string, { x: number; y: number }>>(new Map())
const selectionStart = reactive({ x: 0, y: 0 })
const selectionEnd = reactive({ x: 0, y: 0 })

const resizeHandle = ref<{ position: string; node: Node } | null>(null)
const resizeStart = reactive({ x: 0, y: 0, width: 0, height: 0, nodeX: 0, nodeY: 0 })

const connectionStart = ref<{ node: Node; anchor: Anchor } | null>(null)
const connectionEnd = reactive({ x: 0, y: 0 })

// 拖动折线控制点
const isDraggingBend = ref(false)
const draggingConnection = ref<Connection | null>(null)
const bendDragStart = reactive({ x: 0, y: 0 })

// 拖动连接线标签
const isDraggingLabel = ref(false)
const draggingLabelConn = ref<Connection | null>(null)
const labelDragStart = reactive({ x: 0, y: 0 })

const editingNode = ref<Node | null>(null)
const editingText = ref('')

const contextMenu = reactive({ show: false, x: 0, y: 0 })
const clipboard = ref<Node[]>([])

// ==================== 样式类 ====================
const toolbarBtnClass = 'p-2 rounded-lg hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
const alignBtnClass = 'p-2 rounded hover:bg-slate-100 text-slate-500 transition-colors'

// ==================== 计算属性 ====================

// 动态计算画布大小 - 根据内容和视口自动扩展
const dynamicCanvasSize = computed(() => {
  // 获取视口大小
  const viewportWidth = canvasWrapper.value?.clientWidth || 1200
  const viewportHeight = canvasWrapper.value?.clientHeight || 800
  
  // 计算当前视口在画布坐标系中的范围
  const viewLeft = -panOffset.x
  const viewTop = -panOffset.y
  const viewRight = viewLeft + viewportWidth / zoom.value
  const viewBottom = viewTop + viewportHeight / zoom.value
  
  // 计算所有节点的边界
  let contentMinX = 0, contentMinY = 0, contentMaxX = 0, contentMaxY = 0
  
  if (nodes.value.length > 0) {
    contentMinX = Math.min(...nodes.value.map(n => n.x))
    contentMinY = Math.min(...nodes.value.map(n => n.y))
    contentMaxX = Math.max(...nodes.value.map(n => n.x + n.width))
    contentMaxY = Math.max(...nodes.value.map(n => n.y + n.height))
  }
  
  // 计算需要的画布范围（包含内容、视口和预留空间）
  const requiredMinX = Math.min(contentMinX, viewLeft) - canvasPadding
  const requiredMinY = Math.min(contentMinY, viewTop) - canvasPadding
  const requiredMaxX = Math.max(contentMaxX, viewRight) + canvasPadding
  const requiredMaxY = Math.max(contentMaxY, viewBottom) + canvasPadding
  
  // 确保最小尺寸
  const width = Math.max(baseCanvasSize.width, requiredMaxX - requiredMinX)
  const height = Math.max(baseCanvasSize.height, requiredMaxY - requiredMinY)
  
  return { width, height }
})

const gridBackground = computed(() => {
  return `linear-gradient(to right, #e2e8f0 1px, transparent 1px),
          linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`
})

const selectionBoxStyle = computed(() => {
  const x = Math.min(selectionStart.x, selectionEnd.x)
  const y = Math.min(selectionStart.y, selectionEnd.y)
  const w = Math.abs(selectionEnd.x - selectionStart.x)
  const h = Math.abs(selectionEnd.y - selectionStart.y)
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
  }
})

// 小地图显示范围（根据节点位置动态计算）
const miniMapBounds = computed(() => {
  if (nodes.value.length === 0) {
    return { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }
  }
  
  const padding = 500
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  nodes.value.forEach(node => {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  })
  
  // 确保视口也在范围内
  if (canvasWrapper.value) {
    const viewLeft = -panOffset.x
    const viewTop = -panOffset.y
    const viewRight = viewLeft + canvasWrapper.value.clientWidth / zoom.value
    const viewBottom = viewTop + canvasWrapper.value.clientHeight / zoom.value
    
    minX = Math.min(minX, viewLeft)
    minY = Math.min(minY, viewTop)
    maxX = Math.max(maxX, viewRight)
    maxY = Math.max(maxY, viewBottom)
  }
  
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding
  }
})

const miniMapViewportStyle = computed(() => {
  if (!canvasWrapper.value) return {}
  
  const bounds = miniMapBounds.value
  const boundsWidth = bounds.maxX - bounds.minX
  const boundsHeight = bounds.maxY - bounds.minY
  
  const viewLeft = -panOffset.x
  const viewTop = -panOffset.y
  const viewWidth = canvasWrapper.value.clientWidth / zoom.value
  const viewHeight = canvasWrapper.value.clientHeight / zoom.value
  
  return {
    left: `${((viewLeft - bounds.minX) / boundsWidth) * 100}%`,
    top: `${((viewTop - bounds.minY) / boundsHeight) * 100}%`,
    width: `${(viewWidth / boundsWidth) * 100}%`,
    height: `${(viewHeight / boundsHeight) * 100}%`,
  }
})

// 获取节点在小地图上的样式
const getMiniMapNodeStyle = (node: Node) => {
  const bounds = miniMapBounds.value
  const boundsWidth = bounds.maxX - bounds.minX
  const boundsHeight = bounds.maxY - bounds.minY
  
  return {
    left: `${((node.x - bounds.minX) / boundsWidth) * 100}%`,
    top: `${((node.y - bounds.minY) / boundsHeight) * 100}%`,
    width: `${(node.width / boundsWidth) * 100}%`,
    height: `${(node.height / boundsHeight) * 100}%`,
  }
}

// 小地图拖动导航
const onMiniMapMouseDown = (e: MouseEvent) => {
  isDraggingMiniMap.value = true
  navigateFromMiniMap(e)
}

const onMiniMapMouseMove = (e: MouseEvent) => {
  if (isDraggingMiniMap.value) {
    navigateFromMiniMap(e)
  }
}

const onMiniMapMouseUp = () => {
  isDraggingMiniMap.value = false
}

const navigateFromMiniMap = (e: MouseEvent) => {
  if (!miniMapRef.value || !canvasWrapper.value) return
  
  const rect = miniMapRef.value.getBoundingClientRect()
  const bounds = miniMapBounds.value
  const boundsWidth = bounds.maxX - bounds.minX
  const boundsHeight = bounds.maxY - bounds.minY
  
  // 计算点击位置对应的画布坐标
  const clickX = (e.clientX - rect.left) / rect.width
  const clickY = (e.clientY - rect.top) / rect.height
  
  const canvasX = bounds.minX + clickX * boundsWidth
  const canvasY = bounds.minY + clickY * boundsHeight
  
  // 将该位置移动到视口中心
  const viewWidth = canvasWrapper.value.clientWidth / zoom.value
  const viewHeight = canvasWrapper.value.clientHeight / zoom.value
  
  panOffset.x = -(canvasX - viewWidth / 2)
  panOffset.y = -(canvasY - viewHeight / 2)
}

// 切换拖动模式
const togglePanMode = () => {
  isPanMode.value = !isPanMode.value
}

// 插入文字节点
const insertTextNode = () => {
  // 在画布中心位置创建文字节点
  const viewportCenterX = (canvasWrapper.value?.clientWidth || 800) / 2 / zoom.value
  const viewportCenterY = (canvasWrapper.value?.clientHeight || 600) / 2 / zoom.value

  const newNode: Node = {
    id: generateId(),
    type: 'rectangle',
    x: snapValue(viewportCenterX - panOffset.x - 60),
    y: snapValue(viewportCenterY - panOffset.y - 20),
    width: 120,
    height: 40,
    text: '双击编辑文字',
    fill: 'transparent',
    stroke: 'transparent',
    strokeWidth: 0,
    textColor: '#000000',
    borderRadius: 0,
    zIndex: nodes.value.length,
    fontSize: 14
  }

  nodes.value.push(newNode)
  saveHistory()
  selectedNodes.value = [newNode.id]

  // 自动进入编辑模式
  nextTick(() => {
    startEditingText(newNode)
  })
}


const selectedNodeProps = reactive({
  x: 0, y: 0, width: 0, height: 0,
  fill: '#ffffff', stroke: '#000000', strokeWidth: 2,
  textColor: '#000000', borderRadius: 4, fontSize: 14
})

const selectedConnectionProps = reactive({
  color: '#000000',
  dashed: false,
  arrow: 'end' as 'none' | 'start' | 'end' | 'both',
  label: '',
  labelFontSize: 14,
  labelFontWeight: 'normal',
  labelColor: '#000000'
})

const tempConnectionPath = computed(() => {
  if (!connectionStart.value) return ''
  const start = connectionStart.value
  const startNode = nodes.value.find(n => n.id === start.node.id)
  if (!startNode) return ''

  const startPos = getAnchorPosition(startNode, start.anchor.position)
  return `M${startPos.x},${startPos.y} L${connectionEnd.x},${connectionEnd.y}`
})

// ==================== 监听选中节点变化 ====================
watch(selectedNodes, (ids) => {
  if (ids.length === 1) {
    const node = nodes.value.find(n => n.id === ids[0])
    if (node) {
      Object.assign(selectedNodeProps, {
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height,
        fill: node.fill,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        textColor: node.textColor,
        borderRadius: node.borderRadius,
        fontSize: node.fontSize || 14
      })
    }
  }
  if (ids.length === 0 && aiUseSelectionOnly.value) {
    aiUseSelectionOnly.value = false
  }
})

watch(aiReplaceAll, (value) => {
  if (value && aiUseSelectionOnly.value) {
    aiUseSelectionOnly.value = false
  }
  if (aiChangeSet.value) {
    aiChangeSet.value.replaceAll = value
    const { errors, warnings } = validateChangeSet(aiChangeSet.value)
    aiValidationErrors.value = errors
    aiValidationWarnings.value = warnings
    aiStatus.value = errors.length > 0 ? 'error' : 'ready'
  }
})

watch(selectedConnection, (conn) => {
  if (conn) {
    Object.assign(selectedConnectionProps, {
      color: conn.color,
      dashed: conn.dashed,
      arrow: conn.arrow,
      label: conn.label || '',
      labelFontSize: conn.labelFontSize || 14,
      labelFontWeight: conn.labelFontWeight || 'normal',
      labelColor: conn.labelColor || '#000000'
    })
  }
})

// ==================== 工具函数 ====================
const generateId = () => Math.random().toString(36).substr(2, 9)

const snapValue = (value: number) => {
  if (!snapToGrid.value) return value
  return Math.round(value / gridSize) * gridSize
}

const getMousePosition = (e: MouseEvent) => {
  if (!canvasContent.value) return { x: 0, y: 0 }
  const rect = canvasContent.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left) / zoom.value,
    y: (e.clientY - rect.top) / zoom.value
  }
}

const clearSelection = () => {
  selectedNodes.value = []
  selectedConnection.value = null
}

// ==================== AI 问答改图辅助 ====================
type FlowAiApi = { url: string; key: string; model: string; headers?: Record<string, string> }

const getEnv = (key: string, fallback = '') => (import.meta as any).env?.[key] || fallback
const flowAiApiBase = getEnv('VITE_PROXY_BASE_URL', getEnv('VITE_API_BASE_URL', '')).replace(/\/$/, '')
const flowAiApi: FlowAiApi = {
  url: `${flowAiApiBase}/api/qwenCoderPlus/chat/completions`,
  key: getEnv('VITE_FLOW_AI_TOKEN', getEnv('VITE_QWEN_TOKEN', getEnv('VITE_QWEN_MAX_TOKEN', ''))),
  model: getEnv('VITE_FLOW_AI_MODEL', 'qwen3-coder-plus')
}
const flowAiTemperature = 0.2

const toggleAiPanel = () => {
  aiPanelOpen.value = !aiPanelOpen.value
}

const applyAiPreset = (preset: { label: string; prompt: string }) => {
  aiPrompt.value = preset.prompt
}

const clearAiPreview = (options?: { keepStatus?: boolean }) => {
  aiChangeSet.value = null
  aiChangeItems.value = []
  aiSelectedChangeKeys.value = []
  aiValidationErrors.value = []
  aiValidationWarnings.value = []
  aiRawResponse.value = ''
  if (!options?.keepStatus) {
    aiStatus.value = 'idle'
  }
}

const aiActionLabel = (action: AiChangeItem['action']) => {
  if (action === 'add') return '新增'
  if (action === 'update') return '更新'
  return '删除'
}

const getAiActionBadgeClass = (action: AiChangeItem['action']) => {
  if (action === 'add') return 'bg-emerald-100 text-emerald-700'
  if (action === 'update') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-600'
}

const selectAllAiChanges = () => {
  aiSelectedChangeKeys.value = aiChangeItems.value.map(item => item.key)
}

const clearAiSelection = () => {
  aiSelectedChangeKeys.value = []
}

const getFlowSummary = () => {
  const maxItems = 80
  const summaryNodes = nodes.value.slice(0, maxItems).map(n => ({
    id: n.id,
    type: n.type,
    text: n.text
  }))
  const summaryEdges = connections.value.slice(0, maxItems).map(c => ({
    id: c.id,
    from: c.fromNode,
    to: c.toNode,
    label: c.label
  }))

  return {
    nodeCount: nodes.value.length,
    edgeCount: connections.value.length,
    nodes: summaryNodes,
    edges: summaryEdges,
    truncated: nodes.value.length > maxItems || connections.value.length > maxItems
  }
}

const getSelectionScope = () => {
  const selectedSet = new Set(selectedNodes.value)
  const scopedEdges = connections.value.filter(c => selectedSet.has(c.fromNode) && selectedSet.has(c.toNode))
  return {
    nodes: selectedNodes.value,
    edges: scopedEdges.map(c => c.id)
  }
}

const buildAiSystemPrompt = () => {
  return [
    '你是流程图编辑助手，只能输出 JSON，不要输出任何解释文字。',
    '严格遵循 changeSet 结构，必须包含 adds/updates/deletes/summary 字段。',
    '禁止生成非法节点类型或无效连线。',
    '如果需要推倒重来，请在 changeSet 顶层增加 replaceAll: true，并在 adds 中给出完整节点与连线。'
  ].join('\n')
}

const buildAiUserMessage = (prompt: string) => {
  const flowSummary = aiUseFlowContext.value ? JSON.stringify(getFlowSummary()) : '无'
  const selectionScope = aiUseSelectionOnly.value ? JSON.stringify(getSelectionScope()) : '全部'
  const allowedTypes = allowedNodeTypes.value.join(', ')
  return [
    `需求: ${prompt}`,
    `当前流程摘要: ${flowSummary}`,
    `选中范围: ${selectionScope}`,
    `允许节点类型: ${allowedTypes}`,
    `重建全部: ${aiReplaceAll.value ? '是' : '否'}`
  ].join('\n')
}

const extractJsonFromContent = (content: string) => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]+?)\s*```/i)
  if (fenced?.[1]) return fenced[1].trim()
  const first = content.indexOf('{')
  const last = content.lastIndexOf('}')
  if (first >= 0 && last > first) return content.slice(first, last + 1).trim()
  return ''
}

const normalizeChangeSet = (raw: any): ChangeSet => {
  const safeArray = (value: any) => Array.isArray(value) ? value : []
  const safeObj = (value: any) => value && typeof value === 'object' ? value : {}

  const adds = safeObj(raw?.adds)
  const updates = safeObj(raw?.updates)
  const deletes = safeObj(raw?.deletes)

  return {
    adds: { nodes: safeArray(adds.nodes), edges: safeArray(adds.edges) },
    updates: { nodes: safeArray(updates.nodes), edges: safeArray(updates.edges) },
    deletes: { nodes: safeArray(deletes.nodes), edges: safeArray(deletes.edges) },
    summary: typeof raw?.summary === 'string' ? raw.summary : '',
    replaceAll: Boolean(raw?.replaceAll),
    warnings: safeArray(raw?.warnings).map((w: any) => String(w)),
    assumptions: safeArray(raw?.assumptions).map((a: any) => String(a)),
    layoutHints: raw?.layoutHints || undefined
  }
}

const parseChangeSetFromContent = (content: string): ChangeSet | null => {
  const jsonText = extractJsonFromContent(content)
  if (!jsonText) return null
  try {
    const raw = JSON.parse(jsonText)
    return normalizeChangeSet(raw)
  } catch {
    return null
  }
}

const getAiNodeId = (node: AiNode | string) => typeof node === 'string' ? node : (node.id || '')
const getAiNodeLabel = (node: AiNode | string) => {
  if (typeof node === 'string') return node
  return node.name || node.text || node.id || node.type || '未命名节点'
}

const getAiEdgeId = (edge: AiEdge | string) => typeof edge === 'string' ? edge : (edge.id || '')
const getAiEdgeFrom = (edge: AiEdge | string) => {
  if (typeof edge === 'string') return ''
  return edge.from || edge.source || edge.fromNode || edge.props?.from || edge.props?.source || edge.props?.fromNode || ''
}
const getAiEdgeTo = (edge: AiEdge | string) => {
  if (typeof edge === 'string') return ''
  return edge.to || edge.target || edge.toNode || edge.props?.to || edge.props?.target || edge.props?.toNode || ''
}

const getAiEdgeLabel = (edge: AiEdge | string) => {
  if (typeof edge === 'string') return edge
  const from = getAiEdgeFrom(edge)
  const to = getAiEdgeTo(edge)
  const label = edge.condition || edge.label || edge.props?.condition || edge.props?.label || ''
  return `${from || '未知'} → ${to || '未知'}${label ? ` (${label})` : ''}`
}

const buildChangeItems = (changeSet: ChangeSet) => {
  const items: AiChangeItem[] = []

  changeSet.adds.nodes.forEach((node, index) => {
    const id = getAiNodeId(node) || `add-node-${index}`
    items.push({
      key: `add-node-${id}-${index}`,
      action: 'add',
      entity: 'node',
      label: `新增节点：${getAiNodeLabel(node)}`,
      data: node
    })
  })

  changeSet.updates.nodes.forEach((node, index) => {
    const id = getAiNodeId(node) || `update-node-${index}`
    items.push({
      key: `update-node-${id}-${index}`,
      action: 'update',
      entity: 'node',
      label: `更新节点：${getAiNodeLabel(node)}`,
      data: node
    })
  })

  changeSet.deletes.nodes.forEach((node, index) => {
    const id = getAiNodeId(node) || `delete-node-${index}`
    items.push({
      key: `delete-node-${id}-${index}`,
      action: 'delete',
      entity: 'node',
      label: `删除节点：${getAiNodeLabel(node)}`,
      data: node
    })
  })

  changeSet.adds.edges.forEach((edge, index) => {
    const id = getAiEdgeId(edge) || `add-edge-${index}`
    items.push({
      key: `add-edge-${id}-${index}`,
      action: 'add',
      entity: 'edge',
      label: `新增连线：${getAiEdgeLabel(edge)}`,
      data: edge
    })
  })

  changeSet.updates.edges.forEach((edge, index) => {
    const id = getAiEdgeId(edge) || `update-edge-${index}`
    items.push({
      key: `update-edge-${id}-${index}`,
      action: 'update',
      entity: 'edge',
      label: `更新连线：${getAiEdgeLabel(edge)}`,
      data: edge
    })
  })

  changeSet.deletes.edges.forEach((edge, index) => {
    const id = getAiEdgeId(edge) || `delete-edge-${index}`
    items.push({
      key: `delete-edge-${id}-${index}`,
      action: 'delete',
      entity: 'edge',
      label: `删除连线：${getAiEdgeLabel(edge)}`,
      data: edge
    })
  })

  return items
}

const validateChangeSet = (changeSet: ChangeSet) => {
  const errors: string[] = []
  const warnings: string[] = []
  const allowedTypes = new Set(allowedNodeTypes.value)
  const existingNodeIds = new Set(nodes.value.map(n => n.id))
  const addedNodeIds = new Set<string>()
  const replaceAll = Boolean(changeSet.replaceAll)

  if (!changeSet.summary) {
    errors.push('变更摘要为空')
  }

  changeSet.adds.nodes.forEach(node => {
    const id = getAiNodeId(node)
    if (id && existingNodeIds.has(id)) {
      warnings.push(`节点 ID ${id} 已存在，将自动重新编号`)
    }
    if (id) addedNodeIds.add(id)
    const type = node.type || node.props?.type
    if (type && !allowedTypes.has(type)) {
      errors.push(`节点类型 ${type} 不在允许范围内`)
    }
  })

  changeSet.updates.nodes.forEach(node => {
    const type = node.type || node.props?.type
    if (type && !allowedTypes.has(type)) {
      errors.push(`更新节点类型 ${type} 不在允许范围内`)
    }
  })

  if (aiUseSelectionOnly.value) {
    const selectedSet = new Set(selectedNodes.value)
    changeSet.updates.nodes.forEach(node => {
      const id = getAiNodeId(node)
      if (id && !selectedSet.has(id)) {
        errors.push(`更新节点 ${id} 不在选中范围内`)
      }
    })
    changeSet.deletes.nodes.forEach(node => {
      const id = getAiNodeId(node)
      if (id && !selectedSet.has(id)) {
        errors.push(`删除节点 ${id} 不在选中范围内`)
      }
    })

    const edgeInScope = (edge: AiEdge | string) => {
      const from = getAiEdgeFrom(edge)
      const to = getAiEdgeTo(edge)
      if (!from || !to) return true
      return selectedSet.has(from) && selectedSet.has(to)
    }

    changeSet.adds.edges.forEach(edge => {
      if (!edgeInScope(edge)) {
        errors.push('新增连线不在选中范围内')
      }
    })
    changeSet.updates.edges.forEach(edge => {
      if (!edgeInScope(edge)) {
        errors.push('更新连线不在选中范围内')
      }
    })
  }

  const allNodeIds = new Set([...existingNodeIds, ...addedNodeIds])
  const checkEdgeEndpoints = (edge: AiEdge | string, label: string, requireBoth: boolean) => {
    const from = getAiEdgeFrom(edge)
    const to = getAiEdgeTo(edge)
    if (!from && !to && !requireBoth) return
    if (!from || !to) {
      errors.push(`${label} 缺少 from/to`)
      return
    }
    if (!allNodeIds.has(from) && !addedNodeIds.has(from)) {
      errors.push(`${label} 的起点 ${from} 不存在`)
    }
    if (!allNodeIds.has(to) && !addedNodeIds.has(to)) {
      errors.push(`${label} 的终点 ${to} 不存在`)
    }
  }

  changeSet.adds.edges.forEach(edge => checkEdgeEndpoints(edge, '新增连线', true))
  changeSet.updates.edges.forEach(edge => checkEdgeEndpoints(edge, '更新连线', false))

  if (replaceAll) {
    warnings.push('将清空当前流程并重建')
    if (changeSet.updates.nodes.length || changeSet.deletes.nodes.length || changeSet.updates.edges.length || changeSet.deletes.edges.length) {
      warnings.push('重建模式仅应用新增项，更新/删除将被忽略')
    }
    if (changeSet.adds.nodes.length === 0) {
      warnings.push('重建模式未新增任何节点')
    }
  }

  const totalChanges = aiChangeItems.value.length || (
    changeSet.adds.nodes.length + changeSet.updates.nodes.length + changeSet.deletes.nodes.length +
    changeSet.adds.edges.length + changeSet.updates.edges.length + changeSet.deletes.edges.length
  )
  if (totalChanges > 20) {
    warnings.push('变更较多，建议拆分需求以降低风险')
  }

  return { errors, warnings }
}

const getShapeDefaults = (type: string) => {
  const shape = basicShapes.find(s => s.type === type) || flowShapes.find(s => s.type === type)
  return {
    width: shape?.defaultWidth || 120,
    height: shape?.defaultHeight || 60
  }
}

const resolveAiValue = <T>(node: AiNode, key: keyof AiNode, fallback: T) => {
  const direct = node[key]
  const fromProps = node.props?.[key as string]
  return (direct ?? fromProps ?? fallback) as T
}

const getDefaultNodePosition = (index: number) => {
  const viewportCenterX = (canvasWrapper.value?.clientWidth || 800) / 2 / zoom.value
  const viewportCenterY = (canvasWrapper.value?.clientHeight || 600) / 2 / zoom.value
  const offset = index * 32
  return {
    x: snapValue(viewportCenterX - panOffset.x + offset),
    y: snapValue(viewportCenterY - panOffset.y + offset)
  }
}

const buildNodeFromAi = (aiNode: AiNode, id: string, index: number): Node => {
  const type = resolveAiValue(aiNode, 'type', 'process') as string
  const defaults = getShapeDefaults(type)
  const width = Number(resolveAiValue(aiNode, 'width', defaults.width)) || defaults.width
  const height = Number(resolveAiValue(aiNode, 'height', defaults.height)) || defaults.height
  const pos = {
    x: Number(resolveAiValue(aiNode, 'x', NaN)),
    y: Number(resolveAiValue(aiNode, 'y', NaN))
  }
  const fallbackPos = getDefaultNodePosition(index)

  return {
    id,
    type,
    x: Number.isFinite(pos.x) ? snapValue(pos.x) : fallbackPos.x,
    y: Number.isFinite(pos.y) ? snapValue(pos.y) : fallbackPos.y,
    width,
    height,
    text: aiNode.text || aiNode.name || aiNode.props?.text || aiNode.props?.name || '',
    fill: resolveAiValue(aiNode, 'fill', '#ffffff'),
    stroke: resolveAiValue(aiNode, 'stroke', '#000000'),
    strokeWidth: Number(resolveAiValue(aiNode, 'strokeWidth', 2)) || 2,
    textColor: resolveAiValue(aiNode, 'textColor', '#000000'),
    borderRadius: Number(resolveAiValue(aiNode, 'borderRadius', 4)) || 4,
    zIndex: nodes.value.length + index,
    fontSize: Number(resolveAiValue(aiNode, 'fontSize', 14)) || 14
  }
}

const applyNodeUpdate = (node: Node, aiNode: AiNode) => {
  const maybeUpdate = <K extends keyof Node>(key: K, value: any) => {
    if (value !== undefined && value !== null && value !== '') {
      (node[key] as any) = value
    }
  }

  maybeUpdate('type', aiNode.type || aiNode.props?.type)
  maybeUpdate('x', resolveAiValue(aiNode, 'x', undefined))
  maybeUpdate('y', resolveAiValue(aiNode, 'y', undefined))
  maybeUpdate('width', resolveAiValue(aiNode, 'width', undefined))
  maybeUpdate('height', resolveAiValue(aiNode, 'height', undefined))
  maybeUpdate('fill', resolveAiValue(aiNode, 'fill', undefined))
  maybeUpdate('stroke', resolveAiValue(aiNode, 'stroke', undefined))
  maybeUpdate('strokeWidth', resolveAiValue(aiNode, 'strokeWidth', undefined))
  maybeUpdate('textColor', resolveAiValue(aiNode, 'textColor', undefined))
  maybeUpdate('borderRadius', resolveAiValue(aiNode, 'borderRadius', undefined))
  maybeUpdate('fontSize', resolveAiValue(aiNode, 'fontSize', undefined))
  if (aiNode.text || aiNode.name || aiNode.props?.text || aiNode.props?.name) {
    node.text = aiNode.text || aiNode.name || aiNode.props?.text || aiNode.props?.name || node.text
  }
}

const buildConnectionFromAi = (edge: AiEdge, id: string, fromNode: string, toNode: string): Connection => {
  const lineType = edge.lineType || edge.props?.lineType || currentLineType.value
  return {
    id,
    fromNode,
    fromAnchor: edge.fromAnchor || edge.props?.fromAnchor || 'right',
    toNode,
    toAnchor: edge.toAnchor || edge.props?.toAnchor || 'left',
    color: edge.color || edge.props?.color || '#000000',
    dashed: Boolean(edge.dashed ?? edge.props?.dashed ?? false),
    arrow: edge.arrow || edge.props?.arrow || 'end',
    lineType,
    label: edge.condition || edge.label || edge.props?.condition || edge.props?.label || '',
    bendOffset: edge.props?.bendOffset,
    labelOffset: edge.props?.labelOffset,
    labelFontSize: edge.props?.labelFontSize,
    labelFontWeight: edge.props?.labelFontWeight,
    labelColor: edge.props?.labelColor,
    fromAnchorOffset: edge.fromAnchorOffset || edge.props?.fromAnchorOffset,
    toAnchorOffset: edge.toAnchorOffset || edge.props?.toAnchorOffset
  }
}

const applyConnectionUpdate = (conn: Connection, edge: AiEdge) => {
  if (edge.lineType || edge.props?.lineType) conn.lineType = edge.lineType || edge.props?.lineType
  if (edge.color || edge.props?.color) conn.color = edge.color || edge.props?.color
  if (edge.dashed !== undefined || edge.props?.dashed !== undefined) {
    conn.dashed = Boolean(edge.dashed ?? edge.props?.dashed)
  }
  if (edge.arrow || edge.props?.arrow) conn.arrow = edge.arrow || edge.props?.arrow
  if (edge.condition || edge.label || edge.props?.condition || edge.props?.label) {
    conn.label = edge.condition || edge.label || edge.props?.condition || edge.props?.label
  }
  if (edge.fromAnchor || edge.props?.fromAnchor) conn.fromAnchor = edge.fromAnchor || edge.props?.fromAnchor
  if (edge.toAnchor || edge.props?.toAnchor) conn.toAnchor = edge.toAnchor || edge.props?.toAnchor
  if (edge.fromAnchorOffset || edge.props?.fromAnchorOffset) conn.fromAnchorOffset = edge.fromAnchorOffset || edge.props?.fromAnchorOffset
  if (edge.toAnchorOffset || edge.props?.toAnchorOffset) conn.toAnchorOffset = edge.toAnchorOffset || edge.props?.toAnchorOffset
  if (edge.props?.labelOffset) conn.labelOffset = edge.props?.labelOffset
  if (edge.props?.labelFontSize) conn.labelFontSize = edge.props?.labelFontSize
  if (edge.props?.labelFontWeight) conn.labelFontWeight = edge.props?.labelFontWeight
  if (edge.props?.labelColor) conn.labelColor = edge.props?.labelColor
}

const runAiRequest = async (payload: { system: string; user: string; displayPrompt: string }) => {
  if (aiStatus.value === 'loading') return

  aiMessages.value.push({
    id: generateId(),
    role: 'user',
    content: payload.displayPrompt
  })
  aiStatus.value = 'loading'
  aiLastRequest.value = payload
  clearAiPreview({ keepStatus: true })

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'origin': 'https://www.toproject.cloud',
      'priority': 'u=1, i',
      'referer': 'https://www.toproject.cloud/',
      ...flowAiApi.headers
    }
    if (flowAiApi.key) headers['Authorization'] = `Bearer ${flowAiApi.key}`

    const res = await fetch(flowAiApi.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: flowAiApi.model,
        messages: [
          { role: 'system', content: payload.system },
          { role: 'user', content: payload.user }
        ],
        temperature: flowAiTemperature,
        stream: false,
        web_search: false
      })
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''
    if (!content) throw new Error('AI 返回为空')

    aiRawResponse.value = content
    const changeSet = parseChangeSetFromContent(content)
    if (!changeSet) throw new Error('AI 返回的 JSON 无法解析')

    if (changeSet.replaceAll) {
      aiReplaceAll.value = true
    }
    changeSet.replaceAll = aiReplaceAll.value
    const { errors, warnings } = validateChangeSet(changeSet)
    aiValidationErrors.value = errors
    aiValidationWarnings.value = warnings
    aiChangeSet.value = changeSet
    aiChangeItems.value = buildChangeItems(changeSet)
    aiSelectedChangeKeys.value = aiChangeItems.value.map(item => item.key)
    aiStatus.value = errors.length > 0 ? 'error' : 'ready'

    aiMessages.value.push({
      id: generateId(),
      role: 'assistant',
      content: errors.length > 0 ? '生成完成，但校验失败，请查看错误。' : (changeSet.summary || '已生成改图建议'),
      state: errors.length > 0 ? 'error' : 'ok'
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '请求失败'
    aiStatus.value = 'error'
    aiValidationErrors.value = [message]
    aiMessages.value.push({
      id: generateId(),
      role: 'assistant',
      content: `生成失败：${message}`,
      state: 'error'
    })
  }
}

const submitAiRequest = async () => {
  const prompt = aiPrompt.value.trim()
  if (!prompt) return
  const payload = {
    system: buildAiSystemPrompt(),
    user: buildAiUserMessage(prompt),
    displayPrompt: prompt
  }
  aiPrompt.value = ''
  await runAiRequest(payload)
}

const retryAiRequest = async () => {
  if (!aiLastRequest.value) return
  await runAiRequest(aiLastRequest.value)
}

const confirmApplyAiChanges = () => {
  if (!aiChangeSet.value) return
  const replaceAll = aiShouldReplaceAll.value
  openConfirmDialog({
    title: '应用 AI 变更',
    message: replaceAll
      ? '将清空当前流程并应用所选变更，此操作可撤销。是否继续？'
      : '确认将所选变更应用到画布？此操作可撤销。',
    confirmText: '应用',
    cancelText: '取消',
    onConfirm: () => {
      applyAiChanges()
    }
  })
}

const applyAiChanges = () => {
  if (!aiChangeSet.value) return
  const selectedSet = new Set(aiSelectedChangeKeys.value)
  if (selectedSet.size === 0) return

  const snapshotNodes = JSON.parse(JSON.stringify(nodes.value))
  const snapshotConnections = JSON.parse(JSON.stringify(connections.value))
  const replaceAll = aiShouldReplaceAll.value

  const pickItems = (action: AiChangeItem['action'], entity: AiChangeItem['entity']) =>
    aiChangeItems.value.filter(item => item.action === action && item.entity === entity && selectedSet.has(item.key))

  const addNodes = pickItems('add', 'node').map(item => item.data as AiNode)
  const updateNodes = replaceAll ? [] : pickItems('update', 'node').map(item => item.data as AiNode)
  const deleteNodes = replaceAll ? [] : pickItems('delete', 'node').map(item => item.data)
  const addEdges = pickItems('add', 'edge').map(item => item.data as AiEdge)
  const updateEdges = replaceAll ? [] : pickItems('update', 'edge').map(item => item.data as AiEdge)
  const deleteEdges = replaceAll ? [] : pickItems('delete', 'edge').map(item => item.data)

  const errors: string[] = []
  if (replaceAll) {
    nodes.value = []
    connections.value = []
  }
  const existingNodeIds = new Set(nodes.value.map(n => n.id))
  const existingEdgeIds = new Set(connections.value.map(c => c.id))
  const nodeIdMap = new Map<string, string>()
  const edgeIdMap = new Map<string, string>()

  const ensureUniqueId = (candidate: string, existing: Set<string>) => {
    let id = candidate || generateId()
    while (existing.has(id)) {
      id = generateId()
    }
    existing.add(id)
    return id
  }

  const addedNodes: Node[] = []
  addNodes.forEach((node, index) => {
    const rawId = getAiNodeId(node)
    const uniqueId = ensureUniqueId(rawId, existingNodeIds)
    if (rawId) nodeIdMap.set(rawId, uniqueId)
    addedNodes.push(buildNodeFromAi(node, uniqueId, index))
  })
  if (addedNodes.length > 0) {
    nodes.value.push(...addedNodes)
  }

  addEdges.forEach((edge, index) => {
    const from = nodeIdMap.get(getAiEdgeFrom(edge)) || getAiEdgeFrom(edge)
    const to = nodeIdMap.get(getAiEdgeTo(edge)) || getAiEdgeTo(edge)
    if (!from || !to) {
      errors.push(`新增连线缺少 from/to：${getAiEdgeLabel(edge)}`)
      return
    }
    if (!existingNodeIds.has(from) || !existingNodeIds.has(to)) {
      errors.push(`新增连线节点不存在：${getAiEdgeLabel(edge)}`)
      return
    }
    const rawId = getAiEdgeId(edge)
    const id = ensureUniqueId(rawId, existingEdgeIds)
    if (rawId) edgeIdMap.set(rawId, id)
    connections.value.push(buildConnectionFromAi(edge, id, from, to))
  })

  updateNodes.forEach(node => {
    const rawId = getAiNodeId(node)
    const id = nodeIdMap.get(rawId) || rawId
    if (!id) {
      errors.push('更新节点缺少 ID')
      return
    }
    const target = nodes.value.find(n => n.id === id)
    if (!target) {
      errors.push(`更新节点 ${id} 不存在`)
      return
    }
    applyNodeUpdate(target, node)
  })

  updateEdges.forEach(edge => {
    const rawId = getAiEdgeId(edge)
    const id = edgeIdMap.get(rawId) || rawId
    if (!id) {
      errors.push('更新连线缺少 ID')
      return
    }
    const target = connections.value.find(c => c.id === id)
    if (!target) {
      errors.push(`更新连线 ${id} 不存在`)
      return
    }
    applyConnectionUpdate(target, edge)
  })

  const deleteNodeIds = deleteNodes
    .map(node => {
      const rawId = getAiNodeId(node as AiNode | string)
      return nodeIdMap.get(rawId) || rawId
    })
    .filter(Boolean)
  if (deleteNodeIds.length > 0) {
    nodes.value = nodes.value.filter(n => !deleteNodeIds.includes(n.id))
    connections.value = connections.value.filter(
      c => !deleteNodeIds.includes(c.fromNode) && !deleteNodeIds.includes(c.toNode)
    )
  }

  const deleteEdgeIds = deleteEdges
    .map(edge => {
      const rawId = getAiEdgeId(edge as AiEdge | string)
      return edgeIdMap.get(rawId) || rawId
    })
    .filter(Boolean)
  if (deleteEdgeIds.length > 0) {
    connections.value = connections.value.filter(c => !deleteEdgeIds.includes(c.id))
  }

  if (errors.length > 0) {
    nodes.value = snapshotNodes
    connections.value = snapshotConnections
    aiStatus.value = 'error'
    aiValidationErrors.value = errors
    aiMessages.value.push({
      id: generateId(),
      role: 'assistant',
      content: `应用失败：${errors[0]}`,
      state: 'error'
    })
    return
  }

  saveHistory()
  clearSelection()
  aiMessages.value.push({
    id: generateId(),
    role: 'assistant',
    content: '已应用所选变更。',
    state: 'ok'
  })
  clearAiPreview()
}

// ==================== 节点样式 ====================
const getNodeStyle = (node: Node) => {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
    zIndex: node.zIndex
  }
}

// 判断是否需要使用 SVG 绘制形状（用于非矩形的多边形，避免 clip-path 裁剪边框）
const needsSvgShape = (type: string): boolean => {
  return ['diamond', 'triangle', 'hexagon', 'decision', 'data'].includes(type)
}

// 获取 SVG 形状路径
const getSvgShapePath = (node: Node): string => {
  const w = node.width
  const h = node.height

  switch (node.type) {
    case 'diamond':
    case 'decision':
      // 菱形
      return `M${w/2},0 L${w},${h/2} L${w/2},${h} L0,${h/2} Z`
    case 'triangle':
      // 三角形
      return `M${w/2},0 L${w},${h} L0,${h} Z`
    case 'hexagon':
      // 六边形
      return `M${w*0.25},0 L${w*0.75},0 L${w},${h/2} L${w*0.75},${h} L${w*0.25},${h} L0,${h/2} Z`
    case 'data':
      // 平行四边形 - 倾斜度使用固定像素值而不是百分比
      const skew = Math.min(15, w * 0.1) // 倾斜量，最大15像素
      return `M${skew},0 L${w},0 L${w - skew},${h} L0,${h} Z`
    default:
      return `M0,0 L${w},0 L${w},${h} L0,${h} Z`
  }
}

// 获取带padding的SVG形状路径（用于画布显示，确保边框不被裁剪）
const getSvgShapePathWithPadding = (node: Node): string => {
  const w = node.width
  const h = node.height
  // padding = 边框宽度的一半（边框居中绘制）+ 2px额外空间
  const p = node.strokeWidth + 4

  switch (node.type) {
    case 'diamond':
    case 'decision':
      // 菱形 - 所有坐标加上padding偏移
      return `M${w/2 + p},${p} L${w + p},${h/2 + p} L${w/2 + p},${h + p} L${p},${h/2 + p} Z`
    case 'triangle':
      // 三角形
      return `M${w/2 + p},${p} L${w + p},${h + p} L${p},${h + p} Z`
    case 'hexagon':
      // 六边形
      return `M${w*0.25 + p},${p} L${w*0.75 + p},${p} L${w + p},${h/2 + p} L${w*0.75 + p},${h + p} L${w*0.25 + p},${h + p} L${p},${h/2 + p} Z`
    case 'data':
      // 平行四边形
      const skew = Math.min(15, w * 0.1)
      return `M${skew + p},${p} L${w + p},${p} L${w - skew + p},${h + p} L${p},${h + p} Z`
    default:
      return `M${p},${p} L${w + p},${p} L${w + p},${h + p} L${p},${h + p} Z`
  }
}

// 获取带偏移的 SVG 形状路径（用于导出时确保边框不被裁剪）
const getSvgShapePathWithOffset = (node: Node, offset: number): string => {
  const w = node.width
  const h = node.height
  const o = offset // 偏移量

  switch (node.type) {
    case 'diamond':
    case 'decision':
      // 菱形 - 所有坐标加上偏移
      return `M${w/2 + o},${o} L${w + o},${h/2 + o} L${w/2 + o},${h + o} L${o},${h/2 + o} Z`
    case 'triangle':
      // 三角形
      return `M${w/2 + o},${o} L${w + o},${h + o} L${o},${h + o} Z`
    case 'hexagon':
      // 六边形
      return `M${w*0.25 + o},${o} L${w*0.75 + o},${o} L${w + o},${h/2 + o} L${w*0.75 + o},${h + o} L${w*0.25 + o},${h + o} L${o},${h/2 + o} Z`
    case 'data':
      // 平行四边形
      const skew = Math.min(15, w * 0.1)
      return `M${skew + o},${o} L${w + o},${o} L${w - skew + o},${h + o} L${o},${h + o} Z`
    default:
      return `M${o},${o} L${w + o},${o} L${w + o},${h + o} L${o},${h + o} Z`
  }
}

const getShapeStyle = (node: Node) => {
  let borderRadius = `${node.borderRadius}px`

  // 对于使用 SVG 绘制的形状，不需要背景和边框样式
  if (needsSvgShape(node.type)) {
    return {
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '0'
    }
  }

  switch (node.type) {
    case 'circle':
      borderRadius = '50%'
      break
    case 'terminator':
      borderRadius = '9999px'
      break
    case 'roundedRect':
      borderRadius = '12px'
      break
  }

  return {
    backgroundColor: node.fill,
    border: `${node.strokeWidth}px solid ${node.stroke}`,
    borderRadius
  }
}

// ==================== 锚点相关 ====================
const getNodeAnchors = (node: Node): Anchor[] => {
  return [
    { position: 'top', x: node.width / 2, y: 0 },
    { position: 'right', x: node.width, y: node.height / 2 },
    { position: 'bottom', x: node.width / 2, y: node.height },
    { position: 'left', x: 0, y: node.height / 2 }
  ]
}

const getAnchorStyle = (anchor: Anchor) => {
  return {
    left: `${anchor.x - 6}px`,
    top: `${anchor.y - 6}px`
  }
}

const getAnchorPosition = (node: Node, position: string, customOffset?: { x: number; y: number }) => {
  // 如果有自定义偏移，使用自定义位置
  if (customOffset) {
    return {
      x: node.x + node.width * customOffset.x,
      y: node.y + node.height * customOffset.y
    }
  }

  // 否则使用固定锚点位置
  switch (position) {
    case 'top': return { x: node.x + node.width / 2, y: node.y }
    case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 }
    case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height }
    case 'left': return { x: node.x, y: node.y + node.height / 2 }
    default: return { x: node.x, y: node.y }
  }
}

// 计算点到节点边缘的最近交点
const getNearestEdgePoint = (node: Node, point: { x: number; y: number }): { position: string; offset: { x: number; y: number } } => {
  const centerX = node.x + node.width / 2
  const centerY = node.y + node.height / 2

  // 计算从节点中心到目标点的向量
  const dx = point.x - centerX
  const dy = point.y - centerY

  // 计算与四条边的交点
  const edges = []

  // 上边
  if (dy < 0) {
    const t = (node.y - centerY) / dy
    const x = centerX + dx * t
    if (x >= node.x && x <= node.x + node.width) {
      edges.push({
        position: 'top',
        x: x,
        y: node.y,
        distance: Math.abs(point.y - node.y)
      })
    }
  }

  // 下边
  if (dy > 0) {
    const t = (node.y + node.height - centerY) / dy
    const x = centerX + dx * t
    if (x >= node.x && x <= node.x + node.width) {
      edges.push({
        position: 'bottom',
        x: x,
        y: node.y + node.height,
        distance: Math.abs(point.y - (node.y + node.height))
      })
    }
  }

  // 左边
  if (dx < 0) {
    const t = (node.x - centerX) / dx
    const y = centerY + dy * t
    if (y >= node.y && y <= node.y + node.height) {
      edges.push({
        position: 'left',
        x: node.x,
        y: y,
        distance: Math.abs(point.x - node.x)
      })
    }
  }

  // 右边
  if (dx > 0) {
    const t = (node.x + node.width - centerX) / dx
    const y = centerY + dy * t
    if (y >= node.y && y <= node.y + node.height) {
      edges.push({
        position: 'right',
        x: node.x + node.width,
        y: y,
        distance: Math.abs(point.x - (node.x + node.width))
      })
    }
  }

  // 找到最近的边
  if (edges.length === 0) {
    // 如果没有交点（点在节点内部），返回最近的固定锚点
    const distances = [
      { position: 'top', distance: Math.abs(point.y - node.y) },
      { position: 'bottom', distance: Math.abs(point.y - (node.y + node.height)) },
      { position: 'left', distance: Math.abs(point.x - node.x) },
      { position: 'right', distance: Math.abs(point.x - (node.x + node.width)) }
    ]
    const nearest = distances.sort((a, b) => a.distance - b.distance)[0]
    return {
      position: nearest.position,
      offset: { x: 0.5, y: 0.5 }
    }
  }

  const nearest = edges.sort((a, b) => a.distance - b.distance)[0]

  // 计算相对偏移（0-1 之间）
  const offsetX = (nearest.x - node.x) / node.width
  const offsetY = (nearest.y - node.y) / node.height

  return {
    position: nearest.position,
    offset: { x: offsetX, y: offsetY }
  }
}

// ==================== 调整大小手柄 ====================
const resizeHandles = [
  { position: 'nw', cursor: 'cursor-nw-resize' },
  { position: 'n', cursor: 'cursor-n-resize' },
  { position: 'ne', cursor: 'cursor-ne-resize' },
  { position: 'e', cursor: 'cursor-e-resize' },
  { position: 'se', cursor: 'cursor-se-resize' },
  { position: 's', cursor: 'cursor-s-resize' },
  { position: 'sw', cursor: 'cursor-sw-resize' },
  { position: 'w', cursor: 'cursor-w-resize' }
]

const getResizeHandleStyle = (handle: { position: string }) => {
  const positions: Record<string, { left?: string; right?: string; top?: string; bottom?: string }> = {
    nw: { left: '-5px', top: '-5px' },
    n: { left: '50%', top: '-5px', transform: 'translateX(-50%)' } as any,
    ne: { right: '-5px', top: '-5px' },
    e: { right: '-5px', top: '50%', transform: 'translateY(-50%)' } as any,
    se: { right: '-5px', bottom: '-5px' },
    s: { left: '50%', bottom: '-5px', transform: 'translateX(-50%)' } as any,
    sw: { left: '-5px', bottom: '-5px' },
    w: { left: '-5px', top: '50%', transform: 'translateY(-50%)' } as any
  }
  return positions[handle.position] || {}
}

// ==================== 连接线相关 ====================
const getConnectionPath = (conn: Connection) => {
  const fromNode = nodes.value.find(n => n.id === conn.fromNode)
  const toNode = nodes.value.find(n => n.id === conn.toNode)
  if (!fromNode || !toNode) return ''

  const start = getAnchorPosition(fromNode, conn.fromAnchor, conn.fromAnchorOffset)
  const end = getAnchorPosition(toNode, conn.toAnchor, conn.toAnchorOffset)

  if (conn.lineType === 'straight') {
    return `M${start.x},${start.y} L${end.x},${end.y}`
  } else if (conn.lineType === 'curved') {
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const ctrlX = midX
    const ctrlY = Math.min(start.y, end.y) - 50
    return `M${start.x},${start.y} Q${ctrlX},${ctrlY} ${end.x},${end.y}`
  } else {
    // orthogonal - 折线，支持拖动调整
    const offset = conn.bendOffset || { x: 0, y: 0 }
    const midX = (start.x + end.x) / 2 + offset.x

    // 根据起点和终点的锚点位置决定折线走向
    const isStartHorizontal = conn.fromAnchor === 'left' || conn.fromAnchor === 'right'
    const isEndHorizontal = conn.toAnchor === 'left' || conn.toAnchor === 'right'

    if (isStartHorizontal && isEndHorizontal) {
      // 两端都是水平出口：先水平再垂直再水平
      return `M${start.x},${start.y} L${midX},${start.y} L${midX},${end.y} L${end.x},${end.y}`
    } else if (!isStartHorizontal && !isEndHorizontal) {
      // 两端都是垂直出口
      // 屏幕坐标系：Y轴向下增长，上方节点Y值小，下方节点Y值大
      //
      // 回溯判断逻辑：锚点的出口方向与目标节点的相对位置相反时需要绕行
      // - top 锚点出口方向向上，如果目标在下方（end.y > start.y）需要绕行
      // - bottom 锚点出口方向向下，如果目标在上方（end.y < start.y）需要绕行
      // - 同侧出口（top->top 或 bottom->bottom）也需要绕行
      //
      // 注意：这里只看起始锚点的出口方向，不管终点锚点
      const needsDetour =
        (conn.fromAnchor === 'top' && end.y > start.y) ||
        (conn.fromAnchor === 'bottom' && end.y < start.y)

      // 同侧出口也需要特殊处理
      const sameSideAnchors =
        (conn.fromAnchor === 'top' && conn.toAnchor === 'top') ||
        (conn.fromAnchor === 'bottom' && conn.toAnchor === 'bottom')

      if (needsDetour || sameSideAnchors) {
        // 回溯连接：需要绕到侧边形成循环视觉效果
        // 计算绕行的方向和距离
        const loopOffset = 50 + offset.x // 默认向右绕行50px，可通过拖动调整

        // 判断绕行方向：默认向右，如果起点在终点右侧则向左
        const goRight = start.x <= end.x + fromNode.width / 2
        const sideX = goRight
          ? Math.max(fromNode.x + fromNode.width, toNode.x + toNode.width) + loopOffset
          : Math.min(fromNode.x, toNode.x) - loopOffset

        // 计算垂直延伸距离
        const verticalExtend = 30 + Math.abs(offset.y)

        if (conn.fromAnchor === 'top' && conn.toAnchor === 'bottom') {
          // 从下方节点顶部到上方节点底部（向上回溯）
          const topY = Math.min(start.y, end.y) - verticalExtend
          return `M${start.x},${start.y} L${start.x},${topY} L${sideX},${topY} L${sideX},${end.y + verticalExtend} L${end.x},${end.y + verticalExtend} L${end.x},${end.y}`
        } else if (conn.fromAnchor === 'bottom' && conn.toAnchor === 'top') {
          // 从上方节点底部到下方节点顶部（向下回溯，但需要绕行）
          const bottomY = Math.max(start.y, end.y) + verticalExtend
          return `M${start.x},${start.y} L${start.x},${bottomY} L${sideX},${bottomY} L${sideX},${end.y - verticalExtend} L${end.x},${end.y - verticalExtend} L${end.x},${end.y}`
        } else if (conn.fromAnchor === 'top' && conn.toAnchor === 'top') {
          // 两个都是顶部出口
          const topY = Math.min(start.y, end.y) - verticalExtend
          return `M${start.x},${start.y} L${start.x},${topY} L${end.x},${topY} L${end.x},${end.y}`
        } else {
          // 两个都是底部出口
          const bottomY = Math.max(start.y, end.y) + verticalExtend
          return `M${start.x},${start.y} L${start.x},${bottomY} L${end.x},${bottomY} L${end.x},${end.y}`
        }
      } else {
        // 正常的垂直连接：先垂直再水平再垂直
        const midY = (start.y + end.y) / 2 + offset.y
        return `M${start.x},${start.y} L${start.x},${midY} L${end.x},${midY} L${end.x},${end.y}`
      }
    } else if (isStartHorizontal) {
      // 起点水平，终点垂直
      return `M${start.x},${start.y} L${end.x},${start.y} L${end.x},${end.y}`
    } else {
      // 起点垂直，终点水平
      return `M${start.x},${start.y} L${start.x},${end.y} L${end.x},${end.y}`
    }
  }
}

// 获取折线控制点位置
const getBendControlPoint = (conn: Connection) => {
  const fromNode = nodes.value.find(n => n.id === conn.fromNode)
  const toNode = nodes.value.find(n => n.id === conn.toNode)
  if (!fromNode || !toNode || conn.lineType !== 'orthogonal') return null

  const start = getAnchorPosition(fromNode, conn.fromAnchor, conn.fromAnchorOffset)
  const end = getAnchorPosition(toNode, conn.toAnchor, conn.toAnchorOffset)
  const offset = conn.bendOffset || { x: 0, y: 0 }

  const isStartHorizontal = conn.fromAnchor === 'left' || conn.fromAnchor === 'right'
  const isEndHorizontal = conn.toAnchor === 'left' || conn.toAnchor === 'right'

  if (isStartHorizontal && isEndHorizontal) {
    // 控制点在中间垂直线上
    const midX = (start.x + end.x) / 2 + offset.x
    const midY = (start.y + end.y) / 2
    return { x: midX, y: midY, direction: 'horizontal' }
  } else if (!isStartHorizontal && !isEndHorizontal) {
    // 检测是否需要绕行（与 getConnectionPath 保持一致）
    const needsDetour =
      (conn.fromAnchor === 'top' && end.y > start.y) ||
      (conn.fromAnchor === 'bottom' && end.y < start.y)

    const sameSideAnchors =
      (conn.fromAnchor === 'top' && conn.toAnchor === 'top') ||
      (conn.fromAnchor === 'bottom' && conn.toAnchor === 'bottom')

    if (needsDetour || sameSideAnchors) {
      // 回溯连接：控制点在侧边线上，可以水平拖动调整绕行距离
      const loopOffset = 50 + offset.x
      const goRight = start.x <= end.x + fromNode.width / 2
      const sideX = goRight
        ? Math.max(fromNode.x + fromNode.width, toNode.x + toNode.width) + loopOffset
        : Math.min(fromNode.x, toNode.x) - loopOffset
      const midY = (start.y + end.y) / 2
      return { x: sideX, y: midY, direction: 'horizontal' }
    } else {
      // 正常垂直连接：控制点在中间水平线上
      const midX = (start.x + end.x) / 2
      const midY = (start.y + end.y) / 2 + offset.y
      return { x: midX, y: midY, direction: 'vertical' }
    }
  }
  return null
}

const getArrowPoints = (conn: Connection) => {
  const fromNode = nodes.value.find(n => n.id === conn.fromNode)
  const toNode = nodes.value.find(n => n.id === conn.toNode)
  if (!fromNode || !toNode) return ''

  const start = getAnchorPosition(fromNode, conn.fromAnchor, conn.fromAnchorOffset)
  const end = getAnchorPosition(toNode, conn.toAnchor, conn.toAnchorOffset)
  const size = 12

  // 根据连接线类型和锚点计算箭头方向
  let angle = 0

  if (conn.lineType === 'straight') {
    angle = Math.atan2(end.y - start.y, end.x - start.x)
  } else if (conn.lineType === 'curved') {
    const midX = (start.x + end.x) / 2
    const ctrlY = Math.min(start.y, end.y) - 50
    angle = Math.atan2(end.y - ctrlY, end.x - midX)
  } else {
    // 折线：根据终点锚点方向确定箭头方向（箭头指向节点内部）
    switch (conn.toAnchor) {
      case 'top':
        angle = Math.PI / 2  // 向下指（从上方进入节点）
        break
      case 'bottom':
        angle = -Math.PI / 2  // 向上指（从下方进入节点）
        break
      case 'left':
        angle = 0  // 向右指（从左侧进入节点）
        break
      case 'right':
        angle = Math.PI  // 向左指（从右侧进入节点）
        break
    }
  }

  const tipX = end.x
  const tipY = end.y
  const wingAngle = 0.5

  const p1 = { x: tipX, y: tipY }
  const p2 = {
    x: tipX - size * Math.cos(angle - wingAngle),
    y: tipY - size * Math.sin(angle - wingAngle)
  }
  const p3 = {
    x: tipX - size * Math.cos(angle + wingAngle),
    y: tipY - size * Math.sin(angle + wingAngle)
  }

  return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`
}

// 开始拖动折线控制点
const startBendDrag = (e: MouseEvent, conn: Connection) => {
  e.stopPropagation()
  isDraggingBend.value = true
  draggingConnection.value = conn
  const pos = getMousePosition(e)
  bendDragStart.x = pos.x
  bendDragStart.y = pos.y
}

// ==================== 连接线标签相关 ====================
// 计算连接线中点位置
const getConnectionMidPoint = (conn: Connection) => {
  const fromNode = nodes.value.find(n => n.id === conn.fromNode)
  const toNode = nodes.value.find(n => n.id === conn.toNode)
  if (!fromNode || !toNode) return { x: 0, y: 0 }

  const start = getAnchorPosition(fromNode, conn.fromAnchor, conn.fromAnchorOffset)
  const end = getAnchorPosition(toNode, conn.toAnchor, conn.toAnchorOffset)

  // 根据连接线类型计算中点
  if (conn.lineType === 'straight') {
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2
    }
  } else if (conn.lineType === 'orthogonal') {
    // 折线：使用中间转折点作为标签位置
    const offset = conn.bendOffset || { x: 0, y: 0 }
    const isStartH = conn.fromAnchor === 'left' || conn.fromAnchor === 'right'
    const isEndH = conn.toAnchor === 'left' || conn.toAnchor === 'right'

    if (isStartH && isEndH) {
      const midX = (start.x + end.x) / 2 + offset.x
      return { x: midX, y: (start.y + end.y) / 2 }
    } else if (!isStartH && !isEndH) {
      const midY = (start.y + end.y) / 2 + offset.y
      return { x: (start.x + end.x) / 2, y: midY }
    } else {
      return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
    }
  } else {
    // 曲线：使用起点和终点的中点
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 - 30 // 曲线标签稍微向上偏移
    }
  }
}

// 获取标签位置（包含用户拖动的偏移）
const getConnectionLabelPosition = (conn: Connection) => {
  const midPoint = getConnectionMidPoint(conn)
  const offset = conn.labelOffset || { x: 0, y: 0 }
  return {
    x: midPoint.x + offset.x,
    y: midPoint.y + offset.y
  }
}

// 开始拖动标签
const startLabelDrag = (e: MouseEvent, conn: Connection) => {
  e.stopPropagation()
  isDraggingLabel.value = true
  draggingLabelConn.value = conn
  const pos = getMousePosition(e)
  labelDragStart.x = pos.x
  labelDragStart.y = pos.y
}

// ==================== 拖放形状 ====================
const onShapeDragStart = (e: DragEvent, shape: any) => {
  e.dataTransfer?.setData('shape', JSON.stringify(shape))
}

const onCanvasDragOver = (e: DragEvent) => {
  e.dataTransfer!.dropEffect = 'copy'
}

const onCanvasDrop = (e: DragEvent) => {
  const shapeData = e.dataTransfer?.getData('shape')
  if (!shapeData) return

  const shape = JSON.parse(shapeData)
  const pos = getMousePosition(e)

  const newNode: Node = {
    id: generateId(),
    type: shape.type,
    x: snapValue(pos.x - (shape.defaultWidth || 100) / 2),
    y: snapValue(pos.y - (shape.defaultHeight || 60) / 2),
    width: shape.defaultWidth || 100,
    height: shape.defaultHeight || 60,
    text: shape.name || '',
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    textColor: '#000000',
    borderRadius: shape.type === 'roundedRect' ? 12 : 4,
    zIndex: nodes.value.length,
    fontSize: 14
  }

  nodes.value.push(newNode)
  saveHistory()
  selectedNodes.value = [newNode.id]
}

// ==================== 画布鼠标事件 ====================
const onCanvasMouseDown = (e: MouseEvent) => {
  // 中键、Alt+左键、或拖动模式下左键、或空格+左键 拖动画布
  if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && isPanMode.value) || (e.button === 0 && isSpacePressed.value)) {
    isPanning.value = true
    panDragStart.x = e.clientX
    panDragStart.y = e.clientY
    panDragStart.panX = panOffset.x
    panDragStart.panY = panOffset.y
    e.preventDefault()
    return
  }

  // 检查是否点击在画布空白区域（canvasWrapper、canvasContent 或其背景）
  const target = e.target as HTMLElement
  const isCanvasClick = target === canvasWrapper.value ||
                        target === canvasContent.value ||
                        target.classList.contains('canvas-content')
  
  if (e.button === 0 && isCanvasClick) {
    // 左键点击空白区域，清除选择并开始框选
    clearSelection()
    isSelecting.value = true
    const pos = getMousePosition(e)
    selectionStart.x = pos.x
    selectionStart.y = pos.y
    selectionEnd.x = pos.x
    selectionEnd.y = pos.y
  }
}

const onCanvasMouseMove = (e: MouseEvent) => {
  if (isPanning.value) {
    const dx = e.clientX - panDragStart.x
    const dy = e.clientY - panDragStart.y
    panOffset.x = panDragStart.panX + dx / zoom.value
    panOffset.y = panDragStart.panY + dy / zoom.value
    return
  }

  if (isSelecting.value) {
    const pos = getMousePosition(e)
    selectionEnd.x = pos.x
    selectionEnd.y = pos.y

    // 检测在选择框内的节点
    const minX = Math.min(selectionStart.x, selectionEnd.x)
    const maxX = Math.max(selectionStart.x, selectionEnd.x)
    const minY = Math.min(selectionStart.y, selectionEnd.y)
    const maxY = Math.max(selectionStart.y, selectionEnd.y)

    selectedNodes.value = nodes.value
      .filter(n => n.x >= minX && n.x + n.width <= maxX && n.y >= minY && n.y + n.height <= maxY)
      .map(n => n.id)
    return
  }

  if (isDragging.value && selectedNodes.value.length > 0) {
    const pos = getMousePosition(e)
    const dx = pos.x - dragStart.x
    const dy = pos.y - dragStart.y

    selectedNodes.value.forEach(id => {
      const node = nodes.value.find(n => n.id === id)
      const initialPos = dragNodeOffsets.value.get(id)
      if (node && initialPos) {
        node.x = snapValue(initialPos.x + dx)
        node.y = snapValue(initialPos.y + dy)
      }
    })
    return
  }

  if (isResizing.value && resizeHandle.value) {
    const pos = getMousePosition(e)
    const node = nodes.value.find(n => n.id === resizeHandle.value!.node.id)
    if (!node) return

    const dx = pos.x - resizeStart.x
    const dy = pos.y - resizeStart.y
    const handle = resizeHandle.value.position

    if (handle.includes('e')) {
      node.width = Math.max(40, snapValue(resizeStart.width + dx))
    }
    if (handle.includes('w')) {
      const newWidth = Math.max(40, snapValue(resizeStart.width - dx))
      node.x = snapValue(resizeStart.nodeX + resizeStart.width - newWidth)
      node.width = newWidth
    }
    if (handle.includes('s')) {
      node.height = Math.max(30, snapValue(resizeStart.height + dy))
    }
    if (handle.includes('n')) {
      const newHeight = Math.max(30, snapValue(resizeStart.height - dy))
      node.y = snapValue(resizeStart.nodeY + resizeStart.height - newHeight)
      node.height = newHeight
    }
    return
  }

  if (isDraggingBend.value && draggingConnection.value) {
    const pos = getMousePosition(e)
    const conn = draggingConnection.value
    const controlPoint = getBendControlPoint(conn)

    if (controlPoint) {
      if (!conn.bendOffset) {
        conn.bendOffset = { x: 0, y: 0 }
      }

      if (controlPoint.direction === 'horizontal') {
        // 只允许水平移动
        conn.bendOffset.x += pos.x - bendDragStart.x
      } else {
        // 只允许垂直移动
        conn.bendOffset.y += pos.y - bendDragStart.y
      }

      bendDragStart.x = pos.x
      bendDragStart.y = pos.y
    }
    return
  }

  if (isDraggingLabel.value && draggingLabelConn.value) {
    const pos = getMousePosition(e)
    const conn = draggingLabelConn.value

    if (!conn.labelOffset) {
      conn.labelOffset = { x: 0, y: 0 }
    }

    // 更新标签偏移量
    conn.labelOffset.x += pos.x - labelDragStart.x
    conn.labelOffset.y += pos.y - labelDragStart.y

    labelDragStart.x = pos.x
    labelDragStart.y = pos.y
    return
  }

  if (isDrawingConnection.value) {
    const pos = getMousePosition(e)
    connectionEnd.x = pos.x
    connectionEnd.y = pos.y
  }
}

const onCanvasMouseUp = (e: MouseEvent) => {
  if (isDragging.value || isResizing.value || isDraggingBend.value || isDraggingLabel.value) {
    saveHistory()
  }

  if (isDrawingConnection.value && connectionStart.value) {
    // 查找目标节点和最近的边缘点
    const pos = getMousePosition(e)
    let targetNode: Node | null = null
    let targetEdgePoint: { position: string; offset: { x: number; y: number } } | null = null

    // 检查鼠标是否在某个节点上
    for (const node of nodes.value) {
      if (node.id === connectionStart.value.node.id) continue

      // 检查鼠标是否在节点范围内（扩大一点范围）
      const margin = 30
      if (pos.x >= node.x - margin && pos.x <= node.x + node.width + margin &&
          pos.y >= node.y - margin && pos.y <= node.y + node.height + margin) {
        targetNode = node
        // 计算鼠标位置到节点边缘的最近点
        targetEdgePoint = getNearestEdgePoint(node, pos)
        break
      }
    }

    if (targetNode && targetEdgePoint) {
      // 使用用户选择的起始锚点，而不是重新计算
      const startAnchor = connectionStart.value.anchor.position

      const newConn: Connection = {
        id: generateId(),
        fromNode: connectionStart.value.node.id,
        fromAnchor: startAnchor,  // 保留用户选择的起始锚点
        toNode: targetNode.id,
        toAnchor: targetEdgePoint.position,
        toAnchorOffset: targetEdgePoint.offset,  // 终点使用自定义偏移
        color: '#000000',
        dashed: false,
        arrow: 'end',
        lineType: currentLineType.value,
        bendOffset: { x: 0, y: 0 }
      }
      connections.value.push(newConn)
      saveHistory()
    }
  }

  isPanning.value = false
  isDragging.value = false
  isResizing.value = false
  isSelecting.value = false
  isDrawingConnection.value = false
  isDraggingBend.value = false
  isDraggingLabel.value = false
  connectionStart.value = null
  draggingConnection.value = null
  draggingLabelConn.value = null
  resizeHandle.value = null
}

// ==================== 节点鼠标事件 ====================
const onNodeMouseDown = (e: MouseEvent, node: Node) => {
  if (e.ctrlKey || e.metaKey) {
    // Ctrl+点击 多选
    if (selectedNodes.value.includes(node.id)) {
      selectedNodes.value = selectedNodes.value.filter(id => id !== node.id)
    } else {
      selectedNodes.value.push(node.id)
    }
  } else if (!selectedNodes.value.includes(node.id)) {
    selectedNodes.value = [node.id]
  }

  selectedConnection.value = null

  isDragging.value = true
  const pos = getMousePosition(e)
  dragStart.x = pos.x
  dragStart.y = pos.y

  // 存储所有选中节点的初始位置
  dragNodeOffsets.value.clear()
  selectedNodes.value.forEach(id => {
    const n = nodes.value.find(n => n.id === id)
    if (n) {
      dragNodeOffsets.value.set(id, { x: n.x, y: n.y })
    }
  })
}

const startResize = (e: MouseEvent, node: Node, handle: { position: string }) => {
  isResizing.value = true
  resizeHandle.value = { position: handle.position, node }
  const pos = getMousePosition(e)
  resizeStart.x = pos.x
  resizeStart.y = pos.y
  resizeStart.width = node.width
  resizeStart.height = node.height
  resizeStart.nodeX = node.x
  resizeStart.nodeY = node.y
}

const startConnection = (e: MouseEvent, node: Node, anchor: Anchor) => {
  isDrawingConnection.value = true
  connectionStart.value = { node, anchor }
  const pos = getMousePosition(e)
  connectionEnd.x = pos.x
  connectionEnd.y = pos.y
}

// ==================== 文本编辑 ====================
const startEditingText = (node: Node) => {
  editingNode.value = node
  editingText.value = node.text
  nextTick(() => {
    if (textEditor.value && textEditor.value[0]) {
      textEditor.value[0].focus()
      textEditor.value[0].select()
    }
  })
}

const finishEditingText = () => {
  if (editingNode.value) {
    editingNode.value.text = editingText.value
    saveHistory()
  }
  editingNode.value = null
  editingText.value = ''
}

const cancelEditingText = () => {
  editingNode.value = null
  editingText.value = ''
}

// ==================== 选择连接线 ====================
const selectConnection = (conn: Connection) => {
  selectedConnection.value = conn
  selectedNodes.value = []
}

// ==================== 缩放 ====================
const onWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    // Ctrl+滚轮缩放，以鼠标位置为中心
    const rect = canvasWrapper.value?.getBoundingClientRect()
    if (!rect) return
    
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // 鼠标在画布坐标系中的位置（缩放前）
    const canvasX = mouseX / zoom.value - panOffset.x
    const canvasY = mouseY / zoom.value - panOffset.y
    
    // 计算新的缩放值
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.min(2, Math.max(0.25, zoom.value + delta))
    
    // 调整偏移量使鼠标位置保持不变
    panOffset.x = mouseX / newZoom - canvasX
    panOffset.y = mouseY / newZoom - canvasY
    
    zoom.value = newZoom
  } else {
    // 普通滚轮平移画布
    panOffset.x -= e.deltaX / zoom.value
    panOffset.y -= e.deltaY / zoom.value
  }
}

const zoomIn = () => {
  zoom.value = Math.min(2, zoom.value + 0.1)
}

const zoomOut = () => {
  zoom.value = Math.max(0.25, zoom.value - 0.1)
}

const resetZoom = () => {
  zoom.value = 1
  // 将视图居中到内容区域
  centerContent()
}

// 将视图居中到内容区域
const centerContent = () => {
  if (!canvasWrapper.value) return
  
  if (nodes.value.length === 0) {
    // 没有节点时，重置到原点
    panOffset.x = 0
    panOffset.y = 0
    return
  }
  
  // 计算所有节点的边界
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.value.forEach(node => {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  })
  
  // 计算内容中心
  const contentCenterX = (minX + maxX) / 2
  const contentCenterY = (minY + maxY) / 2
  
  // 计算视口中心
  const viewportCenterX = canvasWrapper.value.clientWidth / 2 / zoom.value
  const viewportCenterY = canvasWrapper.value.clientHeight / 2 / zoom.value
  
  // 设置偏移量使内容居中
  panOffset.x = viewportCenterX - contentCenterX
  panOffset.y = viewportCenterY - contentCenterY
}

// ==================== 属性更新 ====================
const updateSelectedNode = () => {
  if (selectedNodes.value.length === 1) {
    const node = nodes.value.find(n => n.id === selectedNodes.value[0])
    if (node) {
      Object.assign(node, selectedNodeProps)
      saveHistory()
    }
  }
}

const updateSelectedConnection = () => {
  if (selectedConnection.value) {
    Object.assign(selectedConnection.value, selectedConnectionProps)
    saveHistory()
  }
}

// ==================== 删除 ====================
const deleteSelected = () => {
  if (selectedNodes.value.length > 0) {
    nodes.value = nodes.value.filter(n => !selectedNodes.value.includes(n.id))
    connections.value = connections.value.filter(
      c => !selectedNodes.value.includes(c.fromNode) && !selectedNodes.value.includes(c.toNode)
    )
    selectedNodes.value = []
    saveHistory()
  }
  if (selectedConnection.value) {
    connections.value = connections.value.filter(c => c.id !== selectedConnection.value!.id)
    selectedConnection.value = null
    saveHistory()
  }
  contextMenu.show = false
}

// ==================== 右键菜单 ====================
const onContextMenu = (e: MouseEvent) => {
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
  contextMenu.show = true
}

// ==================== 复制粘贴 ====================
const copyNodes = () => {
  clipboard.value = nodes.value
    .filter(n => selectedNodes.value.includes(n.id))
    .map(n => ({ ...n }))
}

const pasteNodes = () => {
  const newNodes = clipboard.value.map(n => ({
    ...n,
    id: generateId(),
    x: n.x + 20,
    y: n.y + 20,
    zIndex: nodes.value.length,
    fontSize: n.fontSize || 14
  }))
  nodes.value.push(...newNodes)
  selectedNodes.value = newNodes.map(n => n.id)
  saveHistory()
}

const duplicateNodes = () => {
  copyNodes()
  pasteNodes()
}

// ==================== 层级调整 ====================
const bringToFront = () => {
  const maxZ = Math.max(...nodes.value.map(n => n.zIndex))
  selectedNodes.value.forEach(id => {
    const node = nodes.value.find(n => n.id === id)
    if (node) node.zIndex = maxZ + 1
  })
  saveHistory()
}

const sendToBack = () => {
  const minZ = Math.min(...nodes.value.map(n => n.zIndex))
  selectedNodes.value.forEach(id => {
    const node = nodes.value.find(n => n.id === id)
    if (node) node.zIndex = minZ - 1
  })
  saveHistory()
}

// ==================== 对齐 ====================
const alignNodes = (type: string) => {
  if (selectedNodes.value.length < 2) return

  const selected = nodes.value.filter(n => selectedNodes.value.includes(n.id))

  switch (type) {
    case 'left': {
      const minX = Math.min(...selected.map(n => n.x))
      selected.forEach(n => n.x = minX)
      break
    }
    case 'right': {
      const maxX = Math.max(...selected.map(n => n.x + n.width))
      selected.forEach(n => n.x = maxX - n.width)
      break
    }
    case 'centerH': {
      const avgX = selected.reduce((sum, n) => sum + n.x + n.width / 2, 0) / selected.length
      selected.forEach(n => n.x = avgX - n.width / 2)
      break
    }
    case 'top': {
      const minY = Math.min(...selected.map(n => n.y))
      selected.forEach(n => n.y = minY)
      break
    }
    case 'bottom': {
      const maxY = Math.max(...selected.map(n => n.y + n.height))
      selected.forEach(n => n.y = maxY - n.height)
      break
    }
    case 'centerV': {
      const avgY = selected.reduce((sum, n) => sum + n.y + n.height / 2, 0) / selected.length
      selected.forEach(n => n.y = avgY - n.height / 2)
      break
    }
  }
  saveHistory()
}

// ==================== 清空画布 ====================
const clearCanvas = () => {
  openConfirmDialog({
    title: '清空画布',
    message: '确定要清空画布吗？所有节点和连接都将被删除，此操作无法撤销。',
    confirmText: '清空',
    cancelText: '取消',
    type: 'danger',
    onConfirm: () => {
      nodes.value = []
      connections.value = []
      clearSelection()
      history.value = []
      historyIndex.value = -1
      canvasName.value = '未命名流程图'
      saveHistory()
      // 同步清空当前历史文件的内容
      saveCurrentFileToHistory()
    }
  })
}

// ==================== 导出 ====================
const exportPNG = async () => {
  if (nodes.value.length === 0) {
    alert('画布上没有内容可导出')
    return
  }

  try {
    // 计算所有节点的边界范围
    const padding = 50
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    nodes.value.forEach(node => {
      minX = Math.min(minX, node.x)
      minY = Math.min(minY, node.y)
      maxX = Math.max(maxX, node.x + node.width)
      maxY = Math.max(maxY, node.y + node.height)
    })

    // 计算导出区域大小
    const exportWidth = (maxX - minX) + padding * 2
    const exportHeight = (maxY - minY) + padding * 2

    console.log('导出参数:', { minX, minY, maxX, maxY, exportWidth, exportHeight })

    // 检查尺寸限制
    const maxSize = 16000
    let scale = 2
    if (exportWidth * scale > maxSize || exportHeight * scale > maxSize) {
      scale = Math.min(maxSize / exportWidth, maxSize / exportHeight)
    }

    // 创建离屏容器
    const offscreen = document.createElement('div')
    offscreen.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${exportWidth}px;
      height: ${exportHeight}px;
      background: #ffffff;
      z-index: -9999;
      overflow: visible;
    `
    document.body.appendChild(offscreen)

    const svgNS = 'http://www.w3.org/2000/svg'

    // 先绘制节点（在下层）
    nodes.value.forEach(node => {
      const x = node.x - minX + padding
      const y = node.y - minY + padding

      // 形状
      if (needsSvgShape(node.type)) {
        // 对于SVG形状，需要额外的空间来显示边框
        const strokePadding = node.strokeWidth + 4

        const nodeEl = document.createElement('div')
        nodeEl.style.cssText = `
          position: absolute;
          left: ${x - strokePadding}px;
          top: ${y - strokePadding}px;
          width: ${node.width + strokePadding * 2}px;
          height: ${node.height + strokePadding * 2}px;
          overflow: visible;
        `

        const shapeSvg = document.createElementNS(svgNS, 'svg')
        shapeSvg.setAttribute('width', String(node.width + strokePadding * 2))
        shapeSvg.setAttribute('height', String(node.height + strokePadding * 2))
        shapeSvg.setAttribute('viewBox', `0 0 ${node.width + strokePadding * 2} ${node.height + strokePadding * 2}`)
        shapeSvg.style.cssText = 'position: absolute; inset: 0; overflow: visible;'

        const path = document.createElementNS(svgNS, 'path')
        path.setAttribute('d', getSvgShapePathWithOffset(node, strokePadding))
        path.setAttribute('fill', node.fill)
        path.setAttribute('stroke', node.stroke)
        path.setAttribute('stroke-width', String(node.strokeWidth))
        shapeSvg.appendChild(path)
        nodeEl.appendChild(shapeSvg)

        // 文字 - 使用 foreignObject 支持换行
        if (node.text) {
          const textContainer = document.createElementNS(svgNS, 'foreignObject')
          textContainer.setAttribute('x', String(strokePadding))
          textContainer.setAttribute('y', String(strokePadding))
          textContainer.setAttribute('width', String(node.width))
          textContainer.setAttribute('height', String(node.height))

          const textDiv = document.createElement('div')
          textDiv.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 8px;
            box-sizing: border-box;
            color: ${node.textColor || '#000000'};
            font-size: ${node.fontSize || 14}px;
            font-family: system-ui, -apple-system, sans-serif;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.4;
          `
          textDiv.textContent = node.text

          textContainer.appendChild(textDiv)
          const textSvg = document.createElementNS(svgNS, 'svg')
          textSvg.setAttribute('width', String(node.width + strokePadding * 2))
          textSvg.setAttribute('height', String(node.height + strokePadding * 2))
          textSvg.style.cssText = 'position: absolute; inset: 0;'
          textSvg.appendChild(textContainer)
          nodeEl.appendChild(textSvg)
        }

        offscreen.appendChild(nodeEl)
      } else {
        const nodeEl = document.createElement('div')
        nodeEl.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: ${node.width}px;
          height: ${node.height}px;
        `

        const shapeDiv = document.createElement('div')
        let borderRadius = `${node.borderRadius}px`
        if (node.type === 'circle') borderRadius = '50%'
        else if (node.type === 'terminator') borderRadius = '9999px'
        else if (node.type === 'roundedRect') borderRadius = '12px'

        shapeDiv.style.cssText = `
          position: absolute;
          inset: 0;
          background: ${node.fill};
          border: ${node.strokeWidth}px solid ${node.stroke};
          border-radius: ${borderRadius};
          box-sizing: border-box;
        `
        nodeEl.appendChild(shapeDiv)

        // 文字 - 使用 foreignObject 支持换行
        if (node.text) {
          const textSvg = document.createElementNS(svgNS, 'svg')
          textSvg.setAttribute('width', String(node.width))
          textSvg.setAttribute('height', String(node.height))
          textSvg.style.cssText = 'position: absolute; inset: 0;'

          const foreignObject = document.createElementNS(svgNS, 'foreignObject')
          foreignObject.setAttribute('x', '0')
          foreignObject.setAttribute('y', '0')
          foreignObject.setAttribute('width', String(node.width))
          foreignObject.setAttribute('height', String(node.height))

          const textDiv = document.createElement('div')
          textDiv.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 8px;
            box-sizing: border-box;
            color: ${node.textColor || '#000000'};
            font-size: ${node.fontSize || 14}px;
            font-family: system-ui, -apple-system, sans-serif;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.4;
          `
          textDiv.textContent = node.text

          foreignObject.appendChild(textDiv)
          textSvg.appendChild(foreignObject)
          nodeEl.appendChild(textSvg)
        }

        offscreen.appendChild(nodeEl)
      }
    })

    // 后绘制连接线（在上层，和原画布一致）
    const svg = document.createElementNS(svgNS, 'svg')
    svg.setAttribute('width', String(exportWidth))
    svg.setAttribute('height', String(exportHeight))
    svg.style.cssText = 'position: absolute; left: 0; top: 0; pointer-events: none;'

    connections.value.forEach(conn => {
      const fromNode = nodes.value.find(n => n.id === conn.fromNode)
      const toNode = nodes.value.find(n => n.id === conn.toNode)
      if (!fromNode || !toNode) return

      // 重新计算路径（带偏移）
      const getAnchor = (node: Node, pos: string, customOffset?: { x: number; y: number }) => {
        const x = node.x - minX + padding
        const y = node.y - minY + padding

        // 如果有自定义偏移，使用自定义位置
        if (customOffset) {
          return {
            x: x + node.width * customOffset.x,
            y: y + node.height * customOffset.y
          }
        }

        // 否则使用固定锚点位置
        switch (pos) {
          case 'top': return { x: x + node.width / 2, y: y }
          case 'right': return { x: x + node.width, y: y + node.height / 2 }
          case 'bottom': return { x: x + node.width / 2, y: y + node.height }
          case 'left': return { x: x, y: y + node.height / 2 }
          default: return { x, y }
        }
      }

      const start = getAnchor(fromNode, conn.fromAnchor, conn.fromAnchorOffset)
      const end = getAnchor(toNode, conn.toAnchor, conn.toAnchorOffset)
      const offset = conn.bendOffset || { x: 0, y: 0 }

      let pathD = ''
      if (conn.lineType === 'straight') {
        pathD = `M${start.x},${start.y} L${end.x},${end.y}`
      } else if (conn.lineType === 'curved') {
        const ctrlY = Math.min(start.y, end.y) - 50
        pathD = `M${start.x},${start.y} Q${(start.x + end.x) / 2},${ctrlY} ${end.x},${end.y}`
      } else {
        const isStartH = conn.fromAnchor === 'left' || conn.fromAnchor === 'right'
        const isEndH = conn.toAnchor === 'left' || conn.toAnchor === 'right'
        if (isStartH && isEndH) {
          const midX = (start.x + end.x) / 2 + offset.x
          pathD = `M${start.x},${start.y} L${midX},${start.y} L${midX},${end.y} L${end.x},${end.y}`
        } else if (!isStartH && !isEndH) {
          const midY = (start.y + end.y) / 2 + offset.y
          pathD = `M${start.x},${start.y} L${start.x},${midY} L${end.x},${midY} L${end.x},${end.y}`
        } else if (isStartH) {
          pathD = `M${start.x},${start.y} L${end.x},${start.y} L${end.x},${end.y}`
        } else {
          pathD = `M${start.x},${start.y} L${start.x},${end.y} L${end.x},${end.y}`
        }
      }

      const path = document.createElementNS(svgNS, 'path')
      path.setAttribute('d', pathD)
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke', conn.color || '#000000')
      path.setAttribute('stroke-width', '2')
      if (conn.dashed) path.setAttribute('stroke-dasharray', '5,5')
      svg.appendChild(path)

      // 箭头
      if (conn.arrow !== 'none') {
        const size = 10
        let angle = 0

        // 根据连接线类型计算箭头角度
        if (conn.lineType === 'straight') {
          angle = Math.atan2(end.y - start.y, end.x - start.x)
        } else if (conn.lineType === 'curved') {
          const ctrlX = (start.x + end.x) / 2
          const ctrlY = Math.min(start.y, end.y) - 50
          angle = Math.atan2(end.y - ctrlY, end.x - ctrlX)
        } else {
          // 折线：根据终点锚点方向
          switch (conn.toAnchor) {
            case 'top': angle = Math.PI / 2; break
            case 'bottom': angle = -Math.PI / 2; break
            case 'left': angle = 0; break
            case 'right': angle = Math.PI; break
          }
        }

        const p1 = end
        const p2 = { x: end.x - size * Math.cos(angle - 0.5), y: end.y - size * Math.sin(angle - 0.5) }
        const p3 = { x: end.x - size * Math.cos(angle + 0.5), y: end.y - size * Math.sin(angle + 0.5) }
        const polygon = document.createElementNS(svgNS, 'polygon')
        polygon.setAttribute('points', `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`)
        polygon.setAttribute('fill', conn.color || '#000000')
        polygon.setAttribute('stroke', conn.color || '#000000')
        polygon.setAttribute('stroke-width', '1')
        polygon.setAttribute('stroke-linejoin', 'miter')
        svg.appendChild(polygon)
      }
    })
    offscreen.appendChild(svg)

    console.log('离屏容器已创建，节点数:', offscreen.children.length)

    // 等待渲染
    await new Promise(resolve => setTimeout(resolve, 50))

    // 截取
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(offscreen, {
      backgroundColor: '#ffffff',
      scale: scale,
      logging: true, // 开启日志便于调试
      useCORS: true,
      allowTaint: true
    })

    console.log('Canvas 尺寸:', canvas.width, canvas.height)

    // 清理
    document.body.removeChild(offscreen)

    // 下载
    const link = document.createElement('a')
    link.download = `${canvasName.value || 'flowchart'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    console.log('导出完成')
  } catch (err) {
    console.error('导出PNG失败:', err)
    alert('导出失败: ' + (err as Error).message)
  }
}

const exportJSON = () => {
  const data = {
    name: canvasName.value,
    nodes: nodes.value,
    connections: connections.value
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.download = `${canvasName.value || 'flowchart'}.json`
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}

const exportMermaid = () => {
  if (nodes.value.length === 0) {
    alert('画布上没有内容可导出')
    return
  }

  // 提示用户 Mermaid 的限制
  const userConfirm = confirm(
    '注意：Mermaid 使用自动布局，无法保留画布上的精确位置和样式。\n\n' +
    '导出的流程图可能与画布显示不同。\n\n' +
    '如需保留精确布局，建议使用：\n' +
    '• 导出 PNG（图片格式）\n' +
    '• 导出 HTML（可在浏览器查看）\n' +
    '• 导出 JSON（可重新导入编辑）\n\n' +
    '是否继续导出 Mermaid？'
  )

  if (!userConfirm) return

  // 确定流程图方向（根据节点布局自动判断）
  let direction = 'TD' // 默认从上到下
  let isHorizontal = false

  if (nodes.value.length >= 2) {
    // 计算所有节点的整体布局趋势
    let totalHorizontalSpread = 0
    let totalVerticalSpread = 0

    nodes.value.forEach(node => {
      totalHorizontalSpread += node.x
      totalVerticalSpread += node.y
    })

    const avgX = totalHorizontalSpread / nodes.value.length
    const avgY = totalVerticalSpread / nodes.value.length

    // 计算方差来判断主要分布方向
    let horizontalVariance = 0
    let verticalVariance = 0

    nodes.value.forEach(node => {
      horizontalVariance += Math.pow(node.x - avgX, 2)
      verticalVariance += Math.pow(node.y - avgY, 2)
    })

    // 如果水平方差明显大于垂直方差，说明是横向布局
    if (horizontalVariance > verticalVariance * 1.2) {
      direction = 'LR' // 从左到右
      isHorizontal = true
    }
  }

  // 识别结束节点（没有出边的节点，或者类型为 terminator 且文本包含"结束"）
  const getOutgoingConnections = (nodeId: string) => {
    return connections.value.filter(conn => conn.fromNode === nodeId)
  }

  const isEndNode = (node: Node) => {
    const hasOutgoing = getOutgoingConnections(node.id).length > 0
    const isTerminatorType = node.type === 'terminator'
    const hasEndText = node.text.includes('结束') || node.text.includes('End') || node.text.includes('end')

    // 如果是 terminator 类型且文本包含"结束"，或者没有出边，则认为是结束节点
    return (isTerminatorType && hasEndText) || (!hasOutgoing && nodes.value.length > 1)
  }

  // 根据流程图方向对节点进行排序
  const sortedNodes = [...nodes.value].sort((a, b) => {
    // 结束节点始终排在最后
    const aIsEnd = isEndNode(a)
    const bIsEnd = isEndNode(b)

    if (aIsEnd && !bIsEnd) return 1  // a 是结束节点，排在后面
    if (!aIsEnd && bIsEnd) return -1 // b 是结束节点，排在后面
    if (aIsEnd && bIsEnd) {
      // 如果都是结束节点，按位置排序
      return isHorizontal ? (a.x - b.x) : (a.y - b.y)
    }

    // 非结束节点按位置排序
    if (isHorizontal) {
      // 横向布局：先按 X 坐标排序（从左到右），X 相近时按 Y 排序
      const xDiff = a.x - b.x
      if (Math.abs(xDiff) > 50) { // X 坐标差距超过 50px 才认为是不同列
        return xDiff
      }
      return a.y - b.y // 同一列内按 Y 坐标排序
    } else {
      // 纵向布局：先按 Y 坐标排序（从上到下），Y 相近时按 X 排序
      const yDiff = a.y - b.y
      if (Math.abs(yDiff) > 50) { // Y 坐标差距超过 50px 才认为是不同行
        return yDiff
      }
      return a.x - b.x // 同一行内按 X 坐标排序
    }
  })

  // 生成节点ID映射（使用简短的字母ID）
  const nodeIdMap = new Map<string, string>()
  sortedNodes.forEach((node, index) => {
    nodeIdMap.set(node.id, String.fromCharCode(65 + index)) // A, B, C, ...
  })

  // 根据节点类型生成 Mermaid 节点语法
  const getMermaidNodeSyntax = (node: Node, nodeId: string): string => {
    const text = node.text || '节点'

    switch (node.type) {
      case 'rectangle':
      case 'process':
      case 'roundedRect':
        return `${nodeId}[${text}]`
      case 'circle':
        return `${nodeId}((${text}))`
      case 'diamond':
      case 'decision':
        return `${nodeId}{${text}}`
      case 'terminator':
        return `${nodeId}([${text}])`
      case 'data':
        return `${nodeId}[/${text}/]`
      case 'hexagon':
        return `${nodeId}{{${text}}}`
      case 'triangle':
        return `${nodeId}[${text}]` // Mermaid 没有三角形，用矩形代替
      case 'document':
        return `${nodeId}[${text}]` // Mermaid 没有文档形状，用矩形代替
      case 'database':
        return `${nodeId}[(${text})]`
      default:
        return `${nodeId}[${text}]`
    }
  }

  // 根据连接线类型生成箭头语法
  const getArrowSyntax = (conn: Connection): string => {
    let arrow = '-->'

    if (conn.dashed) {
      arrow = '-.->'
    }

    if (conn.arrow === 'none') {
      arrow = conn.dashed ? '-..-' : '---'
    } else if (conn.arrow === 'both') {
      arrow = conn.dashed ? '<-.->' : '<-->'
    } else if (conn.arrow === 'start') {
      arrow = conn.dashed ? '<-.-' : '<--'
    }

    return arrow
  }

  // 生成 Mermaid 代码
  let mermaidCode = `flowchart ${direction}\n`
  mermaidCode += `%% 注意：Mermaid 使用自动布局，无法保留原始画布的精确位置\n`
  mermaidCode += `%% 如需保留精确布局，请使用"导出 HTML"或"导出 PNG"功能\n\n`

  // 按照节点排序顺序输出连接（确保开始节点的连接在前面）
  if (connections.value.length > 0) {
    // 对连接线按照起始节点的排序顺序进行排序
    const sortedConnections = [...connections.value].sort((a, b) => {
      const fromIndexA = sortedNodes.findIndex(n => n.id === a.fromNode)
      const fromIndexB = sortedNodes.findIndex(n => n.id === b.fromNode)

      // 先按起始节点排序
      if (fromIndexA !== fromIndexB) {
        return fromIndexA - fromIndexB
      }

      // 如果起始节点相同，按目标节点排序
      const toIndexA = sortedNodes.findIndex(n => n.id === a.toNode)
      const toIndexB = sortedNodes.findIndex(n => n.id === b.toNode)
      return toIndexA - toIndexB
    })

    sortedConnections.forEach(conn => {
      const fromId = nodeIdMap.get(conn.fromNode)
      const toId = nodeIdMap.get(conn.toNode)

      if (fromId && toId) {
        const fromNode = nodes.value.find(n => n.id === conn.fromNode)
        const toNode = nodes.value.find(n => n.id === conn.toNode)

        if (fromNode && toNode) {
          const fromSyntax = getMermaidNodeSyntax(fromNode, fromId)
          const toSyntax = getMermaidNodeSyntax(toNode, toId)
          const arrow = getArrowSyntax(conn)

          // 使用用户设置的标签
          const label = conn.label || ''
          const labelSyntax = label ? `|${label}|` : ''

          mermaidCode += `    ${fromSyntax} ${arrow}${labelSyntax} ${toSyntax}\n`
        }
      }
    })
  } else {
    // 如果没有连接线，单独列出所有节点
    sortedNodes.forEach(node => {
      const nodeId = nodeIdMap.get(node.id)
      if (nodeId) {
        mermaidCode += `    ${getMermaidNodeSyntax(node, nodeId)}\n`
      }
    })
  }

  // 添加样式（如果节点有自定义颜色，但排除透明样式）
  sortedNodes.forEach(node => {
    const nodeId = nodeIdMap.get(node.id)
    if (!nodeId) return

    const isTransparent = (node.fill === 'transparent' || node.fill === '#00000000') &&
                         (node.stroke === 'transparent' || node.stroke === '#00000000')
    const isDefaultStyle = node.fill === '#ffffff' && node.stroke === '#000000'

    // 只导出非默认且非透明的样式
    if (!isTransparent && !isDefaultStyle) {
      const fillColor = node.fill.replace('#', '')
      const strokeColor = node.stroke.replace('#', '')
      mermaidCode += `    style ${nodeId} fill:#${fillColor},stroke:#${strokeColor}\n`
    }
  })

  // 下载文件
  const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' })
  const link = document.createElement('a')
  link.download = `${canvasName.value || 'flowchart'}.mmd`
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)

  // 同时复制到剪贴板
  navigator.clipboard.writeText(mermaidCode).then(() => {
    console.log('Mermaid 代码已复制到剪贴板')
  }).catch(err => {
    console.error('复制到剪贴板失败:', err)
  })
}


const exportHTML = () => {
  if (nodes.value.length === 0) {
    alert('画布上没有内容可导出')
    return
  }

  // 计算边界
  const padding = 60
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodes.value.forEach(node => {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  })
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = maxX + padding
  maxY = maxY + padding
  const width = maxX - minX
  const height = maxY - minY

  // 生成形状路径
  const getShapePath = (node: Node) => {
    const x = node.x - minX
    const y = node.y - minY
    const w = node.width
    const h = node.height
    const r = node.borderRadius || 4

    switch (node.type) {
      case 'circle':
        return `<ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}" />`
      case 'diamond':
      case 'decision':
        return `<polygon points="${x + w/2},${y} ${x + w},${y + h/2} ${x + w/2},${y + h} ${x},${y + h/2}" />`
      case 'triangle':
        return `<polygon points="${x + w/2},${y} ${x + w},${y + h} ${x},${y + h}" />`
      case 'hexagon':
        return `<polygon points="${x + w*0.25},${y} ${x + w*0.75},${y} ${x + w},${y + h/2} ${x + w*0.75},${y + h} ${x + w*0.25},${y + h} ${x},${y + h/2}" />`
      case 'data':
        return `<polygon points="${x + w*0.1},${y} ${x + w},${y} ${x + w*0.9},${y + h} ${x},${y + h}" />`
      case 'terminator':
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" ry="${h/2}" />`
      case 'roundedRect':
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" ry="12" />`
      default:
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" />`
    }
  }

  // 生成连接线
  const getConnPath = (conn: Connection) => {
    const fromNode = nodes.value.find(n => n.id === conn.fromNode)
    const toNode = nodes.value.find(n => n.id === conn.toNode)
    if (!fromNode || !toNode) return ''

    const getAnchor = (node: Node, pos: string) => {
      const x = node.x - minX
      const y = node.y - minY
      switch (pos) {
        case 'top': return { x: x + node.width/2, y: y }
        case 'right': return { x: x + node.width, y: y + node.height/2 }
        case 'bottom': return { x: x + node.width/2, y: y + node.height }
        case 'left': return { x: x, y: y + node.height/2 }
        default: return { x, y }
      }
    }

    const start = getAnchor(fromNode, conn.fromAnchor)
    const end = getAnchor(toNode, conn.toAnchor)
    const offset = conn.bendOffset || { x: 0, y: 0 }

    let path = ''
    if (conn.lineType === 'straight') {
      path = `M${start.x},${start.y} L${end.x},${end.y}`
    } else if (conn.lineType === 'curved') {
      const ctrlY = Math.min(start.y, end.y) - 50
      path = `M${start.x},${start.y} Q${(start.x + end.x)/2},${ctrlY} ${end.x},${end.y}`
    } else {
      const isStartH = conn.fromAnchor === 'left' || conn.fromAnchor === 'right'
      const isEndH = conn.toAnchor === 'left' || conn.toAnchor === 'right'
      if (isStartH && isEndH) {
        const midX = (start.x + end.x)/2 + offset.x
        path = `M${start.x},${start.y} L${midX},${start.y} L${midX},${end.y} L${end.x},${end.y}`
      } else if (!isStartH && !isEndH) {
        const midY = (start.y + end.y)/2 + offset.y
        path = `M${start.x},${start.y} L${start.x},${midY} L${end.x},${midY} L${end.x},${end.y}`
      } else if (isStartH) {
        path = `M${start.x},${start.y} L${end.x},${start.y} L${end.x},${end.y}`
      } else {
        path = `M${start.x},${start.y} L${start.x},${end.y} L${end.x},${end.y}`
      }
    }

    // 箭头
    let arrow = ''
    if (conn.arrow !== 'none') {
      const size = 10
      let angle = 0

      // 根据连接线类型计算箭头角度
      if (conn.lineType === 'straight') {
        // 直线：使用起点到终点的角度
        angle = Math.atan2(end.y - start.y, end.x - start.x)
      } else if (conn.lineType === 'curved') {
        // 曲线：使用控制点到终点的切线角度
        const ctrlX = (start.x + end.x) / 2
        const ctrlY = Math.min(start.y, end.y) - 50
        angle = Math.atan2(end.y - ctrlY, end.x - ctrlX)
      } else {
        // 折线：根据终点锚点方向
        switch (conn.toAnchor) {
          case 'top': angle = Math.PI/2; break
          case 'bottom': angle = -Math.PI/2; break
          case 'left': angle = 0; break
          case 'right': angle = Math.PI; break
        }
      }

      const p1 = end
      const p2 = { x: end.x - size * Math.cos(angle - 0.5), y: end.y - size * Math.sin(angle - 0.5) }
      const p3 = { x: end.x - size * Math.cos(angle + 0.5), y: end.y - size * Math.sin(angle + 0.5) }
      arrow = `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="${conn.color || '#000'}" stroke="none" />`
    }

    return `<path d="${path}" fill="none" stroke="${conn.color || '#000'}" stroke-width="2" ${conn.dashed ? 'stroke-dasharray="5,5"' : ''} />${arrow}`
  }

  // 生成SVG内容
  let shapesHtml = ''
  nodes.value.forEach(node => {
    const fill = node.fill || '#ffffff'
    const stroke = node.stroke || '#000000'
    const strokeWidth = node.strokeWidth || 2
    shapesHtml += `<g fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}">${getShapePath(node)}</g>\n`
    // 文字
    const x = node.x - minX + node.width/2
    const y = node.y - minY + node.height/2
    const fontSize = node.fontSize || 14
    const textColor = node.textColor || '#000000'
    if (node.text) {
      shapesHtml += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="${fontSize}px" font-family="system-ui, sans-serif">${node.text}</text>\n`
    }
  })

  let connsHtml = ''
  connections.value.forEach(conn => {
    connsHtml += getConnPath(conn) + '\n'
  })

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${canvasName.value || '流程图'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      background: #f8fafc;
      padding: 40px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 100%;
    }
    h1 {
      text-align: center;
      color: #1e293b;
      margin-bottom: 30px;
      font-family: system-ui, sans-serif;
      font-size: 28px;
    }
    .svg-container {
      overflow: auto;
    }
    svg {
      display: block;
      min-width: ${Math.max(width, 600)}px;
      min-height: ${Math.max(height, 400)}px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${canvasName.value || '流程图'}</h1>
    <div class="svg-container">
      <svg width="${Math.max(width, 600)}" height="${Math.max(height, 400)}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background: #fff;">
        <!-- 连接线 -->
        ${connsHtml}
        <!-- 形状和文字 -->
        ${shapesHtml}
      </svg>
    </div>
  </div>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const link = document.createElement('a')
  link.download = `${canvasName.value || 'flowchart'}.html`
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}

const importJSON = () => {
  fileInput.value?.click()
}

const handleFileImport = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string)
      if (data.nodes && data.connections) {
        canvasName.value = data.name || '导入的流程图'

        // 确保节点数据兼容性，为缺失的字段添加默认值
        nodes.value = data.nodes.map((n: Node) => ({
          ...n,
          fontSize: n.fontSize || 14,
          borderRadius: n.borderRadius ?? 4,
          zIndex: n.zIndex ?? 0
        }))

        // 确保连接线数据兼容性，为缺失的字段添加默认值
        connections.value = data.connections.map((c: Connection) => ({
          ...c,
          bendOffset: c.bendOffset || { x: 0, y: 0 },
          label: c.label || '',
          labelOffset: c.labelOffset || { x: 0, y: 0 },
          labelFontSize: c.labelFontSize || 14,
          labelFontWeight: c.labelFontWeight || 'normal',
          labelColor: c.labelColor || '#000000',
          fromAnchorOffset: c.fromAnchorOffset || undefined,
          toAnchorOffset: c.toAnchorOffset || undefined
        }))

        clearSelection()
        saveHistory()
      }
    } catch (err) {
      alert('导入失败：文件格式不正确')
    }
  }
  reader.readAsText(file)
  if (fileInput.value) fileInput.value.value = ''
}

const importMermaid = () => {
  mermaidFileInput.value?.click()
}

const handleMermaidImport = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const mermaidCode = event.target?.result as string
      parseMermaidToCanvas(mermaidCode)
    } catch (err) {
      alert('导入失败：' + (err as Error).message)
    }
  }
  reader.readAsText(file)
  if (mermaidFileInput.value) mermaidFileInput.value.value = ''
}

// 解析 Mermaid 代码并转换为画布节点
const parseMermaidToCanvas = (mermaidCode: string) => {
  try {
    // 提取流程图内容
    const lines = mermaidCode.trim().split('\n')
    const flowchartLine = lines.find(line => line.trim().startsWith('flowchart'))

    if (!flowchartLine) {
      throw new Error('不是有效的 Mermaid 流程图格式')
    }

    // 解析方向
    const direction = flowchartLine.includes('LR') ? 'LR' : 'TD'
    const isHorizontal = direction === 'LR'

    // 存储节点和连接
    const nodeMap = new Map<string, { text: string; type: string }>()
    const connectionList: Array<{ from: string; to: string; label?: string }> = []

    // 解析每一行
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('flowchart') || trimmed.startsWith('style')) continue

      // 匹配连接线: A[文本] --> B[文本] 或 A -->|label| B
      const connMatch = trimmed.match(/(\w+)((?:\[.+?\]|\(.+?\)|\(\(.+?\)\)|\{.+?\}|\[\(.+?\)\]))?[\s]*(-+>|<-+>|<-+|\.-+>|<\.-+>|<\.-+)(?:\|(.+?)\|)?[\s]*(\w+)((?:\[.+?\]|\(.+?\)|\(\(.+?\)\)|\{.+?\}|\[\(.+?\)\]))?/)

      if (connMatch) {
        const fromId = connMatch[1]
        const fromDef = connMatch[2]
        const label = connMatch[4]
        const toId = connMatch[5]
        const toDef = connMatch[6]

        // 从连接线中提取节点定义
        if (fromDef && !nodeMap.has(fromId)) {
          const nodeInfo = parseNodeDefinition(fromId, fromDef)
          if (nodeInfo) nodeMap.set(fromId, nodeInfo)
        }
        if (toDef && !nodeMap.has(toId)) {
          const nodeInfo = parseNodeDefinition(toId, toDef)
          if (nodeInfo) nodeMap.set(toId, nodeInfo)
        }

        connectionList.push({ from: fromId, to: toId, label })
        continue
      }

      // 匹配单独的节点定义: A[文本] 或 A{文本} 等
      const nodeMatch = trimmed.match(/^(\w+)([\[\(\{])(.+?)([\]\)\}])$/)
      if (nodeMatch) {
        const id = nodeMatch[1]
        const nodeInfo = parseNodeDefinition(id, nodeMatch[0].substring(id.length))
        if (nodeInfo) nodeMap.set(id, nodeInfo)
      }
    }

    // 解析节点定义的辅助函数
    function parseNodeDefinition(id: string, def: string): { text: string; type: string } | null {
      // 匹配 [文本], (文本), ((文本)), {文本}, [(文本)]
      let match = def.match(/^\[(.+?)\]$/)
      if (match) return { text: match[1], type: 'rectangle' }

      match = def.match(/^\[\((.+?)\)\]$/)
      if (match) return { text: match[1], type: 'terminator' }

      match = def.match(/^\(\((.+?)\)\)$/)
      if (match) return { text: match[1], type: 'circle' }

      match = def.match(/^\((.+?)\)$/)
      if (match) return { text: match[1], type: 'terminator' }

      match = def.match(/^\{(.+?)\}$/)
      if (match) return { text: match[1], type: 'diamond' }

      return null
    }

    // 检查是否解析到节点
    if (nodeMap.size === 0) {
      console.error('未能解析到任何节点')
      console.log('Mermaid 代码:', mermaidCode)
      throw new Error('未能解析到任何节点，请检查 Mermaid 代码格式')
    }

    console.log('解析到的节点:', Array.from(nodeMap.entries()))
    console.log('解析到的连接:', connectionList)

    // 创建节点
    const newNodes: Node[] = []
    const nodePositions = new Map<string, { x: number; y: number }>()

    // 使用拓扑排序确定节点位置
    const visited = new Set<string>()
    const levels = new Map<string, number>()

    // 计算每个节点的层级
    const calculateLevel = (nodeId: string, level: number = 0) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const currentLevel = levels.get(nodeId) || 0
      levels.set(nodeId, Math.max(currentLevel, level))

      // 找到所有从这个节点出发的连接
      const outgoing = connectionList.filter(c => c.from === nodeId)
      outgoing.forEach(conn => {
        calculateLevel(conn.to, level + 1)
      })
    }

    // 从所有起始节点开始计算
    const startNodes = Array.from(nodeMap.keys()).filter(id =>
      !connectionList.some(c => c.to === id)
    )

    if (startNodes.length === 0 && nodeMap.size > 0) {
      // 如果没有明确的起始节点，使用第一个节点
      calculateLevel(Array.from(nodeMap.keys())[0])
    } else {
      startNodes.forEach(id => calculateLevel(id))
    }

    // 按层级组织节点
    const levelGroups = new Map<number, string[]>()
    levels.forEach((level, nodeId) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(nodeId)
    })

    // 生成节点位置
    const spacing = isHorizontal ? { x: 200, y: 150 } : { x: 200, y: 150 }
    const startPos = { x: 100, y: 100 }

    levelGroups.forEach((nodeIds, level) => {
      nodeIds.forEach((nodeId, index) => {
        const nodeInfo = nodeMap.get(nodeId)
        if (!nodeInfo) return

        const x = isHorizontal
          ? startPos.x + level * spacing.x
          : startPos.x + index * spacing.x
        const y = isHorizontal
          ? startPos.y + index * spacing.y
          : startPos.y + level * spacing.y

        nodePositions.set(nodeId, { x, y })

        const width = nodeInfo.type === 'circle' ? 100 : 120
        const height = nodeInfo.type === 'circle' ? 100 : 60

        newNodes.push({
          id: generateId(),
          type: nodeInfo.type,
          x,
          y,
          width,
          height,
          text: nodeInfo.text,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 2,
          textColor: '#000000',
          borderRadius: nodeInfo.type === 'roundedRect' ? 12 : 4,
          zIndex: newNodes.length,
          fontSize: 14
        })
      })
    })

    // 创建连接线
    const newConnections: Connection[] = []
    connectionList.forEach(conn => {
      const fromNode = newNodes.find(n => {
        const fromPos = nodePositions.get(conn.from)
        return fromPos && n.x === fromPos.x && n.y === fromPos.y
      })
      const toNode = newNodes.find(n => {
        const toPos = nodePositions.get(conn.to)
        return toPos && n.x === toPos.x && n.y === toPos.y
      })

      if (fromNode && toNode) {
        newConnections.push({
          id: generateId(),
          fromNode: fromNode.id,
          fromAnchor: isHorizontal ? 'right' : 'bottom',
          toNode: toNode.id,
          toAnchor: isHorizontal ? 'left' : 'top',
          color: '#000000',
          dashed: false,
          arrow: 'end',
          lineType: 'orthogonal',
          label: conn.label || '',
          bendOffset: { x: 0, y: 0 }
        })
      }
    })

    // 更新画布
    nodes.value = newNodes
    connections.value = newConnections
    canvasName.value = '导入的 Mermaid 流程图'
    clearSelection()
    saveHistory()

    // 居中显示
    nextTick(() => {
      centerContent()
    })

  } catch (err) {
    console.error('解析 Mermaid 失败:', err)
    throw new Error('解析 Mermaid 代码失败，请检查格式是否正确')
  }
}

// ==================== 键盘快捷键 ====================
const handleKeyDown = (e: KeyboardEvent) => {
  // 如果正在编辑节点文字，不处理快捷键
  if (editingNode.value) return

  // 如果焦点在输入框或文本区域，不处理删除快捷键
  const target = e.target as HTMLElement
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    toggleAiPanel()
    return
  }

  // 空格键临时启用拖动模式
  if (e.code === 'Space' && !e.repeat) {
    isSpacePressed.value = true
    e.preventDefault()
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault()
    redo()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    e.preventDefault()
    copyNodes()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault()
    pasteNodes()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault()
    duplicateNodes()
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault()
    selectedNodes.value = nodes.value.map(n => n.id)
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteSelected()
  }
  if (e.key === 'Escape') {
    clearSelection()
    contextMenu.show = false
  }
}

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code === 'Space') {
    isSpacePressed.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  
  // 数据已在组件初始化时同步加载，这里只需要处理一些后续逻辑
  
  // 如果有当前文件，保存文件ID到localStorage（确保一致性）
  if (currentFileId.value) {
    localStorage.setItem(CURRENT_FILE_KEY, currentFileId.value)
  }
  
  // 如果没有保存的视图状态且有节点，居中显示内容
  if (!initialData.viewState && nodes.value.length > 0) {
    nextTick(() => {
      centerContent()
    })
  }
  
  // 初始化历史记录
  if (isInitialized.value) {
    saveHistory()
  }
  
  // 如果需要显示新建弹窗，聚焦输入框
  if (showNewFileDialog.value) {
    nextTick(() => {
      newFileNameInput.value?.focus()
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  // 保存当前文件到历史
  saveCurrentFileToHistory()
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
})
</script>

<style scoped>
.propInput {
  @apply w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500;
}

.contextMenuItem {
  @apply w-full px-3 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2 transition-colors;
}

/* 确认弹窗动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-leave-active {
  transition: all 0.2s ease-in;
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

.scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
