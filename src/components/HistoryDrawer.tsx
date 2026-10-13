import { HistoryItem } from '../services/storage';
import { triggerBrowserSave, sanitizeFilename } from '../services/downloadManager';
import { X, History, Download, Trash2, ExternalLink, Film, Music } from 'lucide-react';
import { t } from '../services/i18n';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onRedownload?: (item: HistoryItem) => void;
}

function timeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return t('time_now');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('time_min', { n: diffMin });
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return t('time_hour', { n: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t('time_day', { n: diffDays });
}

export function HistoryDrawer({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onClearAll,
  onRedownload
}: HistoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full glass-dropdown p-6 flex flex-col shadow-apple-elevated border-l border-black/10 dark:border-white/10 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {t('hist_title')}
              </h3>
              <p className="text-xs text-[#86868b]">{t('hist_sub', { n: items.length })}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#86868b]">
              <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-3">
                <History className="w-7 h-7 stroke-[1.5] opacity-50" />
              </div>
              <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">
                {t('hist_empty_t')}
              </p>
              <p className="text-xs max-w-xs">
                {t('hist_empty_d')}
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 transition-all"
              >
                {/* Media Icon or Thumbnail */}
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-black/10"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    {item.format === 'mp3' || item.format === 'm4a' ? (
                      <Music className="w-5 h-5" />
                    ) : (
                      <Film className="w-5 h-5" />
                    )}
                  </div>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#86868b]">
                    <span className="uppercase font-mono font-medium bg-black/5 dark:bg-white/10 px-1.5 py-0.2 rounded text-[10px]">
                      {item.format}
                    </span>
                    <span>{timeAgo(item.timestamp)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => {
                      if (onRedownload) {
                        onRedownload(item);
                      } else {
                        triggerBrowserSave(item.streamUrl, sanitizeFilename(item.title, item.format));
                      }
                    }}
                    title={t('hist_redownload')}
                    className="p-1.5 rounded-full hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <a
                    href={item.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('hist_open')}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    title={t('hist_remove')}
                    className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('hist_clear')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] hover:bg-black/10 dark:hover:bg-white/15 transition-all"
            >
              {t('hist_close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
