import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, BookOpen, Download, ExternalLink } from 'lucide-react'
import { guidelineApi } from '@/api'
import { DetailSection, RichText } from '@/components/common/DetailSection'
import { TagBadge } from '@/components/common/TagBadge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistoryStore } from '@/stores/history'

export function GuidelineDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const addRecord = useHistoryStore(s => s.addRecord)

  const [item, setItem]         = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    guidelineApi.detail(id)
      .then(data => {
        setItem(data)
        addRecord({ id, type: 'guideline', name: data.title || data.name, path: `/guidelines/${id}` })
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-gray-500">未找到该指南信息</p>
        <button onClick={() => navigate('/guidelines')} className="text-primary text-sm hover:underline">
          返回指南库
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/guidelines')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-4"
      >
        <ChevronLeft size={14} />
        返回临床指南库
      </button>

      <div className="bg-white border border-border rounded-xl px-6 py-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <BookOpen size={22} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{item.title || item.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {item.department   && <TagBadge color="purple">{item.department}</TagBadge>}
              {item.publish_year && <TagBadge color="default">{item.publish_year}年</TagBadge>}
              {item.organization && <span className="text-sm text-gray-500">{item.organization}</span>}
            </div>
          </div>
          {item.file_url && (
            <button
              onClick={() => window.open(item.file_url, '_blank')}
              className="flex items-center gap-1.5 text-sm text-primary bg-primary-50
                         px-4 py-2 rounded-lg hover:bg-primary-100 transition-colors flex-shrink-0"
            >
              <Download size={14} />
              下载原文
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {item.summary && (
          <DetailSection title="摘要" defaultOpen={true}>
            <RichText content={item.summary} />
          </DetailSection>
        )}

        {item.content && (
          <DetailSection title="指南正文" defaultOpen={true}>
            <RichText content={item.content} />
          </DetailSection>
        )}

        {item.file_url && (
          <div className="bg-primary-50 border border-primary/20 rounded-md px-5 py-4
                          flex items-center justify-between">
            <span className="text-sm text-primary">该指南提供原文PDF下载</span>
            <button
              onClick={() => window.open(item.file_url, '_blank')}
              className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
            >
              <ExternalLink size={13} />
              查看原文
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
