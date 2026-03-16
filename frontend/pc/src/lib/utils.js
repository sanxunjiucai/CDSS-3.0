import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** 截断文本 */
export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/** 将 ICD 编码格式化显示 */
export function formatIcd(code) {
  if (!code) return ''
  return code.toUpperCase()
}

/** 知识库类型中文标签 */
export const TYPE_LABELS = {
  disease:    '疾病',
  drug:       '药品',
  exam:       '检验检查',
  guideline:  '临床指南',
  formula:    '医学公式',
  assessment: '量表评估',
  literature: '动态文献',
  case: '案例文献',
}

/** 知识库类型颜色 */
export const TYPE_COLORS = {
  disease:    'bg-blue-50 text-blue-700 border-blue-200',
  drug:       'bg-green-50 text-green-700 border-green-200',
  exam:       'bg-orange-50 text-orange-700 border-orange-200',
  guideline:  'bg-purple-50 text-purple-700 border-purple-200',
  formula:    'bg-teal-50 text-teal-700 border-teal-200',
  assessment: 'bg-pink-50 text-pink-700 border-pink-200',
  literature: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  case: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
}
