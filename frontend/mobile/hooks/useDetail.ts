import { useState, useEffect } from 'react';
import { useHistoryStore } from '@/stores/historyStore';

interface UseDetailOptions {
  fetchFn: (id: number) => Promise<any>;
  type: string;
  titleKey?: string;
  subtitleKey?: string;
}

export function useDetail(id: number, options: UseDetailOptions) {
  const { fetchFn, type, titleKey = 'name', subtitleKey = 'description' } = options;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addHistory = useHistoryStore((s) => s.addHistory);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn(id) as any;
      const item = res?.data || res;
      setData(item);
      // 记录到浏览历史
      addHistory({
        id,
        type,
        title: item[titleKey] || item.name || item.title || '未知',
        subtitle: item[subtitleKey] || item.description || item.generic_name,
      });
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  return { data, loading, error, reload: load };
}
