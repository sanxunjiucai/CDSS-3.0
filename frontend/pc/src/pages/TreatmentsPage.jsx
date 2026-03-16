import { useState } from 'react'
import { Stethoscope, Search, ChevronRight } from 'lucide-react'
import { diseaseApi, treatmentApi } from '@/api'
import { RichText } from '@/components/common/DetailSection'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { TagBadge } from '@/components/common/TagBadge'

export function TreatmentsPage() {
  const [q, setQ]               = useState('')
  const [diseases, setDiseases] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)   // { id, name }
  const [treatment, setTreatment] = useState(null)
  const [loading, setLoading]   = useState(false)

  const handleSearch = async () => {
    const kw = q.trim()
    if (!kw) return
    setSearching(true)
    setSelected(null)
    setTreatment(null)
    try {
      const data = await diseaseApi.list({ q: kw, pageSize: 20 })
      setDiseases(data.items || [])
    } catch {
      setDiseases([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelect = async (disease) => {
    setSelected(disease)
    setTreatment(null)
    setLoading(true)
    try {
      const data = await treatmentApi.get(disease.id)
      setTreatment(data)
    } catch {
      setTreatment({ error: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Stethoscope size={16} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">治疗方案查询</h1>
          <p className="text-sm text-gray-500">搜索疾病，查阅临床治疗方案与用药建议</p>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="flex gap-2 mb-6 max-w-[560px]">
        <div className="flex items-center gap-2 flex-1 bg-white border border-border rounded-lg
                        px-3 py-2 focus-within:border-primary transition-colors">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="输入疾病名称，如：高血压、2型糖尿病..."
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg
                     hover:bg-primary-600 transition-colors whitespace-nowrap"
        >
          查询
        </button>
      </div>

      <div className="flex gap-5">
        {/* 左：疾病列表 */}
        {(diseases.length > 0 || searching) && (
          <div className="w-[260px] flex-shrink-0">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
              匹配疾病（{diseases.length}）
            </p>
            {searching ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-1">
                {diseases.map(d => (
                  <button
                    key={d.id}
                    onClick={() => handleSelect(d)}
                    className={`w-full flex items-center justify-between px-3 py-2.5
                               text-sm rounded-md border transition-colors text-left
                               ${selected?.id === d.id
                                 ? 'bg-primary-50 border-primary/30 text-primary font-medium'
                                 : 'bg-white border-border text-gray-700 hover:border-primary/40 hover:bg-primary-50/50'
                               }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.name}</p>
                      {d.department && (
                        <p className="text-xs text-gray-400 mt-0.5">{d.department}</p>
                      )}
                    </div>
                    <ChevronRight size={14} className="flex-shrink-0 ml-2 opacity-50" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 右：治疗方案详情 */}
        <div className="flex-1 min-w-0">
          {!selected && diseases.length === 0 && !searching && (
            <EmptyState
              type="search"
              message="请在左侧搜索疾病名称，选择后查看对应治疗方案"
            />
          )}

          {selected && loading && <LoadingSpinner />}

          {selected && !loading && treatment && (
            <div className="bg-white border border-border rounded-md overflow-hidden">
              {/* 标题 */}
              <div className="px-5 py-4 border-b border-border bg-gray-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Stethoscope size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {treatment.disease_name || selected.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">临床治疗方案</p>
                  </div>
                </div>
              </div>

              {treatment.error ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                  暂无该疾病的治疗方案数据
                </div>
              ) : (
                <div className="px-5 pb-6">
                  {/* 个性化注记 */}
                  {treatment.personalized_notes && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                      <p className="text-xs font-medium text-amber-700 mb-1">个性化提示</p>
                      <p className="text-sm text-amber-800">{treatment.personalized_notes}</p>
                    </div>
                  )}
                  {/* 治疗方案正文 */}
                  <RichText content={treatment.treatment_text} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
