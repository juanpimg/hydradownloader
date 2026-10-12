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
});
