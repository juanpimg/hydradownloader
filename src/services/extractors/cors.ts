// Service to handle CORS bypass in the browser using public and custom CORS proxies

export const DEFAULT_CORS_PROXIES = [
  { id: 'direct', name: 'Direct (No Proxy)', template: '{url}' },
  { id: 'corsproxy', name: 'corsproxy.io', template: 'https://corsproxy.io/?url={url}' },
  { id: 'allorigins', name: 'api.allorigins.win', template: 'https://api.allorigins.win/raw?url={url}' }
];

export function getCustomCorsProxy(): string {
  try {
    return localStorage.getItem('hydra_cors_proxy') || '';
  } catch {
    return '';
  }
}

export function setCustomCorsProxy(proxyUrl: string): void {
  try {
    localStorage.setItem('hydra_cors_proxy', proxyUrl.trim());
  } catch {
    // ignore
  }
}

export function wrapWithProxy(targetUrl: string, proxyId = 'corsproxy'): string {
  const custom = getCustomCorsProxy();
  if (custom) {
    if (custom.includes('{url}')) {
      return custom.replace('{url}', encodeURIComponent(targetUrl));
    }
    return `${custom.replace(/\/$/, '')}/${targetUrl}`;
  }

  const selected = DEFAULT_CORS_PROXIES.find((p) => p.id === proxyId) || DEFAULT_CORS_PROXIES[1];
  if (selected.id === 'direct') return targetUrl;
  return selected.template.replace('{url}', encodeURIComponent(targetUrl));
}

export async function fetchWithCorsFallback(
  targetUrl: string,
  options?: RequestInit,
  tryDirectFirst = true
): Promise<Response> {
  const strategies: string[] = [];

  const custom = getCustomCorsProxy();
  if (custom) {
    strategies.push('custom');
  }

  if (tryDirectFirst) {
    strategies.push('direct');
  }

  strategies.push('corsproxy', 'allorigins');

  let lastError: Error | null = null;

  for (const strategy of strategies) {
    try {
      let finalUrl = targetUrl;
      if (strategy === 'custom') {
        finalUrl = custom.includes('{url}')
          ? custom.replace('{url}', encodeURIComponent(targetUrl))
          : `${custom.replace(/\/$/, '')}/${targetUrl}`;
      } else if (strategy !== 'direct') {
        finalUrl = wrapWithProxy(targetUrl, strategy);
      }

      const res = await fetch(finalUrl, options);
      if (res.ok) {
        return res;
      }
    } catch (err: any) {
      lastError = err;
      // Continue to next fallback strategy
    }
  }

  throw lastError || new Error(`No se pudo obtener el recurso mediante proxies CORS: ${targetUrl}`);
}
