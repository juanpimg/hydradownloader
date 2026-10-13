# HydraDownloader — Research: 100% local downloads in the browser

> **Status (Oct-14-2026): paused.** There is no proven solution for
> downloading YouTube/TikTok/X in a pure web page with no server, proxy or
> extension. This document records what was researched, tested and left open,
> **to ask for help**: if you find a way, open an issue or PR.

## 1. Goal

Download video/audio from any platform running code **100% in the user's
browser**: zero in-house backend, zero third-party APIs (FxTwitter, TikWM,
Cobalt, Invidious/Piped), zero CORS proxies. Just the webapp + the browser.

What would set us apart if achieved: total privacy and zero infrastructure
cost.

## 2. What the app does today (local-only mode, verified)

- **Direct links** (`.mp4`, `.webm`, `.mp3`, `.m4a`, `.wav`…): local `HEAD`
  + ranged downloads with resume. Works, `36/36` tests green.
- **Local files** (`src/services/extractors/local.ts`): `File` →
  `blob:` URL, zero network. Works, verified in Moli (256 KB, 100% local).
- **Platform URLs** (YouTube, X, TikTok…): rejected with a
  `Local-only mode…` message. A conscious decision, not a bug.

## 3. Why the pure page cannot do it (root barrier)

There are **two networks** in every engine (Blink, Gecko, WebKit):

- **A) JS `fetch()`**: requires CORS. Without the server's
  `Access-Control-Allow-Origin`, the body never reaches the renderer.
- **B) `<video src>`**: the media stack downloads and decodes straight to
  the GPU without going through JS. It plays without CORS but exposes no
  bytes.

`<video>` paints via B while A receives an empty opaque response. Playing ≠
reading bytes. The exact point is the Network-Service → Renderer boundary
(Chromium: `services/network/orb/orb_filter.cc`, before `URLLoaderClient`).

## 4. Experiments run (evidence, not theory)

Environment: webapp at `http://localhost:5177`, headless Moli `1.1.16`,
`Me at the zoo` (`jNQXAC9IVRw`).

| # | Test | Result |
|---|------|--------|
| E1 | Positive control: `fetch` an MP4 with `ACAO:*` (MDN `flower.mp4`) | ✅ 1,128,375 B, `ftyp` magic. The barrier is YouTube, not the browser |
| E2 | **Real, valid, same-IP, unexpired** `googlevideo` URL (resolved server-side via the ANDROID client, `curl` → `200 video/mp4` 629,172 B, no `ACAO`) | ❌ `fetch cors` → `CORS check failed: no Access-Control-Allow-Origin`; `no-cors` → `opaque status:0`; `Range` → same CORS failure. **0 readable bytes** |
| E3 | `POST youtubei/v1/player` | ❌ From the page: `CORS preflight 403`. From a server: `ANDROID=OK`, `WEB=UNPLAYABLE`, `TV=LOGIN_REQUIRED` (bot wall) |
| S1 | `<video src=embed>`, iframe, canvas, MSE | ❌ Black / SOP `SecurityError` / tainted canvas. Only metadata (`oembed` 745 B) and thumbnail (15,921 B JPEG) readable |

**Confirmed global falsifier**: valid URL + correct IP + unexpired + fetch in
all 3 modes = 0 bytes. Scripts in `scripts/verify-real-download-moli.mjs`
(local-only mode, 3/3 green) and evidence under `/tmp` of the test
environment.

## 5. 2026 context (getting harder, not easier)

- **SABR** migration: no more direct links, a single endpoint with multiplexed
  UMP (`application/vnd.yt-ump`), no byte ranges, video-bound `poToken` +
  `n-param` requiring `base.js` deciphering.
- Even the `ANDROID_VR` bypass is going erratic
  ([yt-dlp#16150](https://github.com/yt-dlp/yt-dlp/issues/16150)).
- `yt-dlp#9820` (maintainer `seproDev`): *"No point in compiling to wasm due
  to CORS"*. It only ran on Pyodide with CORS disabled, no ffmpeg, no
  threads.
- LuanRT's SABR web demo (`kira`) warns: *"you'll need a proxy"*; its Shaka
  demo requires a `proxy server`. Invidious's `/videoplayback` proxy literally
  adds `Access-Control-Allow-Origin: "*"`: someone has to send it.

## 6. Evaluated paths (decision table)

| Path | Verdict |
|------|---------|
| Direct `fetch` to `googlevideo`/`youtubei` | Blocked (CORS, proven E2/E3) |
| `no-cors` / SW + opaque cache / COOP-COEP / MSE / canvas / `<a download>` / IFrame API / in-page SABR | Blocked (plays, never reads) |
| yt-dlp on Pyodide/WASM in-page | Blocked (CORS + ~30 MB ffmpeg.wasm + no threads) |
| Pure JS (`youtubei.js`, `ytdl-core` forks) | Blocked without proxy (need externally generated `poToken`/OAuth) |
| Pure bookmarklet on `youtube.com` | Partial (URLs/metadata yes, bytes no: `youtube→googlevideo` is also cross-origin) |
| `localhost` helper + Private Network Access | Works, but no longer "browser-only" |
| **MV3 extension** (`avi12`/`dlpro` pattern) | **Works (third-party proven)**: content script on `youtube.com` + `host_permissions` + local WASM mux |
| Native app / Electron / Tauri + yt-dlp binary | Works (Stacher/Seal pattern) |

Extension coverage (verified Oct-2026): full PC + Firefox Android (catalog
open since F119) + Safari (Xcode + Developer + review) + Chromium forks on
Android (Quetta/Lemur/Vivaldi). Gap: official Chrome on Android and non-Safari
iOS.

## 7. How to help (what we are looking for)

1. **A pure-page proof of concept** that, given a `watch?v=…`, returns ≥1
   readable stream byte from JS (with `ftyp`/`1A45DFA3` and logged headers).
   No proxy, no extension, Moli-reproducible.
2. **A documented refutation** of any row in the table (§6) with spec or code
   that contradicts it.
3. **Local-only improvements**: better local remux (MediaBunny/WebCodecs),
   tab capture with audio, local-picker UX.

Please: no "use a proxy / my API / my backend". We already had that
(Cobalt/Invidious) and removed it on purpose (see git history).

## 8. Pending R&D plan (if anyone picks it up)

See the full E1–E8 portfolio in the project's discussion history. Stage-gate
rule: stay on the pure-web path **only if** E1=PASS and (E2 or E3=PASS with a
CORS-readable URL). Today: E1=PASS, E2=FAIL, E3=FAIL → **pivot to extension or
bridge**, pure web closed until refuted.

## 9. References

- `yt-dlp/yt-dlp#9820` (WASM/CORS), `yt-dlp#16150` (ANDROID_VR/SABR)
- LuanRT `googlevideo` / `kira` / `yt-sabr-shaka-demo`, `avi12/youtube-downloader`, `machineonamission/dlpro`
- MDN CORS / Fetch Standard § CORS protocol / ORB / CORP-COEP-COOP
- Invidious `routes/video_playback.cr` (`ACAO: "*"`)
