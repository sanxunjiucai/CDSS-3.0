import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { Colors, BorderRadius, FontSize, Spacing } from '@/constants/theme';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  onPress?: () => void;  // 只读模式点击跳转搜索页
  placeholder?: string;
  autoFocus?: boolean;
  readonly?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onPress,
  placeholder = '搜索疾病、药品、检验、指南…',
  autoFocus = false,
  readonly = false,
}: SearchBarProps) {
  if (readonly && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Colors.card,
          borderRadius: BorderRadius.xl,
          paddingHorizontal: Spacing.base,
          paddingVertical: 12,
          shadowColor: '#1677FF',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <Text style={{ color: Colors.textSecondary, fontSize: FontSize.base, flex: 1 }}>
          {placeholder}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.base,
        paddingVertical: 4,
        shadowColor: '#1677FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        autoFocus={autoFocus}
        returnKeyType="search"
        style={{
          flex: 1,
          fontSize: FontSize.base,
          color: Colors.textPrimary,
          paddingVertical: 8,
        }}
      />
      {value && value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText?.('')} style={{ padding: 4 }}>
          <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
