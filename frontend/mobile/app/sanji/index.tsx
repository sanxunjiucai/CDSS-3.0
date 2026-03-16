import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import client from '@/api/client';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const DOMAIN_LABELS: Record<string, string> = {
  clinical: '临床医学',
  nursing: '护理学',
  imaging: '影像检验',
};

const DOMAIN_ICONS: Record<string, string> = {
  clinical: '🏥',
  nursing: '💉',
  imaging: '🔬',
};

export default function SanjiPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    client.get('/sanji', { params: { size: 200 } }).then((res: any) => {
      setItems(res?.data?.items || res?.items || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="加载中…" fullScreen />;

  const filtered = activeFilter ? items.filter((i) => i.domain === activeFilter) : items;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* 筛选 */}
      <View style={{ backgroundColor: Colors.card, flexDirection: 'row', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        {[{ key: '', label: '全部' }, ...Object.keys(DOMAIN_LABELS).map(k => ({ key: k, label: DOMAIN_LABELS[k] }))].map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: BorderRadius.full,
              backgroundColor: activeFilter === f.key ? '#65A30D' : Colors.bg,
            }}
          >
            <Text style={{ fontSize: FontSize.sm, color: activeFilter === f.key ? '#fff' : Colors.textSecondary, fontWeight: activeFilter === f.key ? '700' : '400' }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState icon="📚" title="暂无三基内容" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: Spacing.base }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/sanji/${item.id}` as any)}
              style={{ backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center' }}
            >
              <View style={{ width: 40, height: 40, borderRadius: BorderRadius.md, backgroundColor: '#65A30D18', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm }}>
                <Text style={{ fontSize: 18 }}>{DOMAIN_ICONS[item.domain] || '📚'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>{item.title || item.name}</Text>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }}>{DOMAIN_LABELS[item.domain] || item.domain} · {item.category}</Text>
              </View>
              <Text style={{ color: Colors.textSecondary, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
