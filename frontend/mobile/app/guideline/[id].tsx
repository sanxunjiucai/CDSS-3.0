import React from 'react';
import { ScrollView, View, Text, RefreshControl, Linking, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DetailHeader } from '@/components/knowledge/DetailHeader';
import { InfoSection, InfoRow, TextBlock } from '@/components/knowledge/InfoSection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDetail } from '@/hooks/useDetail';
import { getGuidelineById } from '@/api/knowledge';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

export default function GuidelineDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useDetail(Number(id), {
    fetchFn: getGuidelineById,
    type: 'guideline',
    titleKey: 'title',
    subtitleKey: 'organization',
  });

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;
  if (error || !data) return (
    <EmptyState icon="⚠️" title="加载失败" description={error || '未找到该指南'} actionText="重试" onAction={reload} />
  );

  const tags = [
    ...(data.disease_tags || []),
    data.specialty,
    data.grade,
  ].filter(Boolean);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor="#D97706" />}
    >
      <DetailHeader
        id={Number(id)}
        type="guideline"
        title={data.title}
        subtitle={data.organization}
        tags={tags}
        meta={data.publish_year ? `发布年份：${data.publish_year}` : undefined}
      />

      <View style={{ padding: Spacing.base }}>
        <InfoSection title="指南信息" icon="ℹ️">
          <InfoRow label="发布机构" value={data.organization} />
          <InfoRow label="发布年份" value={data.publish_year} />
          <InfoRow label="证据级别" value={data.evidence_level} />
          <InfoRow label="推荐级别" value={data.recommendation_grade || data.grade} />
          <InfoRow label="语言" value={data.language} />
        </InfoSection>

        {data.summary && (
          <InfoSection title="指南摘要" icon="📄">
            <TextBlock text={data.summary} />
          </InfoSection>
        )}

        {data.content && (
          <InfoSection title="指南内容" icon="📋">
            <TextBlock text={data.content} />
          </InfoSection>
        )}

        {data.key_recommendations && (
          <InfoSection title="核心推荐意见" icon="⭐">
            {Array.isArray(data.key_recommendations)
              ? data.key_recommendations.map((rec: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
                  <Text style={{ color: Colors.primary, fontWeight: '700', marginRight: 8 }}>{i + 1}.</Text>
                  <Text style={{ flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 20 }}>{rec}</Text>
                </View>
              ))
              : <TextBlock text={data.key_recommendations} />
            }
          </InfoSection>
        )}

        {data.source_url && (
          <TouchableOpacity
            onPress={() => Linking.openURL(data.source_url)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: Colors.primaryLight,
              borderRadius: BorderRadius.lg,
              padding: Spacing.base,
              marginTop: Spacing.base,
            }}
          >
            <Text style={{ color: Colors.primary, fontSize: FontSize.base, fontWeight: '600' }}>
              🔗 查看原文链接
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
