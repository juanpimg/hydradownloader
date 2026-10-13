import { Extractor, ExtractionResult, PlatformType } from './types';
import { directExtractor } from './direct';

export * from './types';
export * from './local';

const extractors: Extractor[] = [directExtractor];

export function detectPlatform(url: string): PlatformType {
  const clean = url.trim().toLowerCase();
  if (!clean) return 'unknown';

  if (clean.startsWith('blob:') || clean.startsWith('local:')) return 'local';

  if (/\.(mp4|webm|mkv|mov|mp3|m4a|wav|aac|ogg|flac|opus)(\?.*)?$/i.test(clean)) return 'direct';

  return 'unknown';
}

export async function extractMedia(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { success: false, error: 'Por favor, introduce una URL válida.' };
  }

  const matchedExtractor = extractors.find((ext) => ext.canHandle(trimmed));
  if (!matchedExtractor) {
    return {
      success: false,
      error:
        'Modo solo-local: pega un enlace directo a un archivo (.mp4, .webm, .mp3, .m4a, .wav, etc.) o carga un archivo desde tu dispositivo. Sin APIs externas, sin proxies, sin servidores.'
    };
  }

  try {
    return await matchedExtractor.extract(trimmed, signal);
  } catch (err: any) {
    return {
      success: false,
      error: `Error inesperado durante la extracción: ${err.message || 'Error desconocido'}`
    };
  }
}
