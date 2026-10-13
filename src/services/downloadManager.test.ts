import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadStream } from './downloadManager';
import { StreamOption } from './extractors/types';

describe('Download Manager - 0-byte and error prevention', () => {
  const sampleStream: StreamOption = {
    id: 'test-stream-1',
    label: 'Test 1080p',
    quality: '1080',
    format: 'mp4',
    type: 'video',
    url: 'https://example.com/media.mp4',
    hasAudio: true,
    fileSize: 1024
  };

  let originalFetch: typeof globalThis.fetch;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('rejects immediately when Content-Length is 0 and never triggers download', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-length': '0'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.close();
        }
      })
    } as unknown as Response);

    const onProgress = vi.fn();

    await expect(downloadStream(sampleStream, 'Test Title', onProgress)).rejects.toThrow(
      /respuesta vacía \(0 bytes\)/i
    );

    // Verify createObjectURL was never called (no 0-byte blob created for download)
    expect(URL.createObjectURL).not.toHaveBeenCalled();

    // Verify onProgress received error
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        isDownloading: false,
        speed: 'Error',
        error: expect.stringMatching(/0 bytes/i)
      })
    );
  });

  it('rejects when response body produces 0 bytes (empty stream) and never triggers download', async () => {
    // Content-length header omitted or estimated, but stream produces 0 bytes
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({}),
      body: new ReadableStream({
        start(controller) {
          controller.close(); // Immediate empty close
        }
      })
    } as unknown as Response);

    const onProgress = vi.fn();

    await expect(downloadStream(sampleStream, 'Test Title', onProgress)).rejects.toThrow(
      /0 bytes recibidos/i
    );

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        isDownloading: false,
        bytesReceived: 0,
        speed: 'Error'
      })
    );
  });

  it('rejects on HTTP error (e.g. 500 or 404) without falling back to corrupted anchor download', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers()
    } as unknown as Response);

    const onProgress = vi.fn();

    await expect(downloadStream(sampleStream, 'Test Title', onProgress)).rejects.toThrow(
      /Error HTTP 404/i
    );

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        isDownloading: false,
        speed: 'Error'
      })
    );
  });

  it('rejects when fetch throws network or CORS error without faking completion or triggering download', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (CORS block)'));

    const onProgress = vi.fn();

    await expect(downloadStream(sampleStream, 'Test Title', onProgress)).rejects.toThrow(
      /Failed to fetch/i
    );

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        isDownloading: false,
        speed: 'Error',
        error: expect.stringMatching(/Failed to fetch/)
      })
    );
  });

  it('triggers direct browser save fallback when fetch fails due to CORS / network block', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const mockClick = vi.fn();
    const mockRemoveChild = vi.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
      parentNode: { removeChild: mockRemoveChild }
    };

    (globalThis as any).document = {
      createElement: vi.fn(() => mockAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: mockRemoveChild
      }
    };

    try {
      const onProgress = vi.fn();
      await expect(downloadStream(sampleStream, 'Direct Download File', onProgress)).rejects.toThrow(
        /Failed to fetch/i
      );

      expect((globalThis as any).document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.href).toBe(sampleStream.url);
      expect(mockAnchor.download).toBe('Direct_Download_File.mp4');
      expect(mockClick).toHaveBeenCalled();
    } finally {
      delete (globalThis as any).document;
    }
  });

  it('rejects when response body is null', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '500' }),
      body: null
    } as unknown as Response);

    const onProgress = vi.fn();

    await expect(downloadStream(sampleStream, 'Test Title', onProgress)).rejects.toThrow(
      /flujo de datos de la descarga no está disponible/i
    );

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('successfully creates blob and completes when stream yields data (>0 bytes)', async () => {
    const testData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-length': '8'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(testData);
          controller.close();
        }
      })
    } as unknown as Response);

    const onProgress = vi.fn();

    await downloadStream(sampleStream, 'Valid Video', onProgress);

    // Verify blob was created and URL generated
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    // Verify progress finished successfully
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        isDownloading: false,
        progress: 100,
        bytesReceived: 8,
        speed: 'Completado'
      })
    );
  });

  it('rejects YouTube page URLs directly', async () => {
    const invalidStream: StreamOption = {
      ...sampleStream,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    };

    await expect(downloadStream(invalidStream, 'Video')).rejects.toThrow(
      /no contiene un archivo multimedia descargable directo/i
    );
  });

  it('rejects immediately when stream.fileSize is 0 without fetching', async () => {
    const zeroSizeStream: StreamOption = {
      ...sampleStream,
      fileSize: 0
    };
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    await expect(downloadStream(zeroSizeStream, 'Zero Video')).rejects.toThrow(
      /tamaño indicado para este archivo es de 0 bytes/i
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects on HTTP 204 No Content without creating 0-byte download', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content',
      headers: new Headers()
    } as unknown as Response);

    await expect(downloadStream(sampleStream, 'Empty Video')).rejects.toThrow(
      /respuesta sin contenido \(0 bytes\)/i
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects download immediately without saving when estimated-content-length is -1', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'estimated-content-length': '-1'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.close();
        }
      })
    } as unknown as Response);

    const onProgress = vi.fn();
    await expect(downloadStream(sampleStream, 'Blocked Video', onProgress)).rejects.toThrow(
      /respuesta vacía \(0 bytes\)/i
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        isDownloading: false,
        speed: 'Error',
        error: expect.stringMatching(/0 bytes/i)
      })
    );
  });

  it('rejects immediately when Content-Length is malformed or NaN', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-length': 'invalid-not-a-number'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.close();
        }
      })
    } as unknown as Response);

    const onProgress = vi.fn();
    await expect(downloadStream(sampleStream, 'NaN Content Length', onProgress)).rejects.toThrow(
      /respuesta vacía \(0 bytes\)/i
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects immediately when estimated-content-length is malformed or NaN', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'estimated-content-length': 'abc'
      }),
      body: new ReadableStream({
        start(controller) {
          controller.close();
        }
      })
    } as unknown as Response);

    const onProgress = vi.fn();
    await expect(downloadStream(sampleStream, 'NaN Estimated Length', onProgress)).rejects.toThrow(
      /respuesta vacía \(0 bytes\)/i
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('aborts and cancels reader when user signal aborts mid-stream', async () => {
    const abortCtrl = new AbortController();
    const cancelSpy = vi.fn().mockResolvedValue(undefined);

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]));
      },
      cancel: cancelSpy
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '100' }),
      body: mockStream
    } as unknown as Response);

    const onProgress = vi.fn();
    const downloadPromise = downloadStream(sampleStream, 'Abort Test', onProgress, abortCtrl.signal);
    
    // Allow stream to initialize and process first chunk before aborting mid-stream
    await new Promise((resolve) => setTimeout(resolve, 20));
    abortCtrl.abort();
    await downloadPromise;

    expect(cancelSpy).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        isDownloading: false,
        speed: 'Cancelado'
      })
    );
  });

  it('correctly sets MIME types for audio, image, and video', async () => {
    const testData = new Uint8Array([10, 20, 30]);

    // Audio stream (MP3)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '3' }),
      body: new ReadableStream({
        start(c) {
          c.enqueue(testData);
          c.close();
        }
      })
    } as unknown as Response);

    const audioStream: StreamOption = {
      ...sampleStream,
      type: 'audio',
      format: 'mp3'
    };
    await downloadStream(audioStream, 'Song');
    const createdBlob1 = (URL.createObjectURL as any).mock.calls[0][0];
    expect(createdBlob1.type).toBe('audio/mpeg');

    // Image stream (PNG)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '3' }),
      body: new ReadableStream({
        start(c) {
          c.enqueue(testData);
          c.close();
        }
      })
    } as unknown as Response);

    const imageStream: StreamOption = {
      ...sampleStream,
      type: 'image',
      format: 'png'
    };
    await downloadStream(imageStream, 'Photo');
    const createdBlob2 = (URL.createObjectURL as any).mock.calls[1][0];
    expect(createdBlob2.type).toBe('image/png');

    // Video stream (WebM)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '3' }),
      body: new ReadableStream({
        start(c) {
          c.enqueue(testData);
          c.close();
        }
      })
    } as unknown as Response);

    const webmStream: StreamOption = {
      ...sampleStream,
      type: 'video',
      format: 'webm'
    };
    await downloadStream(webmStream, 'Clip');
    const createdBlob3 = (URL.createObjectURL as any).mock.calls[2][0];
    expect(createdBlob3.type).toBe('video/webm');
  });
});

describe('Cobalt probeTunnelUrl - 0-byte and tunnel probe resilience', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('validates tunnel when HEAD is accepted with valid content length', async () => {
    const { probeTunnelUrl } = await import('./extractors/cobalt');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '1048576' })
    } as unknown as Response);

    const isValid = await probeTunnelUrl('https://tunnel.example.com/stream.mp4');
    expect(isValid).toBe(true);
  });

  it('falls back to Range GET when HEAD returns 405 Method Not Allowed', async () => {
    const { probeTunnelUrl } = await import('./extractors/cobalt');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 405,
        statusText: 'Method Not Allowed',
        headers: new Headers()
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 206,
        headers: new Headers({ 'content-length': '1', 'content-range': 'bytes 0-0/1000' }),
        body: {
          cancel: vi.fn().mockResolvedValue(undefined)
        }
      } as unknown as Response);

    globalThis.fetch = fetchMock;

    const isValid = await probeTunnelUrl('https://tunnel.example.com/stream.mp4');
    expect(isValid).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.method).toBe('HEAD');
    expect(fetchMock.mock.calls[1][1]?.method).toBe('GET');
  });

  it('rejects tunnel when content-length is 0', async () => {
    const { probeTunnelUrl } = await import('./extractors/cobalt');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-length': '0' })
    } as unknown as Response);

    const isValid = await probeTunnelUrl('https://tunnel.example.com/empty.mp4');
    expect(isValid).toBe(false);
  });

  it('rejects tunnel when content-range ends with /0', async () => {
    const { probeTunnelUrl } = await import('./extractors/cobalt');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 206,
      headers: new Headers({ 'content-range': 'bytes */0' })
    } as unknown as Response);

    const isValid = await probeTunnelUrl('https://tunnel.example.com/zero.mp4');
    expect(isValid).toBe(false);
  });

  it('rejects tunnel when server returns 404 Not Found', async () => {
    const { probeTunnelUrl } = await import('./extractors/cobalt');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers()
    } as unknown as Response);

    const isValid = await probeTunnelUrl('https://tunnel.example.com/notfound.mp4');
    expect(isValid).toBe(false);
  });

  it('rejects tunnel when estimated-content-length is -1', async () => {
    const { probeTunnelUrl } = await import('./extractors/cobalt');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'estimated-content-length': '-1' })
    } as unknown as Response);

    const isValid = await probeTunnelUrl('https://tunnel.example.com/blocked-tunnel.mp4');
    expect(isValid).toBe(false);
  });

  it('rejects tunnel when estimated-content-length is 0', async () => {
    const { probeTunnelUrl } = await import('./extractors/cobalt');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'estimated-content-length': '0' })
    } as unknown as Response);

    const isValid = await probeTunnelUrl('https://tunnel.example.com/zero-est.mp4');
    expect(isValid).toBe(false);
  });
});
