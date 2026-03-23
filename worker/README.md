# worker (Business API Freeze Guard)

Cloudflare Worker 侧的业务 API 已冻结，`/api/*` 请求统一返回迁移提示，要求改为访问独立业务后端。

## 目录说明

- `index.ts`: 冻结入口（拦截 `/api/*` 并返回 `410 BIZ_API_MOVED`）
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

冻结验证：

```bash
curl -i http://127.0.0.1:8787/api/auth/send-code
```

期望返回：`410` 且 `code=BIZ_API_MOVED`。

## 部署

使用 `wrangler.toml`：

```bash
pnpm wrangler deploy worker.ts
```

说明：业务逻辑真实实现与数据迁移均已迁移至 `biz-backend`，本目录仅保留冻结守卫能力。
