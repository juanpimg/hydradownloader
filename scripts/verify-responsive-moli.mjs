// Script to verify responsive layout metrics and overflow via Moli CDP
const wsUrl = 'ws://127.0.0.1:9222/devtools/page/moli-default';

async function run() {
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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };

  await new Promise((res) => (ws.onopen = res));

  // Enable Page & Runtime
  await send('Page.enable');
  await send('Runtime.enable');

  // Navigate to local dev app
  console.log('Navigating to http://localhost:5177...');
  await send('Page.navigate', { url: 'http://localhost:5177' });
  await new Promise((r) => setTimeout(r, 2000));

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

    await new Promise((r) => setTimeout(r, 600));

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

  await new Promise((r) => setTimeout(r, 500));

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

  ws.close();

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
  process.exit(1);
});
