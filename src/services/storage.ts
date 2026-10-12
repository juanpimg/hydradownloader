import { PlatformType } from './extractors/types';

export interface HistoryItem {
  id: string;
  title: string;
  platform: PlatformType;
  format: string;
  quality?: string;
  originalUrl: string;
  streamUrl: string;
  thumbnailUrl?: string;
  timestamp: number;
}

export interface AppSettings {
  preferredMode: 'video' | 'audio';
  defaultQuality: string;
  defaultAudioFormat: 'mp3' | 'm4a';
  theme: 'system' | 'dark' | 'light';
  cobaltInstance: string;
  customCorsProxy: string;
}

const HISTORY_KEY = 'hydra_downloader_history';
const SETTINGS_KEY = 'hydra_downloader_settings';

const DEFAULT_SETTINGS: AppSettings = {
  preferredMode: 'video',
  defaultQuality: 'best',
  defaultAudioFormat: 'mp3',
  theme: 'system',
  cobaltInstance: 'https://api.cobalt.tools',
  customCorsProxy: ''
};

export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
  try {
    const history = getHistory();
    const newItem: HistoryItem = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };
    // Keep last 50 entries
    const updated = [newItem, ...history.filter((h) => h.originalUrl !== item.originalUrl || h.format !== item.format)].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function removeFromHistory(id: string): void {
  try {
    const history = getHistory();
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // ignore
  }
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
