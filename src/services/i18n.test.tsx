import { describe, it, expect, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { t, setLocale, getLocale, resolveLocale } from './i18n';
import { PreviewCard } from '../components/PreviewCard';
import type { MediaMetadata } from './extractors/types';

afterEach(() => {
  setLocale('en');
});

describe('i18n dictionary', () => {
  it('defaults to English', () => {
    expect(getLocale()).toBe('en');
    expect(t('download')).toBe('Download');
  });

  it('translates UI strings to Spanish', () => {
    setLocale('es');
    expect(t('download')).toBe('Descargar');
    expect(t('hist_title')).toBe('Historial de Descargas');
    expect(t('dm_completed')).toBe('Completado');
    expect(t('ex_badurl')).toBe('Por favor, introduce una URL válida.');
  });

  it('interpolates variables in both locales', () => {
    expect(t('hist_sub', { n: 3 })).toBe('3 items stored locally');
    setLocale('es');
    expect(t('hist_sub', { n: 3 })).toBe('3 elementos guardados localmente');
  });
});

describe('resolveLocale', () => {
  it('honours an explicit preference', () => {
    expect(resolveLocale('en', 'es-ES')).toBe('en');
    expect(resolveLocale('es', 'en-US')).toBe('es');
  });

  it('auto-detects Spanish browsers, defaults to English otherwise', () => {
    expect(resolveLocale('system', 'es-ES')).toBe('es');
    expect(resolveLocale('system', 'es-MX')).toBe('es');
    expect(resolveLocale('system', 'en-US')).toBe('en');
    expect(resolveLocale('system', 'fr-FR')).toBe('en');
  });
});

describe('i18n component wiring', () => {
  const media: MediaMetadata = {
    id: 'i18n-1',
    originalUrl: 'https://example.com/audio.mp3',
    platform: 'direct',
    title: 'Song',
    streams: [
      {
        id: 'a1',
        label: 'Audio MP3',
        quality: 'audio',
        format: 'mp3',
        type: 'audio',
        url: 'https://example.com/audio.mp3',
        hasAudio: true
      }
    ],
    extractedVia: 'x'
  };

  it('renders PreviewCard in Spanish when locale is es', () => {
    setLocale('es');
    const html = renderToString(
      <PreviewCard media={media} preferredMode="video" onDownload={() => {}} isDownloading={false} />
    );
    expect(html).toContain('Descargar Audio');
    expect(html).not.toContain('Download Audio');
  });

  it('renders PreviewCard in English when locale is en', () => {
    setLocale('en');
    const html = renderToString(
      <PreviewCard media={media} preferredMode="video" onDownload={() => {}} isDownloading={false} />
    );
    expect(html).toContain('Download Audio');
  });
});
