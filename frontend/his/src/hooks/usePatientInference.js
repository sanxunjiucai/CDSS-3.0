/**
 * usePatientInference
 * 患者数据加载后，自动调用 GLM 对 HIS/EMR 数据进行临床推断：
 *  - 完善主诉（chief_complaint_refined）
 *  - 推断现病史（present_illness）
 *  - 识别风险信号（risk_signals）
 *  - 提示缺失关键信息（missing_key_info）
 *
 * 结果存入 useClinicalContextStore，供 SmartAssistCard 展示
 */
import { useEffect, useRef } from 'react'
import { usePatientStore }         from '@/stores/patient'
import { useClinicalContextStore } from '@/stores/clinicalContext'
import { inferFromPatientData, suggestDiagnoses, interpretLabResults } from '@/services/glm'

export function usePatientInference() {
  const patient = usePatientStore(s => s.context)
  const {
    setInferring, setInferred,
    setSuggesting, setDiagnosisSuggestions,
    setInterpreting, setLabInterpretations,
    setExtractError, reset,
  } = useClinicalContextStore()

  const lastPatientIdRef = useRef(null)

  useEffect(() => {
    // 无患者 or 同一患者已推断过，跳过
    if (!patient?.patient_id) return
    if (patient.patient_id === lastPatientIdRef.current) return

    lastPatientIdRef.current = patient.patient_id
    reset()

    let cancelled = false

    async function run() {
      // ① 主推断：完善主诉、现病史、风险信号
      setInferring(true)
      setExtractError(null)
      let presentIllness = null
      try {
        const result = await inferFromPatientData(patient)
        if (!cancelled && result) {
          setInferred(result)
          presentIllness = result.present_illness
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[Inference] 推断失败:', e)
          setExtractError(e.message)
        }
      } finally {
        if (!cancelled) setInferring(false)
      }

      if (cancelled) return

      // ② 诊断推荐 + ③ 检验解读：并行执行
      await Promise.all([
        (async () => {
          setSuggesting(true)
          try {
            const suggestions = await suggestDiagnoses(patient, presentIllness)
            if (!cancelled) setDiagnosisSuggestions(suggestions)
          } catch (e) {
            if (!cancelled) console.error('[Suggestion] 诊断推荐失败:', e)
          } finally {
            if (!cancelled) setSuggesting(false)
          }
        })(),
        (async () => {
          setInterpreting(true)
          try {
            const interpretations = await interpretLabResults(patient)
            if (!cancelled) setLabInterpretations(interpretations)
          } catch (e) {
            if (!cancelled) console.error('[Interpret] 检验解读失败:', e)
          } finally {
            if (!cancelled) setInterpreting(false)
          }
        })(),
      ])
    }

    run()

    return () => { cancelled = true }
  }, [patient?.patient_id]) // eslint-disable-line
}
