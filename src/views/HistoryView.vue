<template>
  <section class="space-y-6">
    <article class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <h2 class="text-xl font-bold">历史记录</h2>
      <p class="mt-1 text-sm text-[var(--muted)]">按相似主题和工作流分块查看自己的选题、正文和标题，并把某块历史直接接到下一次创作里。</p>
    </article>

    <article class="rounded-2xl border border-[var(--line)] bg-white p-5">
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_180px_auto]">
        <label class="block text-sm">
          关键词
          <input v-model="query.keyword" type="text" placeholder="搜索主题、选题、正文、标题" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
        </label>
        <label class="block text-sm">
          类型筛选
          <select v-model="query.type" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
            <option value="">全部类型</option>
            <option value="topics">仅看选题</option>
            <option value="article">仅看正文</option>
            <option value="titles">仅看标题</option>
          </select>
        </label>
        <label class="block text-sm">
          相似主题
          <select v-model="query.topicTag" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
            <option value="">全部主题</option>
            <option v-for="tag in availableTopicTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
        </label>
        <div class="flex items-end gap-2 max-md:grid max-md:grid-cols-2">
          <button :disabled="store.loading" @click="load" class="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white disabled:opacity-40">查询</button>
          <button :disabled="store.loading" @click="resetFilters" class="rounded-lg border border-[var(--line)] px-4 py-2 text-sm text-[var(--text)] disabled:opacity-40">重置</button>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-4">
        <article class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs text-[var(--muted)]">历史总条数</p>
          <p class="mt-1 text-2xl font-bold">{{ store.historyTotal }}</p>
        </article>
        <article class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs text-[var(--muted)]">历史块数量</p>
          <p class="mt-1 text-2xl font-bold">{{ visibleBlocks.length }}</p>
        </article>
        <article class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs text-[var(--muted)]">正文条数</p>
          <p class="mt-1 text-2xl font-bold">{{ visibleArticleCount }}</p>
        </article>
        <article class="rounded-xl bg-slate-50 p-4">
          <p class="text-xs text-[var(--muted)]">标题组数</p>
          <p class="mt-1 text-2xl font-bold">{{ visibleTitleCount }}</p>
        </article>
      </div>

      <div v-if="activeTopicTag" class="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span class="text-[var(--muted)]">当前相似主题筛选：</span>
        <button class="rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-800" @click="query.topicTag = ''">{{ activeTopicTag }} · 清除</button>
      </div>
    </article>

    <p v-if="store.error" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ store.error }}</p>

    <div v-if="visibleGroups.length" class="space-y-5">
      <article v-for="group in visibleGroups" :key="group.key" class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 md:p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-lg font-semibold">{{ group.label }}</h3>
              <span class="rounded-full bg-white px-2 py-1 text-xs text-[var(--muted)]">{{ group.blocks.length }} 个历史块</span>
            </div>
            <p class="mt-1 text-sm text-[var(--muted)]">已聚合同一相似主题下的历史内容，便于纵向对比与延续创作。</p>
          </div>
          <button class="text-sm font-medium text-[var(--brand)]" @click="toggleTopicGroup(group.key)">{{ expandedTopicGroups.has(group.key) ? '收起该主题' : '展开该主题' }}</button>
        </div>

        <div v-if="expandedTopicGroups.has(group.key)" class="mt-4 space-y-4">
          <article v-for="block in group.blocks" :key="block.key" class="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-lg font-semibold">{{ block.displayTopic }}</h3>
                  <span class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-[var(--brand)]">{{ block.accountType || '通用账号' }}</span>
                  <span class="rounded-full bg-slate-100 px-2 py-1 text-xs text-[var(--muted)]">{{ block.style || '未标注风格' }}</span>
                  <button
                    v-for="tag in block.topicTags"
                    :key="`${block.key}-${tag}`"
                    class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                    @click="applyTopicTagFilter(tag)"
                  >
                    {{ tag }}
                  </button>
                  <span v-if="isReferenceSelected(block)" class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-[var(--brand)]">已加入参考</span>
                  <span v-if="isPrimaryReference(block)" class="rounded-full bg-orange-200 px-2 py-1 text-xs font-medium text-[var(--brand)]">主参考</span>
                </div>
                <p class="mt-1 text-sm text-[var(--muted)]">最近更新：{{ formatDateTime(block.createdAt) }}</p>
                <p v-if="block.selectedTopic" class="mt-2 text-sm text-[var(--text)]">当前主选题：{{ block.selectedTopic }}</p>
                <p class="mt-2 text-xs text-[var(--muted)]">{{ block.summary }}</p>
              </div>

              <div class="grid grid-cols-3 gap-2 text-center text-sm md:min-w-[240px]">
                <div class="rounded-xl bg-slate-50 px-3 py-2">
                  <p class="text-xs text-[var(--muted)]">选题</p>
                  <p class="mt-1 text-lg font-bold">{{ block.stats.topics }}</p>
                </div>
                <div class="rounded-xl bg-slate-50 px-3 py-2">
                  <p class="text-xs text-[var(--muted)]">正文</p>
                  <p class="mt-1 text-lg font-bold">{{ block.stats.article }}</p>
                </div>
                <div class="rounded-xl bg-slate-50 px-3 py-2">
                  <p class="text-xs text-[var(--muted)]">标题组</p>
                  <p class="mt-1 text-lg font-bold">{{ block.stats.titles }}</p>
                </div>
              </div>
            </div>

            <div class="mt-4 grid gap-4 lg:grid-cols-3">
              <article class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-semibold">选题结果区</h4>
                  <span class="text-xs text-[var(--muted)]">{{ block.topics.length }} 条</span>
                </div>
                <ul v-if="block.topics.length" class="space-y-2">
                  <li v-for="(topic, idx) in block.topics.slice(0, block.expanded ? block.topics.length : 4)" :key="`${block.key}-topic-${idx}`" class="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                    {{ idx + 1 }}. {{ topic }}
                  </li>
                </ul>
                <p v-else class="text-sm text-[var(--muted)]">暂无选题记录</p>
              </article>

              <article class="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-semibold">正文结果区</h4>
                  <span class="text-xs text-[var(--muted)]">{{ block.articles.length }} 条</span>
                </div>
                <div v-if="block.articles.length" class="space-y-3">
                  <div v-for="article in block.articles.slice(0, block.expanded ? block.articles.length : 2)" :key="article.id" class="rounded-lg bg-slate-50 p-3">
                    <div class="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--muted)]">
                      <span>{{ formatDateTime(article.createdAt) }}</span>
                      <span>{{ article.modelName }}</span>
                    </div>
                    <p class="line-clamp-6 whitespace-pre-wrap text-sm text-[var(--text)]">{{ article.text }}</p>
                  </div>
                </div>
                <p v-else class="text-sm text-[var(--muted)]">暂无正文记录</p>
              </article>

              <article class="rounded-2xl border border-[var(--line)] bg-white p-4">
                <div class="mb-2 flex items-center justify-between">
                  <h4 class="font-semibold">标题结果区</h4>
                  <span class="text-xs text-[var(--muted)]">{{ block.titles.length }} 条</span>
                </div>
                <ul v-if="block.titles.length" class="space-y-2">
                  <li v-for="(title, idx) in block.titles.slice(0, block.expanded ? block.titles.length : 6)" :key="`${block.key}-title-${idx}`" class="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    {{ idx + 1 }}. {{ title }}
                  </li>
                </ul>
                <p v-else class="text-sm text-[var(--muted)]">暂无标题记录</p>
              </article>
            </div>

            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
              <div class="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span class="rounded-full bg-slate-100 px-2 py-1">workflow: {{ block.workflowId || '未关联' }}</span>
                <span class="rounded-full bg-slate-100 px-2 py-1">记录数 {{ block.itemCount }}</span>
              </div>
              <div class="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
                <button class="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--text)]" @click="replaceReference(block)">作为本次创作参考</button>
                <button class="rounded-lg border border-[var(--line)] px-3 py-2 text-sm text-[var(--text)]" @click="appendReference(block)">追加参考</button>
                <button class="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm text-white" @click="continueWithBlock(block)">继续生成同主题下一篇</button>
                <button class="text-sm font-medium text-[var(--brand)] sm:text-left" @click="toggleExpanded(block.key)">{{ expandedKeys.has(block.key) ? '收起内容' : '展开查看全部' }}</button>
              </div>
            </div>
          </article>
        </div>
      </article>
    </div>

    <article v-else class="rounded-2xl border border-[var(--line)] bg-white p-6 text-sm text-[var(--muted)]">
      当前筛选条件下暂无历史记录。
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGenerationStore } from '../stores/generation'
import type { GenerationType, HistoryItem } from '../types/api'

const store = useGenerationStore()
const router = useRouter()

const query = reactive({
  page: 1,
  pageSize: 100,
  type: '',
  keyword: '',
  topicTag: '',
})

const expandedKeys = ref<Set<string>>(new Set())
const expandedTopicGroups = ref<Set<string>>(new Set())

type ParsedPayload = Record<string, unknown>

interface ParsedHistoryItem {
  id: string
  type: GenerationType
  modelName: string
  createdAt: string
  workflowId: string
  topic: string
  accountType: string
  style: string
  length: string
  selectedTopic: string
  topics: string[]
  article: string
  titles: string[]
}

interface HistoryBlock {
  key: string
  workflowId: string
  semanticKey: string
  displayTopic: string
  accountType: string
  style: string
  length: string
  selectedTopic: string
  topicTags: string[]
  createdAt: string
  itemCount: number
  stats: Record<GenerationType, number>
  recordIds: string[]
  topics: string[]
  articles: Array<{ id: string; text: string; createdAt: string; modelName: string }>
  titles: string[]
  expanded: boolean
  searchText: string
  summary: string
}

interface TopicGroup {
  key: string
  label: string
  blocks: HistoryBlock[]
}

const TOPIC_TAG_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: '减脂减重', patterns: [/减肥/i, /减脂/i, /减重/i, /瘦身/i, /掉秤/i, /塑形/i] },
  { tag: '体重管理', patterns: [/体重变化/i, /体重管理/i, /体脂/i, /腰围/i, /围度/i] },
  { tag: '饮食控制', patterns: [/控糖/i, /饮食/i, /热量/i, /食谱/i, /代餐/i, /暴食/i] },
  { tag: '运动训练', patterns: [/训练/i, /运动/i, /跑步/i, /跳绳/i, /健身/i, /力量/i, /有氧/i] },
  { tag: '习惯打卡', patterns: [/打卡/i, /复盘/i, /坚持/i, /习惯/i, /第[一二三四五六七八九十\d]+周/i] },
]

async function load() {
  await store.fetchHistory({
    page: query.page,
    pageSize: query.pageSize,
    type: undefined,
  })
}

function resetFilters() {
  query.type = ''
  query.keyword = ''
  query.topicTag = ''
}

function parsePayload(raw: string): ParsedPayload {
  try {
    return JSON.parse(raw) as ParsedPayload
  } catch {
    return {}
  }
}

function asString(value: unknown) {
  return String(value || '').trim()
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : []
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function normalizeTopicText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTopicTags(values: string[]) {
  const mergedText = values.join(' | ')
  const tags = TOPIC_TAG_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(mergedText))).map((rule) => rule.tag)
  return dedupe(tags)
}

function buildSemanticKey(values: string[]) {
  const tags = extractTopicTags(values)
  if (tags.length) return `tags:${tags.join('|')}`
  const normalized = values.map((value) => normalizeTopicText(value)).find(Boolean)
  return normalized ? `topic:${normalized}` : 'topic:untitled'
}

function makeSummary(topics: string[], articles: Array<{ text: string }>, titles: string[]) {
  const parts: string[] = []
  if (topics[0]) parts.push(`选题：${topics[0]}`)
  if (articles[0]?.text) parts.push(`正文：${articles[0].text.slice(0, 56)}${articles[0].text.length > 56 ? '...' : ''}`)
  if (titles[0]) parts.push(`标题：${titles[0]}`)
  return parts.join(' | ')
}

const parsedHistory = computed<ParsedHistoryItem[]>(() =>
  store.history.map((item) => {
    const input = parsePayload(item.input_payload)
    const output = parsePayload(item.output_payload)
    return {
      id: item.id,
      type: item.type,
      modelName: item.model_name,
      createdAt: item.created_at,
      workflowId: asString(input.workflowId),
      topic: asString(input.topic),
      accountType: asString(input.accountType),
      style: asString(input.style),
      length: asString(input.length),
      selectedTopic: asString(input.selectedTopic),
      topics: asStringArray(output.topics),
      article: asString(output.article),
      titles: asStringArray(output.titles),
    }
  })
)

const historyBlocks = computed<HistoryBlock[]>(() => {
  const groups = new Map<string, ParsedHistoryItem[]>()

  for (const item of parsedHistory.value) {
    const semanticKey = buildSemanticKey([item.topic, item.selectedTopic, ...item.topics, ...item.titles, item.article.slice(0, 80)])
    const key = item.workflowId || semanticKey
    const list = groups.get(key) || []
    list.push(item)
    groups.set(key, list)
  }

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      const latest = sorted[0]
      if (!latest) return null

      const topics = dedupe(sorted.flatMap((item) => item.topics))
      const titles = dedupe(sorted.flatMap((item) => item.titles))
      const articles = sorted
        .filter((item) => item.article)
        .map((item) => ({ id: item.id, text: item.article, createdAt: item.createdAt, modelName: item.modelName }))

      const stats = {
        topics: sorted.filter((item) => item.type === 'topics').length,
        article: sorted.filter((item) => item.type === 'article').length,
        titles: sorted.filter((item) => item.type === 'titles').length,
      }

      const displayTopic = latest.topic || latest.selectedTopic || topics[0] || '未命名主题'
      const topicTags = extractTopicTags([displayTopic, latest.selectedTopic, ...topics, ...titles, ...articles.map((item) => item.text.slice(0, 80))])
      const semanticKey = buildSemanticKey([displayTopic, latest.selectedTopic, ...topics, ...titles])
      const summary = makeSummary(topics, articles, titles)
      const searchText = [displayTopic, latest.accountType, latest.style, latest.selectedTopic, latest.length, ...topicTags, ...topics, ...titles, ...articles.map((item) => item.text)].join(' ').toLowerCase()

      return {
        key,
        workflowId: latest.workflowId,
        semanticKey,
        displayTopic,
        accountType: latest.accountType,
        style: latest.style,
        length: latest.length,
        selectedTopic: latest.selectedTopic,
        topicTags,
        createdAt: latest.createdAt,
        itemCount: sorted.length,
        stats,
        recordIds: sorted.map((item) => item.id),
        topics,
        articles,
        titles,
        expanded: expandedKeys.value.has(key),
        searchText,
        summary,
      }
    })
    .filter((block): block is HistoryBlock => Boolean(block))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
})

const visibleBlocks = computed(() => {
  const keyword = query.keyword.trim().toLowerCase()
  return historyBlocks.value.filter((block) => {
    if (query.type && block.stats[query.type as GenerationType] <= 0) return false
    if (query.topicTag && !block.topicTags.includes(query.topicTag)) return false
    if (keyword && !block.searchText.includes(keyword)) return false
    return true
  })
})

const availableTopicTags = computed(() => Array.from(new Set(historyBlocks.value.flatMap((block) => block.topicTags))).sort((left, right) => left.localeCompare(right, 'zh-CN')))
const activeTopicTag = computed(() => query.topicTag.trim())

const visibleGroups = computed<TopicGroup[]>(() => {
  const groups = new Map<string, HistoryBlock[]>()
  for (const block of visibleBlocks.value) {
    const key = block.topicTags[0] || block.semanticKey || block.displayTopic
    const list = groups.get(key) || []
    list.push(block)
    groups.set(key, list)
  }

  return Array.from(groups.entries()).map(([key, blocks]) => ({
    key,
    label: key.startsWith('tags:') ? key.replace(/^tags:/, '') : key,
    blocks,
  }))
})

const visibleArticleCount = computed(() => visibleBlocks.value.reduce((sum, block) => sum + block.stats.article, 0))
const visibleTitleCount = computed(() => visibleBlocks.value.reduce((sum, block) => sum + block.stats.titles, 0))

function toggleExpanded(key: string) {
  const next = new Set(expandedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedKeys.value = next
}

function toggleTopicGroup(key: string) {
  const next = new Set(expandedTopicGroups.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedTopicGroups.value = next
}

function applyTopicTagFilter(tag: string) {
  query.topicTag = tag
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function makeReferencePayload(block: HistoryBlock) {
  return {
    key: block.key,
    historyIds: block.recordIds,
    label: `${block.displayTopic}${block.topicTags.length ? ` · ${block.topicTags.join(' / ')}` : ''}`,
    topic: block.displayTopic,
    accountType: block.accountType,
    style: block.style,
    selectedTopic: block.selectedTopic,
    semanticTag: block.topicTags[0] || '',
    summary: block.summary,
    counts: { ...block.stats },
  }
}

function isReferenceSelected(block: HistoryBlock) {
  return store.referenceContexts.some((item) => item.key === block.key)
}

function isPrimaryReference(block: HistoryBlock) {
  return store.activeReferenceKey === block.key
}

function replaceReference(block: HistoryBlock) {
  store.setReferenceContext(makeReferencePayload(block))
}

function appendReference(block: HistoryBlock) {
  store.appendReferenceContext(makeReferencePayload(block))
}

async function continueWithBlock(block: HistoryBlock) {
  store.resetWorkspace()
  store.setReferenceContext(makeReferencePayload(block))
  store.setComposeDraft({
    topic: block.displayTopic,
    accountType: block.accountType,
    style: block.style || '经验分享型',
    length: block.length || '中',
    selectedTopic: block.selectedTopic,
    workflowId: block.workflowId,
  })
  await router.push('/dashboard')
}

watch(
  visibleGroups,
  (groups) => {
    expandedTopicGroups.value = new Set(groups.map((group) => group.key))
  },
  { immediate: true }
)

onMounted(load)
</script>
