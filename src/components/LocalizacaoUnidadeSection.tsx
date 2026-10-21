import React, { useEffect, useRef, useState, useCallback } from 'react'
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

// Bounds usados apenas para ENVIESAR a busca do geocoder (aproximados)
const CAMBE_BOUNDS_BUSCA = { south: -23.35, west: -51.35, north: -23.18, east: -51.2 }
// Bounds amplos (hard) para validar que a coordenada final cai dentro de Cambé - PR
const CAMBE_BOUNDS_VALIDACAO = { south: -23.45, west: -51.45, north: -23.08, east: -51.05 }

// A coordenada final precisa cair dentro do território de Cambé (restrição da cidade)
const estaDentroDeCambe = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= CAMBE_BOUNDS_VALIDACAO.south &&
  lat <= CAMBE_BOUNDS_VALIDACAO.north &&
  lng >= CAMBE_BOUNDS_VALIDACAO.west &&
  lng <= CAMBE_BOUNDS_VALIDACAO.east

// Bounds aproximados do município de Cambé - PR (usados para enviesar a busca)
const getCambeBounds = () => {
  const google = (window as any).google
  return new google.maps.LatLngBounds(
    new google.maps.LatLng(-23.35, -51.35),
    new google.maps.LatLng(-23.18, -51.2),
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

// Cidades por estado para suporte ao select dependente
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
  SP: ['São Paulo', 'Campinas', 'Santos', 'Sorocaba', 'Ribeirão Preto', 'Presidente Prudente'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'São Gonçalo'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas'],
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

  // Referências para o debounce da geocodificação pelo Número e valor atual do endereço
  const numeroDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valueRef = useRef<EnderecoUnidadeData>(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  // Limpa o debounce pendente ao desmontar
  useEffect(() => {
    return () => {
      if (numeroDebounceRef.current) {
        clearTimeout(numeroDebounceRef.current)
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

  // Último recurso: endpoint público dos Correios (postmon) devolve o centro do CEP
  const geocodificarCepCorreios = async (
    cleanCep: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    try {
      const res = await fetch(`https://api.postmon.com.br/v1/cep/${cleanCep}`)
      if (!res.ok) return null
      const data = await res.json()
      const lat = Number(data?.geo?.latitude)
      const lng = Number(data?.geo?.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng) && estaDentroDeCambe(lat, lng)) {
        return { lat, lng }
      }
      return null
    } catch {
      return null
    }
  }

  // Recurso alternativo fora do Google: Nominatim/OpenStreetMap — usado quando o
  // geocoder do Google não retorna nada (ex.: chave sem a Geocoding API liberada),
  // para que o marcador continue sendo posicionado em vez de ficar parado.
  const geocodificarNominatim = async (
    endereco: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    try {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=' +
        encodeURIComponent(endereco)
      const res = await fetch(url)
      if (!res.ok) return null
      const lista = await res.json()
      const primeiro = Array.isArray(lista) ? lista[0] : null
      const lat = Number(primeiro?.lat)
      const lng = Number(primeiro?.lon)
      if (Number.isFinite(lat) && Number.isFinite(lng) && estaDentroDeCambe(lat, lng)) {
        return { lat, lng }
      }
      return null
    } catch {
      return null
    }
  }

  // Garante que a Google Maps JS API está REALMENTE pronta (google.maps.Map e
  // google.maps.Geocoder disponíveis) antes de qualquer geocodificação.
  // Resolve false em caso de falha — nunca derruba a tela.
  const garantirGoogleMapsPronto = async (): Promise<boolean> => {
    const pronto = () => {
      const google = (window as any).google
      return !!(
        google?.maps &&
        typeof google.maps.Map === 'function' &&
        typeof google.maps.Geocoder === 'function'
      )
    }
    if (pronto()) return true
    try {
      await loadGoogleMapsScript()
    } catch (err) {
      console.error('Erro ao carregar a Google Maps JS API:', err)
      return false
    }
    // Pequena espera extra: o bootstrap da API pode expor google.maps um pouco depois
    for (let tentativa = 0; tentativa < 100; tentativa++) {
      if (pronto()) return true
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    return false
  }

  // Geocodifica um endereço em Cambé - PR e devolve a posição mais exata (ou null).
  // Nunca lança: qualquer erro (API ausente, status de erro, resultado fora de Cambé)
  // vira null para a cascata seguir para a próxima estratégia.
  const geocodeEnderecoCambe = (endereco: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      try {
        const google = (window as any).google
        if (!google?.maps?.Geocoder || typeof google.maps.Map !== 'function') {
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
              // Validação estrita: somente coordenadas dentro de Cambé - PR
              if (!estaDentroDeCambe(lat, lng)) continue
              resolve({ lat, lng })
              return
            }
            resolve(null)
          } catch (err) {
            console.error('Erro ao processar resultado do geocoder:', err)
            resolve(null)
          }
        })
      } catch (err) {
        console.error('Erro na geocodificação Google:', err)
        resolve(null)
      }
    })
  }

  // Busca do CEP: ViaCEP valida a localidade (Cambé) e fornece o endereço;
  // o Google Geocoder posiciona o mapa no número exato quando informado.
  const handleCepSearch = async (cepToSearch: string) => {
    const cleanCep = cepToSearch.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      setCepError('Digite o CEP completo (8 dígitos).')
      return
    }

    setCepError(null)
    setSearchingCep(true)

    try {
      // 0) Garante que a API do Google Maps está REALMENTE carregada (google.maps.Map
      //    disponível) ANTES de geocodificar — sem travar a tela em caso de falha.
      const mapsPronto = await garantirGoogleMapsPronto()

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
      const temNumero = !!numeroAtual && !/^s\s*\/?\s*n$/i.test(numeroAtual)
      const logradouroBase = logradouroViaCep || (valueRef.current.logradouro || '').trim()
      const bairroBase = bairroViaCep || (valueRef.current.bairro || '').trim()

      // 3) Cascata COMPLETA de estratégias de geocodificação (Google Geocoder):
      //    a) endereço completo com número
      //    b) logradouro + bairro + cidade + UF
      //    c) logradouro + cidade + UF
      //    d) CEP
      const estrategias: string[] = []
      if (logradouroBase && temNumero) {
        estrategias.push(`${logradouroBase}, ${numeroAtual}, ${bairroBase}, Cambé, PR, Brasil`)
      }
      if (logradouroBase && bairroBase) {
        estrategias.push(`${logradouroBase}, ${bairroBase}, Cambé, PR, Brasil`)
      }
      if (logradouroBase) {
        estrategias.push(`${logradouroBase}, Cambé, PR, Brasil`)
      }
      estrategias.push(`${cleanCep}, Cambé, PR, Brasil`)

      let ponto: { lat: number; lng: number } | null = null
      for (const estrategia of estrategias) {
        // Se a API do Google não estiver pronta, geocodeEnderecoCambe resolve null
        // (sem lançar erro) e a cascata continua para a próxima estratégia.
        const candidato = mapsPronto ? await geocodeEnderecoCambe(estrategia) : null
        if (candidato) {
          ponto = candidato
          break
        }
      }

      // 4) Últimos recursos fora do Google: centro do CEP segundo os Correios
      //    (postmon) e, por fim, Nominatim/OpenStreetMap.
      if (!ponto) {
        ponto = await geocodificarCepCorreios(cleanCep)
      }
      if (!ponto) {
        ponto = await geocodificarNominatim(
          [
            logradouroBase
              ? temNumero
                ? `${logradouroBase}, ${numeroAtual}`
                : logradouroBase
              : '',
            bairroBase,
            'Cambé',
            'PR',
            'Brasil',
          ]
            .filter(Boolean)
            .join(', '),
        )
      }

      // 5) Aplica o resultado: preenche Latitude/Longitude (6 casas) e move o marcador
      const latFinal = ponto ? Number(ponto.lat.toFixed(6)) : valueRef.current.latitude
      const lngFinal = ponto ? Number(ponto.lng.toFixed(6)) : valueRef.current.longitude

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

      if (ponto && mapsPronto) {
        // Coordenadas válidas: posiciona o marcador com precisão
        focusMapOnPoint(ponto.lat, ponto.lng, temNumero ? 18 : 17)
        setAddressSuccessMsg(`Endereço localizado em Cambé - PR! Lat ${latFinal}, Lng ${lngFinal}.`)
        setTimeout(() => setAddressSuccessMsg(null), 5000)
      } else if (ponto) {
        // Coordenadas obtidas, mas o mapa interativo ainda não está disponível
        setCepError(
          `Endereço localizado! Latitude/Longitude preenchidas (Lat ${latFinal}, Lng ${lngFinal}), mas o mapa do Google ainda não está disponível para exibir o marcador.`,
        )
      } else if (!mapsPronto) {
        setCepError(
          'Endereço encontrado, mas o Google Maps ainda não está disponível para posicionar o marcador. Aguarde o mapa carregar e busque o CEP novamente.',
        )
      } else {
        // Só chega aqui se NENHUMA estratégia retornou coordenadas válidas
        setCepError(
          `Endereço encontrado (${logradouroViaCep || 'CEP'}), mas não foi possível posicioná-lo no mapa. Ajuste o marcador manualmente.`,
        )
      }
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

  // Busca secundária por ponto de referência ou logradouro (restrita à Cambé)
  const handleRefSearch = async () => {
    if (!refSearchText.trim()) return

    setSearchingRef(true)
    setCepError(null)

    try {
      const google = (window as any).google
      if (!google?.maps?.Geocoder) {
        await loadGoogleMapsScript()
      }

      const geocoder = new (window as any).google.maps.Geocoder()

      // Forçar busca dentro de Cambé - PR
      const query = `${refSearchText.trim()}, Cambé, PR, Brasil`

      // Bounds aproximados do município de Cambé
      const cambeBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(-23.35, -51.35),
        new google.maps.LatLng(-23.18, -51.2),
      )

      geocoder.geocode(
        {
          address: query,
          bounds: cambeBounds,
          componentRestrictions: { country: 'BR', administrativeArea: 'PR' },
        },
        (results: any, status: any) => {
          setSearchingRef(false)
          if (status === 'OK' && results && results.length > 0) {
            processGeocodingResult(results[0], true)
          } else {
            setCepError(
              `Ponto de referência ou logradouro não localizado em Cambé - PR. Tente outro termo.`,
            )
          }
        },
      )
    } catch (err: any) {
      setSearchingRef(false)
      setCepError('Falha ao localizar logradouro/referência.')
    }
  }

  // Geocodifica o endereço completo quando o usuário digita/altera o Número do logradouro.
  // Move o marcador para a posição exata daquele número (ROOFTOP quando disponível),
  // atualizando Latitude/Longitude. Restrito à cidade de Cambé (PR).
  const handleNumeroGeocode = async (currentValue: EnderecoUnidadeData) => {
    const numeroTrim = (currentValue.numero || '').trim()

    // Sem número (vazio ou S/N): mantém o último posicionamento válido, apenas limpa avisos
    if (!numeroTrim || /^s\s*\/?\s*n$/i.test(numeroTrim)) {
      setCepError(null)
      setSearchingNumero(false)
      return
    }

    // Endereço mínimo para uma busca coerente: logradouro + cidade/UF
    const logradouroTrim = (currentValue.logradouro || '').trim()
    const cidadeAtual = currentValue.cidade || 'Cambé'
    const ufAtual = currentValue.estado_uf || 'PR'
    if (!logradouroTrim) {
      setCepError('Informe o Logradouro antes do Número para posicionar o mapa no endereço exato.')
      return
    }

    setSearchingNumero(true)
    setCepError(null)

    try {
      const google = (window as any).google
      if (!google?.maps?.Geocoder) {
        await loadGoogleMapsScript()
      }

      const geocoder = new (window as any).google.maps.Geocoder()

      const enderecoCompleto = [
        `${logradouroTrim}, ${numeroTrim}`,
        currentValue.bairro?.trim() || '',
        `${cidadeAtual}`,
        ufAtual,
        'Brasil',
      ]
        .filter(Boolean)
        .join(', ')

      geocoder.geocode(
        {
          address: enderecoCompleto,
          bounds: getCambeBounds(),
          componentRestrictions: { country: 'BR', administrativeArea: 'PR' },
        },
        (results: any, status: any) => {
          setSearchingNumero(false)
          if (status === 'OK' && results && results.length > 0) {
            // Confere se o resultado caiu dentro de Cambé antes de aplicar
            const ok = processGeocodingResult(results[0], true)
            if (ok) {
              const first = results[0]
              const loc = first?.geometry?.location
              if (loc) {
                focusMapOnPoint(loc.lat(), loc.lng(), 18)
              }
            }
          } else {
            setCepError(
              `Não foi possível localizar "${logradouroTrim}, ${numeroTrim}" em Cambé - PR. Verifique o número ou ajuste o marcador no mapa.`,
            )
          }
        },
      )
    } catch (err: any) {
      setSearchingNumero(false)
      setCepError(err.message || 'Falha ao geocodificar o endereço informado.')
    }
  }

  // Dispara a geocodificação pelo Número com debounce (digitação fluida)
  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const novoNumero = e.target.value
    const novoValue = { ...value, numero: novoNumero }
    onChange(novoValue)
    setCepError(null)

    if (numeroDebounceRef.current) {
      clearTimeout(numeroDebounceRef.current)
    }
    numeroDebounceRef.current = setTimeout(() => {
      handleNumeroGeocode(novoValue)
    }, 600)
  }

  const cidadesDisponiveis =
    CIDADES_POR_UF[value.estado_uf] || (value.cidade ? [value.cidade] : ['Cambé'])

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
            variant="outline"
            onClick={handleRefSearch}
            disabled={disabled || searchingRef || !refSearchText.trim()}
            className="shrink-0 text-slate-700"
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
              // Se mudar o estado para diferente de PR, ajusta cidade padrão
              const cidades = CIDADES_POR_UF[uf] || []
              onChange({
                ...value,
                estado_uf: uf,
                cidade: uf === 'PR' ? 'Cambé' : cidades[0] || '',
              })
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
            value={value.cidade || 'Cambé'}
            onValueChange={(cid) => onChange({ ...value, cidade: cid })}
            disabled={disabled}
          >
            <SelectTrigger id="cidade" className="text-sm bg-white">
              <SelectValue placeholder="Selecione o estado..." />
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
