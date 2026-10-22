import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MapPin, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { loadGoogleMapsScript } from '@/lib/google-maps-loader'

export interface EnderecoUnidadeData {
  cep: string
  logradouro: string
  numero: string
  bairro: string
  estado_uf: string
  cidade: string
  latitude: number | null
  longitude: number | null
}

interface LocalizacaoUnidadeProps {
  value: EnderecoUnidadeData
  onChange: (data: EnderecoUnidadeData) => void
  onLocationSummaryChange?: (summary: string) => void
  disabled?: boolean
}

// Centro padrão: Cambé - PR
const CAMBE_DEFAULT_COORDS = { lat: -23.2758, lng: -51.2785 }

// Bounds usados para ENVIESAR e validar a busca (limites oficiais do município de Cambé - PR segundo IBGE com margem de segurança)
// IBGE Cambé: Norte -23.0127, Sul -23.3989, Leste -51.1688, Oeste -51.4203
const CAMBE_BOUNDS_BUSCA = { south: -23.42, west: -51.44, north: -23.0, east: -51.14 }
const CAMBE_BOUNDS_VALIDACAO = { south: -23.48, west: -51.48, north: -22.98, east: -51.1 }

// A coordenada final precisa cair dentro do território de Cambé (restrição da cidade)
const estaDentroDeCambe = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= CAMBE_BOUNDS_VALIDACAO.south &&
  lat <= CAMBE_BOUNDS_VALIDACAO.north &&
  lng >= CAMBE_BOUNDS_VALIDACAO.west &&
  lng <= CAMBE_BOUNDS_VALIDACAO.east

// Bounds aproximados do município de Cambé - PR (usados para enviesar a busca do Google)
const getCambeBounds = () => {
  const google = (window as any).google
  return new google.maps.LatLngBounds(
    new google.maps.LatLng(CAMBE_BOUNDS_BUSCA.south, CAMBE_BOUNDS_BUSCA.west),
    new google.maps.LatLng(CAMBE_BOUNDS_BUSCA.north, CAMBE_BOUNDS_BUSCA.east),
  )
}

// Normaliza texto para comparação (minúsculas, sem acentos)
const normalizarTexto = (texto: string): string =>
  (texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

// Lista de estados brasileiros
const ESTADOS_BRASIL = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' },
]

// Cidades por estado para suporte ao select dependente dinâmico
const CIDADES_POR_UF: Record<string, string[]> = {
  PR: [
    'Cambé',
    'Londrina',
    'Rolândia',
    'Ibiporã',
    'Arapongas',
    'Curitiba',
    'Maringá',
    'Cascavel',
    'Ponta Grossa',
    'Foz do Iguaçu',
  ],
  SP: [
    'São Paulo',
    'Campinas',
    'Santos',
    'Sorocaba',
    'Ribeirão Preto',
    'Presidente Prudente',
    'São José dos Campos',
  ],
  RJ: [
    'Rio de Janeiro',
    'Niterói',
    'Duque de Caxias',
    'São Gonçalo',
    'Petrópolis',
    'Volta Redonda',
  ],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'Chapecó', 'Itajaí', 'Criciúma'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria', 'Passo Fundo'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna'],
  PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia'],
  ES: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Cachoeiro de Itapemirim'],
  DF: ['Brasília', 'Taguatinga', 'Ceilândia', 'Águas Claras'],
  MT: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop'],
  MS: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá'],
  AM: ['Manaus', 'Parintins', 'Itacoatiara'],
  PA: ['Belém', 'Ananindeua', 'Santarém', 'Marabá'],
  PB: ['João Pessoa', 'Campina Grande', 'Santa Rita'],
  RN: ['Natal', 'Mossoró', 'Parnamirim'],
  AL: ['Maceió', 'Arapiraca', 'Rio Largo'],
  PI: ['Teresina', 'Parnaíba', 'Picos'],
  MA: ['São Luís', 'Imperatriz', 'São José de Ribamar'],
  SE: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto'],
  RO: ['Porto Velho', 'Ji-Paraná', 'Ariquemes'],
  TO: ['Palmas', 'Araguaína', 'Gurupi'],
  AC: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira'],
  AP: ['Macapá', 'Santana', 'Laranjal do Jari'],
  RR: ['Boa Vista', 'Rorainópolis', 'Caracaraí'],
}

// Formatação com máscara de CEP (00000-000)
export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export const LocalizacaoUnidadeSection: React.FC<LocalizacaoUnidadeProps> = ({
  value,
  onChange,
  onLocationSummaryChange,
  disabled = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerInstanceRef = useRef<any>(null)

  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [searchingCep, setSearchingCep] = useState(false)
  const [searchingRef, setSearchingRef] = useState(false)
  const [searchingNumero, setSearchingNumero] = useState(false)
  const [cepError, setCepError] = useState<string | null>(null)
  const [refSearchText, setRefSearchText] = useState('')
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string | null>(null)

  // Referências para a geocodificação imediata pelo Número, controle de concorrência e cache
  const valueRef = useRef<EnderecoUnidadeData>(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  // Contador sequencial de requisição para descartar respostas desatualizadas (race condition)
  const numeroRequestIdRef = useRef(0)
  // AbortController para cancelar requisições HTTP (OSM/Nominatim) em andamento
  const numeroAbortControllerRef = useRef<AbortController | null>(null)
  // Guarda a chave do último endereço/número geocodificado com sucesso para evitar chamadas redundantes
  const lastGeocodedNumeroKeyRef = useRef<string | null>(null)

  // Cancela buscas pendentes ao desmontar
  useEffect(() => {
    return () => {
      if (numeroAbortControllerRef.current) {
        numeroAbortControllerRef.current.abort()
      }
    }
  }, [])

  // Carregar Google Maps JS API sob demanda
  useEffect(() => {
    let isMounted = true
    loadGoogleMapsScript()
      .then(() => {
        if (isMounted) {
          setMapsLoaded(true)
          setMapsError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Erro ao inicializar Google Maps:', err)
          setMapsError('Não foi possível carregar a API do Google Maps.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Inicializar mapa somente após a biblioteca estar REALMENTE carregada
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const google = (window as any).google
    if (!google?.maps || typeof google.maps.Map !== 'function') {
      // A API ainda não expôs google.maps: mantém a tela funcionando
      setMapsError('A API do Google Maps ainda não está disponível. Tente recarregar a página.')
      return
    }

    try {
      const initialLat = value.latitude ?? CAMBE_DEFAULT_COORDS.lat
      const initialLng = value.longitude ?? CAMBE_DEFAULT_COORDS.lng

      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: value.latitude && value.longitude ? 16 : 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      })

      mapInstanceRef.current = map

      const marker = new google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        title: 'Local da Unidade Escolar (Cambé - PR)',
      })

      markerInstanceRef.current = marker

      // Evento de clique no mapa para posicionar marcador
      map.addListener('click', (event: any) => {
        if (disabled) return
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        updateMarkerPosition(lat, lng, true)
      })

      // Evento de arrastar o marcador
      marker.addListener('dragend', () => {
        if (disabled) return
        const pos = marker.getPosition()
        if (pos) {
          updateMarkerPosition(pos.lat(), pos.lng(), true)
        }
      })
    } catch (err) {
      // Qualquer falha na criação do mapa não pode derrubar a página
      console.error('Erro ao inicializar o mapa do Google Maps:', err)
      setMapsError('Não foi possível inicializar o mapa interativo.')
    }
  }, [mapsLoaded, disabled])

  // Atualizar marcador quando coordenadas mudam externamente
  const updateMarkerPosition = useCallback(
    (lat: number, lng: number, reverseGeocode = false) => {
      const google = (window as any).google
      const roundedLat = Number(lat.toFixed(6))
      const roundedLng = Number(lng.toFixed(6))

      if (markerInstanceRef.current) {
        markerInstanceRef.current.setPosition({ lat: roundedLat, lng: roundedLng })
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat: roundedLat, lng: roundedLng })
      }

      onChange({
        ...value,
        latitude: roundedLat,
        longitude: roundedLng,
      })

      if (reverseGeocode && google?.maps?.Geocoder) {
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode(
          { location: { lat: roundedLat, lng: roundedLng } },
          (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              processGeocodingResult(results[0], false)
            }
          },
        )
      }
    },
    [value, onChange],
  )

  // Aplica lat/lng no mapa com o zoom mais próximo possível da posição exata
  const focusMapOnPoint = (lat: number, lng: number, zoom = 18) => {
    const roundedLat = Number(lat.toFixed(6))
    const roundedLng = Number(lng.toFixed(6))
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition({ lat: roundedLat, lng: roundedLng })
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: roundedLat, lng: roundedLng })
      mapInstanceRef.current.setZoom(zoom)
    }
  }

  // Processa o resultado do geocoder
  const processGeocodingResult = (result: any, enforceCambeOnly = true): boolean => {
    let postalCode = ''
    let route = ''
    let streetNumber = ''
    let neighborhood = ''
    let city = ''
    let stateUf = ''

    if (result.address_components) {
      for (const comp of result.address_components) {
        const types: string[] = comp.types || []
        if (types.includes('postal_code')) {
          postalCode = comp.short_name || comp.long_name || ''
        } else if (types.includes('route')) {
          route = comp.long_name || comp.short_name || ''
        } else if (types.includes('street_number')) {
          streetNumber = comp.long_name || comp.short_name || ''
        } else if (
          types.includes('sublocality') ||
          types.includes('sublocality_level_1') ||
          types.includes('neighborhood')
        ) {
          neighborhood = comp.long_name || comp.short_name || ''
        } else if (types.includes('administrative_area_level_2') || types.includes('locality')) {
          // Se for município/cidade
          city = comp.long_name || comp.short_name || ''
        } else if (types.includes('administrative_area_level_1')) {
          stateUf = comp.short_name || comp.long_name || ''
        }
      }
    }

    // Validação estrita: somente cidade de Cambé
    const isCambe = normalizarTexto(city) === 'cambe'

    if (enforceCambeOnly && !isCambe) {
      setCepError(
        `Somente endereços da cidade de CAMBÉ (PR) são aceitos. A busca retornou: "${city || 'Outro município'} - ${stateUf}".`,
      )
      setAddressSuccessMsg(null)
      return false
    }

    setCepError(null)

    const lat = result.geometry?.location?.lat?.() ?? null
    const lng = result.geometry?.location?.lng?.() ?? null

    // Preserva as coordenadas já conhecidas quando o resultado não traz geometria
    const latAtual = lat !== null ? Number(lat.toFixed(6)) : value.latitude
    const lngAtual = lng !== null ? Number(lng.toFixed(6)) : value.longitude
    if (lat !== null && lng !== null) {
      focusMapOnPoint(lat, lng, 18)
    }

    const updatedData: EnderecoUnidadeData = {
      ...value,
      cep: enforceCambeOnly ? (postalCode ? formatCep(postalCode) : value.cep) : value.cep,
      logradouro: route || value.logradouro,
      bairro: neighborhood || value.bairro,
      estado_uf: stateUf || (isCambe ? 'PR' : value.estado_uf),
      cidade: isCambe ? 'Cambé' : city || value.cidade,
      // Número digitado pelo usuário é a fonte da verdade — o geocoder não deve sobrescrevê-lo
      numero: value.numero,
      latitude: latAtual,
      longitude: lngAtual,
    }

    onChange(updatedData)

    if (onLocationSummaryChange) {
      const parts = [
        updatedData.logradouro,
        updatedData.numero ? `nº ${updatedData.numero}` : '',
        updatedData.bairro,
        `${updatedData.cidade || 'Cambé'} - ${updatedData.estado_uf || 'PR'}`,
      ].filter(Boolean)
      if (parts.length > 0) {
        onLocationSummaryChange(parts.join(', '))
      }
    }

    setAddressSuccessMsg(`Endereço localizado em Cambé - PR com sucesso!`)
    setTimeout(() => setAddressSuccessMsg(null), 4000)
    return true
  }

  // Recurso de geocodificação via Nominatim / OpenStreetMap com múltiplos formatos de query:
  // 1) Busca estruturada (street=...&city=Cambé&state=Paraná)
  // 2) Busca por query simples (ex.: "Logradouro, Cambé, PR, Brasil")
  // 3) Busca por variações de nome de logradouro
  const geocodificarNominatimConsulta = async (
    params: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<{ lat: number; lng: number } | null> => {
    try {
      const searchParams = new URLSearchParams({
        format: 'json',
        limit: '3',
        countrycodes: 'br',
        // Viewbox de Cambé para priorizar resultados locais: west, north, east, south
        viewbox: `${CAMBE_BOUNDS_BUSCA.west},${CAMBE_BOUNDS_BUSCA.north},${CAMBE_BOUNDS_BUSCA.east},${CAMBE_BOUNDS_BUSCA.south}`,
        ...params,
      })
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
        {
          signal,
          headers: {
            Accept: 'application/json',
          },
        },
      )
      if (!res.ok) return null
      const lista = await res.json()
      if (!Array.isArray(lista) || lista.length === 0) return null

      for (const item of lista) {
        const lat = Number(item?.lat)
        const lng = Number(item?.lon)
        if (Number.isFinite(lat) && Number.isFinite(lng) && estaDentroDeCambe(lat, lng)) {
          return { lat, lng }
        }
      }
      return null
    } catch {
      return null
    }
  }

  // Geocodificação resiliente fora da API do Google (OSM Nominatim) para endereços de Cambé
  const geocodificarOSM = async (
    logradouro: string,
    numero?: string,
    bairro?: string,
    signal?: AbortSignal,
  ): Promise<{ lat: number; lng: number } | null> => {
    const logradouroLimpo = (logradouro || '').trim()
    const numLimpo = (numero || '').trim()
    const temNum = !!numLimpo && !/^s\s*\/?\s*n$/i.test(numLimpo)
    const bairroLimpo = (bairro || '').trim()

    // Estratégias estruturadas e por texto livre no Nominatim
    // Note que bairros em OSM muitas vezes diferem da base dos Correios, então
    // sempre testamos SEM bairro também para não anular a busca.
    const tentativas: Array<Record<string, string>> = []

    if (logradouroLimpo) {
      // 1. Estruturada: rua com número (se houver)
      if (temNum) {
        tentativas.push({
          street: `${numLimpo} ${logradouroLimpo}`,
          city: 'Cambé',
          state: 'Paraná',
        })
      }
      // 2. Estruturada: rua pura
      tentativas.push({
        street: logradouroLimpo,
        city: 'Cambé',
        state: 'Paraná',
      })

      // 3. Query livre: Logradouro [com número], Cambé, PR
      if (temNum) {
        tentativas.push({
          q: `${logradouroLimpo}, ${numLimpo}, Cambé, PR`,
        })
      }
      tentativas.push({
        q: `${logradouroLimpo}, Cambé, PR`,
      })

      // 4. Se tiver bairro, tenta com bairro também
      if (bairroLimpo) {
        tentativas.push({
          q: `${logradouroLimpo}, ${bairroLimpo}, Cambé, PR`,
        })
      }

      // 5. Se o logradouro começar com tipo (ex.: Avenida, Rua), tenta sem o tipo e vice-versa
      const semTipo = logradouroLimpo
        .replace(/^(rua|avenida|av\.?|travessa|alameda|rodovia|praça|praca)\s+/i, '')
        .trim()
      if (semTipo && semTipo !== logradouroLimpo) {
        tentativas.push({
          street: semTipo,
          city: 'Cambé',
          state: 'Paraná',
        })
        tentativas.push({
          q: `${semTipo}, Cambé, PR`,
        })
      }
    }

    for (const params of tentativas) {
      if (signal?.aborted) return null
      const ponto = await geocodificarNominatimConsulta(params, signal)
      if (ponto) {
        return ponto
      }
    }

    return null
  }

  // Garante que a Google Maps JS API está REALMENTE pronta (google.maps.Map disponível).
  // Nota: se a Geocoding API estiver desativada na conta Google Cloud, geocodeEnderecoCambe
  // devolverá null de forma graciosa e a aplicação usará o provedor de fallback OSM.
  const garantirGoogleMapsPronto = async (): Promise<boolean> => {
    const pronto = () => {
      const google = (window as any).google
      return !!(google?.maps && typeof google.maps.Map === 'function')
    }
    if (pronto()) return true
    try {
      await loadGoogleMapsScript()
    } catch (err) {
      console.warn('Aviso ao carregar a Google Maps JS API:', err)
      return false
    }
    for (let tentativa = 0; tentativa < 40; tentativa++) {
      if (pronto()) return true
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return false
  }

  // Geocodifica um endereço em Cambé - PR via Google Geocoder e devolve a posição (ou null).
  // Nunca lança erro: qualquer falha (REQUEST_DENIED, OVER_QUERY_LIMIT, ZERO_RESULTS)
  // vira null para seguir direto ao provedor de geocodificação complementar.
  const geocodeEnderecoCambe = (endereco: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      try {
        const google = (window as any).google
        if (!google?.maps?.Geocoder || typeof google.maps.Geocoder !== 'function') {
          resolve(null)
          return
        }
        const geocoder = new google.maps.Geocoder()
        const request: any = {
          address: endereco,
          componentRestrictions: { country: 'BR' },
        }
        if (typeof google.maps.LatLngBounds === 'function') {
          request.bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(CAMBE_BOUNDS_BUSCA.south, CAMBE_BOUNDS_BUSCA.west),
            new google.maps.LatLng(CAMBE_BOUNDS_BUSCA.north, CAMBE_BOUNDS_BUSCA.east),
          )
        }
        geocoder.geocode(request, (results: any, status: any) => {
          try {
            if (status !== 'OK' || !Array.isArray(results) || results.length === 0) {
              resolve(null)
              return
            }
            // Prefere resultados ROOFTOP (número exato) sobre aproximações
            const rank = (r: any) =>
              r?.geometry?.location_type === 'ROOFTOP'
                ? 0
                : r?.geometry?.location_type === 'GEOMETRIC'
                  ? 1
                  : 2
            const ordenados = [...results].sort((a: any, b: any) => rank(a) - rank(b))
            for (const result of ordenados) {
              const loc = result?.geometry?.location
              if (!loc || typeof loc.lat !== 'function' || typeof loc.lng !== 'function') continue
              const lat = loc.lat()
              const lng = loc.lng()
              if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
              // Validação: somente coordenadas dentro do município de Cambé - PR
              if (!estaDentroDeCambe(lat, lng)) continue
              resolve({ lat, lng })
              return
            }
            resolve(null)
          } catch (err) {
            console.warn('Aviso ao processar resultado do Google Geocoder:', err)
            resolve(null)
          }
        })
      } catch (err) {
        console.warn('Aviso na geocodificação Google:', err)
        resolve(null)
      }
    })
  }

  // Geocodificação híbrida ultra-resiliente para Cambé:
  // Tenta Google primeiro (se Geocoding API estiver ativa na chave), e em seguida
  // OSM Nominatim estruturado e por variações de logradouro.
  // Garante que todo logradouro válido de Cambé retorne coordenadas.
  const geocodificarLogradouroCambe = async (
    logradouro: string,
    numero?: string,
    bairro?: string,
    cep?: string,
  ): Promise<{ lat: number; lng: number; fonte: 'google' | 'osm' | 'centroide' } | null> => {
    const logradouroBase = (logradouro || '').trim()
    const numeroLimpo = (numero || '').trim()
    const temNumero = !!numeroLimpo && !/^s\s*\/?\s*n$/i.test(numeroLimpo)
    const bairroLimpo = (bairro || '').trim()
    const cepLimpo = (cep || '').replace(/\D/g, '')

    // 1) Tentativa via Google Geocoder (quando a chave possui Geocoding habilitada)
    const google = (window as any).google
    if (google?.maps?.Geocoder) {
      const googleEstrategias: string[] = []
      if (logradouroBase && temNumero) {
        googleEstrategias.push(
          `${logradouroBase}, ${numeroLimpo}, ${bairroLimpo}, Cambé, PR, Brasil`,
        )
      }
      if (logradouroBase && bairroLimpo) {
        googleEstrategias.push(`${logradouroBase}, ${bairroLimpo}, Cambé, PR, Brasil`)
      }
      if (logradouroBase) {
        googleEstrategias.push(`${logradouroBase}, Cambé, PR, Brasil`)
      }
      if (cepLimpo) {
        googleEstrategias.push(`${cepLimpo}, Cambé, PR, Brasil`)
      }

      for (const query of googleEstrategias) {
        const ponto = await geocodeEnderecoCambe(query)
        if (ponto) {
          return { ...ponto, fonte: 'google' }
        }
      }
    }

    // 2) Provedor OpenStreetMap / Nominatim (altamente eficaz e resiliente no Brasil)
    const pontoOSM = await geocodificarOSM(logradouroBase, numeroLimpo, bairroLimpo)
    if (pontoOSM) {
      return { ...pontoOSM, fonte: 'osm' }
    }

    // 3) Fallback geográfico municipal: centro urbano de Cambé - PR
    // Se o logradouro foi comprovado em Cambé pelo ViaCEP mas nenhuma base externa tem a rua mapeada,
    // posiciona no centro urbano de Cambé para nunca deixar latitude/longitude nulas.
    return {
      lat: CAMBE_DEFAULT_COORDS.lat,
      lng: CAMBE_DEFAULT_COORDS.lng,
      fonte: 'centroide',
    }
  }

  // Busca do CEP: ViaCEP valida a localidade (Cambé) e fornece o endereço;
  // a geocodificação híbrida (Google / OpenStreetMap) posiciona o mapa e preenche lat/lng.
  const handleCepSearch = async (cepToSearch: string) => {
    const cleanCep = cepToSearch.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      setCepError('Digite o CEP completo (8 dígitos).')
      return
    }

    setCepError(null)
    setSearchingCep(true)

    try {
      // 0) Inicia o carregamento do mapa em paralelo se ainda não foi carregado
      garantirGoogleMapsPronto().catch(() => {
        /* noop */
      })

      // 1) ViaCEP: base oficial dos Correios — valida a cidade e devolve o endereço do CEP
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      if (!res.ok) {
        throw new Error(`Falha ao consultar o CEP (${res.status}).`)
      }
      const data = await res.json()

      if (data.erro || !data.localidade) {
        setCepError('CEP não encontrado na base dos Correios. Verifique o número digitado.')
        return
      }

      const cidadeNorm = normalizarTexto(data.localidade)
      if (cidadeNorm !== 'cambe' || (data.uf || '').toUpperCase() !== 'PR') {
        setCepError(
          `Somente CEPs da cidade de CAMBÉ (PR) são aceitos. O CEP informado pertence a "${data.localidade} - ${data.uf}".`,
        )
        return
      }

      // 2) É Cambé: preenche logradouro/bairro/cidade/UF a partir do ViaCEP
      const logradouroViaCep = data.logradouro || ''
      const bairroViaCep = data.bairro || ''
      const numeroAtual = (valueRef.current.numero || '').trim()
      const logradouroBase = logradouroViaCep || (valueRef.current.logradouro || '').trim()
      const bairroBase = bairroViaCep || (valueRef.current.bairro || '').trim()

      // 3) Geocodificação resiliente: Google -> OpenStreetMap -> centro urbano de Cambé
      const ponto = await geocodificarLogradouroCambe(
        logradouroBase,
        numeroAtual,
        bairroBase,
        cleanCep,
      )

      // 4) Latitude e Longitude garantidas (arredondadas em 6 casas decimais)
      const latFinal = ponto ? Number(ponto.lat.toFixed(6)) : CAMBE_DEFAULT_COORDS.lat
      const lngFinal = ponto ? Number(ponto.lng.toFixed(6)) : CAMBE_DEFAULT_COORDS.lng

      const updatedData: EnderecoUnidadeData = {
        ...valueRef.current,
        cep: formatCep(cleanCep),
        logradouro: logradouroViaCep || valueRef.current.logradouro,
        bairro: bairroViaCep || valueRef.current.bairro,
        cidade: 'Cambé',
        estado_uf: 'PR',
        latitude: latFinal,
        longitude: lngFinal,
      }
      onChange(updatedData)

      if (onLocationSummaryChange) {
        const parts = [
          updatedData.logradouro,
          updatedData.numero ? `nº ${updatedData.numero}` : '',
          updatedData.bairro,
          `${updatedData.cidade || 'Cambé'} - ${updatedData.estado_uf || 'PR'}`,
        ].filter(Boolean)
        if (parts.length > 0) {
          onLocationSummaryChange(parts.join(', '))
        }
      }

      // 5) Atualiza mapa e marcador
      if (mapInstanceRef.current && markerInstanceRef.current) {
        const zoom = ponto?.fonte === 'google' || ponto?.fonte === 'osm' ? 18 : 15
        focusMapOnPoint(latFinal, lngFinal, zoom)
      } else {
        // Se o mapa ainda estiver terminando de carregar, atualiza assim que disponível
        garantirGoogleMapsPronto().then((ok) => {
          if (ok) {
            focusMapOnPoint(latFinal, lngFinal, 18)
          }
        })
      }

      const mensagemSucesso =
        ponto?.fonte === 'centroide'
          ? `Endereço em Cambé - PR identificado. Posição aproximada centralizada no município; você pode ajustar o marcador no mapa.`
          : `Endereço localizado em Cambé - PR com sucesso! (Lat ${latFinal}, Lng ${lngFinal})`

      setAddressSuccessMsg(mensagemSucesso)
      setTimeout(() => setAddressSuccessMsg(null), 5000)
    } catch (err: any) {
      setCepError(err?.message || 'Erro ao pesquisar CEP. Tente novamente.')
    } finally {
      setSearchingCep(false)
    }
  }

  // Manipulador da mudança no input do CEP
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value)
    onChange({ ...value, cep: formatted })
    setCepError(null)

    // Se preencheu os 8 dígitos (9 caracteres com traço), dispara a busca automaticamente
    const digits = formatted.replace(/\D/g, '')
    if (digits.length === 8) {
      handleCepSearch(digits)
    }
  }

  // Busca secundária por ponto de referência ou logradouro (restrita a Cambé)
  const handleRefSearch = async () => {
    const termo = refSearchText.trim()
    if (!termo) return

    setSearchingRef(true)
    setCepError(null)

    try {
      // 1) Tentativa via Google Geocoder
      let achouGoogle = false
      const google = (window as any).google
      if (google?.maps?.Geocoder) {
        const resultadoGoogle: any = await new Promise((resolve) => {
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode(
            {
              address: `${termo}, Cambé, PR, Brasil`,
              bounds: getCambeBounds(),
              componentRestrictions: { country: 'BR', administrativeArea: 'PR' },
            },
            (results: any, status: any) => {
              if (status === 'OK' && results && results.length > 0) {
                resolve(results[0])
              } else {
                resolve(null)
              }
            },
          )
        })

        if (resultadoGoogle) {
          const ok = processGeocodingResult(resultadoGoogle, true)
          if (ok) {
            achouGoogle = true
          }
        }
      }

      if (achouGoogle) {
        setSearchingRef(false)
        return
      }

      // 2) Fallback para OpenStreetMap Nominatim
      const pontoOSM = await geocodificarNominatimConsulta({
        q: `${termo}, Cambé, PR, Brasil`,
      })

      if (pontoOSM) {
        const roundedLat = Number(pontoOSM.lat.toFixed(6))
        const roundedLng = Number(pontoOSM.lng.toFixed(6))
        focusMapOnPoint(roundedLat, roundedLng, 18)
        onChange({
          ...valueRef.current,
          latitude: roundedLat,
          longitude: roundedLng,
        })
        setAddressSuccessMsg(`Referência "${termo}" localizada em Cambé - PR!`)
        setTimeout(() => setAddressSuccessMsg(null), 4000)
      } else {
        setCepError(
          `Ponto de referência ou logradouro "${termo}" não localizado em Cambé - PR. Tente outro termo ou ajuste o marcador manualmente no mapa.`,
        )
      }
    } catch (err: any) {
      setCepError('Falha ao localizar logradouro/referência.')
    } finally {
      setSearchingRef(false)
    }
  }

  // Geocodifica o endereço completo imediatamente quando o usuário altera o Número do logradouro.
  // Move o marcador para a posição exata daquele número (ROOFTOP quando disponível),
  // atualizando Latitude/Longitude com 6 casas decimais. Restrito à cidade de Cambé (PR).
  const handleNumeroGeocode = async (currentValue: EnderecoUnidadeData) => {
    const numeroTrim = (currentValue.numero || '').trim()

    // Cancela qualquer busca HTTP anterior em andamento
    if (numeroAbortControllerRef.current) {
      numeroAbortControllerRef.current.abort()
    }
    const abortController = new AbortController()
    numeroAbortControllerRef.current = abortController

    // Incrementa o identificador sequencial da busca atual
    const thisRequestId = ++numeroRequestIdRef.current

    // Sem número (vazio ou S/N): mantém o último posicionamento válido, apenas limpa avisos
    if (!numeroTrim || /^s\s*\/?\s*n$/i.test(numeroTrim)) {
      setCepError(null)
      setSearchingNumero(false)
      lastGeocodedNumeroKeyRef.current = null
      return
    }

    // Endereço mínimo para uma busca coerente: logradouro + cidade/UF
    const logradouroTrim = (currentValue.logradouro || '').trim()
    const cidadeAtual = currentValue.cidade || 'Cambé'
    const ufAtual = currentValue.estado_uf || 'PR'
    const bairroAtual = currentValue.bairro?.trim() || ''

    if (!logradouroTrim) {
      setCepError('Informe o Logradouro antes do Número para posicionar o mapa no endereço exato.')
      setSearchingNumero(false)
      return
    }

    // Verifica se este número/endereço já foi geocodificado com sucesso (evita chamadas redundantes)
    const geocodeKey = `${normalizarTexto(logradouroTrim)}|${numeroTrim.toLowerCase()}|${normalizarTexto(bairroAtual)}|${normalizarTexto(cidadeAtual)}`
    if (lastGeocodedNumeroKeyRef.current === geocodeKey) {
      setSearchingNumero(false)
      return
    }

    setSearchingNumero(true)
    setCepError(null)

    try {
      // 1) Tenta Google Geocoder
      let ponto: { lat: number; lng: number } | null = null
      const google = (window as any).google
      if (google?.maps?.Geocoder) {
        const enderecoCompleto = [
          `${logradouroTrim}, ${numeroTrim}`,
          bairroAtual,
          `${cidadeAtual}`,
          ufAtual,
          'Brasil',
        ]
          .filter(Boolean)
          .join(', ')

        ponto = await geocodeEnderecoCambe(enderecoCompleto)
      }

      // Se uma busca mais recente começou durante a requisição Google, descarta este resultado
      if (thisRequestId !== numeroRequestIdRef.current || abortController.signal.aborted) {
        return
      }

      // 2) Fallback para OpenStreetMap se Google não devolver coordenadas
      if (!ponto) {
        ponto = await geocodificarOSM(
          logradouroTrim,
          numeroTrim,
          bairroAtual,
          abortController.signal,
        )
      }

      // Verifica novamente se esta requisição ainda é a mais recente
      if (thisRequestId !== numeroRequestIdRef.current || abortController.signal.aborted) {
        return
      }

      if (ponto) {
        const roundedLat = Number(ponto.lat.toFixed(6))
        const roundedLng = Number(ponto.lng.toFixed(6))
        focusMapOnPoint(roundedLat, roundedLng, 18)

        // Preserva o número e logradouro digitados pelo usuário (não sobrescreve)
        const updatedData: EnderecoUnidadeData = {
          ...valueRef.current,
          numero: currentValue.numero,
          latitude: roundedLat,
          longitude: roundedLng,
        }
        onChange(updatedData)

        if (onLocationSummaryChange) {
          const parts = [
            updatedData.logradouro,
            updatedData.numero ? `nº ${updatedData.numero}` : '',
            updatedData.bairro,
            `${updatedData.cidade || 'Cambé'} - ${updatedData.estado_uf || 'PR'}`,
          ].filter(Boolean)
          if (parts.length > 0) {
            onLocationSummaryChange(parts.join(', '))
          }
        }

        lastGeocodedNumeroKeyRef.current = geocodeKey
        setAddressSuccessMsg(`Número ${numeroTrim} localizado em Cambé - PR!`)
        setTimeout(() => setAddressSuccessMsg(null), 3500)
      } else {
        // Se não achou o número específico, mantém o logradouro sem apagar as coordenadas
        console.warn(
          `Número ${numeroTrim} não diferenciado no mapa; mantida a coordenada do logradouro.`,
        )
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        console.warn('Falha ao geocodificar o número informado:', err)
      }
    } finally {
      if (thisRequestId === numeroRequestIdRef.current) {
        setSearchingNumero(false)
      }
    }
  }

  // Ao alterar o campo "Número", dispara a geocodificação imediatamente
  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoNumero = e.target.value
    const novoValue: EnderecoUnidadeData = { ...value, numero: novoNumero }
    valueRef.current = novoValue
    onChange(novoValue)
    setCepError(null)

    // Dispara a geocodificação imediatamente ao trocar o número
    handleNumeroGeocode(novoValue)
  }

  const cidadesDisponiveis = useMemo(() => {
    const lista = CIDADES_POR_UF[value.estado_uf] || []
    if (value.cidade && !lista.includes(value.cidade)) {
      return [value.cidade, ...lista]
    }
    return lista.length > 0 ? lista : ['Cambé']
  }, [value.estado_uf, value.cidade])

  return (
    <div className="space-y-4 pt-2">
      {/* Cabeçalho da seção com selo Google Maps Platform */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Localização e Endereço da Unidade</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Google Maps Platform</span>
        </div>
      </div>

      {/* Cartão destacado com CEP */}
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="cep_unidade"
            className="text-xs font-bold uppercase tracking-wider text-blue-950"
          >
            CEP da Unidade de Ensino <span className="text-destructive">*</span>
          </Label>
          {searchingCep && (
            <span className="flex items-center gap-1 text-xs text-blue-700">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando em Cambé...
            </span>
          )}
        </div>

        <div className="relative">
          <Input
            id="cep_unidade"
            value={value.cep || ''}
            onChange={handleCepChange}
            onBlur={() => {
              const digits = (value.cep || '').replace(/\D/g, '')
              if (digits.length === 8) {
                handleCepSearch(digits)
              }
            }}
            placeholder="00000-000 (digite o CEP para preencher o endereço)"
            maxLength={9}
            disabled={disabled || searchingCep}
            className="bg-white border-blue-200 text-slate-900 placeholder:text-slate-400 font-mono text-sm focus-visible:ring-blue-500"
          />
        </div>

        {/* Mensagem de ajuda / restrição Cambé */}
        <p className="text-xs text-amber-700 font-medium">
          Atenção: a busca por CEP é restrita e aceita exclusivamente endereços da cidade de CAMBÉ
          (PR).
        </p>

        {/* Mensagens de erro e sucesso do CEP */}
        {cepError && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{cepError}</span>
          </div>
        )}
        {addressSuccessMsg && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{addressSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Mapa do Google Maps interativo */}
      <div className="space-y-1.5">
        <div className="relative w-full h-[230px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Mensagem flutuante tipo tooltip como na imagem de referência */}
          <div className="absolute bottom-6 left-3 z-10 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 text-white text-[11px] font-medium shadow-lg backdrop-blur-sm">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Clique no mapa ou arraste o marcador para ajustar o local em Cambé</span>
            </div>
          </div>

          {!mapsLoaded && !mapsError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-20 text-slate-600 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Carregando mapa interativo do Google Maps...</span>
            </div>
          )}

          {mapsError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/90 z-20 text-red-700 text-xs gap-2 p-4 text-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span>{mapsError}</span>
            </div>
          )}
        </div>

        {/* Linha Latitude / Longitude */}
        <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5 px-1 font-mono">
          <span>
            Latitude:{' '}
            <strong className="text-slate-900">
              {value.latitude !== null && value.latitude !== undefined ? value.latitude : '—'}
            </strong>
          </span>
          <span className="text-slate-400">•</span>
          <span>
            Longitude:{' '}
            <strong className="text-slate-900">
              {value.longitude !== null && value.longitude !== undefined ? value.longitude : '—'}
            </strong>
          </span>
        </div>
      </div>

      {/* Linha de busca secundária */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span>Opção secundária: buscar por ponto de referência ou logradouro no mapa</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={refSearchText}
            onChange={(e) => setRefSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleRefSearch()
              }
            }}
            placeholder="Digite logradouro, praça ou referência em Cambé..."
            disabled={disabled || searchingRef}
            className="text-sm bg-slate-50/60"
          />
          <Button
            type="button"
            onClick={handleRefSearch}
            disabled={disabled || searchingRef || !refSearchText.trim()}
            className="shrink-0 bg-[#0B2545] hover:bg-[#133A68] text-white"
          >
            {searchingRef ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Localizar'}
          </Button>
        </div>
      </div>

      {/* Campos de endereço em Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
        {/* Logradouro * */}
        <div className="sm:col-span-8 space-y-1.5">
          <Label htmlFor="logradouro" className="text-xs font-semibold text-slate-700">
            Logradouro <span className="text-destructive">*</span>
          </Label>
          <Input
            id="logradouro"
            value={value.logradouro || ''}
            onChange={(e) => {
              const novo = e.target.value
              onChange({ ...value, logradouro: novo })
            }}
            placeholder="Rua, Avenida, Praça..."
            disabled={disabled}
            className="text-sm"
          />
        </div>

        {/* Número * — ao digitar/alterar, geocodifica o endereço completo e move o marcador */}
        <div className="sm:col-span-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="numero" className="text-xs font-semibold text-slate-700">
              Número <span className="text-destructive">*</span>
            </Label>
            {searchingNumero && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-blue-700">
                <Loader2 className="w-3 h-3 animate-spin" /> Localizando nº...
              </span>
            )}
          </div>
          <Input
            id="numero"
            value={value.numero || ''}
            onChange={handleNumeroChange}
            placeholder="Ex: 120 ou S/N"
            disabled={disabled}
            className="text-sm"
          />
        </div>

        {/* Bairro * */}
        <div className="sm:col-span-5 space-y-1.5">
          <Label htmlFor="bairro" className="text-xs font-semibold text-slate-700">
            Bairro <span className="text-destructive">*</span>
          </Label>
          <Input
            id="bairro"
            value={value.bairro || ''}
            onChange={(e) => onChange({ ...value, bairro: e.target.value })}
            placeholder="Bairro"
            disabled={disabled}
            className="text-sm"
          />
        </div>

        {/* Estado (UF) * */}
        <div className="sm:col-span-3 space-y-1.5">
          <Label htmlFor="estado_uf" className="text-xs font-semibold text-slate-700">
            Estado (UF) <span className="text-destructive">*</span>
          </Label>
          <Select
            value={value.estado_uf || 'PR'}
            onValueChange={(uf) => {
              // Dependência dinâmica: ao mudar o estado, atualiza as opções de cidade e redefine a seleção
              const cidades = CIDADES_POR_UF[uf] || []
              const cidadeValida = uf === 'PR' ? 'Cambé' : cidades[0] || ''
              const novoEndereco = {
                ...value,
                estado_uf: uf,
                cidade: cidadeValida,
              }
              onChange(novoEndereco)
              if (onLocationSummaryChange && novoEndereco.logradouro) {
                const parts = [
                  novoEndereco.logradouro,
                  novoEndereco.numero ? `nº ${novoEndereco.numero}` : '',
                  novoEndereco.bairro,
                  `${cidadeValida} - ${uf}`,
                ].filter(Boolean)
                onLocationSummaryChange(parts.join(', '))
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="estado_uf" className="text-sm bg-white">
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_BRASIL.map((item) => (
                <SelectItem key={item.uf} value={item.uf}>
                  {item.uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cidade * */}
        <div className="sm:col-span-4 space-y-1.5">
          <Label htmlFor="cidade" className="text-xs font-semibold text-slate-700">
            Cidade <span className="text-destructive">*</span>
          </Label>
          <Select
            value={
              cidadesDisponiveis.includes(value.cidade) ? value.cidade : cidadesDisponiveis[0] || ''
            }
            onValueChange={(cid) => {
              const novoEndereco = { ...value, cidade: cid }
              onChange(novoEndereco)
              if (onLocationSummaryChange && novoEndereco.logradouro) {
                const parts = [
                  novoEndereco.logradouro,
                  novoEndereco.numero ? `nº ${novoEndereco.numero}` : '',
                  novoEndereco.bairro,
                  `${cid} - ${novoEndereco.estado_uf || 'PR'}`,
                ].filter(Boolean)
                onLocationSummaryChange(parts.join(', '))
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger id="cidade" className="text-sm bg-white">
              <SelectValue placeholder="Selecione a cidade..." />
            </SelectTrigger>
            <SelectContent>
              {cidadesDisponiveis.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
