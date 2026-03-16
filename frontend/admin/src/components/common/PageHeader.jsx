/**
 * 页面标题区
 * Props: icon, title, description, action (右侧按钮)
 */
export function PageHeader({ icon: Icon, color = 'blue', title, description, action }) {
  const colorMap = {
    blue:   'bg-blue-100 text-blue-600',
    green:  'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
            <Icon size={18} />
          </div>
        )}
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
