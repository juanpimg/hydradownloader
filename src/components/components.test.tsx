import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PreviewCard } from './PreviewCard';
import { Header } from './Header';
import { UrlInput } from './UrlInput';
import { MediaMetadata } from '../services/extractors/types';

describe('Responsive and Audio Detection Component Tests', () => {
  it('PreviewCard correctly identifies audio-only media and sets button to Descargar Audio', () => {
    const audioOnlyMedia: MediaMetadata = {
      id: 'test-audio-1',
      originalUrl: 'https://example.com/audio.mp3',
      platform: 'direct',
      title: 'Soundtrack Episode 1',
      streams: [
        {
          id: 'audio-1',
          label: 'Audio MP3',
          quality: '320kbps',
          format: 'mp3',
          type: 'audio',
          url: 'https://example.com/audio.mp3',
          hasAudio: true
        }
      ],
      extractedVia: 'Direct Link'
    };

    const html = renderToString(
      <PreviewCard
        media={audioOnlyMedia}
        preferredMode="video"
        onDownload={() => {}}
        isDownloading={false}
      />
    );

    // Must have "Descargar Audio"
    expect(html).toContain('Descargar Audio');
    // Must NOT have "Descargar Vídeo"
    expect(html).not.toContain('Descargar Vídeo');
    // Must display format
    expect(html).toContain('mp3');
  });

  it('PreviewCard displays mode selector when both video and audio streams exist', () => {
    const mixedMedia: MediaMetadata = {
      id: 'test-mixed-1',
      originalUrl: 'https://example.com/video.mp4',
      platform: 'direct',
      title: 'Awesome Video',
      streams: [
        {
          id: 'vid-1',
          label: '1080p HD',
          quality: '1080',
          format: 'mp4',
          type: 'video',
          url: 'https://example.com/video.mp4',
          hasAudio: true
        },
        {
          id: 'aud-1',
          label: 'Audio MP3',
          quality: '320',
          format: 'mp3',
          type: 'audio',
          url: 'https://example.com/audio.mp3',
          hasAudio: true
        }
      ],
      extractedVia: 'Enlace Directo Local (sin APIs)'
    };

    const html = renderToString(
      <PreviewCard
        media={mixedMedia}
        preferredMode="video"
        onDownload={() => {}}
        isDownloading={false}
      />
    );

    expect(html).toContain('Vídeo');
    expect(html).toContain('Solo Audio');
    expect(html).toContain('Descargar Vídeo');
  });

  it('Header hides v1.0 badge on mobile and renders compact elements', () => {
    const html = renderToString(
      <Header
        theme="dark"
        onToggleTheme={() => {}}
        onOpenSettings={() => {}}
        onOpenHistory={() => {}}
        historyCount={2}
      />
    );

    expect(html).toContain('HydraDownloader');
    // v1.0 badge has hidden sm:inline-block
    expect(html).toContain('hidden sm:inline-block');
  });

  it('UrlInput collapses platform badges to icons only on mobile', () => {
    const html = renderToString(
      <UrlInput
        url="https://example.com/video.mp4"
        onChange={() => {}}
        onSubmit={() => {}}
        isLoading={false}
        onClear={() => {}}
      />
    );

    // Platform badge text is hidden on mobile
    expect(html).toContain('hidden sm:inline');
  });
});
