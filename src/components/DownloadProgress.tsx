import { DownloadProgressState, formatBytes } from '../services/downloadManager';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { t } from '../services/i18n';

interface DownloadProgressProps {
  state: DownloadProgressState;
  onCancel?: () => void;
}

export function DownloadProgress({ state, onCancel }: DownloadProgressProps) {
  const isFinished = !state.isDownloading && state.progress === 100;
  const isError = Boolean(state.error);

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel rounded-2xl p-4 sm:p-5 shadow-apple-subtle border border-black/5 dark:border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {isFinished ? (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          )}
          <span className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            {isFinished
              ? t('prog_done')
              : isError
              ? t('prog_error')
              : t('prog_busy')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#86868b] font-mono">
          <span>{state.speed}</span>
          {onCancel && state.isDownloading && (
            <button
              type="button"
              onClick={onCancel}
              title={t('prog_cancel')}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="w-full h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            isFinished ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-blue-600'
          }`}
          style={{ width: `${Math.max(2, state.progress)}%` }}
        />
      </div>

      {/* Progress Stats */}
      <div className="flex items-center justify-between mt-2 text-xs text-[#86868b]">
        <span>
          {formatBytes(state.bytesReceived)}
          {state.totalBytes > 0 && ` / ${formatBytes(state.totalBytes)}`}
        </span>
        <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
          {state.progress}%
        </span>
      </div>
    </div>
  );
}
