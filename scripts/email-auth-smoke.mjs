const workerBaseUrl = process.env.WORKER_BASE_URL || process.env.BIZ_BASE_URL || 'https://biz.stackout.work'
const emailAuthBaseUrl = process.env.EMAIL_AUTH_BASE_URL || 'https://mail.stackout.work'
const testEmail = process.env.TEST_EMAIL || ''
const testCode = process.env.TEST_CODE || ''
const behaviorStartedAt = Date.now() - 2200

function exitWith(message) {
    console.error(`\n[smoke:email-auth] ${message}`)
    process.exit(1)
}

if (!testEmail) {
    exitWith('请先设置 TEST_EMAIL 环境变量，例如 TEST_EMAIL=you@example.com')
}

async function requestJson(path, init = {}) {
    const resp = await fetch(`${workerBaseUrl}${path}`, init)
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
        const message = data?.error || data?.message || `HTTP ${resp.status}`
        throw new Error(`${path} 失败: ${message}`)
    }
    return data
}

async function requestJsonAbsolute(url, init = {}) {
    const resp = await fetch(url, init)
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
        const message = data?.error || data?.message || `HTTP ${resp.status}`
        throw new Error(`${url} 失败: ${message}`)
    }
    return data
}

async function run() {
    console.log(`[smoke:email-auth] Worker: ${workerBaseUrl}`)
    console.log(`[smoke:email-auth] Email Auth: ${emailAuthBaseUrl}`)
    console.log(`[smoke:email-auth] Email: ${testEmail}`)

    const sendResult = await requestJson('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: testEmail,
            behaviorStartedAt,
            behaviorSubmitAt: Date.now(),
            website: ''
        }),
    })
    console.log('[smoke:email-auth] send-code ok:', sendResult)

    const resolvedCode = testCode || sendResult?.debugCode || ''
    if (!resolvedCode) {
        console.log('[smoke:email-auth] 未提供 TEST_CODE 且 send-code 未返回 debugCode。')
        console.log('[smoke:email-auth] 可通过 TEST_CODE=123456 或后端 EXPOSE_DEV_CODE=true 后重跑。')
        return
    }

    const checkResult = await requestJsonAbsolute(`${emailAuthBaseUrl}/api/auth/email-code/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, code: resolvedCode }),
    })
    console.log('[smoke:email-auth] check-code ok:', checkResult)

    const loginResult = await requestJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, code: resolvedCode }),
    })

    if (!loginResult?.token) {
        throw new Error('登录成功但未返回 token')
    }
    console.log('[smoke:email-auth] login ok, token length:', loginResult.token.length)

    const meResult = await requestJson('/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${loginResult.token}` },
    })
    console.log('[smoke:email-auth] me ok:', {
        id: meResult?.user?.id,
        email: meResult?.user?.email,
        plan_type: meResult?.user?.plan_type,
    })

    console.log('\n[smoke:email-auth] 发送 -> 校验 -> 登录 -> me 全链路校验完成。')
}

run().catch((err) => {
    exitWith(err instanceof Error ? err.message : String(err))
})
