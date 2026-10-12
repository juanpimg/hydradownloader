import { describe, it, expect } from 'vitest';
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
  }, 12000);
});
