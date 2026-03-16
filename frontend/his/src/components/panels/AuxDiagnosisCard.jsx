/**
 * AuxDiagnosisCard — 辅助诊断（合同 2.2）
 *
 * 两个区块：
 *  ① HIS 已确认诊断 — 来自 patient store，可复制 / 查阅详情
 *  ② AI 智能推荐    — GLM 基于主诉+检验+病史推断，按可能性排序，
 *                     展示支持证据，可跳转疾病详情
 */
import { useState } from 'react'
import { Stethoscope, ExternalLink, Loader2, PlusCircle, CheckCircle2 } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { usePatientStore } from '@/stores/patient'
import { useClinicalContextStore } from '@/stores/clinicalContext'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

/* ── 评分颜色 ───────────────────────────────────────────────────── */
function scoreStyle(score) {
  if (score >= 0.8) return { bar: 'bg-danger',   text: 'text-danger',   label: '高' }
  if (score >= 0.6) return { bar: 'bg-warning',  text: 'text-warning',  label: '中' }
  return               { bar: 'bg-gray-400',  text: 'text-gray-500', label: '低' }
}

/* ── 主组件 ─────────────────────────────────────────────────────── */
export function AuxDiagnosisCard({ defaultOpen = true }) {
  const patient     = usePatientStore(s => s.context)
  const navigate    = useNavigate()
  const { diagnosisSuggestions, isSuggesting } = useClinicalContextStore()

  return (
    <CollapsibleCard
      title="辅助诊断"
      iconBg="bg-blue-500"
      icon={<Stethoscope size={11} className="text-white" />}
      defaultOpen={defaultOpen}
      badge={isSuggesting ? undefined : diagnosisSuggestions.length > 0 ? diagnosisSuggestions.length : undefined}
      extra={isSuggesting && <Loader2 size={11} className="text-primary animate-spin" />}
    >
      {isSuggesting && diagnosisSuggestions.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded bg-gray-50 animate-pulse" />
          ))}
        </div>
      )}

      {!isSuggesting && diagnosisSuggestions.length === 0 && (() => {
        const hisDx = patient?.diagnosis_names || []
        if (!hisDx.length) {
          return <p className="text-xs text-gray-400">暂无推荐（患者数据不足）</p>
        }
        return (
          <div className="space-y-1">
            <p className="text-2xs text-gray-400 mb-1.5">
              ℹ HIS 已确认诊断（AI推断暂不可用）
            </p>
            {hisDx.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-border
                           bg-gray-50 hover:border-primary-200 transition-colors group"
              >
                <span className="text-xs text-gray-700 flex-1 truncate">{name}</span>
                <button
                  onClick={() => navigate(`/knowledge/disease/${encodeURIComponent(name)}`)}
                  title="查阅疾病详情"
                  className="text-gray-300 hover:text-primary flex-shrink-0 transition-colors
                             opacity-0 group-hover:opacity-100"
                >
                  <ExternalLink size={12} />
                </button>
              </div>
            ))}
          </div>
        )
      })()}

      {diagnosisSuggestions.length > 0 && (() => {
        const main  = diagnosisSuggestions.filter(s => !s.needs_rule_out)
        const diffs = diagnosisSuggestions.filter(s =>  s.needs_rule_out)
        return (
          <>
            {/* 推荐诊断 */}
            {main.length > 0 && (
              <div className="space-y-1.5">
                {main.map((s, i) => (
                  <SuggestionItem
                    key={i}
                    suggestion={s}
                    onDetail={() => navigate(`/knowledge/disease/${s.icd_code || 'unknown'}`)}
                  />
                ))}
              </div>
            )}

            {/* 鉴别诊断 */}
            {diffs.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-2xs text-gray-400 font-medium">鉴别诊断</span>
                  <div className="flex-1 border-t border-dashed border-border" />
                </div>
                <div className="space-y-1.5">
                  {diffs.map((s, i) => (
                    <SuggestionItem
                      key={i}
                      suggestion={s}
                      onDetail={() => navigate(`/knowledge/disease/${s.icd_code || 'unknown'}`)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )
      })()}
    </CollapsibleCard>
  )
}

/* ── AI 推荐诊断行 ──────────────────────────────────────────────── */
function SuggestionItem({ suggestion, onDetail }) {
  const { disease_name, icd_code, match_score, evidence = [], needs_rule_out } = suggestion
  const style  = scoreStyle(match_score)
  const pct    = Math.round((match_score || 0) * 100)
  const [added, setAdded] = useState(false)

  const handleAdd = (e) => {
    e.stopPropagation()
    console.log('[HIS WriteBack] diagnosis', { disease_name, icd_code })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="rounded border border-border bg-white overflow-hidden
                    hover:border-primary-200 transition-colors group">
      {/* 标题行 */}
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        {/* 评分条 */}
        <div className="flex items-center gap-1.5 flex-shrink-0 w-16">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', style.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn('text-2xs font-medium w-6 text-right', style.text)}>
            {pct}%
          </span>
        </div>

        {/* 疾病名 */}
        <span className="text-xs font-medium text-gray-800 flex-1 truncate">
          {disease_name}
        </span>

        {/* ICD */}
        {icd_code && (
          <span className="text-2xs text-gray-400 flex-shrink-0">{icd_code}</span>
        )}

        {/* 查阅详情 */}
        <button
          onClick={onDetail}
          title="查阅疾病详情"
          className="text-gray-300 hover:text-primary flex-shrink-0 transition-colors
                     opacity-0 group-hover:opacity-100"
        >
          <ExternalLink size={12} />
        </button>

        {/* 仅推荐诊断可添加至 HIS，鉴别诊断为待排除项不可直接写入 */}
        {!needs_rule_out && (
          <button
            onClick={handleAdd}
            title="添加诊断至 HIS"
            className={cn(
              'flex-shrink-0 transition-colors',
              added ? 'text-success' : 'text-gray-300 hover:text-primary'
            )}
          >
            {added ? <CheckCircle2 size={13} /> : <PlusCircle size={13} />}
          </button>
        )}
      </div>

      {/* 支持证据 */}
      {evidence.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
          {evidence.map((ev, i) => (
            <span
              key={i}
              className="text-2xs text-gray-500 bg-gray-50 border border-gray-200
                         px-1.5 py-px rounded-full"
            >
              {ev}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
