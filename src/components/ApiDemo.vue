<template>
  <div class="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
    <h2 class="text-xl font-bold text-slate-900 mb-4">Axios API 演示</h2>
    
    <div class="space-y-4">
      <!-- 模拟API请求 -->
      <div class="space-y-2">
        <h3 class="font-medium text-slate-700">模拟API请求</h3>
        <div class="flex gap-2">
          <button 
            @click="mockGetRequest" 
            :disabled="loading.get"
            class="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading.get ? '请求中...' : 'GET请求' }}
          </button>
          <button 
            @click="mockPostRequest" 
            :disabled="loading.post"
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading.post ? '请求中...' : 'POST请求' }}
          </button>
          <button 
            @click="mockErrorRequest" 
            :disabled="loading.error"
            class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading.error ? '请求中...' : '错误请求' }}
          </button>
        </div>
      </div>

      <!-- 请求结果 -->
      <div class="space-y-2">
        <h3 class="font-medium text-slate-700">请求结果</h3>
        <div class="p-3 bg-slate-50 rounded-lg">
          <pre class="text-sm text-slate-700 whitespace-pre-wrap">{{ result }}</pre>
        </div>
      </div>

      <!-- 使用示例 -->
      <div class="space-y-2">
        <h3 class="font-medium text-slate-700">使用示例</h3>
        <div class="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
          <p class="mb-2">1. 导入API工具：</p>
          <code class="block p-2 bg-slate-100 rounded text-xs mb-3">import { api } from '@/utils/api'</code>
          
          <p class="mb-2">2. 发起请求：</p>
          <code class="block p-2 bg-slate-100 rounded text-xs">
const response = await api.getUserInfo()
console.log(response.data)
          </code>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { api, http } from '@/utils/api'

const loading = ref({
  get: false,
  post: false,
  error: false
})

const result = ref('点击按钮发起请求...')

// 模拟GET请求
const mockGetRequest = async () => {
  loading.value.get = true
  try {
    // 使用http实例直接发起请求
    const response = await http.get('https://jsonplaceholder.typicode.com/posts/1')
    result.value = JSON.stringify(response, null, 2)
  } catch (error) {
    result.value = `请求失败: ${error}`
  } finally {
    loading.value.get = false
  }
}

// 模拟POST请求
const mockPostRequest = async () => {
  loading.value.post = true
  try {
    const response = await http.post('https://jsonplaceholder.typicode.com/posts', {
      title: '测试标题',
      body: '测试内容',
      userId: 1
    })
    result.value = JSON.stringify(response, null, 2)
  } catch (error) {
    result.value = `请求失败: ${error}`
  } finally {
    loading.value.post = false
  }
}

// 模拟错误请求
const mockErrorRequest = async () => {
  loading.value.error = true
  try {
    // 请求一个不存在的接口
    const response = await http.get('https://jsonplaceholder.typicode.com/invalid-endpoint')
    result.value = JSON.stringify(response, null, 2)
  } catch (error) {
    result.value = `请求失败: ${error}`
  } finally {
    loading.value.error = false
  }
}
</script>