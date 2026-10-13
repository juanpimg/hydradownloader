import { MediaMetadata, MediaFormat, MediaType } from './types';

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
 * Crea metadatos 100% locales a partir de un File del dispositivo.
 * No hay red: se genera un blob: URL y todo queda en el navegador.
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
        label: `Archivo Local (${format.toUpperCase()} — ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
        quality: 'original',
        format,
        type,
        url: objectUrl,
        hasAudio: type !== 'image',
        fileSize: file.size
      }
    ],
    extractedVia: 'Archivo Local (sin red)'
  };
}
