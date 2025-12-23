# VIM Mode Integration Design Specification

## Executive Summary

This document specifies the design for integrating VIM mode functionality into the SSH terminal frontend (SshTerminal.vue). The design ensures VIM editing is handled entirely in the frontend, with backend synchronization only on save operations.

## Problem Statement

Current issues with VIM in SSH terminal:
1. VIM insert mode not responding to keyboard input
2. Cursor positioning errors after mode switches
3. Command-line mode (:) not functioning
4. ESC key not working for mode transitions
5. VIM commands incorrectly using 'input' type instead of 'vim_command'
6. Missing VIM state management and mode indicators

## Design Goals

1. **Frontend-Only Editing**: All VIM editing operations handled in frontend
2. **Proper State Management**: Support all 6 VIM modes with correct transitions
3. **Input Isolation**: Separate VIM keyboard handling from terminal input
4. **Message Protocol**: Use 'vim_command' type for all VIM operations
5. **Backend Sync**: Send file content to backend only on save (:w, :wq)
6. **Non-Disruptive**: Maintain compatibility with existing terminal functionality

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SshTerminal.vue                          │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │           VIM Detection Layer                         │  │
│  │  - Detects vim/vi command execution                   │  │
│  │  - Switches input handling mode                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           VIM State Manager                           │  │
│  │  - Current mode (Normal/Insert/Visual/etc)            │  │
│  │  - Mode transitions                                   │  │
│  │  - Mode indicator display                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           VIM Buffer Manager                          │  │
│  │  - File content storage                               │  │
│  │  - Cursor position tracking                           │  │
│  │  - Edit operations (insert/delete/replace)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           VIM Input Handler                           │  │
│  │  - Mode-specific key bindings                         │  │
│  │  - Command parsing                                    │  │
│  │  - Input isolation from terminal                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           VIM Renderer                                │  │
│  │  - Display file content                               │  │
│  │  - Cursor rendering                                   │  │
│  │  - Status line (mode, position, filename)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           Backend Communication                       │  │
│  │  - Send vim_command messages                          │  │
│  │  - Save operations (:w, :wq)                          │  │
│  │  - Exit operations (:q, :q!)                          │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. VIM State Manager

**Purpose**: Manage VIM mode state and transitions

**State Structure**:
```typescript
interface VimState {
  isActive: boolean           // Whether VIM mode is active
  mode: VimMode              // Current VIM mode
  filename: string           // File being edited
  modified: boolean          // Whether file has unsaved changes
  cursorPosition: CursorPos  // Current cursor position
  visualStart: CursorPos     // Visual mode start position (if applicable)
  commandBuffer: string      // Command-line mode input buffer
  lastCommand: string        // Last executed command (for . repeat)
  register: Map<string, string> // Yank registers
}

enum VimMode {
  NORMAL = 'NORMAL',
  INSERT = 'INSERT',
  VISUAL = 'VISUAL',
  VISUAL_LINE = 'VISUAL_LINE',
  VISUAL_BLOCK = 'VISUAL_BLOCK',
  COMMAND = 'COMMAND',
  REPLACE = 'REPLACE',
  SELECT = 'SELECT'
}

interface CursorPos {
  row: number    // 0-indexed row
  col: number    // 0-indexed column
}
```

**Mode Transitions**:
```
NORMAL → INSERT:     i, I, a, A, o, O, s, S, C, cc
NORMAL → VISUAL:     v, V, Ctrl+v
NORMAL → COMMAND:    :, /, ?
NORMAL → REPLACE:    R
INSERT → NORMAL:     ESC, Ctrl+[
VISUAL → NORMAL:     ESC, Ctrl+[
COMMAND → NORMAL:    ESC, Enter (execute)
REPLACE → NORMAL:    ESC
```

### 2. VIM Buffer Manager

**Purpose**: Store and manipulate file content in frontend

**Buffer Structure**:
```typescript
interface VimBuffer {
  lines: string[]           // File content as array of lines
  filename: string          // File path
  modified: boolean         // Dirty flag
  readonly: boolean         // Read-only flag
  fileType: string          // File type for syntax highlighting
}

class VimBufferManager {
  private buffer: VimBuffer

  // Core operations
  insertChar(pos: CursorPos, char: string): void
  deleteChar(pos: CursorPos): void
  deleteLine(row: number): void
  insertLine(row: number, content: string): void
  replaceLine(row: number, content: string): void

  // Cursor operations
  moveCursor(direction: 'up'|'down'|'left'|'right'): CursorPos
  moveCursorToLineStart(): CursorPos
  moveCursorToLineEnd(): CursorPos
  moveCursorToWord(direction: 'next'|'prev'): CursorPos

  // Content operations
  getLine(row: number): string
  getLines(start: number, end: number): string[]
  getContent(): string
  setContent(content: string): void

  // State operations
  isModified(): boolean
  markClean(): void
  markDirty(): void
}
```

### 3. VIM Input Handler

**Purpose**: Process keyboard input based on current VIM mode

**Input Routing**:
```typescript
class VimInputHandler {
  private state: VimState
  private buffer: VimBufferManager

  handleKeyPress(key: string, modifiers: KeyModifiers): void {
    if (!this.state.isActive) {
      // Pass through to terminal
      return this.handleTerminalInput(key)
    }

    switch (this.state.mode) {
      case VimMode.NORMAL:
        return this.handleNormalMode(key, modifiers)
      case VimMode.INSERT:
        return this.handleInsertMode(key, modifiers)
      case VimMode.VISUAL:
      case VimMode.VISUAL_LINE:
      case VimMode.VISUAL_BLOCK:
        return this.handleVisualMode(key, modifiers)
      case VimMode.COMMAND:
        return this.handleCommandMode(key, modifiers)
      case VimMode.REPLACE:
        return this.handleReplaceMode(key, modifiers)
    }
  }

  private handleNormalMode(key: string, modifiers: KeyModifiers): void {
    // Movement: h, j, k, l, w, b, e, 0, $, gg, G
    // Edit: x, dd, yy, p, P, u, Ctrl+r
    // Mode switch: i, I, a, A, o, O, v, V, :, /
  }

  private handleInsertMode(key: string, modifiers: KeyModifiers): void {
    if (key === 'Escape' || (key === '[' && modifiers.ctrl)) {
      this.state.mode = VimMode.NORMAL
      return
    }

    // Insert character at cursor position
    this.buffer.insertChar(this.state.cursorPosition, key)
    this.state.cursorPosition.col++
  }

  private handleCommandMode(key: string, modifiers: KeyModifiers): void {
    if (key === 'Escape') {
      this.state.mode = VimMode.NORMAL
      this.state.commandBuffer = ''
      return
    }

    if (key === 'Enter') {
      this.executeCommand(this.state.commandBuffer)
      this.state.commandBuffer = ''
      this.state.mode = VimMode.NORMAL
      return
    }

    if (key === 'Backspace') {
      this.state.commandBuffer = this.state.commandBuffer.slice(0, -1)
      return
    }

    // Append to command buffer
    this.state.commandBuffer += key
  }
}
```

### 4. VIM Detection Layer

**Purpose**: Detect when VIM is launched and activate VIM mode

**Detection Strategy**:
```typescript
class VimDetector {
  private ws: WebSocket
  private onVimActivated: (filename: string, content: string) => void
  private onVimDeactivated: () => void

  detectVimCommand(command: string): boolean {
    // Match: vim, vi, nvim followed by optional filename
    const vimPattern = /^(vim|vi|nvim)\s*(.*)$/
    const match = command.match(vimPattern)

    if (match) {
      const filename = match[2].trim() || 'untitled'
      this.activateVimMode(filename)
      return true
    }

    return false
  }

  private activateVimMode(filename: string): void {
    // Send request to backend to read file content
    this.ws.send(JSON.stringify({
      type: 'vim_command',
      data: {
        action: 'open',
        filename: filename,
        currentPath: this.getCurrentPath()
      }
    }))
  }

  handleBackendResponse(message: any): void {
    if (message.type === 'vim_file_content') {
      // Activate VIM mode with file content
      this.onVimActivated(message.data.filename, message.data.content)
    }
  }
}
```

### 5. VIM Renderer

**Purpose**: Display VIM interface in terminal

**Rendering Strategy**:
```typescript
class VimRenderer {
  private terminal: Terminal
  private buffer: VimBufferManager
  private state: VimState

  render(): void {
    // Clear terminal
    this.terminal.clear()

    // Render file content
    this.renderContent()

    // Render status line
    this.renderStatusLine()

    // Render command line (if in command mode)
    if (this.state.mode === VimMode.COMMAND) {
      this.renderCommandLine()
    }

    // Position cursor
    this.positionCursor()
  }

  private renderContent(): void {
    const lines = this.buffer.lines
    const terminalHeight = this.terminal.rows - 2 // Reserve 2 lines for status

    // Calculate visible range based on cursor position
    const visibleStart = Math.max(0, this.state.cursorPosition.row - Math.floor(terminalHeight / 2))
    const visibleEnd = Math.min(lines.length, visibleStart + terminalHeight)

    // Render visible lines
    for (let i = visibleStart; i < visibleEnd; i++) {
      const line = lines[i] || '~'
      this.terminal.write(line + '\r\n')
    }
  }

  private renderStatusLine(): void {
    const mode = this.getModeDisplay()
    const position = `${this.state.cursorPosition.row + 1},${this.state.cursorPosition.col + 1}`
    const modified = this.buffer.isModified() ? '[+]' : ''
    const filename = this.state.filename

    const statusLine = `${mode} ${filename} ${modified} ${position}`

    // Move to status line position (second to last row)
    this.terminal.write(`\x1b[${this.terminal.rows - 1};1H`)
    this.terminal.write(`\x1b[7m${statusLine.padEnd(this.terminal.cols)}\x1b[0m`)
  }

  private renderCommandLine(): void {
    // Move to last row
    this.terminal.write(`\x1b[${this.terminal.rows};1H`)
    this.terminal.write(`:${this.state.commandBuffer}`)
  }

  private getModeDisplay(): string {
    switch (this.state.mode) {
      case VimMode.NORMAL: return ''
      case VimMode.INSERT: return '-- INSERT --'
      case VimMode.VISUAL: return '-- VISUAL --'
      case VimMode.VISUAL_LINE: return '-- VISUAL LINE --'
      case VimMode.VISUAL_BLOCK: return '-- VISUAL BLOCK --'
      case VimMode.COMMAND: return ''
      case VimMode.REPLACE: return '-- REPLACE --'
      default: return ''
    }
  }

  private positionCursor(): void {
    const row = this.state.cursorPosition.row + 1
    const col = this.state.cursorPosition.col + 1
    this.terminal.write(`\x1b[${row};${col}H`)
  }
}
```

### 6. Backend Communication Protocol

**Message Types**:

```typescript
// Frontend → Backend

// Open file for editing
{
  type: 'vim_command',
  data: {
    action: 'open',
    filename: string,
    currentPath: string
  }
}

// Save file
{
  type: 'vim_command',
  data: {
    action: 'save',
    filename: string,
    content: string,
    currentPath: string
  }
}

// Quit VIM
{
  type: 'vim_command',
  data: {
    action: 'quit',
    filename: string,
    currentPath: string
  }
}

// Backend → Frontend

// File content response
{
  type: 'vim_file_content',
  data: {
    filename: string,
    content: string,
    readonly: boolean,
    exists: boolean
  }
}

// Save result
{
  type: 'vim_save_result',
  data: {
    success: boolean,
    message: string,
    filename: string
  }
}

// Error
{
  type: 'vim_error',
  data: {
    message: string,
    filename: string
  }
}
```

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Add VIM state management to SshTerminal.vue
2. Implement VIM detection layer
3. Create VIM buffer manager
4. Set up message protocol

### Phase 2: Input Handling
1. Implement input routing based on VIM mode
2. Add Normal mode key bindings
3. Add Insert mode handling
4. Add Command mode handling

### Phase 3: Rendering
1. Implement VIM renderer
2. Add status line display
3. Add mode indicators
4. Add cursor positioning

### Phase 4: Advanced Features
1. Add Visual mode support
2. Add Replace mode support
3. Implement yank/paste operations
4. Add undo/redo functionality

### Phase 5: Backend Integration
1. Implement file open/save operations
2. Add error handling
3. Test backend synchronization

## Key Design Decisions

### 1. Frontend-Only Editing
**Decision**: All editing operations happen in frontend memory
**Rationale**:
- Eliminates network latency for every keystroke
- Provides responsive editing experience
- Reduces backend complexity
- Only syncs on explicit save operations

### 2. Input Isolation
**Decision**: VIM mode intercepts all keyboard input before terminal processing
**Rationale**:
- Prevents VIM commands from being sent as terminal input
- Allows proper handling of special keys (ESC, :, etc.)
- Maintains clean separation between VIM and terminal modes

### 3. Message Protocol
**Decision**: Use 'vim_command' type for all VIM-related messages
**Rationale**:
- Clear distinction from regular terminal 'input' messages
- Allows backend to route VIM operations correctly
- Prevents confusion with terminal commands

### 4. State Management
**Decision**: Single VimState object with reactive updates
**Rationale**:
- Centralized state makes debugging easier
- Reactive updates trigger UI re-renders automatically
- Easy to persist/restore state if needed

## Integration Points

### Existing Code Modifications

**SshTerminal.vue - terminal.onData handler**:
```typescript
// Current implementation (lines 486-625)
this.terminal.onData((data) => {
  // BEFORE: All input sent to backend
  // AFTER: Check if VIM mode is active

  if (this.vimState.isActive) {
    // Route to VIM input handler
    this.vimInputHandler.handleKeyPress(data)
    return
  }

  // Existing terminal input handling
  // ... (keep existing code)
})
```

**Command detection**:
```typescript
// In handleCommand or before sending to backend
case '\r':
case '\n':
  // Check if command is vim/vi
  if (this.vimDetector.detectVimCommand(this.inputBuffer)) {
    // Don't send to backend, VIM mode will handle
    this.inputBuffer = ''
    break
  }

  // Existing command handling
  // ... (keep existing code)
```

## Testing Strategy

### Unit Tests

1. **VIM State Manager Tests**
   - Mode transitions
   - State initialization
   - State persistence

2. **VIM Buffer Manager Tests**
   - Insert/delete operations
   - Cursor movement
   - Content manipulation
   - Line operations

3. **VIM Input Handler Tests**
   - Normal mode key bindings
   - Insert mode character insertion
   - Command mode parsing
   - Mode switching

4. **VIM Renderer Tests**
   - Content rendering
   - Status line formatting
   - Cursor positioning
   - Mode indicators

### Integration Tests

1. **VIM Activation**
   - Detect vim command
   - Load file content
   - Initialize VIM mode

2. **Editing Operations**
   - Insert text
   - Delete text
   - Navigate with hjkl
   - Mode switching

3. **Save Operations**
   - Save file (:w)
   - Save and quit (:wq)
   - Quit without save (:q!)

4. **Backend Communication**
   - File open request/response
   - File save request/response
   - Error handling

### Regression Tests

1. **Terminal Functionality**
   - Regular commands still work
   - Command history preserved
   - Tab completion functional
   - Path management intact

2. **WebSocket Communication**
   - Non-VIM messages unaffected
   - Connection stability
   - Error handling

## Performance Considerations

1. **Rendering Optimization**
   - Only render visible lines (viewport)
   - Debounce rapid key presses
   - Use requestAnimationFrame for smooth updates

2. **Memory Management**
   - Limit buffer size for large files
   - Clear VIM state on exit
   - Dispose event listeners properly

3. **Network Efficiency**
   - Batch save operations if needed
   - Compress large file content
   - Handle network errors gracefully

## Security Considerations

1. **Input Validation**
   - Sanitize filename inputs
   - Validate file paths
   - Prevent path traversal attacks

2. **Content Safety**
   - Escape special characters in display
   - Prevent XSS in file content
   - Validate file size limits

3. **Backend Authorization**
   - Verify file access permissions
   - Validate save operations
   - Handle readonly files

## Compatibility Requirements

1. **Browser Support**
   - Modern browsers with ES6+ support
   - WebSocket support required
   - Terminal emulation compatibility

2. **Terminal Compatibility**
   - xterm.js version compatibility
   - ANSI escape sequence support
   - Cursor positioning support

3. **Backend Compatibility**
   - Support vim_command message type
   - File read/write operations
   - Error response handling

## Success Criteria

1. ✅ VIM insert mode accepts keyboard input
2. ✅ Cursor positioning correct after mode switches
3. ✅ Command-line mode (:) functional
4. ✅ ESC key properly switches modes
5. ✅ VIM commands use 'vim_command' type
6. ✅ Mode indicators displayed correctly
7. ✅ File saves to backend on :w/:wq
8. ✅ Regular terminal commands unaffected
9. ✅ All regression tests pass
10. ✅ Unit test coverage > 80%

## Future Enhancements

1. **Advanced VIM Features**
   - Search and replace (/, ?, n, N)
   - Macros (q, @)
   - Multiple buffers
   - Split windows

2. **Editor Improvements**
   - Syntax highlighting
   - Line numbers
   - Auto-indentation
   - Code folding

3. **User Experience**
   - Customizable key bindings
   - VIM configuration file support
   - Color scheme selection
   - Font size adjustment

## Appendix

### VIM Mode Reference

| Mode | Trigger | Exit | Purpose |
|------|---------|------|---------|
| Normal | ESC | - | Navigation and commands |
| Insert | i, I, a, A, o, O | ESC | Text insertion |
| Visual | v | ESC | Text selection |
| Visual Line | V | ESC | Line selection |
| Visual Block | Ctrl+v | ESC | Block selection |
| Command | : | ESC, Enter | Execute commands |
| Replace | R | ESC | Character replacement |

### Key Binding Summary

**Normal Mode**:
- Movement: h, j, k, l, w, b, e, 0, $, gg, G
- Edit: x, dd, yy, p, P, u, Ctrl+r
- Mode: i, I, a, A, o, O, v, V, :, /

**Insert Mode**:
- ESC: Return to Normal mode
- All printable characters: Insert at cursor

**Command Mode**:
- ESC: Cancel command
- Enter: Execute command
- Backspace: Delete character

### Command Reference

- `:w` - Save file
- `:q` - Quit (if no changes)
- `:q!` - Quit without saving
- `:wq` - Save and quit
- `:x` - Save and quit (same as :wq)

## Conclusion

This design provides a comprehensive, frontend-focused VIM mode integration that addresses all identified issues while maintaining compatibility with existing terminal functionality. The modular architecture allows for incremental implementation and testing, ensuring a robust and maintainable solution.
