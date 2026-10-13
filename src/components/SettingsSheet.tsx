import { useState, useId } from 'react';
import { AppSettings, saveSettings } from '../services/storage';
import { X, Sliders, Trash2, HardDrive } from 'lucide-react';
import { t, SUPPORTED_LOCALES, LOCALE_NATIVE_NAMES } from '../services/i18n';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (newSettings: AppSettings) => void;
  onClearHistory: () => void;
}

export function SettingsSheet({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
  onClearHistory
}: SettingsSheetProps) {
  const preferredModeId = useId();
  const defaultQualityId = useId();
  const defaultAudioFormatId = useId();
  const languageId = useId();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    saveSettings({ [key]: value });
    onSettingsChange(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-dropdown rounded-3xl p-6 shadow-apple-elevated border border-black/10 dark:border-white/15 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {t('set_title')}
              </h3>
              <p className="text-xs text-[#86868b]">{t('set_sub')}</p>
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

        <div className="space-y-6">
          {/* General Preferences */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
              <span>{t('set_general')}</span>
            </h4>

            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3.5 space-y-3 border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between">
                <label htmlFor={languageId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {t('set_language')}
                </label>
                <select
                  id={languageId}
                  value={localSettings.locale}
                  onChange={(e) => handleChange('locale', e.target.value)}
                  className="text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  <option value="system">{t('set_lang_system')}</option>
                  {SUPPORTED_LOCALES.map((loc) => (
                    <option key={loc} value={loc}>
                      {LOCALE_NATIVE_NAMES[loc]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor={preferredModeId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {t('set_mode')}
                </label>
                <select
                  id={preferredModeId}
                  value={localSettings.preferredMode}
                  onChange={(e) => handleChange('preferredMode', e.target.value)}
                  className="text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  <option value="video">{t('mode_video')}</option>
                  <option value="audio">{t('mode_audio')}</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor={defaultQualityId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {t('set_quality')}
                </label>
                <select
                  id={defaultQualityId}
                  value={localSettings.defaultQuality}
                  onChange={(e) => handleChange('defaultQuality', e.target.value)}
                  className="text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  <option value="best">{t('set_quality_best')}</option>
                  <option value="1080">1080p FHD</option>
                  <option value="720">720p HD</option>
                  <option value="480">480p SD</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor={defaultAudioFormatId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {t('set_format')}
                </label>
                <select
                  id={defaultAudioFormatId}
                  value={localSettings.defaultAudioFormat}
                  onChange={(e) => handleChange('defaultAudioFormat', e.target.value)}
                  className="text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  <option value="mp3">MP3 (Universal)</option>
                  <option value="m4a">M4A (Apple AAC)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Local-only notice */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-start gap-2.5">
            <HardDrive className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              <p className="font-semibold">{t('set_local_t')}</p>
              <p className="mt-0.5 opacity-90">
                {t('set_local_d')}
              </p>
            </div>
          </div>

          {/* Clear Data */}
          <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm(t('set_confirm'))) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('set_clear')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-apple-subtle transition-all"
            >
              {t('set_done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
