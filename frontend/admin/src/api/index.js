import { get, post, put, del } from '@shared/api/request'

// ── 统计概览 ───────────────────────────────────────────────
export const statsApi = {
  overview: () => get('/admin/stats/overview'),
}

// ── 疾病库 ─────────────────────────────────────────────────
export const diseaseApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/diseases', { params: { page, page_size: pageSize, q } }),
  detail: (id) => get(`/diseases/${id}`),
  create: (data) => post('/admin/diseases', data),
  update: (id, data) => put(`/admin/diseases/${id}`, data),
  remove: (id) => del(`/admin/diseases/${id}`),

  // 治疗方案子接口
  listPlans: (diseaseId) => get(`/diseases/${diseaseId}/treatment-plans`),
  createPlan: (diseaseId, data) => post(`/diseases/${diseaseId}/treatment-plans`, data),
  updatePlan: (planId, data) => put(`/treatment-plans/${planId}`, data),
  removePlan: (planId) => del(`/treatment-plans/${planId}`),
}

// ── 药品库 ─────────────────────────────────────────────────
export const drugApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/drugs', { params: { page, page_size: pageSize, q } }),
  detail: (id) => get(`/drugs/${id}`),
  create: (data) => post('/admin/drugs', data),
  update: (id, data) => put(`/admin/drugs/${id}`, data),
  remove: (id) => del(`/admin/drugs/${id}`),
}

// ── 检验检查库 ──────────────────────────────────────────────
export const examApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/exams', { params: { page, page_size: pageSize, q } }),
  detail: (id) => get(`/exams/${id}`),
  create: (data) => post('/admin/exams', data),
  update: (id, data) => put(`/admin/exams/${id}`, data),
  remove: (id) => del(`/admin/exams/${id}`),
}

// ── 指南库 ─────────────────────────────────────────────────
export const guidelineApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/guidelines', { params: { page, page_size: pageSize, q } }),
  create: (data) => post('/admin/guidelines/json', data),
  update: (id, data) => put(`/admin/guidelines/${id}`, data),
  remove: (id) => del(`/admin/guidelines/${id}`),
}

export const literatureAdminApi = {
  stats: () => get('/admin/stats/literature'),
  reload: () => post('/admin/stats/literature/reload'),
  listLiterature: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/literature', { params: { page, page_size: pageSize, q } }),
  listCases: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/cases', { params: { page, page_size: pageSize, q } }),
}

// ── 公式库管理 ──────────────────────────────────────────────
export const formulaApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/formulas', { params: { page, page_size: pageSize, q } }),
  detail: (id) => get(`/formulas/${id}`),
  create: (data) => post('/admin/formulas', data),
  update: (id, data) => put(`/admin/formulas/${id}`, data),
  remove: (id) => del(`/admin/formulas/${id}`),
}

// ── 量表管理 ────────────────────────────────────────────────
export const assessmentApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/assessments', { params: { page, page_size: pageSize, q } }),
  detail: (id) => get(`/assessments/${id}`),
  create: (data) => post('/admin/assessments', data),
  update: (id, data) => put(`/admin/assessments/${id}`, data),
  remove: (id) => del(`/admin/assessments/${id}`),
}

// ── 用户管理 ────────────────────────────────────────────────
export const userApi = {
  list: ({ page = 1, pageSize = 20, q } = {}) =>
    get('/admin/users', { params: { page, page_size: pageSize, q } }),
  create: (data) => post('/admin/users', data),
  update: (id, data) => put(`/admin/users/${id}`, data),
  resetPassword: (id, newPassword) =>
    post(`/admin/users/${id}/reset-password`, { new_password: newPassword }),
  remove: (id) => del(`/admin/users/${id}`),
}

// ── 批量导入 ────────────────────────────────────────────────
export const importApi = {
  upload: (type, file) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    return post('/admin/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  history: () => get('/admin/import/history'),
}
