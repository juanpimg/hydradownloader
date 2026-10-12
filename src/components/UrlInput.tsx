import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Clipboard, X, ArrowRight, Loader2, Link2, Youtube, Twitter, Disc, FileVideo } from 'lucide-react';
import { detectPlatform, PlatformType } from '../services/extractors';

interface UrlInputProps {
  url: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onClear: () => void;
}

export function UrlInput({ url, onChange, onSubmit, isLoading, onClear }: UrlInputProps) {
  const [platform, setPlatform] = useState<PlatformType>('unknown');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPlatform(detectPlatform(url));
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onChange(text.trim());
        inputRef.current?.focus();
      }
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && !isLoading) {
      onSubmit();
    }
  };

  const getPlatformBadge = () => {
    switch (platform) {
      case 'youtube':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
            <Youtube className="w-3 h-3" /> YouTube
          </span>
        );
      case 'twitter':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-sky-500 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
            <Twitter className="w-3 h-3" /> Twitter / X
          </span>
        );
      case 'tiktok':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-pink-600 dark:text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">
            <Disc className="w-3 h-3" /> TikTok
          </span>
        );
      case 'reddit':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">
            <Link2 className="w-3 h-3" /> Reddit
          </span>
        );
      case 'direct':
        return (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <FileVideo className="w-3 h-3" /> Direct Link
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative flex items-center glass-panel rounded-full shadow-apple-elevated p-1.5 sm:p-2 border border-black/10 dark:border-white/15 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all duration-200">
        {/* Link / Platform Icon */}
        <div className="pl-3 pr-2 flex items-center text-[#86868b]">
          {getPlatformBadge() || <Link2 className="w-5 h-5 opacity-60" />}
        </div>

        {/* Input Text Field */}
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pega el enlace de YouTube, TikTok, Twitter/X, Reddit..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm sm:text-base text-[#1d1d1f] dark:text-[#f5f5f7] placeholder-[#86868b]/70 outline-none px-2 min-w-0"
        />

        {/* Actions inside input */}
        <div className="flex items-center gap-1 pr-1">
          {url ? (
            <button
              type="button"
              onClick={onClear}
              title="Borrar texto"
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#86868b] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePaste}
              title="Pegar del portapapeles"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-all"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pegar</span>
            </button>
          )}

          {/* Submit / Extract Button */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!url.trim() || isLoading}
            className={`flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 ${
              url.trim() && !isLoading
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-apple-glow cursor-pointer scale-100 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-black/5 dark:bg-white/5 text-[#86868b]/50 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Extrayendo...</span>
              </>
            ) : (
              <>
                <span>Descargar</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
