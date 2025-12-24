
<template>
  <div
    class="h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col overflow-hidden"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 拖拽提示遮罩 -->
    <Transition name="fade">
      <div v-if="isDragging" class="absolute inset-0 bg-slate-900/90 z-50 flex items-center justify-center pointer-events-none">
        <div class="text-center">
          <Upload class="w-16 h-16 text-brand-400 mx-auto mb-4 animate-bounce" />
          <p class="text-xl text-white font-medium">松开鼠标打开文件</p>
          <p class="text-slate-400 mt-2">支持拖入文件或文件夹</p>
        </div>
      </div>
    </Transition>
    
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <RouterLink to="/" class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors" title="返回首页">
          <Home class="w-4 h-4" />
        </RouterLink>
        
        <div class="h-6 w-px bg-slate-600"></div>
        
        <!-- 文件下拉菜单触发按钮 -->
        <div class="relative" ref="fileMenuTrigger">
          <button
            @click="toggleFileMenu"
            class="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors text-sm"
          >
            <FileCode class="w-4 h-4" />
            <span>文件</span>
            <ChevronDown class="w-3 h-3" :class="showFileMenu ? 'rotate-180' : ''" />
          </button>
        </div>
        
        <div class="h-6 w-px bg-slate-600"></div>
        
        <!-- 资源管理器切换 -->
        <button
          @click="showExplorer = !showExplorer"
          class="p-2 rounded-lg transition-colors"
          :class="showExplorer ? 'bg-brand-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'"
          title="资源管理器"
        >
          <Folders class="w-4 h-4" />
        </button>
        
        <div class="h-6 w-px bg-slate-600"></div>
        
        <!-- 当前文件名显示 -->
        <div v-if="currentFile" class="flex items-center gap-2">
          <component :is="getFileIcon(currentFile.name)" class="w-5 h-5 text-brand-400" />
          <span class="text-white font-medium text-sm">{{ currentFile.name }}</span>
          <span v-if="currentFile.isModified" class="w-2 h-2 rounded-full bg-orange-400" title="未保存"></span>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- 语言选择 -->
        <select
          v-model="language"
          class="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option v-for="lang in languages" :key="lang.id" :value="lang.id">{{ lang.name }}</option>
        </select>
        
        <!-- 主题选择 -->
        <select
          v-model="theme"
          class="bg-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="vs-dark">深色主题</option>
          <option value="vs">浅色主题</option>
          <option value="hc-black">高对比度</option>
        </select>
        
        <div class="h-6 w-px bg-slate-600 mx-2"></div>
        
        <!-- 快捷键帮助 -->
        <button @click="showShortcuts = true" class="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors text-sm">
          <Keyboard class="w-4 h-4" />
          <span>快捷键</span>
        </button>
      </div>
    </div>
    
    <!-- 主内容区 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 资源管理器侧边栏 -->
      <Transition name="slide">
        <div v-if="showExplorer" class="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <!-- 文件树区域 -->
          <div class="flex-1 overflow-y-auto file-tree-container">
            <!-- 空状态 -->
            <div v-if="!folderTree && standaloneFiles.length === 0" class="p-4 text-center text-slate-500 text-sm">
              <FolderOpen class="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无打开的文件</p>
              <p class="text-xs mt-1">拖入文件或文件夹</p>
            </div>
            
            <!-- 文件夹树 -->
            <div v-if="folderTree" class="py-1">
              <FileTreeNode
                :node="folderTree"
                :depth="0"
                :currentFilePath="currentFile?.path"
                :showCloseButton="true"
                @select="handleTreeNodeSelect"
                @toggle="handleTreeNodeToggle"
                @close="closeFolder"
              />
            </div>
            
            <!-- 分隔线（当同时有文件夹和单独文件时） -->
            <div v-if="folderTree && standaloneFiles.length > 0" class="mx-2 my-2 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
            
            <!-- 单独打开的文件（文件树形式） -->
            <div v-if="standaloneFiles.length > 0" class="py-1">
              <FileTreeNode
                v-for="fileNode in standaloneFileNodes"
                :key="fileNode.path"
                :node="fileNode"
                :depth="0"
                :currentFilePath="currentFile?.path"
                :showCloseButton="true"
                @select="handleStandaloneFileSelect"
                @close="closeStandaloneFile"
              />
            </div>
          </div>
          
          <!-- 操作提示 -->
          <div class="p-3 border-t border-slate-700 text-xs text-slate-500">
            点击文件进行编辑，右键可重命名或导出
          </div>
        </div>
      </Transition>
      
      <!-- 编辑器主体 -->
      <div class="flex-1 relative">
        <div ref="editorContainer" class="absolute inset-0"></div>
        
        <!-- 加载状态 -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10">
          <div class="flex flex-col items-center gap-4">
            <Loader2 class="w-10 h-10 text-brand-500 animate-spin" />
            <span class="text-slate-400">加载编辑器中...</span>
          </div>
        </div>
        
        <!-- 无文件提示 -->
        <div v-if="!loading && files.length === 0" class="absolute inset-0 flex items-center justify-center">
          <div class="text-center">
            <FileCode class="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 class="text-xl font-medium text-slate-400 mb-2">开始编辑</h3>
            <p class="text-slate-500 mb-4">创建新文件或打开现有文件</p>
            <div class="flex gap-3 justify-center">
              <button @click="createNewFile" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm flex items-center gap-2">
                <FilePlus class="w-4 h-4" />
                新建文件
              </button>
              <button @click="openFile" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm flex items-center gap-2">
                <FolderOpen class="w-4 h-4" />
                打开文件
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部状态栏 -->
    <div class="flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
      <div class="flex items-center gap-4">
        <span v-if="currentFile" class="flex items-center gap-1.5">
          <div class="w-2 h-2 rounded-full" :class="currentFile.isModified ? 'bg-orange-400' : 'bg-green-400'"></div>
          {{ currentFile.isModified ? '已修改' : '已保存' }}
        </span>
        <span>行 {{ cursorPosition.line }}, 列 {{ cursorPosition.column }}</span>
        <span>{{ lineCount }} 行</span>
      </div>
      <div class="flex items-center gap-4">
        <span v-if="cursorCount > 1" class="text-brand-400">{{ cursorCount }} 个光标</span>
        <span>{{ language.toUpperCase() }}</span>
        <span>UTF-8</span>
        <span>{{ contentSize }}</span>
      </div>
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      multiple
      @change="handleFileOpen"
      accept=".txt,.js,.ts,.vue,.json,.html,.css,.md,.py,.java,.cpp,.c,.go,.rs,.php,.rb,.swift,.kt,.yml,.yaml,.xml,.sh,.sql"
    />
    
    <!-- 保存成功提示 - 美化版 -->
    <Teleport to="body">
      <Transition name="toast-slide">
        <div v-if="showToast" class="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300]">
          <div class="relative flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-800 rounded-2xl shadow-2xl border border-slate-600/50 backdrop-blur-xl overflow-hidden">
            <!-- 左侧装饰条 -->
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b" :class="toastType === 'success' ? 'from-emerald-400 to-green-500' : toastType === 'error' ? 'from-red-400 to-rose-500' : 'from-blue-400 to-cyan-500'"></div>
            
            <!-- 图标 -->
            <div class="relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" :class="toastType === 'success' ? 'bg-emerald-500/20' : toastType === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20'">
              <Check v-if="toastType === 'success'" class="w-5 h-5 text-emerald-400" />
              <X v-else-if="toastType === 'error'" class="w-5 h-5 text-red-400" />
              <FileCode v-else class="w-5 h-5 text-blue-400" />
              <!-- 脉冲动画 -->
              <div class="absolute inset-0 rounded-xl animate-ping opacity-20" :class="toastType === 'success' ? 'bg-emerald-400' : toastType === 'error' ? 'bg-red-400' : 'bg-blue-400'" style="animation-duration: 1.5s;"></div>
            </div>
            
            <!-- 文本内容 -->
            <div class="flex flex-col">
              <span class="text-white font-medium text-sm">{{ toastMessage }}</span>
              <span class="text-slate-400 text-xs mt-0.5">{{ toastSubMessage }}</span>
            </div>
            
            <!-- 右侧关闭按钮 -->
            <button
              @click="showToast = false"
              class="ml-3 p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <X class="w-4 h-4" />
            </button>
            
            <!-- 进度条 -->
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700/50">
              <div
                class="h-full transition-all duration-100 ease-linear"
                :class="toastType === 'success' ? 'bg-emerald-400' : toastType === 'error' ? 'bg-red-400' : 'bg-blue-400'"
                :style="{ width: toastProgress + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 右键菜单 - 美化版 -->
    <Teleport to="body">
      <Transition name="context-menu">
        <div
          v-if="contextMenu.show"
          class="fixed bg-gradient-to-b from-slate-800 to-slate-850 border border-slate-600/50 rounded-2xl shadow-2xl py-2 z-[200] min-w-[180px] backdrop-blur-xl"
          :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
          @click.stop
        >
          <div class="px-3 pb-2 mb-1 border-b border-slate-700/50">
            <p class="text-xs text-slate-500 font-medium">文件操作</p>
          </div>
          <button
            @click="renameFile"
            class="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-brand-600/20 hover:text-white flex items-center gap-3 transition-all duration-150"
          >
            <div class="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Pencil class="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span>重命名</span>
          </button>
          <button
            @click="exportFile(contextMenu.file!)"
            class="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-brand-600/20 hover:text-white flex items-center gap-3 transition-all duration-150"
          >
            <div class="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Download class="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span>导出文件</span>
          </button>
          <div class="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent my-2 mx-3"></div>
          <button
            @click="closeFileFromMenu"
            class="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center gap-3 transition-all duration-150"
          >
            <div class="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
              <X class="w-3.5 h-3.5 text-red-400" />
            </div>
            <span>关闭文件</span>
          </button>
        </div>
      </Transition>
      <div v-if="contextMenu.show" class="fixed inset-0 z-[199]" @click="closeContextMenu"></div>
    </Teleport>
    
    <!-- 重命名弹窗 - 美化版 -->
    <Teleport to="body">
      <Transition name="save-modal">
        <div v-if="showRenameModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="showRenameModal = false">
          <!-- 背景遮罩 -->
          <div class="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md"></div>
          
          <!-- 弹窗主体 -->
          <div class="relative bg-gradient-to-b from-slate-800 to-slate-850 rounded-3xl shadow-2xl w-full max-w-md border border-slate-600/50 overflow-hidden transform transition-all">
            <!-- 顶部装饰条 -->
            <div class="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>
            
            <!-- 头部 -->
            <div class="relative p-6 pb-4">
              <!-- 关闭按钮 -->
              <button
                @click="showRenameModal = false"
                class="absolute top-4 right-4 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-all duration-200 hover:rotate-90"
              >
                <X class="w-4 h-4" />
              </button>
              
              <!-- 图标和标题 -->
              <div class="flex flex-col items-center text-center">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4 ring-2 ring-blue-500/30">
                  <Pencil class="w-8 h-8 text-blue-400" />
                </div>
                <h3 class="text-xl font-bold text-white mb-1">重命名文件</h3>
                <p class="text-sm text-slate-400">修改文件名称</p>
              </div>
            </div>
            
            <!-- 内容区 -->
            <div class="px-6 pb-4">
              <!-- 输入卡片 -->
              <div class="bg-slate-700/30 rounded-2xl p-4 border border-slate-600/30">
                <label class="block text-xs text-slate-400 mb-2 font-medium">新文件名</label>
                <div class="relative">
                  <input
                    v-model="renameNewName"
                    type="text"
                    class="w-full px-4 py-3 bg-slate-800/80 border-2 border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200"
                    @keyup.enter="confirmRename"
                    placeholder="输入新文件名..."
                  />
                  <div class="absolute right-3 top-1/2 -translate-y-1/2">
                    <FileText class="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </div>
              
              <!-- 提示信息 -->
              <div class="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/20 rounded-lg px-3 py-2 mt-3">
                <FileCode class="w-3.5 h-3.5 text-slate-500" />
                <span>修改扩展名会自动切换语言高亮</span>
              </div>
            </div>
            
            <!-- 底部按钮区 -->
            <div class="flex gap-3 p-6 pt-4 bg-slate-800/50">
              <button
                @click="showRenameModal = false"
                class="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-200 border border-slate-600/30"
              >
                取消
              </button>
              <button
                @click="confirmRename"
                class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                <Check class="w-4 h-4" />
                确认重命名
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 另存为弹窗 - 美化版 -->
    <Teleport to="body">
      <Transition name="save-modal">
        <div v-if="showSaveAsModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="showSaveAsModal = false">
          <!-- 背景遮罩 - 渐变效果 -->
          <div class="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md"></div>
          
          <!-- 弹窗主体 -->
          <div class="relative bg-gradient-to-b from-slate-800 to-slate-850 rounded-3xl shadow-2xl w-full max-w-md border border-slate-600/50 overflow-hidden transform transition-all">
            <!-- 顶部装饰条 -->
            <div class="h-1 bg-gradient-to-r from-brand-500 via-emerald-500 to-brand-500"></div>
            
            <!-- 头部 -->
            <div class="relative p-6 pb-4">
              <!-- 关闭按钮 -->
              <button
                @click="showSaveAsModal = false"
                class="absolute top-4 right-4 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-all duration-200 hover:rotate-90"
              >
                <X class="w-4 h-4" />
              </button>
              
              <!-- 图标和标题 -->
              <div class="flex flex-col items-center text-center">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-emerald-500/20 flex items-center justify-center mb-4 ring-2 ring-brand-500/30">
                  <SaveAll class="w-8 h-8 text-brand-400" />
                </div>
                <h3 class="text-xl font-bold text-white mb-1">保存文件</h3>
                <p class="text-sm text-slate-400">将文件导出到本地</p>
              </div>
            </div>
            
            <!-- 内容区 -->
            <div class="px-6 pb-4">
              <!-- 文件信息卡片 -->
              <div class="bg-slate-700/30 rounded-2xl p-4 mb-4 border border-slate-600/30">
                <div class="flex items-center gap-3 mb-3">
                  <component :is="getFileIcon(saveAsFileName || 'file.txt')" class="w-10 h-10 text-brand-400 p-2 bg-slate-600/50 rounded-xl" />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs text-slate-400 mb-1">文件类型</p>
                    <p class="text-sm text-white font-medium truncate">{{ getFileTypeLabel(saveAsFileName) }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-slate-400 mb-1">大小</p>
                    <p class="text-sm text-emerald-400 font-medium">{{ contentSize }}</p>
                  </div>
                </div>
                
                <!-- 分隔线 -->
                <div class="h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent my-3"></div>
                
                <!-- 文件名输入 -->
                <div>
                  <label class="block text-xs text-slate-400 mb-2 font-medium">文件名称</label>
                  <div class="relative">
                    <input
                      ref="saveAsInput"
                      v-model="saveAsFileName"
                      type="text"
                      class="w-full px-4 py-3 bg-slate-800/80 border-2 border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all duration-200"
                      @keyup.enter="confirmSaveAs"
                      placeholder="输入文件名..."
                    />
                    <div class="absolute right-3 top-1/2 -translate-y-1/2">
                      <Pencil class="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 提示信息 -->
              <div class="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/20 rounded-lg px-3 py-2">
                <Download class="w-3.5 h-3.5 text-slate-500" />
                <span>文件将保存到浏览器默认下载目录</span>
              </div>
            </div>
            
            <!-- 底部按钮区 -->
            <div class="flex gap-3 p-6 pt-4 bg-slate-800/50">
              <button
                @click="showSaveAsModal = false"
                class="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white rounded-xl font-medium transition-all duration-200 border border-slate-600/30"
              >
                取消
              </button>
              <button
                @click="confirmSaveAs"
                class="flex-1 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
              >
                <Download class="w-4 h-4" />
                保存文件
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 快捷键弹窗 - 美化版 -->
    <Teleport to="body">
      <Transition name="save-modal">
        <div v-if="showShortcuts" class="fixed inset-0 z-[100] flex items-center justify-center p-4" @click.self="showShortcuts = false">
          <!-- 背景遮罩 -->
          <div class="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-md"></div>
          
          <!-- 弹窗主体 -->
          <div class="relative bg-gradient-to-b from-slate-800 to-slate-850 rounded-3xl shadow-2xl w-full max-w-lg border border-slate-600/50 overflow-hidden transform transition-all">
            <!-- 顶部装饰条 -->
            <div class="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
            
            <!-- 头部 -->
            <div class="relative p-6 pb-4">
              <!-- 关闭按钮 -->
              <button
                @click="showShortcuts = false"
                class="absolute top-4 right-4 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600 text-slate-400 hover:text-white transition-all duration-200 hover:rotate-90"
              >
                <X class="w-4 h-4" />
              </button>
              
              <!-- 图标和标题 -->
              <div class="flex flex-col items-center text-center">
                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4 ring-2 ring-purple-500/30">
                  <Keyboard class="w-8 h-8 text-purple-400" />
                </div>
                <h3 class="text-xl font-bold text-white mb-1">快捷键</h3>
                <p class="text-sm text-slate-400">提升编辑效率</p>
              </div>
            </div>
            
            <!-- 内容区 -->
            <div class="px-6 pb-6 max-h-[50vh] overflow-y-auto">
              <!-- 文件操作 -->
              <div class="bg-slate-700/30 rounded-2xl p-4 border border-slate-600/30 mb-4">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <FileCode class="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <h4 class="text-sm font-medium text-white">文件操作</h4>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center py-2 px-3 bg-slate-800/50 rounded-xl hover:bg-slate-800/80 transition-colors">
                    <span class="text-slate-300 text-sm">新建文件</span>
                    <kbd class="px-2.5 py-1 bg-slate-700 rounded-lg text-xs text-slate-300 font-mono border border-slate-600/50">Ctrl + N</kbd>
                  </div>
                  <div class="flex justify-between items-center py-2 px-3 bg-slate-800/50 rounded-xl hover:bg-slate-800/80 transition-colors">
                    <span class="text-slate-300 text-sm">打开文件</span>
                    <kbd class="px-2.5 py-1 bg-slate-700 rounded-lg text-xs text-slate-300 font-mono border border-slate-600/50">Ctrl + O</kbd>
                  </div>
                  <div class="flex justify-between items-center py-2 px-3 bg-slate-800/50 rounded-xl hover:bg-slate-800/80 transition-colors">
                    <span class="text-slate-300 text-sm">保存</span>
                    <kbd class="px-2.5 py-1 bg-slate-700 rounded-lg text-xs text-slate-300 font-mono border border-slate-600/50">Ctrl + S</kbd>
                  </div>
                  <div class="flex justify-between items-center py-2 px-3 bg-slate-800/50 rounded-xl hover:bg-slate-800/80 transition-colors">
                    <span class="text-slate-300 text-sm">另存为</span>
                    <kbd class="px-2.5 py-1 bg-slate-700 rounded-lg text-xs text-slate-300 font-mono border border-slate-600/50">Ctrl + Shift + S</kbd>
                  </div>
                </div>
              </div>
              
              <!-- 多光标编辑 -->
              <div class="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <span class="text-sm">✨</span>
                  </div>
                  <h4 class="text-sm font-medium text-purple-300">多光标编辑</h4>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center py-2 px-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                    <span class="text-slate-300 text-sm">添加光标</span>
                    <kbd class="px-2.5 py-1 bg-slate-700/50 rounded-lg text-xs text-purple-300 font-mono border border-purple-500/30">Alt + 点击</kbd>
                  </div>
                  <div class="flex justify-between items-center py-2 px-3 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
                    <span class="text-slate-300 text-sm">选中所有相同词</span>
                    <kbd class="px-2.5 py-1 bg-slate-700/50 rounded-lg text-xs text-purple-300 font-mono border border-purple-500/30">Ctrl + Shift + L</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 文件下拉菜单 - 美化版 -->
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="showFileMenu"
          class="fixed bg-gradient-to-b from-slate-800 to-slate-850 border border-slate-600/50 rounded-2xl shadow-2xl py-2 z-[200] min-w-[220px] backdrop-blur-xl"
          :style="fileMenuPosition"
        >
          <div class="px-3 pb-2 mb-1 border-b border-slate-700/50">
            <p class="text-xs text-slate-500 font-medium">文件菜单</p>
          </div>
          <button
            @click="createNewFile(); showFileMenu = false"
            class="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-brand-600/20 hover:text-white flex items-center gap-3 transition-all duration-150"
          >
            <div class="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
              <FilePlus class="w-3.5 h-3.5 text-brand-400" />
            </div>
            <span class="flex-1">新建文件</span>
            <kbd class="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Ctrl+N</kbd>
          </button>
          <button
            @click="openFile(); showFileMenu = false"
            class="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-brand-600/20 hover:text-white flex items-center gap-3 transition-all duration-150"
          >
            <div class="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FolderOpen class="w-3.5 h-3.5 text-blue-400" />
            </div>
            <span class="flex-1">打开文件</span>
            <kbd class="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Ctrl+O</kbd>
          </button>
          <button
            @click="openFolder(); showFileMenu = false"
            class="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-brand-600/20 hover:text-white flex items-center gap-3 transition-all duration-150"
          >
            <div class="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Folder class="w-3.5 h-3.5 text-amber-400" />
            </div>
            <span class="flex-1">打开文件夹</span>
          </button>
          <div class="h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent my-2 mx-3"></div>
          <button
            @click="saveCurrentFile(); showFileMenu = false"
            :disabled="!currentFile"
            class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            :class="currentFile ? 'text-slate-300 hover:bg-brand-600/20 hover:text-white' : 'text-slate-500'"
          >
            <div class="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Save class="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span class="flex-1">保存</span>
            <kbd class="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Ctrl+S</kbd>
          </button>
          <button
            @click="openSaveAsModal(); showFileMenu = false"
            :disabled="!currentFile"
            class="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            :class="currentFile ? 'text-slate-300 hover:bg-brand-600/20 hover:text-white' : 'text-slate-500'"
          >
            <div class="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <SaveAll class="w-3.5 h-3.5 text-orange-400" />
            </div>
            <span class="flex-1">另存为</span>
            <kbd class="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Ctrl+Shift+S</kbd>
          </button>
        </div>
      </Transition>
      <div v-if="showFileMenu" class="fixed inset-0 z-[199]" @click="showFileMenu = false"></div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, Teleport } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Home, FileCode, Save, SaveAll, Download, FolderOpen, Loader2, Check, Keyboard, X, Upload,
  FilePlus, Folders, Pencil, FileJson, FileText, Braces, ChevronDown, Folder, ChevronRight
} from 'lucide-vue-next'
import loader from '@monaco-editor/loader'
import type * as Monaco from 'monaco-editor'
import FileTreeNode from '../components/FileTreeNode.vue'

interface EditorFile {
  id: string
  name: string
  content: string
  language: string
  isModified: boolean
  originalContent: string
  path?: string  // 文件路径（用于文件夹模式）
  fileHandle?: FileSystemFileHandle | null  // 保存文件句柄，用于直接保存
}

// 文件树节点接口
interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeNode[]
  fileHandle?: FileSystemFileHandle
  expanded?: boolean
}

const editorContainer = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const fileMenuTrigger = ref<HTMLElement>()
const saveAsInput = ref<HTMLInputElement>()
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let monacoInstance: typeof Monaco | null = null

const loading = ref(true)
const language = ref('plaintext')
const theme = ref('vs-dark')
const showToast = ref(false)
const toastMessage = ref('')
const toastSubMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('success')
const toastProgress = ref(100)
let toastTimer: number | null = null
let toastProgressTimer: number | null = null
const cursorPosition = ref({ line: 1, column: 1 })
const lineCount = ref(1)
const cursorCount = ref(1)
const showShortcuts = ref(false)
const isDragging = ref(false)
const showExplorer = ref(true)
const showFileMenu = ref(false)
const fileMenuPos = ref({ x: 0, y: 0 })
const folderTree = ref<TreeNode | null>(null)
const folderHandle = ref<FileSystemDirectoryHandle | null>(null)

// 计算文件菜单位置
const fileMenuPosition = computed(() => {
  return {
    left: fileMenuPos.value.x + 'px',
    top: fileMenuPos.value.y + 'px'
  }
})

// 切换文件菜单显示
const toggleFileMenu = () => {
  if (!showFileMenu.value && fileMenuTrigger.value) {
    const rect = fileMenuTrigger.value.getBoundingClientRect()
    fileMenuPos.value = {
      x: rect.left,
      y: rect.bottom + 4
    }
  }
  showFileMenu.value = !showFileMenu.value
}

const files = ref<EditorFile[]>([])
const currentFileId = ref<string | null>(null)

const contextMenu = ref<{ show: boolean; x: number; y: number; file: EditorFile | null }>({
  show: false, x: 0, y: 0, file: null
})

const showRenameModal = ref(false)
const renameNewName = ref('')
const renameTargetFile = ref<EditorFile | null>(null)

const showSaveAsModal = ref(false)
const saveAsFileName = ref('')

const languages = [
  { id: 'plaintext', name: '纯文本' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'markdown', name: 'Markdown' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'csharp', name: 'C#' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'php', name: 'PHP' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'swift', name: 'Swift' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'sql', name: 'SQL' },
  { id: 'shell', name: 'Shell' },
  { id: 'yaml', name: 'YAML' },
  { id: 'xml', name: 'XML' },
]

const currentFile = computed(() => files.value.find(f => f.id === currentFileId.value) || null)

// 单独打开的文件（不属于文件夹的）
const standaloneFiles = computed(() => {
  return files.value.filter(f => !f.path || !folderTree.value)
})

// 将单独文件转换为树节点形式
const standaloneFileNodes = computed(() => {
  return standaloneFiles.value.map(f => ({
    name: f.name,
    path: f.id, // 使用 id 作为 path
    type: 'file' as const,
    fileHandle: f.fileHandle || undefined
  }))
})

const contentSize = computed(() => {
  if (!editor) return '0 B'
  const bytes = new Blob([editor.getValue()]).size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
})

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'json') return FileJson
  if (['js', 'ts', 'jsx', 'tsx', 'vue'].includes(ext || '')) return Braces
  return FileText
}

// 获取文件类型标签
const getFileTypeLabel = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    'txt': '纯文本文件',
    'js': 'JavaScript 文件',
    'mjs': 'JavaScript 模块',
    'ts': 'TypeScript 文件',
    'tsx': 'TypeScript React',
    'jsx': 'JavaScript React',
    'vue': 'Vue 组件',
    'json': 'JSON 数据文件',
    'html': 'HTML 文档',
    'htm': 'HTML 文档',
    'css': 'CSS 样式表',
    'scss': 'SCSS 样式表',
    'less': 'Less 样式表',
    'md': 'Markdown 文档',
    'py': 'Python 脚本',
    'java': 'Java 源文件',
    'cpp': 'C++ 源文件',
    'c': 'C 源文件',
    'h': 'C/C++ 头文件',
    'go': 'Go 源文件',
    'rs': 'Rust 源文件',
    'php': 'PHP 脚本',
    'rb': 'Ruby 脚本',
    'swift': 'Swift 源文件',
    'kt': 'Kotlin 源文件',
    'sql': 'SQL 脚本',
    'sh': 'Shell 脚本',
    'bash': 'Bash 脚本',
    'yml': 'YAML 配置',
    'yaml': 'YAML 配置',
    'xml': 'XML 文档',
    'svg': 'SVG 图形',
  }
  return typeMap[ext || ''] || '文本文件'
}

const detectLanguage = (filename: string): string => {
  const lowerName = filename.toLowerCase()
  
  // 特殊文件名匹配
  if (lowerName.includes('.conf') || lowerName.includes('nginx') || lowerName.includes('apache')) {
    return 'shell' // 配置文件用 shell 高亮
  }
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) {
    return 'shell'
  }
  if (lowerName === 'makefile' || lowerName === 'gnumakefile') {
    return 'shell'
  }
  if (lowerName.endsWith('.env') || lowerName.includes('.env.')) {
    return 'shell'
  }
  
  // 扩展名匹配
  const ext = filename.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
    'ts': 'typescript', 'mts': 'typescript', 'cts': 'typescript',
    'vue': 'html', 'svelte': 'html', 'html': 'html', 'htm': 'html',
    'css': 'css', 'scss': 'scss', 'less': 'less', 'sass': 'scss',
    'json': 'json', 'jsonc': 'json', 'json5': 'json',
    'md': 'markdown', 'mdx': 'markdown', 'markdown': 'markdown',
    'py': 'python', 'pyw': 'python', 'pyi': 'python',
    'java': 'java', 'jar': 'java',
    'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'c': 'c', 'h': 'cpp', 'hpp': 'cpp',
    'cs': 'csharp',
    'go': 'go', 'rs': 'rust',
    'php': 'php', 'phtml': 'php',
    'rb': 'ruby', 'rake': 'ruby',
    'swift': 'swift', 'kt': 'kotlin', 'kts': 'kotlin',
    'sql': 'sql', 'mysql': 'sql', 'pgsql': 'sql',
    'sh': 'shell', 'bash': 'shell', 'zsh': 'shell', 'fish': 'shell',
    'yml': 'yaml', 'yaml': 'yaml',
    'xml': 'xml', 'svg': 'xml', 'xsl': 'xml', 'xslt': 'xml',
    'txt': 'plaintext', 'log': 'plaintext', 'out': 'plaintext',
    'ini': 'ini', 'cfg': 'ini', 'conf': 'shell', 'config': 'shell',
    'toml': 'ini',
    'dockerfile': 'shell',
    'gitignore': 'shell', 'gitattributes': 'shell',
    'editorconfig': 'ini',
    'properties': 'ini',
    'backup': 'plaintext', 'bak': 'plaintext', 'old': 'plaintext', 'orig': 'plaintext',
    'default': 'shell', 'sample': 'shell', 'example': 'shell', 'template': 'shell',
  }
  return langMap[ext || ''] || 'plaintext'
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const createNewFile = () => {
  const id = generateId()
  const newFile: EditorFile = {
    id,
    name: `untitled-${files.value.length + 1}.txt`,
    content: '',
    language: 'plaintext',
    isModified: false,
    originalContent: '',
    fileHandle: null
  }
  files.value.push(newFile)
  switchToFile(id)
  showToastMessage('已创建新文件')
}

const openFile = async () => {
  // 优先使用 File System Access API，可以获取文件句柄
  if ('showOpenFilePicker' in window) {
    try {
      const handles = await (window as any).showOpenFilePicker({
        multiple: true,
        types: [{
          description: '文本文件',
          accept: {
            'text/*': ['.txt', '.js', '.ts', '.vue', '.json', '.html', '.css', '.md', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.yml', '.yaml', '.xml', '.sh', '.sql']
          }
        }]
      })
      
      for (const handle of handles) {
        const file = await handle.getFile()
        const content = await file.text()
        const id = generateId()
        const lang = detectLanguage(file.name)
        const newFile: EditorFile = {
          id,
          name: file.name,
          content,
          language: lang,
          isModified: false,
          originalContent: content,
          fileHandle: handle  // 保存文件句柄
        }
        files.value.push(newFile)
        switchToFile(id)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('打开文件失败:', err)
        // 降级到传统方式
        fileInput.value?.click()
      }
    }
  } else {
    // 降级到传统文件选择
    fileInput.value?.click()
  }
}

const handleFileOpen = (event: Event) => {
  const input = event.target as HTMLInputElement
  const fileList = input.files
  if (fileList) {
    Array.from(fileList).forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const id = generateId()
        const lang = detectLanguage(file.name)
        const newFile: EditorFile = {
          id,
          name: file.name,
          content,
          language: lang,
          isModified: false,
          originalContent: content,
          fileHandle: null  // 传统方式无法获取句柄
        }
        files.value.push(newFile)
        switchToFile(id)
      }
      reader.readAsText(file)
    })
  }
  input.value = ''
}

const switchToFile = (fileId: string) => {
  // 保存当前文件内容
  if (currentFileId.value && editor) {
    const current = files.value.find(f => f.id === currentFileId.value)
    if (current) {
      current.content = editor.getValue()
    }
  }
  
  currentFileId.value = fileId
  const file = files.value.find(f => f.id === fileId)
  if (file && editor && monacoInstance) {
    editor.setValue(file.content)
    monacoInstance.editor.setModelLanguage(editor.getModel()!, file.language)
    language.value = file.language
  }
}

const closeFile = (fileId: string) => {
  const index = files.value.findIndex(f => f.id === fileId)
  if (index !== -1) {
    files.value.splice(index, 1)
    if (currentFileId.value === fileId) {
      if (files.value.length > 0) {
        switchToFile(files.value[Math.max(0, index - 1)].id)
      } else {
        currentFileId.value = null
        if (editor) editor.setValue('')
      }
    }
  }
  closeContextMenu()
}

const closeFileFromMenu = () => {
  if (contextMenu.value.file) {
    closeFile(contextMenu.value.file.id)
  }
}

const saveCurrentFile = async () => {
  if (!currentFile.value || !editor) return
  
  const content = editor.getValue()
  
  // 如果有文件句柄，直接保存到原文件（无需弹出对话框）
  if (currentFile.value.fileHandle) {
    try {
      const writable = await currentFile.value.fileHandle.createWritable()
      await writable.write(content)
      await writable.close()
      
      // 更新状态
      currentFile.value.content = content
      currentFile.value.originalContent = content
      currentFile.value.isModified = false
      
      // 保存到 localStorage（不保存 fileHandle，因为它无法序列化）
      const filesToSave = files.value.map(f => ({
        id: f.id,
        name: f.name,
        content: f.content,
        language: f.language,
        isModified: f.isModified,
        originalContent: f.originalContent
      }))
      localStorage.setItem('zenreader_editor_files', JSON.stringify(filesToSave))
      localStorage.setItem('zenreader_editor_currentFileId', currentFileId.value || '')
      
      showToastMessage('已保存')
      return
    } catch (err: any) {
      console.error('直接保存失败，尝试使用另存为:', err)
      // 如果直接保存失败（比如权限问题），清除句柄并降级到另存为
      currentFile.value.fileHandle = null
    }
  }
  
  // 没有文件句柄，或者是新建的文件，弹出"另存为"对话框
  if ('showSaveFilePicker' in window) {
    try {
      const ext = currentFile.value.name.split('.').pop()?.toLowerCase() || 'txt'
      const mimeTypes: Record<string, string> = {
        'txt': 'text/plain',
        'js': 'text/javascript',
        'ts': 'text/typescript',
        'json': 'application/json',
        'html': 'text/html',
        'css': 'text/css',
        'md': 'text/markdown',
        'py': 'text/x-python',
        'vue': 'text/html',
        'xml': 'application/xml',
        'yaml': 'text/yaml',
        'yml': 'text/yaml',
      }
      const mimeType = mimeTypes[ext] || 'text/plain'
      
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: currentFile.value.name,
        types: [{
          description: '文本文件',
          accept: { [mimeType]: [`.${ext}`] }
        }]
      })
      
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      
      // 保存文件句柄，下次可以直接保存
      currentFile.value.fileHandle = handle
      
      // 更新文件名
      const newName = handle.name
      if (newName !== currentFile.value.name) {
        currentFile.value.name = newName
        currentFile.value.language = detectLanguage(newName)
        language.value = currentFile.value.language
        if (monacoInstance && editor) {
          monacoInstance.editor.setModelLanguage(editor.getModel()!, currentFile.value.language)
        }
      }
      
      currentFile.value.content = content
      currentFile.value.originalContent = content
      currentFile.value.isModified = false
      
      const filesToSave = files.value.map(f => ({
        id: f.id,
        name: f.name,
        content: f.content,
        language: f.language,
        isModified: f.isModified,
        originalContent: f.originalContent
      }))
      localStorage.setItem('zenreader_editor_files', JSON.stringify(filesToSave))
      localStorage.setItem('zenreader_editor_currentFileId', currentFileId.value || '')
      
      showToastMessage('文件已保存')
    } catch (err: any) {
      if (err.name === 'AbortError') return
      console.error('保存文件失败:', err)
      showToastMessage('保存失败，请重试')
    }
  } else {
    // 浏览器不支持，使用下载方式
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.value.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    currentFile.value.content = content
    currentFile.value.originalContent = content
    currentFile.value.isModified = false
    
    const filesToSave = files.value.map(f => ({
      id: f.id,
      name: f.name,
      content: f.content,
      language: f.language,
      isModified: f.isModified,
      originalContent: f.originalContent
    }))
    localStorage.setItem('zenreader_editor_files', JSON.stringify(filesToSave))
    localStorage.setItem('zenreader_editor_currentFileId', currentFileId.value || '')
    
    showToastMessage('文件已导出')
  }
}

const openSaveAsModal = () => {
  if (currentFile.value) {
    saveAsFileName.value = currentFile.value.name
    showSaveAsModal.value = true
  }
}

const confirmSaveAs = () => {
  if (!saveAsFileName.value.trim() || !editor) return
  
  const content = editor.getValue()
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = saveAsFileName.value
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  // 更新当前文件名
  if (currentFile.value) {
    currentFile.value.name = saveAsFileName.value
    currentFile.value.language = detectLanguage(saveAsFileName.value)
    language.value = currentFile.value.language
    if (monacoInstance && editor) {
      monacoInstance.editor.setModelLanguage(editor.getModel()!, currentFile.value.language)
    }
  }
  
  showSaveAsModal.value = false
  showToastMessage('文件已导出')
}

const exportFile = (file: EditorFile) => {
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  closeContextMenu()
  showToastMessage('文件已导出')
}

const openContextMenu = (event: MouseEvent, file: EditorFile) => {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    file
  }
}

const closeContextMenu = () => {
  contextMenu.value.show = false
  contextMenu.value.file = null
}

const renameFile = () => {
  if (contextMenu.value.file) {
    renameTargetFile.value = contextMenu.value.file
    renameNewName.value = contextMenu.value.file.name
    showRenameModal.value = true
    closeContextMenu()
  }
}

const confirmRename = () => {
  if (!renameNewName.value.trim() || !renameTargetFile.value) return
  
  renameTargetFile.value.name = renameNewName.value
  renameTargetFile.value.language = detectLanguage(renameNewName.value)
  
  // 如果重命名的是当前文件，更新语言
  if (renameTargetFile.value.id === currentFileId.value && monacoInstance && editor) {
    language.value = renameTargetFile.value.language
    monacoInstance.editor.setModelLanguage(editor.getModel()!, renameTargetFile.value.language)
  }
  
  showRenameModal.value = false
  renameTargetFile.value = null
  showToastMessage('文件已重命名')
}

const showToastMessage = (message: string, type: 'success' | 'error' | 'info' = 'success', subMessage?: string) => {
  // 清除之前的定时器
  if (toastTimer) {
    clearTimeout(toastTimer)
  }
  if (toastProgressTimer) {
    clearInterval(toastProgressTimer)
  }
  
  toastMessage.value = message
  toastType.value = type
  toastSubMessage.value = subMessage || getDefaultSubMessage(type)
  toastProgress.value = 100
  showToast.value = true
  
  // 进度条动画
  const duration = 2500
  const interval = 50
  const step = (100 / duration) * interval
  
  toastProgressTimer = setInterval(() => {
    toastProgress.value = Math.max(0, toastProgress.value - step)
  }, interval) as unknown as number
  
  toastTimer = setTimeout(() => {
    showToast.value = false
    if (toastProgressTimer) {
      clearInterval(toastProgressTimer)
    }
  }, duration) as unknown as number
}

const getDefaultSubMessage = (type: 'success' | 'error' | 'info'): string => {
  switch (type) {
    case 'success': return '操作已完成'
    case 'error': return '请稍后重试'
    case 'info': return '处理中...'
  }
}

// 拖拽文件处理
const handleDragOver = (e: DragEvent) => {
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
  }
}

const handleDragLeave = (e: DragEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
    isDragging.value = false
  }
}

// 打开文件夹
const openFolder = async () => {
  if (!('showDirectoryPicker' in window)) {
    showToastMessage('您的浏览器不支持打开文件夹')
    return
  }
  
  try {
    const dirHandle = await (window as any).showDirectoryPicker()
    folderHandle.value = dirHandle
    
    // 构建文件树
    const tree = await buildFileTree(dirHandle, dirHandle.name)
    folderTree.value = tree
    
    // 清空单文件列表
    files.value = []
    currentFileId.value = null
    if (editor) editor.setValue('')
    
    showToastMessage(`已打开文件夹: ${dirHandle.name}`)
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('打开文件夹失败:', err)
      showToastMessage('打开文件夹失败')
    }
  }
}

// 关闭文件夹
const closeFolder = () => {
  folderTree.value = null
  folderHandle.value = null
  files.value = []
  currentFileId.value = null
  if (editor) editor.setValue('')
}

// 构建文件树 - 包含所有文件和文件夹，不做任何过滤
const buildFileTree = async (dirHandle: FileSystemDirectoryHandle, path: string): Promise<TreeNode> => {
  const children: TreeNode[] = []
  
  for await (const entry of (dirHandle as any).values()) {
    if (entry.kind === 'file') {
      // 包含所有文件，不做过滤
      children.push({
        name: entry.name,
        path: `${path}/${entry.name}`,
        type: 'file',
        fileHandle: entry
      })
    } else if (entry.kind === 'directory') {
      // 包含所有文件夹，不做任何过滤
      const subTree = await buildFileTree(entry, `${path}/${entry.name}`)
      children.push(subTree)
    }
  }
  
  // 排序：文件夹在前，文件在后，按名称排序
  children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })
  
  return {
    name: dirHandle.name,
    path,
    type: 'folder',
    children,
    expanded: true // 所有文件夹默认展开
  }
}

// 切换根目录展开/折叠
const toggleRootFolder = () => {
  if (folderTree.value) {
    folderTree.value.expanded = !folderTree.value.expanded
  }
}

// 处理文件树节点展开/折叠
const handleTreeNodeToggle = (node: TreeNode) => {
  node.expanded = !node.expanded
}

// 处理文件树节点选择
const handleTreeNodeSelect = async (node: TreeNode) => {
  if (node.type !== 'file' || !node.fileHandle) return
  
  try {
    const file = await node.fileHandle.getFile()
    const content = await file.text()
    const id = node.path // 使用路径作为ID
    
    // 检查文件是否已打开
    const existingFile = files.value.find(f => f.path === node.path)
    if (existingFile) {
      switchToFile(existingFile.id)
      return
    }
    
    const lang = detectLanguage(file.name)
    const newFile: EditorFile = {
      id,
      name: file.name,
      content,
      language: lang,
      isModified: false,
      originalContent: content,
      path: node.path,
      fileHandle: node.fileHandle
    }
    files.value.push(newFile)
    switchToFile(id)
  } catch (err) {
    console.error('读取文件失败:', err)
    showToastMessage('读取文件失败')
  }
}

// 处理单独文件选择
const handleStandaloneFileSelect = (node: TreeNode) => {
  // node.path 实际上是文件的 id
  const file = files.value.find(f => f.id === node.path)
  if (file) {
    switchToFile(file.id)
  }
}

// 关闭单独打开的文件
const closeStandaloneFile = (node: TreeNode) => {
  // node.path 实际上是文件的 id
  closeFile(node.path)
}

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false
  const items = e.dataTransfer?.items
  const droppedFiles = e.dataTransfer?.files
  
  if (!items || items.length === 0) return
  
  // 检查是否有文件夹
  if ('getAsFileSystemHandle' in DataTransferItem.prototype) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        try {
          const handle = await (item as any).getAsFileSystemHandle()
          
          // 如果是文件夹
          if (handle && handle.kind === 'directory') {
            folderHandle.value = handle
            const tree = await buildFileTree(handle, handle.name)
            folderTree.value = tree
            files.value = []
            currentFileId.value = null
            if (editor) editor.setValue('')
            showToastMessage(`已打开文件夹: ${handle.name}`)
            return
          }
          
          // 如果是文件
          if (handle && handle.kind === 'file') {
            // 如果当前有文件夹模式，关闭它
            if (folderTree.value) {
              folderTree.value = null
              folderHandle.value = null
            }
            
            const file = await handle.getFile()
            const content = await file.text()
            const id = generateId()
            const lang = detectLanguage(file.name)
            const newFile: EditorFile = {
              id,
              name: file.name,
              content,
              language: lang,
              isModified: false,
              originalContent: content,
              fileHandle: handle
            }
            files.value.push(newFile)
            switchToFile(id)
          }
        } catch (err) {
          console.error('获取文件句柄失败:', err)
        }
      }
    }
  } else if (droppedFiles && droppedFiles.length > 0) {
    // 传统方式：无法获取文件句柄
    showToastMessage(`正在打开 ${droppedFiles.length} 个文件...`)
    let openedCount = 0
    Array.from(droppedFiles).forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        const id = generateId()
        const lang = detectLanguage(file.name)
        const newFile: EditorFile = {
          id,
          name: file.name,
          content,
          language: lang,
          isModified: false,
          originalContent: content,
          fileHandle: null
        }
        files.value.push(newFile)
        openedCount++
        if (openedCount === droppedFiles.length) {
          switchToFile(id)
        }
      }
      reader.onerror = () => {
        showToastMessage(`无法读取文件: ${file.name}`)
      }
      reader.readAsText(file)
    })
  }
}

// 初始化编辑器
onMounted(async () => {
  loader.config({
    paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }
  })
  
  try {
    monacoInstance = await loader.init()
    
    if (editorContainer.value && monacoInstance) {
      editor = monacoInstance.editor.create(editorContainer.value, {
        value: '',
        language: language.value,
        theme: theme.value,
        fontSize: 14,
        fontFamily: "'Fira Code', 'JetBrains Mono', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        // 丝滑光标动画配置
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        cursorStyle: 'line',
        cursorWidth: 2,
        smoothScrolling: true,
        // 鼠标点击时的平滑滚动
        mouseWheelScrollSensitivity: 1,
        fastScrollSensitivity: 5,
        // 选中和光标跳转的动画效果
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: true,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          arrowSize: 0
        },
      })
      
      // 监听内容变化
      editor.onDidChangeModelContent(() => {
        if (currentFile.value) {
          currentFile.value.content = editor!.getValue()
          currentFile.value.isModified = currentFile.value.content !== currentFile.value.originalContent
        }
        lineCount.value = editor!.getModel()?.getLineCount() || 1
      })
      
      // 监听光标位置
      editor.onDidChangeCursorPosition((e) => {
        cursorPosition.value = { line: e.position.lineNumber, column: e.position.column }
        cursorCount.value = editor!.getSelections()?.length || 1
      })
      
      // 快捷键
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, saveCurrentFile)
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyS, openSaveAsModal)
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyO, openFile)
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyN, createNewFile)
      
      // 加载保存的文件
      const savedFiles = localStorage.getItem('zenreader_editor_files')
      const savedCurrentId = localStorage.getItem('zenreader_editor_currentFileId')
      if (savedFiles) {
        files.value = JSON.parse(savedFiles)
        if (savedCurrentId && files.value.find(f => f.id === savedCurrentId)) {
          switchToFile(savedCurrentId)
        } else if (files.value.length > 0) {
          switchToFile(files.value[0].id)
        }
      }
      
      loading.value = false
    }
  } catch (error) {
    console.error('Failed to load Monaco Editor:', error)
    loading.value = false
  }
})

onUnmounted(() => {
  editor?.dispose()
})

// 监听语言变化
watch(language, (newLang) => {
  if (editor && monacoInstance && currentFile.value) {
    monacoInstance.editor.setModelLanguage(editor.getModel()!, newLang)
    currentFile.value.language = newLang
  }
})

// 监听主题变化
watch(theme, (newTheme) => {
  if (monacoInstance) {
    monacoInstance.editor.setTheme(newTheme)
  }
})

// 离开页面前提示保存
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (files.value.some(f => f.isModified)) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style>
/* Toast 滑入动画 */
.toast-slide-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-slide-leave-active {
  transition: all 0.25s ease-out;
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(30px) scale(0.9);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.95);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.modal-enter-active, .modal-leave-active { transition: all 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(-100%); opacity: 0; }

.dropdown-enter-active, .dropdown-leave-active { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-10px) scale(0.95); }

/* 右键菜单动画 */
.context-menu-enter-active { transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.context-menu-leave-active { transition: all 0.15s ease-out; }
.context-menu-enter-from { opacity: 0; transform: scale(0.9); }
.context-menu-leave-to { opacity: 0; transform: scale(0.95); }

/* 文件树展开动画 */
.tree-expand-enter-active,
.tree-expand-leave-active {
  transition: all 0.2s ease;
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
  max-height: 2000px;
}

/* 保存弹窗动画 */
.save-modal-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.save-modal-leave-active {
  transition: all 0.2s ease-out;
}
.save-modal-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
.save-modal-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>