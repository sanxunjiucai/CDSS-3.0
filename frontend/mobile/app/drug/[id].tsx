import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DetailHeader } from '@/components/knowledge/DetailHeader';
import { InfoSection, InfoRow, TextBlock } from '@/components/knowledge/InfoSection';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDetail } from '@/hooks/useDetail';
import { getDrugById } from '@/api/knowledge';
import { Colors, FontSize, Spacing } from '@/constants/theme';

const TABS = ['说明书', '用法用量', '禁忌', '不良反应', '相互作用'];

export default function DrugDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('说明书');
  const { data, loading, error, reload } = useDetail(Number(id), {
    fetchFn: getDrugById,
    type: 'drug',
    titleKey: 'generic_name',
    subtitleKey: 'indication',
  });

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;
  if (error || !data) return (
    <EmptyState icon="⚠️" title="加载失败" description={error || '未找到该药品'} actionText="重试" onAction={reload} />
  );

  const name = data.generic_name || data.name;
  const tabContent: Record<string, React.ReactNode> = {
    说明书: (
      <View>
        <InfoSection title="药品信息" icon="ℹ️">
          <InfoRow label="通用名" value={data.generic_name} />
          <InfoRow label="商品名" value={data.brand_name} />
          <InfoRow label="分类" value={data.drug_class || data.category} />
          <InfoRow label="ATC编码" value={data.atc_code} />
          <InfoRow label="剂型" value={data.dosage_form} />
          <InfoRow label="规格" value={data.specification} />
          <InfoRow label="医保类型" value={data.insurance_type} />
        </InfoSection>
        {data.indication && (
          <InfoSection title="适应症" icon="✅">
            <TextBlock text={data.indication} />
          </InfoSection>
        )}
        {data.pharmacology && (
          <InfoSection title="药理作用" icon="🔬">
            <TextBlock text={data.pharmacology} />
          </InfoSection>
        )}
      </View>
    ),
    用法用量: (
      <View>
        <InfoSection title="用法用量" icon="💊">
          <TextBlock text={data.dosage || data.usage || '暂无用法用量信息'} />
        </InfoSection>
        {data.administration_route && (
          <InfoSection title="给药途径" icon="💉">
            <TextBlock text={data.administration_route} />
          </InfoSection>
        )}
      </View>
    ),
    禁忌: (
      <View>
        {data.contraindication && (
          <InfoSection title="禁忌症" icon="🚫">
            <TextBlock text={data.contraindication} />
          </InfoSection>
        )}
        {data.precaution && (
          <InfoSection title="注意事项" icon="⚠️">
            <TextBlock text={data.precaution} />
          </InfoSection>
        )}
        {data.pregnancy_category && (
          <InfoSection title="孕妇用药" icon="🤰">
            <InfoRow label="妊娠分级" value={data.pregnancy_category} />
            <TextBlock text={data.pregnancy_note || ''} />
          </InfoSection>
        )}
      </View>
    ),
    不良反应: (
      <View>
        <InfoSection title="不良反应" icon="⚠️">
          <TextBlock text={data.adverse_reaction || data.side_effect || '暂无不良反应信息'} />
        </InfoSection>
      </View>
    ),
    相互作用: (
      <View>
        <InfoSection title="药物相互作用" icon="🔄">
          <TextBlock text={data.drug_interaction || data.interaction || '暂无相互作用信息'} />
        </InfoSection>
        {data.food_interaction && (
          <InfoSection title="食物相互作用" icon="🍎">
            <TextBlock text={data.food_interaction} />
          </InfoSection>
        )}
      </View>
    ),
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor="#7C3AED" />}
    >
      <DetailHeader
        id={Number(id)}
        type="drug"
        title={name}
        subtitle={data.brand_name ? `商品名：${data.brand_name}` : data.indication?.slice(0, 50)}
        tags={[data.drug_class, data.dosage_form].filter(Boolean)}
        meta={data.atc_code ? `ATC: ${data.atc_code}` : undefined}
      />

      {/* Tab */}
      <View style={{ backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.base }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{ paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm + 2, borderBottomWidth: 2, borderBottomColor: activeTab === tab ? '#7C3AED' : 'transparent' }}
            >
              <Text style={{ fontSize: FontSize.sm, fontWeight: activeTab === tab ? '700' : '500', color: activeTab === tab ? '#7C3AED' : Colors.textSecondary }}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ padding: Spacing.base }}>{tabContent[activeTab]}</View>
    </ScrollView>
  );
}
