import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useHistoryStore } from '@/stores/historyStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors, KnowledgeTypeColors, KnowledgeTypeIcons, FontSize, Spacing, BorderRadius } from '@/constants/theme';

type ProfileTab = 'history' | 'favorites';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<ProfileTab>('history');
  const { history, favorites, clearHistory } = useHistoryStore();

  const data = activeTab === 'history' ? history : favorites;
  const empty = activeTab === 'history'
    ? { icon: '📖', title: '暂无浏览记录', desc: '查看疾病、药品等知识后会自动记录' }
    : { icon: '❤️', title: '暂无收藏', desc: '在详情页点击收藏图标添加' };

  const handleClearHistory = () => {
    Alert.alert('清空记录', '确定清空所有浏览记录？', [
      { text: '取消', style: 'cancel' },
      { text: '清空', style: 'destructive', onPress: clearHistory },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} showsVerticalScrollIndicator={false}>
      {/* 用户头部 */}
      <View style={{ backgroundColor: Colors.primary, padding: Spacing.xl, paddingTop: Spacing.lg, alignItems: 'center' }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: 28 }}>👨‍⚕️</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: FontSize.lg, fontWeight: '700' }}>临床医生</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: FontSize.sm, marginTop: 2 }}>CDSS 临床助手</Text>
      </View>

      {/* 统计卡片 */}
      <View style={{ flexDirection: 'row', margin: Spacing.base, gap: Spacing.sm }}>
        <View style={{ flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center' }}>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: Colors.primary }}>{history.length}</Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary }}>浏览记录</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.base, alignItems: 'center' }}>
          <Text style={{ fontSize: FontSize.xl, fontWeight: '700', color: '#DB2777' }}>{favorites.length}</Text>
          <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary }}>我的收藏</Text>
        </View>
      </View>

      {/* 历史/收藏 Tab */}
      <View style={{ backgroundColor: Colors.card, marginHorizontal: Spacing.base, borderRadius: BorderRadius.lg, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          {(['history', 'favorites'] as ProfileTab[]).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === 'history' ? '最近浏览' : '我的收藏';
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: Spacing.sm + 2,
                  alignItems: 'center',
                  borderBottomWidth: 2,
                  borderBottomColor: isActive ? Colors.primary : 'transparent',
                }}
              >
                <Text style={{ fontSize: FontSize.base, fontWeight: isActive ? '700' : '500', color: isActive ? Colors.primary : Colors.textSecondary }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {data.length === 0 ? (
          <EmptyState icon={empty.icon} title={empty.title} description={empty.desc} />
        ) : (
          data.map((item) => {
            const color = KnowledgeTypeColors[item.type] || Colors.primary;
            const icon = KnowledgeTypeIcons[item.type] || '📄';
            return (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                activeOpacity={0.7}
                onPress={() => router.push(`/${item.type}/${item.id}` as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: Spacing.base,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.border,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm }}>
                  <Text style={{ fontSize: 18 }}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary }} numberOfLines={1}>{item.title}</Text>
                  {item.subtitle && <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }} numberOfLines={1}>{item.subtitle}</Text>}
                </View>
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }}>›</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 操作选项 */}
      <View style={{ margin: Spacing.base, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, overflow: 'hidden' }}>
        {activeTab === 'history' && (
          <TouchableOpacity
            onPress={handleClearHistory}
            style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border }}
          >
            <Text style={{ fontSize: 18, marginRight: Spacing.sm }}>🗑️</Text>
            <Text style={{ flex: 1, fontSize: FontSize.base, color: Colors.danger }}>清空浏览记录</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.base }}
          onPress={() => Alert.alert('关于 CDSS 临床助手', 'CDSS 3.0 临床辅助决策系统\n版本：v1.0.0')}
        >
          <Text style={{ fontSize: 18, marginRight: Spacing.sm }}>ℹ️</Text>
          <Text style={{ flex: 1, fontSize: FontSize.base, color: Colors.textPrimary }}>关于</Text>
          <Text style={{ color: Colors.textSecondary }}>v1.0.0</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
