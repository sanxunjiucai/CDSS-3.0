import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.lg,
        padding: Spacing.base,
        marginBottom: Spacing.sm,
      }}
    >
      <View style={{ height: 16, backgroundColor: Colors.border, borderRadius: 4, width: '60%', marginBottom: 8 }} />
      <View style={{ height: 12, backgroundColor: Colors.border, borderRadius: 4, width: '90%', marginBottom: 6 }} />
      <View style={{ height: 12, backgroundColor: Colors.border, borderRadius: 4, width: '75%' }} />
    </Animated.View>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
