
<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import {
  ArrowLeft, Palette, Copy, Check, RefreshCw,
  Pipette, Sun, Eye, History, Home,
  Layers, Trash2,
  Zap, Info, AlertCircle, CheckCircle2, Type
} from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/');
};

// --- Types & Interfaces ---
interface ColorHSL { h: number; s: number; l: number; a: number; }
interface ColorRGB { r: number; g: number; b: number; a: number; }

// --- State ---
const currentColor = ref<ColorHSL>({ h: 210, s: 100, l: 50, a: 1 });
const currentRgb = ref<ColorRGB>({ r: 0, g: 127, b: 255, a: 1 });

const history = ref<string[]>([]);
const hexInput = ref('#007BFF');
const showCopied = ref(false);
const copiedText = ref('');
const activeTab = ref<'harmonies' | 'shades' | 'accessibility'>('harmonies');

// 快速颜色输入
const quickColorInput = ref('');
const quickColorError = ref('');

// --- Color Conversions ---
const hslToRgb = (h: number, s: number, l: number): { r: number, g: number, b: number } => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
};

const hexToRgb = (hex: string): ColorRGB | null => {
  if (!hex) return null;
  const cleaned = hex.trim().replace('#', '');
  if (cleaned.length !== 3 && cleaned.length !== 6) return null;
  
  let r, g, b;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  }
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  
  return { r, g, b, a: 1 };
};

const rgbToHsl = (r: number, g: number, b: number): ColorHSL => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100, a: 1 };
};

// --- Computed Properties ---
const hex = computed(() => rgbToHex(currentRgb.value.r, currentRgb.value.g, currentRgb.value.b));
const rgbaString = computed(() => `rgba(${currentRgb.value.r}, ${currentRgb.value.g}, ${currentRgb.value.b}, ${currentRgb.value.a})`);
const hslString = computed(() => `hsla(${currentColor.value.h}, ${currentColor.value.s}%, ${currentColor.value.l}%, ${currentColor.value.a})`);

// --- Contrast & Accessibility ---
const getLuminance = (r: number, g: number, b: number) => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const getContrastRatio = (l1: number, l2: number) => {
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return Math.round(ratio * 100) / 100;
};

const contrastWithWhite = computed(() => getContrastRatio(getLuminance(currentRgb.value.r, currentRgb.value.g, currentRgb.value.b), 1));
const contrastWithBlack = computed(() => getContrastRatio(getLuminance(currentRgb.value.r, currentRgb.value.g, currentRgb.value.b), 0));

const isDark = computed(() => getLuminance(currentRgb.value.r, currentRgb.value.g, currentRgb.value.b) < 0.5);

// --- Harmonies & Variations ---
const harmonies = computed(() => {
  const { h, s, l } = currentColor.value;
  return [
    { name: '互补色', h: (h + 180) % 360, s, l },
    { name: '类似色 1', h: (h + 30) % 360, s, l },
    { name: '类似色 2', h: (h - 30 + 360) % 360, s, l },
    { name: '三等分 1', h: (h + 120) % 360, s, l },
    { name: '三等分 2', h: (h + 240) % 360, s, l },
  ].map(color => ({ ...color, hex: rgbToHex(hslToRgb(color.h, color.s, color.l).r, hslToRgb(color.h, color.s, color.l).g, hslToRgb(color.h, color.s, color.l).b) }));
});

const shades = computed(() => {
  return Array.from({ length: 10 }, (_, i) => {
    const l = Math.max(0, Math.min(100, (i + 1) * 10));
    const rgbVal = hslToRgb(currentColor.value.h, currentColor.value.s, l);
    return { l, hex: rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b) };
  });
});

// --- Actions ---
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedText.value = text;
    showCopied.value = true;
    setTimeout(() => showCopied.value = false, 2000);
    addToHistory(text);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const addToHistory = (color: string) => {
  if (!color || !color.startsWith('#')) return;
  const normalized = color.toUpperCase();
  const newHistory = [normalized, ...history.value.filter(c => c !== normalized)].slice(0, 12);
  history.value = newHistory;
  localStorage.setItem('color-history', JSON.stringify(history.value));
};

let isUpdating = false;

const setColorFromHex = (hexVal: string, saveToHistory = true) => {
  const rgbObj = hexToRgb(hexVal);
  if (!rgbObj) return false;
  
  const { r, g, b } = rgbObj;
  const a = currentRgb.value.a;
  const hsl = rgbToHsl(r, g, b);
  
  // 灰度颜色保持色相和饱和度
  const isGrayscale = r === g && g === b;
  if (isGrayscale) {
    hsl.h = currentColor.value.h;
    if (r === 0 || r === 255) hsl.s = currentColor.value.s;
  }
  
  // 使用 isUpdating 标志防止 watcher 循环
  isUpdating = true;
  currentRgb.value = { r, g, b, a };
  currentColor.value = { ...hsl, a };
  // 使用 nextTick 确保在 DOM 更新后才重置标志
  setTimeout(() => {
    isUpdating = false;
  }, 0);
  
  if (saveToHistory) {
    addToHistory(hexVal);
  }
  
  return true;
};

const randomColor = () => {
  isUpdating = true;
  currentColor.value = {
    h: Math.floor(Math.random() * 360),
    s: Math.floor(Math.random() * 100),
    l: Math.floor(Math.random() * 100),
    a: 1
  };
  const rgb = hslToRgb(currentColor.value.h, currentColor.value.s, currentColor.value.l);
  currentRgb.value = { ...rgb, a: currentColor.value.a };
  setTimeout(() => {
    isUpdating = false;
  }, 0);
};

const isEyeDropperSupported = ref(typeof window !== 'undefined' && 'EyeDropper' in window);

const pickColor = async () => {
  if (isEyeDropperSupported.value) {
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      setColorFromHex(result.sRGBHex, true);
    } catch (e) {
      console.error(e);
    }
  }
};

const clearHistory = () => {
  history.value = [];
  localStorage.removeItem('color-history');
};

const selectColor = (hexVal: string, shouldSave = true) => {
  if (!hexVal) return;
  setColorFromHex(hexVal, shouldSave);
};

// 快速颜色输入处理
const handleQuickColorInput = () => {
  const input = quickColorInput.value.trim();
  if (!input) {
    quickColorError.value = '';
    return;
  }
  
  let colorHex = '';
  const hexMatch = input.match(/#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/);
  if (hexMatch) {
    colorHex = '#' + hexMatch[1].toUpperCase();
  }
  
  if (colorHex) {
    const rgbObj = hexToRgb(colorHex);
    if (rgbObj) {
      selectColor(colorHex, true);
      quickColorError.value = '';
      quickColorInput.value = '';
    } else {
      quickColorError.value = '无效的颜色格式';
    }
  } else {
    quickColorError.value = '请输入有效的 HEX 颜色，如 #FF9800';
  }
};

const handleQuickColorKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    handleQuickColorInput();
  }
};

// --- Lifecycle ---
onMounted(() => {
  const saved = localStorage.getItem('color-history');
  if (saved) history.value = JSON.parse(saved);
  hexInput.value = hex.value;
});

watch(hex, (newHex) => {
  hexInput.value = newHex;
});

watch(() => ({ ...currentColor.value }), (newVal) => {
  if (isUpdating) return;
  isUpdating = true;
  const rgb = hslToRgb(newVal.h, newVal.s, newVal.l);
  currentRgb.value = { ...rgb, a: newVal.a };
  nextTick(() => {
    isUpdating = false;
  });
}, { deep: true });

watch(() => ({ ...currentRgb.value }), (newVal) => {
  if (isUpdating) return;
  isUpdating = true;
  const hsl = rgbToHsl(newVal.r, newVal.g, newVal.b);
  
  const isGrayscale = newVal.r === newVal.g && newVal.g === newVal.b;
  if (isGrayscale) {
    hsl.h = currentColor.value.h;
    if (newVal.r === 0 || newVal.r === 255) hsl.s = currentColor.value.s;
  }
  
  currentColor.value = { ...hsl, a: newVal.a };
  nextTick(() => {
    isUpdating = false;
  });
}, { deep: true });

</script>

<template>
  <div class="min-h-screen bg-[#E8F4FC] text-slate-900 font-sans selection:bg-indigo-100">
    <main class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <!-- Top Bar with Home Button -->
      <div class="flex items-center mb-4 sm:mb-6">
        <button @click="goHome" class="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" title="返回主页">
          <Home class="w-5 h-5" />
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
        
        <!-- Left Column: Main Preview & Controls -->
        <div class="lg:col-span-5 space-y-4 sm:space-y-6">
          <!-- Quick Color Input Card -->
          <div class="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm">
            <div class="flex items-center justify-between mb-3 sm:mb-4">
              <div class="flex items-center gap-2">
                <Type class="w-4 h-4 text-indigo-500" />
                <h3 class="text-xs sm:text-sm font-bold">快速输入颜色</h3>
              </div>
              <div class="flex items-center gap-1 sm:gap-2">
                <button
                  @click="randomColor"
                  class="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg sm:rounded-xl transition-all"
                  title="随机颜色"
                >
                  <RefreshCw class="w-4 h-4" />
                </button>
                <button
                  v-if="isEyeDropperSupported"
                  @click="pickColor"
                  class="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg sm:rounded-xl transition-all"
                  title="屏幕取色"
                >
                  <Pipette class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div class="flex gap-2 sm:gap-3">
              <div class="flex-1 relative">
                <input
                  type="text"
                  v-model="quickColorInput"
                  @keydown="handleQuickColorKeydown"
                  placeholder="#FF9800"
                  class="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-50 border border-slate-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                />
                <div v-if="quickColorInput" class="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
                  <div
                    class="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg border border-slate-200 shadow-inner"
                    :style="{ backgroundColor: quickColorInput.startsWith('#') ? quickColorInput : '#' + quickColorInput }"
                  ></div>
                </div>
              </div>
              <button
                @click="handleQuickColorInput"
                class="px-3 sm:px-5 py-2.5 sm:py-3 bg-indigo-600 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 sm:gap-2"
              >
                <CheckCircle2 class="w-4 h-4" />
                <span class="hidden sm:inline">应用</span>
              </button>
            </div>
            <p v-if="quickColorError" class="mt-2 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle class="w-3 h-3" />
              {{ quickColorError }}
            </p>
            <p class="mt-2 text-xs text-slate-400 hidden sm:block">
              支持格式：#FF9800、FF9800、#F90
            </p>
          </div>

          <!-- Hero Preview Card -->
          <div class="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div
              class="h-40 sm:h-64 w-full relative flex items-end p-4 sm:p-8 transition-colors duration-500"
              :style="{ backgroundColor: rgbaString }"
            >
              <div class="absolute top-3 sm:top-4 right-3 sm:right-4 flex gap-2">
                <button @click="copyToClipboard(hex)" class="p-1.5 sm:p-2 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-lg sm:rounded-xl transition-all text-white border border-white/20">
                  <Copy class="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              <div class="w-full flex items-center justify-between">
                <div class="flex-1 mr-2 sm:mr-4">
                  <p :class="['text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1 opacity-70', isDark ? 'text-white' : 'text-black']">Current Color</p>
                  <div class="relative group/input">
                    <input
                      type="text"
                      v-model="hexInput"
                      @input="selectColor(hexInput, true)"
                      :class="[
                        'w-full bg-transparent text-2xl sm:text-5xl font-black font-mono tracking-tighter outline-none border-b-2 border-transparent focus:border-current transition-colors',
                        isDark ? 'text-white' : 'text-black'
                      ]"
                      spellcheck="false"
                    />
                    <div :class="['absolute -bottom-1 left-0 w-0 h-0.5 transition-all group-focus-within/input:w-full', isDark ? 'bg-white' : 'bg-black']"></div>
                  </div>
                </div>
                <div :class="['px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold backdrop-blur-md border hidden sm:block', isDark ? 'bg-white/10 text-white border-white/20' : 'bg-black/5 text-black border-black/10']">
                  {{ Math.round(currentColor.h) }}°, {{ Math.round(currentColor.s) }}%, {{ Math.round(currentColor.l) }}%
                </div>
              </div>
            </div>

            <div class="p-4 sm:p-8 space-y-4 sm:space-y-6">
              <!-- HSL Sliders -->
              <div class="space-y-4">
                <div class="space-y-2">
                  <div class="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Hue (色相)</span>
                    <span class="text-slate-900">{{ Math.round(currentColor.h) }}°</span>
                  </div>
                  <input type="range" v-model.number="currentColor.h" min="0" max="360" class="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 hue-slider" />
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Saturation (饱和度)</span>
                    <span class="text-slate-900">{{ Math.round(currentColor.s) }}%</span>
                  </div>
                  <input type="range" v-model.number="currentColor.s" min="0" max="100" class="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>

                <div class="space-y-2">
                  <div class="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Lightness (亮度)</span>
                    <span class="text-slate-900">{{ Math.round(currentColor.l) }}%</span>
                  </div>
                  <input type="range" v-model.number="currentColor.l" min="0" max="100" class="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
              </div>

              <!-- RGBA Sliders -->
              <div class="pt-6 border-t border-slate-100 space-y-4">
                <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RGBA Channels</h3>
                <div class="space-y-3">
                  <div v-for="channel in [
                    { key: 'r', label: 'Red', color: 'bg-red-500', max: 255, step: 1 },
                    { key: 'g', label: 'Green', color: 'bg-green-500', max: 255, step: 1 },
                    { key: 'b', label: 'Blue', color: 'bg-blue-500', max: 255, step: 1 },
                    { key: 'a', label: 'Alpha', color: 'bg-slate-400', max: 1, step: 0.01 }
                  ]" :key="channel.key" class="flex items-center gap-4">
                    <div :class="['w-1 h-8 rounded-full', channel.color]"></div>
                    <div class="flex-1 space-y-1">
                      <div class="flex justify-between text-[10px] font-bold text-slate-500">
                        <span>{{ channel.label }}</span>
                        <span>{{ channel.key === 'a' ? Math.round(currentRgb.a * 100) + '%' : (currentRgb as any)[channel.key] }}</span>
                      </div>
                      <div class="relative h-1.5 w-full">
                        <div :class="['absolute inset-0 rounded-lg', channel.key === 'a' ? 'checkerboard-bg' : 'bg-slate-100']">
                          <div v-if="channel.key === 'a'" class="absolute inset-0 rounded-lg overflow-hidden">
                            <div class="absolute inset-0" :style="{ background: `linear-gradient(to right, transparent, ${hex})` }"></div>
                          </div>
                        </div>
                        <input
                          type="range"
                          v-model.number="(currentRgb as any)[channel.key]"
                          @input="channel.key === 'a' ? (currentColor.a = currentRgb.a) : null"
                          :min="0"
                          :max="channel.max"
                          :step="channel.step"
                          class="absolute inset-0 w-full h-1.5 appearance-none bg-transparent cursor-pointer z-10 custom-slider"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quick Formats -->
              <div class="grid grid-cols-2 gap-3">
                <button @click="copyToClipboard(rgbaString)" class="flex flex-col items-start p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group">
                  <span class="text-[10px] font-bold text-slate-400 uppercase mb-1">RGBA</span>
                  <code class="text-xs font-mono text-slate-700 group-hover:text-indigo-600 truncate w-full">{{ rgbaString }}</code>
                </button>
                <button @click="copyToClipboard(hslString)" class="flex flex-col items-start p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 transition-all group">
                  <span class="text-[10px] font-bold text-slate-400 uppercase mb-1">HSLA</span>
                  <code class="text-xs font-mono text-slate-700 group-hover:text-indigo-600 truncate w-full">{{ hslString }}</code>
                </button>
              </div>
            </div>
          </div>

          <!-- History -->
          <div class="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm">
            <div class="flex items-center justify-between mb-3 sm:mb-4">
              <h3 class="text-xs sm:text-sm font-bold flex items-center gap-2">
                <History class="w-4 h-4 text-slate-400" />
                最近使用
                <span v-if="history.length > 0" class="text-[10px] sm:text-xs text-slate-400 font-normal hidden sm:inline">(点击切换)</span>
              </h3>
              <button v-if="history.length > 0" @click="clearHistory" class="text-[10px] sm:text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                <Trash2 class="w-3 h-3" />
                <span class="hidden sm:inline">清空</span>
              </button>
            </div>
            <div v-if="history.length > 0" class="flex flex-wrap gap-2 sm:gap-3">
              <button
                v-for="hColor in history"
                :key="hColor"
                @click="selectColor(hColor)"
                class="group relative w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 border-white shadow-md hover:scale-110 hover:shadow-lg transition-all"
                :style="{ backgroundColor: hColor }"
                :title="hColor"
              >
                <span class="absolute -bottom-5 sm:-bottom-6 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {{ hColor }}
                </span>
              </button>
            </div>
            <div v-else class="text-center py-6 sm:py-8 text-slate-400">
              <History class="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-20" />
              <p class="text-xs sm:text-sm">暂无历史记录</p>
              <p class="text-[10px] sm:text-xs mt-1 hidden sm:block">使用或复制颜色后会自动保存</p>
            </div>
          </div>
        </div>

        <!-- Right Column: Tools & Analysis -->
        <div class="lg:col-span-7 space-y-4 sm:space-y-6">
          <!-- Tabs -->
          <div class="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="flex border-b border-slate-100 p-1.5 sm:p-2 gap-1">
              <button
                v-for="tab in [
                  { id: 'harmonies', label: '配色', labelFull: '配色方案', icon: Layers },
                  { id: 'shades', label: '明度', labelFull: '明度阶梯', icon: Sun },
                  { id: 'accessibility', label: '检查', labelFull: '无障碍检查', icon: Eye }
                ]"
                :key="tab.id"
                @click="activeTab = tab.id as any"
                :class="['flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all', activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50']"
              >
                <component :is="tab.icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span class="sm:hidden">{{ tab.label }}</span>
                <span class="hidden sm:inline">{{ tab.labelFull }}</span>
              </button>
            </div>

            <div class="p-4 sm:p-8">
              <!-- Harmonies Tab -->
              <div v-if="activeTab === 'harmonies'" class="grid grid-cols-2 gap-2 sm:gap-4">
                <div
                  v-for="harmony in harmonies"
                  :key="harmony.name"
                  class="group relative bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer"
                  @click="copyToClipboard(harmony.hex)"
                >
                  <div class="flex items-center gap-2 sm:gap-4">
                    <div class="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl shadow-inner" :style="{ backgroundColor: harmony.hex }"></div>
                    <div class="min-w-0 flex-1">
                      <p class="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{{ harmony.name }}</p>
                      <p class="text-xs sm:text-sm font-mono font-bold text-slate-700">{{ harmony.hex }}</p>
                    </div>
                  </div>
                  <div class="absolute top-2 sm:top-4 right-2 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Copy class="w-3 h-3 sm:w-4 sm:h-4 text-indigo-500" />
                  </div>
                </div>
              </div>

              <!-- Shades Tab -->
              <div v-if="activeTab === 'shades'" class="space-y-3 sm:space-y-4">
                <div class="flex h-16 sm:h-24 rounded-xl sm:rounded-2xl overflow-hidden shadow-inner border border-slate-100">
                  <button
                    v-for="shade in shades"
                    :key="shade.l"
                    @click="copyToClipboard(shade.hex)"
                    class="flex-1 hover:flex-[1.5] transition-all duration-300 relative group"
                    :style="{ backgroundColor: shade.hex }"
                  >
                    <span class="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" :class="shade.l > 50 ? 'text-black' : 'text-white'">
                      {{ shade.l }}%
                    </span>
                  </button>
                </div>
                <div class="grid grid-cols-5 gap-1 sm:gap-2">
                  <button
                    v-for="shade in shades"
                    :key="'btn-'+shade.l"
                    @click="copyToClipboard(shade.hex)"
                    class="py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-mono font-bold text-slate-500 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-md sm:rounded-lg transition-colors"
                  >
                    {{ shade.hex }}
                  </button>
                </div>
              </div>

              <!-- Accessibility Tab -->
              <div v-if="activeTab === 'accessibility'" class="space-y-4 sm:space-y-8">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  <!-- White Contrast -->
                  <div class="space-y-3 sm:space-y-4">
                    <div class="flex items-center justify-between">
                      <span class="text-xs sm:text-sm font-bold text-slate-600">对比白色</span>
                      <span :class="['px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black', contrastWithWhite >= 4.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                        {{ contrastWithWhite }}:1
                      </span>
                    </div>
                    <div class="p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-100 flex items-center justify-center text-lg sm:text-2xl font-bold" :style="{ backgroundColor: hex, color: '#FFFFFF' }">
                      Aa 示例
                    </div>
                    <div class="flex gap-1.5 sm:gap-2">
                      <div :class="['flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl text-center text-[10px] sm:text-xs font-bold', contrastWithWhite >= 4.5 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400']">
                        AA {{ contrastWithWhite >= 4.5 ? '✓' : '✗' }}
                      </div>
                      <div :class="['flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl text-center text-[10px] sm:text-xs font-bold', contrastWithWhite >= 7 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400']">
                        AAA {{ contrastWithWhite >= 7 ? '✓' : '✗' }}
                      </div>
                    </div>
                  </div>

                  <!-- Black Contrast -->
                  <div class="space-y-3 sm:space-y-4">
                    <div class="flex items-center justify-between">
                      <span class="text-xs sm:text-sm font-bold text-slate-600">对比黑色</span>
                      <span :class="['px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black', contrastWithBlack >= 4.5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
                        {{ contrastWithBlack }}:1
                      </span>
                    </div>
                    <div class="p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-slate-100 flex items-center justify-center text-lg sm:text-2xl font-bold" :style="{ backgroundColor: hex, color: '#000000' }">
                      Aa 示例
                    </div>
                    <div class="flex gap-1.5 sm:gap-2">
                      <div :class="['flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl text-center text-[10px] sm:text-xs font-bold', contrastWithBlack >= 4.5 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400']">
                        AA {{ contrastWithBlack >= 4.5 ? '✓' : '✗' }}
                      </div>
                      <div :class="['flex-1 p-2 sm:p-3 rounded-lg sm:rounded-xl text-center text-[10px] sm:text-xs font-bold', contrastWithBlack >= 7 ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400']">
                        AAA {{ contrastWithBlack >= 7 ? '✓' : '✗' }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="bg-indigo-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex gap-2 sm:gap-3 items-start">
                  <Info class="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p class="text-[10px] sm:text-xs text-indigo-700 leading-relaxed">
                    <strong>WCAG 2.1：</strong> AA 要求对比度 ≥ 4.5:1，AAA 要求 ≥ 7:1
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Export / Info -->
          <div class="bg-indigo-600 rounded-2xl sm:rounded-3xl p-4 sm:p-8 text-white shadow-xl shadow-indigo-200 relative overflow-hidden group">
            <div class="absolute top-0 right-0 -mt-4 -mr-4 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
            <div class="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div class="text-center sm:text-left">
                <h3 class="text-base sm:text-xl font-bold mb-1 sm:mb-2">准备好使用了吗？</h3>
                <p class="text-indigo-100 text-xs sm:text-sm opacity-80">点击上方格式即可快速复制到剪贴板</p>
              </div>
              <div class="flex gap-2 sm:gap-3">
                <button @click="copyToClipboard(`--color-primary: ${hex};`)" class="px-4 sm:px-6 py-2 sm:py-3 bg-white text-indigo-600 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold hover:bg-indigo-50 transition-colors flex items-center gap-1.5 sm:gap-2">
                  <Zap class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  复制 CSS 变量
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Toast Notification -->
    <Transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="showCopied" class="fixed bottom-4 sm:bottom-8 right-4 sm:right-8 left-4 sm:left-auto z-[100]">
        <div class="bg-slate-900 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl flex items-center gap-2 sm:gap-3 border border-slate-800">
          <div class="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
            <Check class="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs sm:text-sm font-bold">已复制到剪贴板</p>
            <p class="text-[10px] sm:text-xs text-slate-400 font-mono truncate">{{ copiedText }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hue-slider {
  background: linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%);
}

.checkerboard-bg {
  background-image: conic-gradient(#e2e8f0 90deg, #fff 90deg 180deg, #e2e8f0 180deg 270deg, #fff 270deg);
  background-size: 8px 8px;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: white;
  border: 3px solid currentColor;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.custom-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: white;
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  margin-top: 0px;
}

.custom-slider:hover::-webkit-slider-thumb {
  border-color: #94a3b8;
  transform: scale(1.1);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
