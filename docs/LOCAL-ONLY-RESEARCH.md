# HydraDownloader — Investigación: descarga 100% local en el navegador

> **Estado (14-oct-2026): en pausa.** No existe solución probada para descargar
> YouTube/TikTok/X en una página web pura sin servidor, proxy ni extensión.
> Este documento deja constancia de lo investigado, lo probado y lo que queda
> abierto, **para pedir ayuda**: si encuentras la forma, abre un issue o PR.

## 1. Objetivo

Descargar vídeo/audio de cualquier plataforma ejecutando código **100% en el
navegador del usuario**: cero backend propio, cero APIs de terceros
(FxTwitter, TikWM, Cobalt, Invidious/Piped), cero proxies CORS. Solo la
webapp + el navegador.

Lo que nos diferencia si se consigue: privacidad total y coste cero de
infraestructura.

## 2. Lo que la app hace hoy (modo solo-local, verificado)

- **Enlaces directos** (`.mp4`, `.webm`, `.mp3`, `.m4a`, `.wav`…): `HEAD` local
  + descarga por rangos con reanudación. Funciona, `36/36` tests en verde.
- **Archivos locales** (`src/services/extractors/local.ts`): `File` →
  `blob:` URL, cero red. Funciona, verificado en Moli (256 KB, 100% local).
- **URLs de plataforma** (YouTube, X, TikTok…): se rechazan con el mensaje
  `Modo solo-local…`. Decisión consciente, no bug.

## 3. Por qué la página pura no puede (barrera raíz)

Hay **dos redes** en todos los motores (Blink, Gecko, WebKit):

- **A) `fetch()` de JS**: exige CORS. Sin `Access-Control-Allow-Origin` del
  servidor, el body nunca llega al renderer.
- **B) `<video src>`**: el stack media descarga y decodifica directo a GPU,
  sin pasar por JS. Reproduce sin CORS, pero no expone bytes.

`<video>` pinta por B mientras A recibe respuesta opaca vacía. Reproducir ≠
leer bytes. El punto exacto está en el boundary Network-Service → Renderer
(Chromium: `services/network/orb/orb_filter.cc`, antes del `URLLoaderClient`).

## 4. Experimentos realizados (evidencia, no teoría)

Entorno: webapp en `http://localhost:5177`, Moli headless `1.1.16`,
`Me at the zoo` (`jNQXAC9IVRw`).

| # | Prueba | Resultado |
|---|--------|-----------|
| E1 | Control positivo: `fetch` a MP4 con `ACAO:*` (MDN `flower.mp4`) | ✅ 1.128.375 B, magic `ftyp`. La barrera es YouTube, no el navegador |
| E2 | URL `googlevideo` **real, válida, misma IP, sin caducar** (obtenida server-side vía cliente ANDROID, `curl` → `200 video/mp4` 629.172 B, sin `ACAO`) | ❌ `fetch cors` → `CORS check failed: no Access-Control-Allow-Origin`; `no-cors` → `opaque status:0`; `Range` → mismo CORS fail. **0 bytes legibles** |
| E3 | `POST youtubei/v1/player` | ❌ Desde página: `CORS preflight 403`. Desde servidor: `ANDROID=OK`, `WEB=UNPLAYABLE`, `TV=LOGIN_REQUIRED` (bot wall) |
| S1 | `<video src=embed>`, iframe, canvas, MSE | ❌ Negro / `SecurityError` SOP / canvas tainted. Solo metadata (`oembed` 745 B) y thumbnail (15.921 B JPG) legibles |

**Falsador global confirmado**: URL válida + IP correcta + sin caducar + fetch
en sus 3 modos = 0 bytes. Scripts en `scripts/verify-real-download-moli.mjs`
(modo solo-local, 3/3 en verde) y evidencias en `/tmp` del entorno de pruebas.

## 5. Contexto 2026 (cada vez más difícil, no menos)

- Migración a **SABR**: sin links directos, endpoint único con UMP
  multiplexado (`application/vnd.yt-ump`), sin rangos de bytes, con `poToken`
  atado al vídeo + `n-param` que exige descifrar `base.js`.
- Hasta el bypass `ANDROID_VR` se vuelve errático
  ([yt-dlp#16150](https://github.com/yt-dlp/yt-dlp/issues/16150)).
- `yt-dlp#9820` (mantenedor `seproDev`): *"No point in compiling to wasm due
  to CORS"*. Solo corrió en Pyodide desactivando CORS, sin ffmpeg ni threads.
- La demo web SABR de LuanRT (`kira`) avisa: *"you'll need a proxy"*; su demo
  Shaka exige `proxy server required`. El proxy `/videoplayback` de Invidious
  añade literalmente `Access-Control-Allow-Origin: "*"`: alguien tiene que
  ponerlo.

## 6. Vías evaluadas (tabla de decisión)

| Vía | Veredicto |
|-----|-----------|
| `fetch` directo a `googlevideo`/`youtubei` | Bloqueado (CORS, probado E2/E3) |
| `no-cors` / SW + caché opaca / COOP-COEP / MSE / canvas / `<a download>` / IFrame API / SABR en página | Bloqueado (reproduce, no lee) |
| yt-dlp en Pyodide/WASM en página | Bloqueado (CORS + ~30 MB ffmpeg.wasm + sin threads) |
| JS puro (`youtubei.js`, forks `ytdl-core`) | Bloqueado sin proxy (exigen `poToken`/OAuth generados fuera) |
| Bookmarklet puro en `youtube.com` | Parcial (URLs/metadata sí, bytes no: `youtube→googlevideo` también es cross-origin) |
| Helper en `localhost` + Private Network Access | Funciona, pero ya no es "solo navegador" |
| **Extensión MV3** (patrón `avi12`/`dlpro`) | **Funciona (probado por terceros)**: content-script en `youtube.com` + `host_permissions` + mux WASM local |
| App nativa/Electron/Tauri + binario yt-dlp | Funciona (patrón Stacher/Seal) |

Cobertura de la extensión (verificado oct-2026): PC completa + Firefox
Android (catálogo abierto desde F119) + Safari (Xcode + Developer + review) +
forks Chromium en Android (Quetta/Lemur/Vivaldi). Hueco: Chrome Android
oficial e iOS no-Safari.

## 7. Cómo ayudar (lo que buscamos)

1. **Una prueba de concepto en página pura** que, dado un `watch?v=…`,
   devuelva ≥1 byte de stream legible desde JS (con `ftyp`/`1A45DFA3` y
   headers registrados). Sin proxy, sin extensión, reproducible con Moli.
2. **Refutación documentada** de alguna fila de la tabla (§6) con spec o
   código que la contradiga.
3. **Mejoras al modo solo-local**: mejor remux local (MediaBunny/WebCodecs),
   captura de pestaña con audio, UX del picker local.

Por favor: nada de "usa un proxy / mi API / mi backend". Eso ya lo tuvimos
(Cobalt/Invidious) y se eliminó a propósito (ver historial git).

## 8. Plan I+D pendiente (si alguien lo retoma)

Ver cartera E1–E8 completa en el historial de discusión del proyecto. Regla
stage-gate: seguir en web pura **solo si** E1=PASA y (E2 o E3=PASA con URL
legible CORS). Hoy: E1=PASA, E2=NO-PASA, E3=NO-PASA → **pivot a extensión o
bridge**, web pura cerrada hasta refutación.

## 9. Referencias

- `yt-dlp/yt-dlp#9820` (WASM/CORS), `yt-dlp#16150` (ANDROID_VR/SABR)
- LuanRT `googlevideo` / `kira` / `yt-sabr-shaka-demo`, `avi12/youtube-downloader`, `machineonamission/dlpro`
- MDN CORS / Fetch Standard § CORS protocol / ORB / CORP-COEP-COOP
- Invidious `routes/video_playback.cr` (`ACAO: "*"`)
