import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '🔍', title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 48 }}>
      <Text style={{ fontSize: 48, marginBottom: Spacing.base }}>{icon}</Text>
      <Text style={{ fontSize: FontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginBottom: Spacing.sm, textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          {description}
        </Text>
      )}
      {actionText && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            marginTop: Spacing.lg,
            backgroundColor: Colors.primary,
            borderRadius: 8,
            paddingHorizontal: 24,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: '#fff', fontSize: FontSize.base, fontWeight: '600' }}>
            {actionText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
