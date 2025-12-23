# SSH WebSocket 命令输出标准文档

## 概述
本文档定义了SSH WebSocket服务的命令输出标准，用于前端与后端的对接规范。所有输出都经过标准化处理，确保在不同终端环境下的一致性。

## 消息类型

### 1. 连接消息
**类型**: `connect`  
**用途**: 建立SSH连接  
**数据结构**:
```json
{
  "type": "connect",
  "data": {
    "hostname": "服务器地址",
    "port": 22,
    "username": "用户名",
    "password": "密码",
    "width": 80,    // 终端宽度
    "height": 24    // 终端高度
  }
}
```

### 2. 命令执行消息
**类型**: `command`  
**用途**: 执行SSH命令  
**数据结构**:
```json
{
  "type": "command",
  "data": {
    "command": "要执行的命令"
  }
}
```

### 3. 命令输出消息
**类型**: `output`  
**用途**: 返回命令执行结果  
**数据结构**:
```json
{
  "type": "output",
  "data": "命令输出内容"
}
```

**输出标准**:
- 所有ANSI转义序列已移除（颜色、样式、光标控制等）
- 所有OSC序列已移除（终端标题设置等）
- 统一使用 `\n` 作为换行符
- 已过滤系统状态信息（Memory usage、IPv4 address、System load等）
- 已处理命令回显，避免重复显示

### 4. TAB补全消息
**类型**: `tab_complete`  
**用途**: 请求命令补全  
**数据结构**:
```json
{
  "type": "tab_complete",
  "data": {
    "command": "当前命令行内容"
  }
}
```

### 5. TAB补全选项消息
**类型**: `tab_completion_options`  
**用途**: 返回补全候选项  
**数据结构**:
```json
{
  "type": "tab_completion_options",
  "data": {
    "options": ["选项1", "选项2", "选项3"],
    "base": "补全基础字符串",
    "path_prefix": "路径前缀（文件补全时）",
    "debug_error": "调试错误信息（可选）"
  }
}
```

### 6. 终端尺寸调整消息
**类型**: `resize`  
**用途**: 调整PTY终端尺寸  
**数据结构**:
```json
{
  "type": "resize",
  "data": {
    "width": 120,   // 新的终端宽度
    "height": 30    // 新的终端高度
  }
}
```

### 7. 断开连接消息
**类型**: `disconnect`  
**用途**: 断开SSH连接  
**数据结构**:
```json
{
  "type": "disconnect",
  "data": {}
}
```

## 特殊命令处理

### ls 命令自动重写
对于简单的 `ls` 命令（不含管道、分号、逻辑运算等），系统会自动重写为：
```bash
ls -1 --color=never
```

**重写条件**:
- 命令匹配正则表达式 `^\s*ls(\s|$)`
- 不包含操作符 `|`, `;`, `&&`, `||`
- 未显式指定 `-l` 或 `-1` 参数

**目的**: 确保输出为单列格式，便于前端排版显示

### ls 命令文件列表颜色显示方案

#### 概述
为了提升用户体验，系统支持为 `ls` 命令的输出添加颜色标记，区分不同类型的文件和目录。前端可以根据这些标记应用相应的颜色显示。

#### 已知问题与解决方案

##### 问题1：LS命令后多余换行
**问题描述**: 输入ls命令后，输出前面有多余的换行符，影响显示效果。

**后端解决方案**:
```python
# 在发送ls_output消息后，避免重复发送换行
if ls_structured and ls_structured["data"]["files"]:
    # 发送结构化输出（已包含正确的格式）
    await websocket.send_text(json.dumps(ls_structured))
    
    # 发送提示符时确保不添加多余换行
    prompt_response = {
        "type": "output",
        "data": ls_structured["data"]["prompt"].lstrip('\n')  # 移除前导换行
    }
    await websocket.send_text(json.dumps(prompt_response))
```

**前端解决方案**:
```javascript
// 处理输出时移除多余换行
function processOutput(data) {
    // 移除输出开头和结尾的多余换行
    let cleaned = data.replace(/^\n+|\n+$/g, '');
    
    // 如果是ls输出，确保格式正确
    if (data.type === 'ls_output') {
        // 构建输出时控制换行数量
        return cleaned;
    }
    
    return cleaned;
}
```

##### 问题2：文件列表平铺显示（需要横纵排列）
**问题描述**: 文件列表目前是单列显示，需要实现多列横纵排列。

**后端解决方案**:
```python
# 在结构化输出中添加排列信息
def format_ls_multicolumn(files, terminal_width=80):
    """格式化文件列表为多列显示"""
    if not files:
        return []
    
    # 计算最大文件名长度
    max_name_length = max(len(f['name']) for f in files)
    # 列宽（考虑颜色代码空间）
    column_width = max_name_length + 2
    # 计算列数
    num_columns = max(1, terminal_width // column_width)
    
    # 按列排列文件
    rows = []
    files_per_row = (len(files) + num_columns - 1) // num_columns
    
    for i in range(files_per_row):
        row_files = files[i * num_columns:(i + 1) * num_columns]
        rows.append(row_files)
    
    return {
        "columns": num_columns,
        "rows": rows,
        "column_width": column_width
    }
```

**前端解决方案**:
```javascript
function renderLsOutputMulticolumn(lsData, containerWidth) {
    const { files, columns, column_width } = lsData;
    
    // 创建网格布局
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${columns}, ${column_width}ch)`;
    grid.style.gap = '1ch';
    
    files.forEach(file => {
        const fileElement = document.createElement('span');
        fileElement.textContent = file.name.padEnd(column_width);
        fileElement.style.color = getFileColor(file.type, file.is_executable);
        grid.appendChild(fileElement);
    });
    
    return grid;
}
```

##### 问题3：文件和文件夹颜色显示优化
**问题描述**: 需要更细致的颜色区分，包括特殊文件类型。

**增强颜色方案**:

后端实现（Python）:
```python
def get_file_color_info(self, filename: str, file_type: str, is_executable: bool, is_base: bool) -> dict:
    """获取文件颜色信息（增强版）"""
    # 基础颜色映射
    color_info = {
        "color_class": "file",
        "ansi_color": "\x1b[0m",
        "css_color": "#ffffff"
    }
    
    # 隐藏文件检测
    if filename.startswith('.'):
        color_info.update({
            "color_class": "hidden",
            "ansi_color": "\x1b[90m",
            "css_color": "#808080"
        })
        return color_info
    
    # 扩展名检测
    ext = filename.split('.')[-1].lower() if '.' in filename else ""
    
    # 压缩文件
    compressed_exts = ['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'tgz', 'tbz']
    if ext in compressed_exts:
        color_info.update({
            "color_class": "compressed",
            "ansi_color": "\x1b[91m",
            "css_color": "#ff6b6b"
        })
        return color_info
    
    # 图片文件
    image_exts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'ico', 'webp', 'tiff']
    if ext in image_exts:
        color_info.update({
            "color_class": "image",
            "ansi_color": "\x1b[95m",
            "css_color": "#cc99ff"
        })
        return color_info
    
    # 代码文件
    code_exts = ['py', 'js', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'ts', 'jsx', 'tsx', 'vue']
    if ext in code_exts:
        color_info.update({
            "color_class": "code",
            "ansi_color": "\x1b[92m",
            "css_color": "#51cf66"
        })
        return color_info
    
    # 文档文件
    doc_exts = ['pdf', 'doc', 'docx', 'txt', 'md', 'rst', 'odt']
    if ext in doc_exts:
        color_info.update({
            "color_class": "document",
            "ansi_color": "\x1b[96m",
            "css_color": "#74c0fc"
        })
        return color_info
    
    # 基础文件类型
    if file_type == "directory":
        color_info.update({
            "color_class": "directory",
            "ansi_color": "\x1b[34;1m",
            "css_color": "#339af0"
        })
    elif is_base:
        color_info.update({
            "color_class": "base",
            "ansi_color": "\x1b[33;1m",
            "css_color": "#ffd43b"
        })
    elif is_executable:
        color_info.update({
            "color_class": "executable",
            "ansi_color": "\x1b[92m",
            "css_color": "#51cf66"
        })
    elif file_type == "symlink":
        color_info.update({
            "color_class": "symlink",
            "ansi_color": "\x1b[96m",
            "css_color": "#22d3ee"
        })
    elif file_type in ["socket", "pipe", "block", "char"]:
        color_info.update({
            "color_class": "special",
            "ansi_color": "\x1b[35m",
            "css_color": "#cc5de8"
        })
    
    return color_info
```

前端实现（JavaScript）:
```javascript
const ENHANCED_FILE_COLORS = {
    // 目录 - 蓝色加粗
    directory: '\x1b[34;1m',
    // 普通文件 - 默认颜色
    file: '\x1b[0m',
    // 可执行文件 - 亮绿色
    executable: '\x1b[92m',
    // 符号链接 - 亮青色
    symlink: '\x1b[96m',
    // BASE环境目录 - 黄色加粗
    base: '\x1b[33;1m',
    // 隐藏文件 - 灰色
    hidden: '\x1b[90m',
    // 压缩文件 - 红色
    compressed: '\x1b[91m',
    // 图片文件 - 紫色
    image: '\x1b[95m',
    // 代码文件 - 绿色
    code: '\x1b[92m',
    // 文档文件 - 青色
    document: '\x1b[96m',
    // 重置
    reset: '\x1b[0m'
};

function getEnhancedFileColor(file) {
    // 特殊文件类型检测
    if (file.name.startsWith('.')) return ENHANCED_FILE_COLORS.hidden;
    
    // 扩展名检测
    const ext = file.name.split('.').pop().toLowerCase();
    const compressedExts = ['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'ico'];
    const codeExts = ['py', 'js', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go'];
    const docExts = ['pdf', 'doc', 'docx', 'txt', 'md', 'rst'];
    
    if (compressedExts.includes(ext)) return ENHANCED_FILE_COLORS.compressed;
    if (imageExts.includes(ext)) return ENHANCED_FILE_COLORS.image;
    if (codeExts.includes(ext)) return ENHANCED_FILE_COLORS.code;
    if (docExts.includes(ext)) return ENHANCED_FILE_COLORS.document;
    
    // 基础类型
    if (file.type === 'directory') return ENHANCED_FILE_COLORS.directory;
    if (file.is_executable) return ENHANCED_FILE_COLORS.executable;
    if (file.type === 'symlink') return ENHANCED_FILE_COLORS.symlink;
    if (file.is_base) return ENHANCED_FILE_COLORS.base;
    
    return ENHANCED_FILE_COLORS.file;
}
```

**颜色信息数据结构**:
```json
{
    "color_info": {
        "color_class": "directory",      // 颜色类别
        "ansi_color": "\x1b[34;1m",      // ANSI颜色代码（终端显示）
        "css_color": "#339af0"           // CSS颜色代码（网页显示）
    }
}
```

**颜色类别说明**:
| 颜色类别 | 描述 | ANSI代码 | CSS颜色 | 适用场景 |
|---------|------|----------|---------|----------|
| `file` | 普通文件 | `\x1b[0m` | `#ffffff` | 默认文件类型 |
| `directory` | 目录 | `\x1b[34;1m` | `#339af0` | 文件夹 |
| `executable` | 可执行文件 | `\x1b[92m` | `#51cf66` | 具有执行权限的文件 |
| `symlink` | 符号链接 | `\x1b[96m` | `#22d3ee` | 软链接文件 |
| `base` | BASE环境目录 | `\x1b[33;1m` | `#ffd43b` | conda环境目录 |
| `hidden` | 隐藏文件 | `\x1b[90m` | `#808080` | 以点开头的文件 |
| `compressed` | 压缩文件 | `\x1b[91m` | `#ff6b6b` | zip, tar, gz等 |
| `image` | 图片文件 | `\x1b[95m` | `#cc99ff` | jpg, png, gif等 |
| `code` | 代码文件 | `\x1b[92m` | `#51cf66` | py, js, java等 |
| `document` | 文档文件 | `\x1b[96m` | `#74c0fc` | pdf, doc, txt等 |
| `special` | 特殊文件 | `\x1b[35m` | `#cc5de8` | socket, pipe等 |

**优先级规则**:
1. 隐藏文件（以`.`开头）优先级最高
2. 扩展名匹配（压缩、图片、代码、文档）
3. 基础文件类型（目录、可执行、符号链接等）
4. 特殊文件类型（socket、pipe等）
5. 默认文件类型

##### 问题4：cd .. 命令无法跳出
**问题描述**: cd .. 命令无法正常返回上级目录。

**后端解决方案**:
```python
def update_cwd(self, session_id: str, command: str, ssh_client: paramiko.SSHClient = None):
    """修复后的CWD更新逻辑"""
    with self.lock:
        # 简单的cd命令解析
        parts = command.strip().split()
        if not parts:
            return
            
        # 处理连续命令，如 cd /tmp && ls
        # 这里只做最简单的处理，假设命令以cd开头
        if parts[0] == 'cd' and len(parts) > 1:
            path = parts[1]
            current = self.get_cwd(session_id)
            
            # 处理特殊路径
            if path == '..':
                # 返回上级目录 - 增强版修复
                if current == '~':
                    # 从主目录返回，通过SSH获取真实路径
                    if ssh_client:
                        try:
                            stdin, stdout, stderr = ssh_client.exec_command("pwd", timeout=5)
                            real_home = stdout.read().decode('utf-8', errors='ignore').strip()
                            if real_home:
                                parent = os.path.dirname(real_home)
                                self.cwd_cache[session_id] = parent or '/'
                            else:
                                self.cwd_cache[session_id] = '/home'  # 回退方案
                        except:
                            self.cwd_cache[session_id] = '/home'  # 回退方案
                    else:
                        self.cwd_cache[session_id] = '/home'  # 回退方案
                elif current == '/':
                    # 已经在根目录，保持不变
                    pass
                else:
                    # 普通路径，返回上一级
                    parent = os.path.dirname(current.rstrip('/'))
                    self.cwd_cache[session_id] = parent or '/'
                return
            
            elif path == '-' or path == '~':
                # 返回主目录或上一个目录
                if path == '~':
                    self.cwd_cache[session_id] = '~'
                return
            
            elif path.startswith('/'):
                # 绝对路径
                self.cwd_cache[session_id] = path
            else:
                # 相对路径
                if current == '~':
                    self.cwd_cache[session_id] = f"~/{path}"
                elif current == '/':
                    self.cwd_cache[session_id] = f"/{path}"
                else:
                    self.cwd_cache[session_id] = f"{current}/{path}"
```

**前端解决方案**:
```javascript
// 增强的TAB补全支持
tab_completion_enhanced(command, currentContext) {
    // 处理cd ..的特殊情况
    if (command === 'cd ..') {
        // 直接发送命令，不需要补全
        return {
            type: 'command',
            data: { command: 'cd ..\n' }
        };
    }
    
    // 处理cd -（返回上一个目录）
    if (command === 'cd -') {
        // 记录当前目录为"上一个目录"
        this.previousDirectory = this.currentDirectory;
        return {
            type: 'command',
            data: { command: 'cd -\n' }
        };
    }
    
    // 普通TAB补全逻辑
    return this.normalTabCompletion(command, currentContext);
}

// 监听目录变化，更新当前目录状态
handleDirectoryChange(newPath) {
    this.currentDirectory = newPath;
    this.updatePromptDisplay();
}
```

##### 问题5：ls命令输出重叠和格式问题
**问题描述**: ls命令后出现输出重叠，如 `ls miniconda (base) root@VM-0-15-ubuntu:~# (base) root@VM-0-15-ubuntu:~#` 两个提示符重叠。

**后端解决方案**:
```python
# 在结构化输出处理中修复重叠问题
if ls_structured and ls_structured["data"]["files"]:
    # 发送结构化输出
    await websocket.send_text(json.dumps(ls_structured))
    
    # 发送提示符（修复重叠问题）
    prompt_text = ls_structured["data"]["prompt"].strip()
    if prompt_text:
        # 确保只有一个换行在开头，避免重叠
        prompt_response = {
            "type": "output", 
            "data": "\n" + prompt_text
        }
        await websocket.send_text(json.dumps(prompt_response))
    
    # 跳过正常命令执行流程
    continue
```

**前端解决方案**:
```javascript
// 处理ls输出，避免重叠
function handleLsOutput(data) {
    if (data.type === 'ls_output') {
        // 渲染文件列表
        renderFileList(data.data.files, data.data.layout);
        
        // 处理提示符
        if (data.data.prompt) {
            // 确保只有一个换行，避免重叠
            const prompt = data.data.prompt.trim();
            if (prompt) {
                appendOutput('\n' + prompt);
            }
        }
    }
}

// 通用输出处理，避免重复和重叠
function appendOutput(text) {
    // 移除末尾的重复提示符
    const currentText = terminal.value;
    const lines = currentText.split('\n');
    
    // 检查最后几行是否有重复的提示符模式
    const promptPattern = /\(base\) root@VM-0-15-ubuntu:.*#\s*$/;
    let lastValidLine = lines.length - 1;
    
    while (lastValidLine >= 0 && promptPattern.test(lines[lastValidLine])) {
        lastValidLine--;
    }
    
    // 如果有重复的提示符，移除它们
    if (lastValidLine < lines.length - 1) {
        const cleanLines = lines.slice(0, lastValidLine + 1);
        terminal.value = cleanLines.join('\n');
    }
    
    // 添加新输出
    terminal.value += text;
    terminal.scrollTop = terminal.scrollHeight;
}
```

##### 问题6：鼠标点击区域误触发命令发送
**问题描述**: 鼠标在终端区域点击会误发送命令或造成输入混乱。

**前端解决方案**:
```javascript
// 终端点击事件处理
function setupTerminalClickHandling() {
    const terminal = document.getElementById('terminal');
    const commandInput = document.getElementById('command-input');
    
    terminal.addEventListener('click', function(e) {
        // 检查点击位置
        const rect = terminal.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        
        // 获取最后一行的高度
        const lines = terminal.value.split('\n');
        const lineHeight = terminal.scrollHeight / lines.length;
        const lastLineY = rect.height - lineHeight;
        
        // 只有在最后一行点击时才聚焦输入框
        if (clickY >= lastLineY) {
            commandInput.focus();
        } else {
            // 在上方点击，只选中文本不触发命令
            e.preventDefault();
            
            // 可选：复制选中的文本到剪贴板
            if (window.getSelection().toString()) {
                navigator.clipboard.writeText(window.getSelection().toString());
            }
        }
    });
    
    // 防止双击选择整个终端
    terminal.addEventListener('dblclick', function(e) {
        e.preventDefault();
        
        // 只选择当前行的文本
        const selection = window.getSelection();
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        
        if (range && range.startContainer) {
            const textNode = range.startContainer;
            const lineStart = findLineStart(textNode, range.startOffset);
            const lineEnd = findLineEnd(textNode, range.startOffset);
            
            range.setStart(textNode, lineStart);
            range.setEnd(textNode, lineEnd);
            selection.removeAllRanges();
            selection.addRange(range);
        }
    });
}

// 命令输入框增强
function enhanceCommandInput() {
    const commandInput = document.getElementById('command-input');
    
    // 防止在输入过程中意外发送命令
    let isComposing = false;
    
    commandInput.addEventListener('compositionstart', function() {
        isComposing = true;
    });
    
    commandInput.addEventListener('compositionend', function() {
        isComposing = false;
    });
    
    commandInput.addEventListener('keydown', function(e) {
        // 只有在非组合输入状态下才处理回车
        if (e.key === 'Enter' && !isComposing) {
            sendCommand();
        }
    });
    
    // 添加输入验证
    commandInput.addEventListener('input', function() {
        // 移除可能导致问题的特殊字符
        this.value = this.value.replace(/[\x00-\x1F\x7F]/g, '');
    });
}

// 辅助函数：找到行开始位置
function findLineStart(textNode, offset) {
    const text = textNode.textContent;
    let start = offset;
    while (start > 0 && text[start - 1] !== '\n') {
        start--;
    }
    return start;
}

// 辅助函数：找到行结束位置  
function findLineEnd(textNode, offset) {
    const text = textNode.textContent;
    let end = offset;
    while (end < text.length && text[end] !== '\n') {
        end++;
    }
    return end;
}
```

**后端辅助方案**:
```python
# 添加消息验证，防止误操作
async def validate_message(message):
    """验证消息合法性"""
    if message["type"] == "command":
        command = message["data"]["command"]
        
        # 检查命令是否为空或只包含空白字符
        if not command or not command.strip():
            return False, "空命令"
        
        # 检查命令长度
        if len(command) > 1000:  # 限制最大长度
            return False, "命令过长"
        
        # 检查是否包含危险字符
        dangerous_chars = ['\x00', '\x01', '\x02']  # 控制字符
        if any(char in command for char in dangerous_chars):
            return False, "包含非法字符"
        
        return True, "有效命令"
    
    return True, "有效消息"

# 在消息处理中使用验证
if message["type"] == "command":
    is_valid, error_msg = await validate_message(message)
    if not is_valid:
        await websocket.send_text(json.dumps({
            "type": "error",
            "data": f"命令验证失败: {error_msg}"
        }))
        continue
```

## 前后端解决方案一致性原则

为了确保前端和后端解决方案的协调一致，遵循以下原则：

### 1. 输入验证一致性
- **前端验证**：在用户界面层面阻止非法输入，提供即时反馈
- **后端验证**：在服务器端再次验证，确保安全性
- **协调机制**：前后端使用相同的验证规则，错误信息保持一致

### 2. 状态管理一致性  
- **前端状态**：维护当前目录、命令历史等界面状态
- **后端状态**：维护SSH连接、CWD缓存等服务端状态
- **同步机制**：通过标准化消息格式保持状态同步

### 3. 错误处理一致性
- **前端错误**：用户友好的错误提示，建议解决方案
- **后端错误**：详细的错误日志，技术层面的错误信息
- **统一格式**：使用标准化的错误消息结构，便于前后端协调处理

### 4. 用户体验一致性
- **响应时间**：前端提供即时反馈，后端优化处理速度
- **操作反馈**：每个用户操作都有相应的状态反馈
- **异常恢复**：提供清晰的恢复路径和操作指导

### 5. 实现示例

**输入验证协调**:
```javascript
// 前端验证示例
function validateCommand(command) {
    if (!command || !command.trim()) {
        showError("命令不能为空");
        return false;
    }
    if (command.length > 1000) {
        showError("命令长度超过限制（1000字符）");
        return false;
    }
    return true;
}

// 发送命令前验证
if (validateCommand(command)) {
    sendCommand(command);
}
```

**状态同步协调**:
```python
# 后端状态更新
self.cwd_cache[session_id] = new_path
await websocket.send_text(json.dumps({
    "type": "directory_change",
    "data": {"current_path": new_path}
}))
```

```javascript
// 前端状态更新
function handleDirectoryChange(data) {
    this.currentDirectory = data.current_path;
    updatePromptDisplay();
    showNotification(`目录已切换到: ${data.current_path}`);
}
```

通过以上协调机制，确保前后端解决方案的一致性和完整性，避免"只顾头不顾尾"的问题。
        };
    }
    
    // 普通TAB补全逻辑
    return this.normalTabCompletion(command, currentContext);
}

// 监听目录变化，更新当前目录状态
handleDirectoryChange(newPath) {
    this.currentDirectory = newPath;
    this.updatePromptDisplay();
}
```

#### BUG处理优先级

1. **高优先级**（立即修复）:
   - cd .. 无法跳出问题
   - LS命令后多余换行问题

2. **中优先级**（下次迭代）:
   - 文件列表横纵排列显示
   - 增强颜色显示方案

3. **低优先级**（长期优化）:
   - 特殊文件类型识别优化
   - 性能优化和缓存机制

#### 后端实现方案

**方案选择**: 使用结构化JSON格式返回文件列表（推荐）

当检测到 `ls` 命令时，后端可以选择返回两种格式：

1. **普通文本格式**（兼容模式，回退方案）:
   ```json
   {
     "type": "output",
     "data": "file1\nfile2\ndir1\n"
   }
   ```

2. **结构化格式**（颜色支持模式，默认）:
```json
{
  "type": "ls_output",
  "data": {
    "files": [
      {
        "name": "file1",
        "type": "file",
        "permissions": "rw-r--r--",
        "is_executable": false,
        "is_base": false,
        "color_info": {
          "color_class": "file",
          "ansi_color": "\x1b[0m",
          "css_color": "#ffffff"
        }
      },
      {
        "name": "dir1",
        "type": "directory",
        "permissions": "rwxr-xr-x",
        "is_executable": false,
        "is_base": false,
        "color_info": {
          "color_class": "directory",
          "ansi_color": "\x1b[34;1m",
          "css_color": "#339af0"
        }
      },
      {
        "name": "script.sh",
        "type": "file",
        "permissions": "rwxr-xr-x",
        "is_executable": true,
        "is_base": false,
        "color_info": {
          "color_class": "executable",
          "ansi_color": "\x1b[92m",
          "css_color": "#51cf66"
        }
      },
      {
        "name": "base",
        "type": "directory",
        "permissions": "rwxr-xr-x",
        "is_executable": false,
        "is_base": true,
        "color_info": {
          "color_class": "base",
          "ansi_color": "\x1b[33;1m",
          "css_color": "#ffd43b"
        }
      },
      {
        "name": ".hidden",
        "type": "file",
        "permissions": "rw-r--r--",
        "is_executable": false,
        "is_base": false,
        "color_info": {
          "color_class": "hidden",
          "ansi_color": "\x1b[90m",
          "css_color": "#808080"
        }
      }
    ],
    "layout": {
      "columns": 4,
      "rows": [
        [/* 第1行文件 */],
        [/* 第2行文件 */]
      ],
      "column_width": 15,
      "total_files": 5
    },
    "prompt": "(base) root@VM-0-15-ubuntu:/# "
  }
}
```

**实现逻辑**:
- 当检测到简单的 `ls` 命令时（不含管道、分号、逻辑运算等），优先尝试结构化输出
- 如果结构化输出失败（如stat命令不可用），自动回退到普通文本格式
- 结构化输出提供详细的文件类型、权限、可执行性等信息，便于前端应用颜色方案

**文件类型定义**:
- `directory`: 目录
- `file`: 普通文件
- `symlink`: 符号链接
- `socket`: 套接字文件
- `pipe`: 管道文件
- `block`: 块设备
- `char`: 字符设备

**BASE路径识别**:
- 检测目录名是否为 `base`、`miniconda`、`conda` 等conda环境相关名称
- 检测路径是否包含conda环境标识（如 `(base)` 在提示符中）
- 设置 `is_base: true` 标记

**后端实现步骤**:
1. 检测 `ls` 命令（简单命令，无管道等）
2. 执行 `ls -1` 获取文件列表
3. 对每个文件执行 `stat` 或 `file` 命令获取详细信息
4. 识别文件类型和权限
5. 检测BASE路径
6. 构造结构化JSON数据
7. 发送 `ls_output` 类型消息

**技术实现细节**:
- 使用 `stat -c '%F|%a|%A' filename` 命令获取文件详细信息
- 文件类型通过stat输出的文件类型字符串判断（directory、symbolic link等）
- 可执行性通过符号权限中的'x'字符判断
- BASE路径通过文件名匹配（base、miniconda、conda、anaconda）识别
- 如果stat命令失败，回退到使用 `ls -ld filename` 命令解析输出
- 结构化输出与普通输出完全分离，避免ANSI控制序列干扰

**Python实现示例**:
```python
import os
import stat
import json

def get_file_info(filepath, current_dir):
    """获取文件详细信息"""
    full_path = os.path.join(current_dir, filepath)
    try:
        stat_info = os.stat(full_path)
        mode = stat_info.st_mode
        
        # 判断文件类型
        if stat.S_ISDIR(mode):
            file_type = "directory"
        elif stat.S_ISLNK(mode):
            file_type = "symlink"
        elif stat.S_ISSOCK(mode):
            file_type = "socket"
        elif stat.S_ISFIFO(mode):
            file_type = "pipe"
        elif stat.S_ISBLK(mode):
            file_type = "block"
        elif stat.S_ISCHR(mode):
            file_type = "char"
        else:
            file_type = "file"
        
        # 获取权限
        permissions = stat.filemode(mode)
        
        # 判断是否可执行
        is_executable = bool(mode & (stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH))
        
        # 判断是否是BASE路径
        is_base = filepath.lower() in ['base', 'miniconda', 'conda', 'anaconda']
        
        return {
            "name": filepath,
            "type": file_type,
            "permissions": permissions,
            "is_executable": is_executable,
            "is_base": is_base
        }
    except Exception as e:
        # 如果获取信息失败，返回默认值
        return {
            "name": filepath,
            "type": "file",
            "permissions": "----------",
            "is_executable": False,
            "is_base": False
        }

def process_ls_command(command, current_dir):
    """处理ls命令，返回结构化数据"""
    # 执行ls命令
    result = subprocess.run(['ls', '-1'], cwd=current_dir, 
                           capture_output=True, text=True)
    files = result.stdout.strip().split('\n')
    
    # 获取每个文件的详细信息
    file_info_list = []
    for filename in files:
        if filename:  # 跳过空行
            file_info = get_file_info(filename, current_dir)
            file_info_list.append(file_info)
    
    return {
        "type": "ls_output",
        "data": {
            "files": file_info_list,
            "prompt": get_current_prompt()  # 获取当前提示符
        }
    }
```

#### 前端实现方案

**颜色方案定义**:
```javascript
const FILE_COLORS = {
  // 目录 - 蓝色
  directory: '\x1b[34m',  // 蓝色
  // 普通文件 - 默认颜色（白色）
  file: '\x1b[0m',        // 重置
  // 可执行文件 - 绿色
  executable: '\x1b[32m', // 绿色
  // 符号链接 - 青色
  symlink: '\x1b[36m',    // 青色
  // BASE路径 - 黄色加粗
  base: '\x1b[33;1m',     // 黄色加粗
  // 特殊文件类型
  socket: '\x1b[35m',     // 紫色
  pipe: '\x1b[33m',       // 黄色
  block: '\x1b[34;46m',   // 蓝色背景
  char: '\x1b[34;43m',    // 蓝色背景
  // 重置颜色
  reset: '\x1b[0m'
}
```

**前端处理逻辑**:
1. 检测消息类型为 `ls_output`
2. 解析文件列表数据
3. 根据文件类型和属性应用颜色
4. 格式化多列显示
5. 在提示符前添加换行（如果不存在）

**JavaScript实现示例**:
```javascript
function formatLsOutputWithColors(lsData, terminal) {
  const { files, prompt } = lsData
  let result = ''
  
  // 获取终端宽度
  const terminalWidth = terminal?.cols || 120
  
  // 计算最大文件名宽度（考虑颜色代码）
  const maxNameWidth = Math.max(...files.map(f => f.name.length))
  const columnWidth = maxNameWidth + 2
  const columns = Math.max(1, Math.floor(terminalWidth / columnWidth))
  const actualColumns = Math.min(columns, 8)
  
  // 格式化每个文件名，添加颜色
  const coloredFiles = files.map(file => {
    let color = FILE_COLORS.reset
    
    // 确定颜色
    if (file.is_base) {
      color = FILE_COLORS.base
    } else if (file.type === 'directory') {
      color = FILE_COLORS.directory
    } else if (file.is_executable) {
      color = FILE_COLORS.executable
    } else if (file.type === 'symlink') {
      color = FILE_COLORS.symlink
    } else if (file.type === 'socket') {
      color = FILE_COLORS.socket
    } else if (file.type === 'pipe') {
      color = FILE_COLORS.pipe
    } else if (file.type === 'block' || file.type === 'char') {
      color = FILE_COLORS.block
    } else {
      color = FILE_COLORS.file
    }
    
    return {
      name: file.name,
      colored: color + file.name + FILE_COLORS.reset,
      width: file.name.length
    }
  })
  
  // 多列排列
  const totalRows = Math.ceil(coloredFiles.length / actualColumns)
  for (let row = 0; row < totalRows; row++) {
    let rowContent = ''
    for (let col = 0; col < actualColumns; col++) {
      const index = row * actualColumns + col
      if (index < coloredFiles.length) {
        const item = coloredFiles[index]
        if (col < actualColumns - 1) {
          // 使用原始文件名长度计算填充（不考虑颜色代码）
          const padding = columnWidth - item.width
          rowContent += item.colored + ' '.repeat(padding)
        } else {
          rowContent += item.colored
        }
      }
    }
    result += rowContent.trimEnd() + '\n'
  }
  
  // 添加提示符（不换行）
  if (prompt) {
    result += prompt
  }
  
  return result
}
```

#### 兼容性处理

**向后兼容**:
- 如果后端不支持结构化格式，继续使用普通文本格式
- 前端检测消息类型，如果是 `output` 类型，使用原有处理逻辑
- 如果是 `ls_output` 类型，使用新的颜色格式化逻辑

**渐进式升级**:
1. **阶段1**: 后端添加 `ls_output` 消息类型支持（可选）
2. **阶段2**: 前端添加颜色格式化逻辑
3. **阶段3**: 默认启用结构化格式（可通过配置开关控制）

#### 配置选项

后端可以通过配置控制是否启用结构化输出：
```python
# 配置示例
LS_COLORED_OUTPUT = True  # 是否启用颜色输出
LS_STRUCTURED_OUTPUT = True  # 是否使用结构化格式
```

前端可以通过环境变量或配置控制：
```javascript
// 配置示例
const ENABLE_LS_COLORS = true  // 是否启用颜色显示
const LS_COLUMN_COUNT = 8      // 最大列数
```

#### 性能考虑

- 对于大量文件（>1000个），可以考虑：
  - 限制结构化输出的文件数量
  - 使用异步处理
  - 分批发送数据
- 缓存文件信息，避免重复 `stat` 调用

#### 颜色方案参考

参考常见终端工具的颜色方案：
- **目录**: 蓝色（`\x1b[34m`）
- **可执行文件**: 绿色（`\x1b[32m`）
- **普通文件**: 默认颜色（`\x1b[0m`）
- **符号链接**: 青色（`\x1b[36m`）
- **BASE路径**: 黄色加粗（`\x1b[33;1m`）或特殊标记
- **特殊文件**: 根据类型使用不同颜色

### TAB补全规则

#### 命令补全
- **触发条件**: 第一个词且不以空格结尾
- **实现方式**: 使用 `compgen -c` 命令
- **返回**: 匹配的所有命令列表

#### 文件/目录补全
- **触发条件**: 非第一个词或前面有路径
- **实现方式**: 使用 `ls -1F` 获取当前目录文件列表
- **特殊处理**:
  - `cd` 命令只补全目录（过滤以 `/` 结尾的项）
  - 其他命令补全所有文件类型
  - 移除文件类型标记（`/`, `*`, `@`, `|`, `=`）

#### 路径处理
- 维护每个会话的当前工作目录缓存
- 支持相对路径和绝对路径补全
- 根目录回退机制（当当前目录无匹配时）

## 输出过滤规则

### 已过滤的系统信息
以下系统状态信息会被自动过滤，不会出现在输出中：
- `Memory usage:` 内存使用率信息
- `IPv4 address for` IPv4地址信息  
- `System load:` 系统负载信息

### ANSI序列处理
系统会移除以下ANSI控制序列：
- **CSI序列**: `\x1b\[[0-9;?]*[A-Za-z]`（颜色、样式、光标移动等）
- **Bracketed Paste**: `\x1b\[\?2004[hl]`（粘贴模式切换）
- **OSC序列**: `\x1b\][^\x07]*(?:\x07|\x1b\\)`（终端标题等）

### 换行符标准化
所有输出统一使用 `\n` 作为换行符，移除 `\r\n` 和单独的 `\r`。

## 前端展示建议

### 终端模拟器
- 使用等宽字体（monospace）确保字符对齐
- 支持基本的ANSI颜色代码（可选）
- 正确处理换行和光标位置

### 输出排版
- 按行分割输出内容进行显示
- 保持原始的空格和缩进格式
- 支持横向滚动以适应长行

### TAB补全交互
- 显示补全候选项列表
- 支持键盘导航选择
- 自动插入选择的补全内容

### 性能优化
- 对于大量输出，考虑分页显示
- 实现输出暂停机制（补全期间）
- 缓存常用命令的输出结果

## 错误处理

### 连接错误
```json
{
  "type": "error",
  "data": {
    "message": "连接失败: 认证错误或网络问题"
  }
}
```

### 命令执行错误
```json
{
  "type": "error", 
  "data": {
    "message": "命令执行失败: 权限不足或命令不存在"
  }
}
```

### 补全错误
当补全失败时，返回空选项列表：
```json
{
  "type": "tab_completion_options",
  "data": {
    "options": [],
    "base": "",
    "error": "补全失败的具体原因"
  }
}
```

## 实现细节

### 输出暂停机制
在TAB补全期间，系统会暂停输出以避免干扰：
```python
output_paused = asyncio.Event()
output_paused.set()  # 初始状态：允许输出

# 补全开始时
output_paused.clear()  # 暂停输出

# 补全结束后
output_paused.set()    # 恢复输出
```

### 命令回显过滤
系统会过滤SSH服务器回显的命令，避免重复显示：
```python
# 使用正则表达式匹配命令回显模式
cmd_pattern = re.escape(last_sent_command) + r'(?:\x1b\[[0-9;]*[a-zA-Z])*\r\n'
if re.search(cmd_pattern, data):
    data = re.sub(cmd_pattern, '', data)
```

### 工作目录跟踪
系统维护每个SSH会话的工作目录缓存，用于准确的文件补全：
- 解析 `cd` 命令更新缓存
- 支持相对路径和绝对路径
- 处理特殊目录（`~`, `.`, `..`）

## 版本历史
- v1.0: 初始版本，基础输出标准化
- v1.1: 添加TAB补全和输出过滤
- v1.2: 添加终端尺寸调整和ls命令重写
- v1.3: 完善ANSI序列处理和错误处理
- v1.4: 添加ls命令文件列表颜色显示方案（结构化输出）

## 注意事项
1. 所有消息必须为有效的JSON格式
2. WebSocket连接需要保持心跳检测
3. 大文件操作可能影响响应速度
4. 复杂的Shell特性（如别名、函数）可能无法完全支持
5. 建议在用户界面提供连接状态指示器