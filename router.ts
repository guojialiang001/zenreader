import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Reader from './pages/Reader.vue'
import JsonTool from './pages/JsonTool.vue'
import TimestampTool from './pages/TimestampTool.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/reader', name: 'reader', component: Reader },
  { path: '/json', name: 'json', component: JsonTool },
  { path: '/timestamp', name: 'timestamp', component: TimestampTool },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
