import { useState } from 'react'
import { Search, AlertTriangle, ChevronRight, Pill } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

// Mock 药品数据（后续对接 /v1/drugs 接口）
const ALL_DRUGS = [
  { id: 1,  name: '阿司匹林',    category: '抗血小板', spec: '100mg/片', indication: '冠心病、血栓预防', allergyCross: ['水杨酸类'],      contraindication: '活动性消化道溃疡、出血性疾病' },
  { id: 2,  name: '氯吡格雷',    category: '抗血小板', spec: '75mg/片',  indication: 'ACS、PCI术后',     allergyCross: [],                contraindication: '活动性出血' },
  { id: 3,  name: '替格瑞洛',    category: '抗血小板', spec: '90mg/片',  indication: 'ACS首选P2Y12',     allergyCross: [],                contraindication: '颅内出血史、重度肝损害' },
  { id: 4,  name: '低分子肝素',  category: '抗凝',     spec: '注射液',   indication: 'DVT、ACS抗凝',     allergyCross: ['肝素类'],        contraindication: '活动性大出血、血小板减少' },
  { id: 5,  name: '阿托伐他汀',  category: '调脂',     spec: '20mg/片',  indication: '高脂血症、冠心病', allergyCross: [],                contraindication: '活动性肝病、妊娠' },
  { id: 6,  name: '美托洛尔',    category: 'β受体阻滞剂', spec: '25mg/片', indication: '高血压、心衰、心律失常', allergyCross: [],          contraindication: '心动过缓、哮喘、II-III度AVB' },
  { id: 7,  name: '氨氯地平',    category: 'CCB',      spec: '5mg/片',   indication: '高血压、冠心病',   allergyCross: [],                contraindication: '心源性休克' },
  { id: 8,  name: '二甲双胍',    category: '降糖药',   spec: '500mg/片', indication: '2型糖尿病',        allergyCross: [],                contraindication: '肾功能不全（eGFR<45）、造影剂使用前后' },
  { id: 9,  name: '胰岛素（速效）', category: '降糖药', spec: '注射液',  indication: '糖尿病血糖控制',   allergyCross: [],                contraindication: '低血糖' },
  { id: 10, name: '呋塞米',      category: '利尿剂',   spec: '20mg/片',  indication: '心衰水肿、高血压', allergyCross: ['磺胺类'],        contraindication: '无尿、低钾血症' },
  { id: 11, name: '螺内酯',      category: '利尿剂',   spec: '20mg/片',  indication: '心衰、醛固酮增多', allergyCross: [],                contraindication: '高钾血症、肾功能不全' },
  { id: 12, name: '青霉素',      category: '抗菌药',   spec: '注射液',   indication: '细菌感染',         allergyCross: ['青霉素类'],      contraindication: '青霉素过敏' },
  { id: 13, name: '头孢曲松',    category: '抗菌药',   spec: '注射液',   indication: '中重度感染',        allergyCross: ['头孢菌素类'],    contraindication: '头孢过敏，青霉素过敏慎用' },
  { id: 14, name: '比伐卢定',    category: '直接凝血酶抑制剂', spec: '注射液', indication: 'PCI术中抗凝', allergyCross: [],               contraindication: '活动性大出血' },
  { id: 15, name: '丹参注射液',  category: '中成药',   spec: '注射液',   indication: '心绞痛、心肌梗死辅助', allergyCross: [],             contraindication: '出血性疾病' },
]

const CATEGORIES = ['全部', '抗血小板', '抗凝', '调脂', 'β受体阻滞剂', 'CCB', '降糖药', '利尿剂', '抗菌药', '中成药']

const COMMON_DRUGS = ['阿司匹林', '氯吡格雷', '阿托伐他汀', '美托洛尔', '二甲双胍', '呋塞米', '氨氯地平']

export function DrugSearchPanel() {
  const navigate  = useNavigate()
  const patient   = usePatientStore(s => s.context)
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState('全部')

  const allergies       = patient?.allergies || []
  const currentMeds     = patient?.current_medications || []

  // 判断某药是否与患者过敏交叉
  const isAllergyRisk = (drug) =>
    drug.allergyCross.some(ac => allergies.some(a => a.includes(ac) || ac.includes(a))) ||
    allergies.some(a => drug.name.includes(a) || drug.contraindication.includes(a))

  // 搜索 + 分类过滤
  const filtered = ALL_DRUGS.filter(d => {
    const matchCat   = category === '全部' || d.category === category
    const matchQuery = !query.trim() ||
      d.name.includes(query) ||
      d.indication.includes(query) ||
      d.category.includes(query)
    return matchCat && matchQuery
  })

  const goDetail = (drug) => navigate(`/knowledge/drug/${drug.id}`)

  return (
    <div className="flex flex-col h-full">
      {/* 页头 */}
      <div className="flex-shrink-0 border-b border-border px-3 py-2 bg-white">
        <h2 className="text-sm font-semibold text-gray-800">药品查询</h2>
        <p className="text-2xs text-gray-400">搜索药品说明、禁忌、用法用量</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 搜索框 */}
        <div className="px-3 pt-3 pb-2 space-y-2">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜索药品名称、适应症..."
            icon={<Search size={13} />}
          />

          {/* 分类 */}
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
          {/* 患者当前用药 */}
          {currentMeds.length > 0 && !query && category === '全部' && (
            <section>
              <p className="text-2xs font-medium text-gray-500 mb-1.5">💊 当前用药</p>
              <div className="flex flex-wrap gap-1.5">
                {currentMeds.map(med => {
                  const drug = ALL_DRUGS.find(d => d.name === med || med.includes(d.name))
                  const risk = drug && isAllergyRisk(drug)
                  return (
                    <button
                      key={med}
                      onClick={() => drug && goDetail(drug)}
                      className={cn(
                        'flex items-center gap-1 text-2xs px-2 py-1 rounded-sm border',
                        'transition-colors',
                        risk
                          ? 'bg-red-50 border-red-200 text-danger hover:bg-red-100'
                          : 'bg-primary-50 border-primary-200 text-primary hover:bg-primary-100'
                      )}
                    >
                      {risk && <AlertTriangle size={10} />}
                      {med}
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-dashed border-gray-200 my-3" />
            </section>
          )}

          {/* 过敏提示 */}
          {allergies.length > 0 && !query && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-red-200 bg-red-50">
              <AlertTriangle size={12} className="text-danger flex-shrink-0" />
              <p className="text-2xs text-danger">
                患者过敏：<span className="font-medium">{allergies.join('、')}</span>，查询结果中红色标注表示有过敏风险
              </p>
            </div>
          )}

          {/* 快捷常用药（无搜索词时显示） */}
          {!query && category === '全部' && (
            <section>
              <p className="text-2xs font-medium text-gray-500 mb-1.5">常用药品</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_DRUGS.map(name => {
                  const drug = ALL_DRUGS.find(d => d.name === name)
                  if (!drug) return null
                  const risk = isAllergyRisk(drug)
                  return (
                    <button
                      key={name}
                      onClick={() => goDetail(drug)}
                      className={cn(
                        'text-2xs px-2 py-1 rounded-sm border transition-colors',
                        risk
                          ? 'bg-red-50 border-red-200 text-danger hover:bg-red-100'
                          : 'bg-gray-50 border-border text-gray-700 hover:border-primary hover:text-primary'
                      )}
                    >
                      {risk && '⚠ '}{name}
                    </button>
                  )
                })}
              </div>
              <div className="border-t border-dashed border-gray-200 my-3" />
            </section>
          )}

          {/* 搜索结果 / 全部列表 */}
          {query && (
            <p className="text-2xs font-medium text-gray-500">
              搜索"{query}"，共 {filtered.length} 条
            </p>
          )}

          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Pill size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">未找到相关药品</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(drug => (
                <DrugItem
                  key={drug.id}
                  drug={drug}
                  allergyRisk={isAllergyRisk(drug)}
                  onClick={() => goDetail(drug)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DrugItem({ drug, allergyRisk, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded border text-left',
        'transition-colors group',
        allergyRisk
          ? 'border-red-200 bg-red-50 hover:bg-red-100'
          : 'border-border bg-white hover:border-primary/50 hover:bg-gray-50'
      )}
    >
      {/* 过敏警示 or 药品图标 */}
      <div className={cn(
        'w-6 h-6 rounded flex items-center justify-center flex-shrink-0',
        allergyRisk ? 'bg-red-100' : 'bg-primary-50'
      )}>
        {allergyRisk
          ? <AlertTriangle size={13} className="text-danger" />
          : <Pill size={13} className="text-primary" />
        }
      </div>

      {/* 药品信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-xs font-medium',
            allergyRisk ? 'text-danger' : 'text-gray-800'
          )}>
            {drug.name}
          </span>
          <Badge variant={allergyRisk ? 'required' : 'gray'} className="text-2xs">
            {drug.category}
          </Badge>
          {allergyRisk && (
            <span className="text-2xs text-danger font-medium">⚠ 过敏风险</span>
          )}
        </div>
        <p className="text-2xs text-gray-500 truncate mt-0.5">
          {drug.spec} · {drug.indication}
        </p>
      </div>

      <ChevronRight
        size={13}
        className="text-gray-300 group-hover:text-primary flex-shrink-0 transition-colors"
      />
    </button>
  )
}
