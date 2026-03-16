import { useNavigate } from 'react-router-dom'
import { ChevronRight, Activity, Pill, FlaskConical, BookOpen, Calculator, ClipboardList, Newspaper, FileText } from 'lucide-react'
import { cn, TYPE_LABELS, TYPE_COLORS, truncate } from '@/lib/utils'

const TYPE_ICONS = {
  disease:    Activity,
  drug:       Pill,
  exam:       FlaskConical,
  guideline:  BookOpen,
  formula:    Calculator,
  assessment: ClipboardList,
  literature: Newspaper,
  case: FileText,
}

const TYPE_ICON_COLORS = {
  disease:    'bg-blue-50 text-blue-500',
  drug:       'bg-emerald-50 text-emerald-600',
  exam:       'bg-amber-50 text-amber-600',
  guideline:  'bg-violet-50 text-violet-600',
  formula:    'bg-teal-50 text-teal-600',
  assessment: 'bg-rose-50 text-rose-600',
  literature: 'bg-indigo-50 text-indigo-600',
  case: 'bg-fuchsia-50 text-fuchsia-600',
}

/**
 * 通用知识条目卡片
 * type: 'disease' | 'drug' | 'exam' | 'guideline' | 'formula' | 'assessment'
 */
export function KnowledgeCard({ item, type, className }) {
  const navigate = useNavigate()
  const colorClass  = TYPE_COLORS[type] || 'bg-gray-50 text-gray-700 border-gray-200'
  const label       = TYPE_LABELS[type] || type
  const Icon        = TYPE_ICONS[type] || Activity
  const iconColor   = TYPE_ICON_COLORS[type] || 'bg-gray-50 text-gray-500'

  const pathMap = {
    disease:    `/diseases/${item.id}`,
    drug:       `/drugs/${item.id}`,
    exam:       `/exams/${item.id}`,
    guideline:  `/guidelines/${item.id}`,
    formula:    `/formulas/${item.id}`,
    assessment: `/assessments/${item.id}`,
    literature: `/literature/${item.id}`,
    case: `/cases/${item.id}`,
  }
  const href = pathMap[type]

  const snippet = item.snippet || item.overview || item.description || item.indications

  return (
    <div
      onClick={() => href && navigate(href)}
      className={cn(
        'group bg-white border border-border rounded-lg px-4 py-3.5 cursor-pointer',
        'hover:shadow-card-hover hover:border-primary/30 hover:bg-gray-50/50 transition-all duration-150',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', iconColor)}>
          <Icon size={15} />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('inline-block text-[11px] px-1.5 py-0.5 rounded border flex-shrink-0 font-medium', colorClass)}>
              {label}
            </span>
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
              {item.name || item.title}
            </h3>
          </div>

          {/* 副标题元数据 */}
          {(item.icd_code || item.department || item.category || item.code) && (
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {item.icd_code   && <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">ICD: {item.icd_code}</span>}
              {item.department && <span className="text-[11px] text-gray-400">{item.department}</span>}
              {item.category   && <span className="text-[11px] text-gray-400">{item.category}</span>}
              {item.code       && <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{item.code}</span>}
            </div>
          )}

          {/* 描述摘要 */}
          {snippet && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {truncate(snippet, 120)}
            </p>
          )}
        </div>

        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors" />
      </div>
    </div>
  )
}
