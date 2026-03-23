import type { GenerateArticleBody, GenerateTitlesBody, GenerateTopicsBody } from '../types/dto'

const TOPIC_PROMPT_VERSION = 'v1.0.0'
const ARTICLE_PROMPT_VERSION = 'v1.0.0'
const TITLE_PROMPT_VERSION = 'v1.0.0'

export function buildTopicPrompt(input: GenerateTopicsBody): { system: string; user: string; version: string } {
  const system = `你是一位懂小红书内容运营的中文文案专家。
请围绕给定主题，为指定账号类型生成 10 个适合小红书发布的选题。

要求：
1. 贴近真实博主会发的风格
2. 不要写成新闻标题
3. 不要出现夸张违规词
4. 尽量提高点击欲，但不要低质
5. 输出必须是 JSON 数组，每个元素是一条完整标题`
  const user = `主题：${input.topic}
账号类型：${input.accountType || '通用'}
风格：${input.style}
长度偏好：${input.length}`
  return { system, user, version: TOPIC_PROMPT_VERSION }
}

export function buildArticlePrompt(input: GenerateArticleBody): { system: string; user: string; version: string } {
  const system = `你是一位资深的小红书中文内容作者。
请根据给定选题写一篇可直接发布的小红书笔记。

要求：
1. 语气像真实博主，真诚自然
2. 多用短段落，适合移动端阅读
3. 可以少量使用 emoji，但不要过多
4. 不要写成广告，不要生硬带货
5. 结尾可以带一句自然互动
6. 输出纯正文，不要解释`
  const user = `主题：${input.topic}
账号类型：${input.accountType || '通用'}
风格：${input.style}
长度：${input.length}
选题：${input.selectedTopic}`
  return { system, user, version: ARTICLE_PROMPT_VERSION }
}

export function buildTitlePrompt(input: GenerateTitlesBody): { system: string; user: string; version: string } {
  const system = `请基于下方小红书正文，生成 10 个适合发布的小红书标题。

要求：
1. 中文
2. 风格自然，像真实博主
3. 避免违规词和过度营销表达
4. 输出 JSON 数组`
  const user = `主题：${input.topic || '未指定'}
风格：${input.style || '未指定'}
正文：
${input.article}`
  return { system, user, version: TITLE_PROMPT_VERSION }
}
