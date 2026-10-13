import { useRef, useEffect } from 'react';
import { LayoutGrid, Film, Music, RefreshCw, Download, ExternalLink } from 'lucide-react';
import { t, type I18nKey } from '../services/i18n';

interface HydraSuiteNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const APPS: Array<{
  name: string;
  descKey: I18nKey;
  icon: any;
  port: number;
  url: string;
  color: string;
  active?: boolean;
}> = [
  {
    name: 'HydraCut Studio',
    descKey: 'nav_cut',
    icon: Film,
    port: 5173,
    url: 'https://hydracut.pages.dev/',
    color: 'from-amber-500 to-orange-500'
  },
  {
    name: 'Hydra Hub',
    descKey: 'nav_hub',
    icon: LayoutGrid,
    port: 5174,
    url: 'https://hydraapps.pages.dev/',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    name: 'HydraDAW',
    descKey: 'nav_daw',
    icon: Music,
    port: 5175,
    url: 'https://hydradaw.pages.dev/',
    color: 'from-purple-500 to-indigo-500'
  },
  {
    name: 'HydraConvert',
    descKey: 'nav_convert',
    icon: RefreshCw,
    port: 5176,
    url: 'https://hydraconverter.pages.dev/',
    color: 'from-emerald-500 to-teal-500'
  },
  {
    name: 'HydraDownloader',
    descKey: 'nav_downloader',
    icon: Download,
    port: 5177,
    url: 'https://hydradownloader.pages.dev/',
    active: true,
    color: 'from-blue-600 to-indigo-600'
  }
];

export function HydraSuiteNav({ isOpen, onClose }: HydraSuiteNavProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-12 w-80 glass-dropdown rounded-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="px-3 py-2 border-b border-black/5 dark:border-white/10 mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#86868b]">
          Suite HydraApps
        </span>
        <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium px-2 py-0.5 rounded-full">
          100% Client-Side
        </span>
      </div>

      <div className="space-y-1">
        {APPS.map((app) => {
          const Icon = app.icon;
          // In local dev, link to localhost:port; in production to pages.dev
          const href =
            typeof window !== 'undefined' && window.location.hostname === 'localhost'
              ? `http://localhost:${app.port}`
              : app.url;

          if (app.active) {
            return (
              <div
                key={app.name}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 cursor-default"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${app.color} flex items-center justify-center text-white shadow-sm`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{app.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.2 rounded">
                      {t('nav_current')}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70 truncate">{t(app.descKey)}</p>
                </div>
              </div>
            );
          }

          return (
            <a
              key={app.name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors group"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${app.color} flex items-center justify-center text-white shadow-sm opacity-90 group-hover:opacity-100 transition-opacity`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{app.name}</span>
                <p className="text-xs text-[#86868b] truncate">{t(app.descKey)}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#86868b] opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
