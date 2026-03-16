import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Colors, FontSize } from '@/constants/theme';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({ text, size = 'large', fullScreen = false }: LoadingSpinnerProps) {
  return (
    <View
      style={{
        flex: fullScreen ? 1 : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      <ActivityIndicator size={size} color={Colors.primary} />
      {text && (
        <Text style={{ marginTop: 12, color: Colors.textSecondary, fontSize: FontSize.sm }}>
          {text}
        </Text>
      )}
    </View>
  );
}
