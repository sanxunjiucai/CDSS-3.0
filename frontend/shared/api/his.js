import { get, post } from './request'

export const patientApi = {
  setContext:   (data)      => post('/patient/context', data),
  getContext:   (patientId) => get(`/patient/context/${patientId}`),
  clearContext: (patientId) => post(`/patient/context/${patientId}/clear`),
}

export const diagnosisApi = {
  suggest: (symptoms, topK = 5) =>
    get('/diagnosis/suggest', { params: { symptoms, top_k: topK } }),
}

export const treatmentApi = {
  get: (diseaseId, patientId) =>
    get(`/treatment/${diseaseId}`, { params: { patient_id: patientId } }),
}

export const labResultApi = {
  interpret: (labResults, patientId) =>
    post('/lab-result/interpret', labResults, { params: { patient_id: patientId } }),
  fromLIS: (patientId) => get(`/lab-result/from-lis/${patientId}`),
}

export const auditApi = {
  checkDrug: (drugName, drugId, patientId) =>
    post('/audit/drug', null, {
      params: { drug_name: drugName, drug_id: drugId, patient_id: patientId },
    }),
}
