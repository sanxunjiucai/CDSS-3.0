import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DetailHeader } from '@/components/knowledge/DetailHeader';
import { InfoSection, InfoRow, TextBlock } from '@/components/knowledge/InfoSection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDetail } from '@/hooks/useDetail';
import { getDiseaseById } from '@/api/knowledge';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const TABS = ['概述', '症状', '诊断', '治疗', '预后'];

export default function DiseaseDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('概述');
  const { data, loading, error, reload } = useDetail(Number(id), {
    fetchFn: getDiseaseById,
    type: 'disease',
    titleKey: 'name',
    subtitleKey: 'description',
  });

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;
  if (error || !data) return (
    <EmptyState icon="⚠️" title="加载失败" description={error || '未找到该疾病'} actionText="重试" onAction={reload} />
  );

  const tabContent: Record<string, React.ReactNode> = {
    概述: (
      <View>
        <InfoSection title="疾病概述" icon="📄">
          <TextBlock text={data.description || data.overview || '暂无概述信息'} />
        </InfoSection>
        <InfoSection title="基本信息" icon="ℹ️">
          <InfoRow label="ICD编码" value={data.icd_code} />
          <InfoRow label="所属科室" value={data.department} />
          <InfoRow label="疾病系统" value={data.system} />
          <InfoRow label="疾病类型" value={data.disease_type} />
        </InfoSection>
        {data.etiology && (
          <InfoSection title="病因" icon="🔬">
            <TextBlock text={data.etiology} />
          </InfoSection>
        )}
      </View>
    ),
    症状: (
      <View>
        <InfoSection title="临床症状" icon="🩺">
          <TextBlock text={data.symptoms || data.clinical_manifestations || '暂无症状信息'} />
        </InfoSection>
        {data.physical_signs && (
          <InfoSection title="体征" icon="👁️">
            <TextBlock text={data.physical_signs} />
          </InfoSection>
        )}
      </View>
    ),
    诊断: (
      <View>
        <InfoSection title="诊断标准" icon="✅">
          <TextBlock text={data.diagnosis || data.diagnostic_criteria || '暂无诊断信息'} />
        </InfoSection>
        {data.differential_diagnosis && (
          <InfoSection title="鉴别诊断" icon="⚖️">
            <TextBlock text={data.differential_diagnosis} />
          </InfoSection>
        )}
      </View>
    ),
    治疗: (
      <View>
        <InfoSection title="治疗原则" icon="💉">
          <TextBlock text={data.treatment || data.treatment_principles || '暂无治疗信息'} />
        </InfoSection>
        {data.medication && (
          <InfoSection title="药物治疗" icon="💊">
            <TextBlock text={data.medication} />
          </InfoSection>
        )}
        {data.surgery && (
          <InfoSection title="手术治疗" icon="🔪">
            <TextBlock text={data.surgery} />
          </InfoSection>
        )}
      </View>
    ),
    预后: (
      <View>
        <InfoSection title="预后" icon="📈">
          <TextBlock text={data.prognosis || data.outcome || '暂无预后信息'} />
        </InfoSection>
        {data.prevention && (
          <InfoSection title="预防" icon="🛡️">
            <TextBlock text={data.prevention} />
          </InfoSection>
        )}
      </View>
    ),
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={Colors.primary} />}
    >
      <DetailHeader
        id={Number(id)}
        type="disease"
        title={data.name}
        subtitle={data.description}
        tags={[data.department, data.system].filter(Boolean)}
        meta={data.icd_code ? `ICD-10: ${data.icd_code}` : undefined}
      />

      {/* Tab 切换 */}
      <View style={{ backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.base, gap: 0 }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: Spacing.base,
                paddingVertical: Spacing.sm + 2,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab ? '#1677FF' : 'transparent',
              }}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: activeTab === tab ? '700' : '500', color: activeTab === tab ? '#1677FF' : Colors.textSecondary }}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 内容区 */}
      <View style={{ padding: Spacing.base }}>
        {tabContent[activeTab]}
      </View>
    </ScrollView>
  );
}
