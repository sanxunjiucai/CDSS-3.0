import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Pill, FlaskConical, BookOpen,
  Calculator, ClipboardList, Clock, ChevronRight,
  Search, TrendingUp, ArrowRight, Newspaper, FileText,
} from 'lucide-react'
import { cn, TYPE_LABELS } from '@/lib/utils'
import { useHistoryStore } from '@/stores/history'
import { get } from '@shared/api/request'

// ── 知识库分类配置 ─────────────────────────────────────────────
const CATEGORIES = [
  {
    type: 'disease',
    label: '疾病知识库',
    desc: '疾病概述、病因、诊断标准、治疗方案',
    path: '/diseases',
    icon: Activity,
    accent: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100 hover:border-blue-300',
    statKey: 'disease',
  },
  {
    type: 'drug',
    label: '药品库',
    desc: '适应症、用法用量、禁忌、不良反应',
    path: '/drugs',
    icon: Pill,
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100 hover:border-emerald-300',
    statKey: 'drug',
  },
  {
    type: 'exam',
    label: '检验检查库',
    desc: '检验项目、参考范围、临床意义',
    path: '/exams',
    icon: FlaskConical,
    accent: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100 hover:border-amber-300',
    statKey: 'exam',
  },
  {
    type: 'guideline',
    label: '临床指南库',
    desc: '权威临床指南、诊疗规范、专家共识',
    path: '/guidelines',
    icon: BookOpen,
    accent: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100 hover:border-violet-300',
    statKey: 'guideline',
  },
  {
    type: 'formula',
    label: '医学公式库',
    desc: 'BMI、eGFR、体表面积、MELD 等计算公式',
    path: '/formulas',
    icon: Calculator,
    accent: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100 hover:border-teal-300',
    statKey: 'formula',
  },
  {
    type: 'literature',
    label: '动态文献库',
    desc: '系统评价、Meta分析、指南与专家共识',
    path: '/literature',
    icon: Newspaper,
    accent: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100 hover:border-indigo-300',
    statKey: 'literature',
  },
  {
    type: 'case',
    label: '案例文献库',
    desc: '病例报告、病例系列与典型案例',
    path: '/cases',
    icon: FileText,
    accent: 'text-fuchsia-600',
    bg: 'bg-fuchsia-50',
    border: 'border-fuchsia-100 hover:border-fuchsia-300',
    statKey: 'case',
  },
  {
    type: 'assessment',
    label: '评估量表',
    desc: 'CURB-65、Wells、GCS 等临床常用量表',
    path: '/assessments',
    icon: ClipboardList,
    accent: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100 hover:border-rose-300',
    statKey: 'assessment',
  },
]

const HOT_KEYWORDS = ['高血压', '糖尿病', '心房颤动', '肺炎', '脑卒中', '血常规', '阿司匹林', 'CURB-65']

export function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery]     = useState('')
  const [stats, setStats]     = useState({})
  const records = useHistoryStore(s => s.records)
  const recentRecords = records.slice(0, 6)

  // 加载统计数据
  useEffect(() => {
    get('/stats').then(setStats).catch(() => {})
  }, [])

  const handleSearch = () => {
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const totalRecords = Object.values(stats).reduce((s, v) => s + (v || 0), 0)

  return (
    <div className="space-y-8">

      {/* ── 搜索区 ──────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-xl px-8 py-8 shadow-card">
        {/* 标题行 */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">临床医学知识库</h1>
            <p className="text-sm text-gray-500">快速查阅疾病、药品、检验、指南等临床知识，辅助临床决策</p>
          </div>
          {totalRecords > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-border">
              <TrendingUp size={12} className="text-primary" />
              <span>共收录 <span className="font-semibold text-primary">{totalRecords.toLocaleString()}</span> 条知识条目</span>
            </div>
          )}
        </div>

        {/* 搜索框 */}
        <div className="flex items-center gap-0 bg-gray-50 border border-border rounded-lg
                        overflow-hidden focus-within:border-primary focus-within:bg-white
                        transition-all max-w-[800px]">
          <div className="flex items-center gap-2 px-4 text-gray-400 flex-shrink-0">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="输入疾病名称、ICD编码、药品名称、检验指标、临床指南..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="flex-1 text-gray-800 text-sm py-3 pr-3 outline-none bg-transparent placeholder-gray-400"
          />
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-medium
                       hover:bg-primary-600 transition-colors flex-shrink-0"
          >
            <Search size={14} />
            搜索
          </button>
        </div>

        {/* 热门标签 */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-gray-400 flex-shrink-0">热门搜索：</span>
          {HOT_KEYWORDS.map(kw => (
            <button
              key={kw}
              onClick={() => navigate(`/search?q=${encodeURIComponent(kw)}`)}
              className="text-xs text-gray-500 hover:text-primary bg-gray-100 hover:bg-primary-50
                         border border-transparent hover:border-primary/20
                         px-2.5 py-1 rounded-full transition-all"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* ── 知识库分类 ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">知识库分类</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const count = stats[cat.statKey]
            return (
              <div
                key={cat.type}
                onClick={() => navigate(cat.path)}
                className={cn(
                  'group bg-white border rounded-xl p-5 cursor-pointer transition-all duration-150',
                  'hover:shadow-card-hover hover:-translate-y-0.5',
                  cat.border
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cat.bg)}>
                    <Icon size={18} className={cat.accent} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-semibold text-sm text-gray-900 group-hover:text-gray-900')}>{cat.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{cat.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {count != null ? (
                    <span className={cn('text-lg font-bold', cat.accent)}>
                      {count.toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ml-1">条</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">加载中…</span>
                  )}
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── 最近浏览 ──────────────────────────────────── */}
      {recentRecords.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              最近浏览
            </h2>
            <button
              onClick={() => useHistoryStore.getState().clearHistory()}
              className="text-xs text-gray-400 hover:text-danger transition-colors"
            >
              清空记录
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {recentRecords.map(record => (
              <div
                key={`${record.type}-${record.id}`}
                onClick={() => navigate(record.path)}
                className="flex items-center gap-2.5 bg-white border border-border rounded-lg
                           px-3 py-2.5 cursor-pointer hover:border-primary/40 hover:shadow-card
                           transition-all group"
              >
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium',
                  'bg-primary-50 text-primary border border-primary/20'
                )}>
                  {TYPE_LABELS[record.type] || record.type}
                </span>
                <span className="text-sm text-gray-700 truncate flex-1 group-hover:text-gray-900">{record.name}</span>
                <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 底部双栏：更新公告 + 数据规模 ──────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* 更新公告 */}
        <div className="col-span-2 bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">更新公告</h3>
            <span className="text-xs text-gray-400">近期动态</span>
          </div>
          <div className="divide-y divide-border">
            {[
              { date: '2026-03-13', tag: '知识库', title: '新增心血管疾病相关指南 12 篇' },
              { date: '2026-03-10', tag: '药品库', title: '同步国家基本药物目录 2025 版，新增 86 种' },
              { date: '2026-03-05', tag: '检验库', title: '补充检验参考范围儿科分层数据' },
              { date: '2026-02-28', tag: '公式库', title: '上线 BMI、eGFR 等 10 个临床计算公式' },
            ].map((notice, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
                <span className="text-xs text-gray-400 flex-shrink-0 w-[80px]">{notice.date}</span>
                <span className="text-xs text-primary bg-primary-50 px-1.5 py-0.5 rounded flex-shrink-0 border border-primary/10">
                  {notice.tag}
                </span>
                <span className="text-sm text-gray-700 truncate">{notice.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 数据规模 */}
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-800">数据规模</h3>
          </div>
          <div className="p-5 space-y-4">
            {CATEGORIES.map(cat => {
              const count = stats[cat.statKey] ?? 0
              const Icon = cat.icon
              return (
                <div key={cat.type} className="flex items-center gap-3">
                  <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', cat.bg)}>
                    <Icon size={13} className={cat.accent} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{cat.label}</span>
                      <span className={cn('text-xs font-semibold', cat.accent)}>{count}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', cat.bg)}
                        style={{ width: totalRecords > 0 ? `${Math.min((count / Math.max(...Object.values(stats), 1)) * 100, 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
