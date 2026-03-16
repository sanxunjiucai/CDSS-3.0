import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 详情页内容分节区块（可折叠）
 */
export function DetailSection({ title, children, defaultOpen = true, className }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={cn('bg-white border border-border rounded-md overflow-hidden', className)}>
      {/* 标题行 */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5
                   hover:bg-gray-50 transition-colors text-left"
      >
        <span className="font-medium text-gray-900 flex items-center gap-2">
          <span className="w-1 h-4 bg-primary rounded-full inline-block" />
          {title}
        </span>
        {open
          ? <ChevronUp size={16} className="text-gray-400" />
          : <ChevronDown size={16} className="text-gray-400" />
        }
      </button>

      {/* 内容区 */}
      {open && (
        <div className="px-5 pb-5 border-t border-border">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * 富文本内容展示（支持基础 Markdown：# 标题、- 列表、**粗体**、`代码`）
 */
export function RichText({ content, className }) {
  if (!content) {
    return <p className="text-sm text-gray-400 mt-3">暂无相关内容</p>
  }

  const normalizedContent = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalizedContent.split('\n')

  // 将 **text** 和 `code` 转换为内联 JSX
  function renderInline(text, key) {
    const parts = []
    let remaining = text
    let i = 0
    while (remaining.length > 0) {
      const boldIdx = remaining.indexOf('**')
      const codeIdx = remaining.indexOf('`')
      const first = Math.min(
        boldIdx >= 0 ? boldIdx : Infinity,
        codeIdx >= 0 ? codeIdx : Infinity
      )
      if (first === Infinity) {
        parts.push(<span key={i++}>{remaining}</span>)
        break
      }
      if (first > 0) {
        parts.push(<span key={i++}>{remaining.slice(0, first)}</span>)
        remaining = remaining.slice(first)
      }
      if (remaining.startsWith('**')) {
        const end = remaining.indexOf('**', 2)
        if (end >= 0) {
          parts.push(<strong key={i++} className="font-semibold text-gray-900">{remaining.slice(2, end)}</strong>)
          remaining = remaining.slice(end + 2)
        } else {
          parts.push(<span key={i++}>{remaining}</span>)
          break
        }
      } else if (remaining.startsWith('`')) {
        const end = remaining.indexOf('`', 1)
        if (end >= 0) {
          parts.push(<code key={i++} className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono text-gray-800">{remaining.slice(1, end)}</code>)
          remaining = remaining.slice(end + 1)
        } else {
          parts.push(<span key={i++}>{remaining}</span>)
          break
        }
      }
    }
    return <span key={key}>{parts}</span>
  }

  const elements = []
  let listItems = []
  let paragraphLines = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-none space-y-1 mt-1 mb-2">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span>{renderInline(item, j)}</span>
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      const text = paragraphLines
        .map(line => line.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
      if (text) {
        elements.push(
          <p key={`p-${elements.length}`} className="text-sm text-gray-700 leading-relaxed">
            {renderInline(text, `p-${elements.length}`)}
          </p>
        )
      }
      paragraphLines = []
    }
  }

  lines.forEach((line, idx) => {
    if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h4 key={idx} className="text-sm font-semibold text-gray-900 mt-3 mb-1">
          {line.slice(4)}
        </h4>
      )
    } else if (line.startsWith('## ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-gray-900 mt-4 mb-1.5 pb-1 border-b border-gray-100">
          {line.slice(3)}
        </h3>
      )
    } else if (line.startsWith('# ')) {
      flushParagraph()
      flushList()
      elements.push(
        <h2 key={idx} className="text-base font-bold text-gray-900 mt-4 mb-2">
          {line.slice(2)}
        </h2>
      )
    } else if (/^[-*] /.test(line)) {
      flushParagraph()
      listItems.push(line.slice(2))
    } else if (/^\d+\. /.test(line)) {
      flushParagraph()
      listItems.push(line.replace(/^\d+\. /, ''))
    } else if (line.trim() === '' || line.trim() === '---') {
      flushParagraph()
      flushList()
    } else {
      flushList()
      paragraphLines.push(line)
    }
  })
  flushParagraph()
  flushList()

  return (
    <div className={cn('mt-3', className)}>
      {elements}
    </div>
  )
}
