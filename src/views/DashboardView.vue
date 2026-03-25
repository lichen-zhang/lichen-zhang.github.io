<template>
  <section class="space-y-6">
    <article class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 class="text-xl font-bold">主工作台</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">流程：先生成选题，再选择一个继续写正文，最后根据正文生成标题；需要连续创作时可叠加历史参考。</p>
        </div>
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-3">
        <article class="rounded-xl bg-white px-4 py-3 text-sm">
          <p class="text-xs text-[var(--muted)]">步骤 1</p>
          <p class="mt-1 font-semibold text-[var(--text)]">先生成选题</p>
          <p class="mt-1 text-xs text-[var(--muted)]">决定本次创作的主题方向和表达角度。</p>
        </article>
        <article class="rounded-xl bg-white px-4 py-3 text-sm">
          <p class="text-xs text-[var(--muted)]">步骤 2</p>
          <p class="mt-1 font-semibold text-[var(--text)]">再生成正文</p>
          <p class="mt-1 text-xs text-[var(--muted)]">从 10 个选题里挑一个继续展开。</p>
        </article>
        <article class="rounded-xl bg-white px-4 py-3 text-sm">
          <p class="text-xs text-[var(--muted)]">步骤 3</p>
          <p class="mt-1 font-semibold text-[var(--text)]">最后生成标题</p>
          <p class="mt-1 text-xs text-[var(--muted)]">围绕正文提炼更适合发布的标题。</p>
        </article>
      </div>

      <div v-if="referenceCards.length" class="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="font-semibold text-[var(--text)]">当前已指定历史参考</p>
            <p class="mt-1 text-[var(--muted)]">已选择 {{ referenceCards.length }} 个历史块，共引用 {{ store.referenceHistoryIds.length }} 条记录。</p>
          </div>
          <button class="w-full rounded-lg border border-orange-300 px-3 py-2 text-sm text-[var(--brand)] md:w-auto" @click="clearReferenceContext">
            清空全部参考
          </button>
        </div>

        <div class="mt-4 grid gap-3 lg:grid-cols-2">
          <article
            v-for="reference in referenceCards"
            :key="reference.key"
            class="rounded-xl border p-4"
            :class="reference.key === activeReferenceKey ? 'border-orange-300 bg-white' : 'border-orange-100 bg-orange-50/60'"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-[var(--text)]">{{ reference.label }}</p>
                  <span v-if="reference.semanticTag" class="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{{ reference.semanticTag }}</span>
                  <span v-if="reference.key === activeReferenceKey" class="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-[var(--brand)]">主参考</span>
                </div>
                <p v-if="reference.summary" class="mt-2 text-xs text-[var(--muted)]">{{ reference.summary }}</p>
                <div class="mt-2 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span class="rounded-full bg-slate-100 px-2 py-1">记录 {{ reference.historyIds.length }}</span>
                  <span v-if="reference.counts" class="rounded-full bg-slate-100 px-2 py-1">
                    选题 {{ reference.counts.topics }} / 正文 {{ reference.counts.article }} / 标题 {{ reference.counts.titles }}
                  </span>
                </div>
              </div>
              <div class="flex shrink-0 flex-wrap justify-start gap-2 sm:justify-end">
                <button
                  v-if="reference.key !== activeReferenceKey"
                  class="rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-[var(--text)]"
                  @click="setActiveReference(reference.key)"
                >
                  设为主参考
                </button>
                <button class="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600" @click="removeReference(reference.key)">
                  移除
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>

      <p v-if="store.error" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ store.error }}</p>
    </article>

    <div class="grid gap-6 lg:grid-cols-2">
      <article class="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h3 class="font-semibold">输入表单区</h3>
        <div class="mt-4 space-y-3">
          <label class="block text-sm">
            主创作主题
            <input v-model="form.topic" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2" />
          </label>
          <label class="block text-sm">
            账号类型
            <select v-model="selectedAccountType" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2">
              <option value="">未指定</option>
              <option v-for="option in accountTypeOptions" :key="option" :value="option">{{ option }}</option>
              <option :value="CUSTOM_OPTION">自定义输入...</option>
            </select>
            <input
              v-if="selectedAccountType === CUSTOM_OPTION"
              v-model="customAccountType"
              class="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              placeholder="请输入自定义账号类型"
            />
          </label>
          <label class="block text-sm">
            内容风格
            <select v-model="selectedStyle" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2">
              <option v-for="option in styleOptions" :key="option" :value="option">{{ option }}</option>
              <option :value="CUSTOM_OPTION">自定义输入...</option>
            </select>
            <input
              v-if="selectedStyle === CUSTOM_OPTION"
              v-model="customStyle"
              class="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2"
              placeholder="请输入自定义内容风格"
            />
          </label>
          <label class="block text-sm">
            内容长度
            <select v-model="form.length" class="mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2">
              <option value="短">短（约 300-600 字）</option>
              <option value="中">中（约 600-1200 字）</option>
              <option value="长">长（约 1200-2000 字）</option>
            </select>
            <p class="mt-1 text-xs text-[var(--muted)]">说明：短约 300-600 字，中约 600-1200 字，长约 1200-2000 字。</p>
          </label>
        </div>

        <div class="mt-4 grid gap-2 sm:flex sm:flex-wrap">
          <button
            :disabled="store.loading || !form.topic.trim()"
            @click="onGenerateTopics"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            <span v-if="generatingStep === 'topics'" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"></span>
            {{ generatingStep === 'topics' ? '1. 正在生成选题...' : '1. 生成选题' }}
          </button>
          <button
            :disabled="store.loading || !selectedTopic"
            @click="onGenerateArticle"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            <span v-if="generatingStep === 'article'" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"></span>
            {{ generatingStep === 'article' ? '2. 正在生成正文...' : '2. 生成正文' }}
          </button>
          <button
            :disabled="store.loading || !store.article"
            @click="onGenerateTitles"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            <span v-if="generatingStep === 'titles'" class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"></span>
            {{ generatingStep === 'titles' ? '3. 正在生成标题...' : '3. 生成标题' }}
          </button>
        </div>

        <div v-if="store.loading" class="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm">
          <div class="flex items-center gap-3 text-[var(--text)]">
            <span class="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[var(--brand)]/35 border-t-[var(--brand)]"></span>
            <p class="font-semibold">{{ loadingTitle }}</p>
          </div>
          <p class="mt-2 text-xs text-[var(--muted)]">请稍候，生成完成后结果区会自动刷新。</p>
        </div>

        <div class="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-[var(--muted)]">
          <p class="font-semibold text-[var(--text)]">额度规则</p>
          <p class="mt-1">免费版每天 3 次，仅“生成选题”成功时扣 1 次。</p>
          <p class="mt-1">生成正文与生成标题不额外扣减，但免费版仍需先完成同一工作流的选题生成。</p>
        </div>

        <div class="mt-4 border-t border-[var(--line)] pt-4">
          <div class="mb-2 flex items-center justify-between gap-3">
            <h4 class="font-semibold">选题结果区（10个）</h4>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <button
                class="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--brand)] disabled:opacity-40"
                :disabled="!store.topics.length"
                @click="copyTopics"
              >
                {{ copyStatus === 'topics-all' ? '已复制全部' : '复制全部' }}
              </button>
              <button
                class="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--brand)] disabled:opacity-40"
                :disabled="!selectedTopic"
                @click="copySelectedTopic"
              >
                {{ copyStatus === 'topics-selected' ? '已复制选中' : '复制选中单条' }}
              </button>
            </div>
          </div>
          <p v-if="copyStatus === 'topics-all' || copyStatus === 'topics-selected'" class="mb-2 text-xs text-emerald-600">
            {{ copyStatus === 'topics-all' ? '已复制全部选题到剪贴板' : '已复制当前选中选题到剪贴板' }}
          </p>
          <ul v-if="store.topics.length" class="max-h-[340px] space-y-2 overflow-auto pr-1">
            <li
              v-for="(topic, idx) in store.topics"
              :key="topic"
              class="cursor-pointer rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:bg-orange-50"
              :class="{ 'bg-orange-100': selectedTopic === topic }"
              @click="selectedTopic = topic"
            >
              {{ idx + 1 }}. {{ topic }}
            </li>
          </ul>
          <div v-else class="rounded-xl bg-slate-50 p-4 text-sm text-[var(--muted)]">
            这里会展示本次生成的 10 个选题。先填写上方表单，再点击“生成选题”。
          </div>
        </div>
      </article>

      <article class="rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
        <h3 class="font-semibold">正文与标题对照区</h3>

        <section class="mt-4">
          <div class="mb-2 flex items-center justify-between">
            <h4 class="font-semibold">正文结果区</h4>
            <div class="flex items-center gap-3">
              <button class="text-xs text-[var(--brand)] disabled:opacity-40" :disabled="!store.article.trim()" @click="copyArticle">
                {{ copyStatus === 'article' ? '已复制正文' : '复制' }}
              </button>
              <button class="text-xs text-[var(--brand)]" @click="openArticleEditor">放大阅读/编辑</button>
            </div>
          </div>
          <p v-if="copyStatus === 'article'" class="mb-2 text-xs text-emerald-600">已复制正文到剪贴板</p>
          <QuillEditor
            v-model:content="store.article"
            content-type="html"
            theme="snow"
            toolbar="essential"
            class="article-editor"
            placeholder="生成正文后，这里会出现可继续编辑的内容。"
          />
          <p class="mt-2 text-xs text-[var(--muted)]">当前字数（含空格）：{{ articleTextLength }}</p>
        </section>

        <section class="mt-5 border-t border-[var(--line)] pt-4">
          <div class="mb-2 flex items-center justify-between gap-3">
            <h4 class="font-semibold">标题结果区（10个）</h4>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <button
                class="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--brand)] disabled:opacity-40"
                :disabled="!store.titles.length"
                @click="copyTitles"
              >
                {{ copyStatus === 'titles-all' ? '已复制全部' : '复制全部' }}
              </button>
              <button
                class="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--brand)] disabled:opacity-40"
                :disabled="!selectedTitle"
                @click="copySelectedTitle"
              >
                {{ copyStatus === 'titles-selected' ? '已复制选中' : '复制选中单条' }}
              </button>
            </div>
          </div>
          <p v-if="copyStatus === 'titles-all' || copyStatus === 'titles-selected'" class="mb-2 text-xs text-emerald-600">
            {{ copyStatus === 'titles-all' ? '已复制全部标题到剪贴板' : '已复制当前选中标题到剪贴板' }}
          </p>
          <ul v-if="store.titles.length" class="max-h-[340px] space-y-2 overflow-auto pr-1">
            <li
              v-for="(title, idx) in store.titles"
              :key="title"
              class="cursor-pointer rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:bg-orange-50"
              :class="{ 'bg-orange-100': selectedTitle === title }"
              @click="selectedTitle = title"
            >
              {{ idx + 1 }}. {{ title }}
            </li>
          </ul>
          <div v-else class="rounded-xl bg-slate-50 p-4 text-sm text-[var(--muted)]">
            标题会基于当前正文生成。先完成正文，再点击“生成标题”。
          </div>
        </section>
      </article>
    </div>

    <div v-if="articleEditorOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4 py-6">
      <article class="flex h-full w-full max-w-5xl flex-col rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-5">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold">正文放大阅读与编辑</h3>
            <p class="mt-1 text-xs text-[var(--muted)]">可在此进行长文编辑，内容会实时同步到工作台正文区。</p>
          </div>
          <button class="rounded-md border border-[var(--line)] px-3 py-2 text-xs text-[var(--text)]" @click="closeArticleEditor">关闭</button>
        </div>

        <QuillEditor
          v-model:content="store.article"
          content-type="html"
          theme="snow"
          toolbar="full"
          class="article-editor article-editor--expanded"
          placeholder="在这里继续优化你的正文内容。"
        />

        <div class="mt-3 flex items-center justify-between text-xs text-[var(--muted)]">
          <p>当前字数（含空格）：{{ articleTextLength }}</p>
          <button class="rounded-md bg-slate-800 px-3 py-2 text-xs text-white" @click="closeArticleEditor">完成编辑</button>
        </div>
      </article>
    </div>

  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { useGenerationStore } from '../stores/generation'

const store = useGenerationStore()
const selectedTopic = ref('')
const selectedTitle = ref('')
const generatingStep = ref<'topics' | 'article' | 'titles' | null>(null)
const copyStatus = ref<'topics-all' | 'topics-selected' | 'titles-all' | 'titles-selected' | 'article' | null>(null)
const articleEditorOpen = ref(false)
let copyStatusTimer: ReturnType<typeof setTimeout> | null = null

const CUSTOM_OPTION = '__custom__'
const accountTypeOptions = [
  '个人成长',
  '好物分享',
  '知识分享',
  '职场',
  '健身减脂',
  '美妆穿搭',
  '程序员 / 科技',
  '情感关系',
  '母婴育儿',
  '摄影修图',
  '家居收纳',
  '学习方法',
  '英语提升',
  '副业变现',
  '旅行攻略',
  '美食探店',
  '读书写作',
]
const styleOptions = [
  '干货型',
  '经验分享型',
  '避坑型',
  '种草型',
  '反思复盘型',
  '故事叙述型',
  '清单模板型',
  '教程步骤型',
  '观点评论型',
  '数据分析型',
  '问答互动型',
  '科普解释型',
]
const selectedAccountType = ref('健身减脂')
const customAccountType = ref('')
const selectedStyle = ref('经验分享型')
const customStyle = ref('')

const form = reactive({
  topic: '减脂',
  accountType: '健身减脂',
  style: '经验分享型',
  length: '中',
})

const referenceCards = computed(() => store.referenceContexts)
const activeReferenceKey = computed(() => store.activeReferenceKey)
const articleTextLength = computed(() => {
  const plainText = (store.article || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
  return plainText.length
})
const effectiveAccountType = computed(() => {
  if (selectedAccountType.value === CUSTOM_OPTION) return customAccountType.value.trim()
  return selectedAccountType.value
})
const effectiveStyle = computed(() => {
  if (selectedStyle.value === CUSTOM_OPTION) return customStyle.value.trim()
  return selectedStyle.value
})
const loadingTitle = computed(() => {
  if (!store.loading) return ''
  if (generatingStep.value === 'topics') return 'AI 正在生成选题中...'
  if (generatingStep.value === 'article') return 'AI 正在撰写正文中...'
  if (generatingStep.value === 'titles') return 'AI 正在提炼标题中...'
  return 'AI 正在处理中...'
})

watch(
  () => store.primaryReference,
  (reference) => {
    if (!reference) return
    form.topic = reference.topic || form.topic
    applyAccountType(reference.accountType)
    applyStyle(reference.style)
  },
  { immediate: true }
)

watch(
  () => store.composeDraft,
  (draft) => {
    if (!draft) return
    form.topic = draft.topic || form.topic
    applyAccountType(draft.accountType)
    applyStyle(draft.style)
    form.length = draft.length || form.length
    selectedTopic.value = draft.selectedTopic || selectedTopic.value
    if (draft.workflowId) {
      store.workflowId = draft.workflowId
    }
  },
  { immediate: true }
)

async function onGenerateTopics() {
  generatingStep.value = 'topics'
  try {
    const data = await store.generateTopics({
      topic: form.topic,
      accountType: effectiveAccountType.value || undefined,
      style: effectiveStyle.value || '经验分享型',
      length: form.length,
      referenceHistoryIds: store.referenceHistoryIds,
    })
    selectedTopic.value = data.topics[0] || ''
  } finally {
    generatingStep.value = null
  }
}

async function onGenerateArticle() {
  generatingStep.value = 'article'
  try {
    await store.generateArticle({
      workflowId: store.workflowId,
      selectedTopic: selectedTopic.value,
      topic: form.topic,
      accountType: effectiveAccountType.value || undefined,
      style: effectiveStyle.value || '经验分享型',
      length: form.length,
      referenceHistoryIds: store.referenceHistoryIds,
    })
  } finally {
    generatingStep.value = null
  }
}

async function onGenerateTitles() {
  generatingStep.value = 'titles'
  try {
    const data = await store.generateTitles({
      workflowId: store.workflowId,
      article: store.article,
      topic: form.topic,
      style: effectiveStyle.value || '经验分享型',
      referenceHistoryIds: store.referenceHistoryIds,
    })
    selectedTitle.value = data.titles[0] || ''
  } finally {
    generatingStep.value = null
  }
}

function setActiveReference(key: string) {
  store.setActiveReference(key)
}

function removeReference(key: string) {
  store.removeReferenceContext(key)
}

function clearReferenceContext() {
  store.clearReferenceContext()
}

watch(
  () => [form.topic, selectedAccountType.value, customAccountType.value, selectedStyle.value, customStyle.value, form.length, selectedTopic.value, store.workflowId] as const,
  () => {
    if (store.composeDraft) {
      store.clearComposeDraft()
    }
  },
  { once: true }
)

function applyAccountType(value?: string) {
  const text = (value || '').trim()
  if (!text) {
    selectedAccountType.value = ''
    customAccountType.value = ''
    return
  }
  if (accountTypeOptions.includes(text)) {
    selectedAccountType.value = text
    customAccountType.value = ''
    return
  }
  selectedAccountType.value = CUSTOM_OPTION
  customAccountType.value = text
}

function applyStyle(value?: string) {
  const text = (value || '').trim()
  if (!text) {
    selectedStyle.value = '经验分享型'
    customStyle.value = ''
    return
  }
  if (styleOptions.includes(text)) {
    selectedStyle.value = text
    customStyle.value = ''
    return
  }
  selectedStyle.value = CUSTOM_OPTION
  customStyle.value = text
}

async function copyText(text: string) {
  if (!text.trim()) return
  await navigator.clipboard.writeText(text)
}

function showCopyStatus(status: 'topics-all' | 'topics-selected' | 'titles-all' | 'titles-selected' | 'article') {
  copyStatus.value = status
  if (copyStatusTimer) {
    clearTimeout(copyStatusTimer)
  }
  copyStatusTimer = setTimeout(() => {
    copyStatus.value = null
    copyStatusTimer = null
  }, 1800)
}

function openArticleEditor() {
  articleEditorOpen.value = true
  document.body.style.overflow = 'hidden'
}

function closeArticleEditor() {
  articleEditorOpen.value = false
  document.body.style.overflow = ''
}

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

async function copyTopics() {
  await copyText(store.topics.join('\n'))
  showCopyStatus('topics-all')
}

async function copySelectedTopic() {
  if (!selectedTopic.value) return
  await copyText(selectedTopic.value)
  showCopyStatus('topics-selected')
}

async function copyArticle() {
  if (!store.article.trim()) return
  await copyText(store.article)
  showCopyStatus('article')
}

async function copyTitles() {
  await copyText(store.titles.join('\n'))
  showCopyStatus('titles-all')
}

async function copySelectedTitle() {
  if (!selectedTitle.value) return
  await copyText(selectedTitle.value)
  showCopyStatus('titles-selected')
}
</script>

<style scoped>
.article-editor :deep(.ql-container) {
  min-height: 220px;
}

.article-editor--expanded :deep(.ql-container) {
  min-height: calc(100vh - 280px);
}

</style>
