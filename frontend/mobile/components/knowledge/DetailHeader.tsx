import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useHistoryStore } from '@/stores/historyStore';
import { Colors, KnowledgeTypeColors, KnowledgeTypeIcons, KnowledgeTypeLabels, FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface DetailHeaderProps {
  id: number;
  type: string;
  title: string;
  subtitle?: string;
  tags?: string[];
  meta?: string;
}

export function DetailHeader({ id, type, title, subtitle, tags, meta }: DetailHeaderProps) {
  const router = useRouter();
  const { toggleFavorite, isFavorite } = useHistoryStore();
  const color = KnowledgeTypeColors[type] || Colors.primary;
  const icon = KnowledgeTypeIcons[type] || '📄';
  const label = KnowledgeTypeLabels[type] || type;
  const favorited = isFavorite(id, type);

  const handleFavorite = () => {
    toggleFavorite({ id, type, title, subtitle });
  };

  return (
    <View style={{ backgroundColor: color, padding: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.xl }}>
      {/* 返回 + 收藏 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.base }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: FontSize.base }}>‹ 返回</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFavorite}>
          <Text style={{ fontSize: 22 }}>{favorited ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      {/* 类型标签 */}
      <View style={{
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginBottom: Spacing.sm,
      }}>
        <Text style={{ color: '#fff', fontSize: FontSize.xs, fontWeight: '600' }}>
          {icon} {label}
        </Text>
      </View>

      {/* 标题 */}
      <Text style={{ color: '#fff', fontSize: FontSize.xxl, fontWeight: '700', marginBottom: 6 }}>
        {title}
      </Text>

      {subtitle && (
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: FontSize.sm, lineHeight: 20 }}>
          {subtitle}
        </Text>
      )}

      {tags && tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm }}>
          {tags.map((tag, i) => (
            <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: FontSize.xs }}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {meta && (
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: FontSize.xs, marginTop: 6 }}>{meta}</Text>
      )}
    </View>
  );
}
