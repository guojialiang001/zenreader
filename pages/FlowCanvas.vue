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

        <!-- 导出 -->
        <button @click="exportPNG" :class="toolbarBtnClass" title="导出PNG">
          <ImageIcon class="w-4 h-4" />
        </button>
        <button @click="exportHTML" :class="toolbarBtnClass" title="导出HTML">
          <Code class="w-4 h-4" />
        </button>
        <button @click="exportJSON" :class="toolbarBtnClass" title="导出JSON">
          <FileJson class="w-4 h-4" />
        </button>
        <button @click="importJSON" :class="toolbarBtnClass" title="导入JSON">
          <Upload class="w-4 h-4" />
        </button>
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
  Hand, FolderOpen, Plus
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
  fromAnchor: string
  toNode: string
  toAnchor: string
  color: string
  dashed: boolean
  arrow: 'none' | 'start' | 'end' | 'both'
  lineType: string
  // 折线控制点偏移（相对于自动计算的中点）
  bendOffset?: { x: number; y: number }
}

interface Anchor {
  position: string
  x: number
  y: number
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

const selectedNodeProps = reactive({
  x: 0, y: 0, width: 0, height: 0,
  fill: '#ffffff', stroke: '#000000', strokeWidth: 2,
  textColor: '#000000', borderRadius: 4, fontSize: 14
})

const selectedConnectionProps = reactive({
  color: '#000000',
  dashed: false,
  arrow: 'end' as 'none' | 'start' | 'end' | 'both'
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
})

watch(selectedConnection, (conn) => {
  if (conn) {
    Object.assign(selectedConnectionProps, {
      color: conn.color,
      dashed: conn.dashed,
      arrow: conn.arrow
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

const getAnchorPosition = (node: Node, position: string) => {
  switch (position) {
    case 'top': return { x: node.x + node.width / 2, y: node.y }
    case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 }
    case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height }
    case 'left': return { x: node.x, y: node.y + node.height / 2 }
    default: return { x: node.x, y: node.y }
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

  const start = getAnchorPosition(fromNode, conn.fromAnchor)
  const end = getAnchorPosition(toNode, conn.toAnchor)

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
      // 两端都是垂直出口：先垂直再水平再垂直
      const midY = (start.y + end.y) / 2 + offset.y
      return `M${start.x},${start.y} L${start.x},${midY} L${end.x},${midY} L${end.x},${end.y}`
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

  const start = getAnchorPosition(fromNode, conn.fromAnchor)
  const end = getAnchorPosition(toNode, conn.toAnchor)
  const offset = conn.bendOffset || { x: 0, y: 0 }

  const isStartHorizontal = conn.fromAnchor === 'left' || conn.fromAnchor === 'right'
  const isEndHorizontal = conn.toAnchor === 'left' || conn.toAnchor === 'right'

  if (isStartHorizontal && isEndHorizontal) {
    // 控制点在中间垂直线上
    const midX = (start.x + end.x) / 2 + offset.x
    const midY = (start.y + end.y) / 2
    return { x: midX, y: midY, direction: 'horizontal' }
  } else if (!isStartHorizontal && !isEndHorizontal) {
    // 控制点在中间水平线上
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2 + offset.y
    return { x: midX, y: midY, direction: 'vertical' }
  }
  return null
}

const getArrowPoints = (conn: Connection) => {
  const fromNode = nodes.value.find(n => n.id === conn.fromNode)
  const toNode = nodes.value.find(n => n.id === conn.toNode)
  if (!fromNode || !toNode) return ''

  const start = getAnchorPosition(fromNode, conn.fromAnchor)
  const end = getAnchorPosition(toNode, conn.toAnchor)
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

  if (isDrawingConnection.value) {
    const pos = getMousePosition(e)
    connectionEnd.x = pos.x
    connectionEnd.y = pos.y
  }
}

const onCanvasMouseUp = (e: MouseEvent) => {
  if (isDragging.value || isResizing.value || isDraggingBend.value) {
    saveHistory()
  }

  if (isDrawingConnection.value && connectionStart.value) {
    // 查找目标锚点
    const pos = getMousePosition(e)
    let targetNode: Node | null = null
    let targetAnchor: Anchor | null = null

    for (const node of nodes.value) {
      if (node.id === connectionStart.value.node.id) continue
      const anchors = getNodeAnchors(node)
      for (const anchor of anchors) {
        const anchorPos = getAnchorPosition(node, anchor.position)
        const dist = Math.sqrt((pos.x - anchorPos.x) ** 2 + (pos.y - anchorPos.y) ** 2)
        if (dist < 20) {
          targetNode = node
          targetAnchor = anchor
          break
        }
      }
      if (targetNode) break
    }

    if (targetNode && targetAnchor) {
      const newConn: Connection = {
        id: generateId(),
        fromNode: connectionStart.value.node.id,
        fromAnchor: connectionStart.value.anchor.position,
        toNode: targetNode.id,
        toAnchor: targetAnchor.position,
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
  connectionStart.value = null
  draggingConnection.value = null
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

        // 文字 - 使用 SVG 确保居中
        if (node.text) {
          const textSvg = document.createElementNS(svgNS, 'svg')
          textSvg.setAttribute('width', String(node.width + strokePadding * 2))
          textSvg.setAttribute('height', String(node.height + strokePadding * 2))
          textSvg.style.cssText = 'position: absolute; inset: 0;'

          const text = document.createElementNS(svgNS, 'text')
          text.setAttribute('x', String(node.width / 2 + strokePadding))
          text.setAttribute('y', String(node.height / 2 + strokePadding))
          text.setAttribute('text-anchor', 'middle')
          text.setAttribute('dominant-baseline', 'central')
          text.setAttribute('fill', node.textColor || '#000000')
          text.setAttribute('font-size', String(node.fontSize || 14))
          text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif')
          text.textContent = node.text
          textSvg.appendChild(text)
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

        // 文字 - 使用 SVG 确保居中
        if (node.text) {
          const textSvg = document.createElementNS(svgNS, 'svg')
          textSvg.setAttribute('width', String(node.width))
          textSvg.setAttribute('height', String(node.height))
          textSvg.style.cssText = 'position: absolute; inset: 0;'

          const text = document.createElementNS(svgNS, 'text')
          text.setAttribute('x', String(node.width / 2))
          text.setAttribute('y', String(node.height / 2))
          text.setAttribute('text-anchor', 'middle')
          text.setAttribute('dominant-baseline', 'central')
          text.setAttribute('fill', node.textColor || '#000000')
          text.setAttribute('font-size', String(node.fontSize || 14))
          text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif')
          text.textContent = node.text
          textSvg.appendChild(text)
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
      const getAnchor = (node: Node, pos: string) => {
        const x = node.x - minX + padding
        const y = node.y - minY + padding
        switch (pos) {
          case 'top': return { x: x + node.width / 2, y: y }
          case 'right': return { x: x + node.width, y: y + node.height / 2 }
          case 'bottom': return { x: x + node.width / 2, y: y + node.height }
          case 'left': return { x: x, y: y + node.height / 2 }
          default: return { x, y }
        }
      }

      const start = getAnchor(fromNode, conn.fromAnchor)
      const end = getAnchor(toNode, conn.toAnchor)
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
        // 确保旧数据兼容性，为没有fontSize的节点添加默认值
        nodes.value = data.nodes.map((n: Node) => ({
          ...n,
          fontSize: n.fontSize || 14
        }))
        connections.value = data.connections
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

// ==================== 键盘快捷键 ====================
const handleKeyDown = (e: KeyboardEvent) => {
  if (editingNode.value) return

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
