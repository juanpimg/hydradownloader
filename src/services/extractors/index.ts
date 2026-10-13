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
    return { success: false, error: 'Please enter a valid URL.' };
  }

  const matchedExtractor = extractors.find((ext) => ext.canHandle(trimmed));
  if (!matchedExtractor) {
    return {
      success: false,
      error:
        'Local-only mode: paste a direct link to a file (.mp4, .webm, .mp3, .m4a, .wav, etc.) or load a file from your device. No external APIs, no proxies, no servers.'
    };
  }

  try {
    return await matchedExtractor.extract(trimmed, signal);
  } catch (err: any) {
    return {
      success: false,
      error: `Unexpected extraction error: ${err.message || 'Unknown error'}`
    };
  }
}
