import { Heart, Utensils, Activity, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { CollapsibleCard } from '@/components/ui/collapsible-card'
import { usePatientStore } from '@/stores/patient'
import { cn } from '@/lib/utils'

// Mock 干预建议（后续接 /v1/treatment/{id}/intervention 接口）
const INTERVENTION_MAP = {
  '急性ST段抬高型心肌梗死': {
    lifestyle: [
      '急性期绝对卧床休息，避免用力、情绪激动',
      '低盐低脂饮食，限制钠摄入 < 6g/天',
      '戒烟（立即，无替代方案）',
      '限酒，男性 < 25g/天，女性 < 15g/天',
    ],
    activity: [
      '急性期 24–48h 内严格卧床',
      '病情稳定后开始心脏康复程序（I期）',
      '出院后参加心脏康复运动训练',
    ],
    followup: [
      '出院后 1 周门诊随访（复查心电图、心肌酶）',
      '出院后 1 个月复查超声心动图、评估 LVEF',
      '长期：每 3–6 个月心内科随访',
      '监测血压、血糖、血脂达标情况',
    ],
    education: [
      '识别心梗再发症状：胸痛>15min、放射至下颌/左臂',
      '随身携带硝酸甘油，掌握使用方法',
      '告知家属心肺复苏基本技能',
    ],
  },
  '高血压': {
    lifestyle: [
      '低盐饮食：每日食盐 ≤ 5g（约 1 茶匙）',
      '增加蔬菜水果摄入，减少高脂食物',
      '戒烟限酒',
      '控制体重，目标 BMI 18.5–23.9 kg/m²',
    ],
    activity: [
      '规律有氧运动：每周 ≥ 5 次，每次 30 分钟',
      '推荐快走、游泳、骑车等中等强度运动',
      '避免剧烈运动及憋气动作（Valsalva）',
    ],
    followup: [
      '家庭自测血压：每天早晚各测一次',
      '血压未达标：2–4 周随访调整方案',
      '血压达标：每 3 个月随访一次',
    ],
    education: [
      '不可自行停药，即使血压正常',
      '了解降压药副作用及应对方法',
    ],
  },
  '2型糖尿病': {
    lifestyle: [
      '控制总热量，碳水化合物占 50–60%',
      '规律进餐，避免暴饮暴食',
      '戒烟，限酒',
    ],
    activity: [
      '每周至少 150 分钟中等强度有氧运动',
      '推荐餐后散步 30 分钟以控制餐后血糖',
    ],
    followup: [
      'HbA1c 未达标：每 3 个月复查一次',
      'HbA1c 达标：每 6 个月复查一次',
      '每年筛查糖尿病并发症（眼底/肾功能/足部）',
    ],
    education: [
      '学习血糖自我监测技能',
      '识别低血糖症状及处理方法',
      '糖尿病足护理：每日检查足部',
    ],
  },
}

const SECTIONS = [
  { key: 'lifestyle', label: '生活方式', icon: Utensils,  color: 'text-green-600' },
  { key: 'activity',  label: '运动建议', icon: Activity,  color: 'text-blue-500'  },
  { key: 'followup',  label: '随访计划', icon: Calendar,  color: 'text-purple-500'},
  { key: 'education', label: '患者教育', icon: Heart,     color: 'text-orange-500'},
]

export function InterventionCard({ defaultOpen = false }) {
  const patient = usePatientStore(s => s.context)
  const [expandedSection, setExpandedSection] = useState('lifestyle')

  const diagnoses = patient?.diagnosis_names || []

  // 合并所有诊断的干预建议（去重）
  const merged = { lifestyle: [], activity: [], followup: [], education: [] }
  diagnoses.forEach(d => {
    const data = INTERVENTION_MAP[d]
    if (!data) return
    Object.keys(merged).forEach(k => {
      data[k]?.forEach(item => {
        if (!merged[k].includes(item)) merged[k].push(item)
      })
    })
  })

  const hasAny = Object.values(merged).some(v => v.length > 0)
  if (!hasAny) return null

  return (
    <CollapsibleCard
      title="健康干预建议"
      iconBg="bg-pink-500"
      icon={<Heart size={11} className="text-white" />}
      defaultOpen={defaultOpen}
    >
      <div className="space-y-1">
        {SECTIONS.map(sec => {
          const items = merged[sec.key]
          if (!items.length) return null
          const Icon = sec.icon
          const isOpen = expandedSection === sec.key

          return (
            <div key={sec.key} className="rounded border border-border overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => setExpandedSection(isOpen ? null : sec.key)}
                className="w-full flex items-center gap-2 px-2.5 py-2 bg-gray-50
                           hover:bg-gray-100 transition-colors text-left"
              >
                <Icon size={12} className={sec.color} />
                <span className="text-xs font-medium text-gray-700 flex-1">{sec.label}</span>
                <span className="text-2xs text-gray-400">{items.length}条</span>
                {isOpen
                  ? <ChevronUp size={11} className="text-gray-400" />
                  : <ChevronDown size={11} className="text-gray-400" />
                }
              </button>

              {/* Items */}
              {isOpen && (
                <ul className="px-2.5 py-2 space-y-1.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className={cn(
                        'w-3.5 h-3.5 rounded-full flex items-center justify-center',
                        'text-[9px] font-bold flex-shrink-0 mt-0.5 text-white',
                        sec.color.replace('text-', 'bg-')
                      )}>
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </CollapsibleCard>
  )
}
