import { PlatformType } from './extractors/types';
import { LocalePreference } from './i18n';

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
  locale: LocalePreference;
}

const HISTORY_KEY = 'hydra_downloader_history';
export const SETTINGS_KEY = 'hydra_downloader_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  preferredMode: 'video',
  defaultQuality: 'best',
  defaultAudioFormat: 'mp3',
  theme: 'system',
  locale: 'system'
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

let memorySettings: AppSettings = { ...DEFAULT_SETTINGS };

export function getSettings(): AppSettings {
  try {
    if (typeof localStorage === 'undefined') {
      return memorySettings;
    }
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return memorySettings;
    }
    const parsed = JSON.parse(raw);
    // Strip legacy remote-service keys (local-only mode)
    delete parsed.cobaltInstance;
    delete parsed.customCorsProxy;
    const result = { ...DEFAULT_SETTINGS, ...parsed };
    memorySettings = result;
    return result;
  } catch {
    return memorySettings;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    memorySettings = updated;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch {
    return memorySettings;
  }
}
