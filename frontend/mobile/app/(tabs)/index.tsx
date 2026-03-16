import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/ui/SearchBar';
import { Card } from '@/components/ui/Card';
import { useHistoryStore } from '@/stores/historyStore';
import { getStats } from '@/api/knowledge';
import { Colors, KnowledgeTypeColors, KnowledgeTypeIcons, Spacing, FontSize, BorderRadius } from '@/constants/theme';

const CATEGORIES = [
  { key: 'disease', label: '疾病', route: '/disease' },
  { key: 'drug', label: '药品', route: '/drug' },
  { key: 'exam', label: '检验', route: '/exam' },
  { key: 'guideline', label: '指南', route: '/guideline' },
  { key: 'formula', label: '公式', route: '/(tabs)/tools' },
  { key: 'assessment', label: '量表', route: '/(tabs)/tools' },
  { key: 'sanji', label: '三基', route: '/sanji' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了，医生';
  if (h < 9) return '早上好，医生';
  if (h < 12) return '上午好，医生';
  if (h < 14) return '中午好，医生';
  if (h < 18) return '下午好，医生';
  return '晚上好，医生';
}

export default function HomePage() {
  const router = useRouter();
  const history = useHistoryStore((s) => s.history);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const data = await getStats() as any;
      setStats(data?.data || data);
    } catch (_) {}
  };

  useEffect(() => { loadStats(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const recentHistory = history.slice(0, 5);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }} edges={['top']}>
      {/* 蓝色渐变头部区域 */}
      <View style={{ backgroundColor: Colors.primary, paddingHorizontal: Spacing.base, paddingBottom: Spacing.lg }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, marginBottom: 4 }}>
          {getGreeting()}
        </Text>
        <Text style={{ color: '#fff', fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.base }}>
          临床知识助手
        </Text>
        {/* 搜索框 */}
        <SearchBar
          readonly
          onPress={() => router.push('/search')}
        />
        {/* 知识库统计 */}
        {stats && (
          <View style={{ flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm }}>
            {[
              { label: '疾病', count: stats.diseases || stats.disease_count },
              { label: '药品', count: stats.drugs || stats.drug_count },
              { label: '指南', count: stats.guidelines || stats.guideline_count },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '700' }}>{s.count?.toLocaleString() || '—'}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs }}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 知识库分类宫格 */}
        <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm }}>
          知识库
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {CATEGORIES.map((cat) => {
            const color = KnowledgeTypeColors[cat.key] || Colors.primary;
            const icon = KnowledgeTypeIcons[cat.key] || '📄';
            return (
              <TouchableOpacity
                key={cat.key}
                activeOpacity={0.7}
                onPress={() => router.push(cat.route as any)}
                style={{
                  width: '22%',
                  aspectRatio: 1,
                  backgroundColor: Colors.card,
                  borderRadius: BorderRadius.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 18 }}>{icon}</Text>
                </View>
                <Text style={{ fontSize: FontSize.xs, fontWeight: '600', color: Colors.textPrimary }}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 最近浏览 */}
        {recentHistory.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary }}>
                最近浏览
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                <Text style={{ fontSize: FontSize.sm, color: Colors.primary }}>查看全部</Text>
              </TouchableOpacity>
            </View>
            {recentHistory.map((item) => {
              const color = KnowledgeTypeColors[item.type] || Colors.primary;
              const icon = KnowledgeTypeIcons[item.type] || '📄';
              const timeStr = formatRelativeTime(item.visitedAt);
              return (
                <TouchableOpacity
                  key={`${item.type}-${item.id}`}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/${item.type}/${item.id}` as any)}
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: BorderRadius.lg,
                    padding: Spacing.sm + 4,
                    marginBottom: Spacing.sm,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm }}>
                    <Text style={{ fontSize: 18 }}>{icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>{item.title}</Text>
                    {item.subtitle && (
                      <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }} numberOfLines={1}>{item.subtitle}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }}>{timeStr}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* 快捷工具入口 */}
        <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: recentHistory.length > 0 ? Spacing.md : 0 }}>
          快捷工具
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/tools')}
            style={{ flex: 1, backgroundColor: '#7C3AED18', borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 28, marginBottom: 4 }}>🧮</Text>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: '#7C3AED' }}>公式计算</Text>
            <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }}>88 个公式</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/tools')}
            style={{ flex: 1, backgroundColor: '#DB277718', borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 28, marginBottom: 4 }}>📊</Text>
            <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: '#DB2777' }}>量表评估</Text>
            <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }}>22 个量表</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
