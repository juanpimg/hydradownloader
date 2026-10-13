import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';
import { getSettings, saveSettings } from '../storage';

export const DEFAULT_COBALT_INSTANCES = [
  'https://rue-cobalt.xenon.zone',
  'https://cobaltapi.cjs.nz'
];

export function normalizeInstanceUrl(url: string): string {
  let cleaned = (url || '').trim().replace(/\/+$/, '');
  if (!cleaned) return '';
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

export function getCustomCobaltInstance(): string {
  try {
    const settings = getSettings();
    const custom = normalizeInstanceUrl(settings.cobaltInstance);
    if (
      custom &&
      !custom.includes('qwkuns.me') &&
      !custom.includes('eversiege.network') &&
      !custom.includes('api.cobalt.tools')
    ) {
      return custom;
    }
    return DEFAULT_COBALT_INSTANCES[0];
  } catch {
    return DEFAULT_COBALT_INSTANCES[0];
  }
}

export function setCustomCobaltInstance(instanceUrl: string): void {
  try {
    saveSettings({ cobaltInstance: normalizeInstanceUrl(instanceUrl) });
  } catch {
    // ignore
  }
}

export function getCandidateCobaltInstances(): string[] {
  const candidates: string[] = [];
  try {
    const custom = getCustomCobaltInstance();
    const normalizedCustom = normalizeInstanceUrl(custom);
    if (normalizedCustom) {
      candidates.push(normalizedCustom);
    }
  } catch {
    // ignore
  }

  for (const inst of DEFAULT_COBALT_INSTANCES) {
    const normalized = normalizeInstanceUrl(inst);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  }

  return candidates;
}

/**
 * Validates or probes that a returned tunnel URL actually yields data.
 * Checks HTTP status and headers (rejects content-length or estimated-content-length <= 0, including -1).
 */
export async function probeTunnelUrl(url: string, signal?: AbortSignal, timeoutMs = 8000): Promise<boolean> {
  if (signal?.aborted) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const abortHandler = () => controller.abort();
  if (signal) {
    signal.addEventListener('abort', abortHandler, { once: true });
  }

  try {
    let res: Response | null = null;
    let isFromHead = false;

    // 1. Try HEAD first to probe without downloading the stream body
    try {
      const headRes = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      // If HEAD is successful and not 405/403/etc.
      if (headRes.ok) {
        res = headRes;
        isFromHead = true;
      }
    } catch {
      // HEAD network error or blocked; fallback to Range GET
    }

    // 2. If HEAD was rejected or failed, probe with Range GET (bytes=0-0)
    if (!res) {
      if (controller.signal.aborted) {
        return false;
      }

      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: controller.signal
      });

      if (res.body) {
        if (typeof (res.body as any).getReader === 'function') {
          try {
            const reader = res.body.getReader();
            const { done, value } = await reader.read();
            reader.cancel().catch(() => {});
            if (done || !value || value.length === 0) {
              return false;
            }
          } catch {
            return false;
          }
        } else if (typeof (res.body as any).cancel === 'function') {
          res.body.cancel().catch(() => {});
        }
      }
    }

    if (!res.ok && res.status !== 206) {
      return false;
    }

    const cl = res.headers.get('content-length');
    const ecl = res.headers.get('estimated-content-length');
    const cr = res.headers.get('content-range');

    const clNum = cl !== null ? parseInt(cl.trim(), 10) : null;
    const eclNum = ecl !== null ? parseInt(ecl.trim(), 10) : null;

    // Reject 0 bytes or negative content lengths (such as -1 used by backends when tunnel is blocked or empty)
    if (clNum !== null && (isNaN(clNum) || clNum <= 0)) {
      return false;
    }

    if (eclNum !== null && (isNaN(eclNum) || eclNum <= 0)) {
      return false;
    }

    if (cr) {
      const trimmedCr = cr.trim();
      if (/\/0$/.test(trimmedCr) || /\/-1$/.test(trimmedCr)) {
        return false;
      }
      const match = trimmedCr.match(/\/([0-9]+)$/);
      if (match && parseInt(match[1], 10) <= 0) {
        return false;
      }
    }

    // 3. If HEAD succeeded but had neither content-length nor estimated-content-length,
    // verify with Range GET to ensure it's not a dummy 0-byte stream
    if (isFromHead && res.ok && cl === null && ecl === null) {
      if (controller.signal.aborted) {
        return false;
      }

      try {
        const getRes = await fetch(url, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          signal: controller.signal
        });

        if (!getRes.ok && getRes.status !== 206) {
          return false;
        }

        const getCl = getRes.headers.get('content-length');
        const getEcl = getRes.headers.get('estimated-content-length');
        const getCr = getRes.headers.get('content-range');

        const getClNum = getCl !== null ? parseInt(getCl.trim(), 10) : null;
        const getEclNum = getEcl !== null ? parseInt(getEcl.trim(), 10) : null;

        if (getClNum !== null && (isNaN(getClNum) || getClNum <= 0)) {
          return false;
        }
        if (getEclNum !== null && (isNaN(getEclNum) || getEclNum <= 0)) {
          return false;
        }
        if (getCr) {
          const trimmedGetCr = getCr.trim();
          if (/\/0$/.test(trimmedGetCr) || /\/-1$/.test(trimmedGetCr)) {
            return false;
          }
          const match = trimmedGetCr.match(/\/([0-9]+)$/);
          if (match && parseInt(match[1], 10) <= 0) {
            return false;
          }
        }

        if (getRes.body) {
          if (typeof (getRes.body as any).getReader === 'function') {
            const reader = getRes.body.getReader();
            const { done, value } = await reader.read();
            reader.cancel().catch(() => {});
            if (done || !value || value.length === 0) {
              return false;
            }
          } else if (typeof (getRes.body as any).cancel === 'function') {
            getRes.body.cancel().catch(() => {});
          }
        } else if (getClNum === null && getEclNum === null) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
    if (signal) {
      signal.removeEventListener('abort', abortHandler);
    }
  }
}

export const cobaltExtractor: Extractor = {
  name: 'Cobalt Universal Fallback',

  canHandle(_url: string): boolean {
    // Can handle any web URL as fallback
    return true;
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    if (signal?.aborted) {
      return { success: false, error: 'Operación cancelada.' };
    }

    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
    const candidateInstances = getCandidateCobaltInstances();

    let lastError = 'No se pudo conectar a ninguna instancia de Cobalt.';
    let youtubeRestricted = false;
    let videoUnavailable = false;
    let videoPrivate = false;
    let ageRestricted = false;
    let geoBlocked = false;

    for (const instance of candidateInstances) {
      if (signal?.aborted) {
        return { success: false, error: 'Operación cancelada.' };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);

      const abortHandler = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      try {
        const endpoint = instance.endsWith('/') ? instance : `${instance}/`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            videoQuality: '1080',
            audioFormat: 'mp3',
            downloadMode: 'auto',
            filenameStyle: 'basic'
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          if (
            response.status === 403 ||
            response.status === 429 ||
            /youtube|restricted|bot|sign in|login/i.test(text)
          ) {
            youtubeRestricted = true;
          }
          lastError = `Instancia ${instance} respondió con error ${response.status}: ${text}`;
          continue;
        }

        const data = await response.json();

        if (data.status === 'error') {
          const errCode = (data.error?.code || '').toLowerCase();
          const errText = (data.text || '').toLowerCase();
          const contextService = (data.error?.context?.service || '').toLowerCase();

          if (errCode.includes('unavailable') || errCode.includes('not_found')) {
            videoUnavailable = true;
            lastError = 'El vídeo no está disponible en YouTube (puede haber sido eliminado o el enlace es incorrecto).';
            continue;
          }

          if (errCode.includes('private')) {
            videoPrivate = true;
            lastError = 'Este vídeo de YouTube es privado y no se puede descargar.';
            continue;
          }

          if (
            errCode.includes('age_restricted') ||
            errCode.includes('login_required') ||
            /age\s*restrict|sign\s*in/i.test(errText)
          ) {
            ageRestricted = true;
            lastError = 'Este vídeo de YouTube tiene restricción de edad o requiere inicio de sesión en YouTube.';
            continue;
          }

          if (errCode.includes('geo_blocked') || /geo/i.test(errCode)) {
            geoBlocked = true;
            lastError = 'Este vídeo de YouTube tiene restricción geográfica en los servidores de Cobalt.';
            continue;
          }

          if (
            errCode.includes('youtube') ||
            contextService.includes('youtube') ||
            errCode.includes('bot') ||
            errCode.includes('restricted') ||
            /youtube|bot|login|restricted|sign in/i.test(errText)
          ) {
            youtubeRestricted = true;
          }

          lastError = data.text || data.error?.code || 'Error devuelto por Cobalt';
          continue;
        }

        const streams: StreamOption[] = [];

        if (data.status === 'tunnel' || data.status === 'redirect') {
          if (!data.url) {
            lastError = `Instancia ${instance} no devolvió una URL válida.`;
            continue;
          }

          // Probe that the returned tunnel URL actually yields data
          const isValidTunnel = await probeTunnelUrl(data.url, signal);
          if (!isValidTunnel) {
            youtubeRestricted = true;
            lastError = `Instancia ${instance} devolvió un tunnel vacío o no accesible.`;
            continue;
          }

          streams.push({
            id: `cobalt-video-${Date.now()}`,
            label: 'Vídeo HD (MP4 con Audio)',
            quality: '1080',
            format: 'mp4',
            type: 'video',
            url: data.url,
            hasAudio: true
          });

          // Concurrently fetch audio-only stream option from the same instance
          try {
            const audioCtrl = new AbortController();
            const audioTimeout = setTimeout(() => audioCtrl.abort(), 6000);
            const audioAbortHandler = () => audioCtrl.abort();
            if (signal) {
              signal.addEventListener('abort', audioAbortHandler, { once: true });
            }

            try {
              const audioResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  url,
                  downloadMode: 'audio',
                  audioFormat: 'mp3',
                  filenameStyle: 'basic'
                }),
                signal: audioCtrl.signal
              });
              if (audioResponse.ok) {
                const audioData = await audioResponse.json();
                if ((audioData.status === 'tunnel' || audioData.status === 'redirect') && audioData.url) {
                  const isAudioValid = await probeTunnelUrl(audioData.url, signal, 5000);
                  if (isAudioValid) {
                    streams.push({
                      id: `cobalt-audio-${Date.now()}`,
                      label: 'Solo Audio (MP3)',
                      quality: 'audio',
                      format: 'mp3',
                      type: 'audio',
                      url: audioData.url,
                      hasAudio: true
                    });
                  }
                }
              }
            } finally {
              clearTimeout(audioTimeout);
              if (signal) {
                signal.removeEventListener('abort', audioAbortHandler);
              }
            }
          } catch {
            // Audio fetch is optional; continue with primary video stream
          }
        } else if (data.status === 'picker' && Array.isArray(data.picker)) {
          data.picker.forEach((item: any, idx: number) => {
            if (!item.url) return;
            const isPhoto = item.type === 'photo';
            let format: any = 'mp4';
            if (isPhoto) {
              const urlExtMatch = item.url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
              format = urlExtMatch ? urlExtMatch[1].toLowerCase() : 'jpg';
            }
            streams.push({
              id: `cobalt-picker-${idx}`,
              label: isPhoto ? `Foto ${idx + 1}` : `Opción ${idx + 1} (${item.type || 'Media'})`,
              quality: 'best',
              format,
              type: isPhoto ? 'image' : 'video',
              url: item.url,
              hasAudio: !isPhoto
            });
          });
        }

        if (streams.length === 0) {
          lastError = `La instancia ${instance} no devolvió ningún enlace de descarga disponible o los tunnels estaban vacíos.`;
          continue;
        }

        // Try extracting host / platform name
        let platformName = 'cobalt';
        try {
          const parsed = new URL(url);
          platformName = parsed.hostname.replace(/^www\./, '');
        } catch {
          // ignore
        }

        const metadata: MediaMetadata = {
          id: `cobalt-${Date.now()}`,
          originalUrl: url,
          platform: 'cobalt',
          title: `Contenido multimedia (${platformName})`,
          streams,
          extractedVia: `Cobalt API (${instance})`
        };

        return { success: true, data: metadata };
      } catch (err: any) {
        lastError = err.message || 'Error de conexión';
      } finally {
        clearTimeout(timeout);
        if (signal) {
          signal.removeEventListener('abort', abortHandler);
        }
      }
    }

    if (videoUnavailable) {
      lastError = 'El vídeo no está disponible en YouTube (puede haber sido eliminado o el enlace es incorrecto).';
    } else if (videoPrivate) {
      lastError = 'Este vídeo de YouTube es privado y no se puede descargar.';
    } else if (ageRestricted) {
      lastError = 'Este vídeo de YouTube tiene restricción de edad o requiere inicio de sesión en YouTube.';
    } else if (geoBlocked) {
      lastError = 'Este vídeo de YouTube tiene restricción geográfica en los servidores de Cobalt.';
    } else if (isYouTube || youtubeRestricted) {
      lastError = 'No fue posible descargar el vídeo debido a restricciones de YouTube en las instancias de Cobalt. Por favor, intenta de nuevo más tarde o configura una instancia alternativa en Ajustes.';
    }

    return { success: false, error: lastError };
  }
};
