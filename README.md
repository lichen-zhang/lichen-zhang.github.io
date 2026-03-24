# RedNote AI Writer

面向中国市场的小红书 AI 内容生成 SaaS。核心链路：

1. 输入主题/账号类型/风格/长度
2. 生成 10 个选题
3. 选择一个选题生成正文
4. 根据正文生成 10 个标题
5. 保存历史记录
6. 免费额度 + 微信支付订阅

## 项目拆分

当前工作区包含 3 个相关项目：

1. Web 前端（当前目录）
2. 邮箱验证码后端（`email-auth-backend/`）
3. 网关 Worker（线上由 Cloudflare 官网手工维护，不以本仓库源码为准）

对应文档：

- 主项目说明：当前文件
- Cloudflare Worker 线上备份：`../docs/Cloudflare线上Worker备份.md`
- 邮箱后端说明：`../email-auth-backend/README.md`
- 网关 Worker 说明：`../docs/网关服务说明.md`
- 一体化部署操作说明书：`../docs/部署操作手册.md`
- 上线前勾选清单：`../docs/上线核对清单.md`
- 商业研究与增长策略：`../docs/商业研讨报告.md`
- 产品需求说明：`../docs/产品需求说明书.md`

## 技术栈

- Frontend: Vue 3 + Vite + TypeScript + Pinia + Vue Router + TailwindCSS + Axios
- Backend: 独立业务后端 + 邮箱验证码后端
- Gateway: Cloudflare Worker（线上手工维护）
- AI: Kimi（选题/正文/标题）

## 页面路由

- `/` 首页
- `/login` 登录页
- `/dashboard` 主工作台
- `/history` 历史记录页
- `/pricing` 套餐页
- `/account` 账户页

## API

业务后端对外 API（`/api/*`）：

- `POST /api/auth/send-code`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/generate/topics`
- `POST /api/generate/article`
- `POST /api/generate/titles`
- `GET /api/history`
- `GET /api/history/:id`
- `POST /api/payment/create`
- `POST /api/payment/callback`
- `GET /api/orders`

网关 Worker API（`/v1/*`，`api.stackout.work`）：

- `GET /v1/models`
- `POST /v1/chat/completions`

## 数据表

- `users`
- `auth_codes`
- `generations`
- `orders`
- `subscriptions_log`

认证说明：

- 登录改为邮箱验证码。
- 前端请求主站同域 `/api/auth/send-code` 与 `/api/auth/login`。
- `/api/*` 最终由站点入口层或 Cloudflare 线上 Worker 转发到独立业务后端。

## 本地开发

```bash
pnpm install
pnpm dev
```

一键启动联调（前端 + 独立后端 + 本地 SMTP）：

```bash
pnpm run dev:all
```

说明：首次使用请先进入 `../email-auth-backend` 完成依赖安装并按 `../email-auth-backend/README.md` 配置 `.env`。

### Cloudflare 维护说明

- 网关地址已设为：`https://api.stackout.work`
- Cloudflare `worker.js` 以官网登录控制台中的手工版本为准。
- 本仓库不再承载可直接部署的 Worker 源码；仅在 `../docs/Cloudflare线上Worker备份.md` 保留备份。

### 前端直连生成（不走 /api/generate/*）

当前 Dashboard 的“选题/正文/标题生成”已切换为前端直连：

- `POST https://api.stackout.work/v1/chat/completions`
- 不再调用：`/api/generate/topics`、`/api/generate/article`、`/api/generate/titles`

前端需要配置：

```bash
VITE_AI_GATEWAY_BASE_URL=https://api.stackout.work
VITE_BIZ_API_BASE_URL=https://stackout.work/api
```

其中：

- `VITE_AI_GATEWAY_BASE_URL` 仅用于 AI 直连。
- `VITE_BIZ_API_BASE_URL` 用于登录与全部业务接口（`/api/*`），生产建议配置为主站同域 `/api` 入口（例如 `https://stackout.work/api`），再由站点入口层反代到独立业务后端。
- 若未显式配置 `VITE_BIZ_API_BASE_URL`，前端生产构建默认回退为同域 `/api`。

说明：

- 如果你的 `api.stackout.work/v1/chat/completions` 允许无客户端 Key（由 Worker 内部 Secret 处理上游鉴权），前端无需设置 `VITE_AI_GATEWAY_API_KEY`。
- 只有当网关仍启用 `ensureGatewayAuth` 且要求客户端 Bearer Key 时，才需要额外设置 `VITE_AI_GATEWAY_API_KEY`。

## 部署参考

完整部署步骤见：`../docs/部署操作手册.md`

如果要做商业可行性和增长策略评估，见：`../docs/商业研讨报告.md`

## 最小联调脚本

```bash
TEST_EMAIL=you@example.com pnpm run smoke:email-auth
```

- 可选：`WORKER_BASE_URL`（默认 `https://stackout.work/api`）
- 可选：`EMAIL_AUTH_BASE_URL`（默认 `https://mail.stackout.work`）
- 可选：`TEST_CODE`（未提供时会优先使用 send-code 返回的 `debugCode`）
