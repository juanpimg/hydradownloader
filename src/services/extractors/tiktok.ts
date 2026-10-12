import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';
import { fetchWithCorsFallback } from './cors';

export const tiktokExtractor: Extractor = {
  name: 'TikTok',

  canHandle(url: string): boolean {
    return /(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i.test(url);
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    try {
      // Endpoint public de TikWM
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
      const res = await fetchWithCorsFallback(apiUrl, { signal, headers: { Accept: 'application/json' } });
      const json = await res.json();

      if (!json || json.code !== 0 || !json.data) {
        return { success: false, error: json?.msg || 'No se pudo extraer el vídeo de TikTok.' };
      }

      const data = json.data;
      const streams: StreamOption[] = [];

      // HD no watermark video
      if (data.hdplay) {
        streams.push({
          id: `tt-hd-${data.id}`,
          label: 'HD Sin Marca de Agua (MP4)',
          quality: '1080',
          format: 'mp4',
          type: 'video',
          url: data.hdplay.startsWith('http') ? data.hdplay : `https://www.tikwm.com${data.hdplay}`,
          hasAudio: true,
          fileSize: data.hd_size
        });
      }

      // Standard no watermark video
      if (data.play) {
        streams.push({
          id: `tt-sd-${data.id}`,
          label: 'Sin Marca de Agua (MP4)',
          quality: '720',
          format: 'mp4',
          type: 'video',
          url: data.play.startsWith('http') ? data.play : `https://www.tikwm.com${data.play}`,
          hasAudio: true,
          fileSize: data.size
        });
      }

      // Audio only / original sound
      if (data.music) {
        streams.push({
          id: `tt-audio-${data.id}`,
          label: `Audio Original (${data.music_info?.title || 'MP3'})`,
          quality: 'audio',
          format: 'mp3',
          type: 'audio',
          url: data.music.startsWith('http') ? data.music : `https://www.tikwm.com${data.music}`,
          hasAudio: true
        });
      }

      const metadata: MediaMetadata = {
        id: data.id || String(Date.now()),
        originalUrl: url,
        platform: 'tiktok',
        title: data.title ? (data.title.length > 90 ? data.title.slice(0, 87) + '...' : data.title) : `Vídeo de @${data.author?.unique_id || 'TikTok'}`,
        author: {
          name: data.author?.nickname,
          username: data.author?.unique_id,
          avatarUrl: data.author?.avatar
        },
        thumbnailUrl: data.cover || data.origin_cover,
        duration: data.duration,
        streams,
        extractedVia: 'TikWM Service'
      };

      return { success: true, data: metadata };
    } catch (err: any) {
      return { success: false, error: `Error extrayendo de TikTok: ${err.message || 'Error de red'}` };
    }
  }
};
