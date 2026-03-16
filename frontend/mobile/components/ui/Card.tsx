import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
}

export function Card({ children, onPress, style, padding = Spacing.base }: CardProps) {
  const baseStyle: ViewStyle = {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding,
    shadowColor: '#1677FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={baseStyle}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={baseStyle}>{children}</View>;
}
