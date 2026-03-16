import { useState, useEffect } from 'react'
import { Activity, Pill, FlaskConical, BookOpen, Users, TrendingUp, Database, Newspaper, FileText } from 'lucide-react'
import { statsApi } from '@/api'

const STAT_CARDS = [
  { key: 'disease_count',   label: '疾病库条目', icon: Activity,     color: 'blue',   bg: 'bg-blue-50',   text: 'text-blue-600' },
  { key: 'drug_count',      label: '药品库条目', icon: Pill,         color: 'green',  bg: 'bg-green-50',  text: 'text-green-600' },
  { key: 'exam_count',      label: '检验库条目', icon: FlaskConical, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
  { key: 'guideline_count', label: '指南库条目', icon: BookOpen,     color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600' },
  { key: 'literature_count', label: '动态文献条目', icon: Newspaper,   color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { key: 'case_count',       label: '案例文献条目', icon: FileText,    color: 'pink',   bg: 'bg-pink-50',   text: 'text-pink-600' },
  { key: 'user_count',      label: '系统用户',   icon: Users,        color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-600' },
]

// 模拟统计数据（后端接口未就绪时降级展示）
const MOCK_STATS = {
  disease_count:   0,
  drug_count:      0,
  exam_count:      0,
  guideline_count: 0,
  literature_count: 0,
  case_count: 0,
  user_count:      1,
}

export function DashboardPage() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    statsApi.overview()
      .then(setStats)
      .catch(() => setStats(MOCK_STATS))
      .finally(() => setLoading(false))
  }, [])

  const data = stats || MOCK_STATS

  return (
    <div>
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-500 mt-0.5">CDSS 3.0 知识库管理概览</p>
      </div>

      {/* 欢迎横幅 */}
      <div className="bg-gradient-to-r from-navy to-navy-light rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Database size={20} className="text-primary-200" />
          <span className="text-sm text-white/70">临床辅助决策系统</span>
        </div>
        <h2 className="text-xl font-bold mb-1">CDSS 3.0 管理控制台</h2>
        <p className="text-white/60 text-sm">在这里管理知识库内容、用户账号与系统配置</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-7 gap-4 mb-8">
        {STAT_CARDS.map(card => {
          const Icon = card.icon
          const value = data[card.key] ?? 0
          return (
            <div key={card.key} className="bg-white rounded-xl border border-border p-5">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={card.text} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-0.5">
                {loading ? '—' : value.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </div>
          )
        })}
      </div>

      {/* 快捷入口 */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-gray-900">快捷操作</h3>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { href: '/diseases',   label: '管理疾病库', icon: Activity,     bg: 'bg-blue-50',   text: 'text-blue-600' },
            { href: '/drugs',      label: '管理药品库', icon: Pill,         bg: 'bg-green-50',  text: 'text-green-600' },
              { href: '/literature', label: '管理文献库', icon: Newspaper,    bg: 'bg-indigo-50', text: 'text-indigo-600' },
            { href: '/import',     label: '批量导入',   icon: Database,     bg: 'bg-orange-50', text: 'text-orange-600' },
          ].map(item => {
            const Icon = item.icon
            return (
              <a
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border
                           hover:border-primary hover:shadow-card-hover transition-all cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                  <Icon size={18} className={item.text} />
                </div>
                <span className="text-sm text-gray-600">{item.label}</span>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
