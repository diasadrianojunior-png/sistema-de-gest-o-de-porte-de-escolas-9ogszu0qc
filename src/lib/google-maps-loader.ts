// Carregador assíncrono e dinâmico da Google Maps JavaScript API

const GOOGLE_MAPS_SCRIPT_ID = '__google_maps_api_script__'

let loadPromise: Promise<void> | null = null

export function getGoogleMapsApiKey(): string {
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY
  return envKey || 'AIzaSyAVd864TUJT0mMHGa0ZzRUSq2KEUWm5jUw'
}

// A API só está realmente pronta quando google.maps.Map existir.
// Com loading=async o evento onload do <script> dispara ANTES do bootstrap
// interno terminar, então verificar apenas window.google não é suficiente.
function isMapsApiReady(): boolean {
  if (typeof window === 'undefined') return false
  const google = (window as any).google
  return !!(google && google.maps && typeof google.maps.Map === 'function')
}

// Aguarda (com polling curto e timeout) até o bootstrap da API expor google.maps
function waitForMapsApi(timeoutMs = 15000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const startedAt = Date.now()
    const tick = () => {
      if (isMapsApiReady()) {
        resolve()
        return
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Tempo excedido ao aguardar a Google Maps JavaScript API.'))
        return
      }
      window.setTimeout(tick, 50)
    }
    tick()
  })
}

export function loadGoogleMapsScript(apiKey?: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if (isMapsApiReady()) {
    return Promise.resolve()
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const key = apiKey || getGoogleMapsApiKey()
    if (!key) {
      loadPromise = null
      reject(new Error('Chave da API do Google Maps não configurada.'))
      return
    }

    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID,
    ) as HTMLScriptElement | null
    if (existingScript) {
      waitForMapsApi().then(resolve).catch(reject)
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.type = 'text/javascript'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry&loading=async&callback=__googleMapsApiReady__`
    script.async = true
    script.defer = true

    // Callback exigido pelo modo loading=async; a resolução da promise
    // acontece via waitForMapsApi (quando google.maps.Map existir de fato).
    ;(window as any).__googleMapsApiReady__ = () => {
      /* noop */
    }

    script.onload = () => {
      waitForMapsApi()
        .then(resolve)
        .catch((err) => {
          loadPromise = null
          reject(err)
        })
    }

    script.onerror = (error) => {
      loadPromise = null
      reject(
        new Error('Falha ao carregar a Google Maps JavaScript API: ' + (error as any)?.message),
      )
    }

    document.head.appendChild(script)
  })

  return loadPromise
}
