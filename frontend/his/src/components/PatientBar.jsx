import { AlertTriangle, Mic, MicOff, Square } from 'lucide-react'
import { useRecordingStore } from '@/stores/recording'
import { cn } from '@/lib/utils'

const genderMap = { male: '男', female: '女' }

function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0')
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

/**
 * 患者信息条 + 左侧录音状态区
 * recording.toggle 由父级（HISLayout）传入
 */
export function PatientBar({ patient, onRecordingToggle }) {
  const { name, gender, age, diagnosis_names = [], allergies = [] } = patient
  const { status, transcript, duration } = useRecordingStore()

  const isUnsupported = status === 'unsupported'
  const isRecording   = status === 'recording'
  const isPaused      = status === 'paused'
  const isIdle        = status === 'idle'

  return (
    <div className="flex-shrink-0 bg-patient-bg border-b border-primary-100">

      {/* ── 主行：录音区 + 患者信息 ───────────────────────── */}
      <div className="flex items-center gap-0 px-2 py-1.5">

        {/* 录音状态区（~56px） */}
        {!isUnsupported && (
          <button
            onClick={onRecordingToggle}
            title={isRecording ? '暂停录音' : '开始录音'}
            className={cn(
              'flex items-center gap-1 flex-shrink-0 mr-2 px-1.5 py-1 rounded',
              'transition-colors',
              isRecording
                ? 'text-danger hover:bg-red-50'
                : 'text-gray-400 hover:bg-gray-100 hover:text-primary'
            )}
          >
            {isRecording ? (
              <>
                {/* 脉冲红点 */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-danger" />
                </span>
                <span className="text-2xs font-mono tabular-nums text-danger leading-none">
                  {fmt(duration)}
                </span>
              </>
            ) : isPaused ? (
              <>
                <MicOff size={12} />
                <span className="text-2xs font-mono tabular-nums leading-none">{fmt(duration)}</span>
              </>
            ) : (
              /* idle */
              <Mic size={13} />
            )}
          </button>
        )}

        {/* 分隔线 */}
        {!isUnsupported && (
          <span className="text-gray-200 text-xs mr-2 flex-shrink-0">|</span>
        )}

        {/* 患者信息 */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
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

      {/* ── 转写文字条（录音中且有内容时才显示）─────────── */}
      {isRecording && transcript && (
        <div className="px-2 pb-1.5 flex items-center gap-1.5">
          <span className="text-2xs text-gray-400 flex-shrink-0">转写</span>
          <p className="text-2xs text-gray-600 truncate flex-1">{transcript}</p>
        </div>
      )}

      {/* ── idle 提示 ──────────────────────────────────── */}
      {isIdle && !isUnsupported && (
        <div className="px-2 pb-1">
          <button
            onClick={onRecordingToggle}
            className="text-2xs text-primary hover:underline"
          >
            点击开启录音，自动提取主诉信息
          </button>
        </div>
      )}
    </div>
  )
}
