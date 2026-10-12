import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';
import { fetchWithCorsFallback } from './cors';

export const twitterExtractor: Extractor = {
  name: 'Twitter / X',

  canHandle(url: string): boolean {
    return /(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/(\d+)/i.test(url);
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/(\d+)/i);
    if (!match) {
      return { success: false, error: 'URL de Twitter/X no válida.' };
    }

    const username = match[1];
    const statusId = match[2];

    try {
      // Primary: FxTwitter API
      const apiUrl = `https://api.fxtwitter.com/${username}/status/${statusId}`;
      const res = await fetchWithCorsFallback(apiUrl, { signal, headers: { Accept: 'application/json' } });
      const data = await res.json();

      if (!data || data.code !== 200 || !data.tweet) {
        return { success: false, error: data?.message || 'No se encontró el tweet o no contiene multimedia.' };
      }

      const tweet = data.tweet;
      const media = tweet.media;

      if (!media || (!media.videos?.length && !media.all?.some((m: any) => m.type === 'video' || m.type === 'gif'))) {
        return { success: false, error: 'Este tweet no contiene ningún vídeo ni archivo GIF descargable.' };
      }

      const videos = media.videos || media.all.filter((m: any) => m.type === 'video' || m.type === 'gif');
      const primaryVideo = videos[0];

      const streams: StreamOption[] = [];

      // Add high quality video stream
      if (primaryVideo.url) {
        streams.push({
          id: `tw-video-${statusId}`,
          label: primaryVideo.width && primaryVideo.height ? `${primaryVideo.height}p (MP4)` : 'Calidad Original (MP4)',
          quality: primaryVideo.height ? `${primaryVideo.height}` : 'original',
          format: 'mp4',
          type: 'video',
          url: primaryVideo.url,
          hasAudio: primaryVideo.type !== 'gif'
        });
      }

      // Add audio-only stream option if available
      if (primaryVideo.url && primaryVideo.type !== 'gif') {
        streams.push({
          id: `tw-audio-${statusId}`,
          label: 'Solo Audio (Extraído)',
          quality: 'audio',
          format: 'm4a',
          type: 'audio',
          url: primaryVideo.url,
          hasAudio: true
        });
      }

      const metadata: MediaMetadata = {
        id: statusId,
        originalUrl: url,
        platform: 'twitter',
        title: tweet.text ? (tweet.text.length > 90 ? tweet.text.slice(0, 87) + '...' : tweet.text) : `Tweet de @${tweet.author?.screen_name || username}`,
        author: {
          name: tweet.author?.name || username,
          username: tweet.author?.screen_name || username,
          avatarUrl: tweet.author?.avatar_url
        },
        thumbnailUrl: primaryVideo.thumbnail_url || tweet.author?.avatar_url,
        duration: primaryVideo.duration,
        streams,
        extractedVia: 'FxTwitter Open API'
      };

      return { success: true, data: metadata };
    } catch (err: any) {
      return { success: false, error: `Error extrayendo de Twitter/X: ${err.message || 'Error de red'}` };
    }
  }
};
