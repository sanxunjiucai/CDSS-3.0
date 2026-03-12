/**
 * useNLPExtraction
 * 监听录音 transcript，每 5 秒防抖后调用 GLM 提取临床实体
 * 提取完毕后：
 *  1. 自动合并 HIS 患者数据（过敏、既往史、现有诊断）
 *  2. 自动生成结构化主诉（无需医生手动触发）
 *  3. 过滤掉 HIS 已知字段后，剩余追问最多保留 2 条
 *
 * 追问答案变更时，自动重新生成主诉文本
 */
import { useEffect, useRef } from 'react'
import { useRecordingStore }      from '@/stores/recording'
import { useClinicalContextStore } from '@/stores/clinicalContext'
import { usePatientStore }         from '@/stores/patient'
import {
  extractClinicalEntities,
  generateFollowUpQuestions,
  generateStructuredSummary,
} from '@/services/glm'

const DEBOUNCE_MS = 5000   // 5 秒防抖
const MIN_LENGTH  = 20     // transcript 最小长度才触发

export function useNLPExtraction() {
  const transcript = useRecordingStore(s => s.transcript)
  const status     = useRecordingStore(s => s.status)
  const patient    = usePatientStore(s => s.context)

  const store = useClinicalContextStore()
  const {
    isExtracting,
    entities,
    followUpAnswers,
    lastExtractedTranscript,
    setExtracting,
    setExtractError,
    setEntities,
    setFollowUpQuestions,
    setStructuredSummary,
    setLastExtractedTranscript,
  } = store

  const timerRef = useRef(null)

  // ── Effect 1：监听 transcript，防抖提取实体 + 自动生成主诉 ──────
  useEffect(() => {
    if (!transcript || transcript.trim().length < MIN_LENGTH) return
    if (transcript === lastExtractedTranscript) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      if (isExtracting) return

      setExtracting(true)
      setExtractError(null)

      try {
        const raw = await extractClinicalEntities(transcript)
        if (!raw) return

        // 合并 HIS 已知信息
        const merged = mergeWithPatient(raw, patient)
        setEntities(merged)
        setLastExtractedTranscript(transcript)

        // 追问：过滤 HIS 已知字段，最多 2 条
        generateFollowUpQuestions(merged)
          .then(qs => setFollowUpQuestions(filterKnownFollowUps(qs, patient)))
          .catch(e => console.warn('[NLP] 追问生成失败:', e))

        // 自动生成主诉（使用当前已有的追问答案）
        const currentAnswers = useClinicalContextStore.getState().followUpAnswers
        generateStructuredSummary(merged, currentAnswers)
          .then(s => { if (s) setStructuredSummary(s) })
          .catch(e => console.warn('[NLP] 主诉生成失败:', e))

      } catch (e) {
        console.error('[NLP] 实体提取失败:', e)
        setExtractError(e.message)
      } finally {
        setExtracting(false)
      }
    }, DEBOUNCE_MS)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, status])

  // ── Effect 2：追问答案变更时，自动重新生成主诉 ──────────────────
  useEffect(() => {
    if (!entities || Object.keys(followUpAnswers).length === 0) return

    generateStructuredSummary(entities, followUpAnswers)
      .then(s => { if (s) setStructuredSummary(s) })
      .catch(e => console.warn('[NLP] 追问后重新生成失败:', e))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(followUpAnswers)])
}

/* ── 合并 HIS 患者数据到实体，减少追问 ─────────────────────────── */
function mergeWithPatient(entities, patient) {
  if (!patient) return entities

  const merge = (arr1 = [], arr2 = []) => [
    ...arr1,
    ...arr2.filter(item => !arr1.some(e => e === item || e?.includes?.(item))),
  ]

  return {
    ...entities,
    past_history:        merge(entities.past_history,        patient.past_history || []),
    allergies_mentioned: merge(entities.allergies_mentioned, patient.allergies    || []),
    diagnoses_mentioned: merge(entities.diagnoses_mentioned, patient.diagnosis_names || []),
    // 注入年龄性别供 GLM 生成更准确的主诉
    _patient_age:    patient.age,
    _patient_gender: patient.gender === 'male' ? '男' : '女',
  }
}

/* ── 过滤 HIS 已知字段的追问，最多保留 2 条 ────────────────────── */
function filterKnownFollowUps(questions, patient) {
  if (!questions?.length) return []

  // HIS 中已知的信息关键词
  const knownKeys = []
  if (patient?.allergies?.length)      knownKeys.push('过敏', 'allergy')
  if (patient?.past_history?.length)   knownKeys.push('既往', '病史', 'history')
  if (patient?.age)                    knownKeys.push('年龄', 'age')
  if (patient?.gender)                 knownKeys.push('性别', 'gender')
  if (patient?.diagnosis_names?.length) knownKeys.push('诊断')

  return questions
    .filter(q => !knownKeys.some(k =>
      q.question.includes(k) || (q.key || '').includes(k)
    ))
    .slice(0, 2)
}
