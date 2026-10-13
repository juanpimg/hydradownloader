import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { probeTunnelUrl, cobaltExtractor, DEFAULT_COBALT_INSTANCES } from './cobalt';

describe('Cobalt Extractor & Tunnel Validation', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('probeTunnelUrl', () => {
    it('rejects tunnel URL when estimated-content-length is -1', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'estimated-content-length': '-1' })
      } as unknown as Response);

      const isValid = await probeTunnelUrl('https://tunnel.example.com/blocked.mp4');
      expect(isValid).toBe(false);
    });

    it('rejects tunnel URL when estimated-content-length is 0', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'estimated-content-length': '0' })
      } as unknown as Response);

      const isValid = await probeTunnelUrl('https://tunnel.example.com/empty-est.mp4');
      expect(isValid).toBe(false);
    });

    it('rejects tunnel URL when content-length is 0', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '0' })
      } as unknown as Response);

      const isValid = await probeTunnelUrl('https://tunnel.example.com/zero.mp4');
      expect(isValid).toBe(false);
    });

    it('accepts tunnel URL when estimated-content-length is positive', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'estimated-content-length': '5242880' })
      } as unknown as Response);

      const isValid = await probeTunnelUrl('https://tunnel.example.com/valid.mp4');
      expect(isValid).toBe(true);
    });

    it('accepts tunnel URL when content-length is positive', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '1048576' })
      } as unknown as Response);

      const isValid = await probeTunnelUrl('https://tunnel.example.com/valid-cl.mp4');
      expect(isValid).toBe(true);
    });

    it('rejects tunnel URL when Range GET yields empty stream', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        cancel: vi.fn().mockResolvedValue(undefined)
      };

      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 405,
          headers: new Headers()
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 206,
          headers: new Headers(),
          body: {
            getReader: () => mockReader,
            cancel: vi.fn().mockResolvedValue(undefined)
          }
        } as unknown as Response);

      const isValid = await probeTunnelUrl('https://tunnel.example.com/empty-stream.mp4');
      expect(isValid).toBe(false);
    });

    it('accepts tunnel URL when Range GET yields positive byte chunks', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ done: false, value: new Uint8Array([1, 2, 3]) }),
        cancel: vi.fn().mockResolvedValue(undefined)
      };

      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 405,
          headers: new Headers()
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 206,
          headers: new Headers(),
          body: {
            getReader: () => mockReader,
            cancel: vi.fn().mockResolvedValue(undefined)
          }
        } as unknown as Response);

      const isValid = await probeTunnelUrl('https://tunnel.example.com/valid-stream.mp4');
      expect(isValid).toBe(true);
    });
  });

  describe('Instance Failover in Cobalt Extractor', () => {
    it('rotates to next healthy instance when first instance returns an empty tunnel', async () => {
      const firstInstance = DEFAULT_COBALT_INSTANCES[0];
      const secondInstance = DEFAULT_COBALT_INSTANCES[1];

      const fetchMock = vi.fn().mockImplementation((url: string, init?: any) => {
        const urlStr = String(url);
        // POST to first instance returns tunnel url
        if (urlStr.includes(firstInstance) && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              status: 'tunnel',
              url: 'https://first-instance.tunnel/stream.mp4'
            })
          });
        }
        // Probe of first instance tunnel returns estimated-content-length: -1 (empty / blocked)
        if (urlStr === 'https://first-instance.tunnel/stream.mp4') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'estimated-content-length': '-1' })
          });
        }
        // POST to second instance returns valid tunnel url
        if (urlStr.includes(secondInstance) && init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              status: 'tunnel',
              url: 'https://second-instance.tunnel/stream.mp4'
            })
          });
        }
        // Probe of second instance tunnel returns positive length
        if (urlStr === 'https://second-instance.tunnel/stream.mp4') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'estimated-content-length': '15728640' })
          });
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => 'Unexpected call'
        });
      });

      globalThis.fetch = fetchMock;

      const result = await cobaltExtractor.extract('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.streams[0].url).toBe('https://second-instance.tunnel/stream.mp4');
      expect(result.data?.extractedVia).toContain(secondInstance);
    });

    it('returns clear YouTube platform restriction error if all instances fail on YouTube URL', async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string, init?: any) => {
        const urlStr = String(url);
        if (init?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              status: 'tunnel',
              url: 'https://mock.tunnel/stream.mp4'
            })
          });
        }
        if (urlStr === 'https://mock.tunnel/stream.mp4') {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ 'estimated-content-length': '-1' })
          });
        }
        return Promise.resolve({ ok: false, status: 500 });
      });

      const result = await cobaltExtractor.extract('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/restricciones de YouTube en las instancias de Cobalt/i);
    });
  });
});
