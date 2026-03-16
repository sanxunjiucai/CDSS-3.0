import React from 'react';
import { ScrollView, View, Text, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DetailHeader } from '@/components/knowledge/DetailHeader';
import { InfoSection, TextBlock } from '@/components/knowledge/InfoSection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDetail } from '@/hooks/useDetail';
import client from '@/api/client';
import { Colors, Spacing } from '@/constants/theme';

export default function SanjiDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, reload } = useDetail(Number(id), {
    fetchFn: (id) => client.get(`/sanji/${id}`) as any,
    type: 'sanji',
    titleKey: 'title',
    subtitleKey: 'domain',
  });

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;
  if (error || !data) return (
    <EmptyState icon="⚠️" title="加载失败" description={error || '未找到该内容'} actionText="重试" onAction={reload} />
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor="#65A30D" />}
    >
      <DetailHeader
        id={Number(id)}
        type="sanji"
        title={data.title || data.name}
        subtitle={data.domain ? `${data.domain} · ${data.category || ''}` : data.category}
        tags={[data.difficulty, data.tag].filter(Boolean)}
      />
      <View style={{ padding: Spacing.base }}>
        {data.content && (
          <InfoSection title="内容" icon="📖">
            <TextBlock text={data.content} />
          </InfoSection>
        )}
        {data.key_points && (
          <InfoSection title="重点" icon="⭐">
            <TextBlock text={data.key_points} />
          </InfoSection>
        )}
        {data.question && (
          <InfoSection title="练习题" icon="❓">
            <TextBlock text={data.question} />
          </InfoSection>
        )}
        {data.answer && (
          <InfoSection title="参考答案" icon="✅">
            <TextBlock text={data.answer} />
          </InfoSection>
        )}
      </View>
    </ScrollView>
  );
}
