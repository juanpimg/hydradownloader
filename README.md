# HydraDownloader 📥

[![Local-Only](https://img.shields.io/badge/Architecture-100%25%20Local-emerald)](#)
[![Privacy](https://img.shields.io/badge/Privacy-Zero%20Data%20Collected-blue)](#)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

> 100% local in-browser downloader: direct links and files from your device, **no external APIs, no proxies, no backend**. Part of the **HydraApps** suite.

What sets us apart: **zero third-party API calls**. Everything happens in your browser.

> 🔬 **Open challenge: 100% local YouTube.** Platform URLs are currently
> rejected (the browser blocks cross-origin reads without `ACAO`, proven
> with a real `googlevideo` URL). We are looking for a pure-page PoC that
> returns ≥1 readable byte with no proxy and no extension. See
> [`docs/LOCAL-ONLY-RESEARCH.md`](./docs/LOCAL-ONLY-RESEARCH.md) — issues and
> PRs with refutations welcome!

---

## 🔬 Project status: we need help

**What works today:** direct links (`.mp4`, `.webm`, `.mp3`…) and local
files. All 100% in your browser, verified with unit tests (36/36) and the
real Moli browser.

**What we have NOT achieved yet:** downloading from YouTube, TikTok, X or
other platforms with no server, proxy or extension. The browser blocks
cross-origin reads (no bytes without `Access-Control-Allow-Origin`), and we
proved it with real `googlevideo` URLs: 0 readable bytes in all 3 `fetch`
modes.

**We keep trying and we need help:** if you can think of a pure-page approach
(or can refute our decision table), open an issue or PR with a reproducible
PoC. The full analysis lives in
[`docs/LOCAL-ONLY-RESEARCH.md`](./docs/LOCAL-ONLY-RESEARCH.md).

---

## ⚡ Key Features

- **100% Local**: No in-house backend and no third-party APIs. No FxTwitter, TikWM, Cobalt, Invidious, Piped or CORS proxies. Only a direct `fetch` to the file you point at and `blob:` URLs for your own files.
- **Exactly two ways in**:
  - **Direct links**: `.mp4`, `.webm`, `.mp3`, `.m4a`, `.wav`, etc. files with local HEAD inspection.
  - **Local files**: load a video/audio file from your device and it is processed with no network (local Blob object).
- **Apple HIG & Liquid Glass Aesthetics**:
  - Translucent materials with background blur (`backdrop-blur-xl`, subtle borders and elevated shadows).
  - Clean SF Pro-inspired typography with strict hierarchy.
  - Fluid iOS/macOS-style segmented control to switch between Video and Audio Only.
  - Modal sheets and side drawers for settings and history.
  - Light and dark mode with automatic detection and manual switch.
- **Local handling**:
  - No CORS proxies or configurable instances. If the origin server blocks CORS, the browser starts a direct download as a fallback.
- **Private Local History**:
  - Stores your latest downloads in `localStorage` (nothing sent to the cloud).
  - One-click re-download or direct-link copy.
- **HydraApps Integration**:
  - Assigned development port: `:5177`.
  - Direct switcher to the other suite apps (`HydraCut`, `HydraHub`, `HydraDAW`, `HydraConvert`).
- **English & Spanish, auto-detected**: the UI follows your browser language (`navigator.language`) with a manual override in Settings (System / English / Español). No i18n dependencies — a built-in `src/services/i18n.ts` dictionary covers UI, errors and extractor messages.

---

## 🏗️ Extraction Architecture

```text
Direct URL or Local File
      │
      ▼
Local Detector (direct / local / unknown)
      │
      ├─► Direct link ──► Local HEAD / ranged GET ──┐
      └─► Local file ──► Blob URL (no network) ────┼──► MediaMetadata & Streams
                                                    │           │
                                                    │           ▼
                                                    │    Apple HIG Preview Card
                                                    │           │
                                                    │           ▼
                                                    │    Progressive Download / Blob
```

---

## 🛠️ Technologies

- **React 18** + **TypeScript**
- **Vite 5**
- **Tailwind CSS 3** with Apple HIG tokens and Liquid Glass
- **Lucide React** (SF Symbols-inspired iconography)
- **Vitest** (unit test suite for extractors and parsing)

---

## 🔒 Security

No in-house backend and no third-party APIs: zero external calls. Only a direct `fetch` to the file you point at (or no network at all for local files). No secrets in the repo; `.env*` is ignored in `.gitignore`. History and settings live in your browser's `localStorage`.

---

## ⚖️ Legal Notice

- **Legitimate use:** only download content you own the rights to, that is public domain or licensed accordingly, or where your country's laws allow it (e.g. private copying). Respect the origin server's Terms of Service and the intellectual-property laws of your jurisdiction.
- **No circumvention:** do not use this tool to bypass technological protection measures (DRM) where prohibited by law.
- **No third-party services:** no external APIs, instances or proxies. The app only connects directly to the server of the file you point at (or to no server at all, for local files). If that server blocks CORS or stops serving the file, the download will fail with no external fallback.
- **No warranties:** software "as is" (MIT license). The author is not liable for direct or indirect damages from use or misuse of this tool, nor for the availability or legality of downloaded content. Responsibility for its use is entirely yours.
