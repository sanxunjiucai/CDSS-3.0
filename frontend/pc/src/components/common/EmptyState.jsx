import { SearchX, BookOpen } from 'lucide-react'

export function EmptyState({ type = 'search', message }) {
  const config = {
    search: {
      icon: <SearchX size={40} className="text-gray-300" />,
      title: '未找到相关内容',
      desc: message || '请尝试其他关键词或调整筛选条件',
    },
    empty: {
      icon: <BookOpen size={40} className="text-gray-300" />,
      title: '暂无数据',
      desc: message || '该知识库暂未录入内容',
    },
  }

  const { icon, title, desc } = config[type] || config.search

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      {icon}
      <p className="text-base text-gray-500 font-medium">{title}</p>
      <p className="text-sm text-gray-400">{desc}</p>
    </div>
  )
}
