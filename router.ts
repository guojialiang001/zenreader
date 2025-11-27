import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Reader from './pages/Reader.vue'
import JsonTool from './pages/JsonTool.vue'
import TimestampTool from './pages/TimestampTool.vue'
import CaseConverter from './pages/CaseConverter.vue'
import StringAssembler from './pages/StringAssembler.vue'
import ImageTools from './pages/ImageTools.vue'
import ImageToBase64 from './pages/ImageToBase64.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/reader', name: 'reader', component: Reader },
  { path: '/json', name: 'json', component: JsonTool },
  { path: '/timestamp', name: 'timestamp', component: TimestampTool },
  { path: '/case', name: 'case', component: CaseConverter },
  { path: '/string', name: 'string', component: StringAssembler },
  { path: '/images', name: 'images', component: ImageTools },
  { path: '/image-to-base64', name: 'image-to-base64', component: ImageToBase64 }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
