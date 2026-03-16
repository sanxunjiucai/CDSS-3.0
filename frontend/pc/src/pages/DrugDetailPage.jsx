import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Pill, AlertTriangle } from 'lucide-react'
import { drugApi } from '@/api'
import { DetailSection, RichText } from '@/components/common/DetailSection'
import { TagBadge } from '@/components/common/TagBadge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistoryStore } from '@/stores/history'

export function DrugDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const addRecord = useHistoryStore(s => s.addRecord)

  const [drug, setDrug]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    drugApi.detail(id)
      .then(data => {
        setDrug(data)
        addRecord({ id, type: 'drug', name: data.name, path: `/drugs/${id}` })
      })
      .catch(() => setDrug(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />

  if (!drug) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-gray-500">未找到该药品信息</p>
        <button onClick={() => navigate('/drugs')} className="text-primary text-sm hover:underline">
          返回药品库
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/drugs')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary transition-colors mb-4"
      >
        <ChevronLeft size={14} />
        返回药品库
      </button>

      {/* 标题卡 */}
      <div className="bg-white border border-border rounded-xl px-6 py-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <Pill size={22} className="text-green-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{drug.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {drug.trade_name && (
                <TagBadge color="default">商品名：{drug.trade_name}</TagBadge>
              )}
              {drug.category && (
                <TagBadge color="primary">{drug.category}</TagBadge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <DetailSection title="适应症" defaultOpen={true}>
          <RichText content={drug.indications} />
        </DetailSection>

        <DetailSection title="用法用量">
          <RichText content={drug.dosage} />
        </DetailSection>

        <DetailSection title="禁忌">
          {drug.contraindications ? (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-md px-4 py-3">
              <div className="flex items-center gap-1.5 text-danger text-sm font-medium mb-2">
                <AlertTriangle size={14} />
                禁忌事项
              </div>
              <RichText content={drug.contraindications} />
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-3">暂无禁忌信息</p>
          )}
        </DetailSection>

        <DetailSection title="不良反应">
          <RichText content={drug.adverse_reactions} />
        </DetailSection>

        <DetailSection title="药物相互作用">
          <RichText content={drug.interactions} />
        </DetailSection>

        <DetailSection title="特殊人群用药">
          <RichText content={drug.special_population} />
        </DetailSection>
      </div>
    </div>
  )
}
