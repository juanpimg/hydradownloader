import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';
import { cobaltExtractor } from './cobalt';

const DEFAULT_INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://invidious.nerdvpn.de',
  'https://invidious.tiekoetter.com',
  'https://inv.nadeko.net'
];

interface OEmbedData {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
}

/**
 * Fetch video metadata directly via oEmbed / noembed without backend
 */
async function fetchYouTubeOEmbed(url: string, signal?: AbortSignal): Promise<OEmbedData | null> {
  const endpoints = [
    `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          return data;
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}

/**
 * Query active Invidious instances to fetch video formats
 */
async function fetchInvidiousVideo(
  videoId: string,
  instances: string[],
  signal?: AbortSignal
): Promise<any | null> {
  for (const base of instances) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/videos/${videoId}`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data && data.title && (data.formatStreams?.length || data.adaptiveFormats?.length)) {
          return { data, instance: base };
        }
      }
    } catch {
      clearTimeout(timeout);
      // continue to next instance
    }
  }

  return null;
}

/**
 * Fetch dynamic healthy Invidious instances from public registry
 */
async function fetchHealthyInvidiousInstances(signal?: AbortSignal): Promise<string[]> {
  try {
    const res = await fetch('https://api.invidious.io/instances.json?sort_by=health', { signal });
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];

    const healthy: string[] = [];
    for (const item of list) {
      const info = item[1];
      if (info && info.type === 'https' && info.api === true && info.uri) {
        healthy.push(info.uri);
        if (healthy.length >= 6) break;
      }
    }
    return healthy;
  } catch {
    return [];
  }
}

export const youtubeExtractor: Extractor = {
  name: 'YouTube',

  canHandle(url: string): boolean {
    return /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i.test(url);
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (!match) {
      return { success: false, error: 'ID de vídeo de YouTube no válido.' };
    }

    const videoId = match[1];

    // Concurrently grab oEmbed metadata so we always have basic info (title, author, thumbnail)
    const oembedPromise = fetchYouTubeOEmbed(url, signal);

    // 1. Primary Strategy: Extract direct download streams via Cobalt
    let cobaltError: string | undefined;
    try {
      const cobaltRes = await cobaltExtractor.extract(url, signal);
      if (cobaltRes.success && cobaltRes.data && cobaltRes.data.streams.length > 0) {
        // Filter out any invalid URLs that point back to youtube web pages
        const validStreams = cobaltRes.data.streams.filter(
          (s) => !/(?:youtube\.com\/watch|youtu\.be\/)/i.test(s.url)
        );

        if (validStreams.length > 0) {
          const oembed = await oembedPromise;
          cobaltRes.data.platform = 'youtube';
          if (oembed?.title) cobaltRes.data.title = oembed.title;
          if (oembed?.author_name) cobaltRes.data.author = { name: oembed.author_name };
          cobaltRes.data.thumbnailUrl =
            oembed?.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          cobaltRes.data.streams = validStreams;
          cobaltRes.data.extractedVia = 'Cobalt Engine (Directo)';
          return cobaltRes;
        }
      } else if (!cobaltRes.success && cobaltRes.error) {
        cobaltError = cobaltRes.error;
      }
    } catch (e: any) {
      cobaltError = e?.message;
      console.warn('[HydraDownloader] Cobalt extraction failed, trying Invidious fallback...', e);
    }

    // 2. Secondary Strategy: Invidious Instances
    let invidiousResult = await fetchInvidiousVideo(videoId, DEFAULT_INVIDIOUS_INSTANCES, signal);

    if (!invidiousResult) {
      const dynamicInstances = await fetchHealthyInvidiousInstances(signal);
      if (dynamicInstances.length > 0) {
        invidiousResult = await fetchInvidiousVideo(videoId, dynamicInstances, signal);
      }
    }

    if (invidiousResult) {
      const { data, instance } = invidiousResult;
      const streams: StreamOption[] = [];

      // Progressive video streams (contains both video and audio)
      if (Array.isArray(data.formatStreams)) {
        data.formatStreams.forEach((s: any, idx: number) => {
          if (!s.url || /(?:youtube\.com\/watch|youtu\.be\/)/i.test(s.url)) return;
          if (s.size === '0' || s.size === 0 || s.clen === '0') return;
          const resLabel = s.resolution || s.quality || '360p';
          streams.push({
            id: `yt-prog-${idx}-${resLabel}`,
            label: `${resLabel} (${(s.container || 'MP4').toUpperCase()})`,
            quality: resLabel.replace(/p$/, ''),
            format: s.container === 'webm' ? 'webm' : 'mp4',
            type: 'video',
            url: s.url,
            hasAudio: true,
            fileSize: s.size ? parseInt(s.size, 10) : undefined
          });
        });
      }

      // Adaptive audio and video streams
      if (Array.isArray(data.adaptiveFormats)) {
        data.adaptiveFormats.forEach((s: any, idx: number) => {
          if (!s.url || /(?:youtube\.com\/watch|youtu\.be\/)/i.test(s.url)) return;
          if (s.size === '0' || s.size === 0 || s.clen === '0') return;
          const isAudio = s.type?.startsWith('audio') || s.container === 'm4a';
          const isVideo = s.type?.startsWith('video') || s.resolution;

          if (isAudio) {
            const format = s.container === 'm4a' ? 'm4a' : 'webm';
            const quality = s.audioQuality ? s.audioQuality.replace('AUDIO_QUALITY_', '') : 'HQ';
            streams.push({
              id: `yt-aud-${idx}-${format}`,
              label: `Audio (${quality} - ${format.toUpperCase()})`,
              quality: 'audio',
              format,
              type: 'audio',
              url: s.url,
              hasAudio: true,
              bitrate: s.bitrate ? parseInt(s.bitrate, 10) : undefined
            });
          } else if (isVideo && s.resolution) {
            const format = s.container === 'webm' ? 'webm' : 'mp4';
            streams.push({
              id: `yt-adapt-v-${idx}-${s.resolution}`,
              label: `${s.resolution} [Adaptive] (${format.toUpperCase()})`,
              quality: s.resolution.replace(/p$/, ''),
              format,
              type: 'video',
              url: s.url,
              hasAudio: false
            });
          }
        });
      }

      if (streams.length > 0) {
        const metadata: MediaMetadata = {
          id: videoId,
          originalUrl: url,
          platform: 'youtube',
          title: data.title,
          author: {
            name: data.author,
            avatarUrl: data.authorThumbnails?.[0]?.url
          },
          thumbnailUrl:
            data.videoThumbnails?.find((t: any) => t.quality === 'high' || t.quality === 'medium')?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          duration: data.lengthSeconds,
          streams,
          extractedVia: `Invidious API (${new URL(instance).hostname})`
        };

        return { success: true, data: metadata };
      }
    }

    return {
      success: false,
      error: cobaltError || 'No se pudo obtener el archivo de descarga para este vídeo de YouTube debido a restricciones de la plataforma o instancias no disponibles. Verifica la URL o intenta con otra instancia en Ajustes.'
    };
  }
};
