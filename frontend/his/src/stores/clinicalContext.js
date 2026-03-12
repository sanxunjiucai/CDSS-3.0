/**
 * 临床上下文 Store
 * 存储从录音 → NLP提取 → 追问 → 结构化摘要的全流程数据
 */
import { create } from 'zustand'

export const useClinicalContextStore = create((set, get) => ({
  // NLP 提取状态
  isExtracting: false,
  extractError: null,

  // GLM 提取的结构化实体
  entities: null,
  /*
  entities: {
    chief_complaint: string | null,
    symptoms: [{ name, location, duration, severity, quality }],
    associated_symptoms: string[],
    denied_symptoms: string[],
    vital_signs: { 心率, 血压, 体温, 血氧 },
    past_history: string[],
    allergies_mentioned: string[],
    medications_mentioned: string[],
    diagnoses_mentioned: string[],
    risk_signals: string[],
    stage_hint: 'initial' | 'has_labs' | 'has_diagnosis' | 'high_risk',
    missing_key_info: string[],
  }
  */

  // 追问问题（GLM生成）
  followUpQuestions: [],
  /*
  followUpQuestions: [{ id, question, options, key }]
  */

  // 医生对追问问题的回答
  followUpAnswers: {},
  /*
  followUpAnswers: { q1: '选项A', q2: '选项B' }
  */

  // 结构化摘要（最终病历主诉）
  structuredSummary: '',

  // 最近一次提取的原始 transcript（防止重复提取）
  lastExtractedTranscript: '',

  // Actions
  setExtracting: (v) => set({ isExtracting: v }),
  setExtractError: (e) => set({ extractError: e }),

  setEntities: (entities) => set({ entities }),

  setFollowUpQuestions: (questions) => set({ followUpQuestions: questions }),

  answerFollowUp: (qId, answer) => set((s) => ({
    followUpAnswers: { ...s.followUpAnswers, [qId]: answer },
  })),

  setStructuredSummary: (text) => set({ structuredSummary: text }),

  setLastExtractedTranscript: (t) => set({ lastExtractedTranscript: t }),

  reset: () => set({
    isExtracting: false,
    extractError: null,
    entities: null,
    followUpQuestions: [],
    followUpAnswers: {},
    structuredSummary: '',
    lastExtractedTranscript: '',
  }),
}))
