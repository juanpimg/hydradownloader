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
export const SETTINGS_KEY = 'hydra_downloader_settings';

export const DEFAULT_SETTINGS: AppSettings = {
  preferredMode: 'video',
  defaultQuality: 'best',
  defaultAudioFormat: 'mp3',
  theme: 'system',
  cobaltInstance: 'https://rue-cobalt.xenon.zone',
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
    if (!raw) {
      // Migrate legacy keys if they exist
      const legacyCobalt = localStorage.getItem('hydra_cobalt_instance');
      const legacyCors = localStorage.getItem('hydra_cors_proxy');
      if (legacyCobalt || legacyCors) {
        const migrated: AppSettings = {
          ...DEFAULT_SETTINGS,
          ...(legacyCobalt && !legacyCobalt.includes('api.cobalt.tools') ? { cobaltInstance: legacyCobalt.trim().replace(/\/+$/, '') } : {}),
          ...(legacyCors ? { customCorsProxy: legacyCors.trim() } : {})
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    // Auto-migrate away from deprecated api.cobalt.tools
    if (!parsed.cobaltInstance || parsed.cobaltInstance.includes('api.cobalt.tools')) {
      parsed.cobaltInstance = DEFAULT_SETTINGS.cobaltInstance;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    // Keep legacy keys in sync for external or backward compatibility
    if (updated.cobaltInstance) {
      localStorage.setItem('hydra_cobalt_instance', updated.cobaltInstance);
    }
    if (typeof updated.customCorsProxy === 'string') {
      localStorage.setItem('hydra_cors_proxy', updated.customCorsProxy);
    }
    return updated;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
