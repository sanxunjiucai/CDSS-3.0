import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, CheckCircle } from 'lucide-react'
import { configApi } from '@/api'
import { PageHeader } from '@/components/common/PageHeader'

const DEFAULT_WEIGHTS = {
  disease:    { enabled: true,  weight: 5, label: '疾病知识库',  description: '疾病名称、ICD编码、症状、概述' },
  drug:       { enabled: true,  weight: 4, label: '药品库',      description: '药品名称、商品名、适应症' },
  exam:       { enabled: true,  weight: 3, label: '检验检查库',  description: '检验名称、代码、临床意义' },
  guideline:  { enabled: true,  weight: 4, label: '临床指南库',  description: '指南标题、机构、摘要' },
  formula:    { enabled: true,  weight: 2, label: '医学公式库',  description: '公式名称、描述' },
  assessment: { enabled: true,  weight: 2, label: '评估量表库',  description: '量表名称、描述' },
}

export function SearchConfigPage() {
  const [config, setConfig]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    setLoading(true)
    configApi.bundle()
      .then((data) => {
        setConfig(data?.search_weights || DEFAULT_WEIGHTS)
      })
      .catch(() => setConfig(DEFAULT_WEIGHTS))
      .finally(() => setLoading(false))
  }, [])

  const toggleEnabled = (key) => {
    setConfig(c => ({ ...c, [key]: { ...c[key], enabled: !c[key].enabled } }))
    setSaved(false)
  }

  const setWeight = (key, val) => {
    const n = Math.max(1, Math.min(10, parseInt(val) || 1))
    setConfig(c => ({ ...c, [key]: { ...c[key], weight: n } }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await configApi.saveBundle({ search_weights: config })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULT_WEIGHTS)
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        加载配置中...
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="检索配置"
        description="配置各知识库的搜索优先级与启用状态"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-gray-600
                         text-sm rounded-md hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={13} />
              恢复默认
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white
                         text-sm rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {saved ? <CheckCircle size={13} /> : <Save size={13} />}
              {saving ? '保存中...' : saved ? '已保存' : '保存配置'}
            </button>
          </div>
        }
      />

      <div className="space-y-3">
        {config && Object.entries(config).map(([key, cfg]) => (
          <div key={key}
            className="bg-white border border-border rounded-md px-5 py-4 flex items-center gap-5">
            {/* 启用开关 */}
            <button
              onClick={() => toggleEnabled(key)}
              className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0
                ${cfg.enabled ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
                ${cfg.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>

            {/* 标签 + 描述 */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${cfg.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                {cfg.label}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{cfg.description}</p>
            </div>

            {/* 权重 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-500 whitespace-nowrap">搜索权重</span>
              <div className="flex items-center border border-border rounded overflow-hidden">
                <button
                  onClick={() => setWeight(key, cfg.weight - 1)}
                  disabled={!cfg.enabled}
                  className="w-7 h-7 flex items-center justify-center text-gray-500
                             hover:bg-gray-50 border-r border-border disabled:opacity-40 text-base leading-none"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1} max={10}
                  value={cfg.weight}
                  disabled={!cfg.enabled}
                  onChange={e => setWeight(key, e.target.value)}
                  className="w-9 text-center text-sm outline-none py-1 disabled:bg-gray-50
                             disabled:text-gray-400 [appearance:textfield]"
                />
                <button
                  onClick={() => setWeight(key, cfg.weight + 1)}
                  disabled={!cfg.enabled}
                  className="w-7 h-7 flex items-center justify-center text-gray-500
                             hover:bg-gray-50 border-l border-border disabled:opacity-40 text-base leading-none"
                >
                  +
                </button>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <div key={n}
                    className={`w-1.5 h-4 rounded-sm transition-colors ${
                      n <= cfg.weight && cfg.enabled ? 'bg-primary' : 'bg-gray-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
        <p className="text-xs text-amber-700 font-medium mb-1">说明</p>
        <p className="text-xs text-amber-600">
          权重值范围 1-10，数值越高在搜索结果中排名越靠前。禁用的知识库不会出现在搜索结果中。
          配置保存后立即生效。
        </p>
      </div>
    </div>
  )
}
