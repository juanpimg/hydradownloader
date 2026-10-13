import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPlatform, extractMedia } from './index';
import { directExtractor } from './direct';
import { createLocalFileMedia, isLocalMediaFileName } from './local';
import { sanitizeFilename, formatBytes } from '../downloadManager';

describe('Platform Detector (local-only)', () => {
  it('detects direct media files correctly', () => {
    expect(detectPlatform('https://example.com/video.mp4')).toBe('direct');
    expect(detectPlatform('https://example.com/audio.mp3?token=123')).toBe('direct');
  });

  it('detects local blob URLs correctly', () => {
    expect(detectPlatform('blob:https://example.com/uuid')).toBe('local');
  });

  it('returns unknown for platform pages (no external APIs)', () => {
    expect(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('unknown');
    expect(detectPlatform('https://twitter.com/user/status/1234567890')).toBe('unknown');
  });

  it('returns unknown for unsupported URLs', () => {
    expect(detectPlatform('https://unknown-service.com/media')).toBe('unknown');
    expect(detectPlatform('https://vimeo.com/123456')).toBe('unknown');
  });
});

describe('Extractor Handler Matching (local-only)', () => {
  it('directExtractor handles media file URLs', () => {
    expect(directExtractor.canHandle('https://example.com/test.mp4')).toBe(true);
    expect(directExtractor.canHandle('https://example.com/sound.mp3')).toBe(true);
    expect(directExtractor.canHandle('blob:https://example.com/uuid')).toBe(true);
    expect(directExtractor.canHandle('https://example.com/page.html')).toBe(false);
  });

  it('directExtractor rejects platform pages', () => {
    expect(directExtractor.canHandle('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(directExtractor.canHandle('https://x.com/user/status/123')).toBe(false);
  });
});

describe('extractMedia (local-only)', () => {
  it('extracts direct media without external APIs', async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '1024' })
      })) as unknown as typeof fetch;

      const result = await extractMedia('https://example.com/video.mp4');
      expect(result.success).toBe(true);
      expect(result.data?.platform).toBe('direct');
      expect(result.data?.extractedVia).toMatch(/no APIs/i);
      expect(result.data?.streams.length).toBeGreaterThan(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects platform URLs with local-only guidance', async () => {
    const result = await extractMedia('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/local-only/i);
  });
});

describe('Local file handling (no network)', () => {
  it('detects local media file names', () => {
    expect(isLocalMediaFileName('video.mp4')).toBe(true);
    expect(isLocalMediaFileName('song.mp3')).toBe(true);
    expect(isLocalMediaFileName('doc.pdf')).toBe(false);
  });

  it('creates local media metadata without network', () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'test-video.mp4', { type: 'video/mp4' });
    const media = createLocalFileMedia(file);
    expect(media.platform).toBe('local');
    expect(media.title).toBe('test-video.mp4');
    expect(media.streams).toHaveLength(1);
    expect(media.extractedVia).toMatch(/no network/i);
    expect(media.streams[0].url.startsWith('blob:')).toBe(true);
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

describe('Storage & Settings (local-only)', () => {
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

  it('defaults to local-only settings without remote keys', async () => {
    const { getSettings, DEFAULT_SETTINGS } = await import('../storage');
    const settings = getSettings();
    expect(settings.preferredMode).toBe('video');
    expect((settings as any).cobaltInstance).toBeUndefined();
    expect((settings as any).customCorsProxy).toBeUndefined();
    expect(DEFAULT_SETTINGS).not.toHaveProperty('cobaltInstance');
  });

  it('strips legacy remote keys on load', async () => {
    const { getSettings, SETTINGS_KEY } = await import('../storage');
    mockStorage[SETTINGS_KEY] = JSON.stringify({
      preferredMode: 'audio',
      cobaltInstance: 'https://rue-cobalt.xenon.zone',
      customCorsProxy: 'https://proxy.example.com'
    });
    const settings = getSettings();
    expect(settings.preferredMode).toBe('audio');
    expect((settings as any).cobaltInstance).toBeUndefined();
  });
});
