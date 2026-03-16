import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, SectionList } from 'react-native';
import { useRouter } from 'expo-router';
import { getFormulas, getAssessments } from '@/api/knowledge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

type ToolTab = 'formula' | 'assessment';

export default function ToolsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ToolTab>('formula');
  const [formulas, setFormulas] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getFormulas({ size: 100 }) as Promise<any>,
      getAssessments({ size: 100 }) as Promise<any>,
    ]).then(([f, a]) => {
      setFormulas(f?.data?.items || f?.items || []);
      setAssessments(a?.data?.items || a?.items || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="加载工具库…" fullScreen />;

  const data = activeTab === 'formula' ? formulas : assessments;
  const icon = activeTab === 'formula' ? '🧮' : '📊';
  const color = activeTab === 'formula' ? '#7C3AED' : '#DB2777';
  const emptyTitle = activeTab === 'formula' ? '暂无公式' : '暂无量表';

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Tab 切换 */}
      <View style={{ backgroundColor: Colors.card, flexDirection: 'row', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        {(['formula', 'assessment'] as ToolTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const tabColor = tab === 'formula' ? '#7C3AED' : '#DB2777';
          const label = tab === 'formula' ? `公式计算（${formulas.length}）` : `量表评估（${assessments.length}）`;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                marginRight: Spacing.lg,
                paddingBottom: Spacing.sm,
                borderBottomWidth: 2,
                borderBottomColor: isActive ? tabColor : 'transparent',
              }}
            >
              <Text style={{ fontSize: FontSize.base, fontWeight: isActive ? '700' : '500', color: isActive ? tabColor : Colors.textSecondary }}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 工具列表 */}
      {data.length === 0 ? (
        <EmptyState icon={icon} title={emptyTitle} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: Spacing.base }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/${activeTab === 'formula' ? 'formula' : 'assessment'}/${item.id}` as any)}
              style={{
                backgroundColor: Colors.card,
                borderRadius: BorderRadius.lg,
                padding: Spacing.base,
                marginBottom: Spacing.sm,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{
                width: 44,
                height: 44,
                borderRadius: BorderRadius.md,
                backgroundColor: color + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: Spacing.sm,
              }}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>
                  {item.name || item.title}
                </Text>
                <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                  {item.description || item.purpose || item.formula_type || ''}
                </Text>
              </View>
              <Text style={{ color: Colors.textSecondary, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
