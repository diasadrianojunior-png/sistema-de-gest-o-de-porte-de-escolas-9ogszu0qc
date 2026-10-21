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
  const [cepError, setCepError] = useState<string | null>(null)
  const [refSearchText, setRefSearchText] = useState('')
  const [addressSuccessMsg, setAddressSuccessMsg] = useState<string | null>(null)

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
    const cityNormalized = city
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const isCambe = cityNormalized === 'cambe'

    if (enforceCambeOnly && !isCambe) {
      setCepError(
        `Somente CEPs da cidade de CAMBÉ (PR) são aceitos. A busca retornou: "${city || 'Outro município'} - ${stateUf}".`,
      )
      setAddressSuccessMsg(null)
      return false
    }

    setCepError(null)

    const lat = result.geometry?.location?.lat?.() ?? null
    const lng = result.geometry?.location?.lng?.() ?? null

    const updatedData: EnderecoUnidadeData = {
      ...value,
      cep: postalCode ? formatCep(postalCode) : value.cep,
      logradouro: route || value.logradouro,
      numero: streetNumber || value.numero,
      bairro: neighborhood || value.bairro,
      estado_uf: stateUf || (isCambe ? 'PR' : value.estado_uf),
      cidade: isCambe ? 'Cambé' : city || value.cidade,
      latitude: lat !== null ? Number(lat.toFixed(6)) : value.latitude,
      longitude: lng !== null ? Number(lng.toFixed(6)) : value.longitude,
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

    if (lat !== null && lng !== null) {
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setPosition({ lat, lng })
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter({ lat, lng })
        mapInstanceRef.current.setZoom(16)
      }
    }

    setAddressSuccessMsg(`Endereço localizado em Cambé - PR com sucesso!`)
    setTimeout(() => setAddressSuccessMsg(null), 4000)
    return true
  }

  // Busca do CEP via Geocoder com fallback / validação de Cambé
  const handleCepSearch = async (cepToSearch: string) => {
    const cleanCep = cepToSearch.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      setCepError('Digite o CEP completo (8 dígitos).')
      return
    }

    setCepError(null)
    setSearchingCep(true)

    try {
      const google = (window as any).google
      if (!google?.maps?.Geocoder) {
        await loadGoogleMapsScript()
      }

      // Consulta de validação e componentes de endereço
      // O Geocoder do Google Maps é a fonte oficial exigida com a API key
      const geocoder = new (window as any).google.maps.Geocoder()

      geocoder.geocode(
        {
          address: `${cleanCep}, Brasil`,
          componentRestrictions: { country: 'BR' },
        },
        async (results: any, status: any) => {
          setSearchingCep(false)

          if (status === 'OK' && results && results.length > 0) {
            const success = processGeocodingResult(results[0], true)
            if (!success) {
              return
            }
          } else {
            // Tentativa complementar via ViaCEP para cruzar localidade antes de desistir
            try {
              const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
              const data = await res.json()

              if (data.erro) {
                setCepError('CEP não encontrado na base de dados.')
                return
              }

              const cidadeNorm = (data.localidade || '')
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')

              if (cidadeNorm !== 'cambe') {
                setCepError(
                  `Somente CEPs da cidade de CAMBÉ (PR) são aceitos. O CEP informado pertence a "${data.localidade} - ${data.uf}".`,
                )
                return
              }

              // É Cambé! Geocodifica o logradouro completo em Cambé
              const query = `${data.logradouro || ''}, ${data.bairro || ''}, Cambé, PR, Brasil`
              geocoder.geocode(
                {
                  address: query,
                  componentRestrictions: { country: 'BR', administrativeArea: 'PR' },
                },
                (subResults: any, subStatus: any) => {
                  let lat: number | null = null
                  let lng: number | null = null
                  if (subStatus === 'OK' && subResults && subResults[0]) {
                    lat = subResults[0].geometry.location.lat()
                    lng = subResults[0].geometry.location.lng()
                    if (markerInstanceRef.current) {
                      markerInstanceRef.current.setPosition({ lat, lng })
                    }
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setCenter({ lat, lng })
                      mapInstanceRef.current.setZoom(16)
                    }
                  }

                  const updatedData: EnderecoUnidadeData = {
                    ...value,
                    cep: formatCep(cleanCep),
                    logradouro: data.logradouro || value.logradouro,
                    bairro: data.bairro || value.bairro,
                    cidade: 'Cambé',
                    estado_uf: 'PR',
                    latitude: lat !== null ? Number(lat.toFixed(6)) : value.latitude,
                    longitude: lng !== null ? Number(lng.toFixed(6)) : value.longitude,
                  }
                  onChange(updatedData)
                  setCepError(null)
                  setAddressSuccessMsg('Endereço localizado em Cambé - PR com sucesso!')
                  setTimeout(() => setAddressSuccessMsg(null), 4000)
                },
              )
            } catch (fallbackErr) {
              setCepError('Não foi possível verificar o CEP informado.')
            }
          }
        },
      )
    } catch (err: any) {
      setSearchingCep(false)
      setCepError(err.message || 'Erro ao pesquisar CEP.')
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

        {/* Número * */}
        <div className="sm:col-span-4 space-y-1.5">
          <Label htmlFor="numero" className="text-xs font-semibold text-slate-700">
            Número <span className="text-destructive">*</span>
          </Label>
          <Input
            id="numero"
            value={value.numero || ''}
            onChange={(e) => onChange({ ...value, numero: e.target.value })}
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
