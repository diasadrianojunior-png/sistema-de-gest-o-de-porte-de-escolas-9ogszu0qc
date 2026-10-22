import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { loadGoogleMapsScript, getGoogleMapsApiKey } from '@/lib/google-maps-loader'
import {
  consultarBrasilApi,
  consultarViaCep,
  geocodificarCepGoogle,
  geocodificarEnderecoGoogle,
  geocodificarComNominatim,
  isCoordinateInsideCambeBounds,
} from '@/services/geocoding-service'

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

// Cidade e Estado fixos permitidos
export const CIDADE_PERMITIDA = 'Cambé'
export const ESTADO_PERMITIDO = 'PR'

// Centro padrão: Cambé - PR
export const CAMBE_DEFAULT_COORDS = { lat: -23.2758, lng: -51.2785 }

// Estilos do mapa do Google para ocultar POIs (pontos de interesse) comerciais
export const GOOGLE_MAPS_POI_HIDDEN_STYLES = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
]

// Normaliza texto para comparações (minúsculas, sem acentos)
export const normalizarTexto = (texto: string): string =>
  (texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

// Formatação com máscara de CEP (00000-000)
export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

// Extrai cidade, estado, logradouro, número, bairro e CEP dos address_components do Google Maps
export function extrairComponentesGoogle(addressComponents: any[] | undefined) {
  let postalCode = ''
  let route = ''
  let streetNumber = ''
  let neighborhood = ''
  let city = ''
  let stateUf = ''

  if (Array.isArray(addressComponents)) {
    for (const comp of addressComponents) {
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
        city = comp.long_name || comp.short_name || ''
      } else if (types.includes('administrative_area_level_1')) {
        stateUf = comp.short_name || comp.long_name || ''
      }
    }
  }

  return { postalCode, route, streetNumber, neighborhood, city, stateUf }
}

// Verifica se os componentes pertencem a Cambé
export function isCidadeCambe(city: string, stateUf?: string): boolean {
  const cNorm = normalizarTexto(city)
  const isCambeCity = cNorm === 'cambe'
  if (stateUf) {
    const sNorm = normalizarTexto(stateUf)
    return isCambeCity && (sNorm === 'pr' || sNorm === 'parana')
  }
  return isCambeCity
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
  const cambeBoundsRef = useRef<any>(null)

  // Guarda sempre a última coordenada válida para reversão imediata de cliques/arrastes fora dos limites
  const lastValidCoordsRef = useRef<{ lat: number; lng: number }>({
    lat: value.latitude ?? CAMBE_DEFAULT_COORDS.lat,
    lng: value.longitude ?? CAMBE_DEFAULT_COORDS.lng,
  })

  // Guarda último CEP válido confirmado
  const lastValidCepRef = useRef<string>(value.cep || '')

  // Referência do valor atual para evitar stale closures
  const valueRef = useRef<EnderecoUnidadeData>(value)
  useEffect(() => {
    valueRef.current = value
    if (value.latitude !== null && value.longitude !== null) {
      lastValidCoordsRef.current = { lat: value.latitude, lng: value.longitude }
    }
  }, [value])

  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [mapsError, setMapsError] = useState<string | null>(null)
  const [authFailure, setAuthFailure] = useState(false)

  const [searchingCep, setSearchingCep] = useState(false)
  const [searchingNumero, setSearchingNumero] = useState(false)
  const [debouncingGeocode, setDebouncingGeocode] = useState(false)

  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null)

  // Timer para debounce na edição de logradouro/bairro (~600ms)
  const debounceTimerRef = useRef<any>(null)

  // Limpa feedback de sucesso após delay
  const notifySuccess = useCallback((msg: string) => {
    setFeedbackSuccess(msg)
    setFeedbackError(null)
    setTimeout(() => {
      setFeedbackSuccess((prev) => (prev === msg ? null : prev))
    }, 4500)
  }, [])

  const notifyError = useCallback((msg: string) => {
    setFeedbackError(msg)
    setFeedbackSuccess(null)
  }, [])

  // REGRA 4: Escuta o evento global gm_authFailure sem derrubar a tela
  useEffect(() => {
    const handleAuthFailure = () => {
      console.warn('Google Maps: falha na autenticação da API (gm_authFailure).')
      setAuthFailure(true)
      notifyError(
        'Falha de autenticação na API do Google Maps (chave inválida ou restrição). O preenchimento manual continua disponível.',
      )
    }

    const previousAuthFailure = (window as any).gm_authFailure
    ;(window as any).gm_authFailure = handleAuthFailure
    window.addEventListener('gm_authFailure', handleAuthFailure)

    return () => {
      window.removeEventListener('gm_authFailure', handleAuthFailure)
      if (previousAuthFailure) {
        ;(window as any).gm_authFailure = previousAuthFailure
      }
    }
  }, [notifyError])

  // Carregamento resiliente do script do Google Maps
  useEffect(() => {
    let isMounted = true
    const key = getGoogleMapsApiKey()
    if (!key) {
      setMapsError(
        'Chave da API do Google Maps não configurada no ambiente. Você pode preencher os campos de endereço manualmente.',
      )
      return
    }

    loadGoogleMapsScript()
      .then(() => {
        if (isMounted) {
          setMapsLoaded(true)
          setMapsError(null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Aviso ao carregar a Google Maps JS API:', err)
          setMapsError(
            'Não foi possível carregar a API do Google Maps no momento. O preenchimento manual continua disponível.',
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Geocodifica a cidade de Cambé para obter os bounds reais do município e aplicá-los
  const carregarBoundsCambe = useCallback((): Promise<any> => {
    return new Promise((resolve) => {
      if (cambeBoundsRef.current) {
        resolve(cambeBoundsRef.current)
        return
      }
      try {
        const google = (window as any).google
        if (!google?.maps?.Geocoder) {
          resolve(null)
          return
        }
        const geocoder = new google.maps.Geocoder()
        geocoder.geocode(
          {
            address: 'Cambé, Paraná, Brasil',
            componentRestrictions: { country: 'BR', administrativeArea: 'PR' },
          },
          (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              const bounds = results[0].geometry?.viewport || results[0].geometry?.bounds || null
              if (bounds) {
                cambeBoundsRef.current = bounds
                resolve(bounds)
                return
              }
            }
            resolve(null)
          },
        )
      } catch (err) {
        console.warn('Erro ao obter bounds de Cambé:', err)
        resolve(null)
      }
    })
  }, [])

  // Reverse geocoding de uma coordenada para verificar se é Cambé e obter o endereço
  const reverseGeocodeCoord = useCallback(
    (
      lat: number,
      lng: number,
    ): Promise<{
      isCambe: boolean
      result?: any
      cityName?: string
      stateName?: string
      errorMessage?: string
    }> => {
      return new Promise((resolve) => {
        try {
          const google = (window as any).google
          if (!google?.maps?.Geocoder) {
            resolve({
              isCambe: true, // Se Geocoder indisponível, não bloqueia
            })
            return
          }
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              const comp = extrairComponentesGoogle(results[0].address_components)
              const isCambe = isCidadeCambe(comp.city, comp.stateUf)
              resolve({
                isCambe,
                result: results[0],
                cityName: comp.city,
                stateName: comp.stateUf,
                errorMessage: isCambe
                  ? undefined
                  : `Só é possível selecionar endereços na cidade Cambé. O ponto selecionado pertence a "${comp.city || 'Outro município'} - ${comp.stateUf}".`,
              })
            } else {
              // Se status ZERO_RESULTS ou erro de rede, verifica se pelo menos está dentro dos bounds de Cambé
              if (cambeBoundsRef.current && typeof cambeBoundsRef.current.contains === 'function') {
                const latLng = new google.maps.LatLng(lat, lng)
                const inside = cambeBoundsRef.current.contains(latLng)
                resolve({
                  isCambe: inside,
                  errorMessage: inside
                    ? undefined
                    : 'Só é possível selecionar endereços na cidade Cambé.',
                })
                return
              }
              resolve({ isCambe: true })
            }
          })
        } catch (err) {
          console.warn('Falha no reverse geocode:', err)
          resolve({ isCambe: true })
        }
      })
    },
    [],
  )

  // Reverte a posição do marcador para a última coordenada válida
  const reverterMarcador = useCallback(() => {
    const google = (window as any).google
    const lastValid = lastValidCoordsRef.current
    if (markerInstanceRef.current && lastValid) {
      markerInstanceRef.current.setPosition(lastValid)
    }
    if (mapInstanceRef.current && lastValid && google?.maps) {
      mapInstanceRef.current.panTo(lastValid)
    }
  }, [])

  // Posiciona o marcador e atualiza o mapa
  const posicionarMarcadorNoPonto = useCallback((lat: number, lng: number, zoom = 16) => {
    const roundedLat = Number(lat.toFixed(6))
    const roundedLng = Number(lng.toFixed(6))
    lastValidCoordsRef.current = { lat: roundedLat, lng: roundedLng }

    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition({ lat: roundedLat, lng: roundedLng })
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: roundedLat, lng: roundedLng })
      mapInstanceRef.current.setZoom(zoom)
    }
  }, [])

  // Propaga resumo de localização para o formulário mestre se houver listener
  const emitLocationSummary = useCallback(
    (data: EnderecoUnidadeData) => {
      if (!onLocationSummaryChange) return
      const parts = [
        data.logradouro,
        data.numero ? `nº ${data.numero}` : '',
        data.bairro,
        `${data.cidade || CIDADE_PERMITIDA} - ${data.estado_uf || ESTADO_PERMITIDO}`,
      ].filter(Boolean)
      if (parts.length > 0) {
        onLocationSummaryChange(parts.join(', '))
      }
    },
    [onLocationSummaryChange],
  )

  // Trata clique no mapa ou arraste do marcador (REGRA 2 & REGRA 5)
  const handleMapPositionChange = useCallback(
    async (lat: number, lng: number) => {
      if (disabled) return
      const roundedLat = Number(lat.toFixed(6))
      const roundedLng = Number(lng.toFixed(6))

      // 1. Verifica limites imediatos via cambeBoundsRef se disponível
      const google = (window as any).google
      if (cambeBoundsRef.current && google?.maps?.LatLng) {
        const pt = new google.maps.LatLng(roundedLat, roundedLng)
        if (
          typeof cambeBoundsRef.current.contains === 'function' &&
          !cambeBoundsRef.current.contains(pt)
        ) {
          reverterMarcador()
          notifyError('Só é possível selecionar endereços na cidade Cambé.')
          return
        }
      }

      // 2. Reverse geocoding para confirmar cidade Cambé
      const reverse = await reverseGeocodeCoord(roundedLat, roundedLng)
      if (!reverse.isCambe) {
        reverterMarcador()
        notifyError(reverse.errorMessage || 'Só é possível selecionar endereços na cidade Cambé.')
        return
      }

      // Válido: atualiza última coordenada válida
      posicionarMarcadorNoPonto(roundedLat, roundedLng, 16)
      setFeedbackError(null)

      // Se temos os dados do reverse geocoding, preenchemos os campos respeitando o número existente
      if (reverse.result) {
        const comp = extrairComponentesGoogle(reverse.result.address_components)
        const updated: EnderecoUnidadeData = {
          ...valueRef.current,
          cep: comp.postalCode ? formatCep(comp.postalCode) : valueRef.current.cep,
          logradouro: comp.route || valueRef.current.logradouro,
          bairro: comp.neighborhood || valueRef.current.bairro,
          cidade: CIDADE_PERMITIDA,
          estado_uf: ESTADO_PERMITIDO,
          // Preserva o número digitado pelo usuário
          numero: valueRef.current.numero,
          latitude: roundedLat,
          longitude: roundedLng,
        }
        onChange(updated)
        emitLocationSummary(updated)
        notifySuccess('Ponto posicionado em Cambé - PR com sucesso!')
      } else {
        const updated: EnderecoUnidadeData = {
          ...valueRef.current,
          latitude: roundedLat,
          longitude: roundedLng,
          cidade: CIDADE_PERMITIDA,
          estado_uf: ESTADO_PERMITIDO,
        }
        onChange(updated)
        emitLocationSummary(updated)
      }
    },
    [
      disabled,
      reverterMarcador,
      notifyError,
      reverseGeocodeCoord,
      posicionarMarcadorNoPonto,
      onChange,
      emitLocationSummary,
      notifySuccess,
    ],
  )

  // Inicialização do Google Maps (REGRA 2 & REGRA 5)
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const google = (window as any).google
    if (!google?.maps || typeof google.maps.Map !== 'function') {
      setMapsError(
        'A API do Google Maps ainda não está pronta. O formulário pode ser preenchido manualmente.',
      )
      return
    }

    try {
      const hasCoords = value.latitude !== null && value.longitude !== null
      const initialLat = value.latitude ?? CAMBE_DEFAULT_COORDS.lat
      const initialLng = value.longitude ?? CAMBE_DEFAULT_COORDS.lng
      const initialZoom = hasCoords ? 16 : 13

      // REGRA 5: styles com featureType: 'poi' invisível, sem mapType/streetView, zoom/fullscreen ativos
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: initialLat, lng: initialLng },
        zoom: initialZoom,
        styles: GOOGLE_MAPS_POI_HIDDEN_STYLES,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      })

      mapInstanceRef.current = map

      const marker = new google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map: map,
        draggable: !disabled,
        animation: google.maps.Animation.DROP,
        title: 'Local da Unidade Escolar (Cambé - PR)',
      })

      markerInstanceRef.current = marker

      // REGRA 5: clique no mapa posiciona o pin
      map.addListener('click', (event: any) => {
        if (!event?.latLng) return
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        handleMapPositionChange(lat, lng)
      })

      // REGRA 5: marcador arrastável
      marker.addListener('dragend', () => {
        const pos = marker.getPosition()
        if (pos) {
          handleMapPositionChange(pos.lat(), pos.lng())
        }
      })

      // REGRA 2: geocodifica Cambé para obter bounds/viewport e guardá-los
      carregarBoundsCambe().catch((err) => {
        console.warn('Não foi possível carregar bounds de Cambé:', err)
      })
    } catch (err: any) {
      console.warn('Erro ao inicializar o mapa do Google Maps:', err)
      setMapsError(
        'Não foi possível inicializar o mapa interativo. O formulário continua utilizável com preenchimento manual.',
      )
    }
  }, [
    mapsLoaded,
    disabled,
    handleMapPositionChange,
    carregarBoundsCambe,
    value.latitude,
    value.longitude,
  ])

  // REGRA 1 & 2 — CEP como ponto de entrada principal:
  // Cascata resiliente com prioridade HTTP (independe de Geocoding API habilitada na chave do Google):
  // PASSO 1: BrasilAPI (https://brasilapi.com.br/api/cep/v2/{cep}) — dados textuais + coordenadas diretas.
  //          Se for Cambé/PR e tiver coordenadas válidas, usa imediatamente (caminho mais curto e comprovado).
  // PASSO 2: ViaCEP para dados textuais (se BrasilAPI falhar ou não trouxer logradouro) +
  //          geocodificação do logradouro PRIMEIRO no Nominatim/OSM (viewbox Cambé com bounded=1),
  //          e SÓ DEPOIS no Google Geocoder (com restrição de bounds de Cambé).
  // PASSO 3: Google Geocoder direto por postalCode como último recurso.
  // Diagnóstico visível em console.warn('[CEP] passo X: ...') e setSearchingCep(false) garantido via finally.
  const handleCepSearch = useCallback(
    async (cepDigits: string) => {
      const cleanCep = cepDigits.replace(/\D/g, '')
      if (cleanCep.length !== 8) {
        notifyError('Digite o CEP completo (8 dígitos).')
        return
      }

      setSearchingCep(true)
      const passosTentados: string[] = []

      try {
        // =========================================================================
        // PASSO 1: BrasilAPI v2 (Retorna logradouro, bairro, cidade/UF e coordenadas)
        // =========================================================================
        passosTentados.push('BrasilAPI')
        const brasilApiData = await consultarBrasilApi(cleanCep)

        if (brasilApiData) {
          const cidadeBrasilApi = brasilApiData.city || ''
          const ufBrasilApi = brasilApiData.state || ''

          // Valida estritamente se o CEP pertence a Cambé
          if (!isCidadeCambe(cidadeBrasilApi, ufBrasilApi)) {
            console.warn(
              `[CEP] passo 1 (BrasilAPI): CEP ${cleanCep} pertence a outra cidade: ${cidadeBrasilApi} - ${ufBrasilApi}`,
            )
            notifyError(
              `Só é possível selecionar endereços na cidade Cambé. O CEP informado pertence a "${cidadeBrasilApi || 'Outro município'} - ${ufBrasilApi}". Os dados anteriores foram preservados.`,
            )
            return
          }

          const logradouroBrasilApi = (brasilApiData.street || '').trim()
          const bairroBrasilApi = (brasilApiData.neighborhood || '').trim()

          // Verifica se a BrasilAPI já retornou coordenadas diretas válidas
          const coords = brasilApiData.location?.coordinates
          const rawLat = coords?.latitude ? parseFloat(String(coords.latitude)) : NaN
          const rawLng = coords?.longitude ? parseFloat(String(coords.longitude)) : NaN

          if (!isNaN(rawLat) && !isNaN(rawLng) && isCoordinateInsideCambeBounds(rawLat, rawLng)) {
            const lat6 = Number(rawLat.toFixed(6))
            const lng6 = Number(rawLng.toFixed(6))
            console.warn(
              `[CEP] passo 1 (BrasilAPI): sucesso direto com coordenadas (${lat6}, ${lng6}) para CEP ${cleanCep}`,
            )

            lastValidCepRef.current = formatCep(cleanCep)
            posicionarMarcadorNoPonto(lat6, lng6, 16)

            const updatedData: EnderecoUnidadeData = {
              cep: formatCep(cleanCep),
              logradouro: logradouroBrasilApi,
              numero: '',
              bairro: bairroBrasilApi,
              cidade: CIDADE_PERMITIDA,
              estado_uf: ESTADO_PERMITIDO,
              latitude: lat6,
              longitude: lng6,
            }

            onChange(updatedData)
            emitLocationSummary(updatedData)
            notifySuccess(
              `CEP localizado via BrasilAPI: ${logradouroBrasilApi ? logradouroBrasilApi + ' - ' : ''}Cambé - PR`,
            )
            return
          }

          console.warn(
            `[CEP] passo 1 (BrasilAPI): dados textuais recebidos (${logradouroBrasilApi || 'sem logradouro'}), mas sem coordenadas válidas. Buscando coordenadas via OSM/Google...`,
          )

          // Se BrasilAPI trouxe dados textuais mas sem coordenadas, tenta geocodificar o logradouro
          if (logradouroBrasilApi) {
            passosTentados.push('Nominatim/OSM (logradouro BrasilAPI)')
            const osmRes =
              (await geocodificarComNominatim(`${logradouroBrasilApi}, Cambé, PR, Brasil`)) ||
              (await geocodificarComNominatim(`${logradouroBrasilApi}, Cambé`))

            if (osmRes && isCoordinateInsideCambeBounds(osmRes.lat, osmRes.lng)) {
              console.warn(
                `[CEP] passo 1 (BrasilAPI + Nominatim): coordenadas resolvidas (${osmRes.lat}, ${osmRes.lng})`,
              )
              lastValidCepRef.current = formatCep(cleanCep)
              posicionarMarcadorNoPonto(osmRes.lat, osmRes.lng, 16)

              const updatedData: EnderecoUnidadeData = {
                cep: formatCep(cleanCep),
                logradouro: logradouroBrasilApi,
                numero: '',
                bairro: bairroBrasilApi,
                cidade: CIDADE_PERMITIDA,
                estado_uf: ESTADO_PERMITIDO,
                latitude: osmRes.lat,
                longitude: osmRes.lng,
              }

              onChange(updatedData)
              emitLocationSummary(updatedData)
              notifySuccess(
                `CEP localizado com sucesso: ${logradouroBrasilApi ? logradouroBrasilApi + ' - ' : ''}Cambé - PR`,
              )
              return
            }
          }
        } else {
          console.warn(`[CEP] passo 1 (BrasilAPI): não respondeu ou erro para CEP ${cleanCep}`)
        }

        // =========================================================================
        // PASSO 2: ViaCEP para dados textuais + Nominatim/OSM primeiro, depois Google
        // =========================================================================
        passosTentados.push('ViaCEP')
        const viaCepData = await consultarViaCep(cleanCep)

        if (viaCepData) {
          const cidadeViaCep = viaCepData.localidade || ''
          const ufViaCep = viaCepData.uf || ''

          // Validação estrita a Cambé - PR
          if (!isCidadeCambe(cidadeViaCep, ufViaCep)) {
            console.warn(
              `[CEP] passo 2 (ViaCEP): CEP ${cleanCep} pertence a outra cidade: ${cidadeViaCep} - ${ufViaCep}`,
            )
            notifyError(
              `Só é possível selecionar endereços na cidade Cambé. O CEP informado pertence a "${cidadeViaCep || 'Outro município'} - ${ufViaCep}". Os dados anteriores foram preservados.`,
            )
            return
          }

          const logradouroEncontrado = (viaCepData.logradouro || '').trim()
          const bairroEncontrado = (viaCepData.bairro || '').trim()

          let latEncontrada: number | null = null
          let lngEncontrada: number | null = null

          // 2.A: Tenta PRIMEIRO no Nominatim/OSM (comprovadamente funcional com viewbox Cambé bounded=1)
          if (logradouroEncontrado) {
            passosTentados.push('Nominatim/OSM')
            const osmRes =
              (await geocodificarComNominatim(`${logradouroEncontrado}, Cambé, PR, Brasil`)) ||
              (await geocodificarComNominatim(`${logradouroEncontrado}, Cambé`))

            if (osmRes && isCoordinateInsideCambeBounds(osmRes.lat, osmRes.lng)) {
              latEncontrada = osmRes.lat
              lngEncontrada = osmRes.lng
              console.warn(
                `[CEP] passo 2 (ViaCEP + Nominatim): logradouro localizado (${latEncontrada}, ${lngEncontrada})`,
              )
            } else {
              console.warn(
                `[CEP] passo 2 (ViaCEP + Nominatim): logradouro "${logradouroEncontrado}" não localizado no OSM`,
              )
            }
          }

          // 2.B: SÓ DEPOIS tenta no Google Geocoder (com bounds de Cambé)
          if (latEncontrada === null && logradouroEncontrado) {
            passosTentados.push('Google Geocoder (logradouro)')
            const queryCompleta = [
              logradouroEncontrado,
              bairroEncontrado,
              'Cambé',
              'Paraná',
              'Brasil',
            ]
              .filter(Boolean)
              .join(', ')
            const querySimples = [logradouroEncontrado, 'Cambé', 'Paraná', 'Brasil']
              .filter(Boolean)
              .join(', ')

            const googleLogradouro =
              (await geocodificarEnderecoGoogle(queryCompleta, cambeBoundsRef.current)) ||
              (await geocodificarEnderecoGoogle(querySimples, cambeBoundsRef.current))

            if (
              googleLogradouro &&
              isCidadeCambe(googleLogradouro.city || '', googleLogradouro.stateUf)
            ) {
              latEncontrada = googleLogradouro.lat
              lngEncontrada = googleLogradouro.lng
              console.warn(
                `[CEP] passo 2 (ViaCEP + Google): logradouro localizado (${latEncontrada}, ${lngEncontrada})`,
              )
            } else {
              console.warn(
                `[CEP] passo 2 (ViaCEP + Google): logradouro não localizado no Google Geocoder`,
              )
            }
          }

          // 2.C: Se não achou logradouro, tenta buscar o bairro em Cambé (Nominatim primeiro, depois Google)
          if (latEncontrada === null && bairroEncontrado) {
            passosTentados.push('Nominatim/OSM (bairro)')
            const osmBairro = await geocodificarComNominatim(
              `${bairroEncontrado}, Cambé, PR, Brasil`,
            )
            if (osmBairro && isCoordinateInsideCambeBounds(osmBairro.lat, osmBairro.lng)) {
              latEncontrada = osmBairro.lat
              lngEncontrada = osmBairro.lng
              console.warn(
                `[CEP] passo 2 (ViaCEP + Bairro OSM): localizado (${latEncontrada}, ${lngEncontrada})`,
              )
            } else {
              passosTentados.push('Google Geocoder (bairro)')
              const googleBairro = await geocodificarEnderecoGoogle(
                `${bairroEncontrado}, Cambé, Paraná, Brasil`,
                cambeBoundsRef.current,
              )
              if (googleBairro && isCidadeCambe(googleBairro.city || '', googleBairro.stateUf)) {
                latEncontrada = googleBairro.lat
                lngEncontrada = googleBairro.lng
                console.warn(
                  `[CEP] passo 2 (ViaCEP + Bairro Google): localizado (${latEncontrada}, ${lngEncontrada})`,
                )
              }
            }
          }

          // Se conseguiu coordenadas via ViaCEP + Nominatim/Google
          if (latEncontrada !== null && lngEncontrada !== null) {
            lastValidCepRef.current = formatCep(cleanCep)
            posicionarMarcadorNoPonto(latEncontrada, lngEncontrada, 16)

            const updatedData: EnderecoUnidadeData = {
              cep: formatCep(cleanCep),
              logradouro: logradouroEncontrado,
              numero: '',
              bairro: bairroEncontrado,
              cidade: CIDADE_PERMITIDA,
              estado_uf: ESTADO_PERMITIDO,
              latitude: latEncontrada,
              longitude: lngEncontrada,
            }

            onChange(updatedData)
            emitLocationSummary(updatedData)
            notifySuccess(
              `CEP localizado com sucesso: ${logradouroEncontrado ? logradouroEncontrado + ' - ' : ''}Cambé - PR`,
            )
            return
          }
        } else {
          console.warn(`[CEP] passo 2 (ViaCEP): não respondeu ou erro para CEP ${cleanCep}`)
        }

        // =========================================================================
        // PASSO 3: Google Geocoder por postalCode como último recurso
        // =========================================================================
        passosTentados.push('Google Geocoder (postalCode)')
        const googleCepRes = await geocodificarCepGoogle(cleanCep)
        if (googleCepRes && isCidadeCambe(googleCepRes.city, googleCepRes.stateUf)) {
          console.warn(
            `[CEP] passo 3 (Google Geocoder postalCode): sucesso (${googleCepRes.lat}, ${googleCepRes.lng})`,
          )
          lastValidCepRef.current = formatCep(cleanCep)
          posicionarMarcadorNoPonto(googleCepRes.lat, googleCepRes.lng, 16)

          const updatedData: EnderecoUnidadeData = {
            cep: formatCep(cleanCep),
            logradouro: googleCepRes.route || '',
            numero: '',
            bairro: googleCepRes.neighborhood || '',
            cidade: CIDADE_PERMITIDA,
            estado_uf: ESTADO_PERMITIDO,
            latitude: googleCepRes.lat,
            longitude: googleCepRes.lng,
          }

          onChange(updatedData)
          emitLocationSummary(updatedData)
          notifySuccess(
            `CEP localizado via Google Maps: ${googleCepRes.route ? googleCepRes.route + ' - ' : ''}Cambé - PR`,
          )
          return
        }
        console.warn(
          `[CEP] passo 3 (Google Geocoder postalCode): não retornou coordenadas válidas para CEP ${cleanCep}`,
        )

        // =========================================================================
        // FALHA EM TODOS OS PASSOS: mensagem com passos tentados e preservação de dados
        // =========================================================================
        const passosStr = Array.from(new Set(passosTentados)).join(', ')
        console.warn(
          `[CEP] Todos os passos falharam para o CEP ${cleanCep}. Passos consultados: ${passosStr}`,
        )
        notifyError(
          `Não foi possível localizar o CEP ${formatCep(cleanCep)} (${passosStr} consultados). Preencha manualmente ou ajuste o marcador no mapa. Os dados anteriores foram preservados.`,
        )
      } catch (err: any) {
        console.warn('Erro ao processar busca de CEP:', err)
        notifyError(
          'Falha na consulta do CEP. Verifique sua conexão ou preencha o endereço manualmente.',
        )
      } finally {
        // NUNCA deixa searchingCep travado em true
        setSearchingCep(false)
      }
    },
    [notifyError, notifySuccess, posicionarMarcadorNoPonto, onChange, emitLocationSummary],
  )

  // Mudança no campo CEP
  const handleCepInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value)
    // Atualiza apenas o campo CEP enquanto digita
    onChange({ ...value, cep: formatted })
    setFeedbackError(null)

    const clean = formatted.replace(/\D/g, '')
    if (clean.length === 8) {
      handleCepSearch(clean)
    }
  }

  // REGRA 3 — Geocodificação pelo endereço COMPLETO:
  // logradouro + número + bairro + cidade + UF
  // Prioridade: Nominatim PRIMÁRIO (comprovadamente com viewbox restrita de Cambé) -> Google Geocoder como fallback
  const geocodificarEnderecoCompleto = useCallback(
    async (dados: EnderecoUnidadeData, opts?: { isDebounce?: boolean }): Promise<boolean> => {
      const logradouroTrim = (dados.logradouro || '').trim()
      const numeroTrim = (dados.numero || '').trim()
      const bairroTrim = (dados.bairro || '').trim()
      const cidade = CIDADE_PERMITIDA
      const uf = ESTADO_PERMITIDO

      if (!logradouroTrim) {
        if (!opts?.isDebounce) {
          notifyError('Informe o logradouro antes de localizar.')
        }
        return false
      }

      if (opts?.isDebounce) {
        setDebouncingGeocode(true)
      } else {
        setSearchingNumero(true)
      }

      try {
        const temNumero = numeroTrim && !/^s\s*\/?\s*n$/i.test(numeroTrim)
        const logradouroComNumero = temNumero ? `${logradouroTrim}, ${numeroTrim}` : logradouroTrim

        // Monta partes da busca
        const partesCompleto = [logradouroComNumero, bairroTrim, cidade, uf, 'Brasil'].filter(
          Boolean,
        )
        const partesSimples = [logradouroComNumero, cidade, uf, 'Brasil'].filter(Boolean)
        const partesSemNumero = [logradouroTrim, bairroTrim, cidade, uf, 'Brasil'].filter(Boolean)

        let lat: number | null = null
        let lng: number | null = null

        // 1. TENTA PRIMEIRO NO NOMINATIM/OSM (comprovadamente funcional e sem restrição de chave)
        console.warn(`[Localizar Endereço] Tentando Nominatim para: ${partesCompleto.join(', ')}`)
        const osmRes =
          (await geocodificarComNominatim(partesCompleto.join(', '))) ||
          (await geocodificarComNominatim(partesSimples.join(', '))) ||
          (temNumero ? await geocodificarComNominatim(partesSemNumero.join(', ')) : null)

        if (osmRes && isCoordinateInsideCambeBounds(osmRes.lat, osmRes.lng)) {
          lat = osmRes.lat
          lng = osmRes.lng
          console.warn(`[Localizar Endereço] Nominatim teve sucesso: (${lat}, ${lng})`)
        } else {
          console.warn(
            '[Localizar Endereço] Nominatim não localizou; tentando Google Geocoder como fallback...',
          )
          // 2. FALLBACK PARA GOOGLE GEOCODER
          const googleRes =
            (await geocodificarEnderecoGoogle(partesCompleto.join(', '), cambeBoundsRef.current)) ||
            (await geocodificarEnderecoGoogle(partesSimples.join(', '), cambeBoundsRef.current)) ||
            (temNumero
              ? await geocodificarEnderecoGoogle(partesSemNumero.join(', '), cambeBoundsRef.current)
              : null)

          if (googleRes && isCidadeCambe(googleRes.city || '', googleRes.stateUf)) {
            lat = googleRes.lat
            lng = googleRes.lng
            console.warn(`[Localizar Endereço] Google Geocoder teve sucesso: (${lat}, ${lng})`)
          }
        }

        if (lat === null || lng === null) {
          console.warn(
            `[Localizar Endereço] Não foi possível localizar coordenadas para: ${logradouroComNumero}`,
          )
          if (!opts?.isDebounce) {
            notifyError(
              `Não foi possível localizar o ponto exato para "${logradouroTrim}, ${numeroTrim || 'S/N'}". As coordenadas anteriores foram mantidas.`,
            )
          }
          return false
        }

        // Posiciona no mapa com zoom 16
        posicionarMarcadorNoPonto(lat, lng, 16)

        const updated: EnderecoUnidadeData = {
          ...dados,
          cidade: CIDADE_PERMITIDA,
          estado_uf: ESTADO_PERMITIDO,
          latitude: lat,
          longitude: lng,
        }

        onChange(updated)
        emitLocationSummary(updated)
        notifySuccess(`Endereço localizado no mapa: ${partesCompleto.join(', ')}`)
        return true
      } catch (err) {
        console.warn('Erro ao geocodificar endereço completo:', err)
        return false
      } finally {
        if (opts?.isDebounce) {
          setDebouncingGeocode(false)
        } else {
          setSearchingNumero(false)
        }
      }
    },
    [notifyError, notifySuccess, posicionarMarcadorNoPonto, onChange, emitLocationSummary],
  )

  // Disparo manual pelo botão "Localizar" ou Enter no campo Número
  const handleLocalizarNumeroClick = () => {
    geocodificarEnderecoCompleto(valueRef.current, { isDebounce: false })
  }

  // Agendador de debounce (~600ms) para edição manual de Logradouro ou Bairro
  const scheduleDebouncedGeocode = useCallback(
    (novoData: EnderecoUnidadeData) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        // Só dispara recodificação se houver pelo menos um logradouro com 3+ caracteres
        if ((novoData.logradouro || '').trim().length >= 3) {
          geocodificarEnderecoCompleto(novoData, { isDebounce: true })
        }
      }, 600)
    },
    [geocodificarEnderecoCompleto],
  )

  // Handlers para edição manual
  const handleLogradouroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...value, logradouro: e.target.value }
    onChange(updated)
    scheduleDebouncedGeocode(updated)
  }

  const handleBairroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...value, bairro: e.target.value }
    onChange(updated)
    scheduleDebouncedGeocode(updated)
  }

  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // REGRA CONTEXTO: O número NÃO dispara busca sozinho ao digitar;
    // a busca pelo número acontece no clique do botão Localizar ou Enter
    const updated = { ...value, numero: e.target.value }
    onChange(updated)
  }

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-4 pt-2">
      {/* Cabeçalho da seção com selo Google Maps Platform */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Localização e Endereço da Unidade</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          {debouncingGeocode && (
            <span className="flex items-center gap-1 text-[11px] text-blue-700 font-normal">
              <Loader2 className="w-3 h-3 animate-spin" /> Atualizando mapa...
            </span>
          )}
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>Google Maps Platform</span>
        </div>
      </div>

      {/* REGRA 1: Cartão destacado com CEP como primeiro campo do bloco */}
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
              <Loader2 className="w-3 h-3 animate-spin" /> Localizando endereço...
            </span>
          )}
        </div>

        <div className="relative">
          <Input
            id="cep_unidade"
            value={value.cep || ''}
            onChange={handleCepInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const digits = (value.cep || '').replace(/\D/g, '')
                if (digits.length === 8) {
                  handleCepSearch(digits)
                }
              }
            }}
            placeholder="00000-000 (digite o CEP para buscar o local real)"
            maxLength={9}
            disabled={disabled || searchingCep}
            className="bg-white border-blue-200 text-slate-900 placeholder:text-slate-400 font-mono text-sm focus-visible:ring-blue-500"
          />
        </div>

        {/* Mensagem de ajuda / restrição Cambé */}
        <p className="text-xs text-amber-800 font-medium">
          Atenção: busca restrita exclusivamente ao município de <strong>Cambé - PR</strong>. CEPs
          inválidos ou de outras cidades preservam os dados anteriores.
        </p>

        {/* Avisos de erro e sucesso */}
        {feedbackError && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{feedbackError}</span>
          </div>
        )}
        {feedbackSuccess && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{feedbackSuccess}</span>
          </div>
        )}
      </div>

      {/* Mapa do Google Maps interativo (REGRA 5: zoom 16 com coords, centro de Cambé sem coords) */}
      <div className="space-y-1.5">
        <div className="relative w-full h-[250px] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Tooltip flutuante de instrução */}
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

          {(mapsError || authFailure) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-50/95 z-20 text-amber-900 text-xs gap-2 p-4 text-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <span className="font-medium">
                {mapsError ||
                  'API do Google Maps indisponível ou com falha de autenticação (gm_authFailure).'}
              </span>
              <span className="text-[11px] text-amber-700">
                Você pode preencher os campos de endereço manualmente abaixo sem restrições.
              </span>
            </div>
          )}
        </div>

        {/* Linha Latitude / Longitude com 6 casas decimais */}
        <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5 px-1 font-mono">
          <span>
            Latitude:{' '}
            <strong className="text-slate-900">
              {value.latitude !== null && value.latitude !== undefined
                ? value.latitude.toFixed(6)
                : '—'}
            </strong>
          </span>
          <span className="text-slate-400">•</span>
          <span>
            Longitude:{' '}
            <strong className="text-slate-900">
              {value.longitude !== null && value.longitude !== undefined
                ? value.longitude.toFixed(6)
                : '—'}
            </strong>
          </span>
        </div>
      </div>

      {/* REGRA 3, 4 & 5: Campos de endereço com proteção contra submissão de formulário */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
        {/* Logradouro * */}
        <div className="sm:col-span-7 space-y-1.5">
          <Label htmlFor="logradouro" className="text-xs font-semibold text-slate-700">
            Logradouro <span className="text-destructive">*</span>
          </Label>
          <Input
            id="logradouro"
            value={value.logradouro || ''}
            onChange={handleLogradouroChange}
            placeholder="Rua, Avenida, Praça..."
            disabled={disabled}
            className="text-sm"
          />
        </div>

        {/* Número * com botão "Localizar" (#0B2545 / #133A68) */}
        <div className="sm:col-span-5 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="numero" className="text-xs font-semibold text-slate-700">
              Número <span className="text-destructive">*</span>
            </Label>
            {searchingNumero && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-blue-700">
                <Loader2 className="w-3 h-3 animate-spin" /> Localizando número...
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Input
              id="numero"
              value={value.numero || ''}
              onChange={handleNumeroChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // REGRA 4: apertar Enter não pode disparar o salvamento do formulário
                  e.preventDefault()
                  e.stopPropagation()
                  handleLocalizarNumeroClick()
                }
              }}
              placeholder="Ex: 120 ou S/N"
              disabled={disabled || searchingNumero}
              className="text-sm flex-1"
            />
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleLocalizarNumeroClick()
              }}
              disabled={disabled || searchingNumero || !(value.numero || '').trim()}
              title="Localizar posição exata do número no Google Maps"
              className="shrink-0 bg-[#0B2545] hover:bg-[#133A68] text-white px-3 h-9 text-xs font-medium"
            >
              {searchingNumero ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Localizar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Bairro * */}
        <div className="sm:col-span-5 space-y-1.5">
          <Label htmlFor="bairro" className="text-xs font-semibold text-slate-700">
            Bairro <span className="text-destructive">*</span>
          </Label>
          <Input
            id="bairro"
            value={value.bairro || ''}
            onChange={handleBairroChange}
            placeholder="Bairro"
            disabled={disabled}
            className="text-sm"
          />
        </div>

        {/* Estado (UF) — Fixo Cambé / PR */}
        <div className="sm:col-span-3 space-y-1.5">
          <Label htmlFor="estado_uf" className="text-xs font-semibold text-slate-700">
            Estado (UF) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="estado_uf"
            value={value.estado_uf || ESTADO_PERMITIDO}
            readOnly
            disabled
            className="text-sm bg-slate-100 text-slate-700 cursor-not-allowed font-semibold"
          />
        </div>

        {/* Cidade — Fixa Cambé (PR) */}
        <div className="sm:col-span-4 space-y-1.5">
          <Label htmlFor="cidade" className="text-xs font-semibold text-slate-700">
            Cidade <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cidade"
            value={value.cidade || CIDADE_PERMITIDA}
            readOnly
            disabled
            className="text-sm bg-slate-100 text-slate-700 cursor-not-allowed font-semibold"
          />
        </div>
      </div>
    </div>
  )
}
