import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useHistoryStore } from '@/stores/historyStore';

export default function RootLayout() {
  const loadFromStorage = useHistoryStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1677FF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerBackTitle: '返回',
          contentStyle: { backgroundColor: '#F5F7FA' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="disease/[id]" options={{ title: '疾病详情' }} />
        <Stack.Screen name="drug/[id]" options={{ title: '药品详情' }} />
        <Stack.Screen name="exam/[id]" options={{ title: '检验详情' }} />
        <Stack.Screen name="guideline/[id]" options={{ title: '指南详情' }} />
        <Stack.Screen name="formula/[id]" options={{ title: '公式计算' }} />
        <Stack.Screen name="assessment/[id]" options={{ title: '量表评估' }} />
        <Stack.Screen name="search" options={{ title: '搜索', headerShown: false }} />
      </Stack>
    </>
  );
}
