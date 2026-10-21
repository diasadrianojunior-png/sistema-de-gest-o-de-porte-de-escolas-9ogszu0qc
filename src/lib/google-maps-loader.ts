// Carregador assíncrono e dinâmico da Google Maps JavaScript API

const GOOGLE_MAPS_SCRIPT_ID = '__google_maps_api_script__'

let loadPromise: Promise<void> | null = null

export function getGoogleMapsApiKey(): string {
  const envKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY
  return envKey || 'AIzaSyAVd864TUJT0mMHGa0ZzRUSq2KEUWm5jUw'
}

export function loadGoogleMapsScript(apiKey?: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  if ((window as any).google && (window as any).google.maps) {
    return Promise.resolve()
  }

  if (loadPromise) {
    return loadPromise
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const key = apiKey || getGoogleMapsApiKey()
    if (!key) {
      reject(new Error('Chave da API do Google Maps não configurada.'))
      return
    }

    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID,
    ) as HTMLScriptElement | null
    if (existingScript) {
      if ((window as any).google && (window as any).google.maps) {
        resolve()
      } else {
        existingScript.addEventListener('load', () => resolve())
        existingScript.addEventListener('error', (e) => reject(e))
      }
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.type = 'text/javascript'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,geometry&loading=async`
    script.async = true
    script.defer = true

    script.onload = () => {
      resolve()
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
