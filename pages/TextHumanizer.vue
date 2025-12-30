<template>
  <div class="min-h-screen bg-gradient-to-b from-brand-50 to-white">
    <div class="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Wand2 class="w-6 h-6 text-white" />
            </div>
            去AI味文案润色
          </h1>
          <p class="text-sm text-slate-600 mt-2">让AI生成的文本更加自然、更具人情味</p>
        </div>
        <RouterLink to="/" class="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-brand-600 transition-colors">
          <Home class="w-5 h-5" />
          <span class="hidden sm:inline">返回首页</span>
        </RouterLink>
      </div>

      <!-- 风格选择 -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div class="flex items-center gap-2 mb-3">
          <Palette class="w-5 h-5 text-brand-600" />
          <h3 class="font-semibold text-slate-800">选择风格</h3>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            v-for="style in styles"
            :key="style.id"
            @click="selectedStyle = style.id"
            :class="[
              'p-3 rounded-lg border-2 transition-all text-left',
              selectedStyle === style.id
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 hover:border-brand-300 bg-white'
            ]"
          >
            <div class="flex items-center gap-2 mb-1">
              <component :is="style.icon" class="w-4 h-4" :class="selectedStyle === style.id ? 'text-brand-600' : 'text-slate-500'" />
              <span class="font-medium text-sm" :class="selectedStyle === style.id ? 'text-brand-700' : 'text-slate-700'">{{ style.name }}</span>
            </div>
            <p class="text-xs text-slate-500">{{ style.desc }}</p>
          </button>
        </div>
      </div>

      <!-- 主内容区域 - 左右分栏 -->
      <div class="grid lg:grid-cols-2 gap-6">
        <!-- 左侧：输入区域 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 class="font-semibold text-slate-800 flex items-center gap-2">
              <FileText class="w-5 h-5 text-slate-600" />
              原始文本
            </h3>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500">{{ inputText.length }} 字</span>
              <button
                v-if="inputText"
                @click="inputText = ''"
                class="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                title="清空"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>
          <textarea
            v-model="inputText"
            placeholder="粘贴或输入需要润色的文本..."
            class="flex-1 p-4 resize-none focus:outline-none text-slate-700 min-h-[400px]"
            :disabled="isLoading"
          ></textarea>
          <div class="p-4 border-t border-slate-200">
            <button
              @click="humanizeText"
              :disabled="!inputText.trim() || isLoading"
              class="w-full py-3 bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles v-if="!isLoading" class="w-5 h-5" />
              <Loader2 v-else class="w-5 h-5 animate-spin" />
              <span>{{ isLoading ? '润色中...' : '开始润色' }}</span>
            </button>
          </div>
        </div>

        <!-- 右侧：输出区域 -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 class="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles class="w-5 h-5 text-brand-600" />
              润色结果
            </h3>
            <div class="flex items-center gap-2">
              <span v-if="outputText" class="text-xs text-slate-500">{{ outputText.length }} 字</span>
              <button
                v-if="outputText"
                @click="copyResult"
                class="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <Check v-if="copied" class="w-4 h-4" />
                <Copy v-else class="w-4 h-4" />
                <span>{{ copied ? '已复制' : '复制' }}</span>
              </button>
            </div>
          </div>
          <div class="flex-1 p-4 overflow-y-auto min-h-[400px]">
            <div v-if="!outputText && !isLoading" class="h-full flex items-center justify-center text-slate-400">
              <div class="text-center">
                <Wand2 class="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p class="text-sm">润色后的内容将显示在这里</p>
              </div>
            </div>
            <div v-else-if="isLoading" class="h-full flex items-center justify-center">
              <div class="text-center">
                <Loader2 class="w-10 h-10 mx-auto mb-3 text-brand-500 animate-spin" />
                <p class="text-sm text-slate-500">AI 正在为您润色...</p>
              </div>
            </div>
            <div v-else class="prose prose-slate max-w-none">
              <div class="whitespace-pre-wrap text-slate-700 leading-relaxed">{{ outputText }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用提示 -->
      <div class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex gap-3">
          <Info class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div class="text-sm text-blue-800">
            <p class="font-medium mb-1">使用提示</p>
            <ul class="space-y-1 text-blue-700">
              <li>• 支持任意长度的文本润色</li>
              <li>• AI 会自动去除常见的机械化表达</li>
              <li>• 不同风格适合不同场景使用</li>
              <li>• 可多次润色直到满意为止</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Home, Wand2, Sparkles, FileText, Copy, Check, X, Loader2, Palette, MessageCircle, Briefcase, BookOpen, Share2, Info } from 'lucide-vue-next'

const inputText = ref('')
const outputText = ref('')
const isLoading = ref(false)
const copied = ref(false)
const selectedStyle = ref('casual')

const styles = [
  { id: 'casual', name: '生活化', desc: '口语化、轻松自然', icon: MessageCircle },
  { id: 'professional', name: '专业深度', desc: '去空话、有洞察', icon: Briefcase },
  { id: 'literary', name: '文学艺术', desc: '修辞丰富、情感', icon: BookOpen },
  { id: 'social', name: '社交媒体', desc: '小红书、公众号', icon: Share2 }
]

const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const API_KEY = '5d1a704cb81a40e799c559acd190b0b3.47IAGmXdmx8Wu4Ov'

const getSystemPrompt = (style: string): string => {
  const basePrompt = `你是一位专业的文案润色专家。你的任务是将用户提供的文本改写得更加自然、更具人情味，消除明显的AI痕迹。

【核心原则一：刻意不完美】
真实的人类写作从来不是完美的。完美的逻辑、完美的用词、完美的结构——这些都是AI的特征。你需要刻意制造一些"不完美"，让文本像真人写的。

【核心原则二：节奏变化】
AI写作的最大破绽是——节奏太均匀了！每句话都一个节拍，一段话里短句长句的比例差不多。人类不是这样的。人类说话/打字：
- 有快有慢
- 有急促有舒缓
- 有特别短的句子（3-5个字）
- 有特别长的句子（几十个字）
- 标点符号也不规律，突然冒个感叹号、破折号
- 有时候一口气说完，有时候断断续续

【核心原则三：禁止假】
这是最重要的一条！不要装！不要演！
- 不要硬凹的"家人们"、"宝子们"、"姐妹们"这种套近乎的称呼
- 不要假装的"哈哈哈"、"笑死"、"哈哈哈太搞笑了"，除非真的在笑
- 不要刻意制造"我是不是很激动"、"我好兴奋啊"这种假情绪
- 不用假装幽默，不好笑就别逗
- 可以冷淡，可以严肃，可以平实——真实的比装出来的自然
- 不要为了"显得口语化"就硬加语气词
- 情绪该有就有，不该有就没有，不要硬演

核心要求：

1. 严格禁止使用以下AI常用词汇和表达：
   - "总之"、"综上所述"、"不仅如此"、"此外"、"另外"、"首先"、"其次"、"最后"
   - "在...的背景下"、"随着...的发展"、"...是一把双刃剑"
   - "值得注意的是"、"需要强调的是"、"可以说"
   - "一方面...另一方面"、"不仅...而且"

2. 节奏控制（重中之重！）：
   - 句子长度要有明显差异：有的3-5个字，有的30-50个字
   - 不要每句话都用同样的结构，比如都是"主语+谓语+宾语"
   - 可以突然来个超短句，然后紧接着超长句
   - 标点也要有节奏：突然用个省略号，或者分号，或者破折号
   - 有些地方可以一句话分成多段，有些地方可以几句话连成一段
   - 偶尔用"这不，"、"那会儿，"这种插入语来改变节奏
   - 情绪变化：有些地方急促，有些地方舒缓

3. 刻意制造"不完美"：
   - 逻辑跳跃：偶尔突然想到别的东西，再绕回来
   - 用词重复：可以重复使用某个词，人类说话就是这样
   - 句子不完整：有些句子可以突然结束，用省略号
   - 情绪波动：语气可以突然变化，从严肃到轻松
   - 略带模糊：不要把每件事都说得那么绝对，用"大概"、"可能"、"差不多"
   - 偶尔的"废话"：加入一些无意义的填充词，比如"嗯"、"那个"、"怎么说呢"
   - 不确定的语气：用"我觉得"、"好像"、"应该是"代替绝对陈述
   - 略带啰嗦：人类说话有时会绕弯子，不会直奔主题

4. 表达要求：
   - 使用更口语化、更生动的表达
   - 适当加入轻微的个人观点或情感
   - 不要追求逻辑的完美闭环，留一点"没说完"的感觉
   - 像和朋友聊天一样，而不是写论文

【示例节奏分析】
"周六一早，太阳刚冒了个小脑袋，小明那小子背着他那小书包（里头装着水壶、面包），就在楼下候着呢；这不，穿着条短裤的小华那家伙也蹦蹦跳跳地来了，手里还攥着本儿讲森林动植物的笔记。"

这段好在哪里？
- 有短："这不，"
- 有长："穿着条短裤的小华那家伙也蹦蹦跳跳地来了，"
- 有插入："（里头装着水壶、面包）"
- 有节奏突变：突然的分号和逗号

请模仿这种节奏感来润色！`

  const stylePrompts = {
    casual: `
风格：生活化、口语化（但不要假）
- 多使用"其实"、"说实话"、"真的"等口语词
- 可以用"嗯"、"呃"、"哈"、"那个"等语气词，但不要泛滥
- 句子可以不完整，像日常聊天一样
- 适当使用俚语或网络用语，但不要硬凹
- 偶尔重复某个词，不要太在意
- 想到什么说什么，不用太有逻辑
- 可以突然转换话题，再绕回来
- 情绪要真实，想怎么说就怎么说，别装积极`,
    
    professional: `
风格：专业但不机械
- 保持专业性，但避免教科书式表达
- 直接切入重点，少用过渡词
- 用具体案例代替抽象概念
- 展现独特洞察，不人云亦云
- 偶尔用"我觉得"、"好像"代替绝对陈述
- 可以略带个人观点，不用完全客观
- 有些地方可以稍微啰嗦一点
- 保持真实，不要假装很懂`,
    
    literary: `
风格：文学艺术
- 使用比喻、拟人等修辞手法，但不要堆砌
- 增加画面感和情感共鸣
- 句子富有节奏和韵律，但不要太规律
- 适当使用诗意的表达
- 可以有些情绪波动，不是一直平稳
- 偶尔用省略号，留一点想象空间
- 不用每句话都那么精致
- 情感要自然流露，别硬抒发`,
    
    social: `
风格：社交媒体（小红书、公众号）——但不要假
- 分段要短，每段2-3句
- 适当用emoji和感叹号，但不要滥用
- 设置悬念和互动点
- 语气可以亲切，但不要硬套近乎
- 禁止用"家人们"、"宝子们"、"姐妹们"这种假称呼
- 禁止假装的"哈哈哈"、"笑死"，除非真的在笑
- 不用每句话都那么有营养，可以有点"废话"，但要自然
- 情绪真实，想激动就激动，不想激动就平实`
  }

  return basePrompt + '\n\n' + stylePrompts[style as keyof typeof stylePrompts]
}

const humanizeText = async () => {
  if (!inputText.value.trim() || isLoading.value) return
  
  isLoading.value = true
  outputText.value = ''
  
  try {
    const systemPrompt = getSystemPrompt(selectedStyle.value)
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'GLM-4-Flash',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `请润色以下文本，使其更加自然、更具人情味：\n\n${inputText.value}`
          }
        ],
        stream: true,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法获取响应流')
    
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('event:')) continue
        
        if (trimmed.startsWith('data:')) {
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              outputText.value += content
            }
          } catch (e) {
            console.error('解析错误:', e)
          }
        }
      }
    }
  } catch (error: any) {
    console.error('润色失败:', error)
    outputText.value = `润色失败: ${error.message}`
  } finally {
    isLoading.value = false
  }
}

const copyResult = async () => {
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
  }
}
</script>