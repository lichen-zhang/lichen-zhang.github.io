/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_AI_GATEWAY_BASE_URL?: string
    readonly VITE_AI_GATEWAY_API_KEY?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
