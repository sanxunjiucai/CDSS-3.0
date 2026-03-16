import { useState, useEffect } from 'react'
import { Calculator, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { formulaApi } from '@/api'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { TagBadge } from '@/components/common/TagBadge'
import { cn } from '@/lib/utils'

export function FormulasPage() {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [q, setQ]                 = useState('')
  const [expanded, setExpanded]   = useState({})   // { [id]: true }
  const [inputs, setInputs]       = useState({})   // { [formulaId]: { [paramName]: value } }
  const [results, setResults]     = useState({})   // { [formulaId]: resultText }
  const [calcLoading, setCalcLoading] = useState({})

  useEffect(() => {
    setLoading(true)
    formulaApi.list({ pageSize: 100, q: q || undefined })
      .then(data => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q])

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const setParam = (formulaId, paramName, value) => {
    setInputs(prev => ({
      ...prev,
      [formulaId]: { ...prev[formulaId], [paramName]: value },
    }))
  }

  const calculate = async (formula) => {
    setCalcLoading(prev => ({ ...prev, [formula.id]: true }))
    try {
      const params = inputs[formula.id] || {}
      const result = await formulaApi.calculate(formula.id, params)
      setResults(prev => ({ ...prev, [formula.id]: result }))
    } catch (e) {
      setResults(prev => ({ ...prev, [formula.id]: { error: '计算失败，请检查输入参数' } }))
    } finally {
      setCalcLoading(prev => ({ ...prev, [formula.id]: false }))
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
          <Calculator size={16} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">医学公式库</h1>
          <p className="text-sm text-gray-500">BMI、GFR、体表面积、剂量计算等临床常用公式</p>
        </div>
      </div>

      {/* 搜索 */}
      <div className="flex items-center gap-2 bg-white border border-border rounded-lg
                      px-3 py-2 focus-within:border-primary transition-colors max-w-[480px] mb-6">
        <Search size={14} className="text-gray-400" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜索公式名称..."
          className="flex-1 text-sm outline-none placeholder-gray-400"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState type="empty" message="暂未录入医学公式数据" />
      ) : (
        <div className="space-y-3">
          {items.map(formula => {
            const isOpen    = !!expanded[formula.id]
            const result    = results[formula.id]
            const isCalcing = calcLoading[formula.id]
            const params    = formula.parameters || []

            return (
              <div key={formula.id} className="bg-white border border-border rounded-md overflow-hidden">
                {/* 标题行 */}
                <button
                  onClick={() => toggleExpand(formula.id)}
                  className="w-full flex items-center justify-between px-5 py-4
                             hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <Calculator size={14} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{formula.name}</p>
                      {formula.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{formula.description}</p>
                      )}
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                  }
                </button>

                {/* 参数输入区 */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border">
                    {formula.formula_expr && (
                      <div className="mt-3 bg-gray-50 rounded px-3 py-2 text-sm font-mono text-gray-600 mb-4">
                        {formula.formula_expr}
                      </div>
                    )}

                    {params.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {params.map(param => (
                          <div key={param.name}>
                            <label className="block text-xs text-gray-500 mb-1">
                              {param.label || param.name}
                              {param.unit && <span className="text-gray-400 ml-1">({param.unit})</span>}
                            </label>
                            {param.type === 'select' ? (
                              <select
                                value={inputs[formula.id]?.[param.name] ?? ''}
                                onChange={e => setParam(formula.id, param.name, e.target.value)}
                                className="w-full text-sm border border-border rounded px-3 py-1.5
                                           outline-none focus:border-primary transition-colors bg-white"
                              >
                                <option value="">请选择</option>
                                {(param.options || []).map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="number"
                                value={inputs[formula.id]?.[param.name] ?? ''}
                                onChange={e => setParam(formula.id, param.name, e.target.value)}
                                placeholder={param.placeholder || `请输入${param.label || param.name}`}
                                className="w-full text-sm border border-border rounded px-3 py-1.5
                                           outline-none focus:border-primary transition-colors"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 mt-3 mb-4">该公式暂未配置参数</p>
                    )}

                    <button
                      onClick={() => calculate(formula)}
                      disabled={isCalcing || params.length === 0}
                      className={cn(
                        'px-5 py-2 text-sm rounded-lg transition-colors',
                        'bg-primary text-white hover:bg-primary-600',
                        (isCalcing || params.length === 0) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isCalcing ? '计算中...' : '计算结果'}
                    </button>

                    {/* 计算结果 */}
                    {result && (
                      <div className={cn(
                        'mt-4 rounded-md px-4 py-3 text-sm',
                        result.error
                          ? 'bg-red-50 border border-red-200 text-danger'
                          : 'bg-primary-50 border border-primary/20'
                      )}>
                        {result.error ? (
                          result.error
                        ) : (
                          <>
                            <p className="font-medium text-gray-800 mb-1">计算结果</p>
                            <p className="text-2xl font-bold text-primary">
                              {result.value}
                              {result.unit && <span className="text-sm text-gray-500 ml-1">{result.unit}</span>}
                            </p>
                            {result.interpretation && (
                              <p className="text-gray-600 mt-1">{result.interpretation}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
