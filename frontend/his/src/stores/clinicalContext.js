/**
 * 临床上下文 Store
 * 存储 HIS患者数据推断 + 追问 + 结构化摘要的全流程数据
 */
import { create } from 'zustand'

export const useClinicalContextStore = create((set, get) => ({
  // 推断状态
  isExtracting: false,
  isInferring: false,
  isSuggesting: false,
  isInterpreting: false,
  extractError: null,

  // GLM 基于患者数据的推断结果
  // { chief_complaint_refined, present_illness, risk_signals, missing_key_info, stage_hint }
  inferred: null,

  // GLM 智能诊断推荐列表
  diagnosisSuggestions: [],

  // GLM 检验结果解读
  // [{ item_code, item_name, severity, interpretation, action, adjusted_range, range_note }]
  labInterpretations: [],

  // GLM 提取的结构化实体（保留，供其他模块使用）
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
  setExtracting:  (v) => set({ isExtracting: v }),
  setInferring:           (v)   => set({ isInferring: v }),
  setSuggesting:          (v)   => set({ isSuggesting: v }),
  setInterpreting:        (v)   => set({ isInterpreting: v }),
  setExtractError:        (e)   => set({ extractError: e }),

  setInferred:            (inferred)  => set({ inferred }),
  setDiagnosisSuggestions:(arr)       => set({ diagnosisSuggestions: arr }),
  setLabInterpretations:  (arr)       => set({ labInterpretations: arr }),
  setEntities: (entities) => set({ entities }),

  setFollowUpQuestions: (questions) => set({ followUpQuestions: questions }),

  answerFollowUp: (qId, answer) => set((s) => ({
    followUpAnswers: { ...s.followUpAnswers, [qId]: answer },
  })),

  setStructuredSummary: (text) => set({ structuredSummary: text }),

  setLastExtractedTranscript: (t) => set({ lastExtractedTranscript: t }),

  reset: () => set({
    isExtracting: false,
    isInferring: false,
    isSuggesting: false,
    extractError: null,
    inferred: null,
    diagnosisSuggestions: [],
    labInterpretations: [],
    isInterpreting: false,
    entities: null,
    followUpQuestions: [],
    followUpAnswers: {},
    structuredSummary: '',
    lastExtractedTranscript: '',
  }),
}))
