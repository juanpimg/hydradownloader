// Minimal built-in i18n (English + Spanish) with automatic detection.
// No external dependencies. Services and components read strings through t().

export type Locale = 'en' | 'es';
export type LocalePreference = 'system' | Locale;

const en = {
  // App hero
  badge: '100% Local • No APIs • No Servers',
  hero_title_a: 'Download video and audio',
  hero_title_b: 'instantly.',
  hero_sub:
    'Paste a direct file link or load a file from your device. Everything runs in your browser, with no external calls.',
  chip_direct: 'Direct links',
  chip_local: 'Local files',
  or: 'or',
  load_local: 'Load local file',
  // Help-wanted banner
  help_title: 'We don’t support YouTube or other platforms yet — we need your help',
  help_body:
    'The browser blocks reading those videos, and we are still looking for a 100% local way to solve it.',
  help_link: 'Read the research and how to help',
  // Notices
  notice_alt: 'Alternative download started',
  notice_title: 'Notice',
  notice_browser: 'Download started directly in your browser.',
  // App errors
  err_extract: 'Could not extract content from this link.',
  err_connect: 'Unexpected connection error.',
  err_localfile: 'Could not load the local file.',
  err_download_prefix: 'Download error: ',
  err_history_prefix: 'History download error: ',
  err_history_suffix: '. The temporary link may have expired.',
  // Value props
  card_privacy_t: 'Total Privacy',
  card_privacy_d: 'Zero external API calls. No proxies, no instances, no tracking. Just your browser.',
  card_speed_t: 'High Speed',
  card_speed_d: 'Direct downloads with range resume and instant local save.',
  card_suite_t: 'HydraApps Suite',
  card_suite_d: 'Edit your downloads in HydraCut or send them to HydraConvert in one click.',
  // Footer
  footer_a: 'HydraDownloader — Part of the ',
  footer_b: ' media suite. 100% local, inspired by Apple HIG.',
  // UrlInput
  badge_local_title: 'Local file',
  badge_local: 'Local',
  input_placeholder: 'Paste a direct .mp4, .webm, .mp3, .m4a, .wav link...',
  clear_text: 'Clear text',
  paste_title: 'Paste from clipboard',
  paste: 'Paste',
  download: 'Download',
  extracting: 'Extracting...',
  // PreviewCard
  mode_video: 'Video',
  mode_audio: 'Audio Only',
  quality_format: 'Quality / Format:',
  dl_audio: 'Download Audio',
  dl_video: 'Download Video',
  copy_link: 'Copy direct link',
  // DownloadProgress
  prog_done: 'Download complete',
  prog_error: 'Download error',
  prog_busy: 'Downloading file...',
  prog_cancel: 'Cancel download',
  // HistoryDrawer
  hist_title: 'Download History',
  hist_sub: '{n} items stored locally',
  hist_empty_t: 'No recent downloads',
  hist_empty_d: 'Files you download will appear here for easy access.',
  hist_redownload: 'Download again',
  hist_open: 'Open original link',
  hist_remove: 'Remove from history',
  hist_clear: 'Clear History',
  hist_close: 'Close',
  time_now: 'Just now',
  time_min: '{n} min ago',
  time_hour: '{n} h ago',
  time_day: '{n} d ago',
  // Header
  hdr_history: 'Download history',
  hdr_settings: 'Settings',
  hdr_light: 'Switch to light mode',
  hdr_dark: 'Switch to dark mode',
  hdr_gh_title: 'View code on GitHub — contribute!',
  hdr_gh_aria: 'View HydraDownloader on GitHub (new tab)',
  hdr_suite: 'HydraApps apps',
  // Suite nav
  nav_cut: 'Multitrack video editor',
  nav_hub: 'Suite portal and catalog',
  nav_daw: 'Digital audio workstation',
  nav_convert: 'Local media converter',
  nav_downloader: 'Universal web downloader',
  nav_current: 'Current',
  // SettingsSheet
  set_title: 'HydraDownloader Settings',
  set_sub: '100% local • No APIs • No proxies',
  set_general: 'General Preferences',
  set_mode: 'Default mode:',
  set_quality: 'Video quality:',
  set_quality_best: 'Best Quality (1080p / 4K)',
  set_format: 'Audio format:',
  set_language: 'Language:',
  set_lang_system: 'System (auto)',
  set_lang_en: 'English',
  set_lang_es: 'Spanish (Español)',
  set_local_t: 'Local-only mode active',
  set_local_d:
    'No external API calls, no CORS proxies, no servers. Only direct links and files from your device.',
  set_confirm: 'Do you want to clear your entire download history?',
  set_clear: 'Clear Local History',
  set_done: 'Done',
  // Extractors
  ex_badurl: 'Please enter a valid URL.',
  ex_localonly:
    'Local-only mode: paste a direct link to a file (.mp4, .webm, .mp3, .m4a, .wav, etc.) or load a file from your device. No external APIs, no proxies, no servers.',
  ex_unexpected: 'Unexpected extraction error: ',
  ex_unknown: 'Unknown error',
  ex_direct_err: 'Error processing direct link: ',
  dx_blob_label: 'Local File (BLOB)',
  dx_blob_title: 'local-file',
  dx_direct_label: 'Direct File ({e})',
  dx_direct_via: 'Local Direct Link (no APIs)',
  file_via: 'Local File (no network)',
  lx_label: 'Local File ({f} — {mb} MB)',
  // Download manager
  dm_nofile: 'This option does not contain a directly downloadable media file.',
  dm_badurl: 'The download URL is not valid.',
  dm_zerosize: 'The declared file size is 0 bytes.',
  dm_starting: 'Starting download...',
  dm_stall: 'Download stalled due to prolonged inactivity (connection interrupted).',
  dm_timeout_connect: 'Timed out while connecting to the download server.',
  dm_timeout_resume: 'Timed out while resuming the connection to the server.',
  dm_net_timeout: 'Timed out.',
  dm_interrupted: 'Network error: connection interrupted after {r}{t} ({n} reconnection attempts).',
  dm_416: 'The server rejected the resume request (HTTP 416).',
  dm_http: 'HTTP error {s}: {t}',
  dm_nocontent: 'The server returned an empty response with no content (0 bytes).',
  dm_empty: 'The server returned an empty response (0 bytes).',
  dm_blocked: ' The download link was blocked or contains no data.',
  dm_nostream: 'The download data stream is not available.',
  dm_midstall: 'Connection interrupted during transfer (network pause over 25s).',
  dm_interrupted2: 'Network error: connection interrupted after {r}{t} after {n} reconnection attempts.',
  dm_emptyfile: 'The downloaded file is empty (0 bytes received).',
  dm_emptyblob: 'The generated file is empty (0 bytes).',
  dm_stallnet: 'Connection interrupted by network inactivity.',
  dm_reconnecting: 'Reconnecting ({a}/{b})...',
  dm_completed: 'Completed',
  dm_cancelled: 'Cancelled',
  dm_failed: 'Error',
  dm_cors: 'CORS / network block',
  dm_cors_suffix: '. A direct download has been started in your browser.',
  dm_download_error: 'Download error',
  dm_net_prefix: 'Network error: '
};

export type I18nKey = keyof typeof en;

const es: Record<I18nKey, string> = {
  badge: '100% Local • Sin APIs • Sin Servidores',
  hero_title_a: 'Descarga vídeo y audio',
  hero_title_b: 'al instante.',
  hero_sub:
    'Pega un enlace directo a un archivo o carga un archivo de tu dispositivo. Todo se procesa en tu navegador, sin llamadas externas.',
  chip_direct: 'Enlaces directos',
  chip_local: 'Archivos locales',
  or: 'o',
  load_local: 'Cargar archivo local',
  help_title: 'Aún no soportamos YouTube ni otras plataformas — necesitamos tu ayuda',
  help_body:
    'El navegador bloquea la lectura de esos vídeos y seguimos buscando una forma 100% local de resolverlo.',
  help_link: 'Ver la investigación y cómo ayudar',
  notice_alt: 'Descarga alternativa iniciada',
  notice_title: 'Aviso',
  notice_browser: 'Descarga iniciada directamente en tu navegador.',
  err_extract: 'No se pudo extraer el contenido de este enlace.',
  err_connect: 'Error inesperado al conectar.',
  err_localfile: 'No se pudo cargar el archivo local.',
  err_download_prefix: 'Error durante la descarga: ',
  err_history_prefix: 'Error al descargar desde el historial: ',
  err_history_suffix: '. Es posible que el enlace temporal haya caducado.',
  card_privacy_t: 'Privacidad Total',
  card_privacy_d: 'Cero llamadas a APIs externas. Sin proxies, sin instancias, sin rastreo. Solo tu navegador.',
  card_speed_t: 'Alta Velocidad',
  card_speed_d: 'Descarga directa con reanudación por rangos y guardado local inmediato.',
  card_suite_t: 'Suite HydraApps',
  card_suite_d: 'Edita tus descargas en HydraCut o pásalas a HydraConvert con un solo clic.',
  footer_a: 'HydraDownloader — Parte de la ',
  footer_b: ' suite multimedia. 100% local, inspirado en Apple HIG.',
  badge_local_title: 'Archivo local',
  badge_local: 'Local',
  input_placeholder: 'Pega un enlace directo .mp4, .webm, .mp3, .m4a, .wav...',
  clear_text: 'Borrar texto',
  paste_title: 'Pegar del portapapeles',
  paste: 'Pegar',
  download: 'Descargar',
  extracting: 'Extrayendo...',
  mode_video: 'Vídeo',
  mode_audio: 'Solo Audio',
  quality_format: 'Calidad / Formato:',
  dl_audio: 'Descargar Audio',
  dl_video: 'Descargar Vídeo',
  copy_link: 'Copiar enlace directo',
  prog_done: 'Descarga completada',
  prog_error: 'Error en la descarga',
  prog_busy: 'Descargando archivo...',
  prog_cancel: 'Cancelar descarga',
  hist_title: 'Historial de Descargas',
  hist_sub: '{n} elementos guardados localmente',
  hist_empty_t: 'Sin descargas recientes',
  hist_empty_d: 'Los archivos que descargues aparecerán aquí para que puedas acceder a ellos fácilmente.',
  hist_redownload: 'Volver a descargar',
  hist_open: 'Abrir enlace original',
  hist_remove: 'Eliminar de historial',
  hist_clear: 'Vaciar Historial',
  hist_close: 'Cerrar',
  time_now: 'Hace un momento',
  time_min: 'Hace {n} min',
  time_hour: 'Hace {n} h',
  time_day: 'Hace {n} d',
  hdr_history: 'Historial de descargas',
  hdr_settings: 'Ajustes',
  hdr_light: 'Cambiar a modo claro',
  hdr_dark: 'Cambiar a modo oscuro',
  hdr_gh_title: 'Ver código en GitHub — ¡contribuye!',
  hdr_gh_aria: 'Ver HydraDownloader en GitHub (pestaña nueva)',
  hdr_suite: 'Apps de HydraApps',
  nav_cut: 'Editor de vídeo multitrack',
  nav_hub: 'Portal y catálogo de la suite',
  nav_daw: 'Estación de audio digital',
  nav_convert: 'Conversor multimedia local',
  nav_downloader: 'Descargador universal web',
  nav_current: 'Actual',
  set_title: 'Ajustes de HydraDownloader',
  set_sub: '100% local • Sin APIs • Sin proxies',
  set_general: 'Preferencias Generales',
  set_mode: 'Modo por defecto:',
  set_quality: 'Calidad de vídeo:',
  set_quality_best: 'Máxima Calidad (1080p / 4K)',
  set_format: 'Formato de audio:',
  set_language: 'Idioma:',
  set_lang_system: 'Sistema (auto)',
  set_lang_en: 'Inglés',
  set_lang_es: 'Español',
  set_local_t: 'Modo solo-local activo',
  set_local_d:
    'Sin llamadas a APIs externas, sin proxies CORS y sin servidores. Solo enlaces directos y archivos de tu dispositivo.',
  set_confirm: '¿Deseas vaciar todo el historial de descargas?',
  set_clear: 'Vaciar Historial Local',
  set_done: 'Listo',
  ex_badurl: 'Por favor, introduce una URL válida.',
  ex_localonly:
    'Modo solo-local: pega un enlace directo a un archivo (.mp4, .webm, .mp3, .m4a, .wav, etc.) o carga un archivo desde tu dispositivo. Sin APIs externas, sin proxies, sin servidores.',
  ex_unexpected: 'Error inesperado durante la extracción: ',
  ex_unknown: 'Error desconocido',
  ex_direct_err: 'Error procesando enlace directo: ',
  dx_blob_label: 'Archivo Local (BLOB)',
  dx_blob_title: 'archivo-local',
  dx_direct_label: 'Archivo Directo ({e})',
  dx_direct_via: 'Enlace Directo Local (sin APIs)',
  file_via: 'Archivo Local (sin red)',
  lx_label: 'Archivo Local ({f} — {mb} MB)',
  dm_nofile: 'Esta opción no contiene un archivo multimedia descargable directo.',
  dm_badurl: 'La URL de descarga no es válida.',
  dm_zerosize: 'El tamaño indicado para este archivo es de 0 bytes.',
  dm_starting: 'Iniciando descarga...',
  dm_stall: 'La descarga se detuvo por inactividad prolongada (conexión interrumpida).',
  dm_timeout_connect: 'Tiempo de espera agotado al conectar con el servidor de descarga.',
  dm_timeout_resume: 'Tiempo de espera agotado al reanudar la conexión con el servidor.',
  dm_net_timeout: 'Tiempo de espera agotado.',
  dm_interrupted: 'Error de red: Conexión interrumpida tras {r}{t} ({n} intentos de reconexión).',
  dm_416: 'El servidor rechazó la solicitud de reanudación (HTTP 416).',
  dm_http: 'Error HTTP {s}: {t}',
  dm_nocontent: 'El servidor devolvió una respuesta sin contenido (0 bytes).',
  dm_empty: 'El servidor devolvió una respuesta vacía (0 bytes).',
  dm_blocked: ' El enlace de descarga fue bloqueado o no contiene datos.',
  dm_nostream: 'El flujo de datos de la descarga no está disponible.',
  dm_midstall: 'La conexión se interrumpió durante la transferencia (pausa de red superior a 25s).',
  dm_interrupted2: 'Error de red: Conexión interrumpida tras {r}{t} tras {n} intentos de reconexión.',
  dm_emptyfile: 'El archivo descargado está vacío (0 bytes recibidos).',
  dm_emptyblob: 'El archivo generado está vacío (0 bytes).',
  dm_stallnet: 'Conexión interrumpida por inactividad de red.',
  dm_reconnecting: 'Reconectando ({a}/{b})...',
  dm_completed: 'Completado',
  dm_cancelled: 'Cancelado',
  dm_failed: 'Error',
  dm_cors: 'Bloqueo CORS / Red',
  dm_cors_suffix: '. Se ha iniciado la descarga directa en tu navegador.',
  dm_download_error: 'Error en la descarga',
  dm_net_prefix: 'Error de red: '
};

let current: Locale = 'en';

export function setLocale(locale: Locale): void {
  current = locale;
}

export function getLocale(): Locale {
  return current;
}

/** Resolve a stored preference to a concrete locale using the browser language. */
export function resolveLocale(
  preference: LocalePreference,
  browserLanguage?: string
): Locale {
  if (preference === 'en' || preference === 'es') return preference;
  const lang =
    browserLanguage ??
    (typeof navigator !== 'undefined' ? navigator.language : 'en');
  return lang.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function t(key: I18nKey, vars?: Record<string, string | number>): string {
  const dict = current === 'es' ? es : en;
  let out: string = dict[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out;
}
