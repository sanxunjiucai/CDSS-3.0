import client from './client';

// ── 搜索 ──────────────────────────────────────────────
export const search = (q: string, type?: string, page = 1, size = 20) =>
  client.get('/search', { params: { q, type, page, size } });

// ── 统计 ──────────────────────────────────────────────
export const getStats = () => client.get('/stats');

// ── 疾病 ──────────────────────────────────────────────
export const getDiseases = (params?: { q?: string; page?: number; size?: number }) =>
  client.get('/diseases', { params });

export const getDiseaseById = (id: number) => client.get(`/diseases/${id}`);

// ── 药品 ──────────────────────────────────────────────
export const getDrugs = (params?: { q?: string; page?: number; size?: number }) =>
  client.get('/drugs', { params });

export const getDrugById = (id: number) => client.get(`/drugs/${id}`);

// ── 检验 ──────────────────────────────────────────────
export const getExams = (params?: { q?: string; page?: number; size?: number }) =>
  client.get('/exams', { params });

export const getExamById = (id: number) => client.get(`/exams/${id}`);

// ── 指南 ──────────────────────────────────────────────
export const getGuidelines = (params?: { q?: string; page?: number; size?: number }) =>
  client.get('/guidelines', { params });

export const getGuidelineById = (id: number) => client.get(`/guidelines/${id}`);

// ── 公式 ──────────────────────────────────────────────
export const getFormulas = (params?: { q?: string; page?: number; size?: number }) =>
  client.get('/formulas', { params });

export const getFormulaById = (id: number) => client.get(`/formulas/${id}`);

export const calculateFormula = (id: number, inputs: Record<string, number | string>) =>
  client.post(`/formulas/${id}/calculate`, { inputs });

// ── 量表 ──────────────────────────────────────────────
export const getAssessments = (params?: { q?: string; page?: number; size?: number }) =>
  client.get('/assessments', { params });

export const getAssessmentById = (id: number) => client.get(`/assessments/${id}`);

export const scoreAssessment = (id: number, answers: Record<string, number>) =>
  client.post(`/assessments/${id}/score`, { answers });
