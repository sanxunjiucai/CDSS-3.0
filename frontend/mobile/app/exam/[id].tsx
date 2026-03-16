import React from 'react';
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DetailHeader } from '@/components/knowledge/DetailHeader';
import { InfoSection, InfoRow, TextBlock } from '@/components/knowledge/InfoSection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDetail } from '@/hooks/useDetail';
import { getExamById } from '@/api/knowledge';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

function ReferenceRangeCard({ range }: { range: any }) {
  if (!range) return null;
  const items = Array.isArray(range) ? range : [range];
  return (
    <View>
      {items.map((r: any, i: number) => {
        const label = r.group || r.label || (i === 0 ? '正常范围' : `范围${i + 1}`);
        const value = r.range || r.value || r.normal_range;
        const unit = r.unit || '';
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: Colors.border }}>
            <Text style={{ flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary }}>{label}</Text>
            <View style={{ backgroundColor: Colors.healthLight, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.health }}>{value} {unit}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function ExamDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useDetail(Number(id), {
    fetchFn: getExamById,
    type: 'exam',
    titleKey: 'name',
    subtitleKey: 'description',
  });

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;
  if (error || !data) return (
    <EmptyState icon="⚠️" title="加载失败" description={error || '未找到该检验项目'} actionText="重试" onAction={reload} />
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor="#059669" />}
    >
      <DetailHeader
        id={Number(id)}
        type="exam"
        title={data.name}
        subtitle={data.description}
        tags={[data.category, data.exam_type].filter(Boolean)}
      />

      <View style={{ padding: Spacing.base }}>
        <InfoSection title="项目信息" icon="ℹ️">
          <InfoRow label="检验类别" value={data.category} />
          <InfoRow label="英文名" value={data.english_name || data.abbreviation} />
          <InfoRow label="样本类型" value={data.sample_type} />
          <InfoRow label="检测方法" value={data.method} />
        </InfoSection>

        {/* 参考范围 —— 重点展示 */}
        <InfoSection title="参考范围" icon="📊">
          <ReferenceRangeCard range={data.reference_ranges || data.reference_range} />
          {data.unit && (
            <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 6 }}>
              单位：{data.unit}
            </Text>
          )}
        </InfoSection>

        {data.clinical_significance && (
          <InfoSection title="临床意义" icon="🔍">
            <InfoSection title="偏高意义" icon="⬆️">
              <TextBlock text={data.clinical_significance.high || data.clinical_significance.elevated || ''} />
            </InfoSection>
            <InfoSection title="偏低意义" icon="⬇️">
              <TextBlock text={data.clinical_significance.low || data.clinical_significance.decreased || ''} />
            </InfoSection>
          </InfoSection>
        )}

        {data.description && (
          <InfoSection title="检验说明" icon="📋">
            <TextBlock text={data.description} />
          </InfoSection>
        )}

        {data.preparation && (
          <InfoSection title="检查前准备" icon="📝">
            <TextBlock text={data.preparation} />
          </InfoSection>
        )}
      </View>
    </ScrollView>
  );
}
