import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, KnowledgeTypeColors, KnowledgeTypeLabels, KnowledgeTypeIcons, FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface KnowledgeCardProps {
  id: number;
  type: string;
  title: string;
  subtitle?: string;
  tags?: string[];
  meta?: string;
}

export function KnowledgeCard({ id, type, title, subtitle, tags, meta }: KnowledgeCardProps) {
  const router = useRouter();
  const color = KnowledgeTypeColors[type] || Colors.primary;
  const icon = KnowledgeTypeIcons[type] || '📄';
  const label = KnowledgeTypeLabels[type] || type;

  const handlePress = () => {
    router.push(`/${type}/${id}` as any);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={{
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.base,
        marginBottom: Spacing.sm,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: color,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      {/* 左侧类型图标 */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: BorderRadius.md,
          backgroundColor: color + '18',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: Spacing.sm,
          flexShrink: 0,
        }}
      >
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>

      {/* 右侧内容 */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text
            style={{
              fontSize: FontSize.base,
              fontWeight: '600',
              color: Colors.textPrimary,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <View
            style={{
              backgroundColor: color + '18',
              borderRadius: BorderRadius.full,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: FontSize.xs, color, fontWeight: '500' }}>{label}</Text>
          </View>
        </View>

        {subtitle && (
          <Text
            style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}

        {tags && tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {tags.slice(0, 3).map((tag, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: Colors.bg,
                  borderRadius: BorderRadius.full,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {meta && (
          <Text style={{ fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 }}>
            {meta}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}
