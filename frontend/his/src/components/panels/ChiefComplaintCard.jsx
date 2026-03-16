/**
 * ChiefComplaintCard — 主诉确认区
 *
 * 设计原则：系统自动完成，医生只需确认
 *  - 主诉文本由 GLM 自动生成
 *  - 实体摘要（症状/诊断/危急）自动提取，只读展示
 *  - 追问问题至多2条，内联展示，答完自动刷新主诉
 *  - 唯一主动操作：确认主诉 → 回写至 HIS
 *  - 少数情况：点 ✏ 进入编辑模式微调文本
 */
import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClinicalContextStore } from '@/stores/clinicalContext'

export function ChiefComplaintCard() {
  const {
    isExtracting,
    entities,
    followUpQuestions,
    followUpAnswers,
    structuredSummary,
    answerFollowUp,
  } = useClinicalContextStore()

  // ── 本地编辑状态 ──────────────────────────────────────────────
  const [isEditing,     setIsEditing]     = useState(false)
  const [editText,      setEditText]      = useState('')
  const [manuallyEdited, setManuallyEdited] = useState(false)
  const [confirmed,     setConfirmed]     = useState(false)
  const [confirmFlash,  setConfirmFlash]  = useState(false)

  // 当 GLM 生成新主诉时，若用户未手动编辑，自动同步
  useEffect(() => {
    if (!manuallyEdited && structuredSummary) {
      setEditText(structuredSummary)
    }
  }, [structuredSummary, manuallyEdited])

  // 追问回答后允许自动更新文本
  const handleAnswerFollowUp = (qId, answer) => {
    answerFollowUp(qId, answer)
    setManuallyEdited(false)  // 重新允许 GLM 自动更新
  }

  const handleSave = () => {
    setIsEditing(false)
    setManuallyEdited(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditText(structuredSummary || '')
    setManuallyEdited(false)
  }

  const handleRestoreAI = () => {
    setManuallyEdited(false)
    setEditText(structuredSummary || '')
  }

  const handleConfirm = () => {
    const finalText = editText || structuredSummary
    // Mock：模拟回写至 HIS
    console.log('[HIS WriteBack]', { chief_complaint: finalText, entities })
    setConfirmFlash(true)
    setTimeout(() => setConfirmFlash(false), 2500)
  }

  const displayText  = editText || structuredSummary
  const hasContent   = !!(displayText || entities)
  const unansweredQs = followUpQuestions.filter(q => !followUpAnswers[q.id])

  return (
    <div className="bg-white border-b border-border">

      {/* ── 标题行 ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-800">主诉</span>
          {isExtracting && (
            <Loader2 size={11} className="text-primary animate-spin" />
          )}
          {!isExtracting && displayText && (
            <CheckCircle2 size={11} className="text-success" />
          )}
        </div>

      </div>

      <div className="px-3 pb-3 space-y-2.5">

        {/* ── 主诉文本区 ──────────────────────────────────────── */}
        {displayText ? (
          <div className="relative">
            {isEditing ? (
              /* 编辑模式 */
              <>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full text-xs text-gray-800 leading-relaxed p-2.5
                             border border-primary rounded resize-none focus:outline-none
                             focus:ring-1 focus:ring-primary"
                  rows={4}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-1">
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-0.5 text-2xs text-gray-400 hover:text-gray-600"
                  >
                    <X size={10} /> 取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="text-2xs text-white bg-primary px-2 py-0.5 rounded hover:bg-primary/90"
                  >
                    保存
                  </button>
                </div>
              </>
            ) : (
              /* 只读模式 */
              <div className="relative rounded bg-gray-50 border border-border px-2.5 py-2.5">
                <p className="text-xs text-gray-800 leading-relaxed pr-10">{displayText}</p>
                <button
                  onClick={() => { setIsEditing(true); setEditText(displayText) }}
                  className="absolute top-2 right-2 flex items-center gap-0.5
                             text-2xs text-gray-300 hover:text-primary transition-colors"
                  title="编辑主诉"
                >
                  <Pencil size={11} />
                </button>
              </div>
            )}

            {/* 已手动编辑提示 */}
            {manuallyEdited && !isEditing && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xs text-gray-400">已手动编辑</span>
                <button
                  onClick={handleRestoreAI}
                  className="text-2xs text-primary hover:underline"
                >
                  恢复AI生成
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 空状态 */
          <div className="rounded border border-dashed border-border px-3 py-4 text-center">
            {isExtracting ? (
              <div className="flex items-center justify-center gap-1.5 text-2xs text-primary">
                <Loader2 size={11} className="animate-spin" />
                正在分析…
              </div>
            ) : (
              <p className="text-2xs text-gray-400">暂无主诉信息</p>
            )}
          </div>
        )}

        {/* ── 实体摘要（只读，紧凑展示）──────────────────────── */}
        {entities && (
          <div className="grid grid-cols-1 gap-0.5">
            {entities.symptoms?.length > 0 && (
              <EntityLine
                label="症状"
                items={entities.symptoms.slice(0, 4).map(s =>
                  s.duration ? `${s.name}·${s.duration}` : s.name
                )}
                color="text-gray-700"
              />
            )}
            {entities.diagnoses_mentioned?.length > 0 && (
              <EntityLine
                label="诊断"
                items={entities.diagnoses_mentioned}
                color="text-success font-medium"
              />
            )}
            {entities.risk_signals?.length > 0 && (
              <EntityLine
                label="危急"
                items={entities.risk_signals}
                color="text-danger font-medium"
                prefix="⚠ "
              />
            )}
          </div>
        )}

        {/* ── 内联追问（最多2条，HIS能答的已过滤）──────────── */}
        {unansweredQs.slice(0, 2).map(q => (
          <div key={q.id} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-2xs text-gray-400 flex-shrink-0">💬</span>
              <span className="text-2xs text-gray-600">{q.question}</span>
            </div>
            <div className="flex flex-wrap gap-1 pl-4">
              {q.options.slice(0, 4).map(opt => (
                <button
                  key={opt}
                  onClick={() => handleAnswerFollowUp(q.id, opt)}
                  className="text-2xs px-2 py-0.5 rounded-full border border-border
                             bg-white text-gray-600 hover:border-primary hover:text-primary
                             transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 已回答的追问小结 */}
        {Object.entries(followUpAnswers).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(followUpAnswers).map(([qId, answer]) => {
              const q = followUpQuestions.find(q => q.id === qId)
              return (
                <span key={qId} className="text-2xs text-success">
                  ✓ {answer}
                </span>
              )
            })}
          </div>
        )}

        {/* ── 确认回写按钮 ─────────────────────────────────────── */}
        {hasContent && (
          <button
            onClick={handleConfirm}
            className={cn(
              'w-full py-2 rounded text-xs font-medium transition-all duration-300',
              confirmFlash
                ? 'bg-success text-white'
                : 'bg-primary text-white hover:bg-primary/90 active:scale-[0.99]'
            )}
          >
            {confirmFlash ? '✓ 已回写至 HIS' : '确认主诉，回写至 HIS'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── 实体行（紧凑文字版）──────────────────────────────────────── */
function EntityLine({ label, items, color, prefix = '' }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-2xs text-gray-400 w-6 flex-shrink-0">{label}</span>
      <span className={cn('text-2xs leading-relaxed', color)}>
        {items.map((item, i) => (
          <span key={i}>
            {prefix}{item}{i < items.length - 1 ? '　' : ''}
          </span>
        ))}
      </span>
    </div>
  )
}
