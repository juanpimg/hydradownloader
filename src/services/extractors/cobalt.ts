import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';
import { getSettings, saveSettings } from '../storage';

export const DEFAULT_COBALT_INSTANCES = [
  'https://rue-cobalt.xenon.zone',
  'https://cobaltapi.cjs.nz'
];

export function getCustomCobaltInstance(): string {
  try {
    const settings = getSettings();
    const custom = settings.cobaltInstance;
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
    saveSettings({ cobaltInstance: instanceUrl.trim().replace(/\/$/, '') });
  } catch {
    // ignore
  }
}

/**
 * Validates or probes that a returned tunnel URL actually yields data.
 * Checks HTTP status and headers (rejects content-length or estimated-content-length <= 0, including -1).
 */
export async function probeTunnelUrl(url: string, signal?: AbortSignal, timeoutMs = 4500): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    let res: Response | null = null;
    let isFromHead = false;
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

    if (!res) {
      // If HEAD was rejected (e.g. 405 Method Not Allowed) or failed, probe with Range GET
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
              clearTimeout(timeout);
              return false;
            }
          } catch {
            clearTimeout(timeout);
            return false;
          }
        } else if (typeof (res.body as any).cancel === 'function') {
          res.body.cancel().catch(() => {});
        }
      }
    }

    clearTimeout(timeout);

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

    // If HEAD succeeded but had neither content-length nor estimated-content-length,
    // verify with Range GET to ensure it's not a dummy 0-byte stream
    if (isFromHead && res.ok && cl === null && ecl === null) {
      try {
        const getRes = await fetch(url, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          signal: controller.signal
        });
        if (!getRes.ok && getRes.status !== 206) {
          return false;
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
        }
      } catch {
        return false;
      }
    }

    return true;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

export const cobaltExtractor: Extractor = {
  name: 'Cobalt Universal Fallback',

  canHandle(_url: string): boolean {
    // Can handle any web URL as fallback
    return true;
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
    const activeInstance = getCustomCobaltInstance()?.trim().replace(/\/$/, '');
    const candidateInstances: string[] = [];
    if (activeInstance) {
      candidateInstances.push(activeInstance);
    }
    for (const inst of DEFAULT_COBALT_INSTANCES) {
      const normalized = inst.trim().replace(/\/$/, '');
      if (!candidateInstances.includes(normalized)) {
        candidateInstances.push(normalized);
      }
    }

    let lastError = 'No se pudo conectar a ninguna instancia de Cobalt.';
    let youtubeRestricted = false;

    for (const instance of candidateInstances) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
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

        clearTimeout(timeout);

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
          if (
            errCode.includes('youtube') ||
            errCode.includes('login') ||
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
              signal
            });
            if (audioResponse.ok) {
              const audioData = await audioResponse.json();
              if ((audioData.status === 'tunnel' || audioData.status === 'redirect') && audioData.url) {
                const isAudioValid = await probeTunnelUrl(audioData.url, signal);
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
      }
    }

    if (isYouTube || youtubeRestricted) {
      lastError = 'No fue posible descargar el vídeo debido a restricciones de YouTube en las instancias de Cobalt. Por favor, intenta de nuevo más tarde o configura una instancia alternativa en Ajustes.';
    }

    return { success: false, error: lastError };
  }
};
