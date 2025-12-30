<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Mic, MicOff, Home, Copy, Trash2, AlertCircle, CheckCircle, Volume2, VolumeX, Globe, Play, Pause, Download } from 'lucide-vue-next'

// 浏览器兼容性检测
const isSupported = computed(() => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
})

// 获取浏览器语言（所有浏览器都支持）
const browserLanguage = computed(() => {
  // navigator.languages 是所有现代浏览器都支持的 API
  // 返回用户偏好的语言列表，按优先级排序
  const languages = navigator.languages || [navigator.language]
  return languages[0] || 'zh-CN'
})

// 检测浏览器语言是否在支持的语言列表中
const detectBrowserLanguage = () => {
  const browserLang = browserLanguage.value.toLowerCase()
  
  // 尝试精确匹配
  const exactMatch = languages.find(lang => lang.code.toLowerCase() === browserLang)
  if (exactMatch) return exactMatch.code
  
  // 尝试匹配语言代码（如 zh-CN 匹配 zh）
  const langCode = browserLang.split('-')[0]
  const langMatch = languages.find(lang => lang.code.toLowerCase().startsWith(langCode))
  if (langMatch) return langMatch.code
  
  // 默认返回中文
  return 'zh-CN'
}

// 语音识别实例
let recognition: any = null

// 音频录制相关
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let audioStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let silenceTimer: number | null = null
let dataArray: Uint8Array | null = null

// 状态管理
const isListening = ref(false)
const isSpeaking = ref(false)
const isRecording = ref(false)
const isPressRecording = ref(false)
const isPlaying = ref(false)
const transcript = ref('')
const interimTranscript = ref('')
const finalTranscript = ref('')
const error = ref<string | null>(null)
const status = ref('ready') // ready, listening, processing, error

// 录制的音频
const recordedAudioUrl = ref<string>('')
const audioDuration = ref<string>('')

// API 识别结果
const apiTranscription = ref<string>('')
const isTranscribing = ref(false)
const transcriptionError = ref<string | null>(null)

// 静音检测配置
const SILENCE_THRESHOLD = 30 // 音量阈值（0-255）
const SILENCE_DURATION = 1500 // 静音持续时间（毫秒）

// SiliconFlow API 配置
const API_KEY = 'sk-yyqmrkevamdfuilmfdlfmjzuatoytqlywfalkjkfrzkffvdr'
const API_URL = 'https://api.siliconflow.cn/v1/audio/transcriptions'
const API_MODEL = 'FunAudioLLM/SenseVoiceSmall'

// 降级处理：手动输入模式
const manualInput = ref('')
const showManualInput = ref(false)

// 语言选项
const languages = [
  { code: 'zh-CN', name: '中文（简体）' },
  { code: 'zh-TW', name: '中文（繁体）' },
  { code: 'en-US', name: '英语（美国）' },
  { code: 'en-GB', name: '英语（英国）' },
  { code: 'ja-JP', name: '日语' },
  { code: 'ko-KR', name: '韩语' },
  { code: 'fr-FR', name: '法语' },
  { code: 'de-DE', name: '德语' },
  { code: 'es-ES', name: '西班牙语' },
]
// 自动检测浏览器语言
const selectedLanguage = ref(detectBrowserLanguage())

// 初始化语音识别
const initRecognition = () => {
  if (!isSupported.value) return

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  recognition = new SpeechRecognition()
  
  // 配置参数
  recognition.lang = selectedLanguage.value
  recognition.interimResults = true // 实时返回中间结果
  recognition.continuous = false // 单次识别模式
  recognition.maxAlternatives = 1

  // 监听结果事件
  recognition.onresult = (event: any) => {
    let interim = ''
    let final = ''
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        final += result[0].transcript
      } else {
        interim += result[0].transcript
      }
    }
    
    interimTranscript.value = interim
    if (final) {
      finalTranscript.value += final
      transcript.value = finalTranscript.value
    }
  }

  // 监听开始事件
  recognition.onstart = () => {
    isListening.value = true
    status.value = 'listening'
    error.value = null
  }

  // 监听结束事件
  recognition.onend = () => {
    isListening.value = false
    if (status.value === 'listening') {
      status.value = 'ready'
    }
  }

  // 监听错误事件
  recognition.onerror = (event: any) => {
    isListening.value = false
    status.value = 'error'
    
    const errorMessages: Record<string, string> = {
      'no-speech': '未检测到语音，请重试',
      'audio-capture': '无法访问麦克风，请检查权限设置',
      'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许',
      'network': '网络错误，请检查网络连接',
      'aborted': '识别被中断',
    }
    
    error.value = errorMessages[event.error] || `识别错误: ${event.error}`
  }

  // 监听语音结束事件
  recognition.onspeechend = () => {
    recognition.stop()
  }
}

// 开始识别
const startListening = () => {
  if (!isSupported.value) {
    showManualInput.value = true
    return
  }
  
  if (isListening.value) {
    stopListening()
    return
  }
  
  error.value = null
  interimTranscript.value = ''
  
  // 重新初始化以应用新的语言设置
  initRecognition()
  recognition.start()
}

// 停止识别
const stopListening = () => {
  if (recognition && isListening.value) {
    recognition.stop()
  }
}

// 清空文本
const clearText = () => {
  transcript.value = ''
  finalTranscript.value = ''
  interimTranscript.value = ''
  manualInput.value = ''
  error.value = null
}

// 复制文本
const copyText = async () => {
  const textToCopy = transcript.value || manualInput.value
  if (!textToCopy) return
  
  try {
    await navigator.clipboard.writeText(textToCopy)
    // 可以添加一个提示
    alert('已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 语音合成（朗读识别结果）
const speakText = () => {
  const textToSpeak = transcript.value || manualInput.value
  if (!textToSpeak) return
  
  if (isSpeaking.value) {
    window.speechSynthesis.cancel()
    isSpeaking.value = false
    return
  }
  
  const utterance = new SpeechSynthesisUtterance(textToSpeak)
  utterance.lang = selectedLanguage.value
  utterance.rate = 1
  utterance.pitch = 1
  
  utterance.onstart = () => {
    isSpeaking.value = true
  }
  
  utterance.onend = () => {
    isSpeaking.value = false
  }
  
  utterance.onerror = () => {
    isSpeaking.value = false
  }
  
  window.speechSynthesis.speak(utterance)
}

// 开始录制音频
const startRecording = async () => {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(audioStream)
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      recordedAudioUrl.value = URL.createObjectURL(audioBlob)
      
      // 获取音频时长
      const audio = new Audio(recordedAudioUrl.value)
      audio.onloadedmetadata = () => {
        const duration = audio.duration
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        audioDuration.value = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
      
      // 自动调用 API 进行语音识别
      transcribeAudio(audioBlob)
    }

    mediaRecorder.start()
    isRecording.value = true
    error.value = null
  } catch (err) {
    console.error('录制失败:', err)
    error.value = '无法访问麦克风，请检查权限设置'
  }
}

// 停止录制音频
const stopRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
    
    // 停止音频流
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
    }
    
    // 清理静音检测
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
  }
}

// 开始按住录制
const startPressRecording = async () => {
  try {
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(audioStream)
    audioChunks = []

    // 设置音频分析器用于静音检测
    audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(audioStream)
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    dataArray = new Uint8Array(analyser.frequencyBinCount)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      recordedAudioUrl.value = URL.createObjectURL(audioBlob)
      
      // 获取音频时长
      const audio = new Audio(recordedAudioUrl.value)
      audio.onloadedmetadata = () => {
        const duration = audio.duration
        const minutes = Math.floor(duration / 60)
        const seconds = Math.floor(duration % 60)
        audioDuration.value = `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
      
      // 自动调用 API 进行语音识别
      transcribeAudio(audioBlob)
    }

    mediaRecorder.start()
    isPressRecording.value = true
    error.value = null
    
    // 开始静音检测
    detectSilence()
  } catch (err) {
    console.error('录制失败:', err)
    error.value = '无法访问麦克风，请检查权限设置'
  }
}

// 停止按住录制
const stopPressRecording = () => {
  if (mediaRecorder && isPressRecording.value) {
    mediaRecorder.stop()
    isPressRecording.value = false
    
    // 停止音频流
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
    }
    
    // 清理静音检测
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }
  }
}

// 静音检测
const detectSilence = () => {
  if (!analyser || !dataArray || !isPressRecording.value) return
  
  analyser.getByteFrequencyData(dataArray)
  
  // 计算平均音量
  let sum = 0
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i]
  }
  const average = sum / dataArray.length
  
  // 如果音量低于阈值，开始计时
  if (average < SILENCE_THRESHOLD) {
    if (!silenceTimer) {
      silenceTimer = window.setTimeout(() => {
        // 静音持续时间超过阈值，自动停止录制
        stopPressRecording()
      }, SILENCE_DURATION)
    }
  } else {
    // 有声音，清除静音计时器
    if (silenceTimer) {
      clearTimeout(silenceTimer)
      silenceTimer = null
    }
  }
  
  // 继续检测
  if (isPressRecording.value) {
    requestAnimationFrame(detectSilence)
  }
}

// 播放录制的音频
const playRecordedAudio = () => {
  if (!recordedAudioUrl.value) return
  
  const audio = new Audio(recordedAudioUrl.value)
  
  audio.onplay = () => {
    isPlaying.value = true
  }
  
  audio.onended = () => {
    isPlaying.value = false
  }
  
  audio.onerror = () => {
    isPlaying.value = false
    error.value = '播放失败'
  }
  
  audio.play()
}

// 停止播放
const stopPlaying = () => {
  isPlaying.value = false
}

// 下载录制的音频
const downloadAudio = () => {
  if (!recordedAudioUrl.value) return
  
  const a = document.createElement('a')
  a.href = recordedAudioUrl.value
  a.download = `recording-${Date.now()}.webm`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 调用 SiliconFlow API 进行语音识别
const transcribeAudio = async (audioBlob: Blob) => {
  if (!audioBlob) return
  
  isTranscribing.value = true
  transcriptionError.value = null
  
  try {
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', API_MODEL)
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`)
    }
    
    const result = await response.json()
    apiTranscription.value = result.text || ''
  } catch (err) {
    console.error('语音识别失败:', err)
    transcriptionError.value = '语音识别失败，请重试'
  } finally {
    isTranscribing.value = false
  }
}

// 复制 API 识别结果
const copyApiTranscription = async () => {
  if (!apiTranscription.value) return
  
  try {
    await navigator.clipboard.writeText(apiTranscription.value)
    alert('已复制到剪贴板')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 语言变化时重新初始化
const handleLanguageChange = () => {
  if (recognition) {
    recognition.lang = selectedLanguage.value
  }
}

// 组件挂载时初始化
onMounted(() => {
  if (isSupported.value) {
    initRecognition()
  }
  
  // 打印浏览器语言信息（用于调试）
  console.log('浏览器语言:', browserLanguage.value)
  console.log('支持的语言列表:', navigator.languages)
  console.log('自动选择的语言:', selectedLanguage.value)
})

// 组件卸载时清理
onUnmounted(() => {
  if (recognition) {
    recognition.stop()
  }
  window.speechSynthesis.cancel()
  
  // 清理音频录制
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
  }
  if (mediaRecorder && isPressRecording.value) {
    mediaRecorder.stop()
  }
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop())
  }
  if (recordedAudioUrl.value) {
    URL.revokeObjectURL(recordedAudioUrl.value)
  }
  if (silenceTimer) {
    clearTimeout(silenceTimer)
  }
  if (audioContext) {
    audioContext.close()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <!-- 头部导航 -->
    <header class="bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <RouterLink to="/" class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
            <Home class="w-5 h-5 text-slate-600" />
          </RouterLink>
          <div>
            <h1 class="text-xl font-bold text-slate-900">语音识别</h1>
            <p class="text-xs text-slate-500">将语音转换为文本</p>
          </div>
        </div>
        
        <!-- 语言选择 -->
        <div class="flex items-center gap-2">
          <Globe class="w-4 h-4 text-slate-400" />
          <select
            v-model="selectedLanguage"
            @change="handleLanguageChange"
            class="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">
              {{ lang.name }}
            </option>
          </select>
        </div>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 py-8">
      <!-- 浏览器兼容性提示 -->
      <div v-if="!isSupported" class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div class="flex items-start gap-3">
          <AlertCircle class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="font-semibold text-amber-800 mb-1">浏览器不支持语音识别</h3>
            <p class="text-sm text-amber-700 mb-3">您的浏览器不支持 Web Speech API，请使用 Chrome、Edge 或 Safari 浏览器。</p>
            <button 
              @click="showManualInput = true"
              class="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              使用手动输入模式
            </button>
          </div>
        </div>
      </div>

      <!-- 主控制区域 -->
      <div class="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <!-- 状态指示器 -->
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div 
              :class="[
                'w-2 h-2 rounded-full',
                isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'
              ]"
            ></div>
            <span class="text-sm font-medium text-slate-700">
              {{ isListening ? '正在聆听...' : '准备就绪' }}
            </span>
          </div>
          <div v-if="error" class="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle class="w-4 h-4" />
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- 文本显示区域 -->
        <div class="p-6 min-h-[300px]">
          <div v-if="!transcript && !manualInput && !interimTranscript" class="h-full flex flex-col items-center justify-center text-slate-400">
            <Mic class="w-16 h-16 mb-4 opacity-50" />
            <p class="text-lg font-medium">点击下方按钮开始录音</p>
            <p class="text-sm mt-2">说出您想要转换的文字</p>
          </div>
          
          <div v-else class="space-y-2">
            <!-- 最终识别结果 -->
            <div v-if="transcript" class="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
              {{ transcript }}
            </div>
            
            <!-- 手动输入内容 -->
            <div v-if="manualInput" class="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
              {{ manualInput }}
            </div>
            
            <!-- 临时识别结果 -->
            <div v-if="interimTranscript" class="text-lg text-slate-400 leading-relaxed whitespace-pre-wrap">
              {{ interimTranscript }}
            </div>
          </div>
        </div>

        <!-- 手动输入区域（降级模式） -->
        <div v-if="showManualInput" class="px-6 pb-6">
          <textarea
            v-model="manualInput"
            placeholder="在此手动输入文本..."
            class="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="4"
          ></textarea>
        </div>

        <!-- 操作按钮 -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <!-- 开始/停止录音按钮 -->
            <button
              @click="startListening"
              :disabled="!isSupported && !showManualInput"
              :class="[
                'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all',
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200'
                  : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-200',
                (!isSupported && !showManualInput) ? 'opacity-50 cursor-not-allowed' : ''
              ]"
            >
              <component :is="isListening ? MicOff : Mic" class="w-5 h-5" />
              <span>{{ isListening ? '停止录音' : '开始录音' }}</span>
            </button>
            
            <!-- 朗读按钮 -->
            <button
              @click="speakText"
              :disabled="!transcript && !manualInput"
              :class="[
                'flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all',
                isSpeaking
                  ? 'bg-purple-500 text-white hover:bg-purple-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
                (!transcript && !manualInput) ? 'opacity-50 cursor-not-allowed' : ''
              ]"
            >
              <component :is="isSpeaking ? VolumeX : Volume2" class="w-5 h-5" />
              <span>{{ isSpeaking ? '停止朗读' : '朗读' }}</span>
            </button>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- 清空按钮 -->
            <button
              @click="clearText"
              :disabled="!transcript && !manualInput"
              class="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
              :class="{ 'opacity-50 cursor-not-allowed': !transcript && !manualInput }"
            >
              <Trash2 class="w-5 h-5" />
              <span>清空</span>
            </button>
            
            <!-- 复制按钮 -->
            <button
              @click="copyText"
              :disabled="!transcript && !manualInput"
              class="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-all"
              :class="{ 'opacity-50 cursor-not-allowed': !transcript && !manualInput }"
            >
              <Copy class="w-5 h-5" />
              <span>复制</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 音频录制区域 -->
      <div class="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mic class="w-5 h-5 text-blue-500" />
            音频录制
          </h2>
        </div>

        <div class="p-6">
          <!-- 按住录制按钮（类似微信） -->
          <div class="mb-6">
            <p class="text-sm text-slate-600 mb-3">按住下方按钮开始录制，松开停止（静音1.5秒自动停止）</p>
            <button
              @mousedown="startPressRecording"
              @mouseup="stopPressRecording"
              @mouseleave="stopPressRecording"
              @touchstart.prevent="startPressRecording"
              @touchend.prevent="stopPressRecording"
              :class="[
                'w-full py-6 rounded-xl font-semibold transition-all select-none touch-manipulation',
                isPressRecording
                  ? 'bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
              ]"
            >
              <div class="flex items-center justify-center gap-3">
                <component :is="isPressRecording ? MicOff : Mic" class="w-6 h-6" />
                <span>{{ isPressRecording ? '松开停止录制' : '按住说话' }}</span>
              </div>
            </button>
            
            <div v-if="isPressRecording" class="mt-3 text-center">
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full text-sm text-red-600 font-medium">
                <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span>正在录制中...（静音自动停止）</span>
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="relative my-6">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-slate-200"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-slate-500">或使用传统录制</span>
            </div>
          </div>

          <!-- 传统录制控制按钮 -->
          <div class="flex items-center gap-4 mb-6">
            <button
              @click="isRecording ? stopRecording() : startRecording()"
              :class="[
                'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all',
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 animate-pulse'
                  : 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-200'
              ]"
            >
              <component :is="isRecording ? MicOff : Mic" class="w-5 h-5" />
              <span>{{ isRecording ? '停止录制' : '开始录制' }}</span>
            </button>
            
            <div v-if="isRecording" class="flex items-center gap-2 text-sm text-red-600 font-medium">
              <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span>正在录制中...</span>
            </div>
          </div>

          <!-- 录制的音频展示 -->
          <div v-if="recordedAudioUrl" class="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Volume2 class="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p class="text-sm font-medium text-slate-900">录制的音频</p>
                  <p class="text-xs text-slate-500">时长: {{ audioDuration }}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <!-- 播放/停止按钮 -->
                <button
                  @click="isPlaying ? stopPlaying() : playRecordedAudio()"
                  :class="[
                    'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
                    isPlaying
                      ? 'bg-purple-500 text-white hover:bg-purple-600'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  ]"
                >
                  <component :is="isPlaying ? Pause : Play" class="w-4 h-4" />
                  <span>{{ isPlaying ? '停止' : '播放' }}</span>
                </button>
                
                <!-- 下载按钮 -->
                <button
                  @click="downloadAudio"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
                >
                  <Download class="w-4 h-4" />
                  <span>下载</span>
                </button>
              </div>
            </div>
            
            <!-- 音频播放器 -->
            <audio
              :src="recordedAudioUrl"
              controls
              class="w-full"
              @play="isPlaying = true"
              @pause="isPlaying = false"
              @ended="isPlaying = false"
            ></audio>
          </div>

          <!-- 空状态提示 -->
          <div v-else class="text-center py-8 text-slate-400">
            <Mic class="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p class="text-sm">点击"开始录制"按钮录制音频</p>
          </div>
        </div>
      </div>

      <!-- API 语音识别结果区域 -->
      <div class="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Volume2 class="w-5 h-5 text-purple-500" />
            AI 语音识别结果
          </h2>
        </div>

        <div class="p-6">
          <!-- 识别状态 -->
          <div v-if="isTranscribing" class="flex items-center justify-center py-8">
            <div class="flex items-center gap-3 text-purple-600">
              <div class="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span class="font-medium">正在识别中...</span>
            </div>
          </div>

          <!-- 识别结果 -->
          <div v-else-if="apiTranscription" class="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckCircle class="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p class="text-sm font-medium text-slate-900">识别成功</p>
                  <p class="text-xs text-slate-500">使用 FunAudioLLM/SenseVoiceSmall 模型</p>
                </div>
              </div>
              
              <button
                @click="apiTranscription = ''"
                class="p-2 rounded-lg hover:bg-purple-100 transition-colors text-slate-500 hover:text-purple-600"
                title="清空结果"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            
            <div class="bg-white rounded-lg p-4 border border-purple-100">
              <p class="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
                {{ apiTranscription }}
              </p>
            </div>
            
            <div class="mt-3 flex items-center gap-2">
              <button
                @click="copyApiTranscription"
                class="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
              >
                <Copy class="w-4 h-4" />
                <span>复制文本</span>
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <div v-else-if="transcriptionError" class="bg-red-50 rounded-xl p-4 border border-red-200">
            <div class="flex items-start gap-3">
              <AlertCircle class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-medium text-red-800">识别失败</p>
                <p class="text-sm text-red-700 mt-1">{{ transcriptionError }}</p>
              </div>
            </div>
          </div>

          <!-- 空状态提示 -->
          <div v-else class="text-center py-8 text-slate-400">
            <Volume2 class="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p class="text-sm">录制音频后，AI 将自动识别语音内容</p>
          </div>
        </div>
      </div>

      <!-- AI 识别结果详细展示区 -->
      <div v-if="apiTranscription" class="mt-6 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-slate-200">
          <h2 class="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle class="w-5 h-5 text-purple-600" />
            识别结果详情
          </h2>
        </div>

        <div class="p-6">
          <!-- 文本统计信息 -->
          <div class="flex items-center gap-6 mb-4 pb-4 border-b border-slate-200">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <span class="text-xs font-bold text-purple-600">{{ apiTranscription.length }}</span>
              </div>
              <span class="text-sm text-slate-600">字符数</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <span class="text-xs font-bold text-indigo-600">{{ apiTranscription.split(/\s+/).filter(w => w).length }}</span>
              </div>
              <span class="text-sm text-slate-600">词数</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <span class="text-xs font-bold text-blue-600">{{ apiTranscription.split('\n').length }}</span>
              </div>
              <span class="text-sm text-slate-600">行数</span>
            </div>
          </div>

          <!-- 可编辑的文本展示区 -->
          <div class="bg-gradient-to-br from-white to-purple-50 rounded-xl p-4 border border-purple-200">
            <textarea
              v-model="apiTranscription"
              class="w-full min-h-[200px] bg-transparent border-none focus:outline-none resize-none text-lg text-slate-800 leading-relaxed font-medium"
              placeholder="识别的文本将显示在这里..."
            ></textarea>
          </div>

          <!-- 操作按钮 -->
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button
                @click="copyApiTranscription"
                class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <Copy class="w-4 h-4" />
                <span>复制文本</span>
              </button>
              <button
                @click="apiTranscription = ''"
                class="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors"
              >
                <Trash2 class="w-4 h-4" />
                <span>清空</span>
              </button>
            </div>
            
            <div class="text-xs text-slate-500">
              模型: {{ API_MODEL }}
            </div>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle class="w-5 h-5 text-blue-500" />
          使用说明
        </h2>
        <div class="space-y-3 text-sm text-slate-600">
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-bold text-blue-600">1</span>
            </div>
            <p>点击"开始录音"按钮，浏览器会请求麦克风权限，请点击"允许"</p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-bold text-blue-600">2</span>
            </div>
            <p>对着麦克风清晰地说出您想要转换的文字</p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-bold text-blue-600">3</span>
            </div>
            <p>识别结果会实时显示在屏幕上，您可以点击"复制"按钮复制文本</p>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-xs font-bold text-blue-600">4</span>
            </div>
            <p>支持多种语言切换，可在右上角选择识别语言</p>
          </div>
        </div>
      </div>

      <!-- 浏览器兼容性说明 -->
      <div class="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-6">
        <h3 class="text-sm font-bold text-slate-900 mb-3">浏览器兼容性</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-4">
          <div class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            <span class="text-slate-700">Chrome 25+</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            <span class="text-slate-700">Edge 79+</span>
          </div>
          <div class="flex items-center gap-2">
            <CheckCircle class="w-4 h-4 text-green-500" />
            <span class="text-slate-700">Safari 14.1+</span>
          </div>
          <div class="flex items-center gap-2">
            <AlertCircle class="w-4 h-4 text-amber-500" />
            <span class="text-slate-700">Firefox 不支持</span>
          </div>
        </div>
        
        <div class="border-t border-slate-200 pt-4">
          <h4 class="text-xs font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Globe class="w-3 h-3 text-blue-500" />
            语言检测
          </h4>
          <p class="text-xs text-slate-600 mb-2">
            已自动检测到您的浏览器语言：<span class="font-medium text-slate-800">{{ browserLanguage }}</span>
          </p>
          <p class="text-xs text-slate-500">
            所有现代浏览器都支持语言检测，包括 Chrome、Firefox、Safari、Edge 等。
          </p>
        </div>
      </div>
    </main>
  </div>
</template>