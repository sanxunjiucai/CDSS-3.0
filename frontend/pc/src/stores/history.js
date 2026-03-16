import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_HISTORY = 20

/**
 * 浏览历史 Store（持久化到 LocalStorage）
 */
export const useHistoryStore = create(
  persist(
    (set, get) => ({
      records: [],   // [{ id, type, name, path, visitedAt }]

      addRecord(item) {
        const records = get().records.filter(r => !(r.id === item.id && r.type === item.type))
        set({ records: [{ ...item, visitedAt: Date.now() }, ...records].slice(0, MAX_HISTORY) })
      },

      clearHistory() {
        set({ records: [] })
      },
    }),
    { name: 'cdss-history' }
  )
)
