// Serviço de Geocodificação e Consulta de CEP para Cambé - PR
// Cascata resiliente: Google Geocoder (prioritário) -> ViaCEP + Geocodificação do logradouro (Google / Nominatim OSM)

import {
  CIDADE_PERMITIDA,
  ESTADO_PERMITIDO,
  normalizarTexto,
  isCidadeCambe,
  extrairComponentesGoogle,
  formatCep,
} from '@/components/LocalizacaoUnidadeSection'

// Bounding box oficial / aproximado de Cambé - PR com margem de segurança
// Longitudes min/max: -51.35 a -51.20 | Latitudes min/max: -23.36 a -23.18
export const CAMBE_BBOX = {
  minLng: -51.35,
  maxLng: -51.2,
  minLat: -23.36,
  maxLat: -23.18,
}

// Nominatim viewbox format: <left>,<top>,<right>,<bottom> = <minLng>,<maxLat>,<maxLng>,<minLat>
export const CAMBE_NOMINATIM_VIEWBOX = `${CAMBE_BBOX.minLng},${CAMBE_BBOX.maxLat},${CAMBE_BBOX.maxLng},${CAMBE_BBOX.minLat}`

export interface ViaCepResponse {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
  erro?: boolean | string
}

export interface BrasilApiCepV2Response {
  cep?: string
  state?: string
  city?: string
  neighborhood?: string
  street?: string
  service?: string
  location?: {
    type?: string
    coordinates?: {
      longitude?: string | number
      latitude?: string | number
    }
  }
  errors?: any[]
  message?: string
}

export interface GeocodeResult {
  latitude: number
  longitude: number
  logradouro: string
  bairro: string
  cidade: string
  estado_uf: string
  cep: string
  source: 'brasilapi-cep' | 'google-postal-code' | 'google-address' | 'nominatim-address'
}

/**
 * Consulta a API v2 da BrasilAPI (retorna endereço e coordenadas quando disponíveis)
 */
export async function consultarBrasilApi(
  cepDigits: string,
): Promise<BrasilApiCepV2Response | null> {
  const clean = cepDigits.replace(/\D/g, '')
  if (clean.length !== 8) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)
    const resp = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!resp.ok) return null
    const data: BrasilApiCepV2Response = await resp.json()
    if (data.errors || data.message) {
      return null
    }
    return data
  } catch (err) {
    console.warn('Falha na consulta à BrasilAPI:', err)
    return null
  }
}

/**
 * Consulta a API do ViaCEP
 */
export async function consultarViaCep(cepDigits: string): Promise<ViaCepResponse | null> {
  const clean = cepDigits.replace(/\D/g, '')
  if (clean.length !== 8) return null

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)
    const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!resp.ok) return null
    const data: ViaCepResponse = await resp.json()
    if (data.erro === true || data.erro === 'true') {
      return null
    }
    return data
  } catch (err) {
    console.warn('Falha na consulta ao ViaCEP:', err)
    return null
  }
}

/**
 * Verifica se coordenadas estão aproximadamente dentro dos limites de Cambé
 */
export function isCoordinateInsideCambeBounds(lat: number, lng: number): boolean {
  return (
    lat >= CAMBE_BBOX.minLat &&
    lat <= CAMBE_BBOX.maxLat &&
    lng >= CAMBE_BBOX.minLng &&
    lng <= CAMBE_BBOX.maxLng
  )
}

/**
 * Geocodifica endereço no Nominatim (OpenStreetMap) com viewbox restrita a Cambé (bounded=1)
 */
export async function geocodificarComNominatim(query: string): Promise<{
  lat: number
  lng: number
  displayName?: string
} | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const params = new URLSearchParams({
      format: 'jsonv2',
      q: query,
      viewbox: CAMBE_NOMINATIM_VIEWBOX,
      bounded: '1',
      limit: '1',
      countrycodes: 'br',
      addressdetails: '1',
    })

    const resp = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!resp.ok) return null
    const list = await resp.json()
    if (!Array.isArray(list) || list.length === 0) return null

    const best = list[0]
    const lat = parseFloat(best.lat)
    const lng = parseFloat(best.lon)

    if (isNaN(lat) || isNaN(lng)) return null

    // Valida se está dentro do bounding box de Cambé
    if (!isCoordinateInsideCambeBounds(lat, lng)) {
      return null
    }

    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      displayName: best.display_name,
    }
  } catch (err) {
    console.warn('Falha na consulta ao Nominatim OSM:', err)
    return null
  }
}

/**
 * Geocodifica um endereço textual no Google Maps Geocoder
 */
export function geocodificarEnderecoGoogle(
  address: string,
  cambeBounds?: any,
): Promise<{
  lat: number
  lng: number
  route?: string
  neighborhood?: string
  city?: string
  stateUf?: string
  postalCode?: string
} | null> {
  return new Promise((resolve) => {
    try {
      const google = (window as any).google
      if (!google?.maps?.Geocoder) {
        resolve(null)
        return
      }

      const geocoder = new google.maps.Geocoder()
      const req: any = {
        address,
        componentRestrictions: {
          country: 'BR',
          administrativeArea: 'PR',
        },
      }
      if (cambeBounds) {
        req.bounds = cambeBounds
      }

      geocoder.geocode(req, (results: any, status: any) => {
        if (status !== 'OK' || !Array.isArray(results) || results.length === 0) {
          resolve(null)
          return
        }

        let best = results[0]
        for (const r of results) {
          const comp = extrairComponentesGoogle(r.address_components)
          if (isCidadeCambe(comp.city, comp.stateUf)) {
            best = r
            break
          }
        }

        const comp = extrairComponentesGoogle(best.address_components)
        if (!isCidadeCambe(comp.city, comp.stateUf)) {
          resolve(null)
          return
        }

        const loc = best.geometry?.location
        const lat = loc && typeof loc.lat === 'function' ? Number(loc.lat().toFixed(6)) : null
        const lng = loc && typeof loc.lng === 'function' ? Number(loc.lng().toFixed(6)) : null

        if (lat === null || lng === null) {
          resolve(null)
          return
        }

        resolve({
          lat,
          lng,
          route: comp.route,
          neighborhood: comp.neighborhood,
          city: comp.city,
          stateUf: comp.stateUf,
          postalCode: comp.postalCode,
        })
      })
    } catch (err) {
      console.warn('Erro ao geocodificar com Google Geocoder:', err)
      resolve(null)
    }
  })
}

/**
 * Tenta busca direta por CEP no Google Geocoder com componentRestrictions: { postalCode, country: 'BR' }
 */
export function geocodificarCepGoogle(cleanCep: string): Promise<{
  lat: number
  lng: number
  route: string
  neighborhood: string
  city: string
  stateUf: string
  postalCode: string
} | null> {
  return new Promise((resolve) => {
    try {
      const google = (window as any).google
      if (!google?.maps?.Geocoder) {
        resolve(null)
        return
      }

      const geocoder = new google.maps.Geocoder()
      geocoder.geocode(
        {
          componentRestrictions: {
            postalCode: cleanCep,
            country: 'BR',
          },
        },
        (results: any, status: any) => {
          if (status !== 'OK' || !Array.isArray(results) || results.length === 0) {
            resolve(null)
            return
          }

          const best = results[0]
          const comp = extrairComponentesGoogle(best.address_components)

          if (!isCidadeCambe(comp.city, comp.stateUf)) {
            // CEP pertence a outro município
            resolve(null)
            return
          }

          const loc = best.geometry?.location
          const lat = loc && typeof loc.lat === 'function' ? Number(loc.lat().toFixed(6)) : null
          const lng = loc && typeof loc.lng === 'function' ? Number(loc.lng().toFixed(6)) : null

          if (lat === null || lng === null) {
            resolve(null)
            return
          }

          resolve({
            lat,
            lng,
            route: comp.route || '',
            neighborhood: comp.neighborhood || '',
            city: comp.city || CIDADE_PERMITIDA,
            stateUf: comp.stateUf || ESTADO_PERMITIDO,
            postalCode: comp.postalCode || formatCep(cleanCep),
          })
        },
      )
    } catch (err) {
      console.warn('Erro no geocode por CEP Google:', err)
      resolve(null)
    }
  })
}
