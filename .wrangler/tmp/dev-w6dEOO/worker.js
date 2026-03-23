var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/utils/http.ts
var HttpError = class extends Error {
  static {
    __name(this, "HttpError");
  }
  status;
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const envOrigins = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const allowList = ["http://localhost:5173", "http://127.0.0.1:5173", ...envOrigins];
  let allowOrigin = "*";
  if (origin) {
    allowOrigin = allowList.includes(origin) ? origin : allowList[0] || "*";
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Wechat-Sign"
  };
}
__name(buildCorsHeaders, "buildCorsHeaders");
function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
__name(json, "json");
async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "\u8BF7\u6C42\u4F53\u5FC5\u987B\u662F\u5408\u6CD5 JSON");
  }
}
__name(parseJson, "parseJson");
function parsePageParams(url) {
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || "20");
  const pageSize = Math.min(50, Math.max(1, pageSizeRaw));
  return { page, pageSize };
}
__name(parsePageParams, "parsePageParams");

// worker/utils/id.ts
function createId() {
  return crypto.randomUUID();
}
__name(createId, "createId");
function createWxOrderNo() {
  const suffix = Math.floor(Math.random() * 1e6).toString().padStart(6, "0");
  return `WX${Date.now()}${suffix}`;
}
__name(createWxOrderNo, "createWxOrderNo");

// worker/utils/time.ts
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function isSameUtcDay(a, b = /* @__PURE__ */ new Date()) {
  if (!a) return false;
  const dt = new Date(a);
  return dt.getUTCFullYear() === b.getUTCFullYear() && dt.getUTCMonth() === b.getUTCMonth() && dt.getUTCDate() === b.getUTCDate();
}
__name(isSameUtcDay, "isSameUtcDay");
function addDaysISO(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1e3).toISOString();
}
__name(addDaysISO, "addDaysISO");

// worker/repositories/userRepo.ts
var UserRepository = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "UserRepository");
  }
  async findById(userId) {
    return this.db.prepare(
      "SELECT id, email, phone, nickname, avatar, status, plan_type, plan_expire_at, quota_left, last_quota_reset_at, created_at, updated_at FROM users WHERE id = ?"
    ).bind(userId).first();
  }
  async findByEmail(email) {
    return this.db.prepare(
      "SELECT id, email, phone, nickname, avatar, status, plan_type, plan_expire_at, quota_left, last_quota_reset_at, created_at, updated_at FROM users WHERE email = ?"
    ).bind(email).first();
  }
  async findByPhone(phone) {
    return this.db.prepare(
      "SELECT id, email, phone, nickname, avatar, status, plan_type, plan_expire_at, quota_left, last_quota_reset_at, created_at, updated_at FROM users WHERE phone = ?"
    ).bind(phone).first();
  }
  async createByEmail(email) {
    const id = createId();
    const now = nowIso();
    await this.db.prepare(
      "INSERT INTO users (id, email, status, plan_type, quota_left, last_quota_reset_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, email, "active", "free", 3, now, now, now).run();
    return await this.findById(id);
  }
  async createByPhone(phone) {
    const id = createId();
    const now = nowIso();
    await this.db.prepare(
      "INSERT INTO users (id, phone, status, plan_type, quota_left, last_quota_reset_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, phone, "active", "free", 3, now, now, now).run();
    return await this.findById(id);
  }
  async updateQuota(userId, quotaLeft, lastQuotaResetAt) {
    await this.db.prepare("UPDATE users SET quota_left = ?, last_quota_reset_at = ?, updated_at = ? WHERE id = ?").bind(quotaLeft, lastQuotaResetAt, nowIso(), userId).run();
  }
  async updatePlan(userId, planType, planExpireAt, quotaLeft) {
    await this.db.prepare("UPDATE users SET plan_type = ?, plan_expire_at = ?, quota_left = ?, updated_at = ? WHERE id = ?").bind(planType, planExpireAt, quotaLeft, nowIso(), userId).run();
  }
};

// worker/utils/jwt.ts
function toBase64Url(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(toBase64Url, "toBase64Url");
function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(padded);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
__name(fromBase64Url, "fromBase64Url");
async function signJwt(payload, secret) {
  const encoder = new TextEncoder();
  const header = toBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = toBase64Url(
    encoder.encode(
      JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 7
      })
    )
  );
  const payloadText = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payloadText)));
  return `${payloadText}.${toBase64Url(signature)}`;
}
__name(signJwt, "signJwt");
async function verifyJwt(token, secret) {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const encoder = new TextEncoder();
    const signInput = `${header}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify("HMAC", key, fromBase64Url(signature), encoder.encode(signInput));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (Number(payload.exp || 0) < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}
__name(verifyJwt, "verifyJwt");

// worker/utils/validator.ts
function requireEmail(email) {
  const value = (email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new HttpError(400, "\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E");
  }
  return value;
}
__name(requireEmail, "requireEmail");
function requireText(value, fieldName) {
  const text = (value || "").trim();
  if (!text) {
    throw new HttpError(400, `${fieldName} \u4E0D\u80FD\u4E3A\u7A7A`);
  }
  return text;
}
__name(requireText, "requireText");

// worker/services/quotaService.ts
var FREE_DAILY_QUOTA = 3;
var QuotaService = class {
  constructor(userRepo) {
    this.userRepo = userRepo;
  }
  static {
    __name(this, "QuotaService");
  }
  isPaidActive(user) {
    return user.plan_type === "pro" && !!user.plan_expire_at && new Date(user.plan_expire_at).getTime() > Date.now();
  }
  async refreshUser(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new HttpError(401, "\u7528\u6237\u4E0D\u5B58\u5728");
    if (user.status !== "active") throw new HttpError(403, "\u7528\u6237\u72B6\u6001\u4E0D\u53EF\u7528");
    if (user.plan_type === "pro" && user.plan_expire_at && new Date(user.plan_expire_at).getTime() <= Date.now()) {
      await this.userRepo.updatePlan(user.id, "free", null, FREE_DAILY_QUOTA);
      await this.userRepo.updateQuota(user.id, FREE_DAILY_QUOTA, nowIso());
      return await this.userRepo.findById(user.id);
    }
    if (this.isPaidActive(user)) {
      if (user.quota_left !== -1) {
        await this.userRepo.updateQuota(user.id, -1, user.last_quota_reset_at);
      }
      return await this.userRepo.findById(user.id) || user;
    }
    if (!isSameUtcDay(user.last_quota_reset_at)) {
      await this.userRepo.updateQuota(user.id, FREE_DAILY_QUOTA, nowIso());
      return await this.userRepo.findById(user.id);
    }
    return user;
  }
  async consumeTopicQuota(user) {
    const latest = await this.refreshUser(user.id);
    if (latest.plan_type === "pro") return latest;
    if (latest.quota_left <= 0) {
      throw new HttpError(429, "\u4ECA\u65E5\u514D\u8D39\u989D\u5EA6\u5DF2\u7528\u5B8C\uFF0C\u8BF7\u524D\u5F80\u5957\u9910\u9875\u5347\u7EA7");
    }
    await this.userRepo.updateQuota(latest.id, latest.quota_left - 1, latest.last_quota_reset_at || nowIso());
    return await this.userRepo.findById(latest.id);
  }
  async ensureCanUseWorkflow(user) {
    const latest = await this.refreshUser(user.id);
    if (latest.plan_type === "pro") return latest;
    if (latest.quota_left <= 0) {
      throw new HttpError(429, "\u4ECA\u65E5\u514D\u8D39\u989D\u5EA6\u5DF2\u7528\u5B8C\uFF0C\u8BF7\u5148\u5347\u7EA7\u540E\u7EE7\u7EED\u751F\u6210");
    }
    return latest;
  }
};

// worker/services/authService.ts
var emailAuthCircuits = /* @__PURE__ */ new Map();
var AuthService = class {
  constructor(env) {
    this.env = env;
    this.userRepo = new UserRepository(env.DB);
    this.quotaService = new QuotaService(this.userRepo);
  }
  static {
    __name(this, "AuthService");
  }
  userRepo;
  quotaService;
  jwtSecret() {
    return this.env.JWT_SECRET || "rednote-ai-writer";
  }
  emailAuthBaseUrl() {
    const value = (this.env.EMAIL_AUTH_BASE_URL || "").trim();
    if (!value) {
      throw new HttpError(500, "\u672A\u914D\u7F6E EMAIL_AUTH_BASE_URL");
    }
    return value.replace(/\/$/, "");
  }
  async delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
  emailAuthMaxAttempts() {
    const value = Number(this.env.EMAIL_AUTH_MAX_ATTEMPTS || 3);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 3;
  }
  emailAuthTimeoutMs() {
    const value = Number(this.env.EMAIL_AUTH_TIMEOUT_MS || 5e3);
    return Number.isFinite(value) && value >= 500 ? Math.floor(value) : 5e3;
  }
  emailAuthRetryBaseDelayMs() {
    const value = Number(this.env.EMAIL_AUTH_RETRY_BASE_DELAY_MS || 150);
    return Number.isFinite(value) && value >= 10 ? Math.floor(value) : 150;
  }
  emailAuthCircuitFailureThreshold() {
    const value = Number(this.env.EMAIL_AUTH_CIRCUIT_FAILURE_THRESHOLD || 5);
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 5;
  }
  emailAuthCircuitOpenMs() {
    const value = Number(this.env.EMAIL_AUTH_CIRCUIT_OPEN_MS || 3e4);
    return Number.isFinite(value) && value >= 1e3 ? Math.floor(value) : 3e4;
  }
  circuitState(path) {
    const key = path.trim().toLowerCase() || "/";
    let state = emailAuthCircuits.get(key);
    if (!state) {
      state = {
        status: "closed",
        failures: 0,
        openedUntil: 0,
        halfOpenProbeInFlight: false
      };
      emailAuthCircuits.set(key, state);
    }
    return state;
  }
  beginCircuit(path) {
    const state = this.circuitState(path);
    const now = Date.now();
    if (state.status === "open") {
      if (state.openedUntil > now) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((state.openedUntil - now) / 1e3))
        };
      }
      state.status = "half-open";
      state.halfOpenProbeInFlight = false;
      state.failures = 0;
    }
    if (state.status === "half-open") {
      if (state.halfOpenProbeInFlight) {
        return { allowed: false, retryAfterSeconds: 1 };
      }
      state.halfOpenProbeInFlight = true;
      return { allowed: true };
    }
    return { allowed: true };
  }
  recordCircuitSuccess(path) {
    const state = this.circuitState(path);
    state.status = "closed";
    state.failures = 0;
    state.openedUntil = 0;
    state.halfOpenProbeInFlight = false;
  }
  recordCircuitNeutral(path) {
    const state = this.circuitState(path);
    if (state.status === "half-open") {
      state.status = "closed";
      state.failures = 0;
      state.openedUntil = 0;
    }
    state.halfOpenProbeInFlight = false;
  }
  recordCircuitFailure(path) {
    const state = this.circuitState(path);
    const now = Date.now();
    if (state.status === "half-open") {
      state.status = "open";
      state.failures = 0;
      state.openedUntil = now + this.emailAuthCircuitOpenMs();
      state.halfOpenProbeInFlight = false;
      return;
    }
    state.failures += 1;
    if (state.failures >= this.emailAuthCircuitFailureThreshold()) {
      state.status = "open";
      state.failures = 0;
      state.openedUntil = now + this.emailAuthCircuitOpenMs();
    }
    state.halfOpenProbeInFlight = false;
  }
  shouldRetryStatus(status) {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }
  isLikelyNetworkError(error) {
    if (!(error instanceof Error)) return false;
    if (error.name === "AbortError") return true;
    const message = error.message.toLowerCase();
    return message.includes("network") || message.includes("fetch") || message.includes("timeout");
  }
  extractClientIp(request) {
    if (!request) return "";
    const forwardedFor = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "";
    if (forwardedFor.includes(",")) {
      return forwardedFor.split(",")[0]?.trim() || "";
    }
    return forwardedFor.trim();
  }
  isExposeDevCodeEnabled() {
    return String(this.env.EXPOSE_DEV_CODE || "").toLowerCase() === "true";
  }
  async callEmailAuth(path, body, headers = {}) {
    const maxAttempts = this.emailAuthMaxAttempts();
    const timeoutMs = this.emailAuthTimeoutMs();
    const retryBaseDelayMs = this.emailAuthRetryBaseDelayMs();
    const circuitGate = this.beginCircuit(path);
    if (!circuitGate.allowed) {
      throw new HttpError(503, `\u90AE\u7BB1\u670D\u52A1\u77ED\u6682\u7194\u65AD\uFF0C\u8BF7\u5728 ${circuitGate.retryAfterSeconds} \u79D2\u540E\u91CD\u8BD5`);
    }
    let lastError = null;
    let upstreamFailure = false;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(`${this.emailAuthBaseUrl()}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        const payload = await resp.json().catch(() => ({}));
        if (resp.ok) {
          this.recordCircuitSuccess(path);
          return payload;
        }
        const message = typeof payload.message === "string" ? payload.message : "\u90AE\u7BB1\u670D\u52A1\u8BF7\u6C42\u5931\u8D25";
        const err = new HttpError(resp.status, message);
        const canRetry = this.shouldRetryStatus(resp.status) && attempt < maxAttempts;
        if (!canRetry) {
          if (this.shouldRetryStatus(resp.status) || resp.status >= 500) {
            upstreamFailure = true;
            this.recordCircuitFailure(path);
          } else {
            this.recordCircuitNeutral(path);
          }
          throw err;
        }
        upstreamFailure = true;
        lastError = err;
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        upstreamFailure = true;
        lastError = error instanceof Error ? error : new Error("\u90AE\u7BB1\u670D\u52A1\u7F51\u7EDC\u5F02\u5E38");
      } finally {
        clearTimeout(timer);
      }
      if (attempt < maxAttempts) {
        const jitter = Math.floor(Math.random() * 40);
        await this.delay(retryBaseDelayMs * 2 ** (attempt - 1) + jitter);
      }
    }
    if (upstreamFailure) {
      this.recordCircuitFailure(path);
    } else {
      this.recordCircuitNeutral(path);
    }
    const finalMessage = lastError instanceof Error ? lastError.message : "\u90AE\u7BB1\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528";
    throw new HttpError(502, this.isLikelyNetworkError(lastError) ? "\u90AE\u7BB1\u670D\u52A1\u7F51\u7EDC\u6CE2\u52A8\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" : finalMessage);
  }
  async sendCode(body, request) {
    const email = requireEmail(body.email);
    const clientIp = this.extractClientIp(request);
    const userAgent = request?.headers.get("user-agent") || "";
    const payload = await this.callEmailAuth(
      "/api/auth/email-code/send",
      {
        email,
        behaviorStartedAt: typeof body.behaviorStartedAt === "number" ? body.behaviorStartedAt : void 0,
        behaviorSubmitAt: typeof body.behaviorSubmitAt === "number" ? body.behaviorSubmitAt : Date.now(),
        website: typeof body.website === "string" ? body.website : ""
      },
      {
        ...clientIp ? { "x-forwarded-for": clientIp } : {},
        ...userAgent ? { "user-agent": userAgent } : {},
        "x-worker-request-id": crypto.randomUUID()
      }
    );
    return {
      success: true,
      cooldownSeconds: typeof payload.cooldownSeconds === "number" ? payload.cooldownSeconds : void 0,
      expireSeconds: typeof payload.expireSeconds === "number" ? payload.expireSeconds : void 0,
      debugCode: this.isExposeDevCodeEnabled() && typeof payload.debugCode === "string" ? payload.debugCode : void 0
    };
  }
  async login(body) {
    const email = requireEmail(body.email);
    const code = requireText(body.code, "code");
    await this.callEmailAuth("/api/auth/email-code/verify", { email, code });
    let user = await this.userRepo.findByEmail(email);
    if (!user) {
      user = await this.userRepo.createByEmail(email);
    }
    const latestUser = await this.quotaService.refreshUser(user.id);
    const token = await signJwt({ userId: latestUser.id, email: latestUser.email, iat: Math.floor(Date.now() / 1e3) }, this.jwtSecret());
    return { token, user: latestUser };
  }
  async getUserFromToken(token) {
    const payload = await verifyJwt(token, this.jwtSecret());
    if (!payload || typeof payload.userId !== "string") {
      throw new HttpError(401, "\u767B\u5F55\u72B6\u6001\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55");
    }
    const user = await this.quotaService.refreshUser(payload.userId);
    return user;
  }
  async me(userId) {
    const user = await this.quotaService.refreshUser(userId);
    return user;
  }
};

// worker/repositories/generationRepo.ts
var GenerationRepository = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "GenerationRepository");
  }
  async create(params) {
    const id = createId();
    const createdAt = nowIso();
    await this.db.prepare(
      "INSERT INTO generations (id, user_id, type, input_payload, output_payload, model_name, prompt_version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
      id,
      params.userId,
      params.type,
      JSON.stringify(params.inputPayload),
      JSON.stringify(params.outputPayload),
      params.modelName,
      params.promptVersion,
      createdAt
    ).run();
    return {
      id,
      user_id: params.userId,
      type: params.type,
      input_payload: JSON.stringify(params.inputPayload),
      output_payload: JSON.stringify(params.outputPayload),
      model_name: params.modelName,
      prompt_version: params.promptVersion,
      created_at: createdAt
    };
  }
  async countTodayTopics(userId) {
    const row = await this.db.prepare(
      "SELECT COUNT(*) as cnt FROM generations WHERE user_id = ? AND type = 'topics' AND date(created_at) = date('now')"
    ).bind(userId).first();
    return Number(row?.cnt || 0);
  }
  async listByUser(userId, query) {
    const where = ["user_id = ?"];
    const values = [userId];
    if (query.type) {
      where.push("type = ?");
      values.push(query.type);
    }
    const whereSql = where.join(" AND ");
    const offset = (query.page - 1) * query.pageSize;
    const totalRow = await this.db.prepare(`SELECT COUNT(*) as total FROM generations WHERE ${whereSql}`).bind(...values).first();
    const result = await this.db.prepare(
      `SELECT id, user_id, type, input_payload, output_payload, model_name, prompt_version, created_at
         FROM generations
         WHERE ${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
    ).bind(...values, query.pageSize, offset).all();
    return {
      items: result.results || [],
      total: Number(totalRow?.total || 0)
    };
  }
  async findById(userId, id) {
    return this.db.prepare(
      "SELECT id, user_id, type, input_payload, output_payload, model_name, prompt_version, created_at FROM generations WHERE user_id = ? AND id = ? LIMIT 1"
    ).bind(userId, id).first();
  }
  async hasTopicWorkflow(userId, workflowId) {
    const row = await this.db.prepare(
      "SELECT COUNT(*) as cnt FROM generations WHERE user_id = ? AND type = 'topics' AND json_extract(input_payload, '$.workflowId') = ?"
    ).bind(userId, workflowId).first();
    return Number(row?.cnt || 0) > 0;
  }
  async latestCreatedAt(userId) {
    const row = await this.db.prepare("SELECT created_at FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").bind(userId).first();
    return row?.created_at || null;
  }
};

// worker/services/promptService.ts
var TOPIC_PROMPT_VERSION = "v1.0.0";
var ARTICLE_PROMPT_VERSION = "v1.0.0";
var TITLE_PROMPT_VERSION = "v1.0.0";
function buildTopicPrompt(input) {
  const system = `\u4F60\u662F\u4E00\u4F4D\u61C2\u5C0F\u7EA2\u4E66\u5185\u5BB9\u8FD0\u8425\u7684\u4E2D\u6587\u6587\u6848\u4E13\u5BB6\u3002
\u8BF7\u56F4\u7ED5\u7ED9\u5B9A\u4E3B\u9898\uFF0C\u4E3A\u6307\u5B9A\u8D26\u53F7\u7C7B\u578B\u751F\u6210 10 \u4E2A\u9002\u5408\u5C0F\u7EA2\u4E66\u53D1\u5E03\u7684\u9009\u9898\u3002

\u8981\u6C42\uFF1A
1. \u8D34\u8FD1\u771F\u5B9E\u535A\u4E3B\u4F1A\u53D1\u7684\u98CE\u683C
2. \u4E0D\u8981\u5199\u6210\u65B0\u95FB\u6807\u9898
3. \u4E0D\u8981\u51FA\u73B0\u5938\u5F20\u8FDD\u89C4\u8BCD
4. \u5C3D\u91CF\u63D0\u9AD8\u70B9\u51FB\u6B32\uFF0C\u4F46\u4E0D\u8981\u4F4E\u8D28
5. \u8F93\u51FA\u5FC5\u987B\u662F JSON \u6570\u7EC4\uFF0C\u6BCF\u4E2A\u5143\u7D20\u662F\u4E00\u6761\u5B8C\u6574\u6807\u9898`;
  const user = `\u4E3B\u9898\uFF1A${input.topic}
\u8D26\u53F7\u7C7B\u578B\uFF1A${input.accountType || "\u901A\u7528"}
\u98CE\u683C\uFF1A${input.style}
\u957F\u5EA6\u504F\u597D\uFF1A${input.length}`;
  return { system, user, version: TOPIC_PROMPT_VERSION };
}
__name(buildTopicPrompt, "buildTopicPrompt");
function buildArticlePrompt(input) {
  const system = `\u4F60\u662F\u4E00\u4F4D\u8D44\u6DF1\u7684\u5C0F\u7EA2\u4E66\u4E2D\u6587\u5185\u5BB9\u4F5C\u8005\u3002
\u8BF7\u6839\u636E\u7ED9\u5B9A\u9009\u9898\u5199\u4E00\u7BC7\u53EF\u76F4\u63A5\u53D1\u5E03\u7684\u5C0F\u7EA2\u4E66\u7B14\u8BB0\u3002

\u8981\u6C42\uFF1A
1. \u8BED\u6C14\u50CF\u771F\u5B9E\u535A\u4E3B\uFF0C\u771F\u8BDA\u81EA\u7136
2. \u591A\u7528\u77ED\u6BB5\u843D\uFF0C\u9002\u5408\u79FB\u52A8\u7AEF\u9605\u8BFB
3. \u53EF\u4EE5\u5C11\u91CF\u4F7F\u7528 emoji\uFF0C\u4F46\u4E0D\u8981\u8FC7\u591A
4. \u4E0D\u8981\u5199\u6210\u5E7F\u544A\uFF0C\u4E0D\u8981\u751F\u786C\u5E26\u8D27
5. \u7ED3\u5C3E\u53EF\u4EE5\u5E26\u4E00\u53E5\u81EA\u7136\u4E92\u52A8
6. \u8F93\u51FA\u7EAF\u6B63\u6587\uFF0C\u4E0D\u8981\u89E3\u91CA`;
  const user = `\u4E3B\u9898\uFF1A${input.topic}
\u8D26\u53F7\u7C7B\u578B\uFF1A${input.accountType || "\u901A\u7528"}
\u98CE\u683C\uFF1A${input.style}
\u957F\u5EA6\uFF1A${input.length}
\u9009\u9898\uFF1A${input.selectedTopic}`;
  return { system, user, version: ARTICLE_PROMPT_VERSION };
}
__name(buildArticlePrompt, "buildArticlePrompt");
function buildTitlePrompt(input) {
  const system = `\u8BF7\u57FA\u4E8E\u4E0B\u65B9\u5C0F\u7EA2\u4E66\u6B63\u6587\uFF0C\u751F\u6210 10 \u4E2A\u9002\u5408\u53D1\u5E03\u7684\u5C0F\u7EA2\u4E66\u6807\u9898\u3002

\u8981\u6C42\uFF1A
1. \u4E2D\u6587
2. \u98CE\u683C\u81EA\u7136\uFF0C\u50CF\u771F\u5B9E\u535A\u4E3B
3. \u907F\u514D\u8FDD\u89C4\u8BCD\u548C\u8FC7\u5EA6\u8425\u9500\u8868\u8FBE
4. \u8F93\u51FA JSON \u6570\u7EC4`;
  const user = `\u4E3B\u9898\uFF1A${input.topic || "\u672A\u6307\u5B9A"}
\u98CE\u683C\uFF1A${input.style || "\u672A\u6307\u5B9A"}
\u6B63\u6587\uFF1A
${input.article}`;
  return { system, user, version: TITLE_PROMPT_VERSION };
}
__name(buildTitlePrompt, "buildTitlePrompt");

// worker/services/aiService.ts
function providerConfig(env) {
  return {
    url: env.KIMI_API_URL || "https://api.moonshot.cn/v1/chat/completions",
    apiKey: env.KIMI_API_KEY,
    model: env.KIMI_MODEL || "moonshot-v1-8k"
  };
}
__name(providerConfig, "providerConfig");
async function callChatModel(env, _provider, prompt) {
  const gatewayUrl = env.AI_GATEWAY_BASE_URL?.trim();
  const provider = "kimi";
  const config = providerConfig(env);
  let response;
  if (gatewayUrl) {
    response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...env.AI_GATEWAY_API_KEY ? { Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}` } : {}
      },
      body: JSON.stringify({
        provider,
        model: config.model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ]
      })
    });
  } else {
    if (!config.apiKey) {
      throw new HttpError(500, `${provider} API Key \u672A\u914D\u7F6E`);
    }
    response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.8,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ]
      })
    });
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(502, `${provider} \u8C03\u7528\u5931\u8D25: ${errorText.slice(0, 300)}`);
  }
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() || data.data?.content?.trim() || data.content?.trim() || data.text?.trim();
  if (!text) throw new HttpError(502, `${provider} \u8FD4\u56DE\u5185\u5BB9\u4E3A\u7A7A`);
  return {
    text,
    modelName: `${provider}:${config.model}`
  };
}
__name(callChatModel, "callChatModel");
function parseJsonStringArray(raw, max = 10) {
  const normalized = raw.trim();
  try {
    const arr = JSON.parse(normalized);
    if (Array.isArray(arr)) {
      return arr.map((item) => String(item).trim()).filter(Boolean).slice(0, max);
    }
  } catch {
  }
  const match = normalized.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) {
        return arr.map((item) => String(item).trim()).filter(Boolean).slice(0, max);
      }
    } catch {
    }
  }
  return normalized.split("\n").map((line) => line.replace(/^\s*[\d]+[.)、\s-]*/g, "").replace(/^\s*[-*]\s*/g, "").trim()).filter(Boolean).slice(0, max);
}
__name(parseJsonStringArray, "parseJsonStringArray");

// worker/services/generationService.ts
var GenerationService = class {
  constructor(env) {
    this.env = env;
    this.generationRepo = new GenerationRepository(env.DB);
    this.quotaService = new QuotaService(new UserRepository(env.DB));
  }
  static {
    __name(this, "GenerationService");
  }
  generationRepo;
  quotaService;
  async enforceRateLimit(userId) {
    const latest = await this.generationRepo.latestCreatedAt(userId);
    if (!latest) return;
    const diff = Date.now() - new Date(latest).getTime();
    if (diff < 1500) {
      throw new HttpError(429, "\u8BF7\u6C42\u8FC7\u4E8E\u9891\u7E41\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
    }
  }
  async generateTopics(user, body) {
    const topic = requireText(body.topic, "topic");
    const style = requireText(body.style, "style");
    const length = requireText(body.length, "length");
    await this.enforceRateLimit(user.id);
    const currentUser = await this.quotaService.consumeTopicQuota(user);
    const workflowId = createId();
    const prompt = buildTopicPrompt({
      topic,
      accountType: body.accountType,
      style,
      length
    });
    const aiResult = await callChatModel(this.env, "kimi", prompt);
    const topics = parseJsonStringArray(aiResult.text, 10);
    if (topics.length === 0) {
      throw new HttpError(502, "\u6A21\u578B\u672A\u8FD4\u56DE\u6709\u6548\u9009\u9898");
    }
    await this.generationRepo.create({
      userId: currentUser.id,
      type: "topics",
      inputPayload: { topic, accountType: body.accountType || "", style, length, workflowId },
      outputPayload: { topics },
      modelName: aiResult.modelName,
      promptVersion: prompt.version
    });
    return {
      topics,
      workflowId,
      quotaLeft: currentUser.quota_left
    };
  }
  async generateArticle(user, body) {
    const selectedTopic = requireText(body.selectedTopic, "selectedTopic");
    const topic = requireText(body.topic, "topic");
    const style = requireText(body.style, "style");
    const length = requireText(body.length, "length");
    await this.enforceRateLimit(user.id);
    await this.quotaService.ensureCanUseWorkflow(user);
    if (user.plan_type !== "pro") {
      const workflowId = requireText(body.workflowId, "workflowId");
      const exists = await this.generationRepo.hasTopicWorkflow(user.id, workflowId);
      if (!exists) {
        throw new HttpError(403, "\u8BF7\u5148\u5B8C\u6210\u9009\u9898\u751F\u6210\uFF0C\u518D\u751F\u6210\u6B63\u6587");
      }
    }
    const prompt = buildArticlePrompt({
      workflowId: body.workflowId,
      selectedTopic,
      topic,
      accountType: body.accountType,
      style,
      length
    });
    const aiResult = await callChatModel(this.env, "kimi", prompt);
    const article = aiResult.text.trim();
    await this.generationRepo.create({
      userId: user.id,
      type: "article",
      inputPayload: {
        workflowId: body.workflowId || null,
        selectedTopic,
        topic,
        accountType: body.accountType || "",
        style,
        length
      },
      outputPayload: { article },
      modelName: aiResult.modelName,
      promptVersion: prompt.version
    });
    return { article };
  }
  async generateTitles(user, body) {
    const article = requireText(body.article, "article");
    await this.enforceRateLimit(user.id);
    await this.quotaService.ensureCanUseWorkflow(user);
    if (user.plan_type !== "pro") {
      const workflowId = requireText(body.workflowId, "workflowId");
      const exists = await this.generationRepo.hasTopicWorkflow(user.id, workflowId);
      if (!exists) {
        throw new HttpError(403, "\u8BF7\u5148\u5B8C\u6210\u9009\u9898\u751F\u6210\uFF0C\u518D\u751F\u6210\u6807\u9898");
      }
    }
    const prompt = buildTitlePrompt({
      workflowId: body.workflowId,
      article,
      topic: body.topic,
      style: body.style
    });
    const aiResult = await callChatModel(this.env, "kimi", prompt);
    const titles = parseJsonStringArray(aiResult.text, 10);
    if (titles.length === 0) {
      throw new HttpError(502, "\u6A21\u578B\u672A\u8FD4\u56DE\u6709\u6548\u6807\u9898");
    }
    await this.generationRepo.create({
      userId: user.id,
      type: "titles",
      inputPayload: {
        workflowId: body.workflowId || null,
        topic: body.topic || "",
        style: body.style || "",
        article
      },
      outputPayload: { titles },
      modelName: aiResult.modelName,
      promptVersion: prompt.version
    });
    return { titles };
  }
};

// worker/services/historyService.ts
var HistoryService = class {
  static {
    __name(this, "HistoryService");
  }
  generationRepo;
  constructor(db) {
    this.generationRepo = new GenerationRepository(db);
  }
  async list(user, params) {
    return this.generationRepo.listByUser(user.id, params);
  }
  async detail(user, id) {
    const record = await this.generationRepo.findById(user.id, id);
    if (!record) throw new HttpError(404, "\u5386\u53F2\u8BB0\u5F55\u4E0D\u5B58\u5728");
    return record;
  }
};

// worker/repositories/orderRepo.ts
var OrderRepository = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "OrderRepository");
  }
  async create(params) {
    const id = createId();
    const createdAt = nowIso();
    const currency = params.currency || "CNY";
    await this.db.prepare(
      "INSERT INTO orders (id, user_id, plan_code, amount, currency, status, wx_order_no, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, params.userId, params.planCode, params.amount, currency, "pending", params.wxOrderNo, createdAt, createdAt).run();
    return {
      id,
      user_id: params.userId,
      plan_code: params.planCode,
      amount: params.amount,
      currency,
      status: "pending",
      wx_order_no: params.wxOrderNo,
      paid_at: null,
      created_at: createdAt,
      updated_at: createdAt
    };
  }
  async findByWxOrderNo(wxOrderNo) {
    return this.db.prepare(
      "SELECT id, user_id, plan_code, amount, currency, status, wx_order_no, paid_at, created_at, updated_at FROM orders WHERE wx_order_no = ? LIMIT 1"
    ).bind(wxOrderNo).first();
  }
  async markPaid(orderId, paidAt) {
    await this.db.prepare("UPDATE orders SET status = ?, paid_at = ?, updated_at = ? WHERE id = ?").bind("paid", paidAt, nowIso(), orderId).run();
  }
  async markFailed(orderId) {
    await this.db.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").bind("failed", nowIso(), orderId).run();
  }
  async listByUser(userId) {
    const result = await this.db.prepare(
      "SELECT id, user_id, plan_code, amount, currency, status, wx_order_no, paid_at, created_at, updated_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100"
    ).bind(userId).all();
    return result.results || [];
  }
};

// worker/repositories/subscriptionLogRepo.ts
var SubscriptionLogRepository = class {
  constructor(db) {
    this.db = db;
  }
  static {
    __name(this, "SubscriptionLogRepository");
  }
  async create(params) {
    await this.db.prepare(
      "INSERT INTO subscriptions_log (id, user_id, action, plan_type, expire_at, source_order_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(createId(), params.userId, params.action, params.planType, params.expireAt, params.sourceOrderId, nowIso()).run();
  }
};

// worker/services/paymentService.ts
var PLAN_CONFIG = {
  pro_month: { amount: 49, days: 30 },
  pro_quarter: { amount: 129, days: 90 }
};
var PaymentService = class {
  constructor(env) {
    this.env = env;
    this.orderRepo = new OrderRepository(env.DB);
    this.userRepo = new UserRepository(env.DB);
    this.logRepo = new SubscriptionLogRepository(env.DB);
  }
  static {
    __name(this, "PaymentService");
  }
  orderRepo;
  userRepo;
  logRepo;
  async createOrder(user, body) {
    const planCode = body.planCode;
    if (!planCode || !PLAN_CONFIG[planCode]) {
      throw new HttpError(400, "planCode \u4E0D\u652F\u6301");
    }
    const config = PLAN_CONFIG[planCode];
    const wxOrderNo = createWxOrderNo();
    const order = await this.orderRepo.create({
      userId: user.id,
      planCode,
      amount: config.amount,
      currency: "CNY",
      wxOrderNo
    });
    return {
      orderId: order.id,
      paymentParams: {
        wxOrderNo,
        amount: order.amount,
        currency: order.currency,
        mockPayUrl: `https://pay.weixin.qq.com/mock/${wxOrderNo}`
      }
    };
  }
  verifyCallbackSignature(request) {
    if (!this.env.WECHAT_CALLBACK_SECRET) return;
    const sign = request.headers.get("X-Wechat-Sign");
    if (sign !== this.env.WECHAT_CALLBACK_SECRET) {
      throw new HttpError(401, "\u652F\u4ED8\u56DE\u8C03\u9A8C\u7B7E\u5931\u8D25");
    }
  }
  async handleCallback(body) {
    if (!body.wxOrderNo) throw new HttpError(400, "wxOrderNo \u4E0D\u80FD\u4E3A\u7A7A");
    if (!body.status) throw new HttpError(400, "status \u4E0D\u80FD\u4E3A\u7A7A");
    const order = await this.orderRepo.findByWxOrderNo(body.wxOrderNo);
    if (!order) throw new HttpError(404, "\u8BA2\u5355\u4E0D\u5B58\u5728");
    if (order.status === "paid") {
      return { success: true, message: "\u8BA2\u5355\u5DF2\u5904\u7406" };
    }
    if (body.status === "FAIL") {
      await this.orderRepo.markFailed(order.id);
      return { success: true, message: "\u5DF2\u66F4\u65B0\u5931\u8D25\u72B6\u6001" };
    }
    const plan = PLAN_CONFIG[order.plan_code];
    if (!plan) throw new HttpError(400, "\u8BA2\u5355\u5957\u9910\u975E\u6CD5");
    const paidAt = body.paidAt || (/* @__PURE__ */ new Date()).toISOString();
    await this.orderRepo.markPaid(order.id, paidAt);
    const expireAt = addDaysISO(plan.days);
    await this.userRepo.updatePlan(order.user_id, "pro", expireAt, -1);
    await this.logRepo.create({
      userId: order.user_id,
      action: "upgrade",
      planType: "pro",
      expireAt,
      sourceOrderId: order.id
    });
    return { success: true, message: "\u652F\u4ED8\u6210\u529F\u5E76\u5DF2\u5F00\u901A\u4F1A\u5458" };
  }
  async listOrders(user) {
    return this.orderRepo.listByUser(user.id);
  }
};

// worker/middleware/auth.ts
async function requireAuthUser(request, authService) {
  const header = request.headers.get("Authorization");
  const token = header?.replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new HttpError(401, "\u7F3A\u5C11\u767B\u5F55\u51ED\u8BC1");
  }
  return authService.getUserFromToken(token);
}
__name(requireAuthUser, "requireAuthUser");

// worker/routes/auth.ts
async function handleSendCode(request, env, authService) {
  const body = await parseJson(request);
  const result = await authService.sendCode(body, request);
  return json(request, env, result);
}
__name(handleSendCode, "handleSendCode");
async function handleLogin(request, env, authService) {
  const body = await parseJson(request);
  const result = await authService.login(body);
  return json(request, env, result);
}
__name(handleLogin, "handleLogin");
async function handleMe(request, env, authService) {
  const user = await requireAuthUser(request, authService);
  return json(request, env, { user });
}
__name(handleMe, "handleMe");

// worker/routes/generate.ts
async function handleGenerateTopics(request, env, authService, generationService) {
  const user = await requireAuthUser(request, authService);
  const body = await parseJson(request);
  const result = await generationService.generateTopics(user, body);
  return json(request, env, result);
}
__name(handleGenerateTopics, "handleGenerateTopics");
async function handleGenerateArticle(request, env, authService, generationService) {
  const user = await requireAuthUser(request, authService);
  const body = await parseJson(request);
  const result = await generationService.generateArticle(user, body);
  return json(request, env, result);
}
__name(handleGenerateArticle, "handleGenerateArticle");
async function handleGenerateTitles(request, env, authService, generationService) {
  const user = await requireAuthUser(request, authService);
  const body = await parseJson(request);
  const result = await generationService.generateTitles(user, body);
  return json(request, env, result);
}
__name(handleGenerateTitles, "handleGenerateTitles");

// worker/routes/history.ts
function parseType(value) {
  if (!value) return void 0;
  if (value === "topics" || value === "article" || value === "titles") return value;
  throw new HttpError(400, "type \u53C2\u6570\u4E0D\u5408\u6CD5");
}
__name(parseType, "parseType");
async function handleHistoryList(request, env, authService, historyService) {
  const user = await requireAuthUser(request, authService);
  const url = new URL(request.url);
  const { page, pageSize } = parsePageParams(url);
  const type = parseType(url.searchParams.get("type"));
  const data = await historyService.list(user, { page, pageSize, type });
  return json(request, env, data);
}
__name(handleHistoryList, "handleHistoryList");
async function handleHistoryDetail(request, env, authService, historyService, id) {
  const user = await requireAuthUser(request, authService);
  const data = await historyService.detail(user, id);
  return json(request, env, { item: data });
}
__name(handleHistoryDetail, "handleHistoryDetail");

// worker/routes/payment.ts
async function handleCreatePayment(request, env, authService, paymentService) {
  const user = await requireAuthUser(request, authService);
  const body = await parseJson(request);
  const result = await paymentService.createOrder(user, body);
  return json(request, env, result);
}
__name(handleCreatePayment, "handleCreatePayment");
async function handlePaymentCallback(request, env, paymentService) {
  paymentService.verifyCallbackSignature(request);
  const body = await parseJson(request);
  const result = await paymentService.handleCallback(body);
  return json(request, env, result);
}
__name(handlePaymentCallback, "handlePaymentCallback");

// worker/routes/orders.ts
async function handleOrderList(request, env, authService, paymentService) {
  const user = await requireAuthUser(request, authService);
  const items = await paymentService.listOrders(user);
  return json(request, env, { items });
}
__name(handleOrderList, "handleOrderList");

// worker/index.ts
var worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) });
    }
    const url = new URL(request.url);
    const authService = new AuthService(env);
    const generationService = new GenerationService(env);
    const historyService = new HistoryService(env.DB);
    const paymentService = new PaymentService(env);
    try {
      if (url.pathname === "/api/auth/send-code" && request.method === "POST") {
        return await handleSendCode(request, env, authService);
      }
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        return await handleLogin(request, env, authService);
      }
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        return await handleMe(request, env, authService);
      }
      if (url.pathname === "/api/generate/topics" && request.method === "POST") {
        return await handleGenerateTopics(request, env, authService, generationService);
      }
      if (url.pathname === "/api/generate/article" && request.method === "POST") {
        return await handleGenerateArticle(request, env, authService, generationService);
      }
      if (url.pathname === "/api/generate/titles" && request.method === "POST") {
        return await handleGenerateTitles(request, env, authService, generationService);
      }
      if (url.pathname === "/api/history" && request.method === "GET") {
        return await handleHistoryList(request, env, authService, historyService);
      }
      if (url.pathname.startsWith("/api/history/") && request.method === "GET") {
        const id = decodeURIComponent(url.pathname.replace("/api/history/", ""));
        if (!id) throw new HttpError(400, "history id \u4E0D\u80FD\u4E3A\u7A7A");
        return await handleHistoryDetail(request, env, authService, historyService, id);
      }
      if (url.pathname === "/api/payment/create" && request.method === "POST") {
        return await handleCreatePayment(request, env, authService, paymentService);
      }
      if (url.pathname === "/api/payment/callback" && request.method === "POST") {
        return await handlePaymentCallback(request, env, paymentService);
      }
      if (url.pathname === "/api/orders" && request.method === "GET") {
        return await handleOrderList(request, env, authService, paymentService);
      }
      if (url.pathname === "/api/health" && request.method === "GET") {
        return json(request, env, { ok: true, now: (/* @__PURE__ */ new Date()).toISOString() });
      }
      return json(request, env, { error: "Not Found" }, 404);
    } catch (err) {
      if (err instanceof HttpError) {
        return json(request, env, { error: err.message }, err.status);
      }
      const message = err instanceof Error ? err.message : "\u670D\u52A1\u5668\u9519\u8BEF";
      return json(request, env, { error: message }, 500);
    }
  }
};

// worker.ts
var worker_default2 = worker_default;

// node_modules/.pnpm/wrangler@4.68.1/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/.pnpm/wrangler@4.68.1/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ZoezF9/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default2;

// node_modules/.pnpm/wrangler@4.68.1/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ZoezF9/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
