// Tab 搜索页直接跳转到 /search（全屏搜索体验）
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function SearchTab() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/search');
  }, []);
  return null;
}
