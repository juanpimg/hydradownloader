import { Extractor, ExtractionResult, MediaMetadata, StreamOption } from './types';

export const DEFAULT_COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt-api.kwiatekm.pl',
  'https://cobalt.hyonsu.com/api',
  'https://api.cobalt.lol'
];

export function getCustomCobaltInstance(): string {
  try {
    return localStorage.getItem('hydra_cobalt_instance') || DEFAULT_COBALT_INSTANCES[0];
  } catch {
    return DEFAULT_COBALT_INSTANCES[0];
  }
}

export function setCustomCobaltInstance(instanceUrl: string): void {
  try {
    localStorage.setItem('hydra_cobalt_instance', instanceUrl.trim().replace(/\/$/, ''));
  } catch {
    // ignore
  }
}

export const cobaltExtractor: Extractor = {
  name: 'Cobalt Universal Fallback',

  canHandle(_url: string): boolean {
    // Can handle any web URL as fallback
    return true;
  },

  async extract(url: string, signal?: AbortSignal): Promise<ExtractionResult> {
    const activeInstance = getCustomCobaltInstance();
    const candidateInstances = [
      activeInstance,
      ...DEFAULT_COBALT_INSTANCES.filter((i) => i !== activeInstance)
    ];

    let lastError = 'No se pudo conectar a ninguna instancia de Cobalt.';

    for (const instance of candidateInstances) {
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
          signal
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          lastError = `Instancia ${instance} respondió con error ${response.status}: ${text}`;
          continue;
        }

        const data = await response.json();

        if (data.status === 'error') {
          lastError = data.text || data.error?.code || 'Error devuelto por Cobalt';
          continue;
        }

        const streams: StreamOption[] = [];

        if (data.status === 'tunnel' || data.status === 'redirect') {
          streams.push({
            id: `cobalt-primary-${Date.now()}`,
            label: 'Descarga Directa (Mejor Calidad)',
            quality: 'best',
            format: 'mp4',
            type: 'video',
            url: data.url,
            hasAudio: true
          });
        } else if (data.status === 'picker' && Array.isArray(data.picker)) {
          data.picker.forEach((item: any, idx: number) => {
            streams.push({
              id: `cobalt-picker-${idx}`,
              label: item.type === 'photo' ? `Foto ${idx + 1}` : `Opción ${idx + 1} (${item.type || 'Media'})`,
              quality: 'best',
              format: item.type === 'photo' ? 'unknown' : 'mp4',
              type: item.type === 'photo' ? 'image' : 'video',
              url: item.url,
              hasAudio: true
            });
          });
        }

        if (streams.length === 0) {
          lastError = 'Cobalt no devolvió ningún enlace de descarga disponible.';
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

    return { success: false, error: lastError };
  }
};
