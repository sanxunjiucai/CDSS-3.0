/**
 * PC端 API 封装（复用 shared/api，补充PC端专用参数）
 */
import { get, post } from '@shared/api/request'

// ── 统计概览 ─────────────────────────────────────────────────
export const statsApi = {
  overview: () => get('/stats'),
}

// ── 全局搜索 ─────────────────────────────────────────────────
export const searchApi = {
  /**
   * @param {string} q          - 关键词
   * @param {string} [type]     - 知识库类型过滤
   * @param {number} [page]
   * @param {number} [pageSize]
   */
  search: (q, { type, page = 1, pageSize = 20 } = {}) =>
    get('/search', { params: { q, type, page, page_size: pageSize } }),
}

// ── 疾病知识库 ──────────────────────────────────────────────
export const diseaseApi = {
  list: ({ department, system, page = 1, pageSize = 20, q } = {}) =>
    get('/diseases', { params: { department, system, page, page_size: pageSize, q } }),

  departments: () => get('/diseases/departments'),

  detail: (id) => get(`/diseases/${id}`),
}

// ── 药品库 ──────────────────────────────────────────────────
export const drugApi = {
  list: ({ category, page = 1, pageSize = 20, q } = {}) =>
    get('/drugs', { params: { category, page, page_size: pageSize, q } }),

  detail: (id) => get(`/drugs/${id}`),
}

// ── 检验检查知识库 ───────────────────────────────────────────
export const examApi = {
  list: ({ type, page = 1, pageSize = 20, q } = {}) =>
    get('/exams', { params: { type, page, page_size: pageSize, q } }),

  detail: (id) => get(`/exams/${id}`),
}

// ── 临床指南库 ──────────────────────────────────────────────
export const guidelineApi = {
  list: ({ department, page = 1, pageSize = 20, q } = {}) =>
    get('/guidelines', { params: { department, page, page_size: pageSize, q } }),

  detail: (id) => get(`/guidelines/${id}`),
}

export const literatureApi = {
  list: ({ page = 1, pageSize = 20, q, department } = {}) =>
    get('/literature', { params: { page, page_size: pageSize, q, department } }),

  detail: (id) => get(`/literature/${id}`),

  listCases: ({ page = 1, pageSize = 20, q, department } = {}) =>
    get('/cases', { params: { page, page_size: pageSize, q, department } }),

  caseDetail: (id) => get(`/cases/${id}`),
}

// ── 医学公式库 ──────────────────────────────────────────────
export const formulaApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/formulas', { params: { page, page_size: pageSize, q } }),

  detail: (id) => get(`/formulas/${id}`),

  calculate: (id, params) => post(`/formulas/${id}/calculate`, params),
}

// ── 评估量表 ────────────────────────────────────────────────
export const assessmentApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/assessments', { params: { page, page_size: pageSize, q } }),

  detail: (id) => get(`/assessments/${id}`),

  score: (id, answers) => post(`/assessments/${id}/score`, answers),
}

// ── 治疗方案 ────────────────────────────────────────────────
export const treatmentApi = {
  get: (diseaseId, patientId) =>
    get(`/treatment/${diseaseId}`, { params: patientId ? { patient_id: patientId } : undefined }),
}

export const configApi = {
  nav: () => get('/config/nav'),
}
