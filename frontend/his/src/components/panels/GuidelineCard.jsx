import { BookOpen, ExternalLink, ChevronRight } from 'lucide-react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { Badge } from '@/components/ui/badge'
import { usePatientStore } from '@/stores/patient'

// Mock 指南数据（后续对接 /v1/guidelines 接口，按诊断 ICD 关联）
const GUIDELINE_MAP = {
  '急性ST段抬高型心肌梗死': [
    {
      id: 1,
      title: '急性ST段抬高型心肌梗死诊断和治疗指南（2019）',
      source: '中华心血管病杂志',
      level: 'A',   // 证据等级
      year: 2019,
      keywords: ['STEMI', 'PCI', '溶栓', '抗凝'],
    },
    {
      id: 2,
      title: '2023 ESC急性冠脉综合征管理指南',
      source: 'ESC Guidelines',
      level: 'A',
      year: 2023,
      keywords: ['ACS', '双联抗血小板', 'P2Y12'],
    },
    {
      id: 3,
      title: '心力衰竭诊断和治疗指南（2018）',
      source: '中华心血管病杂志',
      level: 'B',
      year: 2018,
      keywords: ['心衰', 'NT-proBNP', 'LVEF'],
    },
  ],
  '高血压': [
    {
      id: 4,
      title: '中国高血压防治指南（2023年修订版）',
      source: '中华高血压杂志',
      level: 'A',
      year: 2023,
      keywords: ['降压目标', 'CCB', 'ARB'],
    },
  ],
  '2型糖尿病': [
    {
      id: 5,
      title: '中国2型糖尿病防治指南（2020年版）',
      source: '中华糖尿病杂志',
      level: 'A',
      year: 2020,
      keywords: ['HbA1c', '二甲双胍', '胰岛素'],
    },
  ],
}

const LEVEL_COLOR = {
  A: 'bg-green-50 text-success border-green-200',
  B: 'bg-blue-50 text-primary border-primary-200',
  C: 'bg-gray-50 text-gray-600 border-gray-200',
}

export function GuidelineCard({ defaultOpen = false }) {
  const patient = usePatientStore(s => s.context)
  const diagnoses = patient?.diagnosis_names || []

  // 合并所有诊断的指南，去重
  const allGuidelines = diagnoses.flatMap(d => GUIDELINE_MAP[d] || [])
  const guidelines = [...new Map(allGuidelines.map(g => [g.id, g])).values()]

  if (!guidelines.length) return null

  const openInPC = (g) => {
    window.open(`/pc/#/guidelines/${g.id}`, '_blank')
  }

  return (
    <CollapsibleCard
      title="循证指南"
      iconBg="bg-indigo-500"
      icon={<BookOpen size={11} className="text-white" />}
      badge={guidelines.length}
      defaultOpen={defaultOpen}
    >
      <div className="space-y-2">
        {guidelines.map((g) => (
          <div
            key={g.id}
            className="rounded border border-border bg-white hover:bg-gray-50
                       transition-colors overflow-hidden"
          >
            {/* 标题行 */}
            <div className="flex items-start gap-2 px-2.5 py-2">
              {/* 证据等级 */}
              <span className={`text-2xs px-1.5 py-0.5 rounded-sm border font-bold
                               flex-shrink-0 mt-0.5 ${LEVEL_COLOR[g.level] || LEVEL_COLOR.C}`}>
                {g.level}级
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">
                  {g.title}
                </p>
                <p className="text-2xs text-gray-400 mt-0.5">
                  {g.source} · {g.year}
                </p>
              </div>

              <button
                onClick={() => openInPC(g)}
                className="text-gray-300 hover:text-primary flex-shrink-0 mt-0.5 transition-colors"
                title="在PC端查看全文"
              >
                <ExternalLink size={12} />
              </button>
            </div>

            {/* 关键词 */}
            <div className="flex items-center gap-1 px-2.5 pb-2 flex-wrap">
              {g.keywords.map(k => (
                <span
                  key={k}
                  className="text-2xs bg-gray-100 text-gray-500 px-1 py-0.5 rounded-sm"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => window.open('/pc/#/guidelines', '_blank')}
        className="mt-2 w-full text-2xs text-primary text-center hover:underline"
      >
        查看全部指南库 →
      </button>
    </CollapsibleCard>
  )
}
