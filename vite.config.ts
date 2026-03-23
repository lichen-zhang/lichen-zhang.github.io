import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const defaultProxyTarget = 'https://121.37.42.98'
const defaultProxySecure = false
const proxyTarget = process.env.VITE_BIZ_PROXY_TARGET || defaultProxyTarget
const proxySecure = process.env.VITE_BIZ_PROXY_SECURE
  ? process.env.VITE_BIZ_PROXY_SECURE === 'true'
  : defaultProxySecure

export default defineConfig(() => {
  console.log(`[vite] /api proxy target: ${proxyTarget}, secure: ${proxySecure}`)

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: proxySecure,
        },
      },
    },
  }
})
