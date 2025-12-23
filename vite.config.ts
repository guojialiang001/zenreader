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
          // Claude Opus Backup API 代理 (cifang.xyz) - 必须放在 /api/opus 之前！
          '/api/opus-backup': {
            target: 'https://cifang.xyz',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/opus-backup/, '/v1'),
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
          // DeepSeek API 代理 (aicodelink.top)
          '/api/deepseek': {
            target: 'https://aicodelink.top',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/deepseek/, '/v1'),
            secure: true,
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                // 确保流式响应不被缓冲
                proxyReq.setHeader('Connection', 'keep-alive');
              });
            }
          },
          // Claude Sonnet Backup API 代理 (aicodelink.top) - 必须放在 /api/sonnet 之前！
          '/api/sonnet-backup': {
            target: 'https://cifang.xyz',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/sonnet-backup/, '/v1'),
            secure: true
          },
          // Claude Sonnet API 代理 (aiai.li)
          '/api/sonnet': {
            target: 'https://aiai.li',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/sonnet/, '/v1'),
            secure: true
          },
          // MiniMax API 代理 (aicodelink.top)
          '/api/minimax': {
            target: 'https://aicodelink.top',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/minimax/, '/v1'),
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
        'process.env.VITE_DS2_TOKEN': JSON.stringify(env.VITE_DS2_TOKEN),
        // MiniMax API 配置
        'process.env.VITE_MM4_ENDPOINT': JSON.stringify(env.VITE_MM4_TOKEN),
        'process.env.VITE_MM4_TOKEN': JSON.stringify(env.VITE_MM4_TOKEN)
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
