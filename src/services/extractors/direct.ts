import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';

const DIRECT_MEDIA_EXTENSIONS = /\.(mp4|webm|mkv|mov|mp3|m4a|wav|aac|ogg|flac|opus)(\?.*)?$/i;

export const directExtractor: Extractor = {
  name: 'Direct Media Link',

  canHandle(url: string): boolean {
    const trimmed = url.trim();
    if (trimmed.startsWith('blob:')) return true;
    return DIRECT_MEDIA_EXTENSIONS.test(trimmed);
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    try {
      const trimmed = url.trim();

      // blob: URLs (already-loaded local files): no network, instant metadata
      if (trimmed.startsWith('blob:')) {
        const streams: StreamOption[] = [
          {
            id: `direct-${Date.now()}`,
            label: 'Local File (BLOB)',
            quality: 'original',
            format: 'mp4',
            type: 'video',
            url: trimmed,
            hasAudio: true
          }
        ];
        const metadata: MediaMetadata = {
          id: `direct-${Date.now()}`,
          originalUrl: trimmed,
          platform: 'local',
          title: 'local-file',
          streams,
          extractedVia: 'Local File (no network)'
        };
        return { success: true, data: metadata };
      }

      const parsedUrl = new URL(trimmed);
      const pathname = parsedUrl.pathname;
      const filename = pathname.split('/').pop() || 'media';
      const cleanFilename = decodeURIComponent(filename.split('?')[0]);

      // Determine extension
      const extMatch = cleanFilename.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'mp4';

      const isAudio = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'opus'].includes(ext);

      let fileSize: number | undefined;

      // Plain HEAD to the file's origin server (no third-party APIs or proxies)
      try {
        const headRes = await fetch(trimmed, { method: 'HEAD', signal });
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
          label: `Direct File (${ext.toUpperCase()})`,
          quality: 'original',
          format: isAudio ? (ext as any) : (ext === 'webm' ? 'webm' : 'mp4'),
          type: isAudio ? 'audio' : 'video',
          url: trimmed,
          hasAudio: true,
          fileSize
        }
      ];

      const metadata: MediaMetadata = {
        id: `direct-${Date.now()}`,
        originalUrl: trimmed,
        platform: 'direct',
        title: cleanFilename,
        streams,
        extractedVia: 'Local Direct Link (no APIs)'
      };

      return { success: true, data: metadata };
    } catch (err: any) {
      return { success: false, error: `Error processing direct link: ${err.message}` };
    }
  }
};
