import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { get } from '@shared/api/request'
import { cn } from '@/lib/utils'

const TYPE_MAP = {
  disease: { label: '疾病', api: '/diseases', tabs: ['概述', '症状', '诊断标准', '治疗方案', '预后'] },
  drug:    { label: '药品', api: '/drugs',    tabs: ['适应症', '用法用量', '禁忌', '相互作用', '不良反应'] },
  exam:    { label: '检验', api: '/exams',    tabs: ['项目说明', '参考范围', '临床意义', '检查前准备'] },
}

const FIELD_MAP = {
  disease: ['overview', 'symptoms', 'diagnosis_criteria', 'treatment', 'prognosis'],
  drug:    ['indications', 'dosage', 'contraindications', 'interactions', 'adverse_reactions'],
  exam:    ['description', null, 'clinical_significance', 'preparation'],
}

export function KnowledgeDetail() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)

  const config = TYPE_MAP[type]
  const fields = FIELD_MAP[type]

  useEffect(() => {
    if (!config) return
    setLoading(true)
    get(`${config.api}/${id}`)
      .then(setData)
      .finally(() => setLoading(false))
  }, [id, type])

  if (!config) return <div className="p-3 text-sm text-gray-500">未知类型</div>

  return (
    <div className="flex flex-col h-full">
      {/* 顶部返回栏 */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-6 h-6 rounded flex items-center justify-center
                     text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-gray-800 flex-1 truncate">
          {loading ? '加载中...' : (data?.name || data?.title || '-')}
        </span>
        {data && (
          <button
            onClick={() => window.open(`/pc/#/${type}s/${id}`, '_blank')}
            className="text-primary hover:text-primary-600"
            title="在PC端查看完整内容"
          >
            <ExternalLink size={13} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* 基本信息行 */}
          {type === 'disease' && (
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs text-gray-500">
              {data.icd_code && (
                <span className="bg-gray-100 px-1.5 py-0.5 rounded-sm">ICD: {data.icd_code}</span>
              )}
              {data.department && (
                <span className="bg-gray-100 px-1.5 py-0.5 rounded-sm">{data.department}</span>
              )}
            </div>
          )}
          {type === 'drug' && (
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs text-gray-500">
              {data.trade_name && <span className="bg-gray-100 px-1.5 py-0.5 rounded-sm">{data.trade_name}</span>}
              {data.category   && <span className="bg-gray-100 px-1.5 py-0.5 rounded-sm">{data.category}</span>}
            </div>
          )}

          {/* Tab 切换 */}
          <div className="flex gap-1 mb-2 flex-wrap flex-shrink-0">
            {config.tabs.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(i)}
                className={cn(
                  'text-xs px-2 py-1 rounded-sm border transition-colors',
                  tab === i
                    ? 'bg-primary text-white border-primary'
                    : 'text-gray-600 border-border hover:border-primary hover:text-primary'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto">
            {/* 参考范围特殊处理（检验） */}
            {type === 'exam' && tab === 1 ? (
              <ReferenceRanges ranges={data.reference_ranges} />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {data[fields[tab]] || '暂无内容'}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-400 text-center mt-8">数据不存在</div>
      )}
    </div>
  )
}

function ReferenceRanges({ ranges = [] }) {
  if (!ranges.length) return <p className="text-sm text-gray-400">暂无参考范围数据</p>
  return (
    <div className="space-y-1.5">
      {ranges.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1.5">
          <span className="text-gray-500 w-8 flex-shrink-0">
            {r.gender === 'male' ? '男' : r.gender === 'female' ? '女' : '通用'}
          </span>
          <span className="font-semibold text-gray-800">
            {r.low} ~ {r.high} {r.unit}
          </span>
          {r.condition && <span className="text-gray-400">({r.condition})</span>}
        </div>
      ))}
    </div>
  )
}
