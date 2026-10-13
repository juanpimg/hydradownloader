export type PlatformType = 'direct' | 'local' | 'unknown';

export type MediaType = 'video' | 'audio' | 'image';

export type MediaFormat =
  | 'mp4'
  | 'webm'
  | 'mkv'
  | 'mov'
  | 'mp3'
  | 'm4a'
  | 'wav'
  | 'ogg'
  | 'flac'
  | 'aac'
  | 'opus'
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'webp'
  | 'gif'
  | 'unknown';

export interface StreamOption {
  id: string;
  label: string; // e.g. "1080p (FHD)", "720p (HD)", "Audio (MP3)"
  quality?: string; // "1080", "720", "audio", etc.
  format: MediaFormat;
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
  extractedVia: string; // e.g. "Enlace Directo Local", "Archivo Local"
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
