/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_AI_GATEWAY_BASE_URL?: string
    readonly VITE_AI_GATEWAY_API_KEY?: string
    readonly VITE_WECHAT_PAY_QR_IMAGE_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
