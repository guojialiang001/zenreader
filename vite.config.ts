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
        'process.env.VITE_SSH_EXECUTE_URL': JSON.stringify(env.VITE_SSH_EXECUTE_URL)
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
