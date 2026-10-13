import { Extractor, ExtractionResult, PlatformType } from './types';
import { twitterExtractor } from './twitter';
import { tiktokExtractor } from './tiktok';
import { redditExtractor } from './reddit';
import { youtubeExtractor } from './youtube';
import { directExtractor } from './direct';
import { cobaltExtractor } from './cobalt';

export * from './types';
export * from './cors';
export * from './cobalt';

const extractors: Extractor[] = [
  directExtractor,
  twitterExtractor,
  tiktokExtractor,
  redditExtractor,
  youtubeExtractor,
  cobaltExtractor // Always last as fallback
];

export function detectPlatform(url: string): PlatformType {
  const clean = url.trim().toLowerCase();
  if (!clean) return 'unknown';

  if (/(?:twitter\.com|x\.com)/.test(clean)) return 'twitter';
  if (/(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/.test(clean)) return 'tiktok';
  if (/(?:reddit\.com|redd\.it|v\.redd\.it)/.test(clean)) return 'reddit';
  if (/(?:youtube\.com|youtu\.be)/.test(clean)) return 'youtube';
  if (/(?:instagram\.com)/.test(clean)) return 'instagram';
  if (/(?:vimeo\.com)/.test(clean)) return 'vimeo';
  if (/\.(mp4|webm|mkv|mov|mp3|m4a|wav|aac|ogg|flac|opus)(\?.*)?$/i.test(clean)) return 'direct';

  return 'cobalt';
}

export async function extractMedia(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { success: false, error: 'Por favor, introduce una URL válida.' };
  }

  // Find the most appropriate extractor
  const matchedExtractor = extractors.find((ext) => ext.canHandle(trimmed));
  if (!matchedExtractor) {
    return { success: false, error: 'No se encontró ningún extractor para esta URL.' };
  }

  // Execute extraction
  try {
    const result = await matchedExtractor.extract(trimmed, signal);
    if (result.success) {
      return result;
    }

    // If a specific extractor failed and wasn't cobalt or youtube (which already uses cobalt as primary), try cobalt as universal fallback
    if (matchedExtractor !== cobaltExtractor && matchedExtractor !== youtubeExtractor) {
      console.warn(`[HydraDownloader] Extractor ${matchedExtractor.name} falló, intentando Cobalt fallback...`);
      const fallbackResult = await cobaltExtractor.extract(trimmed, signal);
      if (fallbackResult.success) {
        return fallbackResult;
      }
    }

    return result;
  } catch (err: any) {
    return {
      success: false,
      error: `Error inesperado durante la extracción: ${err.message || 'Error desconocido'}`
    };
  }
}
