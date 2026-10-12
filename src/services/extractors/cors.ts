// Service to handle CORS bypass in the browser using public and custom CORS proxies
import { getSettings, saveSettings } from '../storage';

export const DEFAULT_CORS_PROXIES = [
  { id: 'direct', name: 'Directo (Sin Proxy - CORS Nativo)', template: '{url}' },
  { id: 'codetabs', name: 'CodeTabs Proxy (Open Gateway)', template: 'https://api.codetabs.com/v1/proxy?quest={url}' },
  { id: 'allorigins', name: 'AllOrigins Gateway', template: 'https://api.allorigins.win/raw?url={url}' }
];

export function getCustomCorsProxy(): string {
  try {
    const settings = getSettings();
    return settings.customCorsProxy || '';
  } catch {
    return '';
  }
}

export function setCustomCorsProxy(proxyUrl: string): void {
  try {
    saveSettings({ customCorsProxy: proxyUrl.trim() });
  } catch {
    // ignore
  }
}

export function wrapWithProxy(targetUrl: string, proxyId = 'codetabs'): string {
  const custom = getCustomCorsProxy();
  if (custom) {
    if (custom.includes('{url}')) {
      return custom.replace('{url}', encodeURIComponent(targetUrl));
    }
    return `${custom.replace(/\/$/, '')}/${encodeURIComponent(targetUrl)}`;
  }

  const selected = DEFAULT_CORS_PROXIES.find((p) => p.id === proxyId) || DEFAULT_CORS_PROXIES[1];
  if (selected.id === 'direct') return targetUrl;
  return selected.template.replace('{url}', encodeURIComponent(targetUrl));
}

export async function fetchWithCorsFallback(
  targetUrl: string,
  options?: RequestInit,
  tryDirectFirst = true,
  timeoutMs = 4500
): Promise<Response> {
  const strategies: string[] = [];

  const custom = getCustomCorsProxy();
  if (custom) {
    strategies.push('custom');
  }

  if (tryDirectFirst) {
    strategies.push('direct');
  }

  strategies.push('codetabs', 'allorigins');

  let lastError: Error | null = null;

  for (const strategy of strategies) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Merge signals if an external signal was passed
    if (options?.signal) {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      let finalUrl = targetUrl;
      if (strategy === 'custom') {
        finalUrl = custom.includes('{url}')
          ? custom.replace('{url}', encodeURIComponent(targetUrl))
          : `${custom.replace(/\/$/, '')}/${encodeURIComponent(targetUrl)}`;
      } else if (strategy !== 'direct') {
        finalUrl = wrapWithProxy(targetUrl, strategy);
      }

      const res = await fetch(finalUrl, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return res;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      // Continue to next fallback strategy
    }
  }

  throw lastError || new Error(`No se pudo obtener el recurso mediante proxies CORS: ${targetUrl}`);
}
