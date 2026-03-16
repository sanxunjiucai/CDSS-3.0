import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/ui/SearchBar';
import { KnowledgeCard } from '@/components/knowledge/KnowledgeCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { search } from '@/api/knowledge';
import { Colors, FontSize, Spacing, BorderRadius } from '@/constants/theme';

const TYPE_FILTERS = [
  { key: '', label: '全部' },
  { key: 'disease', label: '疾病' },
  { key: 'drug', label: '药品' },
  { key: 'exam', label: '检验' },
  { key: 'guideline', label: '指南' },
  { key: 'formula', label: '公式' },
  { key: 'assessment', label: '量表' },
];

const HOT_SEARCHES = ['高血压', '糖尿病', '心肌梗死', '肺炎', '阿司匹林', 'CURB-65', 'BMI'];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await search(q, type || undefined) as any;
      const items = res?.data?.items || res?.items || [];
      setResults(items);
    } catch (_) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = () => doSearch(query, activeType);

  const handleTypeChange = (type: string) => {
    setActiveType(type);
    if (searched && query.trim()) doSearch(query, type);
  };

  const handleHotSearch = (word: string) => {
    setQuery(word);
    doSearch(word, activeType);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }} edges={['top']}>
      {/* 搜索头部 */}
      <View style={{ backgroundColor: Colors.primary, padding: Spacing.base, paddingTop: Spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              onSubmit={handleSubmit}
              autoFocus
            />
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: FontSize.base }}>取消</Text>
          </TouchableOpacity>
        </View>

        {/* 类型筛选 Tab */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: Spacing.sm }}
          contentContainerStyle={{ gap: Spacing.xs }}
        >
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => handleTypeChange(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: BorderRadius.full,
                backgroundColor: activeType === f.key ? '#fff' : 'rgba(255,255,255,0.2)',
              }}
            >
              <Text
                style={{
                  fontSize: FontSize.sm,
                  fontWeight: '600',
                  color: activeType === f.key ? Colors.primary : 'rgba(255,255,255,0.9)',
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 结果区 */}
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        {!searched ? (
          // 热门搜索提示
          <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
            <Text style={{ fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm }}>
              热门搜索
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {HOT_SEARCHES.map((word) => (
                <TouchableOpacity
                  key={word}
                  onPress={() => handleHotSearch(word)}
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: BorderRadius.full,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                >
                  <Text style={{ fontSize: FontSize.sm, color: Colors.textPrimary }}>{word}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        ) : loading ? (
          <LoadingSpinner text="搜索中…" fullScreen />
        ) : results.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="未找到相关结果"
            description={`没有找到与"${query}"相关的内容，试试其他关键词`}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, i) => `${item.type || ''}-${item.id || i}`}
            contentContainerStyle={{ padding: Spacing.base }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <KnowledgeCard
                id={item.id}
                type={item.type || item._type}
                title={item.name || item.title || item.generic_name}
                subtitle={item.description || item.summary || item.indication}
                tags={item.tags || item.disease_tags || (item.department ? [item.department] : undefined)}
                meta={item.icd_code || item.atc_code}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
