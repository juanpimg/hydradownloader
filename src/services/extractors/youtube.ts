import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';
import { fetchWithCorsFallback } from './cors';
import { cobaltExtractor } from './cobalt';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.garudalinux.org'
];

export const youtubeExtractor: Extractor = {
  name: 'YouTube',

  canHandle(url: string): boolean {
    return /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i.test(url);
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (!match) {
      return { success: false, error: 'ID de vídeo de YouTube no válido.' };
    }

    const videoId = match[1];

    // Try Piped instances first for progressive streams & rich metadata
    for (const piped of PIPED_INSTANCES) {
      try {
        const apiUrl = `${piped}/streams/${videoId}`;
        const res = await fetchWithCorsFallback(apiUrl, { signal, headers: { Accept: 'application/json' } });
        const data = await res.json();

        if (data && data.title && (data.videoStreams?.length || data.audioStreams?.length)) {
          const streams: StreamOption[] = [];

          // Separate into progressive video streams (with audio included)
          const progressiveStreams = (data.videoStreams || []).filter((s: any) => !s.videoOnly && s.url);
          const videoOnlyStreams = (data.videoStreams || []).filter((s: any) => s.videoOnly && s.url);

          const availableVideoStreams = progressiveStreams.length > 0 ? progressiveStreams : videoOnlyStreams;

          availableVideoStreams.forEach((s: any, idx: number) => {
            const qualityLabel = s.quality || `${s.height || '720'}p`;
            streams.push({
              id: `yt-v-${idx}-${s.quality}`,
              label: `${qualityLabel} (${s.format || 'MP4'})${s.videoOnly ? ' [Solo vídeo]' : ''}`,
              quality: qualityLabel,
              format: s.format === 'WEBM' ? 'webm' : 'mp4',
              type: 'video',
              url: s.url,
              hasAudio: !s.videoOnly,
              fileSize: s.contentLength
            });
          });

          // Audio streams
          (data.audioStreams || []).forEach((s: any, idx: number) => {
            streams.push({
              id: `yt-a-${idx}`,
              label: `Audio (${s.quality || 'HQ'} - ${s.format || 'M4A'})`,
              quality: 'audio',
              format: s.format === 'OPUS' ? 'webm' : 'm4a',
              type: 'audio',
              url: s.url,
              hasAudio: true,
              fileSize: s.contentLength,
              bitrate: s.bitrate
            });
          });

          const metadata: MediaMetadata = {
            id: videoId,
            originalUrl: url,
            platform: 'youtube',
            title: data.title,
            author: {
              name: data.uploader,
              avatarUrl: data.uploaderAvatar
            },
            thumbnailUrl: data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: data.duration,
            streams,
            extractedVia: `Piped API (${new URL(piped).hostname})`
          };

          return { success: true, data: metadata };
        }
      } catch {
        // Continue to next Piped instance or fallback
      }
    }

    // Fallback: Cobalt extractor
    const cobaltRes = await cobaltExtractor.extract(url, signal);
    if (cobaltRes.success && cobaltRes.data) {
      cobaltRes.data.platform = 'youtube';
      cobaltRes.data.thumbnailUrl = cobaltRes.data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      return cobaltRes;
    }

    return {
      success: false,
      error: 'No se pudo extraer el vídeo de YouTube a través de Piped ni Cobalt. Revisa si el vídeo tiene restricciones o copyright.'
    };
  }
};
