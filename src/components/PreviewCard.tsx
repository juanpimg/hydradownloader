import { useState, useId } from 'react';
import { MediaMetadata, StreamOption } from '../services/extractors/types';
import { Download, Film, Music, Copy, Check, Clock, User } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';
import { formatBytes } from '../services/downloadManager';

interface PreviewCardProps {
  media: MediaMetadata;
  preferredMode: 'video' | 'audio';
  onDownload: (stream: StreamOption) => void;
  isDownloading: boolean;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function PreviewCard({ media, preferredMode, onDownload, isDownloading }: PreviewCardProps) {
  const qualitySelectId = useId();
  const [mode, setMode] = useState<'video' | 'audio'>(preferredMode);
  const [copied, setCopied] = useState(false);

  // Filter streams by current mode
  const videoStreams = media.streams.filter((s) => s.type === 'video');
  const audioStreams = media.streams.filter((s) => s.type === 'audio');

  const availableStreams = mode === 'video'
    ? (videoStreams.length > 0 ? videoStreams : media.streams)
    : (audioStreams.length > 0 ? audioStreams : media.streams);

  const [selectedStreamId, setSelectedStreamId] = useState<string>(
    availableStreams[0]?.id || media.streams[0]?.id || ''
  );

  const activeStream =
    availableStreams.find((s) => s.id === selectedStreamId) ||
    availableStreams[0] ||
    media.streams[0];

  const handleCopyLink = async () => {
    if (!activeStream?.url) return;
    try {
      await navigator.clipboard.writeText(activeStream.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel rounded-3xl p-5 sm:p-6 shadow-apple-elevated border border-black/5 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Media Thumbnail */}
        {media.thumbnailUrl ? (
          <div className="relative w-full sm:w-48 aspect-video sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 flex-shrink-0 shadow-apple-subtle">
            <img
              src={media.thumbnailUrl}
              alt={media.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If thumbnail fails to load due to hotlink protection, hide image
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {media.duration && (
              <span className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/75 backdrop-blur-md text-white text-[11px] font-mono font-medium px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3 opacity-70" />
                {formatDuration(media.duration)}
              </span>
            )}
          </div>
        ) : (
          <div className="w-full sm:w-48 aspect-video sm:aspect-[4/3] rounded-2xl bg-black/5 dark:bg-white/5 flex-shrink-0 flex items-center justify-center text-[#86868b]">
            {mode === 'video' ? <Film className="w-10 h-10 stroke-[1.5]" /> : <Music className="w-10 h-10 stroke-[1.5]" />}
          </div>
        )}

        {/* Media Details */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            {/* Header info / Extracted via */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-medium tracking-wide uppercase text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full truncate">
                {media.extractedVia}
              </span>
              {media.author?.name && (
                <span className="flex items-center gap-1 text-xs text-[#86868b] truncate">
                  <User className="w-3 h-3" />
                  {media.author.name}
                </span>
              )}
            </div>

            {/* Media Title */}
            <h2 className="text-base sm:text-lg font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] leading-snug line-clamp-2 mb-3">
              {media.title}
            </h2>

            {/* Segmented Mode Selector (Video / Audio) */}
            {videoStreams.length > 0 && audioStreams.length > 0 && (
              <div className="mb-4">
                <SegmentedControl
                  value={mode}
                  onChange={(newMode) => {
                    setMode(newMode);
                    const targetList = newMode === 'video' ? videoStreams : audioStreams;
                    if (targetList[0]) setSelectedStreamId(targetList[0].id);
                  }}
                  options={[
                    { value: 'video', label: 'Vídeo', icon: <Film className="w-3.5 h-3.5" /> },
                    { value: 'audio', label: 'Solo Audio', icon: <Music className="w-3.5 h-3.5" /> }
                  ]}
                />
              </div>
            )}
          </div>

          {/* Quality Picker & Download Actions */}
          <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/10">
            {availableStreams.length > 1 && (
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={qualitySelectId} className="text-xs font-medium text-[#86868b]">
                  Calidad / Formato:
                </label>
                <select
                  id={qualitySelectId}
                  value={activeStream?.id}
                  onChange={(e) => setSelectedStreamId(e.target.value)}
                  className="text-xs font-medium bg-black/5 dark:bg-white/10 text-[#1d1d1f] dark:text-[#f5f5f7] px-3 py-1.5 rounded-xl border border-black/5 dark:border-white/10 outline-none cursor-pointer"
                >
                  {availableStreams.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-[#1c1c1e] text-[#1d1d1f] dark:text-[#f5f5f7]">
                      {s.label} {s.fileSize ? `(${formatBytes(s.fileSize)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => activeStream && onDownload(activeStream)}
                disabled={isDownloading || !activeStream}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-apple-subtle transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {mode === 'audio' ? 'Descargar Audio' : 'Descargar Vídeo'}
                </span>
                {activeStream?.format && (
                  <span className="text-[11px] opacity-80 uppercase font-mono">
                    ({activeStream.format})
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                title="Copiar enlace directo"
                className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
