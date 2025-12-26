/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
 
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // 所有 /api 请求代理到本地后端 8000 端口
          '/api': {
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            secure: false,
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                // 确保流式响应不被缓冲
                proxyReq.setHeader('Connection', 'keep-alive');
              });
            }
          }
        }
      },
      plugins: [vue(), vueJsx()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // SSH配置环境变量
        'process.env.VITE_SSH_DEFAULT_HOST': JSON.stringify(env.VITE_SSH_DEFAULT_HOST),
        'process.env.VITE_SSH_DEFAULT_PORT': JSON.stringify(env.VITE_SSH_DEFAULT_PORT),
        'process.env.VITE_SSH_WEBSOCKET_URL': JSON.stringify(env.VITE_SSH_WEBSOCKET_URL),
        'process.env.VITE_SSH_EXECUTE_URL': JSON.stringify(env.VITE_SSH_EXECUTE_URL),
        // Multi-Model Chat API 配置 (混淆变量名)
        'process.env.VITE_XQ7_ENDPOINT': JSON.stringify(env.VITE_XQ7_ENDPOINT),
        'process.env.VITE_XQ7_TOKEN': JSON.stringify(env.VITE_XQ7_TOKEN),
        'process.env.VITE_MZ3_ENDPOINT': JSON.stringify(env.VITE_MZ3_ENDPOINT),
        'process.env.VITE_MZ3_TOKEN': JSON.stringify(env.VITE_MZ3_TOKEN),
        'process.env.VITE_PK9_ENDPOINT': JSON.stringify(env.VITE_PK9_ENDPOINT),
        'process.env.VITE_PK9_TOKEN': JSON.stringify(env.VITE_PK9_TOKEN),
        'process.env.VITE_GF5_ENDPOINT': JSON.stringify(env.VITE_GF5_ENDPOINT),
        'process.env.VITE_GF5_TOKEN': JSON.stringify(env.VITE_GF5_TOKEN),
        'process.env.VITE_DS2_ENDPOINT': JSON.stringify(env.VITE_DS2_ENDPOINT),
        'process.env.VITE_DS2_TOKEN': JSON.stringify(env.VITE_DS2_TOKEN),
        // MiniMax API 配置
        'process.env.VITE_MM4_ENDPOINT': JSON.stringify(env.VITE_MM4_TOKEN),
        'process.env.VITE_MM4_TOKEN': JSON.stringify(env.VITE_MM4_TOKEN),
        // MiniMax-M2.1 API 配置
        'process.env.VITE_MINIMAX_M21_TOKEN': JSON.stringify(env.VITE_MINIMAX_M21_TOKEN),
        // Code-Relay API 配置 (Opus 备用)
        'process.env.VITE_CODE_RELAY_ENDPOINT': JSON.stringify(env.VITE_CODE_RELAY_ENDPOINT),
        'process.env.VITE_CODE_RELAY_TOKEN': JSON.stringify(env.VITE_CODE_RELAY_TOKEN),
        // Qwen VL API 配置 (Qwen3-VL-32B-Thinking)
        'process.env.VITE_QWEN_VL_TOKEN': JSON.stringify(env.VITE_QWEN_VL_TOKEN)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: false,
        environment: 'node',
        include: ['src/**/*.{test,spec}.{js,ts}'],
      }
    };
});
