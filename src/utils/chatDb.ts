// 轻量 IndexedDB 封装，用于多会话持久化

export interface StoredMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  isTyping?: boolean
}

export interface StoredConversation {
  id: string
  title: string
  personaId: string
  model: string
  createdAt: number
  updatedAt: number
  messages: StoredMessage[]
}

const DB_NAME = 'stackout-ai'
const DB_VERSION = 1
const STORE_NAME = 'chat'
const KEY_CONVERSATIONS = 'conversations'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const request = handler(store)

    request.onsuccess = () => resolve(request.result as T)
    request.onerror = () => reject(request.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function loadConversations(): Promise<StoredConversation[] | null> {
  try {
    const result = await withStore<StoredConversation | undefined>('readonly', (store) =>
      store.get(KEY_CONVERSATIONS)
    )
    if (!result) return null
    // 兼容历史结构：如果未来拆分为数组之外的结构，这里可以扩展
    return Array.isArray(result) ? (result as unknown as StoredConversation[]) : [result]
  } catch {
    return null
  }
}

export async function saveConversations(conversations: StoredConversation[]): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(conversations, KEY_CONVERSATIONS))
  } catch {
    // 持久化失败时静默失败，避免影响主流程
  }
}

