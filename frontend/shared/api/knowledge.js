/**
 * 知识库相关 API（三端共用）
 */
import request from './request'

// ── 全局检索 ──────────────────────────────────────────
export const searchApi = {
  search: (params) => request.get('/search', { params }),
}

// ── 疾病 ──────────────────────────────────────────────
export const diseaseApi = {
  list: (params) => request.get('/diseases', { params }),
  detail: (id) => request.get(`/diseases/${id}`),
}

// ── 药品 ──────────────────────────────────────────────
export const drugApi = {
  list: (params) => request.get('/drugs', { params }),
  detail: (id) => request.get(`/drugs/${id}`),
}

// ── 检验检查 ──────────────────────────────────────────
export const examApi = {
  list: (params) => request.get('/exams', { params }),
  detail: (id) => request.get(`/exams/${id}`),
}

// ── 临床指南 ──────────────────────────────────────────
export const guidelineApi = {
  list: (params) => request.get('/guidelines', { params }),
  detail: (id) => request.get(`/guidelines/${id}`),
}

// ── 量表评估 ──────────────────────────────────────────
export const assessmentApi = {
  list: (params) => request.get('/assessments', { params }),
  detail: (id) => request.get(`/assessments/${id}`),
  score: (id, answers, patientId) =>
    request.post(`/assessments/${id}/score`, answers, { params: { patient_id: patientId } }),
}
