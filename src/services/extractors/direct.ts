import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';

const DIRECT_MEDIA_EXTENSIONS = /\.(mp4|webm|mkv|mov|mp3|m4a|wav|aac|ogg|flac|opus)(\?.*)?$/i;

export const directExtractor: Extractor = {
  name: 'Direct Media Link',

  canHandle(url: string): boolean {
    return DIRECT_MEDIA_EXTENSIONS.test(url);
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const filename = pathname.split('/').pop() || 'media';
      const cleanFilename = decodeURIComponent(filename.split('?')[0]);

      // Determine extension
      const extMatch = cleanFilename.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';

      const isAudio = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'opus'].includes(ext);

      let fileSize: number | undefined;

      // Try HEAD request to get content length
      try {
        const headRes = await fetch(url, { method: 'HEAD', signal });
        const len = headRes.headers.get('content-length');
        if (len) {
          fileSize = parseInt(len, 10);
        }
      } catch {
        // ignore HEAD failure
      }

      const streams: StreamOption[] = [
        {
          id: `direct-${Date.now()}`,
          label: `Archivo Directo (${ext.toUpperCase()})`,
          quality: 'original',
          format: isAudio ? (ext as any) : (ext === 'webm' ? 'webm' : 'mp4'),
          type: isAudio ? 'audio' : 'video',
          url,
          hasAudio: true,
          fileSize
        }
      ];

      const metadata: MediaMetadata = {
        id: `direct-${Date.now()}`,
        originalUrl: url,
        platform: 'direct',
        title: cleanFilename,
        streams,
        extractedVia: 'Direct Stream Inspector'
      };

      return { success: true, data: metadata };
    } catch (err: any) {
      return { success: false, error: `Error procesando enlace directo: ${err.message}` };
    }
  }
};
