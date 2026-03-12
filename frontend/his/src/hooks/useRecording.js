import { useEffect, useRef, useCallback } from 'react'
import { useRecordingStore } from '@/stores/recording'

/**
 * Web Speech API 录音 Hook
 * - 将状态同步到 useRecordingStore，方便跨组件读取
 * - 浏览器不支持时降级为 'unsupported'，UI 仍可显示静态区域
 * - Chrome 下 continuous 模式约 60s 静音后自动停止，onend 里自动重启
 */
export function useRecording() {
  const { setStatus, setTranscript, setDuration } = useRecordingStore()

  const recRef        = useRef(null)   // SpeechRecognition 实例
  const shouldRestartRef = useRef(false)
  const finalTextRef  = useRef('')     // 已确认转写文字
  const timerRef      = useRef(null)
  const elapsedRef    = useRef(0)

  // 初始化 SpeechRecognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setStatus('unsupported')
      return
    }

    const rec = new SR()
    rec.continuous      = true
    rec.interimResults  = true
    rec.lang            = 'zh-CN'
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalTextRef.current += t
        } else {
          interim = t
        }
      }
      setTranscript(finalTextRef.current + interim)
    }

    rec.onend = () => {
      // Chrome 在静音 ~60s 后自动 stop，若仍应录音则重启
      if (shouldRestartRef.current) {
        try { rec.start() } catch {}
      }
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setStatus('unsupported')
        shouldRestartRef.current = false
      }
    }

    recRef.current = rec

    return () => {
      shouldRestartRef.current = false
      rec.abort()
      clearInterval(timerRef.current)
    }
  }, []) // eslint-disable-line

  const startTimer = useCallback(() => {
    const startMs = Date.now() - elapsedRef.current * 1000
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      elapsedRef.current = Math.floor((Date.now() - startMs) / 1000)
      setDuration(elapsedRef.current)
    }, 1000)
  }, [setDuration])

  const start = useCallback(() => {
    if (!recRef.current) return
    shouldRestartRef.current = true
    try {
      recRef.current.start()
      setStatus('recording')
      startTimer()
    } catch {
      // already started — ignore DOMException
    }
  }, [setStatus, startTimer])

  const pause = useCallback(() => {
    if (!recRef.current) return
    shouldRestartRef.current = false
    recRef.current.stop()
    setStatus('paused')
    clearInterval(timerRef.current)
  }, [setStatus])

  const toggle = useCallback(() => {
    const cur = useRecordingStore.getState().status
    if (cur === 'recording') pause()
    else start()
  }, [start, pause])

  return { toggle, start, pause }
}
