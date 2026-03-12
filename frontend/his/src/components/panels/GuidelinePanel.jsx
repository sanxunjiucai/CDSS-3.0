import { useState } from 'react'
import { Search, ExternalLink, BookOpen, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

// Mock 指南数据（后续对接 /v1/guidelines 接口）
const ALL_GUIDELINES = [
  { id: 1,  title: '急性ST段抬高型心肌梗死诊断和治疗指南（2019）', source: '中华心血管病杂志', level: 'A', year: 2019, category: '心血管', tags: ['STEMI', 'PCI', '溶栓', '抗凝'] },
  { id: 2,  title: '2023 ESC 急性冠脉综合征管理指南', source: 'ESC Guidelines', level: 'A', year: 2023, category: '心血管', tags: ['ACS', '双联抗血小板', 'P2Y12'] },
  { id: 3,  title: '心力衰竭诊断和治疗指南（2018）', source: '中华心血管病杂志', level: 'A', year: 2018, category: '心血管', tags: ['心衰', 'NT-proBNP', 'LVEF', 'BNP'] },
  { id: 4,  title: '中国高血压防治指南（2023年修订版）', source: '中华高血压杂志', level: 'A', year: 2023, category: '心血管', tags: ['降压目标', 'CCB', 'ARB', 'ACEI'] },
  { id: 5,  title: '中国2型糖尿病防治指南（2020年版）', source: '中华糖尿病杂志', level: 'A', year: 2020, category: '内分泌', tags: ['HbA1c', '二甲双胍', '胰岛素', 'GLP-1'] },
  { id: 6,  title: '社区获得性肺炎诊断和治疗指南（2016）', source: '中华结核和呼吸杂志', level: 'A', year: 2016, category: '呼吸', tags: ['CAP', 'CURB-65', '抗菌药物'] },
  { id: 7,  title: '肺栓塞诊断与治疗中国专家共识（2018）', source: '中华医学杂志', level: 'B', year: 2018, category: '呼吸', tags: ['PE', 'Wells', '溶栓', '抗凝'] },
  { id: 8,  title: '中国脑血管病临床管理指南（2019）', source: '中华神经科杂志', level: 'A', year: 2019, category: '神经', tags: ['脑梗死', '溶栓', 'tPA', '卒中'] },
  { id: 9,  title: '中国慢性肾脏病早期评价与管理指南（2022）', source: '中华肾脏病杂志', level: 'A', year: 2022, category: '肾脏', tags: ['CKD', 'eGFR', '蛋白尿'] },
  { id: 10, title: '2022 AHA/ACC/HFSA 心力衰竭指南', source: 'AHA/ACC', level: 'A', year: 2022, category: '心血管', tags: ['HFrEF', 'ARNI', 'SGLT2'] },
]

const CATEGORIES = ['全部', '心血管', '内分泌', '呼吸', '神经', '肾脏']

const LEVEL_STYLE = {
  A: 'bg-green-50 text-success border-green-200',
  B: 'bg-blue-50 text-primary border-primary-200',
  C: 'bg-gray-50 text-gray-500 border-gray-200',
}

export function GuidelinePanel() {
  const patient = usePatientStore(s => s.context)
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState('全部')

  // 当前患者相关指南
  const patientDiagnoses = patient?.diagnosis_names || []
  const DIAGNOSIS_GUIDELINE_MAP = { '急性ST段抬高型心肌梗死': [1, 2, 3], '高血压': [4], '2型糖尿病': [5] }
  const relevantIds = new Set(patientDiagnoses.flatMap(d => DIAGNOSIS_GUIDELINE_MAP[d] || []))
  const relevantGuidelines = ALL_GUIDELINES.filter(g => relevantIds.has(g.id))

  // 搜索 + 分类过滤
  const filtered = ALL_GUIDELINES.filter(g => {
    const matchCat   = category === '全部' || g.category === category
    const matchQuery = !query.trim() ||
      g.title.includes(query) ||
      g.tags.some(t => t.includes(query)) ||
      g.source.includes(query)
    return matchCat && matchQuery
  })

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">临床指南</h2>
        <p className="text-2xs text-gray-400">浏览与搜索诊疗指南，点击在 PC 端查看全文</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 搜索框 */}
        <div className="px-3 pt-3 pb-2 space-y-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索指南名称、关键词..."
            icon={<Search size={13} />}
          />

          {/* 分类 Tab */}
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'text-2xs px-2 py-1 rounded-full border transition-colors',
                  category === c
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-border hover:border-primary hover:text-primary'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="px-3 pb-3 space-y-3">
          {/* 患者相关推荐 */}
          {relevantGuidelines.length > 0 && !query && category === '全部' && (
            <section>
              <p className="text-2xs font-medium text-gray-500 mb-1.5">
                📋 与当前患者相关（{relevantGuidelines.length}）
              </p>
              <div className="space-y-2">
                {relevantGuidelines.map(g => (
                  <GuidelineItem key={g.id} guideline={g} highlighted />
                ))}
              </div>
              <div className="border-t border-dashed border-gray-200 my-3" />
            </section>
          )}

          {/* 全部/过滤结果 */}
          <section>
            {!query && category === '全部' && (
              <p className="text-2xs font-medium text-gray-500 mb-1.5">全部指南</p>
            )}
            {query && (
              <p className="text-2xs font-medium text-gray-500 mb-1.5">
                搜索"{query}"，共 {filtered.length} 条
              </p>
            )}

            {filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">未找到相关指南</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(g => (
                  <GuidelineItem key={g.id} guideline={g} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function GuidelineItem({ guideline: g, highlighted = false }) {
  return (
    <div className={cn(
      'rounded border bg-white overflow-hidden transition-colors hover:border-primary/50',
      highlighted ? 'border-primary-200' : 'border-border'
    )}>
      <div className="flex items-start gap-2 px-2.5 py-2">
        {/* 证据等级 */}
        <span className={cn(
          'text-2xs px-1.5 py-0.5 rounded-sm border font-bold flex-shrink-0 mt-0.5',
          LEVEL_STYLE[g.level] || LEVEL_STYLE.C
        )}>
          {g.level}级
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 leading-snug">{g.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-2xs text-gray-400">{g.source}</span>
            <span className="text-gray-300 text-2xs">·</span>
            <span className="text-2xs text-gray-400">{g.year}</span>
            <Badge variant="gray" className="text-2xs">{g.category}</Badge>
          </div>
        </div>

        <button
          onClick={() => window.open(`/pc/#/guidelines/${g.id}`, '_blank')}
          className="text-gray-300 hover:text-primary flex-shrink-0 transition-colors mt-0.5"
          title="在PC端查看全文"
        >
          <ExternalLink size={12} />
        </button>
      </div>

      {/* 关键词 */}
      <div className="flex items-center gap-1 px-2.5 pb-2 flex-wrap">
        {g.tags.map(t => (
          <span key={t} className="text-2xs bg-gray-100 text-gray-500 px-1 py-0.5 rounded-sm">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
