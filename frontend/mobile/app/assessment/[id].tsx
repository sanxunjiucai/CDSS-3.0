import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { DetailHeader } from '@/components/knowledge/DetailHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDetail } from '@/hooks/useDetail';
import { getAssessmentById, scoreAssessment } from '@/api/knowledge';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

function ScoreResultPage({ score, interpretation, recommendations, onRetry }: {
  score: number;
  interpretation: string;
  recommendations?: string[];
  onRetry: () => void;
}) {
  const router = useRouter();
  const level = interpretation?.toLowerCase();
  const isHigh = level?.includes('高') || level?.includes('重') || level?.includes('severe');
  const isMid = level?.includes('中') || level?.includes('moderate');
  const color = isHigh ? Colors.danger : isMid ? Colors.warning : Colors.health;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.base }}>
      <View style={{ alignItems: 'center', marginBottom: Spacing.lg }}>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8 }}>评估结果</Text>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: color }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color }}>{score}</Text>
        </View>
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 }}>分</Text>
      </View>

      <View style={{ backgroundColor: color + '18', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.base, alignItems: 'center' }}>
        <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color }}>{interpretation}</Text>
      </View>

      {recommendations && recommendations.length > 0 && (
        <View style={{ backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.base }}>
          <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm }}>
            📋 推荐处置意见
          </Text>
          {recommendations.map((rec, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Text style={{ color: Colors.primary, fontWeight: '700', marginRight: 8 }}>•</Text>
              <Text style={{ flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 }}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ gap: Spacing.sm }}>
        <TouchableOpacity
          onPress={onRetry}
          style={{ backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: FontSize.base, fontWeight: '700' }}>重新评估</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center' }}
        >
          <Text style={{ color: Colors.textSecondary, fontSize: FontSize.base }}>返回</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default function AssessmentDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState('');

  const { data, loading, error, reload } = useDetail(Number(id), {
    fetchFn: getAssessmentById,
    type: 'assessment',
    titleKey: 'name',
    subtitleKey: 'purpose',
  });

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    const questions = data?.questions || [];
    if (currentStep < questions.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setScoring(true);
    setScoreError('');
    try {
      const res = await scoreAssessment(Number(id), answers) as any;
      setResult(res?.data || res);
    } catch (e: any) {
      setScoreError(e.message || '评分失败');
    } finally {
      setScoring(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setAnswers({});
    setCurrentStep(0);
  };

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;
  if (error || !data) return (
    <EmptyState icon="⚠️" title="加载失败" description={error || '未找到该量表'} actionText="重试" onAction={reload} />
  );

  const questions = data.questions || [];

  // 显示结果页
  if (result) {
    return (
      <View style={{ flex: 1 }}>
        <DetailHeader
          id={Number(id)}
          type="assessment"
          title={data.name}
          subtitle={data.purpose}
        />
        <ScoreResultPage
          score={result.total_score ?? result.score ?? 0}
          interpretation={result.interpretation || result.level || '评估完成'}
          recommendations={result.recommendations || result.suggestions}
          onRetry={handleRetry}
        />
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <EmptyState icon="📊" title="该量表暂无题目" description="题目数据尚未配置" />
    );
  }

  const question = questions[currentStep];
  const progress = (currentStep + 1) / questions.length;
  const isAnswered = answers[question.id || String(currentStep)] !== undefined;
  const isLast = currentStep === questions.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <DetailHeader
        id={Number(id)}
        type="assessment"
        title={data.name}
        subtitle={data.purpose}
      />

      {/* 进度条 */}
      <View style={{ backgroundColor: Colors.card, padding: Spacing.base }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary }}>
            第 {currentStep + 1} 题 / 共 {questions.length} 题
          </Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
        <View style={{ height: 6, backgroundColor: Colors.border, borderRadius: 3 }}>
          <View style={{ height: 6, backgroundColor: Colors.primary, borderRadius: 3, width: `${progress * 100}%` }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.base }}>
        {/* 题干 */}
        <View style={{ backgroundColor: Colors.card, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.base }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, lineHeight: 28 }}>
            {question.question || question.text || question.label}
          </Text>
          {question.hint && (
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 6 }}>{question.hint}</Text>
          )}
        </View>

        {/* 选项 */}
        {(question.options || []).map((opt: any) => {
          const optValue = typeof opt === 'object' ? opt.score ?? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label || opt.text : String(opt);
          const qKey = question.id || String(currentStep);
          const selected = answers[qKey] === optValue;

          return (
            <TouchableOpacity
              key={optValue}
              activeOpacity={0.7}
              onPress={() => handleAnswer(qKey, optValue)}
              style={{
                backgroundColor: selected ? Colors.primary : Colors.card,
                borderRadius: BorderRadius.lg,
                padding: Spacing.base,
                marginBottom: Spacing.sm,
                borderWidth: selected ? 0 : 1,
                borderColor: Colors.border,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: selected ? 'rgba(255,255,255,0.3)' : Colors.bg,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: Spacing.sm,
                borderWidth: selected ? 0 : 1,
                borderColor: Colors.border,
              }}>
                {selected && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ flex: 1, fontSize: FontSize.base, color: selected ? '#fff' : Colors.textPrimary, fontWeight: selected ? '600' : '400' }}>
                {optLabel}
              </Text>
              {typeof optValue === 'number' && (
                <Text style={{ fontSize: FontSize.sm, color: selected ? 'rgba(255,255,255,0.7)' : Colors.textSecondary }}>
                  +{optValue}分
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        {scoreError ? (
          <View style={{ backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.md, padding: Spacing.sm + 4, marginTop: Spacing.sm }}>
            <Text style={{ color: Colors.danger, fontSize: FontSize.sm }}>{scoreError}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* 导航按钮 */}
      <View style={{ backgroundColor: Colors.card, padding: Spacing.base, flexDirection: 'row', gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }}>
        {currentStep > 0 && (
          <TouchableOpacity
            onPress={() => setCurrentStep((s) => s - 1)}
            style={{ flex: 1, backgroundColor: Colors.bg, borderRadius: BorderRadius.lg, padding: Spacing.base - 2, alignItems: 'center' }}
          >
            <Text style={{ color: Colors.textSecondary, fontSize: FontSize.base, fontWeight: '600' }}>上一题</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isAnswered || scoring}
          style={{
            flex: 2,
            backgroundColor: (!isAnswered || scoring) ? Colors.border : Colors.primary,
            borderRadius: BorderRadius.lg,
            padding: Spacing.base - 2,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: (!isAnswered || scoring) ? Colors.textSecondary : '#fff', fontSize: FontSize.base, fontWeight: '700' }}>
            {scoring ? '计算中…' : isLast ? '提交评估' : '下一题'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
