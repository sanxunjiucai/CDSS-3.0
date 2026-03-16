/**
 * 表单字段容器（label + input）
 */
export function FormField({ label, required, error, children, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

export function TextInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full h-9 px-3 border border-border rounded-lg text-sm
                  outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  transition-colors placeholder-gray-400 ${className}`}
      {...props}
    />
  )
}

export function TextArea({ className = '', rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`w-full px-3 py-2 border border-border rounded-lg text-sm
                  outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  transition-colors placeholder-gray-400 resize-none ${className}`}
      {...props}
    />
  )
}

export function SelectInput({ options = [], placeholder, className = '', ...props }) {
  return (
    <select
      className={`w-full h-9 px-3 border border-border rounded-lg text-sm
                  outline-none focus:border-primary focus:ring-1 focus:ring-primary/20
                  transition-colors bg-white ${className}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}
