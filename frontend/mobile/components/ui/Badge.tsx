import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Colors, BorderRadius, FontSize } from '@/constants/theme';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md';
}

export function Badge({ label, color, bgColor, size = 'md' }: BadgeProps) {
  const fontSize = size === 'sm' ? FontSize.xs : FontSize.sm;
  const paddingH = size === 'sm' ? 6 : 8;
  const paddingV = size === 'sm' ? 2 : 3;

  const style: ViewStyle = {
    backgroundColor: bgColor || Colors.primaryLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: paddingH,
    paddingVertical: paddingV,
    alignSelf: 'flex-start',
  };

  return (
    <View style={style}>
      <Text style={{ color: color || Colors.primary, fontSize, fontWeight: '500' }}>
        {label}
      </Text>
    </View>
  );
}
