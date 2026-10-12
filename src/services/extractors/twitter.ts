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

      // Check for available video variants or multiple qualities
      if (primaryVideo.variants && Array.isArray(primaryVideo.variants) && primaryVideo.variants.length > 0) {
        const validVariants = primaryVideo.variants
          .filter((v: any) => v.url && typeof v.url === 'string')
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

        validVariants.forEach((v: any, idx: number) => {
          const isAudioOnly = v.content_type?.startsWith('audio/') || /\.(m4a|mp3|aac|ogg)(\?|$)/i.test(v.url);
          const heightMatch = v.url.match(/\/(\d+)x(\d+)\//);
          const resLabel = heightMatch ? `${heightMatch[2]}p` : (v.bitrate ? `${Math.round(v.bitrate / 1000)}kbps` : `Opción ${idx + 1}`);

          streams.push({
            id: `tw-${isAudioOnly ? 'audio' : 'video'}-${statusId}-${idx}`,
            label: isAudioOnly ? `Audio (${resLabel})` : `${resLabel} (MP4)`,
            quality: resLabel,
            format: isAudioOnly ? 'm4a' : 'mp4',
            type: isAudioOnly ? 'audio' : 'video',
            url: v.url,
            hasAudio: primaryVideo.type !== 'gif'
          });
        });
      }

      // If no variants extracted yet, use primaryVideo.url as video
      if (streams.length === 0 && primaryVideo.url) {
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
