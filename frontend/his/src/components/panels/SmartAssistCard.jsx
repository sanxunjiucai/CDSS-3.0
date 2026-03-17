/**
 * SmartAssistCard — 智能辅助（重构版）
 * 单辅助项聚焦模式
 */
import { useState } from 'react'
import { Sparkles, AlertTriangle, ChevronDown, ChevronRight, Play, SkipForward, SkipBack } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePatientStore } from '@/stores/patient'
import { useClinicalContextStore } from '@/stores/clinicalContext'
import { useAssistItems } from '@/hooks/useAssistItems'
import { useDemoModeStore } from '@/stores/demoMode'
import { STAGE_META } from '@/hooks/useWorkflowStage'

export function SmartAssistCard() {
  const patient = usePatientStore(s => s.context)
  const clinicalContext = useClinicalContextStore()
  const { current, pending, confirmed } = useAssistItems(patient, clinicalContext)

  const demoMode = useDemoModeStore()
  const demoItem = demoMode.getCurrentItem()

  const [open, setOpen] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [showConfirmed, setShowConfirmed] = useState(false)

  if (!patient) return null

  const stage = clinicalContext?.entities?.stage_hint || 'initial'
  const stageMeta = STAGE_META[stage] || STAGE_META.initial

  // 演示模式优先
  const displayItem = demoMode.enabled ? demoItem : current

  return (
    <div className="bg-white border-b border-border">
      {/* 标题行 */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-primary" />
          <span className="text-xs font-semibold text-gray-800">智能辅助</span>
          {demoMode.enabled ? (
            <span className="text-2xs text-orange-500">演示模式</span>
          ) : (
            <span className={cn('text-2xs', stageMeta.color)}>
              {stageMeta.label}
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          className={cn('text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {/* 演示模式控制 */}
          {!demoMode.enabled ? (
            <button
              onClick={() => demoMode.enableDemo()}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-2xs text-primary border border-primary rounded hover:bg-primary-50"
            >
              <Play size={10} />
              启动演示流程
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => demoMode.prevStep()}
                disabled={demoMode.currentStep === 0}
                className="flex items-center gap-1 px-2 py-1 text-2xs border border-border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                <SkipBack size={10} />
                上一步
              </button>
              <span className="text-2xs text-gray-500">
                {demoMode.currentStep + 1} / {demoMode.steps.length}
              </span>
              <button
                onClick={() => demoMode.nextStep()}
                disabled={demoMode.currentStep === demoMode.steps.length - 1}
                className="flex items-center gap-1 px-2 py-1 text-2xs border border-border rounded hover:bg-gray-50 disabled:opacity-30"
              >
                下一步
                <SkipForward size={10} />
              </button>
              <button
                onClick={() => demoMode.disableDemo()}
                className="px-2 py-1 text-2xs text-gray-500 hover:text-gray-700"
              >
                退出
              </button>
            </div>
          )}

          {/* 当前辅助项 */}
          {displayItem ? (
            <AssistItemCard item={displayItem} />
          ) : (
            <div className="text-xs text-gray-400 text-center py-4">
              当前无待处理辅助项
            </div>
          )}

          {/* 更多建议 / 已采纳 */}
          {!demoMode.enabled && (
            <div className="flex items-center gap-2 text-2xs">
              {pending.length > 0 && (
                <button
                  onClick={() => setShowMore(!showMore)}
                  className="flex items-center gap-1 text-gray-500 hover:text-primary"
                >
                  <ChevronRight size={10} className={cn('transition-transform', showMore && 'rotate-90')} />
                  更多建议 ({pending.length})
                </button>
              )}
              {confirmed.length > 0 && (
                <button
                  onClick={() => setShowConfirmed(!showConfirmed)}
                  className="flex items-center gap-1 text-gray-500 hover:text-primary"
                >
                  <ChevronRight size={10} className={cn('transition-transform', showConfirmed && 'rotate-90')} />
                  已采纳 ({confirmed.length})
                </button>
              )}
            </div>
          )}

          {/* 更多建议列表 */}
          {showMore && pending.map((item, i) => (
            <AssistItemCard key={i} item={item} isSecondary />
          ))}
        </div>
      )}
    </div>
  )
}

/* 辅助项卡片 */
function AssistItemCard({ item, isSecondary = false }) {
  const [editing, setEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(item.content)

  const handleAdopt = () => {
    console.log('[HIS WriteBack]', { type: item.type, content: item.content })
    // TODO: 实际写入HIS逻辑
  }

  const handleEdit = () => {
    console.log('[HIS WriteBack]', { type: item.type, content: editedContent })
    setEditing(false)
  }

  const isHighRisk = item.type === 'high_risk'

  return (
    <div className={cn(
      'border rounded-lg p-2.5 space-y-1.5',
      isHighRisk ? 'border-danger bg-red-50' : 'border-border bg-gray-50',
      isSecondary && 'opacity-60'
    )}>
      {/* 标题 */}
      <div className="flex items-start gap-1.5">
        {isHighRisk && <AlertTriangle size={12} className="text-danger mt-0.5 flex-shrink-0" />}
        <span className={cn('text-xs font-medium', isHighRisk ? 'text-danger' : 'text-gray-800')}>
          {item.title}
        </span>
      </div>

      {/* 原因 */}
      {item.reason && (
        <div className="text-2xs text-gray-500">
          {item.reason}
        </div>
      )}

      {/* 内容 */}
      {editing ? (
        <textarea
          value={editedContent}
          onChange={e => setEditedContent(e.target.value)}
          className="w-full text-xs border border-border rounded px-2 py-1 resize-none"
          rows={3}
        />
      ) : (
        <div className="text-xs text-gray-700 leading-relaxed">
          {item.content}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-1.5 pt-1">
        {editing ? (
          <>
            <button
              onClick={handleEdit}
              className="px-2 py-1 text-2xs bg-primary text-white rounded hover:bg-primary-600"
            >
              确认写入
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-2 py-1 text-2xs text-gray-600 hover:text-gray-800"
            >
              取消
            </button>
          </>
        ) : (
          <>
            {item.actions.includes('采纳并写入HIS') && (
              <button
                onClick={handleAdopt}
                className="px-2 py-1 text-2xs bg-primary text-white rounded hover:bg-primary-600"
              >
                采纳并写入HIS
              </button>
            )}
            {item.actions.includes('修改后写入') && (
              <button
                onClick={() => setEditing(true)}
                className="px-2 py-1 text-2xs border border-border rounded hover:bg-white"
              >
                修改后写入
              </button>
            )}
            {item.actions.includes('立即处理') && (
              <button
                onClick={handleAdopt}
                className="px-2 py-1 text-2xs bg-danger text-white rounded hover:bg-red-600"
              >
                立即处理
              </button>
            )}
            {item.actions.includes('查看详情') && (
              <button className="px-2 py-1 text-2xs text-primary hover:underline">
                查看详情
              </button>
            )}
            {item.actions.includes('查看依据') && (
              <button className="px-2 py-1 text-2xs text-primary hover:underline">
                查看依据
              </button>
            )}
            {item.actions.includes('暂不处理') && (
              <button className="px-2 py-1 text-2xs text-gray-500 hover:text-gray-700">
                暂不处理
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
