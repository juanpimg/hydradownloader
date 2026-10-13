import { StreamOption } from './extractors/types';
import { t } from './i18n';

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
    throw new Error(t('dm_nofile'));
  }

  if (!stream.url || typeof stream.url !== 'string') {
    throw new Error(t('dm_badurl'));
  }

  if (stream.fileSize !== undefined && stream.fileSize <= 0) {
    throw new Error(t('dm_zerosize'));
  }

  if (signal?.aborted) {
    return;
  }

  const filename = sanitizeFilename(title, stream.format);
  const notify = (state: DownloadProgressState) => {
    if (onProgress) {
      onProgress(state);
    }
  };

  notify({
    isDownloading: true,
    progress: 0,
    bytesReceived: 0,
    totalBytes: stream.fileSize || 0,
    speed: t('dm_starting')
  });


  const CONNECT_TIMEOUT_MS = 20000;
  const STALL_TIMEOUT_MS = 25000;
  const MAX_RESUME_ATTEMPTS = 3;

  let internalController = new AbortController();
  let isInternalStall = false;
  let stallReason: string | null = null;
  let browserSaveAttempted = false;
  let activeReader: any = null;

  const onUserAbort = () => {
    internalController.abort();
    if (activeReader) {
      try {
        activeReader.cancel().catch(() => {});
      } catch {
        // ignore
      }
    }
  };

  if (signal) {
    signal.addEventListener('abort', onUserAbort, { once: true });
  }

  let stallTimer: ReturnType<typeof setTimeout> | null = null;

  const resetStallWatchdog = (
    timeoutMs = STALL_TIMEOUT_MS,
    reason = t('dm_stall')
  ) => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      isInternalStall = true;
      stallReason = reason;
      internalController.abort();
      if (activeReader) {
        try {
          activeReader.cancel().catch(() => {});
        } catch {
          // ignore
        }
      }
    }, timeoutMs);
  };

  const clearStallWatchdog = () => {
    if (stallTimer) {
      clearTimeout(stallTimer);
      stallTimer = null;
    }
  };

  try {
    const startTime = Date.now();
    const chunks: BlobPart[] = [];
    let received = 0;
    let total = stream.fileSize || 0;
    let exactTotal = 0;
    let resumeAttempts = 0;

    while (true) {
      if (signal?.aborted) {
        notify({
          isDownloading: false,
          progress: 0,
          bytesReceived: 0,
          totalBytes: 0,
          speed: t('dm_cancelled')
        });
        return;
      }

      let response: Response;
      resetStallWatchdog(
        CONNECT_TIMEOUT_MS,
        received === 0
          ? t('dm_timeout_connect')
          : t('dm_timeout_resume')
      );

      try {
        const headers: Record<string, string> = {};
        if (received > 0) {
          headers['Range'] = `bytes=${received}-`;
        }

        response = await fetch(stream.url, {
          headers,
          signal: internalController.signal
        });
      } catch (fetchErr: any) {
        clearStallWatchdog();
        if (signal?.aborted) throw fetchErr;

        if (received === 0) {
          if (isInternalStall) {
            throw new Error(`${t('dm_net_prefix')}${stallReason || t('dm_net_timeout')}`);
          }

          // If direct fetch() fails due to CORS or network blockage, provide graceful fallback to direct browser save
          const isCorsOrNetwork =
            fetchErr instanceof TypeError ||
            /failed to fetch|network\s*error|cors|load failed|cross-origin/i.test(fetchErr?.message || '');

          if (isCorsOrNetwork && stream.url) {
            try {
              triggerBrowserSave(stream.url, filename);
              browserSaveAttempted = true;
              fetchErr.isBrowserSaveInitiated = true;
            } catch {
              // ignore
            }
          }
          throw fetchErr;
        }

        // Mid-stream connection dropped (cellular IP switch or TCP reset): try Range resume
        if (resumeAttempts < MAX_RESUME_ATTEMPTS) {
          resumeAttempts++;
          const delay = Math.min(1000 * resumeAttempts, 3000);
          notify({
            isDownloading: true,
            progress: total > 0 ? Math.min(99, Math.round((received / total) * 100)) : 0,
            bytesReceived: received,
            totalBytes: total,
            speed: t('dm_reconnecting', { a: resumeAttempts, b: MAX_RESUME_ATTEMPTS })
          });

          // Reset abort controller and stall state for next attempt
          internalController = new AbortController();
          isInternalStall = false;
          stallReason = null;

          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new Error(
          t('dm_interrupted', { r: formatBytes(received), t: total > 0 ? ` of ${formatBytes(total)}` : '', n: resumeAttempts })
        );
      } finally {
        clearStallWatchdog();
      }

      if (signal?.aborted) {
        notify({
          isDownloading: false,
          progress: 0,
          bytesReceived: 0,
          totalBytes: 0,
          speed: t('dm_cancelled')
        });
        return;
      }

      if (response.status === 416) {
        if (total > 0 && received >= total) {
          break;
        }
        throw new Error(t('dm_416'));
      }

      if (!response.ok) {
        throw new Error(t('dm_http', { s: response.status, t: response.statusText }));
      }

      if (response.status === 204 || response.status === 205) {
        throw new Error(t('dm_nocontent'));
      }

      const cl = response.headers.get('content-length');
      const ecl = response.headers.get('estimated-content-length');
      const cr = response.headers.get('content-range');

      const clNum = cl !== null ? parseInt(cl.trim(), 10) : null;
      const eclNum = ecl !== null ? parseInt(ecl.trim(), 10) : null;

      if (received === 0) {
        if (clNum !== null && (isNaN(clNum) || clNum <= 0)) {
          throw new Error(t('dm_empty'));
        }

        if (eclNum !== null && (isNaN(eclNum) || eclNum <= 0)) {
          throw new Error(t('dm_empty') + t('dm_blocked'));
        }

        if (cr && (/\/0$/.test(cr.trim()) || /\/-1$/.test(cr.trim()))) {
          throw new Error(t('dm_empty'));
        }

        if (cr) {
          const match = cr.trim().match(/\/([0-9]+)$/);
          if (match) {
            const parsedCrTotal = parseInt(match[1], 10);
            if (parsedCrTotal <= 0) {
              throw new Error(t('dm_empty'));
            }
            exactTotal = parsedCrTotal;
          }
        }

        if (clNum !== null && !isNaN(clNum) && clNum > 0) {
          exactTotal = clNum;
        }

        if (exactTotal > 0) {
          total = exactTotal;
        } else if (eclNum !== null && !isNaN(eclNum) && eclNum > 0) {
          total = eclNum;
        } else if (stream.fileSize && stream.fileSize > 0) {
          total = stream.fileSize;
        }
      } else {
        // On resume, server returned 200 (ignored Range, restarted from byte 0)
        if (response.status === 200) {
          chunks.length = 0;
          received = 0;
          if (clNum !== null && !isNaN(clNum) && clNum > 0) {
            exactTotal = clNum;
            total = clNum;
          }
        } else if (response.status === 206 && cr) {
          const match = cr.trim().match(/\/([0-9]+)$/);
          if (match) {
            const parsedCrTotal = parseInt(match[1], 10);
            if (parsedCrTotal > 0) {
              exactTotal = parsedCrTotal;
              total = parsedCrTotal;
            }
          }
        }
      }

      if (!response.body) {
        throw new Error(t('dm_nostream'));
      }

      const reader = response.body.getReader();
      activeReader = reader;
      let streamInterrupted = false;

      resetStallWatchdog(
        STALL_TIMEOUT_MS,
        t('dm_midstall')
      );

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Premature EOF check: only if we have an authoritative exact length from the server
            if (received > 0 && exactTotal > 0 && received < exactTotal) {
              streamInterrupted = true;
            }
            break;
          }

        if (value) {
          chunks.push(value);
          received += value.length;
          resetStallWatchdog(
            STALL_TIMEOUT_MS,
            t('dm_midstall')
          );
        }

        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedMBps = elapsedSec > 0 ? (received / (1024 * 1024) / elapsedSec).toFixed(1) : '0';
        const pct = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : Math.min(99, Math.round(received / (1024 * 1024 * 10)));

        notify({
          isDownloading: true,
          progress: pct,
          bytesReceived: received,
          totalBytes: total,
          speed: `${speedMBps} MB/s`
        });
      }
    } catch {
      if (signal?.aborted) return;
      if (received > 0) {
        streamInterrupted = true;
      }
    } finally {
      activeReader = null;
      clearStallWatchdog();
      if (signal?.aborted || isInternalStall) {
        reader.cancel().catch(() => {});
      }
      reader.releaseLock();
    }

    if (signal?.aborted) {
      notify({
        isDownloading: false,
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        speed: t('dm_cancelled')
      });
      return;
    }

    if (streamInterrupted && received > 0) {
        if (resumeAttempts < MAX_RESUME_ATTEMPTS) {
          resumeAttempts++;
          const delay = Math.min(1000 * resumeAttempts, 3000);
          notify({
            isDownloading: true,
            progress: total > 0 ? Math.min(99, Math.round((received / total) * 100)) : 0,
            bytesReceived: received,
            totalBytes: total,
            speed: t('dm_reconnecting', { a: resumeAttempts, b: MAX_RESUME_ATTEMPTS })
          });

          // Reset abort controller and stall state for next attempt
          internalController = new AbortController();
          isInternalStall = false;
          stallReason = null;

          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        throw new Error(
          t('dm_interrupted2', { r: formatBytes(received), t: total > 0 ? ` of ${formatBytes(total)}` : '', n: resumeAttempts })
        );
      }

      // Stream successfully finished!
      break;
    }

    if (received === 0) {
      throw new Error(t('dm_emptyfile'));
    }

    // Determine MIME type based on format / type
    let mimeType = 'application/octet-stream';
    const fmt = (stream.format || '').toLowerCase();
    if (stream.type === 'audio') {
      const audioMimes: Record<string, string> = {
        mp3: 'audio/mpeg',
        m4a: 'audio/mp4',
        ogg: 'audio/ogg',
        wav: 'audio/wav',
        flac: 'audio/flac',
        aac: 'audio/aac',
        opus: 'audio/opus'
      };
      mimeType = audioMimes[fmt] || 'audio/mpeg';
    } else if (stream.type === 'image') {
      const imageMimes: Record<string, string> = {
        png: 'image/png',
        webp: 'image/webp',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif'
      };
      mimeType = imageMimes[fmt] || 'image/jpeg';
    } else {
      const videoMimes: Record<string, string> = {
        webm: 'video/webm',
        mkv: 'video/x-matroska',
        mov: 'video/quicktime',
        mp4: 'video/mp4'
      };
      mimeType = videoMimes[fmt] || 'video/mp4';
    }

    const blob = new Blob(chunks, { type: mimeType });
    if (blob.size === 0) {
      throw new Error(t('dm_emptyblob'));
    }

    const objectUrl = URL.createObjectURL(blob);
    triggerBrowserSave(objectUrl, filename);

    setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    }, 30000);

    notify({
      isDownloading: false,
      progress: 100,
      bytesReceived: received,
      totalBytes: total || received,
      speed: t('dm_completed')
    });
  } catch (err: any) {
    clearStallWatchdog();
    if (signal?.aborted) {
      notify({
        isDownloading: false,
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        speed: t('dm_cancelled')
      });
      return;
    }

    if (isInternalStall) {
      const stallErr = new Error(`${t('dm_net_prefix')}${stallReason || t('dm_stallnet')}`);
      notify({
        isDownloading: false,
        progress: 0,
        bytesReceived: 0,
        totalBytes: 0,
        speed: t('dm_failed'),
        error: stallErr.message
      });
      throw stallErr;
    }

    notify({
      isDownloading: false,
      progress: 0,
      bytesReceived: 0,
      totalBytes: 0,
      speed: t('dm_failed'),
      error: browserSaveAttempted
        ? `${err.message || t('dm_cors')}${t('dm_cors_suffix')}`
        : (err.message || t('dm_download_error'))
    });

    throw err;
  } finally {
    clearStallWatchdog();
    if (signal) {
      signal.removeEventListener('abort', onUserAbort);
    }
  }
}

export function triggerBrowserSave(url: string, filename: string): void {
  if (typeof document === 'undefined' || !document.body) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // NOTE: Never set a.target = '_blank' here, because browsers ignore the `download` attribute
  // for navigation and simply open the target URL in a new window instead of saving to disk!
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (typeof document !== 'undefined' && a.parentNode) {
      a.parentNode.removeChild(a);
    }
  }, 100);
}
