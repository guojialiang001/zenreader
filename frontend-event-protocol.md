# 前端事件协议文档

## 概述

AI Agent 系统采用事件驱动架构，所有执行过程都会生成详细事件返回给前端，实现完全透明化。前端可以根据这些事件实时展示执行进度、工具调用、思考过程等信息。

## 架构说明

```
┌─────────────────────────────────────────────────────────────────┐
│                        主应用 (app/agent/)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ TaskAnalyzer│→ │ TaskPlanner │→ │    TaskExecutor         │  │
│  │ (任务分析)  │  │ (任务规划)  │  │ (执行引擎，生成事件)    │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
│                                                 │                │
│                                    HTTP API 调用 ↓                │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │
┌─────────────────────────────────────────────────┼────────────────┐
│                    沙箱容器 (Docker)             │                │
│  ┌─────────────────────────────────────────────┐│                │
│  │         sandbox_executor.py                 ││                │
│  │         (纯工具执行服务)                     │←                │
│  │         - 代码执行                          │                 │
│  │         - 文件操作                          │                 │
│  │         - Shell 命令                        │                 │
│  │         - GUI 操作                          │                 │
│  └─────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

## 事件类型总览

| 事件类型 | 说明 | 触发时机 |
|---------|------|---------|
| `process_started` | 处理开始 | 开始处理用户请求时 |
| `process_completed` | 处理完成 | 整个处理流程结束时 |
| `thinking` | 思考过程 | AI 分析、路由决策时 |
| `task_analysis` | 任务分析结果 | 分析用户请求后 |
| `task_analysis_complete` | 任务分析完成 | 分析阶段结束时 |
| `flow_node` | 流程节点状态 | 流程关键节点变化时 |
| `plan_start` | 计划开始 | 开始执行计划时 |
| `plan_complete` | 计划完成 | 计划执行结束时 |
| `plan_revision` | 计划修订中 | 步骤失败需要修订时 |
| `plan_revised` | 计划已修订 | 修订完成后 |
| `step_start` | 步骤开始 | 开始执行步骤时 |
| `step_success` | 步骤成功 | 步骤执行成功时 |
| `step_failed` | 步骤失败 | 步骤执行失败时 |
| `step_retry` | 步骤重试 | 步骤失败重试时 |
| `tool_call` | 工具调用 | 调用工具前 |
| `tool_result` | 工具结果 | 工具执行完成后 |
| `tool_fix` | 工具修复开始 | 工具执行失败，尝试修复时 |
| `tool_fixed` | 工具修复完成 | 工具调用已修复 |
| `interactive_prompt` | 交互式提示 | 命令需要交互式输入时 |
| `interactive_response` | 交互式响应 | 系统自动响应交互式提示时 |
| `user_input_required` | 需要用户输入 | 无法自动处理，需要用户选择时 |
| `user_input_received` | 用户输入已接收 | 收到用户的交互输入时 |
| `variable_set` | 变量设置 | 保存中间变量时 |
| `variable_resolve` | 变量解析 | 解析变量引用时 |
| `verification_start` | 验证开始 | 开始验证结果时 |
| `verification_result` | 验证结果 | 验证完成后 |
| `llm_call` | LLM 调用 | 调用 AI 前 |
| `llm_response` | LLM 响应 | AI 响应后 |
| `token` | 文本流 | 流式输出文本时 |
| `error` | 错误 | 发生错误时 |
| `todo_list_update` | 任务列表更新 | 任务列表创建或完成时 |
| `todo_item_update` | 任务项更新 | 单个任务状态变化时 |
| `file_tree_update` | 文件树更新 | 代码任务时返回项目结构 |
| `file_changes_update` | 文件变更列表 | 任务完成后返回变更文件 |

## 详细事件格式

### 0. 处理流程事件

#### process_started - 处理开始

整个处理流程开始时发送，前端可以用来初始化状态。

```json
{
    "type": "process_started",
    "message": "开始处理您的请求",
    "data": {
        "conversation_id": "uuid",
        "timestamp": "2024-01-03T12:00:00.000Z"
    }
}
```

#### process_completed - 处理完成

整个处理流程结束时发送，前端可以用来重置状态。

```json
{
    "type": "process_completed",
    "success": true,
    "message": "处理完成",
    "data": {
        "conversation_id": "uuid",
        "complexity": "simple|moderate|complex",
        "task_type": "chat|code|file|...",
        "timestamp": "2024-01-03T12:00:15.000Z"
    }
}
```

**失败时的格式：**
```json
{
    "type": "process_completed",
    "success": false,
    "message": "处理失败：错误信息",
    "data": {
        "conversation_id": "uuid",
        "error": "详细错误信息",
        "timestamp": "2024-01-03T12:00:15.000Z"
    }
}
```

### 1. 任务分析完成事件 (task_analysis_complete)

**重要**：此事件专门用于标记任务分析阶段的结束，前端收到此事件后应该：
1. 将分析状态从"分析中"更新为"分析完成"
2. 准备进入下一个处理阶段

```json
{
    "type": "task_analysis_complete",
    "message": "任务分析完成",
    "data": {
        "complexity": "simple|moderate|complex",
        "task_type": "chat|code|file|shell|gui|browser|analysis|creative",
        "requires_sandbox": true|false,
        "reasoning": "分析理由",
        "suggested_approach": "建议的处理方式"
    }
}
```

**前端处理示例：**
```javascript
case 'task_analysis_complete':
    // 标记分析完成
    setAnalysisStatus('completed');
    // 隐藏分析中的加载动画
    hideAnalysisLoading();
    // 显示分析结果摘要
    showAnalysisSummary(data.payload.data);
    break;
```

### 2. 思考过程事件 (thinking)

表示 AI 的思考和决策过程。

```json
{
    "type": "thinking",
    "step_type": "analyzing|routing|planning|executing|tool_execution|step_complete|step_failed|replanning|warning",
    "content": "人类可读的思考内容"
}
```

**step_type 说明：**
- `analyzing`: 正在分析用户请求
- `routing`: 路由决策（简单/中等/复杂）
- `planning`: 制定执行计划
- `executing`: 执行计划中
- `tool_execution`: 执行工具
- `step_complete`: 步骤完成
- `step_failed`: 步骤失败
- `replanning`: 修订计划
- `warning`: 警告信息

### 2. 任务分析事件 (task_analysis)

AI 分析用户请求后返回的结果。

```json
{
    "type": "task_analysis",
    "analysis": {
        "complexity": "simple|moderate|complex",
        "task_type": "chat|code|file|shell|gui|browser|analysis|creative",
        "requires_sandbox": true,
        "reasoning": "这是一个需要执行代码的任务，因为用户要求创建一个 Python 脚本",
        "suggested_approach": "创建 Python 文件并执行测试"
    }
}
```

**complexity 说明：**
- `simple`: 简单问答，直接回答（如：什么是Python？）
- `moderate`: 中等复杂度，可能需要简单工具
- `complex`: 复杂任务，需要多步骤执行

**task_type 说明：**
- `chat`: 普通对话问答
- `code`: 代码编写、执行、调试
- `file`: 文件创建、读取、修改
- `shell`: 系统命令执行
- `gui`: 图形界面操作
- `browser`: 网页浏览、操作
- `analysis`: 数据分析处理
- `creative`: 创意内容生成

### 3. 流程节点事件 (flow_node)

表示执行流程中的关键节点状态变化。

```json
{
    "type": "flow_node",
    "node": "planning|execution|step_execution|replanning|summarizing",
    "status": "started|completed|failed",
    "message": "人类可读的状态描述",
    "data": {
        // 节点相关数据
    }
}
```

**示例 - 规划开始：**
```json
{
    "type": "flow_node",
    "node": "planning",
    "status": "started",
    "message": "正在制定执行计划...",
    "data": {
        "task_type": "code",
        "suggested_approach": "创建并执行 Python 脚本",
        "complexity": "complex"
    }
}
```

**示例 - 规划完成：**
```json
{
    "type": "flow_node",
    "node": "planning",
    "status": "completed",
    "message": "计划创建完成，共 3 个步骤",
    "data": {
        "plan": { /* 完整计划对象 */ },
        "steps_preview": [
            {"step_id": 0, "description": "创建 Python 文件", "tool": "file_manager"},
            {"step_id": 1, "description": "执行代码", "tool": "execute_code"},
            {"step_id": 2, "description": "验证结果", "tool": null}
        ]
    }
}
```

### 4. 计划相关事件

#### plan_start - 计划开始执行

```json
{
    "type": "plan_start",
    "message": "开始执行计划: 创建并运行 Hello World 程序",
    "data": {
        "plan": {
            "goal": "创建并运行 Hello World 程序",
            "steps": [ /* 步骤列表 */ ],
            "created_at": "2024-01-03T12:00:00.000Z"
        },
        "total_steps": 3,
        "steps_preview": [
            {
                "step_id": 0,
                "description": "创建 hello.py 文件",
                "tool": "file_manager",
                "depends_on": []
            },
            {
                "step_id": 1,
                "description": "执行 Python 代码",
                "tool": "execute_code",
                "depends_on": [0]
            }
        ],
        "execution_config": {
            "max_retries": 3,
            "max_revisions": 2
        }
    },
    "timestamp": "2024-01-03T12:00:00.000Z"
}
```

#### plan_complete - 计划执行完成

```json
{
    "type": "plan_complete",
    "message": "任务执行完成",
    "data": {
        "success": true,
        "duration": 15.5,
        "statistics": {
            "total_steps": 3,
            "completed_steps": 3,
            "failed_steps": 0,
            "revision_count": 0
        },
        "context": {
            "variables": {
                "step_0_result": { /* 结果 */ },
                "step_1_stdout": "Hello, World!"
            },
            "step_results": { /* 所有步骤结果 */ },
            "errors": [],
            "duration": 15.5
        },
        "plan": { /* 最终计划状态 */ },
        "summary": {
            "goal": "创建并运行 Hello World 程序",
            "steps_executed": [
                {
                    "step_id": 0,
                    "description": "创建 hello.py 文件",
                    "status": "success",
                    "tool": "file_manager",
                    "result_preview": "文件创建成功",
                    "error": null
                },
                {
                    "step_id": 1,
                    "description": "执行 Python 代码",
                    "status": "success",
                    "tool": "execute_code",
                    "result_preview": "Hello, World!",
                    "error": null
                }
            ]
        }
    },
    "timestamp": "2024-01-03T12:00:15.500Z"
}
```

#### plan_revision - 计划修订中

```json
{
    "type": "plan_revision",
    "message": "步骤 1 失败，正在修订计划...",
    "data": {
        "failed_step": {
            "step_id": 1,
            "description": "执行 Python 代码",
            "status": "failed",
            "error": "ModuleNotFoundError: No module named 'pandas'"
        },
        "error": "ModuleNotFoundError: No module named 'pandas'",
        "revision_count": 1,
        "max_revisions": 2
    },
    "timestamp": "2024-01-03T12:00:10.000Z"
}
```

#### plan_revised - 计划已修订

```json
{
    "type": "plan_revised",
    "message": "计划已修订，新计划包含 4 个步骤",
    "data": {
        "plan": { /* 新计划 */ },
        "new_steps": [
            {"step_id": 0, "description": "安装 pandas 模块", "tool": "shell"},
            {"step_id": 1, "description": "创建 Python 文件", "tool": "file_manager"},
            {"step_id": 2, "description": "执行代码", "tool": "execute_code"}
        ],
        "revision_count": 1
    },
    "timestamp": "2024-01-03T12:00:12.000Z"
}
```

### 5. 步骤相关事件

#### step_start - 步骤开始

```json
{
    "type": "step_start",
    "message": "开始执行步骤 1: 执行 Python 代码",
    "data": {
        "step": {
            "step_id": 1,
            "description": "执行 Python 代码",
            "tool": "execute_code",
            "tool_args": {
                "language": "python",
                "code": "print('Hello, World!')"
            },
            "status": "running"
        },
        "progress": {
            "current": 2,
            "total": 3,
            "percentage": 66.7
        },
        "dependencies": [0],
        "tool_info": {
            "name": "execute_code",
            "args": {
                "language": "python",
                "code": "print('Hello, World!')"
            },
            "description": "执行代码（Python/JavaScript/Shell等）"
        }
    },
    "timestamp": "2024-01-03T12:00:05.000Z"
}
```

#### step_success - 步骤成功

```json
{
    "type": "step_success",
    "message": "步骤 1 执行成功: 执行 Python 代码",
    "data": {
        "step": {
            "step_id": 1,
            "description": "执行 Python 代码",
            "status": "success",
            "result": {
                "success": true,
                "stdout": "Hello, World!\n",
                "stderr": "",
                "return_code": 0
            }
        },
        "result_summary": {
            "success": true,
            "output_preview": "Hello, World!"
        },
        "variables_created": [
            "step_1_result",
            "step_1_stdout"
        ]
    },
    "timestamp": "2024-01-03T12:00:07.000Z"
}
```

#### step_failed - 步骤失败

```json
{
    "type": "step_failed",
    "message": "步骤 1 执行失败: ModuleNotFoundError",
    "data": {
        "step": {
            "step_id": 1,
            "description": "执行 Python 代码",
            "status": "failed",
            "error": "ModuleNotFoundError: No module named 'pandas'"
        },
        "error": "ModuleNotFoundError: No module named 'pandas'",
        "retry_count": 3,
        "can_revise": true
    },
    "timestamp": "2024-01-03T12:00:08.000Z"
}
```

#### step_retry - 步骤重试

```json
{
    "type": "step_retry",
    "message": "步骤 1 执行失败，正在重试 (2/3)",
    "data": {
        "step_id": 1,
        "retry_count": 2,
        "max_retries": 3,
        "error": "Connection timeout",
        "will_retry": true
    },
    "timestamp": "2024-01-03T12:00:06.500Z"
}
```

### 6. 工具相关事件

#### tool_call - 工具调用

```json
{
    "type": "tool_call",
    "message": "调用工具: execute_code",
    "data": {
        "tool": "execute_code",
        "arguments": {
            "language": "python",
            "code": "import pandas as pd\nprint(pd.__version__)",
            "timeout": 30
        },
        "step_id": 1,
        "description": "执行 Python 代码检查 pandas 版本",
        "tool_description": "执行代码（Python/JavaScript/Shell等）"
    },
    "timestamp": "2024-01-03T12:00:05.100Z"
}
```

#### tool_result - 工具结果

```json
{
    "type": "tool_result",
    "message": "工具 execute_code 执行成功",
    "data": {
        "tool": "execute_code",
        "success": true,
        "result": {
            "success": true,
            "stdout": "2.0.3\n",
            "stderr": "",
            "return_code": 0
        },
        "step_id": 1,
        "execution_time": 1.5
    },
    "timestamp": "2024-01-03T12:00:06.600Z"
}
```

#### tool_fix - 工具修复开始

当工具执行失败时，系统会尝试使用 AI 分析错误并修复命令。

```json
{
    "type": "tool_fix",
    "message": "工具执行失败，尝试修复 (1/2)",
    "data": {
        "step_id": 1,
        "tool": "shell_executor",
        "error": "TypeError [ERR_PARSE_ARGS_INVALID_OPTION_VALUE]: 选项 '--typescript' 不接受参数",
        "original_args": {
            "command": "npx create-vue vue3-project --typescript=false --router=true",
            "working_dir": "/home/sandbox/workspace"
        },
        "fix_attempt": 1
    },
    "timestamp": "2024-01-03T12:00:06.700Z"
}
```

#### tool_fixed - 工具修复完成

当 AI 成功分析并修复命令后发送此事件。

```json
{
    "type": "tool_fixed",
    "message": "命令已修复: 使用正确的 create-vue 参数格式",
    "data": {
        "step_id": 1,
        "fix_type": "command_fix",
        "analysis": "create-vue 新版本不接受 --option=value 格式的参数",
        "original_args": {
            "command": "npx create-vue vue3-project --typescript=false --router=true",
            "working_dir": "/home/sandbox/workspace"
        },
        "fixed_args": {
            "command": "npm create vue@latest vue3-project -- --default",
            "working_dir": "/home/sandbox/workspace"
        },
        "fixed_command": "npm create vue@latest vue3-project -- --default",
        "explanation": "使用 npm create vue@latest 配合 --default 参数创建默认配置的 Vue 项目"
    },
    "timestamp": "2024-01-03T12:00:07.500Z"
}
```

**fix_type 修复类型说明：**
- `command_fix`: 命令修复（修改命令本身）
- `args_fix`: 参数修复（修改工具参数）
- `alternative_approach`: 替代方案（使用完全不同的方法）

### 6.5 交互式命令事件

交互式命令事件用于处理需要用户输入的 CLI 命令，如 `npm create vue@latest`、`npm init` 等。系统会检测命令的交互式提示，并根据情况自动响应或请求用户输入。

#### 事件流程图

```
命令执行 ──→ 检测到交互提示 ──→ interactive_prompt 事件
                                        │
                                        ▼
                                  系统分析提示
                                        │
                          ┌─────────────┴─────────────┐
                          ▼                           ▼
                    可以自动决定               无法自动决定
                          │                           │
                          ▼                           ▼
              interactive_response 事件    user_input_required 事件
                          │                           │
                          ▼                           ▼
                    命令继续执行              等待用户选择
                                                      │
                                                      ▼
                                          user_input_received 事件
                                                      │
                                                      ▼
                                                命令继续执行
```

#### interactive_prompt - 交互式提示

**触发时机**：当命令进入交互模式时发送，通知前端命令需要交互式输入。

**用途**：
1. 前端可以显示命令正在等待输入的状态
2. 显示当前的交互提示内容
3. 为后续的自动响应或用户输入做准备

**事件格式**：

```json
{
    "type": "interactive_prompt",
    "message": "命令需要交互式输入",
    "data": {
        "step_id": 1,
        "tool": "shell_executor",
        "prompt": {
            "is_interactive": true,
            "prompt_text": "? Project name: › vue-project\n? Add TypeScript? › No / Yes",
            "options": ["No", "Yes"],
            "prompt_type": "select"
        },
        "stdout": "Vue.js - The Progressive JavaScript Framework\n\n? Project name: ›",
        "command": "npm create vue@latest",
        "options": ["No", "Yes"],
        "prompt_type": "select"
    },
    "timestamp": "2024-01-03T12:00:06.700Z"
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `step_id` | number | 当前执行步骤的 ID |
| `tool` | string | 触发交互的工具名称 |
| `prompt.is_interactive` | boolean | 是否为交互式提示 |
| `prompt.prompt_text` | string | 提示文本内容 |
| `prompt.options` | string[] | 可选项列表（如果有） |
| `prompt.prompt_type` | string | 提示类型 |
| `stdout` | string | 命令的标准输出 |
| `command` | string | 正在执行的命令 |

**prompt_type 提示类型说明**：

| 类型 | 说明 | 示例 |
|------|------|------|
| `select` | 从多个选项中选择一个 | `? Add TypeScript? › No / Yes` |
| `confirm` | 是/否确认 | `? Proceed? (y/n)` |
| `input` | 需要输入文本 | `? Project name: ›` |
| `unknown` | 未知类型 | 其他格式的提示 |

**前端处理示例**：

```javascript
case 'interactive_prompt':
    // 显示交互提示状态
    setStepStatus(data.payload.data.step_id, 'waiting_input');
    
    // 显示提示信息（可选，用于透明化展示）
    showInteractivePromptBanner({
        command: data.payload.data.command,
        promptText: data.payload.data.prompt.prompt_text,
        options: data.payload.data.options
    });
    
    // 记录日志
    addLogEntry(`命令 "${data.payload.data.command}" 需要交互式输入`);
    break;
```

#### interactive_response - 交互式响应

**触发时机**：当系统能够根据用户意图自动响应交互式提示时发送。

**用途**：
1. 通知前端系统已自动处理了交互提示
2. 显示自动响应的内容和原因
3. 让用户了解系统的决策过程

**事件格式**：

```json
{
    "type": "interactive_response",
    "message": "自动响应交互式提示: yes",
    "data": {
        "step_id": 1,
        "response": "yes",
        "reasoning": "根据用户意图创建 Vue 项目，使用默认配置",
        "auto_responded": true
    },
    "timestamp": "2024-01-03T12:00:07.000Z"
}
```

**字段说明**：

| 字段 | 类型 | 说明 |
|------|------|------|
| `step_id` | number | 当前执行步骤的 ID |
| `response` | string | 系统自动响应的内容 |
| `reasoning` | string | 自动响应的原因说明 |
| `auto_responded` | boolean | 是否为自动响应（始终为 true） |

**自动响应的决策逻辑**：

系统会根据以下因素决定是否自动响应：

1. **用户意图明确**：如果用户明确说"创建一个 Vue 项目"，系统会自动选择默认配置
2. **提示类型简单**：对于简单的确认提示（如 `Proceed? (y/n)`），系统通常会自动确认
3. **有默认值**：如果提示有默认值，系统可能会使用默认值

**前端处理示例**：

```javascript
case 'interactive_response':
    // 更新步骤状态
    setStepStatus(data.payload.data.step_id, 'running');
    
    // 显示自动响应通知
    showAutoResponseNotification({
        response: data.payload.data.response,
        reasoning: data.payload.data.reasoning
    });
    
    // 记录日志
    addLogEntry(`系统自动响应: "${data.payload.data.response}" - ${data.payload.data.reasoning}`);
    
    // 隐藏交互提示横幅（如果显示了）
    hideInteractivePromptBanner();
    break;
```

**完整的交互式命令处理示例**：

```javascript
// 状态管理
let interactiveState = {
    isWaitingInput: false,
    currentStepId: null,
    promptData: null
};

// WebSocket 消息处理
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'interactive_prompt':
            // 记录交互状态
            interactiveState = {
                isWaitingInput: true,
                currentStepId: data.payload.data.step_id,
                promptData: data.payload.data
            };
            
            // 显示交互提示 UI
            showInteractivePromptUI(data.payload.data);
            break;
            
        case 'interactive_response':
            // 系统自动响应了，清除交互状态
            interactiveState.isWaitingInput = false;
            
            // 显示自动响应信息
            showAutoResponseInfo({
                response: data.payload.data.response,
                reasoning: data.payload.data.reasoning
            });
            
            // 隐藏交互提示 UI
            hideInteractivePromptUI();
            break;
            
        case 'user_input_required':
            // 系统无法自动决定，需要用户选择
            showUserInputDialog(data.payload.data);
            break;
            
        case 'user_input_received':
            // 用户输入已接收
            interactiveState.isWaitingInput = false;
            hideUserInputDialog();
            showInputConfirmation(data.payload.data.user_input);
            break;
    }
};

// 交互提示 UI 组件
function InteractivePromptUI({ data }) {
    return (
        <div className="interactive-prompt">
            <div className="prompt-header">
                <span className="icon">⏳</span>
                <span>命令等待输入</span>
            </div>
            <div className="prompt-content">
                <code>{data.command}</code>
                <pre>{data.prompt.prompt_text}</pre>
            </div>
            {data.options && data.options.length > 0 && (
                <div className="prompt-options">
                    <span>可选项: </span>
                    {data.options.map(opt => (
                        <span key={opt} className="option-badge">{opt}</span>
                    ))}
                </div>
            )}
            <div className="prompt-status">
                系统正在分析如何响应...
            </div>
        </div>
    );
}

// 自动响应信息组件
function AutoResponseInfo({ response, reasoning }) {
    return (
        <div className="auto-response-info">
            <div className="response-header">
                <span className="icon">✓</span>
                <span>系统自动响应</span>
            </div>
            <div className="response-content">
                <div className="response-value">
                    响应: <code>{response}</code>
                </div>
                <div className="response-reasoning">
                    原因: {reasoning}
                </div>
            </div>
        </div>
    );
}
```

**典型场景示例**：

**场景 1: npm create vue@latest**

```
1. 用户请求: "创建一个 Vue 3 项目"
2. 系统执行: npm create vue@latest my-project
3. 命令输出交互提示: "? Add TypeScript? › No / Yes"
4. 发送 interactive_prompt 事件
5. 系统分析用户意图，决定使用默认配置
6. 发送 interactive_response 事件 (response: "No")
7. 命令继续执行
```

**场景 2: 需要用户选择**

```
1. 用户请求: "创建一个新项目"（未指定技术栈）
2. 系统执行: npm create vue@latest my-project
3. 命令输出交互提示: "? Add TypeScript? › No / Yes"
4. 发送 interactive_prompt 事件
5. 系统无法确定用户是否需要 TypeScript
6. 发送 user_input_required 事件
7. 前端显示选择对话框
8. 用户选择 "Yes"
9. 发送 user_input_received 事件
10. 命令继续执行
```

#### user_input_required - 需要用户输入

当系统无法自动决定响应，需要用户选择时发送。**前端应该显示选项让用户选择。**

```json
{
    "type": "user_input_required",
    "message": "需要用户选择或输入",
    "data": {
        "step_id": 1,
        "tool": "shell_executor",
        "prompt": {
            "is_interactive": true,
            "prompt_text": "? Add TypeScript? › No / Yes",
            "options": ["No", "Yes"],
            "prompt_type": "confirm"
        },
        "options": ["No", "Yes"],
        "options_explanation": [
            {"option": "No", "description": "不添加 TypeScript，使用纯 JavaScript"},
            {"option": "Yes", "description": "添加 TypeScript 支持，提供类型检查"}
        ],
        "prompt_type": "confirm",
        "default_response": "No",
        "context": {
            "step_description": "创建 Vue 3 项目",
            "command": "npm create vue@latest vue-project"
        }
    },
    "timestamp": "2024-01-03T12:00:07.500Z"
}
```

**前端处理示例：**

```javascript
case 'user_input_required':
    // 显示用户选择对话框
    showUserInputDialog({
        title: '需要您的选择',
        prompt: data.payload.data.prompt.prompt_text,
        options: data.payload.data.options,
        explanations: data.payload.data.options_explanation,
        defaultValue: data.payload.data.default_response,
        onSubmit: (userChoice) => {
            // 发送用户选择到后端
            sendUserInput(data.payload.data.step_id, userChoice);
        }
    });
    break;
```

#### user_input_received - 用户输入已接收

当收到用户的交互输入时发送。

```json
{
    "type": "user_input_received",
    "message": "收到用户输入: Yes",
    "data": {
        "step_id": 1,
        "user_input": "Yes",
        "will_retry": true
    },
    "timestamp": "2024-01-03T12:00:10.000Z"
}
```

### 7. 变量相关事件

#### variable_set - 变量设置

```json
{
    "type": "variable_set",
    "message": "设置变量 step_1_stdout",
    "data": {
        "name": "step_1_stdout",
        "value": "Hello, World!\n",
        "value_type": "str"
    },
    "timestamp": "2024-01-03T12:00:07.000Z"
}
```

#### variable_resolve - 变量解析

```json
{
    "type": "variable_resolve",
    "message": "解析参数中的变量引用",
    "data": {
        "original_args": {
            "content": "上一步输出: ${step_0_stdout}"
        },
        "resolved_args": {
            "content": "上一步输出: Hello, World!"
        },
        "variables_used": ["step_0_stdout"]
    },
    "timestamp": "2024-01-03T12:00:08.000Z"
}
```

### 8. 验证相关事件

#### verification_start - 验证开始

```json
{
    "type": "verification_start",
    "message": "开始验证执行结果",
    "data": {
        "expected": "输出应包含 'Hello'",
        "actual_preview": "Hello, World!"
    },
    "timestamp": "2024-01-03T12:00:07.500Z"
}
```

#### verification_result - 验证结果

```json
{
    "type": "verification_result",
    "message": "结果验证通过",
    "data": {
        "is_valid": true,
        "expected": "输出应包含 'Hello'"
    },
    "timestamp": "2024-01-03T12:00:07.800Z"
}
```

### 9. LLM 相关事件

#### llm_call - LLM 调用

```json
{
    "type": "llm_call",
    "message": "调用 AI 创建任务计划",
    "data": {
        "purpose": "create_plan|plan_revision|generate_summary|step_processing",
        "context": "任务描述或上下文信息"
    },
    "timestamp": "2024-01-03T12:00:01.000Z"
}
```

#### llm_response - LLM 响应

```json
{
    "type": "llm_response",
    "message": "AI 处理完成",
    "data": {
        "response_preview": "响应内容预览..."
    },
    "timestamp": "2024-01-03T12:00:02.500Z"
}
```

### 10. 文本流事件 (token)

流式输出的文本内容。

```json
{
    "type": "token",
    "content": "这是"
}
```

### 11. 错误事件 (error)

```json
{
    "type": "error",
    "message": "处理过程中发生错误",
    "data": {
        "error_type": "ExecutionError",
        "details": "详细错误信息"
    }
}
```

## 任务列表事件 (TODO List)

### todo_list_update - 任务列表更新

当任务计划创建或执行完成时，返回完整的任务列表。

```json
{
    "type": "todo_list_update",
    "payload": {
        "conversation_id": "uuid",
        "message_id": "uuid",
        "todo_list": {
            "id": "list-uuid",
            "goal": "创建并运行 Hello World 程序",
            "items": [
                {
                    "id": "item-uuid-1",
                    "title": "创建 hello.py 文件",
                    "description": "创建包含 print 语句的 Python 文件",
                    "status": "completed",
                    "order": 0,
                    "tool": "file_manager",
                    "tool_args": {"action": "write", "path": "/workspace/hello.py"},
                    "depends_on": [],
                    "result": {"success": true},
                    "error": null,
                    "started_at": "2024-01-03T12:00:01.000Z",
                    "completed_at": "2024-01-03T12:00:02.000Z",
                    "progress": 100
                },
                {
                    "id": "item-uuid-2",
                    "title": "执行 Python 代码",
                    "description": "运行 hello.py 文件",
                    "status": "in_progress",
                    "order": 1,
                    "tool": "execute_code",
                    "tool_args": {"language": "python", "code": "..."},
                    "depends_on": ["item-uuid-1"],
                    "result": null,
                    "error": null,
                    "started_at": "2024-01-03T12:00:03.000Z",
                    "completed_at": null,
                    "progress": 50
                }
            ],
            "total_count": 2,
            "completed_count": 1,
            "failed_count": 0,
            "in_progress_count": 1,
            "is_complete": false,
            "has_failed": false,
            "created_at": "2024-01-03T12:00:00.000Z",
            "updated_at": "2024-01-03T12:00:03.000Z"
        },
        "changed_item_id": null,
        "change_type": "created",
        "timestamp": "2024-01-03T12:00:00.000Z"
    }
}
```

**status 状态说明：**
- `pending`: 待执行
- `in_progress`: 执行中
- `completed`: 已完成
- `failed`: 失败
- `skipped`: 跳过

**change_type 变更类型：**
- `created`: 任务列表创建
- `updated`: 任务列表更新
- `completed`: 任务列表执行完成

### todo_item_update - 单个任务项更新

当单个任务状态变化时，返回该任务项的更新信息。

```json
{
    "type": "todo_item_update",
    "payload": {
        "conversation_id": "uuid",
        "message_id": "uuid",
        "item": {
            "id": "item-uuid-1",
            "title": "创建 hello.py 文件",
            "status": "completed",
            "order": 0,
            "tool": "file_manager",
            "result": {"success": true, "message": "文件创建成功"},
            "completed_at": "2024-01-03T12:00:02.000Z",
            "progress": 100
        },
        "list_id": "list-uuid",
        "change_type": "completed",
        "statistics": {
            "total": 3,
            "completed": 1,
            "failed": 0,
            "in_progress": 1
        },
        "timestamp": "2024-01-03T12:00:02.000Z"
    }
}
```

**change_type 变更类型：**
- `status_change`: 状态变化（开始执行）
- `progress_update`: 进度更新
- `completed`: 任务完成
- `failed`: 任务失败

## 文件树事件

### file_tree_update - 文件树更新

当遇到代码相关任务时，返回项目文件结构。**文件树包含下载链接，前端可以直接使用这些链接下载文件。**

```json
{
    "type": "file_tree_update",
    "payload": {
        "conversation_id": "uuid",
        "message_id": "uuid",
        "file_tree": {
            "root": {
                "name": "workspace",
                "path": "/workspace",
                "type": "directory",
                "children": [
                    {
                        "name": "src",
                        "path": "/workspace/src",
                        "type": "directory",
                        "children": [
                            {
                                "name": "main.py",
                                "path": "/workspace/src/main.py",
                                "type": "file",
                                "size": 1024,
                                "extension": ".py",
                                "language": "python",
                                "status": "unchanged",
                                "modified_at": "2024-01-03T10:00:00.000Z",
                                "download_url": "/endpoint/file/sandbox/{session_id}/download?path=%2Fworkspace%2Fsrc%2Fmain.py",
                                "preview_url": "/endpoint/file/sandbox/{session_id}/read?path=%2Fworkspace%2Fsrc%2Fmain.py",
                                "is_readable": true,
                                "is_writable": true,
                                "is_deletable": true
                            },
                            {
                                "name": "utils.py",
                                "path": "/workspace/src/utils.py",
                                "type": "file",
                                "size": 512,
                                "extension": ".py",
                                "language": "python",
                                "status": "modified",
                                "modified_at": "2024-01-03T12:00:00.000Z",
                                "download_url": "/endpoint/file/sandbox/{session_id}/download?path=%2Fworkspace%2Fsrc%2Futils.py",
                                "preview_url": "/endpoint/file/sandbox/{session_id}/read?path=%2Fworkspace%2Fsrc%2Futils.py",
                                "is_readable": true,
                                "is_writable": true,
                                "is_deletable": true
                            }
                        ],
                        "children_count": 2,
                        "is_expanded": true
                    },
                    {
                        "name": "README.md",
                        "path": "/workspace/README.md",
                        "type": "file",
                        "size": 256,
                        "extension": ".md",
                        "language": "markdown",
                        "status": "unchanged",
                        "download_url": "/endpoint/file/sandbox/{session_id}/download?path=%2Fworkspace%2FREADME.md",
                        "preview_url": "/endpoint/file/sandbox/{session_id}/read?path=%2Fworkspace%2FREADME.md"
                    }
                ],
                "children_count": 2,
                "is_expanded": true
            },
            "base_path": "/workspace",
            "sandbox_session_id": "session-uuid",
            "api_base_url": "/endpoint/file/sandbox/session-uuid",
            "total_files": 3,
            "total_directories": 2,
            "total_size": 1792,
            "created_count": 0,
            "modified_count": 1,
            "deleted_count": 0,
            "max_depth": 5,
            "generated_at": "2024-01-03T12:00:00.000Z"
        },
        "context": "项目文件结构 - 代码任务",
        "related_task_id": "task-uuid",
        "highlighted_paths": ["/workspace/src/utils.py"],
        "timestamp": "2024-01-03T12:00:00.000Z"
    }
}
```

**文件类型 (type)：**
- `file`: 文件
- `directory`: 目录
- `symlink`: 符号链接

**文件状态 (status)：**
- `unchanged`: 未变更
- `created`: 新创建
- `modified`: 已修改
- `deleted`: 已删除
- `renamed`: 重命名

### file_changes_update - 文件变更列表

任务完成后，返回所有文件变更的列表。

```json
{
    "type": "file_changes_update",
    "payload": {
        "conversation_id": "uuid",
        "message_id": "uuid",
        "changes": [
            {
                "path": "/workspace/src/new_file.py",
                "change_type": "created",
                "old_path": null,
                "new_content": "# New file content...",
                "changed_at": "2024-01-03T12:00:01.000Z"
            },
            {
                "path": "/workspace/src/utils.py",
                "change_type": "modified",
                "old_path": null,
                "diff": "@@ -1,3 +1,5 @@\n+# Added comment\n def helper():\n     pass",
                "changed_at": "2024-01-03T12:00:02.000Z"
            }
        ],
        "total_changes": 2,
        "related_task_id": "task-uuid",
        "timestamp": "2024-01-03T12:00:05.000Z"
    }
}
```

## 文件管理 API

文件树中的每个文件节点都包含 `download_url` 和 `preview_url`，前端可以直接使用这些 URL 进行文件操作。

### 文件管理 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/endpoint/file/sandbox/{session_id}/list?path=` | GET | 列出目录内容 |
| `/endpoint/file/sandbox/{session_id}/read?path=` | GET | 读取文件内容 |
| `/endpoint/file/sandbox/{session_id}/download?path=` | GET | 下载文件 |
| `/endpoint/file/sandbox/{session_id}/write` | POST | 写入文件 |
| `/endpoint/file/sandbox/{session_id}/upload?path=` | POST | 上传文件 |
| `/endpoint/file/sandbox/{session_id}/delete?path=` | DELETE | 删除文件 |

### 下载文件示例

```javascript
// 使用文件节点中的 download_url 下载文件
function downloadFile(fileNode) {
    const link = document.createElement('a');
    link.href = fileNode.download_url;
    link.download = fileNode.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 或者使用 fetch API
async function downloadFileWithFetch(fileNode) {
    const response = await fetch(fileNode.download_url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileNode.name;
    link.click();
    window.URL.revokeObjectURL(url);
}
```

### 预览文件内容示例

```javascript
// 使用 preview_url 获取文件内容
async function previewFile(fileNode) {
    const response = await fetch(fileNode.preview_url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const data = await response.json();
    return data.data.content;
}
```

### 上传文件示例

```javascript
// 上传文件到沙箱
async function uploadFile(sessionId, file, targetPath) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(
        `/endpoint/file/sandbox/${sessionId}/upload?path=${encodeURIComponent(targetPath)}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }
    );
    return response.json();
}
```

## 前端处理建议

### 1. 事件处理流程

```javascript
// WebSocket 消息处理
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'process_started':
            // 处理开始，初始化状态
            initProcessState();
            showProcessingIndicator(true);
            break;
            
        case 'process_completed':
            // 处理完成，重置状态
            showProcessingIndicator(false);
            if (data.payload.success) {
                markProcessComplete();
            } else {
                markProcessFailed(data.payload.data.error);
            }
            break;
        
        case 'thinking':
            // 显示思考气泡或状态
            showThinkingBubble(data.payload.thinking_step.content);
            break;
            
        case 'task_analysis':
            // 显示任务分析结果
            showAnalysisCard(data.payload.analysis);
            break;
        
        case 'task_analysis_complete':
            // 任务分析完成，更新状态
            markAnalysisComplete();
            showAnalysisSummary(data.payload.data);
            break;
            
        case 'flow_node':
            // 更新流程图节点状态
            updateFlowNode(data.payload.node, data.payload.status, data.payload.message);
            // 特别处理分析完成
            if (data.payload.node === 'analysis' && data.payload.status === 'completed') {
                markAnalysisComplete();
            }
            break;
            
        case 'plan_start':
            // 显示计划概览
            showPlanOverview(data.payload.data.steps_preview);
            break;
            
        case 'step_start':
            // 高亮当前步骤
            highlightStep(data.payload.data.step.step_id);
            updateProgress(data.payload.data.progress);
            break;
            
        case 'tool_call':
            // 显示工具调用详情
            showToolCall(data.payload.tool, data.payload.arguments);
            break;
            
        case 'tool_result':
            // 显示工具执行结果
            showToolResult(data.payload.tool, data.payload.result);
            break;
            
        case 'step_success':
            // 标记步骤成功
            markStepSuccess(data.payload.data.step.step_id);
            break;
            
        case 'step_failed':
            // 标记步骤失败
            markStepFailed(data.payload.data.step.step_id, data.payload.data.error);
            break;
            
        case 'plan_complete':
            // 显示执行总结
            showExecutionSummary(data.payload.data);
            break;
            
        case 'token':
            // 追加文本到消息区域
            appendText(data.payload.delta);
            break;
            
        case 'chat_complete':
            // 对话完成
            finalizeMessage(data.payload.content);
            break;
            
        case 'error':
            // 显示错误提示
            showError(data.payload.message);
            break;
    }
};

// 状态管理示例
let processState = {
    isProcessing: false,
    analysisComplete: false,
    currentStep: null,
    steps: []
};

function initProcessState() {
    processState = {
        isProcessing: true,
        analysisComplete: false,
        currentStep: null,
        steps: []
    };
}

function markAnalysisComplete() {
    processState.analysisComplete = true;
    // 更新 UI 显示分析已完成
    document.querySelector('.analysis-status').textContent = '分析完成';
    document.querySelector('.analysis-status').classList.remove('loading');
    document.querySelector('.analysis-status').classList.add('completed');
}

function markProcessComplete() {
    processState.isProcessing = false;
    // 更新 UI 显示处理已完成
}

function markProcessFailed(error) {
    processState.isProcessing = false;
    // 显示错误信息
    console.error('处理失败:', error);
}
```

### 2. UI 组件建议

1. **思考气泡**: 显示 AI 的思考过程，可折叠
2. **任务分析卡片**: 显示复杂度、类型、是否需要沙箱
3. **流程图**: 可视化显示执行流程和当前状态
4. **步骤列表**: 显示所有步骤及其状态
5. **工具调用面板**: 显示工具名称、参数、结果
6. **进度条**: 显示整体执行进度
7. **变量面板**: 显示中间变量（可选，调试用）
8. **执行总结**: 显示最终结果和统计信息
9. **任务列表面板**: 显示 TODO List，实时更新任务状态
10. **文件树面板**: 显示项目文件结构，高亮变更文件
11. **文件变更面板**: 显示本次任务的文件变更列表

### 3. 状态颜色建议

- `pending`: 灰色
- `running`: 蓝色/动画
- `success`: 绿色
- `failed`: 红色
- `retrying`: 橙色

## 工具列表

| 工具名称 | 说明 | 参数 |
|---------|------|------|
| `execute_code` | 执行代码 | language, code, timeout |
| `file_manager` | 文件管理 | action, path, content |
| `shell` | Shell 命令 | command, working_dir, timeout |
| `screenshot` | 截图 | save_path |
| `mouse_keyboard` | 鼠标键盘 | action, x, y, text, key |
| `browser` | 浏览器控制 | action, url |

### 3. 任务列表 UI 建议

```javascript
// 任务列表组件示例
function TodoListPanel({ todoList }) {
    return (
        <div className="todo-list-panel">
            <h3>{todoList.goal}</h3>
            <div className="progress-bar">
                <div
                    className="progress"
                    style={{ width: `${(todoList.completed_count / todoList.total_count) * 100}%` }}
                />
            </div>
            <ul className="todo-items">
                {todoList.items.map(item => (
                    <li key={item.id} className={`todo-item ${item.status}`}>
                        <span className="status-icon">{getStatusIcon(item.status)}</span>
                        <span className="title">{item.title}</span>
                        {item.tool && <span className="tool-badge">{item.tool}</span>}
                        {item.error && <span className="error">{item.error}</span>}
                    </li>
                ))}
            </ul>
            <div className="statistics">
                完成: {todoList.completed_count}/{todoList.total_count}
                {todoList.failed_count > 0 && ` | 失败: ${todoList.failed_count}`}
            </div>
        </div>
    );
}

function getStatusIcon(status) {
    switch (status) {
        case 'pending': return '○';
        case 'in_progress': return '◐';
        case 'completed': return '✓';
        case 'failed': return '✗';
        case 'skipped': return '⊘';
        default: return '○';
    }
}
```

### 4. 文件树 UI 建议

```javascript
// 文件树组件示例
function FileTreePanel({ fileTree, highlightedPaths }) {
    return (
        <div className="file-tree-panel">
            <h3>项目文件</h3>
            <div className="tree-stats">
                文件: {fileTree.total_files} | 目录: {fileTree.total_directories}
                {fileTree.modified_count > 0 && ` | 变更: ${fileTree.modified_count}`}
            </div>
            <FileTreeNode
                node={fileTree.root}
                highlightedPaths={highlightedPaths}
            />
        </div>
    );
}

function FileTreeNode({ node, highlightedPaths, depth = 0 }) {
    const isHighlighted = highlightedPaths?.includes(node.path);
    const statusClass = node.status !== 'unchanged' ? `status-${node.status}` : '';
    
    return (
        <div className={`tree-node ${statusClass} ${isHighlighted ? 'highlighted' : ''}`}>
            <div className="node-content" style={{ paddingLeft: depth * 16 }}>
                {node.type === 'directory' ? (
                    <span className="folder-icon">📁</span>
                ) : (
                    <span className="file-icon">{getFileIcon(node.language)}</span>
                )}
                <span className="name">{node.name}</span>
                {node.status !== 'unchanged' && (
                    <span className={`status-badge ${node.status}`}>
                        {node.status}
                    </span>
                )}
            </div>
            {node.children && node.is_expanded && (
                <div className="children">
                    {node.children.map(child => (
                        <FileTreeNode
                            key={child.path}
                            node={child}
                            highlightedPaths={highlightedPaths}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
```

## 上下文管理系统

### 概述

AI Agent 系统内置了强大的上下文管理功能，用于：
1. **对话历史持久化**：所有问答对自动保存到沙箱内部文件
2. **多轮对话上下文整合**：在多次问答中整合上下文进行再次分析处理
3. **上下文压缩**：当对话历史过长时自动压缩，保留关键信息
4. **项目上下文管理**：跟踪项目结构、技术栈、依赖等信息
5. **任务上下文管理**：记录任务执行历史和状态

### 上下文存储位置

上下文数据存储在沙箱的**系统目录**中（用户不可见），而不是用户工作空间：

```
/root/.agent/context/
├── conversation_history.json    # 对话历史
├── project_context.json         # 项目上下文
├── tasks_history.json           # 任务上下文
├── code_context.json            # 代码上下文
└── context_summary.json         # 上下文摘要
```

**重要说明**：上下文数据存储在 `/root/.agent/context/` 而不是 `/workspace/`，这样：
- 用户在工作空间中看不到这些内部数据
- 不会干扰用户的项目文件
- 保持工作空间的整洁

### 上下文数据结构

#### 对话历史 (conversations.json)

```json
{
    "entries": [
        {
            "id": "uuid",
            "role": "user",
            "content": "帮我创建一个 Python 项目",
            "timestamp": "2024-01-03T12:00:00.000Z",
            "metadata": {
                "task_type": "code",
                "complexity": "complex"
            }
        },
        {
            "id": "uuid",
            "role": "assistant",
            "content": "我已经为您创建了一个 Python 项目...",
            "timestamp": "2024-01-03T12:00:30.000Z",
            "metadata": {
                "tools_used": ["file_manager", "execute_code"],
                "files_created": ["/workspace/main.py", "/workspace/requirements.txt"]
            }
        }
    ],
    "compressed_summaries": [
        {
            "summary": "用户请求创建 Python 项目，助手成功创建了项目结构",
            "entry_count": 10,
            "compressed_at": "2024-01-03T13:00:00.000Z"
        }
    ]
}
```

#### 项目上下文 (project.json)

```json
{
    "name": "my-python-project",
    "description": "一个 Python Web 应用项目",
    "tech_stack": ["python", "fastapi", "postgresql"],
    "dependencies": {
        "fastapi": "0.100.0",
        "uvicorn": "0.23.0"
    },
    "structure": {
        "src/": "源代码目录",
        "tests/": "测试目录",
        "docs/": "文档目录"
    },
    "conventions": {
        "code_style": "PEP 8",
        "naming": "snake_case"
    },
    "updated_at": "2024-01-03T12:00:00.000Z"
}
```

#### 任务上下文 (tasks.json)

```json
{
    "tasks": [
        {
            "id": "task-uuid",
            "description": "创建 Python 项目结构",
            "status": "completed",
            "result_summary": "成功创建了项目结构，包含 main.py 和 requirements.txt",
            "files_affected": ["/workspace/main.py", "/workspace/requirements.txt"],
            "created_at": "2024-01-03T12:00:00.000Z",
            "completed_at": "2024-01-03T12:00:30.000Z"
        }
    ]
}
```

### 多轮对话上下文整合

系统会自动在多轮对话中整合上下文，提升任务分析的准确性：

1. **用户意图提取**：从历史对话中提取用户的核心目标
2. **相关上下文匹配**：根据当前任务关键词匹配相关历史上下文
3. **增强任务分析**：将历史上下文注入到任务分析提示词中

#### 上下文整合流程

```
用户消息 → 保存到上下文 → 提取历史上下文 → 增强任务分析 → 执行任务 → 保存结果到上下文
```

#### 示例：多轮对话上下文使用

**第一轮对话：**
```
用户: 帮我创建一个 Flask Web 应用
助手: 我已经创建了 Flask 应用，包含 app.py 和 templates 目录...
```

**第二轮对话：**
```
用户: 添加用户登录功能
助手: [系统自动整合上下文]
       - 识别到项目是 Flask 应用
       - 识别到已有 app.py 文件
       - 在现有项目基础上添加登录功能
```

### 上下文压缩机制

当对话历史超过配置的最大条目数（默认 100 条）时，系统会自动压缩旧对话：

1. **保留最近对话**：最近 20 条对话保持原样
2. **压缩旧对话**：将旧对话压缩为摘要
3. **保留关键信息**：摘要包含用户意图、执行结果、关键文件等

### 上下文相关 API

#### 获取上下文统计

```
GET /endpoint/sandbox/{session_id}/context/stats
```

响应：
```json
{
    "success": true,
    "data": {
        "conversation_count": 25,
        "compressed_count": 2,
        "project_context_exists": true,
        "task_count": 10,
        "code_context_count": 5
    }
}
```

#### 导出上下文

```
GET /endpoint/sandbox/{session_id}/context/export
```

响应：
```json
{
    "success": true,
    "data": {
        "conversations": [...],
        "project": {...},
        "tasks": [...],
        "code": [...]
    }
}
```

#### 清除上下文

```
DELETE /endpoint/sandbox/{session_id}/context
```

响应：
```json
{
    "success": true,
    "message": "上下文已清除"
}
```

### 前端集成建议

#### 1. 显示上下文状态

```javascript
// 获取并显示上下文统计
async function showContextStats(sessionId) {
    const response = await fetch(`/endpoint/sandbox/${sessionId}/context/stats`);
    const data = await response.json();
    
    return {
        conversationCount: data.data.conversation_count,
        hasProjectContext: data.data.project_context_exists,
        taskCount: data.data.task_count
    };
}
```

#### 2. 上下文指示器组件

```javascript
function ContextIndicator({ stats }) {
    return (
        <div className="context-indicator">
            <span className="conversation-count">
                💬 {stats.conversationCount} 条对话
            </span>
            {stats.hasProjectContext && (
                <span className="project-context">
                    📁 项目上下文已加载
                </span>
            )}
            <span className="task-count">
                ✅ {stats.taskCount} 个任务
            </span>
        </div>
    );
}
```

#### 3. 上下文管理面板

```javascript
function ContextManagementPanel({ sessionId }) {
    const [stats, setStats] = useState(null);
    
    const handleExport = async () => {
        const response = await fetch(`/endpoint/sandbox/${sessionId}/context/export`);
        const data = await response.json();
        // 下载为 JSON 文件
        downloadJSON(data.data, 'context-export.json');
    };
    
    const handleClear = async () => {
        if (confirm('确定要清除所有上下文吗？')) {
            await fetch(`/endpoint/sandbox/${sessionId}/context`, {
                method: 'DELETE'
            });
            // 刷新统计
            loadStats();
        }
    };
    
    return (
        <div className="context-panel">
            <h3>上下文管理</h3>
            {stats && <ContextIndicator stats={stats} />}
            <div className="actions">
                <button onClick={handleExport}>导出上下文</button>
                <button onClick={handleClear} className="danger">清除上下文</button>
            </div>
        </div>
    );
}
```

### 上下文事件

系统会在上下文变化时发送事件：

#### context_update - 上下文更新

```json
{
    "type": "context_update",
    "payload": {
        "update_type": "conversation_added|project_updated|task_added|context_compressed",
        "data": {
            "conversation_count": 26,
            "latest_entry": {
                "role": "user",
                "content": "添加用户登录功能",
                "timestamp": "2024-01-03T12:05:00.000Z"
            }
        },
        "timestamp": "2024-01-03T12:05:00.000Z"
    }
}
```

#### context_compressed - 上下文压缩

```json
{
    "type": "context_compressed",
    "payload": {
        "entries_compressed": 50,
        "summary": "用户进行了多次代码修改和测试...",
        "new_conversation_count": 20,
        "timestamp": "2024-01-03T13:00:00.000Z"
    }
}
```

### 最佳实践

1. **定期检查上下文状态**：在长时间会话中定期检查上下文大小
2. **适时清除上下文**：当开始新项目时，考虑清除旧上下文
3. **导出重要上下文**：在重要节点导出上下文作为备份
4. **利用项目上下文**：确保项目信息被正确识别和保存

## 错误修复机制

### 概述

AI Agent 系统内置了智能错误修复机制，当工具执行失败时，系统会：

1. **检测错误类型**：分析错误信息，识别常见错误模式
2. **AI 分析修复**：使用 LLM 分析错误原因并生成修复方案
3. **自动重试**：使用修复后的命令/参数自动重试
4. **计划修订**：如果修复失败，触发计划修订流程

### 错误修复流程

```
工具执行失败 → 检测是否可修复 → AI 分析错误 → 生成修复方案 → 重试执行
                    ↓                                      ↓
              超过修复次数                              修复成功
                    ↓                                      ↓
              触发计划修订                              继续执行
```

### 支持的错误类型

| 错误类型 | 示例 | 修复方式 |
|---------|------|---------|
| 命令参数格式错误 | `--option=value` 格式不支持 | 修改为正确格式 |
| 交互式命令 | 需要用户输入 | 添加 `--yes` 或使用管道 |
| 路径不存在 | 目录未创建 | 先创建目录 |
| 权限错误 | 无写入权限 | 更换目录或添加权限 |
| 依赖缺失 | 模块未安装 | 先安装依赖 |

### 前端处理建议

```javascript
// 处理工具修复事件
case 'tool_fix':
    // 显示修复中状态
    showFixingIndicator(data.payload.data.step_id);
    addLogEntry(`正在修复命令错误: ${data.payload.data.error}`);
    break;

case 'tool_fixed':
    // 显示修复成功
    hideFixingIndicator(data.payload.data.step_id);
    showFixedNotification({
        original: data.payload.data.original_args,
        fixed: data.payload.data.fixed_args,
        explanation: data.payload.data.explanation
    });
    break;
```

### 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `max_fixes_per_step` | 2 | 每个步骤最大修复尝试次数 |
| `max_retries` | 3 | 每个步骤最大重试次数 |
| `max_revisions` | 2 | 计划最大修订次数 |

## 交互式命令处理

### 概述

AI Agent 系统支持交互式命令的智能处理。当命令进入交互模式时（如 `npm create vue@latest` 的项目配置选择），系统会：

1. **检测交互式提示**：识别命令输出中的交互式提示
2. **分析选项**：提取可选项和提示类型
3. **智能决策**：尝试根据用户意图自动选择
4. **用户反馈**：无法自动决定时，将选项返回给前端让用户选择

### 交互式命令处理流程

```
命令执行 → 检测到交互提示 → 分析提示类型和选项
                                    ↓
                            可以自动决定？
                           ↙          ↘
                         是              否
                         ↓               ↓
                    自动响应        发送 user_input_required
                         ↓               ↓
                    继续执行        等待用户选择
                                         ↓
                                   收到用户输入
                                         ↓
                                   使用输入重试
```

### 前端集成指南

#### 1. 处理交互式提示

```javascript
// WebSocket 消息处理
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'interactive_prompt':
            // 显示交互提示信息（可选，用于调试或透明化）
            showInteractivePromptInfo(data.payload.data);
            break;
            
        case 'interactive_response':
            // 显示自动响应信息
            showAutoResponseInfo(data.payload.data);
            break;
            
        case 'user_input_required':
            // 显示用户选择对话框
            showUserInputDialog(data.payload.data);
            break;
            
        case 'user_input_received':
            // 确认用户输入已接收
            hideUserInputDialog();
            showInputReceivedConfirmation(data.payload.data);
            break;
    }
};
```

#### 2. 用户选择对话框组件

```javascript
function UserInputDialog({ data, onSubmit, onCancel }) {
    const [selectedOption, setSelectedOption] = useState(data.default_response);
    const [customInput, setCustomInput] = useState('');
    
    const handleSubmit = () => {
        const input = data.prompt_type === 'input' ? customInput : selectedOption;
        onSubmit(data.step_id, input);
    };
    
    return (
        <div className="user-input-dialog">
            <h3>需要您的选择</h3>
            <div className="prompt-text">{data.prompt.prompt_text}</div>
            
            {data.prompt_type === 'select' || data.prompt_type === 'confirm' ? (
                <div className="options">
                    {data.options.map((option, index) => (
                        <div
                            key={option}
                            className={`option ${selectedOption === option ? 'selected' : ''}`}
                            onClick={() => setSelectedOption(option)}
                        >
                            <span className="option-name">{option}</span>
                            {data.options_explanation?.[index] && (
                                <span className="option-desc">
                                    {data.options_explanation[index].description}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <input
                    type="text"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="请输入..."
                />
            )}
            
            <div className="context-info">
                <small>步骤: {data.context.step_description}</small>
                <small>命令: {data.context.command}</small>
            </div>
            
            <div className="actions">
                <button onClick={onCancel}>取消</button>
                <button onClick={handleSubmit} className="primary">确认</button>
            </div>
        </div>
    );
}
```

#### 3. 发送用户输入到后端

```javascript
async function sendUserInput(stepId, userInput) {
    // 通过 WebSocket 发送用户输入
    ws.send(JSON.stringify({
        type: 'user_input',
        data: {
            step_id: stepId,
            input: userInput
        }
    }));
}
```

### 支持的交互式命令

| 命令 | 交互类型 | 自动处理 |
|------|---------|---------|
| `npm create vue@latest` | 多选项配置 | 部分支持 |
| `npm init` | 项目信息输入 | 支持默认值 |
| `git commit` | 编辑器输入 | 不支持 |
| `npm install` (确认) | 确认 | 支持 |
| `rm -i` | 确认 | 支持 |

### 配置参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `interactive_timeout` | 5秒 | 等待交互提示的超时时间 |
| `auto_respond_enabled` | true | 是否启用自动响应 |

## 版本历史

- v1.4.0 (2026-01-05): 添加交互式命令处理和用户反馈机制文档
- v1.3.0 (2026-01-05): 添加工具修复事件和错误修复机制文档
- v1.2.0 (2024-01-05): 添加上下文管理系统文档
- v1.1.0 (2024-01-05): 添加任务列表和文件树事件支持
- v1.0.0 (2024-01-03): 初始版本，定义所有事件类型和格式