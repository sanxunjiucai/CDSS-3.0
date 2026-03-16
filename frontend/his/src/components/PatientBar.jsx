import { AlertTriangle } from 'lucide-react'

const genderMap = { male: '男', female: '女' }

/**
 * 患者信息条
 */
export function PatientBar({ patient }) {
  const { name, gender, age, diagnosis_names = [], allergies = [] } = patient

  return (
    <div className="flex-shrink-0 bg-patient-bg border-b border-primary-100">
      <div className="flex items-center gap-1.5 px-2 py-1.5 flex-wrap flex-1 min-w-0">
        <span className="text-xs font-semibold text-gray-800 flex-shrink-0">{name}</span>
        <span className="text-xs text-gray-500 flex-shrink-0">
          {genderMap[gender]} | {age}岁
        </span>
        <span className="text-gray-300 text-xs flex-shrink-0">|</span>

        {/* 诊断标签 */}
        <div className="flex items-center gap-1 flex-wrap">
          {diagnosis_names.map((d, i) => (
            <span
              key={i}
              className="text-xs text-primary-600 bg-primary-50 border border-primary-200
                         px-1.5 py-0.5 rounded-sm leading-none flex-shrink-0"
            >
              {d}
            </span>
          ))}
        </div>

        {/* 过敏 */}
        {allergies.length > 0 && (
          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
            <AlertTriangle size={11} className="text-danger" />
            <span className="text-2xs text-danger">{allergies.join('、')}过敏</span>
          </div>
        )}
      </div>
    </div>
  )
}
