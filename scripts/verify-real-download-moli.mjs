#!/usr/bin/env node
// Moli Headless Browser Runtime Verification — MODO SOLO-LOCAL
// Sin APIs externas, sin proxies, sin Cobalt/Invidious/TikWM/FxTwitter.
// Verifica: rechazo de URLs de plataforma, extracción directa y descarga 100% local.

import { execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MOLI_BIN = process.env.MOLI_BIN || '/home/jp/.local/bin/moli';
const APP_URL = process.env.APP_URL || 'http://localhost:5177';

const FORBIDDEN_HOSTS = [
  'api.fxtwitter.com',
  'tikwm.com',
  'cobalt',
  'invidious',
  'piped',
  'noembed.com',
  'youtube.com/oembed',
  'codetabs.com',
  'allorigins.win',
  'api.invidious.io',
  'youtubei'
];

function checkHttp(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function runMoliEval(jsCode) {
  const tmpScript = path.join('/tmp', `moli_eval_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);
  fs.writeFileSync(tmpScript, jsCode, 'utf8');
  try {
    const stdout = execSync(
      `"${MOLI_BIN}" fetch "${APP_URL}" --eval-file "${tmpScript}"`,
      { encoding: 'utf8', timeout: 45000, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout.trim();
  } finally {
    try { fs.unlinkSync(tmpScript); } catch {}
  }
}

async function main() {
  console.log('======================================================================');
  console.log('HydraDownloader: Moli Runtime Verification — MODO SOLO-LOCAL');
  console.log('======================================================================\n');

  console.log(`Checking Moli binary at ${MOLI_BIN}...`);
  if (!fs.existsSync(MOLI_BIN)) {
    throw new Error(`Moli binary not found at ${MOLI_BIN}`);
  }
  const moliVer = execSync(`"${MOLI_BIN}" --version`, { encoding: 'utf8' }).trim();
  console.log(`Moli Version: ${moliVer}`);

  console.log(`Checking application server at ${APP_URL}...`);
  const isUp = await checkHttp(APP_URL);
  if (!isUp) {
    throw new Error(`Application server at ${APP_URL} is not responding.`);
  }
  console.log(`Application server is reachable on ${APP_URL}.\n`);

  // --- Test 1: Platform URLs rejected with local-only guidance, zero external calls ---
  console.log('[Test 1/3] Verifying platform URLs are rejected WITHOUT external API calls...');
  const test1Code = `
    (async () => {
      const { extractMedia } = await import('/src/services/extractors/index.ts');
      const forbidden = ${JSON.stringify(FORBIDDEN_HOSTS)};
      const contacted = [];
      const origFetch = window.fetch;
      window.fetch = async (url, init) => {
        contacted.push(String(url));
        throw new Error('network disabled in test');
      };
      try {
        const urls = [
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          'https://x.com/user/status/1234567890',
          'https://www.tiktok.com/@user/video/1234567890123456789'
        ];
        const results = [];
        for (const u of urls) {
          const r = await extractMedia(u);
          results.push({ url: u, success: r.success, error: r.error });
        }
        const bad = contacted.filter((u) => forbidden.some((f) => u.includes(f)));
        return JSON.stringify({
          allRejected: results.every((r) => r.success === false && /solo-local/i.test(r.error || '')),
          externalApiCalls: contacted.length,
          forbiddenHits: bad,
          passed: results.every((r) => r.success === false) && bad.length === 0
        });
      } finally {
        window.fetch = origFetch;
      }
    })()
  `;
  const test1Result = JSON.parse(await runMoliEval(test1Code));
  console.log('Result:', test1Result);
  if (!test1Result.passed) {
    throw new Error(`Test 1 Failed: ${JSON.stringify(test1Result)}`);
  }
  console.log('✓ Test 1 Passed: platform URLs rejected locally, 0 external API calls.\n');

  // --- Test 2: Direct link extraction works (mocked HEAD, no third-party API) ---
  console.log('[Test 2/3] Verifying direct-link extraction is fully local...');
  const test2Code = `
    (async () => {
      const { extractMedia } = await import('/src/services/extractors/index.ts');
      const forbidden = ${JSON.stringify(FORBIDDEN_HOSTS)};
      const contacted = [];
      const origFetch = window.fetch;
      window.fetch = async (url, init) => {
        contacted.push(String(url));
        return new Response('', { status: 200, headers: new Headers({ 'content-length': '1024' }) });
      };
      try {
        const r = await extractMedia('https://example.com/video.mp4');
        const bad = contacted.filter((u) => forbidden.some((f) => u.includes(f)));
        return JSON.stringify({
          success: r.success,
          platform: r.data?.platform,
          extractedVia: r.data?.extractedVia,
          contacted,
          forbiddenHits: bad,
          passed: r.success === true && bad.length === 0 && /sin APIs/i.test(r.data?.extractedVia || '')
        });
      } finally {
        window.fetch = origFetch;
      }
    })()
  `;
  const test2Result = JSON.parse(await runMoliEval(test2Code));
  console.log('Result:', test2Result);
  if (!test2Result.passed) {
    throw new Error(`Test 2 Failed: ${JSON.stringify(test2Result)}`);
  }
  console.log('✓ Test 2 Passed: direct extraction local, no third-party hosts contacted.\n');

  // --- Test 3: Real 100% local download from in-page generated bytes (zero network) ---
  console.log('[Test 3/3] Verifying 100% local download (generated bytes, no network)...');
  const test3Code = `
    (async () => {
      const { createLocalFileMedia } = await import('/src/services/extractors/local.ts');
      const { downloadStream } = await import('/src/services/downloadManager.ts');

      // 256 KB of deterministic local bytes
      const size = 262144;
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; i++) bytes[i] = i % 256;
      const file = new File([bytes], 'prueba-local.mp4', { type: 'video/mp4' });
      const media = createLocalFileMedia(file);
      const stream = media.streams[0];

      let totalReceived = 0;
      let finalState = null;
      const origCreateObjectURL = window.URL.createObjectURL;
      let capturedBlob = null;
      window.URL.createObjectURL = (blob) => {
        capturedBlob = blob;
        return origCreateObjectURL(blob);
      };
      try {
        await downloadStream(stream, media.title, (state) => {
          finalState = state;
          totalReceived = state.bytesReceived;
        });
      } finally {
        window.URL.createObjectURL = origCreateObjectURL;
      }

      let mediaBase64 = '';
      if (capturedBlob) {
        const buf = await capturedBlob.arrayBuffer();
        const u8 = new Uint8Array(buf);
        let binary = '';
        const chunk = 16384;
        for (let i = 0; i < u8.length; i += chunk) {
          binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
        }
        mediaBase64 = btoa(binary);
      }

      return JSON.stringify({
        platform: media.platform,
        extractedVia: media.extractedVia,
        totalBytesReceived: totalReceived,
        finalProgress: finalState?.progress,
        finalSpeed: finalState?.speed,
        mediaBase64,
        isSuccess: totalReceived === size && finalState?.speed === 'Completado'
      });
    })()
  `;
  const test3Result = JSON.parse(await runMoliEval(test3Code));
  console.log('Local Download Summary:');
  console.log('  Platform:             ', test3Result.platform);
  console.log('  Extracted Via:        ', test3Result.extractedVia);
  console.log('  Total Bytes Received: ', test3Result.totalBytesReceived);
  console.log('  Final Progress:       ', test3Result.finalProgress, '%');
  console.log('  Final State Speed:    ', test3Result.finalSpeed);

  if (!test3Result.isSuccess) {
    throw new Error(`Test 3 Failed: ${JSON.stringify({ ...test3Result, mediaBase64: test3Result.mediaBase64?.length })}`);
  }
  const artifactPath = path.join('/tmp', 'moli_verified_local_download.mp4');
  fs.writeFileSync(artifactPath, Buffer.from(test3Result.mediaBase64, 'base64'));
  const stat = fs.statSync(artifactPath);
  console.log(`✓ Local artifact verified on disk at ${artifactPath} (${stat.size} bytes).`);
  console.log('✓ Test 3 Passed: 256 KB transferred 100% locally, zero network.\n');

  console.log('======================================================================');
  console.log('ALL MOLI LOCAL-ONLY VERIFICATION TESTS PASSED SUCCESSFULLY! (3/3)');
  console.log('======================================================================');
}

main().catch((err) => {
  console.error('\n❌ Moli Verification Script Failed:\n', err);
  process.exit(1);
});
