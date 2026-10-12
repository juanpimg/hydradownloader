import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPlatform, extractMedia } from './index';
import { twitterExtractor } from './twitter';
import { tiktokExtractor } from './tiktok';
import { redditExtractor } from './reddit';
import { youtubeExtractor } from './youtube';
import { directExtractor } from './direct';
import { wrapWithProxy } from './cors';
import { sanitizeFilename, formatBytes } from '../downloadManager';

describe('Platform Detector', () => {
  it('detects YouTube URLs correctly', () => {
    expect(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
    expect(detectPlatform('https://youtube.com/shorts/3l8v_k-X4g4')).toBe('youtube');
    expect(detectPlatform('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('detects Twitter/X URLs correctly', () => {
    expect(detectPlatform('https://twitter.com/user/status/1234567890')).toBe('twitter');
    expect(detectPlatform('https://x.com/user/status/1234567890')).toBe('twitter');
  });

  it('detects TikTok URLs correctly', () => {
    expect(detectPlatform('https://www.tiktok.com/@user/video/7123456789012345678')).toBe('tiktok');
    expect(detectPlatform('https://vm.tiktok.com/ZM8ABCDEF/')).toBe('tiktok');
  });

  it('detects Reddit URLs correctly', () => {
    expect(detectPlatform('https://www.reddit.com/r/videos/comments/abc123/cool_video/')).toBe('reddit');
    expect(detectPlatform('https://redd.it/abc123')).toBe('reddit');
  });

  it('detects direct media files correctly', () => {
    expect(detectPlatform('https://example.com/video.mp4')).toBe('direct');
    expect(detectPlatform('https://example.com/audio.mp3?token=123')).toBe('direct');
  });

  it('falls back to cobalt for other URLs', () => {
    expect(detectPlatform('https://vimeo.com/123456')).toBe('vimeo');
    expect(detectPlatform('https://unknown-service.com/media')).toBe('cobalt');
  });
});

describe('Extractor Handler Matching', () => {
  it('twitterExtractor handles twitter and x.com URLs', () => {
    expect(twitterExtractor.canHandle('https://x.com/elonmusk/status/123456')).toBe(true);
    expect(twitterExtractor.canHandle('https://twitter.com/nasa/status/987654')).toBe(true);
    expect(twitterExtractor.canHandle('https://youtube.com')).toBe(false);
  });

  it('tiktokExtractor handles standard and short links', () => {
    expect(tiktokExtractor.canHandle('https://www.tiktok.com/@test/video/123')).toBe(true);
    expect(tiktokExtractor.canHandle('https://vm.tiktok.com/ZM1234/')).toBe(true);
    expect(tiktokExtractor.canHandle('https://reddit.com')).toBe(false);
  });

  it('redditExtractor handles reddit links', () => {
    expect(redditExtractor.canHandle('https://www.reddit.com/r/funny/comments/123/test/')).toBe(true);
    expect(redditExtractor.canHandle('https://redd.it/123')).toBe(true);
    expect(redditExtractor.canHandle('https://twitter.com')).toBe(false);
  });

  it('youtubeExtractor handles youtube watch and short urls', () => {
    expect(youtubeExtractor.canHandle('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(youtubeExtractor.canHandle('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(youtubeExtractor.canHandle('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    expect(youtubeExtractor.canHandle('https://youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    expect(youtubeExtractor.canHandle('https://tiktok.com')).toBe(false);
  });

  it('directExtractor handles media file URLs', () => {
    expect(directExtractor.canHandle('https://example.com/test.mp4')).toBe(true);
    expect(directExtractor.canHandle('https://example.com/sound.mp3')).toBe(true);
    expect(directExtractor.canHandle('https://example.com/page.html')).toBe(false);
  });
});

describe('CORS Proxy Helper', () => {
  it('wraps target URL with codetabs by default', () => {
    const wrapped = wrapWithProxy('https://example.com/api');
    expect(wrapped).toContain('https://api.codetabs.com/v1/proxy?quest=https%3A%2F%2Fexample.com%2Fapi');
  });

  it('returns untouched URL when direct is specified', () => {
    const direct = wrapWithProxy('https://example.com/api', 'direct');
    expect(direct).toBe('https://example.com/api');
  });
});

describe('Download Manager Helpers', () => {
  it('sanitizes titles into safe filenames', () => {
    const safe = sanitizeFilename('My Cool Video! [1080p] / <HD>?', 'mp4');
    expect(safe).toBe('My_Cool_Video!_[1080p]_HD.mp4');
  });

  it('formats byte sizes into readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
    expect(formatBytes(1024 * 1024 * 1024 * 1.2)).toBe('1.2 GB');
  });
});

describe('YouTube Extractor Live Smoke Test', () => {
  it('extracts metadata and stream options for a YouTube video', async () => {
    const result = await extractMedia('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.platform).toBe('youtube');
    expect(result.data?.title).toBeTruthy();
    expect(result.data?.thumbnailUrl).toBeTruthy();
    expect(result.data?.streams.length).toBeGreaterThan(0);
    expect(result.data?.streams[0].url).toBeTruthy();
    // Critical: Ensure streams are actual downloadable files, NEVER a redirect back to youtube watch page!
    expect(result.data?.streams[0].url).not.toMatch(/youtube\.com\/watch/);
    expect(result.data?.streams[0].url).not.toMatch(/youtu\.be\//);
  }, 12000);
});

describe('Storage & Settings Unification', () => {
  const originalLocalStorage = globalThis.localStorage;
  let mockStorage: Record<string, string> = {};

  beforeEach(async () => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => { mockStorage[key] = val; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; }
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true
    });
  });

  it('defaults Cobalt instance to rue-cobalt.xenon.zone', async () => {
    const { getSettings } = await import('../storage');
    const settings = getSettings();
    expect(settings.cobaltInstance).toBe('https://rue-cobalt.xenon.zone');
  });

  it('automatically migrates deprecated api.cobalt.tools to rue-cobalt.xenon.zone', async () => {
    const { getSettings, SETTINGS_KEY } = await import('../storage');
    mockStorage[SETTINGS_KEY] = JSON.stringify({ cobaltInstance: 'https://api.cobalt.tools' });
    const settings = getSettings();
    expect(settings.cobaltInstance).toBe('https://rue-cobalt.xenon.zone');
  });

  it('getCustomCobaltInstance respects unified settings key hydra_downloader_settings', async () => {
    const { getCustomCobaltInstance, setCustomCobaltInstance } = await import('./cobalt');
    const { getSettings } = await import('../storage');
    setCustomCobaltInstance('https://custom-cobalt.example.com/');
    expect(getCustomCobaltInstance()).toBe('https://custom-cobalt.example.com');
    expect(getSettings().cobaltInstance).toBe('https://custom-cobalt.example.com');
  });

  it('getCustomCorsProxy respects unified settings key hydra_downloader_settings', async () => {
    const { getCustomCorsProxy, setCustomCorsProxy } = await import('./cors');
    const { getSettings } = await import('../storage');
    setCustomCorsProxy('https://proxy.example.com/?url={url} ');
    expect(getCustomCorsProxy()).toBe('https://proxy.example.com/?url={url}');
    expect(getSettings().customCorsProxy).toBe('https://proxy.example.com/?url={url}');
  });

  it('migrates legacy storage keys to hydra_downloader_settings when settings key is absent', async () => {
    const { getSettings, SETTINGS_KEY } = await import('../storage');
    mockStorage['hydra_cobalt_instance'] = 'https://legacy-cobalt.xenon.zone';
    mockStorage['hydra_cors_proxy'] = 'https://legacy-proxy.com/?url={url}';
    delete mockStorage[SETTINGS_KEY];

    const settings = getSettings();
    expect(settings.cobaltInstance).toBe('https://legacy-cobalt.xenon.zone');
    expect(settings.customCorsProxy).toBe('https://legacy-proxy.com/?url={url}');
    expect(mockStorage[SETTINGS_KEY]).toBeDefined();
  });
});

describe('Twitter Extractor Format Accuracy', () => {
  it('maps video accurately and never exposes video MP4 URLs as .m4a audio', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url: any) => {
        if (typeof url === 'string' && url.includes('api.fxtwitter.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              code: 200,
              message: 'OK',
              tweet: {
                id: '1234567890',
                text: 'Test tweet with video',
                author: { name: 'Tester', screen_name: 'tester' },
                media: {
                  videos: [
                    {
                      type: 'video',
                      url: 'https://video.twimg.com/amplify_video/123/vid/avc1/720x1280/video.mp4',
                      duration: 15,
                      width: 720,
                      height: 1280
                    }
                  ]
                }
              }
            })
          } as unknown as Response;
        }
        return { ok: false, status: 404 } as unknown as Response;
      };

      const result = await twitterExtractor.extract('https://x.com/tester/status/1234567890');
      expect(result.success).toBe(true);
      expect(result.data?.streams.length).toBeGreaterThan(0);

      // Verify no stream presents an MP4 video URL as an .m4a audio stream
      for (const s of result.data!.streams) {
        if (s.format === 'm4a') {
          expect(s.url).not.toMatch(/\.mp4(\?|$)/i);
        }
        if (s.type === 'video') {
          expect(s.format).toBe('mp4');
        }
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

