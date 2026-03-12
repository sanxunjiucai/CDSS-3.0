import { FlaskConical, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

export function LabResultCard({ defaultOpen = true }) {
  const navigate = useNavigate()
  const patient = usePatientStore(s => s.context)

  const abnormals = (patient?.lab_results || []).filter(r => r.is_abnormal)

  if (!abnormals.length) return null

  return (
    <CollapsibleCard
      title="检验异常"
      iconBg="bg-orange-500"
      icon={<FlaskConical size={11} className="text-white" />}
      badge={abnormals.length}
      defaultOpen={defaultOpen}
      extra={
        <button
          onClick={e => { e.stopPropagation(); navigate('/lab-result') }}
          className="flex items-center gap-0.5 text-2xs text-primary hover:underline"
        >
          解读 <ArrowRight size={10} />
        </button>
      }
    >
      <div className="space-y-1.5">
        {abnormals.map((item, i) => (
          <LabResultRow key={i} item={item} />
        ))}
      </div>

      <button
        onClick={() => navigate('/lab-result')}
        className="mt-2 w-full text-2xs text-primary text-center hover:underline"
      >
        查看全部检验结果并解读 →
      </button>
    </CollapsibleCard>
  )
}

function LabResultRow({ item }) {
  const isHigh = item.abnormal_type === 'high'
  const Icon = isHigh ? TrendingUp : TrendingDown

  const colorClass = isHigh
    ? 'text-danger bg-red-50 border-red-100'
    : 'text-primary bg-primary-50 border-primary-100'

  const valueColor = isHigh ? 'text-danger font-semibold' : 'text-primary font-semibold'

  return (
    <div className={cn(
      'flex items-center justify-between rounded px-2 py-1.5 border text-xs',
      colorClass
    )}>
      {/* 左：项目名 */}
      <div className="flex items-center gap-1.5">
        <Icon size={12} className={isHigh ? 'text-danger' : 'text-primary'} />
        <span className="font-medium text-gray-700">{item.item_name}</span>
      </div>

      {/* 右：值 + 单位 + 参考范围 */}
      <div className="flex items-center gap-1 text-right">
        <span className={valueColor}>
          {item.value}
        </span>
        <span className="text-gray-500">{item.unit}</span>
        <span className="text-gray-400 text-2xs">
          ({item.reference_low}–{item.reference_high})
        </span>
        <span className={cn(
          'text-2xs px-1 py-0.5 rounded-sm font-medium',
          isHigh ? 'bg-red-100 text-danger' : 'bg-primary-100 text-primary'
        )}>
          {isHigh ? '↑' : '↓'}
        </span>
      </div>
    </div>
  )
}
