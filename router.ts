import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Reader from './pages/Reader.vue'
import DocPreview from './pages/DocPreview.vue'
import JsonTool from './pages/JsonTool.vue'
import TimestampTool from './pages/TimestampTool.vue'
import CalculatorTool from './pages/CalculatorTool.vue'
import CaseConverter from './pages/CaseConverter.vue'
import StringAssembler from './pages/StringAssembler.vue'
import ImageTools from './pages/ImageTools.vue'
import ImageToolsNew from './pages/ImageToolsNew.vue'
import ImageToBase64 from './pages/ImageToBase64.vue'
// import ScriptWriter from './pages/ScriptWriter.vue'
// import Action3DTool from './pages/3DActionTool.vue'
import SshTerminal from './pages/SshTerminal.vue'
import MultiModelChat from './pages/MultiModelChat.vue'
import MultiModalQA from './pages/MultiModalQA.vue'
import CodeEditor from './pages/CodeEditor.vue'
import ColorTool from './pages/ColorTool.vue'
import MarkdownEditor from './pages/MarkdownEditor.vue'
import FlowCanvas from './pages/FlowCanvas.vue'
import MindMap from './pages/MindMap.vue'
import TokenCounter from './pages/TokenCounter.vue'
import TextHumanizer from './pages/TextHumanizer.vue'
import SpeechRecognition from './pages/SpeechRecognition.vue'
import SandboxTest from './pages/SandboxTest.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/reader', name: 'reader', component: Reader },
  { path: '/doc-preview', name: 'doc-preview', component: DocPreview },
  { path: '/json', name: 'json', component: JsonTool },
  { path: '/timestamp', name: 'timestamp', component: TimestampTool },
  { path: '/calculator', name: 'calculator', component: CalculatorTool },
  { path: '/case', name: 'case', component: CaseConverter },
  { path: '/string', name: 'string', component: StringAssembler },
  { path: '/images', name: 'images', component: ImageTools },
  { path: '/images-new', name: 'images-new', component: ImageToolsNew },
  { path: '/image-to-base64', name: 'image-to-base64', component: ImageToBase64 },
  // { path: '/script-writer', name: 'script-writer', component: ScriptWriter },
  // { path: '/3d-action', name: '3d-action', component: Action3DTool },
  { path: '/ssh', name: 'ssh', component: SshTerminal },
  { path: '/chat', name: 'chat', component: MultiModelChat },
  { path: '/multimodal', name: 'multimodal', component: MultiModalQA },
  { path: '/editor', name: 'editor', component: CodeEditor },
  { path: '/color', name: 'color', component: ColorTool },
  { path: '/markdown', name: 'markdown', component: MarkdownEditor },
  { path: '/flow', name: 'flow', component: FlowCanvas },
  { path: '/mindmap', name: 'mindmap', component: MindMap },
  { path: '/token', name: 'token', component: TokenCounter },
  { path: '/humanizer', name: 'humanizer', component: TextHumanizer },
  { path: '/speech', name: 'speech', component: SpeechRecognition },
  { path: '/sandbox', name: 'sandbox', component: SandboxTest }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
