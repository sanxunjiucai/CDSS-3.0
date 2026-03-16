import { useState, useEffect, useCallback } from 'react'

/**
 * 通用列表页逻辑 hook
 * @param {Function} fetchFn  - (params) => Promise<{ items, total, total_pages }>
 * @param {number}   pageSize
 */
export function useListPage(fetchFn, pageSize = 20) {
  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [totalPages, setPages]  = useState(0)
  const [page, setPage]         = useState(1)
  const [q, setQ]               = useState('')
  const [inputQ, setInputQ]     = useState('')
  const [loading, setLoading]   = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchFn({ page, pageSize, q: q || undefined })
      .then(data => {
        setItems(data.items || [])
        setTotal(data.total || 0)
        setPages(data.total_pages || 0)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [fetchFn, page, pageSize, q])

  useEffect(() => { load() }, [load])

  const handleSearch = () => {
    setPage(1)
    setQ(inputQ.trim())
  }

  const handlePageChange = (p) => {
    setPage(p)
    window.scrollTo(0, 0)
  }

  return {
    items, total, totalPages, page, q, inputQ,
    loading,
    setInputQ,
    handleSearch,
    handlePageChange,
    reload: load,
  }
}
