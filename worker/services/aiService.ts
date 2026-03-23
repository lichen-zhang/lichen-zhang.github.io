import type { Env } from '../types/env'
import { HttpError } from '../utils/http'

type Provider = 'kimi'

export interface ChatPrompt {
  system: string
  user: string
}

function providerConfig(env: Env): {
  url: string
  apiKey: string | undefined
  model: string
} {
  return {
    url: env.KIMI_API_URL || 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: env.KIMI_API_KEY,
    model: env.KIMI_MODEL || 'moonshot-v1-8k',
  }
}

export async function callChatModel(
  env: Env,
  _provider: 'deepseek' | 'kimi',
  prompt: ChatPrompt,
): Promise<{ text: string; modelName: string }> {
  const gatewayUrl = env.AI_GATEWAY_BASE_URL?.trim()
  const provider: Provider = 'kimi'
  const config = providerConfig(env)

  let response: Response
  if (gatewayUrl) {
    response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.AI_GATEWAY_API_KEY ? { Authorization: `Bearer ${env.AI_GATEWAY_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        provider,
        model: config.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      }),
    })
  } else {
    if (!config.apiKey) {
      throw new HttpError(500, `${provider} API Key 未配置`)
    }
    response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.8,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      }),
    })
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new HttpError(502, `${provider} 调用失败: ${errorText.slice(0, 300)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    data?: { content?: string }
    content?: string
    text?: string
  }

  const text =
    data.choices?.[0]?.message?.content?.trim() || data.data?.content?.trim() || data.content?.trim() || data.text?.trim()
  if (!text) throw new HttpError(502, `${provider} 返回内容为空`)

  return {
    text,
    modelName: `${provider}:${config.model}`,
  }
}

export function parseJsonStringArray(raw: string, max = 10): string[] {
  const normalized = raw.trim()
  try {
    const arr = JSON.parse(normalized) as unknown
    if (Array.isArray(arr)) {
      return arr.map((item) => String(item).trim()).filter(Boolean).slice(0, max)
    }
  } catch {
    // ignore
  }

  const match = normalized.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const arr = JSON.parse(match[0]) as unknown
      if (Array.isArray(arr)) {
        return arr.map((item) => String(item).trim()).filter(Boolean).slice(0, max)
      }
    } catch {
      // ignore
    }
  }

  return normalized
    .split('\n')
    .map((line) => line.replace(/^\s*[\d]+[.)、\s-]*/g, '').replace(/^\s*[-*]\s*/g, '').trim())
    .filter(Boolean)
    .slice(0, max)
}
