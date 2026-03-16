export const Colors = {
  primary: '#1677FF',
  primaryLight: '#E6F4FF',
  health: '#00B96B',
  healthLight: '#D9F7BE',
  warning: '#FA8C16',
  warningLight: '#FFF7E6',
  danger: '#F5222D',
  dangerLight: '#FFF1F0',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  textPrimary: '#1C2D4F',
  textSecondary: '#6B7FA3',
  border: '#E8EDF5',
  tabBar: '#FFFFFF',
  tabActive: '#1677FF',
  tabInactive: '#8C9BB5',
} as const;

export const KnowledgeTypeColors: Record<string, string> = {
  disease: '#1677FF',
  drug: '#7C3AED',
  exam: '#059669',
  guideline: '#D97706',
  formula: '#0891B2',
  assessment: '#DB2777',
  sanji: '#65A30D',
};

export const KnowledgeTypeLabels: Record<string, string> = {
  disease: '疾病',
  drug: '药品',
  exam: '检验',
  guideline: '指南',
  formula: '公式',
  assessment: '量表',
  sanji: '三基',
};

export const KnowledgeTypeIcons: Record<string, string> = {
  disease: '🫀',
  drug: '💊',
  exam: '🔬',
  guideline: '📋',
  formula: '🧮',
  assessment: '📊',
  sanji: '📚',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;
