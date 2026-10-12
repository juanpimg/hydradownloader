import { StreamOption } from './extractors/types';

export interface DownloadProgressState {
  isDownloading: boolean;
  progress: number; // 0 to 100
  bytesReceived: number;
  totalBytes: number;
  speed: string; // e.g. "3.2 MB/s"
  error?: string;
}

export function sanitizeFilename(title: string, format: string): string {
  const clean = title
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 100);

  const base = clean || 'hydra_download';
  return base.endsWith(`.${format}`) ? base : `${base}.${format}`;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export async function downloadStream(
  stream: StreamOption,
  title: string,
  onProgress?: (state: DownloadProgressState) => void,
  signal?: AbortSignal
): Promise<void> {
  const filename = sanitizeFilename(title, stream.format);

  // If onProgress is not provided, trigger immediate direct anchor download
  if (!onProgress) {
    triggerBrowserSave(stream.url, filename);
    return;
  }

  onProgress({
    isDownloading: true,
    progress: 0,
    bytesReceived: 0,
    totalBytes: stream.fileSize || 0,
    speed: 'Iniciando...'
  });

  try {
    const startTime = Date.now();
    let response: Response;

    try {
      response = await fetch(stream.url, { signal });
    } catch {
      // If direct fetch is blocked by CORS, trigger standard browser download immediately
      console.warn('[HydraDownloader] Fetch bloqueado por CORS. Redirigiendo a descarga directa del navegador.');
      triggerBrowserSave(stream.url, filename);
      onProgress({
        isDownloading: false,
        progress: 100,
        bytesReceived: stream.fileSize || 0,
        totalBytes: stream.fileSize || 0,
        speed: 'Completado (Descarga Directa)'
      });
      return;
    }

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : (stream.fileSize || 0);

    if (!response.body) {
      triggerBrowserSave(stream.url, filename);
      onProgress({
        isDownloading: false,
        progress: 100,
        bytesReceived: total,
        totalBytes: total,
        speed: 'Completado'
      });
      return;
    }

    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value.buffer as ArrayBuffer);
        received += value.length;
      }

      const elapsedSec = (Date.now() - startTime) / 1000;
      const speedMBps = elapsedSec > 0 ? (received / (1024 * 1024) / elapsedSec).toFixed(1) : '0';
      const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 50;

      onProgress({
        isDownloading: true,
        progress: pct,
        bytesReceived: received,
        totalBytes: total,
        speed: `${speedMBps} MB/s`
      });
    }

    const blob = new Blob(chunks);
    const objectUrl = URL.createObjectURL(blob);
    triggerBrowserSave(objectUrl, filename);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 10000);

    onProgress({
      isDownloading: false,
      progress: 100,
      bytesReceived: received,
      totalBytes: total || received,
      speed: 'Completado'
    });
  } catch (err: any) {
    if (signal?.aborted) {
      onProgress({
        isDownloading: false,
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        speed: 'Cancelado'
      });
      return;
    }

    console.warn('[HydraDownloader] Error en descarga progresiva, intentando descarga directa:', err);
    triggerBrowserSave(stream.url, filename);
    onProgress({
      isDownloading: false,
      progress: 100,
      bytesReceived: 0,
      totalBytes: 0,
      speed: 'Descarga iniciada en navegador'
    });
  }
}

export function triggerBrowserSave(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener noreferrer';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
