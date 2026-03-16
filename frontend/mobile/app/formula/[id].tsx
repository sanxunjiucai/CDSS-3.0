import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DetailHeader } from '@/components/knowledge/DetailHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDetail } from '@/hooks/useDetail';
import { getFormulaById, calculateFormula } from '@/api/knowledge';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

function ResultCard({ result }: { result: any }) {
  if (!result) return null;
  const value = result.result ?? result.value;
  const interpretation = result.interpretation || result.description;
  const level = result.level || result.risk_level;

  const levelColors: Record<string, string> = {
    low: Colors.health,
    normal: Colors.health,
    mild: Colors.warning,
    moderate: Colors.warning,
    high: Colors.danger,
    severe: Colors.danger,
    '低': Colors.health,
    '正常': Colors.health,
    '轻度': Colors.warning,
    '中度': Colors.warning,
    '高': Colors.danger,
    '重度': Colors.danger,
  };
  const levelColor = level ? (levelColors[level] || Colors.primary) : Colors.primary;

  return (
    <View style={{ backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginTop: Spacing.lg, alignItems: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 }}>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 }}>计算结果</Text>
      <Text style={{ fontSize: 42, fontWeight: '800', color: levelColor, marginBottom: 8 }}>
        {typeof value === 'number' ? value.toFixed(2).replace(/\.?0+$/, '') : value}
      </Text>
      {result.unit && (
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 }}>{result.unit}</Text>
      )}
      {level && (
        <View style={{ backgroundColor: levelColor + '18', borderRadius: BorderRadius.full, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 8 }}>
          <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: levelColor }}>{level}</Text>
        </View>
      )}
      {interpretation && (
        <View style={{ backgroundColor: Colors.bg, borderRadius: BorderRadius.md, padding: Spacing.sm + 4, width: '100%', marginTop: 4 }}>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22, textAlign: 'center' }}>
            {interpretation}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function FormulaDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState('');

  const { data, loading, error, reload } = useDetail(Number(id), {
    fetchFn: getFormulaById,
    type: 'formula',
    titleKey: 'name',
    subtitleKey: 'description',
  });

  const handleCalculate = async () => {
    if (!data?.parameters) return;
    // 校验必填参数
    const missing = data.parameters.filter((p: any) => !inputs[p.name] && !p.optional);
    if (missing.length > 0) {
      setCalcError(`请填写：${missing.map((p: any) => p.label || p.name).join('、')}`);
      return;
    }
    setCalcError('');
    setCalculating(true);
    try {
      const numericInputs = Object.fromEntries(
        Object.entries(inputs).map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])
      );
      const res = await calculateFormula(Number(id), numericInputs) as any;
      setResult(res?.data || res);
    } catch (e: any) {
      setCalcError(e.message || '计算失败');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;
  if (error || !data) return (
    <EmptyState icon="⚠️" title="加载失败" description={error || '未找到该公式'} actionText="重试" onAction={reload} />
  );

  const parameters = data.parameters || [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <DetailHeader
          id={Number(id)}
          type="formula"
          title={data.name}
          subtitle={data.description}
          tags={[data.formula_type, data.category].filter(Boolean)}
        />

        <View style={{ padding: Spacing.base }}>
          {/* 公式说明 */}
          {data.formula_expression && (
            <View style={{ backgroundColor: '#7C3AED18', borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.base }}>
              <Text style={{ fontSize: FontSize.xs, color: '#7C3AED', fontWeight: '600', marginBottom: 4 }}>公式</Text>
              <Text style={{ fontSize: FontSize.sm, color: '#7C3AED', fontFamily: 'monospace' }}>{data.formula_expression}</Text>
            </View>
          )}

          {/* 参数输入区 */}
          <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm }}>
            输入参数
          </Text>

          {parameters.map((param: any) => (
            <View key={param.name} style={{ marginBottom: Spacing.base }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 }}>
                {param.label || param.name}
                {param.unit ? ` (${param.unit})` : ''}
                {param.optional ? '' : ' *'}
              </Text>

              {param.type === 'select' && param.options ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {param.options.map((opt: any) => {
                    const optValue = typeof opt === 'object' ? String(opt.value) : String(opt);
                    const optLabel = typeof opt === 'object' ? opt.label : String(opt);
                    const selected = inputs[param.name] === optValue;
                    return (
                      <TouchableOpacity
                        key={optValue}
                        onPress={() => setInputs((prev) => ({ ...prev, [param.name]: optValue }))}
                        style={{
                          paddingHorizontal: Spacing.base,
                          paddingVertical: 8,
                          borderRadius: BorderRadius.md,
                          backgroundColor: selected ? Colors.primary : Colors.card,
                          borderWidth: 1,
                          borderColor: selected ? Colors.primary : Colors.border,
                        }}
                      >
                        <Text style={{ fontSize: FontSize.sm, color: selected ? '#fff' : Colors.textPrimary, fontWeight: selected ? '600' : '400' }}>
                          {optLabel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  value={inputs[param.name] || ''}
                  onChangeText={(v) => setInputs((prev) => ({ ...prev, [param.name]: v }))}
                  placeholder={param.placeholder || `请输入${param.label || param.name}`}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType={param.type === 'number' ? 'decimal-pad' : 'default'}
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: BorderRadius.md,
                    padding: Spacing.base,
                    fontSize: FontSize.base,
                    color: Colors.textPrimary,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                />
              )}

              {param.hint && (
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 }}>{param.hint}</Text>
              )}
            </View>
          ))}

          {/* 错误提示 */}
          {calcError ? (
            <View style={{ backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md, padding: Spacing.sm + 4, marginBottom: Spacing.base }}>
              <Text style={{ color: Colors.danger, fontSize: FontSize.sm }}>{calcError}</Text>
            </View>
          ) : null}

          {/* 计算按钮 */}
          <TouchableOpacity
            onPress={handleCalculate}
            disabled={calculating}
            style={{
              backgroundColor: calculating ? Colors.textSecondary : Colors.primary,
              borderRadius: BorderRadius.lg,
              padding: Spacing.base,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '700' }}>
              {calculating ? '计算中…' : '计 算'}
            </Text>
          </TouchableOpacity>

          {/* 结果展示 */}
          <ResultCard result={result} />

          {/* 重置按钮 */}
          {result && (
            <TouchableOpacity
              onPress={() => { setResult(null); setInputs({}); }}
              style={{ marginTop: Spacing.base, alignItems: 'center', padding: Spacing.sm }}
            >
              <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm }}>重新计算</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
