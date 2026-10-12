import { useState } from 'react';
import { Download, LayoutGrid, History, Settings, Sun, Moon } from 'lucide-react';
import { HydraSuiteNav } from './HydraSuiteNav';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export function Header({
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenHistory,
  historyCount
}: HeaderProps) {
  const [suiteMenuOpen, setSuiteMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-black/5 dark:border-white/10 px-3 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between transition-colors">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-apple-subtle shrink-0">
          <Download className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0">
          <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] truncate">
            HydraDownloader
          </h1>
          <span className="hidden sm:inline-block text-[11px] font-mono font-medium px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[#86868b] shrink-0">
            v1.0
          </span>
        </div>
      </div>

      {/* Actions / Tools */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* History Button */}
        <button
          type="button"
          onClick={onOpenHistory}
          title="Historial de descargas"
          className="relative p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-all"
        >
          <History className="w-4 h-4 sm:w-5 sm:h-5" />
          {historyCount > 0 && (
            <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 min-w-[14px] sm:min-w-[16px] h-3.5 sm:h-4 text-[9px] sm:text-[10px] font-bold bg-blue-600 text-white rounded-full flex items-center justify-center px-1">
              {historyCount > 9 ? '9+' : historyCount}
            </span>
          )}
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Ajustes y Proxies"
          className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-all"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Theme Switcher */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-1.5 sm:p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-all"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Suite Nav Dropdown Trigger */}
        <div className="relative ml-0.5 sm:ml-1 pl-0.5 sm:pl-1 border-l border-black/5 dark:border-white/10">
          <button
            type="button"
            onClick={() => setSuiteMenuOpen(!suiteMenuOpen)}
            title="Apps de HydraApps"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#1d1d1f] dark:text-[#f5f5f7] text-xs font-medium transition-all"
          >
            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#86868b]" />
            <span className="hidden sm:inline">Suite</span>
          </button>
          <HydraSuiteNav isOpen={suiteMenuOpen} onClose={() => setSuiteMenuOpen(false)} />
        </div>
      </div>
    </header>
  );
}
