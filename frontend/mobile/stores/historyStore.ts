import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryItem {
  id: number;
  type: string;
  title: string;
  subtitle?: string;
  visitedAt: string;
}

interface HistoryStore {
  history: HistoryItem[];
  favorites: HistoryItem[];
  addHistory: (item: Omit<HistoryItem, 'visitedAt'>) => void;
  toggleFavorite: (item: Omit<HistoryItem, 'visitedAt'>) => void;
  isFavorite: (id: number, type: string) => boolean;
  clearHistory: () => void;
  loadFromStorage: () => Promise<void>;
}

const HISTORY_KEY = 'cdss_history';
const FAVORITES_KEY = 'cdss_favorites';

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  favorites: [],

  addHistory: async (item) => {
    const newItem: HistoryItem = { ...item, visitedAt: new Date().toISOString() };
    const current = get().history.filter(
      (h) => !(h.id === item.id && h.type === item.type)
    );
    const updated = [newItem, ...current].slice(0, 50); // 最多50条
    set({ history: updated });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  },

  toggleFavorite: async (item) => {
    const favorites = get().favorites;
    const exists = favorites.find((f) => f.id === item.id && f.type === item.type);
    let updated: HistoryItem[];
    if (exists) {
      updated = favorites.filter((f) => !(f.id === item.id && f.type === item.type));
    } else {
      updated = [{ ...item, visitedAt: new Date().toISOString() }, ...favorites];
    }
    set({ favorites: updated });
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  },

  isFavorite: (id, type) => {
    return get().favorites.some((f) => f.id === id && f.type === type);
  },

  clearHistory: async () => {
    set({ history: [] });
    await AsyncStorage.removeItem(HISTORY_KEY);
  },

  loadFromStorage: async () => {
    const [historyRaw, favoritesRaw] = await Promise.all([
      AsyncStorage.getItem(HISTORY_KEY),
      AsyncStorage.getItem(FAVORITES_KEY),
    ]);
    set({
      history: historyRaw ? JSON.parse(historyRaw) : [],
      favorites: favoritesRaw ? JSON.parse(favoritesRaw) : [],
    });
  },
}));
