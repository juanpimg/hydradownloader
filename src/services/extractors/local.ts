import { MediaMetadata, MediaFormat, MediaType } from './types';
import { t } from '../i18n';

const LOCAL_MEDIA_EXTENSIONS =
  /\.(mp4|webm|mkv|mov|mp3|m4a|wav|aac|ogg|flac|opus|jpg|jpeg|png|webp|gif)(\?.*)?$/i;

function detectFormat(fileName: string): { format: MediaFormat; type: MediaType } {
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  const ext = (extMatch ? extMatch[1].toLowerCase() : 'mp4') as MediaFormat;
  const isAudio = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'opus'].includes(ext);
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  if (isAudio) return { format: ext, type: 'audio' };
  if (isImage) return { format: ext, type: 'image' };
  return { format: ext === 'webm' ? 'webm' : 'mp4', type: 'video' };
}

export function isLocalMediaFileName(name: string): boolean {
  return LOCAL_MEDIA_EXTENSIONS.test(name);
}

/**
 * Builds 100% local metadata from a device File.
 * No network: a blob: URL is generated and everything stays in the browser.
 */
export function createLocalFileMedia(file: File): MediaMetadata {
  const { format, type } = detectFormat(file.name);
  const objectUrl = URL.createObjectURL(file);

  return {
    id: `local-${Date.now()}`,
    originalUrl: `local:${file.name}`,
    platform: 'local',
    title: file.name,
    streams: [
      {
        id: `local-${Date.now()}`,
        label: t('lx_label', { f: format.toUpperCase(), mb: (file.size / 1024 / 1024).toFixed(1) }),
        quality: 'original',
        format,
        type,
        url: objectUrl,
        hasAudio: type !== 'image',
        fileSize: file.size
      }
    ],
    extractedVia: t('file_via')
  };
}
