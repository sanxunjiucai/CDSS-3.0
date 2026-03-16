import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Newspaper, ExternalLink } from 'lucide-react'
import { literatureApi } from '@/api'
import { DetailSection, RichText } from '@/components/common/DetailSection'
import { TagBadge } from '@/components/common/TagBadge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistoryStore } from '@/stores/history'

export function LiteratureDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addRecord = useHistoryStore(s => s.addRecord)

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    literatureApi.detail(id)
      .then(data => {
        setItem(data)
        addRecord({ id, type: 'literature', name: data.title || id, path: `/literature/${id}` })
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-gray-500">未找到该文献信息</p>
        <button onClick={() => navigate('/literature')} className="text-primary text-sm hover:underline">
          返回动态文献库
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/literature')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-4"
      >
        <ChevronLeft size={14} />
        返回动态文献库
      </button>

      <div className="bg-white border border-border rounded-xl px-6 py-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Newspaper size={22} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {item.department && <TagBadge color="purple">{item.department}</TagBadge>}
              {item.publish_year && <TagBadge color="default">{item.publish_year}年</TagBadge>}
              {item.journal && <span className="text-sm text-gray-500">{item.journal}</span>}
            </div>
          </div>
          {item.source_url && (
            <button
              onClick={() => window.open(item.source_url, '_blank')}
              className="flex items-center gap-1.5 text-sm text-primary bg-primary-50 px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors flex-shrink-0"
            >
              <ExternalLink size={14} />
              查看原文
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {item.abstract && (
          <DetailSection title="摘要" defaultOpen={true}>
            <RichText content={item.abstract} />
          </DetailSection>
        )}
        {item.authors?.length > 0 && (
          <DetailSection title="作者" defaultOpen={true}>
            <p className="text-sm text-gray-700">{item.authors.join(', ')}</p>
          </DetailSection>
        )}
        {item.keywords?.length > 0 && (
          <DetailSection title="关键词" defaultOpen={true}>
            <p className="text-sm text-gray-700">{item.keywords.join(' / ')}</p>
          </DetailSection>
        )}
      </div>
    </div>
  )
}
