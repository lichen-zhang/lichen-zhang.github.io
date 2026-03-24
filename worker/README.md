# worker (Business API Reverse Proxy)

Cloudflare Worker 作为主站 `stackout.work` 的业务 API 转发层，统一将 `/api/*` 代理到独立业务后端。

## 目录说明

- `index.ts`: `/api/*` 代理入口（转发到 `BIZ_API_BASE_URL`）
- `utils/`: 公共响应与 CORS 工具

## 关键环境变量

- `BIZ_API_BASE_URL`
- `ALLOWED_ORIGINS`

## 本地运行

在仓库根目录：

```bash
pnpm install
pnpm wrangler d1 execute xhs-writer-db --local --file=schema.sql
pnpm dev:worker
```

代理验证：

```bash
curl -i http://127.0.0.1:8787/api/health
```

期望返回：上游 biz-backend 的真实响应。

## 部署

使用 `wrangler.toml`：

```bash
pnpm wrangler deploy worker.ts
```

说明：业务逻辑真实实现与数据存储仍在 `biz-backend`，本目录只负责主站同域 `/api/*` 转发与边缘层 CORS 处理。
