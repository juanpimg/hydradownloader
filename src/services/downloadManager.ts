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
  // Reject web page URLs that are not direct downloadable files
  if (
    /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i.test(stream.url)
  ) {
    throw new Error('Esta opción no contiene un archivo multimedia descargable directo.');
  }

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
    speed: 'Iniciando descarga...'
  });

  try {
    const startTime = Date.now();
    let response: Response;

    try {
      response = await fetch(stream.url, { signal });
    } catch {
      // If direct fetch is blocked by CORS, trigger standard browser download directly to disk
      console.warn('[HydraDownloader] Fetch bloqueado por CORS. Redirigiendo a descarga nativa del navegador.');
      triggerBrowserSave(stream.url, filename);
      onProgress({
        isDownloading: false,
        progress: 100,
        bytesReceived: stream.fileSize || 0,
        totalBytes: stream.fileSize || 0,
        speed: 'Descarga iniciada'
      });
      return;
    }

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length') || response.headers.get('estimated-content-length');
    const total = contentLength ? parseInt(contentLength, 10) : (stream.fileSize || 0);

    if (!response.body) {
      triggerBrowserSave(stream.url, filename);
      onProgress({
        isDownloading: false,
        progress: 100,
        bytesReceived: total,
        totalBytes: total,
        speed: 'Descarga iniciada'
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
      const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : Math.min(99, Math.round(received / (1024 * 1024 * 10)));

      onProgress({
        isDownloading: true,
        progress: pct,
        bytesReceived: received,
        totalBytes: total,
        speed: `${speedMBps} MB/s`
      });
    }

    // Determine MIME type based on format / type
    const mimeType = stream.type === 'audio'
      ? (stream.format === 'mp3' ? 'audio/mpeg' : 'audio/mp4')
      : 'video/mp4';

    const blob = new Blob(chunks, { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);
    triggerBrowserSave(objectUrl, filename);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 30000);

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

    console.warn('[HydraDownloader] Error en descarga progresiva, intentando guardado directo en navegador:', err);
    triggerBrowserSave(stream.url, filename);
    onProgress({
      isDownloading: false,
      progress: 100,
      bytesReceived: 0,
      totalBytes: 0,
      speed: 'Descarga iniciada'
    });
  }
}

export function triggerBrowserSave(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // NOTE: Never set a.target = '_blank' here, because browsers ignore the `download` attribute
  // for navigation and simply open the target URL in a new window instead of saving to disk!
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}
