import { create } from 'zustand'
import { api } from '@shared/api/request'

// Mock 患者数据（开发用）
const MOCK_PATIENT = {
  patient_id: 'P001',
  name: '张大强',
  gender: 'male',
  age: 65,
  diagnoses: ['I21.0', 'I10', 'E11'],
  diagnosis_names: ['急性ST段抬高型心肌梗死', '高血压', '2型糖尿病'],
  allergies: ['青霉素'],
  chief_complaint: '胸痛、胸闷3小时',
  lab_results: [
    { item_name: 'hs-cTnT', item_code: 'HSTNT', value: 0.85,
      unit: 'ng/mL', reference_low: 0, reference_high: 0.014,
      is_abnormal: true, abnormal_type: 'high' },
    { item_name: 'NT-proBNP', item_code: 'NTPROBNP', value: 3200,
      unit: 'pg/mL', reference_low: 0, reference_high: 125,
      is_abnormal: true, abnormal_type: 'high' },
    { item_name: '血糖', item_code: 'GLU', value: 9.2,
      unit: 'mmol/L', reference_low: 3.9, reference_high: 6.1,
      is_abnormal: true, abnormal_type: 'high' },
    { item_name: '血钾', item_code: 'K', value: 3.8,
      unit: 'mmol/L', reference_low: 3.5, reference_high: 5.5,
      is_abnormal: false, abnormal_type: null },
  ],
  current_medications: ['氨氯地平', '二甲双胍', '阿司匹林'],
}

export const usePatientStore = create((set, get) => ({
  context: null,
  loading: false,

  // 从 HIS postMessage 接收患者信息
  setContextFromHIS: async (data) => {
    set({ loading: true })
    try {
      const res = await api.post('/patient/context', data)
      set({ context: res.data.data })
    } catch {
      // 接口失败时降级为传入数据
      set({ context: data })
    } finally {
      set({ loading: false })
    }
  },

  // 开发调试：加载 Mock 患者
  loadMockPatient: () => {
    set({ context: MOCK_PATIENT })
  },

  clearContext: () => set({ context: null }),

  // 便捷 getters
  get hasPatient() { return !!get().context?.patient_id },
  get patientId()  { return get().context?.patient_id },
}))
