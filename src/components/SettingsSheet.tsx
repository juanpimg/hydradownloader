import { useState, useId } from 'react';
import { AppSettings, saveSettings } from '../services/storage';
import { DEFAULT_CORS_PROXIES } from '../services/extractors/cors';
import { DEFAULT_COBALT_INSTANCES } from '../services/extractors/cobalt';
import { X, Server, Shield, Sliders, Trash2 } from 'lucide-react';

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
  const corsProxySelectId = useId();
  const customCorsInputId = useId();
  const cobaltInstanceSelectId = useId();
  const customCobaltInputId = useId();
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    saveSettings({ [key]: value });
    onSettingsChange(updated);
  };

  const handleTestCobalt = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const endpoint = localSettings.cobaltInstance.endsWith('/')
        ? localSettings.cobaltInstance
        : `${localSettings.cobaltInstance}/`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://youtu.be/dQw4w9WgXcQ' })
      });
      if (res.ok) {
        setTestResult('Conexión exitosa');
      } else {
        setTestResult(`Error HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestResult(`Fallo: ${err.message || 'Error de red'}`);
    } finally {
      setIsTesting(false);
    }
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
                Ajustes de HydraDownloader
              </h3>
              <p className="text-xs text-[#86868b]">Configuración client-side y proxies</p>
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
              <span>Preferencias Generales</span>
            </h4>

            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3.5 space-y-3 border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-between">
                <label htmlFor={preferredModeId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Modo por defecto:
                </label>
                <select
                  id={preferredModeId}
                  value={localSettings.preferredMode}
                  onChange={(e) => handleChange('preferredMode', e.target.value)}
                  className="text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  <option value="video">Vídeo</option>
                  <option value="audio">Solo Audio</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor={defaultQualityId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Calidad de vídeo:
                </label>
                <select
                  id={defaultQualityId}
                  value={localSettings.defaultQuality}
                  onChange={(e) => handleChange('defaultQuality', e.target.value)}
                  className="text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  <option value="best">Máxima Calidad (1080p / 4K)</option>
                  <option value="1080">1080p FHD</option>
                  <option value="720">720p HD</option>
                  <option value="480">480p SD</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor={defaultAudioFormatId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                  Formato de audio:
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

          {/* CORS Proxy settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>CORS Proxies (Extracción en Navegador)</span>
            </h4>

            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3.5 space-y-3 border border-black/5 dark:border-white/5">
              <div className="space-y-1.5">
                <label htmlFor={corsProxySelectId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] block">
                  Proxy CORS predeterminado:
                </label>
                <select
                  id={corsProxySelectId}
                  value={localSettings.customCorsProxy ? 'custom' : 'codetabs'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      handleChange('customCorsProxy', '');
                    }
                  }}
                  className="w-full text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  {DEFAULT_CORS_PROXIES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="custom">Personalizado (URL propia)</option>
                </select>
              </div>

              {localSettings.customCorsProxy !== '' && (
                <div className="space-y-1">
                  <label htmlFor={customCorsInputId} className="text-[11px] text-[#86868b] block">URL del Proxy personalizado:</label>
                  <input
                    id={customCorsInputId}
                    type="text"
                    value={localSettings.customCorsProxy}
                    onChange={(e) => handleChange('customCorsProxy', e.target.value)}
                    placeholder="https://mi-cors-proxy.com/?url={url}"
                    className="w-full text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cobalt Fallback Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868b] flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              <span>Instancia de Cobalt (Fallback)</span>
            </h4>

            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-3.5 space-y-3 border border-black/5 dark:border-white/5">
              <div className="space-y-1.5">
                <label htmlFor={cobaltInstanceSelectId} className="text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] block">
                  Servidor Cobalt:
                </label>
                <select
                  id={cobaltInstanceSelectId}
                  value={localSettings.cobaltInstance}
                  onChange={(e) => handleChange('cobaltInstance', e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                >
                  {DEFAULT_COBALT_INSTANCES.map((inst) => (
                    <option key={inst} value={inst}>
                      {inst}
                    </option>
                  ))}
                  {!DEFAULT_COBALT_INSTANCES.includes(localSettings.cobaltInstance) && (
                    <option value={localSettings.cobaltInstance}>
                      Personalizada ({localSettings.cobaltInstance})
                    </option>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor={customCobaltInputId} className="text-[11px] text-[#86868b] block">URL de instancia personalizada:</label>
                <div className="flex gap-2">
                  <input
                    id={customCobaltInputId}
                    type="url"
                    value={localSettings.cobaltInstance}
                    onChange={(e) => handleChange('cobaltInstance', e.target.value)}
                    placeholder="https://mi-cobalt.dominio.com"
                    className="flex-1 text-xs bg-white dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleTestCobalt}
                    disabled={isTesting}
                    className="px-3 py-2 text-xs font-medium rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-[#f5f5f7] transition-all disabled:opacity-50"
                  >
                    {isTesting ? 'Probando...' : 'Probar'}
                  </button>
                </div>
                {testResult && (
                  <p className={`text-[11px] font-medium pt-1 ${testResult.includes('exitosa') ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {testResult}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Clear Data */}
          <div className="pt-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Deseas vaciar todo el historial de descargas?')) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Vaciar Historial Local</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-apple-subtle transition-all"
            >
              Listo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
