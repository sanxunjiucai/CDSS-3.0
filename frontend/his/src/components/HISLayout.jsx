import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutGrid, Stethoscope, FlaskConical, ClipboardList,
  BookOpen, Pill, Search, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from './ui/input'
import { usePatientStore }     from '@/stores/patient'
import { usePatientInference } from '@/hooks/usePatientInference'
import { PatientBar }          from './PatientBar'

// 左侧图标导航项
const NAV_ITEMS = [
  { icon: LayoutGrid,    label: '主页',     path: '/main'       },
  { icon: Stethoscope,   label: '辅助诊断', path: '/diagnosis'  },
  { icon: FlaskConical,  label: '检验解读', path: '/lab-result' },
  { icon: ClipboardList, label: '量表评估', path: '/assessment' },  // 改为列表页
  { icon: BookOpen,      label: '临床指南', path: '/guidelines' },
  { icon: Pill,          label: '药品查询', path: '/drugs'      },
]

// 知识类型选项 → 对应搜索 type 参数
const KNOWLEDGE_TYPES = [
  { label: '全部',   type: null        },
  { label: '疾病',   type: 'disease'   },
  { label: '药品',   type: 'drug'      },
  { label: '检验',   type: 'exam'      },
  { label: '指南',   type: 'guideline' },
]

export function HISLayout() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [searchValue,   setSearchValue]   = useState('')
  const [selectedType,  setSelectedType]  = useState(KNOWLEDGE_TYPES[0])
  const [typeDropOpen,  setTypeDropOpen]  = useState(false)

  const patient  = usePatientStore(s => s.context)
  const loadMock = usePatientStore(s => s.loadMockPatient)

  // 患者数据加载后自动触发 GLM 推断，全局持续运行
  usePatientInference()

  // 搜索：导航到内联 SearchPanel
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      const params = new URLSearchParams({ q: searchValue.trim() })
      if (selectedType.type) params.set('type', selectedType.type)
      navigate(`/search?${params}`)
      setSearchValue('')
    }
  }

  // active 匹配：/assessment 前缀匹配（列表页和详情页都高亮量表图标）
  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="flex h-screen w-[380px] bg-bg overflow-hidden select-none">

      {/* ── 左侧图标导航 40px ──────────────────────────────────── */}
      <nav className="w-10 bg-navy flex flex-col items-center py-2 flex-shrink-0 gap-0.5">
        {/* Logo */}
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center mb-3">
          <span className="text-white text-xs font-bold">CD</span>
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon   = item.icon
          const active = isActive(item.path)
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              title={item.label}
              className={cn(
                'w-8 h-8 rounded-md flex flex-col items-center justify-center gap-0.5',
                'transition-colors cursor-pointer',
                active
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:bg-navy-light hover:text-white'
              )}
            >
              <Icon size={14} />
              <span className="text-2xs leading-none" style={{ fontSize: 9 }}>
                {item.label.slice(0, 2)}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ── 主内容区 340px ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* 顶部：类型选择 + 搜索框 */}
        <div className="flex-shrink-0 bg-white border-b border-border px-2 py-2">
          <div className="flex items-center gap-1.5">

            {/* 知识类型下拉 */}
            <div className="relative">
              <button
                onClick={() => setTypeDropOpen(o => !o)}
                className="flex items-center gap-1 text-primary text-sm font-medium
                           px-2 py-1.5 rounded border border-primary/30 bg-primary-50
                           hover:bg-primary-100 transition-colors whitespace-nowrap"
              >
                {selectedType.label}
                <ChevronDown size={12} />
              </button>
              {typeDropOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-border
                                rounded shadow-lg z-50 min-w-[80px] py-1">
                  {KNOWLEDGE_TYPES.map(t => (
                    <div
                      key={t.label}
                      onClick={() => { setSelectedType(t); setTypeDropOpen(false) }}
                      className={cn(
                        'px-3 py-1.5 text-sm cursor-pointer hover:bg-primary-50',
                        t.label === selectedType.label ? 'text-primary font-medium' : 'text-gray-700'
                      )}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 搜索框 */}
            <Input
              className="flex-1"
              placeholder="搜索疾病、药品、检验、指南…"
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        {/* 患者信息条 */}
        {patient
          ? <PatientBar patient={patient} />
          : (
            <div className="flex-shrink-0 bg-gray-50 border-b border-border
                            px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-400">暂无患者信息</span>
              <button
                onClick={loadMock}
                className="text-xs text-primary hover:underline"
              >
                加载演示患者
              </button>
            </div>
          )
        }

        {/* 内容区（可滚动）*/}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
