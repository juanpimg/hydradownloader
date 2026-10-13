# HydraDownloader 📥

[![Client-Side](https://img.shields.io/badge/Architecture-100%25%20Client--Side-emerald)](#)
[![Privacy](https://img.shields.io/badge/Privacy-Zero%20Data%20Collected-blue)](#)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

> Descargador multimedia universal de vídeo y audio **100% client-side**, sin backend y con diseño **Apple Human Interface Guidelines (HIG)**. Parte de la suite **HydraApps**.

Inspirado en la simplicidad y experiencia de usuario de [Cobalt](https://github.com/imputnet/cobalt) y en los principios de diseño de Apple ([dickwu/apple-design-skill](https://github.com/dickwu/apple-design-skill)).

---

## ⚡ Características Principales

- **100% Client-Side**: No requiere ni utiliza ningún servidor backend propio de HydraApps. Todas las solicitudes y procesamientos ocurren directamente en el navegador del usuario.
- **Extractores Modulares sin Servidor**:
  - **Twitter / X**: Vía API abierta FxTwitter con soporte de MP4 en calidad nativa y separación de audio.
  - **TikTok**: Vía TikWM sin marca de agua (HD) y pista de sonido original MP3.
  - **Reddit**: Vía endpoints públicos nativos `.json` de Reddit.
  - **YouTube**: Vía APIs abiertas Piped / Invidious y fallback progresivo.
  - **Enlaces directos**: Inspección y descarga de archivos `.mp4`, `.webm`, `.mp3`, `.m4a`, `.wav`, etc.
  - **Fallback Universal Cobalt**: Conector a instancias públicas de Cobalt API v7/v10 con selector de instancia.
- **Apple HIG & Liquid Glass Aesthetics**:
  - Materiales translúcidos con desenfoque de fondo (`backdrop-blur-xl`, bordes sutiles y sombras elevadas).
  - Tipografía clara inspirada en SF Pro con jerarquía estricta.
  - Control segmentado fluido estilo iOS/macOS para alternar entre Vídeo y Solo Audio.
  - Hojas modales (Sheets) y cajones laterales para ajustes e historial.
  - Modo claro y oscuro con detección automática y selector manual.
- **Gestión de Proxies CORS**:
  - Soporte de proxies CORS públicos (`corsproxy.io`, `api.allorigins.win`) para evitar restricciones de navegador en llamadas cross-origin.
  - Campo configurable para introducir tu propio proxy CORS o instancia Cobalt.
- **Historial Local Privado**:
  - Almacena tus últimas descargas en `localStorage` (sin enviar nada a la nube).
  - Re-descarga en un clic o copia del enlace directo.
- **Integración HydraApps**:
  - Puerto de desarrollo asignado: `:5177`.
  - Conmutador directo entre aplicaciones de la suite (`HydraCut`, `HydraHub`, `HydraDAW`, `HydraConvert`).

---

## 🚀 Inicio Rápido

```bash
# Entrar a la carpeta
cd apps/hydra-downloader

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en http://localhost:5177
npm run dev

# Ejecutar tests unitarios
npm run test:unit

# Compilar para producción (genera dist/)
npm run build
```

---

## 🏗️ Arquitectura de Extracción

```text
URL Introducida
     │
     ▼
Detector de Plataforma
     │
     ├─► Twitter/X   ──► FxTwitter API ──────────┐
     ├─► TikTok      ──► TikWM API ──────────────┤
     ├─► Reddit      ──► Reddit JSON API ────────┼──► MediaMetadata & Streams
     ├─► YouTube     ──► Piped API / Invidious ──┤           │
     ├─► Direct Link ──► HEAD / MIME Inspector ──┤           ▼
     └─► Desconocido ──► Instancia Cobalt ───────┘    Tarjeta Preview Apple HIG
                                                             │
                                                             ▼
                                                    Descarga Progresiva / Blob
```

---

## 🛠️ Tecnologías

- **React 18** + **TypeScript**
- **Vite 5**
- **Tailwind CSS 3** con tokens Apple HIG y Liquid Glass
- **Lucide React** (iconografía inspirada en SF Symbols)
- **Vitest** (suite de pruebas unitarias para extractores y parseo)

---

## 🔒 Seguridad

Sin backend propio: solo consume APIs públicas de terceros (Cobalt, Invidious/Piped, TikWM, FxTwitter) sin claves. No hay secretos en el repo; `.env*` está ignorado en `.gitignore`. El historial y ajustes viven en `localStorage` de tu navegador.

---

## ⚖️ Aviso legal

- **Uso legítimo:** descarga únicamente contenido del que poseas los derechos, que sea de dominio público o con licencia que lo permita, o cuando la legislación de tu país lo autorice (p. ej. copia privada). Respeta los Términos de Servicio de cada plataforma (YouTube, TikTok, X/Twitter, Reddit) y la normativa de propiedad intelectual y derechos de autor aplicable en tu jurisdicción.
- **Sin elusión de protecciones:** no utilices esta herramienta para eludir medidas tecnológicas de protección (DRM) donde la ley lo prohíba.
- **Servicios de terceros:** los extractores usan APIs e instancias públicas ajenas al autor (Cobalt, Invidious/Piped, TikWM, FxTwitter, proxies CORS), que pueden cambiar, dejar de funcionar o registrar tráfico. Úsalas bajo tu criterio.
- **Sin garantías:** software "tal cual" (licencia MIT). El autor no responde de daños directos o indirectos derivados del uso o mal uso de esta herramienta, ni de la disponibilidad o legalidad del contenido descargado. La responsabilidad del uso es exclusivamente tuya.
