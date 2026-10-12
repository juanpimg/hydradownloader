export type PlatformType =
  | 'twitter'
  | 'tiktok'
  | 'reddit'
  | 'youtube'
  | 'instagram'
  | 'vimeo'
  | 'direct'
  | 'cobalt'
  | 'unknown';

export type MediaType = 'video' | 'audio' | 'image';

export interface StreamOption {
  id: string;
  label: string; // e.g. "1080p (FHD)", "720p (HD)", "Audio (MP3)"
  quality?: string; // "1080", "720", "audio", etc.
  format: 'mp4' | 'webm' | 'mp3' | 'm4a' | 'wav' | 'unknown';
  type: MediaType;
  url: string;
  hasAudio?: boolean;
  fileSize?: number; // bytes if known
  bitrate?: number;
}

export interface MediaMetadata {
  id: string;
  originalUrl: string;
  platform: PlatformType;
  title: string;
  author?: {
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
  thumbnailUrl?: string;
  duration?: number; // seconds
  streams: StreamOption[];
  extractedVia: string; // e.g. "FxTwitter API", "TikWM", "Cobalt Fallback"
}

export interface ExtractionResult {
  success: boolean;
  data?: MediaMetadata;
  error?: string;
}

export interface Extractor {
  name: string;
  canHandle: (url: string) => boolean;
  extract: (url: string, signal?: AbortSignal) => Promise<ExtractionResult>;
}
