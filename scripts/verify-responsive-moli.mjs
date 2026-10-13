// Script to verify responsive layout metrics and overflow via Moli CDP
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import http from 'node:http';

const wsUrl = 'ws://127.0.0.1:9222/devtools/page/moli-default';

function checkHttp(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    }).on('error', () => {
      resolve(false);
    });
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let spawnedMoli = null;

async function ensureMoliServer() {
  const isUp = await checkHttp('http://127.0.0.1:9222/json/version');
  if (isUp) {
    console.log('Moli CDP server is already running on port 9222.');
    return;
  }

  console.log('Starting moli serve --layout on port 9222...');
  spawnedMoli = spawn('moli', ['serve', '--layout'], { stdio: 'ignore' });
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    if (await checkHttp('http://127.0.0.1:9222/json/version')) {
      console.log('Moli CDP server is now ready.');
      return;
    }
  }
  throw new Error('Timed out waiting for Moli CDP server to start on port 9222.');
}

async function run() {
  await ensureMoliServer();

  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pending = new Map();

  function send(method, params = {}) {
    const id = idCounter++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    } catch (e) {
      // ignore parse error
    }
  });

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  // Enable Page & Runtime
  await send('Page.enable');
  await send('Runtime.enable');

  // Navigate to local dev app
  const appPort = (await checkHttp('http://localhost:5177')) ? 5177 : 5173;
  console.log(`Navigating to http://localhost:${appPort}...`);
  await send('Page.navigate', { url: `http://localhost:${appPort}` });
  await sleep(2000);

  const viewports = [
    { name: 'Narrow Mobile (360px)', width: 360, height: 800 },
    { name: 'iPhone SE (375px)', width: 375, height: 667 },
    { name: 'iPhone 14 (390px)', width: 390, height: 844 },
    { name: 'Pixel 7 (412px)', width: 412, height: 915 },
    { name: 'Max Target Mobile (442px)', width: 442, height: 900 }
  ];

  let allPassed = true;

  for (const vp of viewports) {
    console.log(`\n--- Testing ${vp.name} (${vp.width}x${vp.height}) ---`);

    // Override viewport
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: false
    });

    await sleep(600);

    // Check scrollWidth and innerWidth
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const docClientWidth = document.documentElement.clientWidth;
          const winInnerWidth = window.innerWidth;
          const bodyScrollWidth = document.body.scrollWidth;
          const header = document.querySelector('header');
          const headerScrollWidth = header ? header.scrollWidth : 0;
          const headerClientWidth = header ? header.clientWidth : 0;
          const input = document.querySelector('input[type="url"]');
          const inputWidth = input ? input.getBoundingClientRect().width : 0;
          const hasOverflow = docScrollWidth > winInnerWidth || bodyScrollWidth > winInnerWidth;

          return {
            winInnerWidth,
            docScrollWidth,
            docClientWidth,
            bodyScrollWidth,
            headerScrollWidth,
            headerClientWidth,
            inputWidth,
            hasOverflow
          };
        })()
      `,
      returnByValue: true
    });

    const metrics = evalRes.result.value;
    console.log('Metrics:', metrics);

    if (metrics.hasOverflow) {
      console.error(`FAIL: Horizontal overflow detected on ${vp.name}! scrollWidth (${metrics.docScrollWidth}) > innerWidth (${metrics.winInnerWidth})`);
      allPassed = false;
    } else {
      console.log(`PASS: No horizontal overflow (scrollWidth: ${metrics.docScrollWidth} <= innerWidth: ${metrics.winInnerWidth})`);
    }

    if (metrics.inputWidth < 90) {
      console.warn(`WARN: Input width is quite small: ${metrics.inputWidth}px`);
    } else {
      console.log(`PASS: Input field has healthy width: ${metrics.inputWidth.toFixed(1)}px (well above 81px squished threshold)`);
    }
  }

  // Also test URL input badges collapsing on mobile
  console.log('\n--- Testing URL Input Badge on Mobile ---');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input[type="url"]');
        if (input) {
          input.value = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `
  });

  await sleep(500);

  const badgeRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const hiddenText = document.querySelector('header ~ main span.hidden.sm\\\\:inline');
        const badge = document.querySelector('svg.lucide-youtube');
        return {
          hasYoutubeIcon: Boolean(badge),
          hasHiddenTextSpan: Boolean(hiddenText)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Badge check on mobile:', badgeRes.result.value);

  // Test desktop viewport (1024px)
  console.log('\n--- Testing Desktop Viewport (1024x768) ---');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1024,
    height: 768,
    deviceScaleFactor: 1,
    mobile: false
  });
  await sleep(400);

  const desktopRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const headerVersion = document.querySelector('header span.hidden.sm\\\\:inline-block');
        return {
          hasHeaderVersionBadge: Boolean(headerVersion)
        };
      })()
    `,
    returnByValue: true
  });
  console.log('Desktop checks:', desktopRes.result.value);

  ws.close();

  if (spawnedMoli) {
    spawnedMoli.kill('SIGTERM');
  }

  if (!allPassed) {
    console.error('\nOne or more responsive checks failed!');
    process.exit(1);
  } else {
    console.log('\nAll Moli CDP responsive verification checks passed successfully!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Verification error:', err);
  if (spawnedMoli) {
    spawnedMoli.kill('SIGTERM');
  }
  process.exit(1);
});
