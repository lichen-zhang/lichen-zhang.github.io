
```markdown
# Stackout AI

![Vue](https://img.shields.io/badge/Vue.js-3.x-4FC08D?logo=vue.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwindcss&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers_%26_Pages-F38020?logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

> **A production-grade, secure, and responsive AI chat application built with modern web technologies.**
>
> **Stackout AI** 是一个基于 Vue 3 生态构建的现代化 AI 对话客户端。它采用 Serverless 架构，通过边缘计算解决 API 密钥安全与跨域访问问题，提供媲美原生应用的交互体验。

---

## ✨ Features (核心特性)

- **🎭 Persona System (多角色预设)**: 内置“前端架构师”、“翻译专家”等多种 System Prompts，支持上下文记忆与角色切换。
- **🔒 Secure Architecture (安全架构)**: 采用 **Cloudflare Workers** 作为 BFF (Backend for Frontend) 层，API Key 存储于边缘节点环境变量中，彻底杜绝前端 Key 泄露风险。
- **📝 Rich Text Rendering (富文本渲染)**: 集成 `markdown-it` 与 `highlight.js`，配合 Tailwind Typography，完美支持代码高亮、表格、公式及 Markdown 排版。
- **⚡ High Performance (极致性能)**: 基于 Vite 构建，配合 `pnpm` 依赖管理。深度优化的 VS Code 配置与 ESLint/Prettier 策略，确保开发体验流畅。
- **🎨 Modern UI/UX**: 全深度定制的 Tailwind CSS 深色模式 (Slate/Indigo 主题)，适配移动端侧边栏与桌面端布局。
- **🚀 Global Access**: 支持 Cloudflare 自定义域名 (Custom Domains) 绑定，确保全球（包括国内）直连访问，无惧网络阻断。

---

## 🏗 Architecture (架构设计)

本项目采用了 **Serverless Edge Proxy** 模式，利用 Cloudflare 的边缘能力实现轻量级后端。

```mermaid
graph LR
    User[User / Browser] -->|HTTPS| CF[Cloudflare Custom Domain]
    subgraph Cloudflare Ecosystem
        CF -->|Static Assets| Pages[Cloudflare Pages (Vue 3 Dist)]
        CF -->|/chat/completions| Worker[Cloudflare Worker]
    end
    subgraph External Services
        Worker -->|Auth Injection| DS[DeepSeek API / OpenAI]
    end

```

1. **Static Hosting**: 前端资源托管于 **Cloudflare Pages**，实现全球 CDN 加速。
2. **Edge Worker**: **Cloudflare Workers** 负责请求拦截、CORS 白名单校验及 API Key 注入。
3. **Security**: 前端只负责 UI 交互，不接触敏感凭证；所有鉴权在 Edge 端完成。

---

## 🛠 Tech Stack (技术栈)

* **Core Framework**: Vue 3 (Composition API, `<script setup>`)
* **Language**: TypeScript
* **Styling**: Tailwind CSS v3, PostCSS
* **Build Tool**: Vite
* **Package Manager**: pnpm
* **Utilities**:
* `markdown-it` (Markdown Parser)
* `highlight.js` (Syntax Highlighting)
* `@tailwindcss/typography` (Prose Styling)

* **Infrastructure**: Cloudflare Pages + Workers

---

## 🚀 Getting Started (快速开始)

### Prerequisites

* Node.js >= 18
* pnpm >= 8

### Local Development

1. **Clone the repository**

```bash
git clone [https://github.com/lichen-zhang/stackout-ai.git](https://github.com/lichen-zhang/stackout-ai.git)
cd stackout-ai

```

1. **Install dependencies**

```bash
pnpm install

```

1. **Setup Local Proxy**
Since the backend uses Cloudflare Workers, we use Vite's proxy for local dev. Ensure `vite.config.ts` points to your worker:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/chat': {
      target: '[https://api.stackout.work](https://api.stackout.work)', // Replace with your Worker URL
      changeOrigin: true,
      secure: true,
    }
  }
}

```

1. **Run Development Server**

```bash
pnpm dev

```

---

## 📦 Deployment (部署指南)

### Step 1: Backend (Cloudflare Workers)

Deploy the edge worker to handle API requests securely.

1. Create a Worker in Cloudflare Dashboard.
2. Paste the code from `worker.js` (ensure CORS allows your domains).
3. **Crucial**: Set `DEEPSEEK_API_KEY` in **Settings -> Variables**.
4. Bind your custom domain (e.g., `api.stackout.work`) in **Settings -> Domains & Routes**.

### Step 2: Frontend (Cloudflare Pages)

1. Go to Cloudflare Dashboard -> Workers & Pages -> Create Application -> **Pages**.
2. **Connect to Git** and select this repository.
3. Configure build settings:

* **Framework Preset**: Vue
* **Build command**: `pnpm build`
* **Build output directory**: `dist`

1. Click **Deploy**.
2. Once deployed, go to **Custom domains** and bind your main domain (e.g., `stackout.work`).

---

## 📂 Project Structure

```text
├── .github/              # GitHub Actions workflows (Optional)
├── public/               # Static assets (favicon.svg, manifest)
├── src/
│   ├── assets/           # Global styles & Highlight.js theme
│   ├── components/       # Vue Components
│   ├── App.vue           # Main Application Logic
│   └── main.ts           # App Entry point
├── .vscode/              # Optimized VS Code settings (Performance tuning)
├── index.html            # HTML Entry
├── tailwind.config.js    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite proxy & build config
└── worker.js             # Edge Worker Source Code (Reference)

```

---

## 📄 License

MIT © [Lichen Zhang](https://www.google.com/search?q=https://github.com/lichen-zhang)

```

```
