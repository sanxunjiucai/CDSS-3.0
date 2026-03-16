import React from 'react';
import { View, Text } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

interface InfoSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
}

export function InfoSection({ title, icon, children }: InfoSectionProps) {
  return (
    <View style={{ marginBottom: Spacing.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
        {icon && <Text style={{ fontSize: 16, marginRight: 6 }}>{icon}</Text>}
        <Text style={{ fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string | number | undefined | null;
  valueColor?: string;
}

export function InfoRow({ label, value, valueColor }: InfoRowProps) {
  if (!value && value !== 0) return null;
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, width: 90 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: FontSize.sm, color: valueColor || Colors.textPrimary }}>{String(value)}</Text>
    </View>
  );
}

export function TextBlock({ text }: { text: string }) {
  if (!text) return null;
  return (
    <View style={{ backgroundColor: Colors.bg, borderRadius: BorderRadius.md, padding: Spacing.sm + 4 }}>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textPrimary, lineHeight: 22 }}>{text}</Text>
    </View>
  );
}
