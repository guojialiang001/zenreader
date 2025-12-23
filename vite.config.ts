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
          '/api/chat': {
            target: 'https://api.xiaomimimo.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/chat/, '/v1/chat'),
            secure: true
          },
          // Claude API 代理 (avoapi)
          '/api/claude': {
            target: 'https://api.avoapi.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/claude/, '/v1'),
            secure: true
          },
          // MIMO API 代理
          '/api/mimo': {
            target: 'https://api.xiaomimimo.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/mimo/, '/v1'),
            secure: true
          },
          // Claude Opus API 代理 (aiai.li)
          '/api/opus': {
            target: 'https://aiai.li',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/opus/, '/v1'),
            secure: true
          },
          // Gemini API 代理 (claude.chiddns.com)
          '/api/gemini': {
            target: 'https://claude.chiddns.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/gemini/, '/v1'),
            secure: true
          },
          // DeepSeek API 代理 (api.7s.ink)
          '/api/deepseek': {
            target: 'https://api.7s.ink',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/deepseek/, '/v1'),
            secure: true
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
        'process.env.VITE_DS2_TOKEN': JSON.stringify(env.VITE_DS2_TOKEN)
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
