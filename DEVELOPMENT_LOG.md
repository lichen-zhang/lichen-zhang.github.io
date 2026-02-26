# Stackout AI 任务追踪与日志

## 💡 核心原则
- **不删除原则**：所有任务仅标记状态，不删除记录。
- **自动迭代**：每日结束时，未完成的任务（标记为 `[ ]`）自动顺延至下一日的排期中。
- **状态标记**：
  - `[ ]` 待办 (Pending)
  - `[/]` 进行中 (In Progress)
  - `[√]` 已完成 (Completed)
  - `[-]` 已取消/废弃 (Cancelled)
  - `[>]` 已顺延 (Migrated to next day)

---

## 📅 每日日志与任务排期

### 2026-02-25
- **今日目标**: 启动项目重构，解耦 App.vue；实现「多对话支持」基础能力。
- **任务列表**:
  - [√] [重构] 提取 `useChat` composable 逻辑  
    - 已在 `src/composables/useChat.ts` 中集中管理 personas、消息流、模型切换与流式请求。
  - [√] [重构] 拆分 `Sidebar.vue` 组件  
    - 使用 `props + emits` 与 `App.vue` 通信，仅负责展示与交互，逻辑下沉到 `useChat`。
  - [√] [任务] 增加 Markdown 代码块的“复制”按钮  
    - 在 Markdown 高亮阶段注入复制按钮 DOM，使用 `navigator.clipboard` + 事件委托完成复制反馈。
  - [√] [任务] 调研 Pinia 状态管理接入方案  
    - 结论：后续可新增 `src/stores/chat.ts`，用 Pinia 管理 `messages/currentModel/currentPersona/isSidebarOpen` 等核心状态；`useChat` 只保留 UI 辅助逻辑（滚动、textarea 自适应、请求封装），通过 store actions 发起请求。`main.ts` 中用 `createPinia()` 注册到根实例，实现全局可共享的对话与多页面复用。

- **新增目标（多对话支持）**: 支持左侧多会话列表、会话切换与 IndexedDB 持久化。
- **新增任务（多对话支持）**:
  - [√] [设计] 梳理多会话数据模型（`id/title/createdAt/updatedAt/messages/persona/model`）与状态流转。  
    - 在 `useChat` 中引入 `Conversation` 模型，并增加 `conversations/currentConversationId` 作为核心状态入口。
  - [√] [实现] 封装多会话管理逻辑（新建/重命名/删除/切换），并与 `useChat` 对接。  
    - 提供 `createConversation/switchConversationById/deleteConversationById/renameConversation` 等方法，并在发送首条消息时自动用首行内容生成标题。
  - [√] [实现] 使用 IndexedDB（或封装库）持久化多会话列表和消息历史，包含初始化加载与数据迁移策略。  
    - 新增 `src/utils/chatDb.ts`，使用 IndexedDB 单表存储 `conversations` 数组；在 `useChat` 中通过 `watch(conversations)` 自动写入，并在 `onMounted` 时加载；兼容旧版 `localStorage` 的历史记录迁移。
  - [√] [UI] 扩展左侧 `Sidebar`，展示会话列表（最近会话置顶）和当前会话高亮状态。  
    - `Sidebar` 新增会话列表区和「新建会话」按钮，可点击切换与删除会话，并显示最近更新时间与模型名称。
  - [√] [体验] 补充「清空当前对话」「新建会话」的 UX 文案与确认交互，并验证在移动端的显示效果。  
    - 清空与删除操作均增加确认弹窗；多会话在窄屏下仍通过原有抽層式侧边栏展示，交互保持一致。

### 2026-02-26
- **今日目标**: 实现基础的「角色登录」能力（登录页 + 登录/退出 + 简单权限控制），后端数据落在 Cloudflare D1。
- **任务列表**:
  - [√] [设计] 角色与权限模型  
    - 定义 `AuthRole = 'guest' | 'user' | 'admin'`，并以此区分未登录、普通用户与管理员的能力边界。
  - [√] [实现] 登录状态与用户信息模型  
    - 在 `src/composables/useAuth.ts` 中设计 `AuthUser` 与全局登录态（含 token、role），通过 `localStorage` 持久化，并支持恢复登录状态。
  - [√] [UI] 登录页与退出登录入口  
    - 新增 `LoginModal.vue` 作为登录弹窗，在 `Sidebar` 底部展示当前用户与角色信息，并提供「登录 / 退出」入口。
  - [√] [实现] 与 Cloudflare D1 的交互约定  
    - 在 `useAuth` 中约定调用 `POST https://api.stackout.work/api/auth/login`，请求体为 `{ username, password }`，响应为 `{ token, user: { id, username, displayName, role } }`，与 D1 `users` 表结构对齐。
  - [√] [集成] 聊天与配置中的权限控制  
    - 在 `App.vue` 中基于 `role` 控制模型切换（仅 admin 可用），限制会话删除操作（需登录为 user/admin），未满足条件时给出友好提示。
  
---

## 🚀 长期重构想法 (Ideas Pool)
*这些是尚未排期的想法，成熟后移动到具体日期下。*
1. **角色登录**：增加登录页，支持登录，退出登录，暂时不支持注册，登录用户信息保存在Cloudflare D1。
2. **多模型适配**：增加 GPT-4 / Claude 3 等模型的配置界面。
3. **PWA 适配**：让项目可以像原生 App 一样安装。