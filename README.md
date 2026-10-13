# HydraDownloader 📥

[![Local-Only](https://img.shields.io/badge/Architecture-100%25%20Local-emerald)](#)
[![Privacy](https://img.shields.io/badge/Privacy-Zero%20Data%20Collected-blue)](#)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

> Descargador 100% local en el navegador: enlaces directos y archivos de tu dispositivo, **sin APIs externas, sin proxies y sin backend**. Parte de la suite **HydraApps**.

Lo que nos diferencia: **cero llamadas a APIs de terceros**. Todo ocurre en tu navegador.

> 🔬 **Reto abierto: YouTube 100% local.** Hoy las URLs de plataforma se
> rechazan (el navegador bloquea la lectura cross-origin sin `ACAO`, probado
> con URL real de `googlevideo`). Buscamos una PoC en página pura que devuelva
> ≥1 byte legible sin proxy ni extensión. Ver
> [`docs/LOCAL-ONLY-RESEARCH.md`](./docs/LOCAL-ONLY-RESEARCH.md) — ¡se aceptan
> issues y PRs con refutaciones!

---

## ⚡ Características Principales

- **100% Local**: Sin backend propio y sin APIs de terceros. Sin FxTwitter, TikWM, Cobalt, Invidious, Piped ni proxies CORS. Solo `fetch` directo al archivo que tú indicas y `blob:` URLs de tus propios archivos.
- **Dos únicas vías**:
  - **Enlaces directos**: archivos `.mp4`, `.webm`, `.mp3`, `.m4a`, `.wav`, etc. con inspección HEAD local.
  - **Archivos locales**: carga un vídeo/audio desde tu dispositivo y se procesa sin red (objeto Blob local).
- **Apple HIG & Liquid Glass Aesthetics**:
  - Materiales translúcidos con desenfoque de fondo (`backdrop-blur-xl`, bordes sutiles y sombras elevadas).
  - Tipografía clara inspirada en SF Pro con jerarquía estricta.
  - Control segmentado fluido estilo iOS/macOS para alternar entre Vídeo y Solo Audio.
  - Hojas modales (Sheets) y cajones laterales para ajustes e historial.
  - Modo claro y oscuro con detección automática y selector manual.
- **Gestión local**:
  - Sin proxies CORS ni instancias configurables. Si el servidor origen bloquea CORS, el navegador inicia la descarga directa como alternativa.
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

# Verificación en navegador real (Moli, modo solo-local)
npm run test:moli-download

# Compilar para producción (genera dist/)
npm run build
```

---

## 🏗️ Arquitectura de Extracción

```text
URL directa o Archivo local
      │
      ▼
Detector Local (direct / local / unknown)
      │
      ├─► Enlace directo ──► HEAD local / GET por rangos ──┐
      └─► Archivo local ──► Blob URL (sin red) ───────────┼──► MediaMetadata & Streams
                                                          │           │
                                                          │           ▼
                                                          │    Tarjeta Preview Apple HIG
                                                          │           │
                                                          │           ▼
                                                          │    Descarga Progresiva / Blob
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

Sin backend propio y sin APIs de terceros: cero llamadas externas. Solo `fetch` directo al archivo que tú indicas (o ninguna red en el caso de archivos locales). No hay secretos en el repo; `.env*` está ignorado en `.gitignore`. El historial y ajustes viven en `localStorage` de tu navegador.

---

## ⚖️ Aviso legal

- **Uso legítimo:** descarga únicamente contenido del que poseas los derechos, que sea de dominio público o con licencia que lo permita, o cuando la legislación de tu país lo autorice (p. ej. copia privada). Respeta los Términos de Servicio del servidor origen de cada archivo y la normativa de propiedad intelectual aplicable en tu jurisdicción.
- **Sin elusión de protecciones:** no utilices esta herramienta para eludir medidas tecnológicas de protección (DRM) donde la ley lo prohíba.
- **Sin servicios de terceros:** no hay APIs, instancias ni proxies ajenos. La app solo conecta directamente con el servidor del archivo que tú indicas (o con ningún servidor, en el caso de archivos locales). Si ese servidor bloquea CORS o deja de servir el archivo, la descarga fallará sin alternativa externa.
- **Sin garantías:** software "tal cual" (licencia MIT). El autor no responde de daños directos o indirectos derivados del uso o mal uso de esta herramienta, ni de la disponibilidad o legalidad del contenido descargado. La responsabilidad del uso es exclusivamente tuya.
