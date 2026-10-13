import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { PreviewCard } from './components/PreviewCard';
import { DownloadProgress } from './components/DownloadProgress';
import { SettingsSheet } from './components/SettingsSheet';
import { HistoryDrawer } from './components/HistoryDrawer';
import { extractMedia, createLocalFileMedia, MediaMetadata, StreamOption } from './services/extractors';
import { downloadStream, DownloadProgressState } from './services/downloadManager';
import {
  getSettings,
  getHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  AppSettings,
  HistoryItem
} from './services/storage';
import { AlertCircle, Download, ShieldCheck, Zap, Sparkles, FileVideo, HardDrive, Music, FlaskConical } from 'lucide-react';

export function App() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings & Theme
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // History
  const [history, setHistory] = useState<HistoryItem[]>(getHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Download Progress State
  const [progressState, setProgressState] = useState<DownloadProgressState>({
    isDownloading: false,
    progress: 0,
    bytesReceived: 0,
    totalBytes: 0,
    speed: ''
  });

  // Sync theme with system or preference
  useEffect(() => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setTheme(isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleExtract = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setDownloadNotice(null);
    setMedia(null);

    try {
      const result = await extractMedia(url.trim());
      if (result.success && result.data) {
        setMedia(result.data);
      } else {
        setError(result.error || 'No se pudo extraer el contenido de este enlace.');
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado al conectar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocalFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setDownloadNotice(null);
    try {
      const localMedia = createLocalFileMedia(file);
      setMedia(localMedia);
      setUrl('');
    } catch (err: any) {
      setError(err.message || 'No se pudo cargar el archivo local.');
    }
  };

  const handleDownload = async (stream: StreamOption) => {
    if (!media) return;
    setError(null);
    setDownloadNotice(null);

    try {
      await downloadStream(stream, media.title, (state) => {
        setProgressState(state);
      });

      // Add to history
      addToHistory({
        title: media.title,
        platform: media.platform,
        format: stream.format,
        quality: stream.quality,
        originalUrl: media.originalUrl,
        streamUrl: stream.url,
        thumbnailUrl: media.thumbnailUrl
      });
      setHistory(getHistory());
    } catch (err: any) {
      if (err?.isBrowserSaveInitiated) {
        addToHistory({
          title: media.title,
          platform: media.platform,
          format: stream.format,
          quality: stream.quality,
          originalUrl: media.originalUrl,
          streamUrl: stream.url,
          thumbnailUrl: media.thumbnailUrl
        });
        setHistory(getHistory());
        setDownloadNotice('Descarga iniciada directamente en tu navegador.');
        return;
      }
      setError(`Error durante la descarga: ${err.message}`);
    }
  };

  const handleRedownload = async (item: HistoryItem) => {
    setHistoryOpen(false);
    setError(null);
    setDownloadNotice(null);
    const isAudio = item.format === 'mp3' || item.format === 'm4a' || item.format === 'wav' || item.format === 'ogg';
    const streamOption: StreamOption = {
      id: item.id,
      label: item.title,
      quality: item.quality,
      format: (item.format as any) || 'mp4',
      type: isAudio ? 'audio' : 'video',
      url: item.streamUrl
    };
    try {
      await downloadStream(streamOption, item.title, (state) => {
        setProgressState(state);
      });
    } catch (err: any) {
      if (err?.isBrowserSaveInitiated) {
        setDownloadNotice('Descarga iniciada directamente en tu navegador.');
        return;
      }
      setError(`Error al descargar desde el historial: ${err.message}. Es posible que el enlace temporal haya caducado.`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors selection:bg-blue-500/20 overflow-x-hidden">
      {/* Translucent Apple Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20 max-w-5xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center space-y-4 mb-8 sm:mb-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Local • Sin APIs • Sin Servidores</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] leading-tight">
            Descarga vídeo y audio <br className="hidden sm:inline" />
            al instante.
          </h2>

          <p className="text-sm sm:text-base text-[#86868b] max-w-lg mx-auto">
            Pega un enlace directo a un archivo o carga un archivo de tu dispositivo. Todo se procesa en tu navegador, sin llamadas externas.
          </p>

          {/* Supported platform chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-[#86868b]">
            <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
              <FileVideo className="w-3.5 h-3.5 text-emerald-500" /> Enlaces directos
            </span>
            <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Archivos locales
            </span>
            <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
              <FileVideo className="w-3.5 h-3.5 text-violet-500" /> MP4 / WebM
            </span>
            <span className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-full">
              <Music className="w-3.5 h-3.5 text-amber-500" /> MP3 / M4A / WAV
            </span>
          </div>
        </div>

        {/* Cobalt-style Center Search Bar */}
        <UrlInput
          url={url}
          onChange={setUrl}
          onSubmit={handleExtract}
          isLoading={isLoading}
          onClear={() => {
            setUrl('');
            setMedia(null);
            setError(null);
            setDownloadNotice(null);
          }}
        />

        {/* Local file picker */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-[#86868b]">o</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-[#f5f5f7] transition-all"
          >
            <HardDrive className="w-3.5 h-3.5" />
            Cargar archivo local
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => handleLocalFile(e.target.files?.[0])}
          />
        </div>

        {/* Open research challenge: help wanted */}
        <div className="w-full max-w-2xl mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs sm:text-sm flex items-start gap-3">
          <FlaskConical className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Aún no soportamos YouTube ni otras plataformas — necesitamos tu ayuda</p>
            <p className="mt-0.5 opacity-90">
              El navegador bloquea la lectura de esos vídeos y seguimos buscando una forma 100% local de resolverlo.
            </p>
            <a
              href="https://github.com/juanpimg/hydradownloader/blob/main/docs/LOCAL-ONLY-RESEARCH.md"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-block font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Ver la investigación y cómo ayudar
            </a>
          </div>
        </div>

        {/* Fallback Notice Pill */}
        {downloadNotice && (
          <div className="w-full max-w-2xl mt-5 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in zoom-in-95">
            <Download className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Descarga alternativa iniciada</p>
              <p className="mt-0.5 opacity-90">{downloadNotice}</p>
            </div>
          </div>
        )}

        {/* Error Alert Pill */}
        {error && (
          <div className="w-full max-w-2xl mt-5 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in zoom-in-95">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Aviso</p>
              <p className="mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* Download Progress Bar */}
        {progressState.isDownloading && (
          <div className="w-full mt-6">
            <DownloadProgress state={progressState} />
          </div>
        )}

        {/* Extracted Media Preview Card */}
        {media && (
          <div className="w-full mt-6">
            <PreviewCard
              media={media}
              preferredMode={settings.preferredMode}
              onDownload={handleDownload}
              isDownloading={progressState.isDownloading}
            />
          </div>
        )}

        {/* Value Prop Highlights (Apple 3-column cards) */}
        {!media && !progressState.isDownloading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/10 text-center sm:text-left space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto sm:mx-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Privacidad Total</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Cero llamadas a APIs externas. Sin proxies, sin instancias, sin rastreo. Solo tu navegador.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/10 text-center sm:text-left space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto sm:mx-0">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Alta Velocidad</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Descarga directa con reanudación por rangos y guardado local inmediato.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-black/5 dark:border-white/10 text-center sm:text-left space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto sm:mx-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">Suite HydraApps</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Edita tus descargas en HydraCut o pásalas a HydraConvert con un solo clic.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-black/5 dark:border-white/10 py-6 px-4 text-center text-xs text-[#86868b]">
        <div className="flex items-center justify-center gap-4 mb-2">
          <a
            href="https://hydraapps.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors"
          >
            Hydra Hub
          </a>
          <span>•</span>
          <a
            href="https://hydracut.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors"
          >
            HydraCut
          </a>
          <span>•</span>
          <a
            href="https://hydraconverter.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors"
          >
            HydraConvert
          </a>
        </div>
        <p>
          HydraDownloader — Parte de la suite multimedia <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">HydraApps</span>. 100% local, inspirado en Apple HIG.
        </p>
      </footer>

      {/* Modals & Drawers */}
      <SettingsSheet
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
        onClearHistory={() => {
          clearHistory();
          setHistory([]);
        }}
      />

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={history}
        onRemoveItem={(id) => {
          removeFromHistory(id);
          setHistory(getHistory());
        }}
        onClearAll={() => {
          clearHistory();
          setHistory([]);
        }}
        onRedownload={handleRedownload}
      />
    </div>
  );
}
export default App;
