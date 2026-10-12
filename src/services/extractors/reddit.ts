import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';
import { fetchWithCorsFallback } from './cors';

export const redditExtractor: Extractor = {
  name: 'Reddit',

  canHandle(url: string): boolean {
    return /(?:reddit\.com\/r\/|redd\.it\/|v\.redd\.it\/)/i.test(url);
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    try {
      // Normalize Reddit URL to .json endpoint
      let cleanUrl = url.split('?')[0].replace(/\/$/, '');
      if (!cleanUrl.endsWith('.json')) {
        cleanUrl += '.json';
      }

      const res = await fetchWithCorsFallback(cleanUrl, {
        signal,
        headers: { Accept: 'application/json' }
      });
      const data = await res.json();

      const post = data?.[0]?.data?.children?.[0]?.data;
      if (!post) {
        return { success: false, error: 'No se encontró la publicación de Reddit.' };
      }

      const media =
        post.secure_media?.reddit_video ||
        post.media?.reddit_video ||
        post.crosspost_parent_list?.[0]?.secure_media?.reddit_video ||
        post.preview?.reddit_video_preview;

      if (!media && !post.url?.match(/\.(mp4|webm|gif)$/i)) {
        return { success: false, error: 'Esta publicación de Reddit no contiene ningún vídeo nativo.' };
      }

      const streams: StreamOption[] = [];

      if (media?.fallback_url) {
        // Fallback progressive MP4 stream
        const fallbackUrl = media.fallback_url.split('?')[0];
        const height = media.height || 720;

        streams.push({
          id: `rd-video-${post.id}`,
          label: `${height}p (MP4 Stream)`,
          quality: `${height}`,
          format: 'mp4',
          type: 'video',
          url: fallbackUrl,
          hasAudio: true
        });

        // Add direct audio option if DASH audio exists
        const audioUrl = fallbackUrl.replace(/DASH_[0-9]+\.mp4/i, 'DASH_AUDIO_128.mp4');
        streams.push({
          id: `rd-audio-${post.id}`,
          label: 'Audio de Reddit (M4A)',
          quality: 'audio',
          format: 'm4a',
          type: 'audio',
          url: audioUrl,
          hasAudio: true
        });
      } else if (post.url?.match(/\.(mp4|webm|gif)$/i)) {
        streams.push({
          id: `rd-direct-${post.id}`,
          label: 'Vídeo Directo (MP4)',
          quality: 'original',
          format: 'mp4',
          type: 'video',
          url: post.url,
          hasAudio: true
        });
      }

      if (streams.length === 0) {
        return { success: false, error: 'No se encontraron pistas de vídeo descargables en este post de Reddit.' };
      }

      const metadata: MediaMetadata = {
        id: post.id,
        originalUrl: url,
        platform: 'reddit',
        title: post.title ? (post.title.length > 90 ? post.title.slice(0, 87) + '...' : post.title) : 'Publicación de Reddit',
        author: {
          name: post.author ? `u/${post.author}` : undefined,
          username: post.subreddit ? `r/${post.subreddit}` : undefined
        },
        thumbnailUrl: post.thumbnail?.startsWith('http') ? post.thumbnail : undefined,
        duration: media?.duration,
        streams,
        extractedVia: 'Reddit JSON API'
      };

      return { success: true, data: metadata };
    } catch (err: any) {
      return { success: false, error: `Error extrayendo de Reddit: ${err.message || 'Error de red'}` };
    }
  }
};
