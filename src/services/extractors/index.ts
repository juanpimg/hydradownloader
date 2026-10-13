import { Extractor, ExtractionResult, PlatformType } from './types';
import { directExtractor } from './direct';
import { t } from '../i18n';

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
    return { success: false, error: t('ex_badurl') };
  }

  const matchedExtractor = extractors.find((ext) => ext.canHandle(trimmed));
  if (!matchedExtractor) {
    return {
      success: false,
      error:
        t('ex_localonly')
    };
  }

  try {
    return await matchedExtractor.extract(trimmed, signal);
  } catch (err: any) {
    return {
      success: false,
      error: `${t('ex_unexpected')}${err.message || t('ex_unknown')}`
    };
  }
}
