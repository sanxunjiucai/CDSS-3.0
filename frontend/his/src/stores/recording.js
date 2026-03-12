import { create } from 'zustand'

// 录音状态全局 store，供 DiagnosisPanel 等跨页组件读取转写文字
export const useRecordingStore = create((set) => ({
  status: 'idle',       // 'idle' | 'recording' | 'paused' | 'unsupported'
  transcript: '',       // 累积转写文字
  duration: 0,          // 已录制秒数

  setStatus:     (status)     => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setDuration:   (duration)   => set({ duration }),
}))
