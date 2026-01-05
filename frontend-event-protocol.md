# 前端 WebSocket 事件协议

本文档描述了 AI 沙箱助手后端通过 WebSocket 发送给前端的所有事件类型及其数据结构。

## 连接建立

### WebSocket 连接

```
ws://localhost:8000/ws/chat?token=<JWT_TOKEN>
```

### 连接成功事件

```json
{
  "type": "connected",
  "payload": {
    "connection_id": "uuid",
    "user_id": "user_id"
  }
}
```

---

## 事件分类

### 1. 流程控制事件

#### `process_started` - 处理开始

当 Agent 开始处理用户消息时发送。

```json
{
  "type": "process_started",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "开始处理您的请求",
    "data": {
      "timestamp": "2024-01-05T12:00:00Z"
    }
  }
}
```

#### `process_completed` - 处理完成

当整个处理流程结束时发送。

```json
{
  "type": "process_completed",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "success": true,
    "message": "处理完成",
    "data": {
      "complexity": "complex",
      "task_type": "code",
      "timestamp": "2024-01-05T12:00:00Z"
    }
  }
}
```

---

### 2. 任务分析事件

#### `task_analysis` - 任务分析结果

```json
{
  "type": "task_analysis",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "analysis": {
      "complexity": "simple|moderate|complex",
      "task_type": "chat|code|file|shell|gui|browser|analysis|creative",
      "requires_sandbox": true,
      "requirements_clarity": "clear|unclear",
      "clarification_needed": [],
      "reasoning": "分析理由",
      "suggested_approach": "建议的处理方式"
    }
  }
}
```

#### `task_analysis_complete` - 任务分析完成

标记分析阶段结束，前端可以据此更新 UI 状态。

```json
{
  "type": "task_analysis_complete",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "任务分析完成",
    "data": {
      "complexity": "complex",
      "task_type": "code",
      "requires_sandbox": true,
      "reasoning": "...",
      "suggested_approach": "..."
    }
  }
}
```

---

### 3. 流程节点事件

#### `flow_node` - 流程节点状态

用于显示任务执行的各个阶段。

```json
{
  "type": "flow_node",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "node": "analysis|planning|execution|summarizing|sandbox_creation|step_execution|replanning",
    "status": "started|completed|failed",
    "message": "节点状态描述",
    "data": {
      // 节点相关数据
    }
  }
}
```

**节点类型说明：**
- `analysis` - 任务分析阶段
- `planning` - 计划创建阶段
- `execution` - 计划执行阶段
- `summarizing` - 总结生成阶段
- `sandbox_creation` - 沙箱创建阶段
- `step_execution` - 单个步骤执行
- `replanning` - 计划修订阶段

---

### 4. LLM 调用事件

#### `llm_call` - LLM 调用开始

**前端应显示加载状态（转圈）**

```json
{
  "type": "llm_call",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "purpose": "create_plan|generate_summary|plan_revision|step_processing",
    "message": "调用 AI 创建任务计划"
  }
}
```

#### `llm_call_complete` - LLM 调用完成

**前端应停止加载状态**

```json
{
  "type": "llm_call_complete",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "purpose": "create_plan|generate_summary|plan_revision|step_processing",
    "message": "任务计划创建完成",
    "data": {
      "steps_count": 5
    }
  }
}
```

**Purpose 说明：**
- `create_plan` - 创建任务计划
- `generate_summary` - 生成执行总结
- `plan_revision` - 修订计划
- `step_processing` - 处理单个步骤

---

### 5. 计划执行事件

#### `plan_start` - 计划开始执行

```json
{
  "type": "plan_start",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "开始执行计划: 创建 Vue3 项目",
    "data": {
      "plan": { /* 完整计划对象 */ },
      "total_steps": 5,
      "steps_preview": [
        {
          "step_id": 0,
          "description": "创建项目目录",
          "tool": "shell_executor",
          "depends_on": []
        }
      ]
    }
  }
}
```

#### `plan_complete` - 计划执行完成

```json
{
  "type": "plan_complete",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "任务执行完成",
    "data": {
      "success": true,
      "duration": 45.5,
      "statistics": {
        "total_steps": 5,
        "completed_steps": 5,
        "failed_steps": 0,
        "revision_count": 0
      }
    }
  }
}
```

---

### 6. 步骤执行事件

#### `step_start` - 步骤开始

```json
{
  "type": "step_start",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "开始执行步骤 1: 创建项目目录",
    "data": {
      "step": {
        "step_id": 0,
        "description": "创建项目目录",
        "tool": "shell_executor",
        "tool_args": { "command": "mkdir my-project" },
        "status": "running"
      },
      "progress": {
        "current": 1,
        "total": 5,
        "percentage": 20.0
      }
    }
  }
}
```

#### `step_success` - 步骤成功

```json
{
  "type": "step_success",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "步骤 1 执行成功: 创建项目目录",
    "data": {
      "step": {
        "step_id": 0,
        "description": "创建项目目录",
        "tool": "shell_executor",
        "status": "success",
        "result": { /* 执行结果 */ }
      },
      "result_summary": {
        "success": true,
        "output_preview": "目录创建成功"
      }
    }
  }
}
```

#### `step_failed` - 步骤失败

```json
{
  "type": "step_failed",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "步骤 1 执行失败: 创建项目目录",
    "data": {
      "step": {
        "step_id": 0,
        "description": "创建项目目录",
        "status": "failed",
        "error": "目录已存在"
      },
      "error": "目录已存在",
      "can_revise": true
    }
  }
}
```

---

### 7. 工具调用事件

#### `tool_call` - 工具调用

```json
{
  "type": "tool_call",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "tool": "shell_executor|file_manager|code_executor|...",
    "arguments": {
      "command": "npm create vue@latest my-project"
    },
    "data": {
      "step_id": 0,
      "description": "创建 Vue 项目",
      "tool_description": "执行 Shell 命令"
    }
  }
}
```

#### `tool_result` - 工具结果

```json
{
  "type": "tool_result",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "tool": "shell_executor",
    "result": {
      "success": true,
      "stdout": "项目创建成功",
      "stderr": "",
      "exit_code": 0
    },
    "data": {
      "step_id": 0,
      "execution_time": 5.2
    }
  }
}
```

---

### 8. 交互式命令事件

#### `interactive_prompt` - 交互式提示

当命令需要用户输入时发送（如 npm create vue@latest 的选项选择）。

```json
{
  "type": "interactive_prompt",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "step_id": 0,
    "tool": "shell_executor",
    "prompt": {
      "prompt_type": "selection|confirmation|input",
      "prompt_text": "请选择要添加的功能",
      "options": ["TypeScript", "JSX", "Router", "Pinia"]
    },
    "stdout": "当前命令输出...",
    "command": "npm create vue@latest",
    "options": ["TypeScript", "JSX", "Router", "Pinia"],
    "prompt_type": "selection"
  }
}
```

#### `interactive_response` - 交互式自动响应

当系统自动响应交互式提示时发送。

```json
{
  "type": "interactive_response",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "step_id": 0,
    "response": "yes",
    "reasoning": "根据用户需求，选择默认配置",
    "auto_responded": true,
    "message": "自动响应交互式提示: yes"
  }
}
```

#### `user_input_required` - 需要用户输入

当系统无法自动决定，需要用户手动选择时发送。

**前端应显示输入界面让用户选择**

```json
{
  "type": "user_input_required",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "step_id": 0,
    "tool": "shell_executor",
    "prompt": {
      "prompt_type": "selection",
      "prompt_text": "请选择项目类型",
      "options": ["Vue 3", "Vue 2", "Nuxt"]
    },
    "options": ["Vue 3", "Vue 2", "Nuxt"],
    "options_explanation": [
      {"option": "Vue 3", "description": "最新版本，推荐使用"},
      {"option": "Vue 2", "description": "旧版本，兼容性更好"},
      {"option": "Nuxt", "description": "全栈框架"}
    ],
    "prompt_type": "selection",
    "default_response": "Vue 3",
    "context": {
      "step_description": "创建 Vue 项目",
      "command": "npm create vue@latest"
    }
  }
}
```

---

### 9. 文件树事件

#### `file_tree_update` - 文件树更新

**当文件结构发生变化时发送，前端应更新文件树显示**

```json
{
  "type": "file_tree_update",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "file_tree": {
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
              "name": "App.vue",
              "path": "/workspace/src/App.vue",
              "type": "file",
              "size": 1024,
              "status": "created"
            }
          ]
        }
      ]
    },
    "context": "步骤 1 执行后的文件结构",
    "related_task_id": "task_uuid",
    "highlighted_paths": ["/workspace/src/App.vue"],
    "timestamp": "2024-01-05T12:00:00Z"
  }
}
```

**触发时机：**
- 任务开始时（初始文件树）
- `file_manager` 执行 write/create/mkdir/delete 操作后
- shell 命令执行后（npm create, mkdir, git clone 等）
- 任务完成时（最终文件树）

#### `file_changes_update` - 文件变更列表

```json
{
  "type": "file_changes_update",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "changes": [
      {
        "path": "/workspace/src/App.vue",
        "change_type": "created",
        "timestamp": "2024-01-05T12:00:00Z"
      },
      {
        "path": "/workspace/package.json",
        "change_type": "modified",
        "timestamp": "2024-01-05T12:00:01Z"
      }
    ],
    "total_changes": 2,
    "related_task_id": "task_uuid",
    "timestamp": "2024-01-05T12:00:00Z"
  }
}
```

---

### 10. 任务列表事件

#### `todo_list_update` - 任务列表更新

```json
{
  "type": "todo_list_update",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "todo_list": {
      "id": "list_uuid",
      "title": "创建 Vue3 项目",
      "items": [
        {
          "id": "item_uuid",
          "step_id": 0,
          "title": "创建项目目录",
          "status": "completed",
          "tool": "shell_executor"
        }
      ],
      "statistics": {
        "total": 5,
        "completed": 3,
        "running": 1,
        "pending": 1,
        "failed": 0
      }
    },
    "change_type": "created|updated|completed",
    "timestamp": "2024-01-05T12:00:00Z"
  }
}
```

#### `todo_item_update` - 单个任务项更新

```json
{
  "type": "todo_item_update",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "item": {
      "id": "item_uuid",
      "step_id": 0,
      "title": "创建项目目录",
      "status": "completed",
      "result": { /* 执行结果 */ }
    },
    "list_id": "list_uuid",
    "change_type": "status_change|completed|failed",
    "statistics": {
      "total": 5,
      "completed": 3,
      "running": 1,
      "pending": 1,
      "failed": 0
    },
    "timestamp": "2024-01-05T12:00:00Z"
  }
}
```

---

### 11. 沙箱事件

#### `sandbox_ready` - 沙箱就绪

```json
{
  "type": "sandbox_ready",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "session_id": "sandbox_session_id",
    "vnc_url": "ws://localhost:6080/websockify",
    "vnc_password": "password"
  }
}
```

---

### 12. 消息流事件

#### `thinking` - 思考过程

```json
{
  "type": "thinking",
  "payload": {
    "type": "thinking",
    "conversation_id": "uuid",
    "message_id": "uuid",
    "thinking_step": {
      "id": "step_uuid",
      "type": "analyzing|routing|tool_execution|sandbox_creation",
      "content": "正在分析您的请求...",
      "timestamp": "2024-01-05T12:00:00Z"
    },
    "is_complete": false
  }
}
```

#### `token` / `chat_response` - 文本流

```json
{
  "type": "chat_response",
  "payload": {
    "type": "message",
    "conversation_id": "uuid",
    "message_id": "uuid",
    "delta": "增量文本内容",
    "is_complete": false
  }
}
```

#### `chat_complete` - 对话完成

```json
{
  "type": "chat_complete",
  "payload": {
    "type": "done",
    "conversation_id": "uuid",
    "message_id": "uuid",
    "content": "完整的回复内容",
    "is_complete": true
  }
}
```

---

### 13. 错误事件

#### `error` - 错误

```json
{
  "type": "error",
  "payload": {
    "conversation_id": "uuid",
    "message_id": "uuid",
    "message": "错误描述",
    "error": "详细错误信息"
  }
}
```

---

## 前端处理建议

### 1. 加载状态管理

```javascript
// 监听 LLM 调用状态
ws.on('llm_call', (data) => {
  showLoading(data.purpose);  // 显示加载动画
});

ws.on('llm_call_complete', (data) => {
  hideLoading(data.purpose);  // 隐藏加载动画
});
```

### 2. 文件树更新

```javascript
// 监听文件树更新
ws.on('file_tree_update', (data) => {
  updateFileTree(data.file_tree);
  highlightPaths(data.highlighted_paths);
});
```

### 3. 任务进度显示

```javascript
// 监听步骤执行
ws.on('step_start', (data) => {
  updateProgress(data.data.progress);
  setStepStatus(data.data.step.step_id, 'running');
});

ws.on('step_success', (data) => {
  setStepStatus(data.data.step.step_id, 'completed');
});

ws.on('step_failed', (data) => {
  setStepStatus(data.data.step.step_id, 'failed');
  showError(data.data.error);
});
```

### 4. 交互式输入处理

```javascript
// 监听需要用户输入的事件
ws.on('user_input_required', (data) => {
  showInteractiveDialog({
    prompt: data.prompt,
    options: data.options,
    explanations: data.options_explanation,
    defaultValue: data.default_response,
    onSubmit: (response) => {
      // 发送用户响应
      ws.send({
        type: 'interactive_input',
        payload: {
          step_id: data.step_id,
          response: response
        }
      });
    }
  });
});
```

---

## 事件流程示例

### 复杂任务执行流程

```
1. process_started
2. flow_node (analysis, started)
3. task_analysis
4. task_analysis_complete
5. flow_node (analysis, completed)
6. flow_node (sandbox_creation, started)
7. sandbox_ready
8. flow_node (sandbox_creation, completed)
9. flow_node (planning, started)
10. llm_call (create_plan)
11. llm_call_complete (create_plan)
12. todo_list_update (created)
13. flow_node (planning, completed)
14. file_tree_update (初始文件树)
15. flow_node (execution, started)
16. plan_start
17. step_start (步骤 1)
18. tool_call
19. tool_result
20. step_success (步骤 1)
21. file_tree_update (步骤 1 后的文件树)
22. todo_item_update
... (重复步骤 17-22 直到所有步骤完成)
23. plan_complete
24. flow_node (summarizing, started)
25. llm_call (generate_summary)
26. llm_call_complete (generate_summary)
27. flow_node (summarizing, completed)
28. chat_response (token 流)
29. todo_list_update (completed)
30. file_tree_update (最终文件树)
31. file_changes_update
32. chat_complete
33. process_completed