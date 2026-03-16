import { useState, useRef } from 'react'
import { Upload, FileJson, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { importApi } from '@/api'
import { PageHeader } from '@/components/common/PageHeader'

const IMPORT_TYPES = [
  { value: 'disease',   label: '疾病库',   accept: '.json,.csv', hint: 'JSON 格式：[{name, icd_code, department, summary, ...}]' },
  { value: 'drug',      label: '药品库',   accept: '.json,.csv', hint: 'JSON 格式：[{name, category, indications, dosage, ...}]' },
  { value: 'exam',      label: '检验库',   accept: '.json,.csv', hint: 'JSON 格式：[{name, type, specimen, reference_range, ...}]' },
  { value: 'guideline', label: '指南库',   accept: '.json',      hint: 'JSON 格式：[{title, organization, department, published_at, ...}]' },
  { value: 'literature', label: '动态文献', accept: '.json',      hint: 'JSON 格式：[{pmid, title, journal, publish_year, abstract, ...}]' },
  { value: 'case',       label: '案例文献', accept: '.json',      hint: 'JSON 格式：[{pmid, title, journal, publish_year, abstract, ...}]' },
]

const STATUS_ICON = {
  success: <CheckCircle size={16} className="text-success" />,
  failed:  <XCircle    size={16} className="text-danger" />,
  partial: <AlertCircle size={16} className="text-warning" />,
  pending: <Clock      size={16} className="text-gray-400" />,
}

export function ImportPage() {
  const [importType, setImportType] = useState('disease')
  const [file, setFile]             = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [result, setResult]         = useState(null)
  const [history, setHistory]       = useState([])
  const fileRef = useRef(null)

  const currentType = IMPORT_TYPES.find(t => t.value === importType)

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setResult(null) }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) { setFile(f); setResult(null) }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      const res = await importApi.upload(importType, file)
      setResult({ status: 'success', ...res })
      setHistory(h => [{
        id: Date.now(), type: importType, filename: file.name,
        status: 'success', count: res.imported || 0,
        time: new Date().toLocaleString('zh-CN'),
      }, ...h.slice(0, 9)])
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      const detail = e?.response?.data?.detail || '导入失败，请检查文件格式'
      setResult({ status: 'failed', message: detail })
      setHistory(h => [{
        id: Date.now(), type: importType, filename: file.name,
        status: 'failed', count: 0,
        time: new Date().toLocaleString('zh-CN'),
      }, ...h.slice(0, 9)])
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={Upload} color="orange"
        title="批量导入"
        description="将知识库数据批量导入到系统，支持结构化数据文件"
      />

      <div className="grid grid-cols-[1fr_360px] gap-6">
        {/* 左：上传区 */}
        <div className="space-y-4">
          {/* 类型选择 */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">1. 选择导入类型</h3>
            <div className="grid grid-cols-3 gap-3">
              {IMPORT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setImportType(t.value); setFile(null); setResult(null) }}
                  className={`py-3 rounded-lg border text-sm font-medium transition-colors
                    ${importType === t.value
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-border text-gray-600 hover:border-primary/50'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              格式示例：{currentType?.hint}
            </p>
          </div>

          {/* 文件上传 */}
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">2. 选择文件</h3>

            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${file ? 'border-primary bg-primary-50' : 'border-border hover:border-primary/60'}`}
            >
              <FileJson size={36} className={`mx-auto mb-3 ${file ? 'text-primary' : 'text-gray-300'}`} />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-primary">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">拖拽文件到此处，或点击选择文件</p>
                  <p className="text-xs text-gray-400 mt-1">支持 {currentType?.accept} 格式</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={currentType?.accept}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-4 w-full h-10 bg-primary text-white rounded-lg text-sm font-medium
                         flex items-center justify-center gap-2 hover:bg-primary-600
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Upload size={15} />
                  开始导入
                </>
              )}
            </button>
          </div>

          {/* 导入结果 */}
          {result && (
            <div className={`rounded-xl border p-5 ${
              result.status === 'success' ? 'bg-green-50 border-green-100'
                : 'bg-red-50 border-red-100'
            }`}>
              <div className="flex items-start gap-3">
                {STATUS_ICON[result.status]}
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {result.status === 'success' ? '导入成功' : '导入失败'}
                  </p>
                  {result.status === 'success' ? (
                    <p className="text-sm text-gray-600 mt-0.5">
                      成功导入 <span className="font-bold text-success">{result.imported || 0}</span> 条记录
                      {result.skipped > 0 && `，跳过 ${result.skipped} 条`}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 mt-0.5">{result.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右：导入历史 */}
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">本次会话导入记录</h3>

          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              暂无导入记录
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(h => {
                const t = IMPORT_TYPES.find(x => x.value === h.type)
                return (
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    {STATUS_ICON[h.status]}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">{t?.label}</span>
                        <span className={`text-xs ${h.status === 'success' ? 'text-success' : 'text-danger'}`}>
                          {h.status === 'success' ? `+${h.count}` : '失败'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{h.filename}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{h.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
