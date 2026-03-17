import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Activity } from 'lucide-react'
import { diseaseApi, drugApi, examApi } from '@/api'
import { DetailSection, RichText } from '@/components/common/DetailSection'
import { TagBadge } from '@/components/common/TagBadge'
import { KnowledgeCard } from '@/components/common/KnowledgeCard'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useHistoryStore } from '@/stores/history'

export function DiseaseDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const addRecord  = useHistoryStore(s => s.addRecord)

  const [disease, setDisease]     = useState(null)
  const [relDrugs, setRelDrugs]   = useState([])
  const [relExams, setRelExams]   = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    setLoading(true)
    diseaseApi.detail(id)
      .then(data => {
        setDisease(data)
        addRecord({ id, type: 'disease', name: data.name, path: `/diseases/${id}` })

        // 加载关联药品（最多3条）
        if (data.related_drug_ids?.length) {
          Promise.all(data.related_drug_ids.slice(0, 3).map(drugApi.detail))
            .then(setRelDrugs)
            .catch(() => {})
        }
        // 加载关联检验（最多3条）
        if (data.related_exam_ids?.length) {
          Promise.all(data.related_exam_ids.slice(0, 3).map(examApi.detail))
            .then(setRelExams)
            .catch(() => {})
        }
      })
      .catch(() => setDisease(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <LoadingSpinner />

  if (!disease) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-gray-500">未找到该疾病信息</p>
        <button onClick={() => navigate('/diseases')} className="text-primary text-sm hover:underline">
          返回疾病库
        </button>
      </div>
    )
  }

  const overviewContent = disease.overview || disease.definition || disease.etiology || disease.symptoms || disease.treatment
  const definitionContent = disease.definition || disease.overview
  const diagnosisContent = disease.diagnosis_criteria || disease.differential_diagnosis

  return (
    <div>
      {/* 面包屑 */}
      <button
        onClick={() => navigate('/diseases')}
        className="flex items-center gap-1 text-sm text-gray-400 hover:text-primary
                   transition-colors mb-4"
      >
        <ChevronLeft size={14} />
        返回疾病库
      </button>

      {/* 标题卡 */}
      <div className="bg-white border border-border rounded-xl px-6 py-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Activity size={22} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{disease.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {disease.icd_code && (
                <TagBadge color="primary">ICD: {disease.icd_code}</TagBadge>
              )}
              {disease.department && (
                <TagBadge color="default">{disease.department}</TagBadge>
              )}
              {disease.system && (
                <TagBadge color="default">{disease.system}</TagBadge>
              )}
              {disease.alias?.map(a => (
                <TagBadge key={a} color="default">{a}</TagBadge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 内容分节 */}
      <div className="space-y-3">
        <DetailSection title="概述" defaultOpen={true}>
          <RichText content={overviewContent} />
        </DetailSection>

        <DetailSection title="定义">
          <RichText content={definitionContent} />
        </DetailSection>

        <DetailSection title="病因与发病机制">
          <RichText content={[disease.etiology, disease.pathogenesis].filter(Boolean).join('\n\n')} />
        </DetailSection>

        <DetailSection title="临床表现与症状">
          <RichText content={disease.symptoms} />
        </DetailSection>

        <DetailSection title="诊断标准">
          <RichText content={diagnosisContent} />
        </DetailSection>

        <DetailSection title="鉴别诊断">
          <RichText content={disease.differential_diagnosis} />
        </DetailSection>

        <DetailSection title="并发症">
          <RichText content={disease.complications} />
        </DetailSection>

        <DetailSection title="治疗方案">
          <RichText content={disease.treatment} />
        </DetailSection>

        <DetailSection title="预后">
          <RichText content={disease.prognosis} />
        </DetailSection>

        <DetailSection title="预防与随访">
          <RichText content={[disease.prevention, disease.follow_up].filter(Boolean).join('\n\n')} />
        </DetailSection>

        {(disease.source || disease.version_no) && (
          <DetailSection title="来源信息" defaultOpen={false}>
            <RichText
              content={[
                disease.source ? `数据来源：${disease.source}` : '',
                disease.version_no ? `版本号：${disease.version_no}` : '',
              ].filter(Boolean).join('\n')}
            />
          </DetailSection>
        )}

        {/* 关联推荐 */}
        {relDrugs.length > 0 && (
          <DetailSection title="相关药品" defaultOpen={false}>
            <div className="space-y-2 mt-3">
              {relDrugs.map(d => (
                <KnowledgeCard key={d.id} item={d} type="drug" />
              ))}
            </div>
          </DetailSection>
        )}

        {relExams.length > 0 && (
          <DetailSection title="相关检验检查" defaultOpen={false}>
            <div className="space-y-2 mt-3">
              {relExams.map(e => (
                <KnowledgeCard key={e.id} item={e} type="exam" />
              ))}
            </div>
          </DetailSection>
        )}
      </div>
    </div>
  )
}
