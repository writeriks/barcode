import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryFolder } from '../types/historyFolder';

const STORAGE_KEY = '@beep/history_folders';

export async function getFolders(): Promise<HistoryFolder[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryFolder[];
  } catch {
    return [];
  }
}

export async function createFolder(name: string): Promise<HistoryFolder> {
  const folder: HistoryFolder = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: Date.now(),
  };
  const existing = await getFolders();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, folder]));
  return folder;
}

export async function deleteFolder(id: string): Promise<void> {
  const existing = await getFolders();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((folder) => folder.id !== id)));
}
