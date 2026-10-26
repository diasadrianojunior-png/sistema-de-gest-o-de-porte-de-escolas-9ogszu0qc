import { supabase } from '@/lib/supabase/client'
import { ConfiguracaoRh, ConfiguracaoRhNivel, TipoAtendimentoUnidade } from '@/types/gestao-escolar'
import { encontrarNivelPorAlunos } from './configuracao-rh-calculo'

const db = supabase as any

export interface NivelFaixaFormatada {
  id: string
  codigo_nivel: string
  ordem: number
  min_alunos: number
  max_alunos: number | null
  rotulo: string // ex: "Nível I: Até 100 alunos" ou "Nível V: De 321 a 420 alunos"
  descricaoFaixa: string // ex: "Até 100 alunos", "De 321 a 420 alunos", "Acima de 600 alunos"
}

export interface ConfiguracaoNiveisAtendimento {
  configuracao: ConfiguracaoRh
  tipo_atendimento: string
  ano_letivo: number
  status: string
  niveis: NivelFaixaFormatada[]
}

/**
 * Formata a descrição textual de uma faixa de alunos conforme os padrões oficiais
 * Ex:
 * - min: 0, max: 100 -> "Até 100 alunos"
 * - min: 101, max: 150 -> "De 101 a 150 alunos"
 * - min: 601, max: null -> "Acima de 600 alunos"
 * - min: 141, max: null -> "Acima de 140 alunos"
 */
export function formatarDescricaoFaixaAlunos(min: number, max: number | null): string {
  if (min === 0 || min === 1) {
    return max !== null ? `Até ${max} alunos` : 'Todos os alunos'
  }
  if (max === null || max === undefined) {
    return `Acima de ${Math.max(0, min - 1)} alunos`
  }
  return `De ${min} a ${max} alunos`
}

/**
 * Monta o rótulo completo de exibição do nível
 * Ex: "Nível I: Até 100 alunos", "Nível V: De 321 a 420 alunos", "Nível VIII: Acima de 600 alunos"
 * Para letras: "Nível A: Até 90 alunos", "Nível B: De 91 a 140 alunos", "Nível C: Acima de 140 alunos"
 */
export function formatarRotuloNivel(codigoNivel: string, min: number, max: number | null): string {
  const faixa = formatarDescricaoFaixaAlunos(min, max)
  return `Nível ${codigoNivel}: ${faixa}`
}

/**
 * Converte ConfiguracaoRhNivel bruto para NivelFaixaFormatada
 */
export function converterParaNivelFaixaFormatada(nivel: ConfiguracaoRhNivel): NivelFaixaFormatada {
  const faixa = formatarDescricaoFaixaAlunos(nivel.min_alunos, nivel.max_alunos)
  return {
    id: nivel.id,
    codigo_nivel: nivel.codigo_nivel,
    ordem: nivel.ordem,
    min_alunos: nivel.min_alunos,
    max_alunos: nivel.max_alunos,
    rotulo: `Nível ${nivel.codigo_nivel}: ${faixa}`,
    descricaoFaixa: faixa,
  }
}

/**
 * Busca a configuração de RH vigente (ou a mais recente) para um tipo de atendimento específico,
 * lendo diretamente do banco as faixas de configuracao_rh_nivel cadastradas na Etapa 1.
 */
export async function buscarFaixasNivelPorTipoAtendimento(
  tipoAtendimento: TipoAtendimentoUnidade | string,
  anoLetivoReferencia?: number,
): Promise<ConfiguracaoNiveisAtendimento | null> {
  if (!tipoAtendimento) return null

  const ano = anoLetivoReferencia || new Date().getFullYear()

  // 1. Tenta buscar configuração VIGENTE do ano
  const { data: vigentes } = await db
    .from('configuracao_rh')
    .select('id, codigo, tipo_atendimento, ano_letivo, status, observacao')
    .eq('tipo_atendimento', tipoAtendimento)
    .eq('ano_letivo', ano)
    .eq('status', 'VIGENTE')
    .limit(1)

  let cfgEscolhida = vigentes && vigentes.length > 0 ? vigentes[0] : null

  // 2. Se não encontrar VIGENTE do ano, busca a mais recente do ano
  if (!cfgEscolhida) {
    const { data: doAno } = await db
      .from('configuracao_rh')
      .select('id, codigo, tipo_atendimento, ano_letivo, status, observacao, created_at')
      .eq('tipo_atendimento', tipoAtendimento)
      .eq('ano_letivo', ano)
      .order('created_at', { ascending: false })
      .limit(1)

    if (doAno && doAno.length > 0) {
      cfgEscolhida = doAno[0]
    }
  }

  // 3. Se ainda não encontrar, busca a mais recente global para esse tipo de atendimento
  if (!cfgEscolhida) {
    const { data: maisRecentes } = await db
      .from('configuracao_rh')
      .select('id, codigo, tipo_atendimento, ano_letivo, status, observacao, created_at')
      .eq('tipo_atendimento', tipoAtendimento)
      .order('created_at', { ascending: false })
      .limit(1)

    if (maisRecentes && maisRecentes.length > 0) {
      cfgEscolhida = maisRecentes[0]
    }
  }

  if (!cfgEscolhida) {
    return null
  }

  // 4. Carrega os níveis ordenados desta configuração
  const { data: niveis, error: errNiveis } = await db
    .from('configuracao_rh_nivel')
    .select('*')
    .eq('configuracao_rh_id', cfgEscolhida.id)
    .order('ordem', { ascending: true })

  if (errNiveis) {
    console.error('Erro ao buscar níveis de configuracao_rh_nivel:', errNiveis)
    return null
  }

  const formatados: NivelFaixaFormatada[] = (niveis || []).map(converterParaNivelFaixaFormatada)

  return {
    configuracao: cfgEscolhida,
    tipo_atendimento: cfgEscolhida.tipo_atendimento,
    ano_letivo: cfgEscolhida.ano_letivo,
    status: cfgEscolhida.status,
    niveis: formatados,
  }
}

/**
 * Carrega simultaneamente as faixas para todos os tipos de atendimento conhecidos
 */
export async function carregarMapaFaixasPorTipoAtendimento(
  anoLetivoReferencia?: number,
): Promise<Record<string, NivelFaixaFormatada[]>> {
  const tipos: TipoAtendimentoUnidade[] = [
    'Ensino Fundamental e Educação Infantil (20h)',
    'Educação Infantil (40h)',
  ]

  const mapa: Record<string, NivelFaixaFormatada[]> = {}

  await Promise.all(
    tipos.map(async (tipo) => {
      const res = await buscarFaixasNivelPorTipoAtendimento(tipo, anoLetivoReferencia)
      if (res && res.niveis.length > 0) {
        mapa[tipo] = res.niveis
      }
    }),
  )

  return mapa
}

/**
 * Calcula o nível de uma unidade escolar com base na quantidade de alunos
 * e na lista de faixas do banco.
 */
export function calcularNivelPorQtdAlunos(
  niveis: NivelFaixaFormatada[],
  qtdAlunos: number,
): NivelFaixaFormatada | null {
  if (!niveis || niveis.length === 0) return null
  const encontrado = encontrarNivelPorAlunos(niveis as any, qtdAlunos)
  if (!encontrado) return null
  return niveis.find((n) => n.codigo_nivel === encontrado.codigo_nivel) || null
}

/**
 * Normaliza qualquer formato legado ou string de nível salva anteriormente
 * para o rótulo oficial da faixa carregada do banco.
 * Exemplo: "Nível 1 (até 100 alunos)" ou "Nível I" -> "Nível I: Até 100 alunos"
 */
export function resolverRotuloNivelComFaixas(
  tipoAtendimento: string,
  nivelSalvo: string,
  niveisDoBanco?: NivelFaixaFormatada[],
): string {
  if (!nivelSalvo) return ''
  const trimmed = nivelSalvo.trim()

  if (!niveisDoBanco || niveisDoBanco.length === 0) {
    return trimmed
  }

  // 1. Correspondência exata com o rótulo formatado
  const matchRotulo = niveisDoBanco.find((n) => n.rotulo.toLowerCase() === trimmed.toLowerCase())
  if (matchRotulo) return matchRotulo.rotulo

  // 2. Correspondência exata com o código_nivel (ex: "I", "II", "V", "A", "B", "C")
  const matchCodigo = niveisDoBanco.find(
    (n) =>
      n.codigo_nivel.toLowerCase() === trimmed.toLowerCase() ||
      `nível ${n.codigo_nivel}`.toLowerCase() === trimmed.toLowerCase() ||
      `nivel ${n.codigo_nivel}`.toLowerCase() === trimmed.toLowerCase(),
  )
  if (matchCodigo) return matchCodigo.rotulo

  // 3. Mapeamento numérico legado para romano ou letra
  // Ex: "Nível 1" -> "I", "Nível 5" -> "V", "Nível 8" -> "VIII"
  const mapaRomano: Record<string, string> = {
    '1': 'I',
    '2': 'II',
    '3': 'III',
    '4': 'IV',
    '5': 'V',
    '6': 'VI',
    '7': 'VII',
    '8': 'VIII',
  }

  const numMatch = trimmed.match(/nível\s*(\d)/i) || trimmed.match(/porte\s*(\d)/i)
  if (numMatch && mapaRomano[numMatch[1]]) {
    const codRomano = mapaRomano[numMatch[1]]
    const match = niveisDoBanco.find((n) => n.codigo_nivel === codRomano)
    if (match) return match.rotulo
  }

  // 4. Mapeamento de 40h legado "Até 100 alunos" -> Nível A ou correspondente
  if (tipoAtendimento.includes('40h')) {
    if (trimmed.includes('Até 100') || trimmed.includes('Faixa 1') || trimmed.includes('Nível A')) {
      const match = niveisDoBanco.find((n) => n.codigo_nivel === 'A')
      if (match) return match.rotulo
    }
    if (
      trimmed.includes('101 a 200') ||
      trimmed.includes('Faixa 2') ||
      trimmed.includes('Nível B')
    ) {
      const match = niveisDoBanco.find((n) => n.codigo_nivel === 'B')
      if (match) return match.rotulo
    }
    if (
      trimmed.includes('Mais de 200') ||
      trimmed.includes('Faixa 3') ||
      trimmed.includes('Nível C')
    ) {
      const match = niveisDoBanco.find((n) => n.codigo_nivel === 'C')
      if (match) return match.rotulo
    }
  }

  // 5. Se o texto começar com "Nível X" e X for um código válido
  for (const n of niveisDoBanco) {
    if (trimmed.toLowerCase().startsWith(`nível ${n.codigo_nivel.toLowerCase()}`)) {
      return n.rotulo
    }
  }

  return trimmed
}
