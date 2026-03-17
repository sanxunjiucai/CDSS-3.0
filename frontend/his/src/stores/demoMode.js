/**
 * 演示模式：模拟诊疗流程逐步推进
 * 用于展示完整的智能辅助流程
 */
import { create } from 'zustand'

export const useDemoModeStore = create((set, get) => ({
  enabled: false,
  currentStep: 0,

  // 演示步骤定义
  steps: [
    {
      id: 'chief_complaint',
      label: '主诉确认',
      mockItem: {
        type: 'chief_complaint',
        title: '建议确认主诉',
        reason: '已从病历中识别到主诉信息',
        content: '胸痛3小时，持续性，伴出汗',
        actions: ['采纳并写入HIS', '修改后写入', '暂不处理'],
      },
    },
    {
      id: 'diagnosis',
      label: '诊断建议',
      mockItem: {
        type: 'diagnosis',
        title: '建议确认初步诊断',
        reason: '根据主诉、症状和检验结果综合分析',
        content: '急性冠脉综合征（ACS）',
        actions: ['采纳并写入HIS', '查看依据', '暂不处理'],
      },
    },
    {
      id: 'exam',
      label: '检查推荐',
      mockItem: {
        type: 'exam',
        title: '建议补充关键检查',
        reason: '诊断ACS需要进一步明确',
        content: '心电图、心肌酶谱（肌钙蛋白I）、冠脉CTA',
        actions: ['加入申请单', '查看详情', '暂不处理'],
      },
    },
    {
      id: 'high_risk',
      label: '高危提醒',
      mockItem: {
        type: 'high_risk',
        title: '危急值提醒',
        reason: '肌钙蛋白I 2.8 ng/mL（参考值<0.04）',
        content: '提示急性心肌损伤，建议立即启动胸痛中心流程',
        actions: ['立即处理', '查看详情'],
      },
    },
    {
      id: 'treatment',
      label: '治疗方案',
      mockItem: {
        type: 'treatment',
        title: '建议确认治疗方案',
        reason: '诊断为急性心肌梗死',
        content: '双联抗血小板（阿司匹林300mg + 氯吡格雷300mg）+ 阿托伐他汀40mg + 美托洛尔25mg',
        actions: ['采纳并写入HIS', '查看详情', '暂不处理'],
      },
    },
  ],

  enableDemo: () => set({ enabled: true, currentStep: 0 }),
  disableDemo: () => set({ enabled: false, currentStep: 0 }),

  nextStep: () => {
    const { currentStep, steps } = get()
    if (currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 })
    }
  },

  prevStep: () => {
    const { currentStep } = get()
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  getCurrentItem: () => {
    const { enabled, currentStep, steps } = get()
    if (!enabled) return null
    return steps[currentStep]?.mockItem || null
  },
}))
