import {
  RhNivel,
  RhRegraNivel,
  RhRegraPorTurmas,
  RhExcecaoVaga,
  RhVaga,
  RhLotacao,
  RhTipoAtendimento,
  RhAlunosPorModalidade,
} from '@/types/gestao-escolar'

export interface TurmaSimulacao {
  id?: string
  etapaNome: string
  turno?: string
  alunos?: number
}

export interface EntradaCalculoPorte {
  alunosTotal: number
  alunosPorModalidade: RhAlunosPorModalidade
  modalidadesExcluidas: string[] // ex: ['JORNADA_AMPLIADA', 'EJA', 'SALA_RECURSOS_MULTIFUNCIONAIS']
  niveisTipo: RhNivel[]
  nivelOverrideId?: string | null
  regrasNivel: RhRegraNivel[]
  regrasTurmas: RhRegraPorTurmas[]
  excecoesVagas: RhExcecaoVaga[]
  turnosEscola: string[] // ex: ['MATUTINO', 'VESPERTINO']
  turmas: TurmaSimulacao[]
  vagasExistentes?: RhVaga[]
  lotacoesAtuais?: RhLotacao[]
}

export interface MemoriaPasso {
  titulo: string
  descricao: string
  resultado: string
  detalhes?: string[]
}

export interface ItemQuadroComparativo {
  funcaoId: string
  funcaoNome: string
  previstoFixo: number
  previstoItinerante: number
  previstoTotal: number
  lotadoTotal: number
  saldo: number // lotado - previsto
  situacao: 'DÉFICIT' | 'OK' | 'EXCEDENTE'
  aviso?: string | null
}

export interface VagaCalculada {
  id?: string
  funcaoId: string
  funcaoNome?: string
  turno?: string | null
  modalidade: 'FIXO' | 'ITINERANTE'
  diasSemana?: number | null
  origem: 'REGRA_NIVEL' | 'REGRA_TURMAS' | 'EXCECAO_MANUAL'
  regraOrigemId?: string | null
  status: 'ABERTA' | 'OCUPADA' | 'BLOQUEADA' | 'EXCEDENTE'
  servidorId?: string | null
  sequencial: number
  observacao?: string | null
}

export interface ResultadoCalculoPorte {
  alunosTotal: number
  descontoModalidades: number
  alunosConsiderados: number
  nivelCalculado: RhNivel | null
  nivelAplicado: RhNivel | null
  isOverride: boolean
  memoriaCalculo: MemoriaPasso[]
  vagasGeradas: VagaCalculada[]
  quadroComparativo: ItemQuadroComparativo[]
  avisosGerais: string[]
}

/**
 * Valida a continuidade das faixas de nível para um tipo de atendimento.
 * Faixas contíguas: min do próximo deve ser exatamente max anterior + 1. Sem buracos e sem sobreposição.
 */
export function validarContiguidadeNiveis(niveis: RhNivel[]): {
  valido: boolean
  erros: string[]
} {
  const erros: string[] = []
  if (!niveis || niveis.length === 0) {
    return { valido: false, erros: ['Nenhum nível cadastrado.'] }
  }

  // Ordenar por ordem ou min_alunos
  const ordenados = [...niveis].sort((a, b) => a.min_alunos - b.min_alunos)

  // O primeiro deve começar em 0
  if (ordenados[0].min_alunos !== 0) {
    erros.push(
      `O primeiro nível (${ordenados[0].codigo_nivel}) deve começar em 0 alunos (atual: ${ordenados[0].min_alunos}).`,
    )
  }

  for (let i = 0; i < ordenados.length; i++) {
    const atual = ordenados[i]
    if (atual.max_alunos !== null && atual.min_alunos > atual.max_alunos) {
      erros.push(
        `Nível ${atual.codigo_nivel}: alunos_min (${atual.min_alunos}) não pode ser maior que alunos_max (${atual.max_alunos}).`,
      )
    }

    if (i > 0) {
      const anterior = ordenados[i - 1]
      if (anterior.max_alunos === null) {
        erros.push(
          `O nível anterior (${anterior.codigo_nivel}) não tem teto máximo, logo nenhum nível subsequente (${atual.codigo_nivel}) pode existir.`,
        )
      } else {
        const esperadoMin = anterior.max_alunos + 1
        if (atual.min_alunos < esperadoMin) {
          erros.push(
            `Sobreposição entre nível ${anterior.codigo_nivel} (teto ${anterior.max_alunos}) e nível ${atual.codigo_nivel} (início ${atual.min_alunos}).`,
          )
        } else if (atual.min_alunos > esperadoMin) {
          erros.push(
            `Buraco/descontinuidade na faixa entre o nível ${anterior.codigo_nivel} (teto ${anterior.max_alunos}) e o nível ${atual.codigo_nivel} (início ${atual.min_alunos}). O valor esperado para o início seria ${esperadoMin}.`,
          )
        }
      }
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  }
}

/**
 * Normaliza o nome da etapa para correspondência com etapas_filtro
 * ex: "Infantil I" -> "INFANTIL_I", "Creche" -> "INFANTIL"
 */
export function normalizarNomeEtapa(etapa: string): string {
  if (!etapa) return ''
  const upper = etapa.toUpperCase().trim()
  if (upper.includes('CRECHE')) return 'INFANTIL'
  if (upper.includes('PRÉ') || upper.includes('PRE')) return 'INFANTIL_II'
  if (upper.includes('ANOS FINAIS')) return 'ANO_6' // ou generalizado
  return upper.replace(/\s+/g, '_')
}

/**
 * Executa o algoritmo central de geração de vagas e memória de cálculo
 */
export function calcularVagasPorte(entrada: EntradaCalculoPorte): ResultadoCalculoPorte {
  const memoria: MemoriaPasso[] = []
  const avisosGerais: string[] = []

  // 1. alunos_considerados = alunos_total − soma das modalidades excluídas do tipo
  let descontoModalidades = 0
  const detalhesDesconto: string[] = []

  if (entrada.modalidadesExcluidas.includes('JORNADA_AMPLIADA')) {
    const qtd = entrada.alunosPorModalidade?.jornada_ampliada || 0
    descontoModalidades += qtd
    detalhesDesconto.push(`Jornada Ampliada: ${qtd}`)
  }
  if (entrada.modalidadesExcluidas.includes('EJA')) {
    const qtd = entrada.alunosPorModalidade?.eja || 0
    descontoModalidades += qtd
    detalhesDesconto.push(`EJA: ${qtd}`)
  }
  if (entrada.modalidadesExcluidas.includes('SALA_RECURSOS_MULTIFUNCIONAIS')) {
    const qtd = entrada.alunosPorModalidade?.srm || 0
    descontoModalidades += qtd
    detalhesDesconto.push(`Sala de Recursos Multifuncionais (SRM): ${qtd}`)
  }

  const alunosConsiderados = Math.max(0, entrada.alunosTotal - descontoModalidades)

  memoria.push({
    titulo: '1. Alunos Considerados para Classificação do Porte',
    descricao: `Total de Matrículas (${entrada.alunosTotal}) menos deduções de modalidades excluídas (${descontoModalidades}).`,
    resultado: `${alunosConsiderados} alunos considerados`,
    detalhes: detalhesDesconto.length > 0 ? detalhesDesconto : ['Nenhuma dedução aplicável.'],
  })

  // 2. Nível = faixa do tipo de atendimento que contém alunos_considerados (ou nivel_override, se houver)
  const niveisOrdenados = [...entrada.niveisTipo].sort((a, b) => a.min_alunos - b.min_alunos)
  let nivelCalculado: RhNivel | null = null

  for (const n of niveisOrdenados) {
    if (n.max_alunos !== null) {
      if (alunosConsiderados >= n.min_alunos && alunosConsiderados <= n.max_alunos) {
        nivelCalculado = n
        break
      }
    } else {
      if (alunosConsiderados >= n.min_alunos) {
        nivelCalculado = n
        break
      }
    }
  }

  let nivelAplicado = nivelCalculado
  let isOverride = false

  if (entrada.nivelOverrideId) {
    const override = entrada.niveisTipo.find((n) => n.id === entrada.nivelOverrideId)
    if (override) {
      nivelAplicado = override
      isOverride = true
    }
  }

  memoria.push({
    titulo: '2. Enquadramento no Nível do Porte',
    descricao: isOverride
      ? `Nível originalmente calculado: ${nivelCalculado?.codigo_nivel || 'Não enquadrado'}, porém aplicado Override SEMED: ${nivelAplicado?.codigo_nivel}.`
      : `Classificação automática por faixa de alunos considerados.`,
    resultado: `Nível ${nivelAplicado?.codigo_nivel || 'Indefinido'} (${
      nivelAplicado
        ? `${nivelAplicado.min_alunos} a ${nivelAplicado.max_alunos ?? 'sem teto'} alunos`
        : 'Sem faixa'
    })`,
    detalhes: [
      `Faixas analisadas: ${niveisOrdenados
        .map((n) => `${n.codigo_nivel}: [${n.min_alunos} - ${n.max_alunos ?? '∞'}]`)
        .join(', ')}`,
      ...(isOverride ? ['ATENÇÃO: Este nível foi alterado manualmente via Override SEMED.'] : []),
    ],
  })

  // 3. Regras de Nível para o nível aplicado
  const vagasGeradas: VagaCalculada[] = []
  const funcoesComSuporteGeral = new Set<string>()

  const regrasAplicaveis = nivelAplicado
    ? entrada.regrasNivel.filter((r) => r.nivel_id === nivelAplicado?.id)
    : []

  const turnos =
    entrada.turnosEscola && entrada.turnosEscola.length > 0 ? entrada.turnosEscola : ['MATUTINO']
  const totalTurmas = entrada.turmas ? entrada.turmas.length : 0

  const detalhesRegrasNivel: string[] = []

  for (const regra of regrasAplicaveis) {
    const funcaoNome = regra.funcao?.nome || 'Função'
    const funcaoId = regra.funcao_id
    if (funcaoNome.toLowerCase().includes('suporte pedagógico (geral)')) {
      if (regra.quantidade > 0) funcoesComSuporteGeral.add(funcaoId)
    }

    if (regra.base_calculo === 'FIXO_ESCOLA') {
      const qtd = Math.ceil(Number(regra.quantidade))
      for (let s = 1; s <= qtd; s++) {
        vagasGeradas.push({
          funcaoId,
          funcaoNome,
          turno: null,
          modalidade: regra.modalidade,
          diasSemana: regra.dias_semana || null,
          origem: 'REGRA_NIVEL',
          regraOrigemId: regra.id,
          status: 'ABERTA',
          sequencial: s,
          observacao:
            regra.observacao || `Regra Nível ${nivelAplicado?.codigo_nivel} (Fixo Escola)`,
        })
      }
      detalhesRegrasNivel.push(
        `${funcaoNome}: ${qtd} vaga(s) (${regra.modalidade}) - Base FIXO_ESCOLA`,
      )
    } else if (regra.base_calculo === 'POR_TURNO') {
      // Para POR_TURNO, gerar uma vaga por turno multiplicada pela quantidade
      const qtdPorTurno = Math.ceil(Number(regra.quantidade))
      let seq = 1
      for (const t of turnos) {
        for (let q = 1; q <= qtdPorTurno; q++) {
          vagasGeradas.push({
            funcaoId,
            funcaoNome,
            turno: t,
            modalidade: regra.modalidade,
            diasSemana: regra.dias_semana || null,
            origem: 'REGRA_NIVEL',
            regraOrigemId: regra.id,
            status: 'ABERTA',
            sequencial: seq++,
            observacao: `Regra Nível ${nivelAplicado?.codigo_nivel} - Turno ${t}`,
          })
        }
      }
      detalhesRegrasNivel.push(
        `${funcaoNome}: ${qtdPorTurno * turnos.length} vaga(s) (${turnos.length} turno(s) × ${qtdPorTurno}) - Base POR_TURNO`,
      )
    } else if (regra.base_calculo === 'POR_TURMA') {
      const qtdPorTurma = Number(regra.quantidade)
      const totalVagas = Math.ceil(qtdPorTurma * totalTurmas)
      for (let s = 1; s <= totalVagas; s++) {
        const turmaRef = entrada.turmas[s - 1]
        vagasGeradas.push({
          funcaoId,
          funcaoNome,
          turno: turmaRef?.turno || null,
          modalidade: regra.modalidade,
          diasSemana: regra.dias_semana || null,
          origem: 'REGRA_NIVEL',
          regraOrigemId: regra.id,
          status: 'ABERTA',
          sequencial: s,
          observacao: `Regra Nível ${nivelAplicado?.codigo_nivel} - Turma ${turmaRef?.etapaNome || s}`,
        })
      }
      detalhesRegrasNivel.push(
        `${funcaoNome}: ${totalVagas} vaga(s) (${totalTurmas} turmas × ${qtdPorTurma}) - Base POR_TURMA`,
      )
    } else if (regra.base_calculo === 'POR_TURMA_ETAPA') {
      // Filtra turmas cujas etapas coincidem com etapas_filtro
      const filtros = regra.etapas_filtro || []
      const turmasFiltradas = (entrada.turmas || []).filter((t) => {
        const norm = normalizarNomeEtapa(t.etapaNome)
        return (
          filtros.includes(t.etapaNome) ||
          filtros.includes(norm) ||
          filtros.some((f) => norm.includes(f) || f.includes(norm))
        )
      })
      const qtdPorTurma = Number(regra.quantidade)
      const totalVagas = Math.ceil(qtdPorTurma * turmasFiltradas.length)
      for (let s = 1; s <= totalVagas; s++) {
        const turmaRef = turmasFiltradas[s - 1]
        vagasGeradas.push({
          funcaoId,
          funcaoNome,
          turno: turmaRef?.turno || null,
          modalidade: regra.modalidade,
          diasSemana: regra.dias_semana || null,
          origem: 'REGRA_NIVEL',
          regraOrigemId: regra.id,
          status: 'ABERTA',
          sequencial: s,
          observacao: `Regra Nível ${nivelAplicado?.codigo_nivel} - Turma Etapa [${turmaRef?.etapaNome}]`,
        })
      }
      detalhesRegrasNivel.push(
        `${funcaoNome}: ${totalVagas} vaga(s) (${turmasFiltradas.length} turmas filtradas × ${qtdPorTurma}) - Base POR_TURMA_ETAPA`,
      )
    }
  }

  memoria.push({
    titulo: '3. Dimensionamento por Regras do Nível',
    descricao: `Aplicação das regras definidas para o Nível ${nivelAplicado?.codigo_nivel || '-'}.`,
    resultado: `${vagasGeradas.length} vaga(s) gerada(s) pelo nível`,
    detalhes: detalhesRegrasNivel,
  })

  // Regra de negócio extra: se o nível não tiver vaga de Suporte Pedagógico geral,
  // exibir aviso de que o Coordenador assume turmas na falta de professor (Art. 9º).
  const temSuporteGeral = vagasGeradas.some(
    (v) =>
      v.funcaoNome?.toLowerCase().includes('suporte pedagógico (geral)') ||
      v.funcaoNome?.toLowerCase() === 'suporte pedagógico',
  )
  if (!temSuporteGeral) {
    const avisoArt9 =
      'Aviso da Portaria (Art. 9º): Este nível de atendimento não possui vaga de Suporte Pedagógico Geral. O Coordenador Pedagógico assume turmas em eventuais faltas docentes.'
    avisosGerais.push(avisoArt9)
  }

  // 4. Regras por Número de Turmas (Arte, Ed. Física, R2)
  const detalhesRegrasTurmas: string[] = []
  const regrasTurmasMap = new Map<string, RhRegraPorTurmas[]>()

  for (const rt of entrada.regrasTurmas) {
    const list = regrasTurmasMap.get(rt.funcao_id) || []
    list.push(rt)
    regrasTurmasMap.set(rt.funcao_id, list)
  }

  for (const [funcaoId, regrasList] of regrasTurmasMap.entries()) {
    // Encontrar a regra cuja faixa contém totalTurmas
    const regraAtiva = regrasList.find((r) => {
      if (r.max_turmas !== null && r.max_turmas !== undefined) {
        return totalTurmas >= r.min_turmas && totalTurmas <= r.max_turmas
      }
      return totalTurmas >= r.min_turmas
    })

    if (regraAtiva) {
      const funcaoNome = regraAtiva.funcao?.nome || 'Especialista'
      let seq = 1
      for (let f = 1; f <= regraAtiva.qtd_fixo; f++) {
        vagasGeradas.push({
          funcaoId,
          funcaoNome,
          turno: null,
          modalidade: 'FIXO',
          origem: 'REGRA_TURMAS',
          regraOrigemId: regraAtiva.id,
          status: 'ABERTA',
          sequencial: seq++,
          observacao: `Regra Turmas (${totalTurmas} turmas: faixa ${regraAtiva.min_turmas}-${regraAtiva.max_turmas ?? '∞'}) - Fixo`,
        })
      }
      for (let it = 1; it <= regraAtiva.qtd_itinerante; it++) {
        vagasGeradas.push({
          funcaoId,
          funcaoNome,
          turno: null,
          modalidade: 'ITINERANTE',
          origem: 'REGRA_TURMAS',
          regraOrigemId: regraAtiva.id,
          status: 'ABERTA',
          sequencial: seq++,
          observacao: `Regra Turmas (${totalTurmas} turmas: faixa ${regraAtiva.min_turmas}-${regraAtiva.max_turmas ?? '∞'}) - Itinerante`,
        })
      }
      detalhesRegrasTurmas.push(
        `${funcaoNome}: ${regraAtiva.qtd_fixo} Fixo + ${regraAtiva.qtd_itinerante} Itinerante (Faixa ${regraAtiva.min_turmas} a ${regraAtiva.max_turmas ?? '∞'} turmas)`,
      )
    }
  }

  memoria.push({
    titulo: '4. Dimensionamento por Turmas (Arte, Ed. Física, R2)',
    descricao: `Total de ${totalTurmas} turmas cadastradas na escola.`,
    resultado: `${detalhesRegrasTurmas.length} função(ões) dimensionadas por número de turmas`,
    detalhes:
      detalhesRegrasTurmas.length > 0
        ? detalhesRegrasTurmas
        : ['Nenhuma regra por turma aplicável.'],
  })

  // 5. Exceções de Vaga SEMED
  const detalhesExcecoes: string[] = []
  for (const exc of entrada.excecoesVagas) {
    const funcaoNome = exc.funcao?.nome || 'Função'
    const delta = exc.delta

    if (delta > 0) {
      // Adiciona vagas extras
      for (let d = 1; d <= delta; d++) {
        vagasGeradas.push({
          funcaoId: exc.funcao_id,
          funcaoNome,
          modalidade: 'FIXO',
          origem: 'EXCECAO_MANUAL',
          regraOrigemId: exc.id,
          status: 'ABERTA',
          sequencial: d,
          observacao: `Exceção SEMED: ${exc.justificativa} (Autorizado por: ${exc.autorizado_por})`,
        })
      }
    } else if (delta < 0) {
      // Remove vagas não ocupadas até o limite do delta
      let removidos = 0
      const aRemover = Math.abs(delta)
      for (let i = vagasGeradas.length - 1; i >= 0 && removidos < aRemover; i--) {
        if (vagasGeradas[i].funcaoId === exc.funcao_id && vagasGeradas[i].status !== 'OCUPADA') {
          vagasGeradas.splice(i, 1)
          removidos++
        }
      }
    }
    detalhesExcecoes.push(
      `${funcaoNome}: ${delta > 0 ? `+${delta}` : delta} vaga(s) - Justificativa: "${exc.justificativa}"`,
    )
  }

  memoria.push({
    titulo: '5. Ajustes de Exceção SEMED',
    descricao: 'Exceções pontuais autorizadas sem alteração da portaria regulamentar.',
    resultado: `${entrada.excecoesVagas.length} exceção(ões) considerada(s)`,
    detalhes: detalhesExcecoes.length > 0 ? detalhesExcecoes : ['Nenhuma exceção cadastrada.'],
  })

  // 6. Idempotência e Preservação de Vagas Ocupadas
  // Se existirem vagas existentes já cadastradas:
  // - Vagas já OCUPADAS nunca são apagadas.
  // - Re-cálculo não duplica.
  // - Se a nova quantidade for menor que as ocupadas/geradas, marca excedente.
  const vagasFinais = aplicarIdempotenciaVagas(vagasGeradas, entrada.vagasExistentes || [])

  // 7. Gerar Quadro Comparativo (Previsto pelo Porte x Lotação Atual)
  const quadroComparativo = gerarQuadroComparativo(
    vagasFinais,
    entrada.lotacoesAtuais || [],
    regrasAplicaveis,
    avisosGerais,
  )

  return {
    alunosTotal: entrada.alunosTotal,
    descontoModalidades,
    alunosConsiderados,
    nivelCalculado,
    nivelAplicado,
    isOverride,
    memoriaCalculo: memoria,
    vagasGeradas: vagasFinais,
    quadroComparativo,
    avisosGerais,
  }
}

/**
 * Idempotência da regeração:
 * Casa vagas calculadas com vagas já salvas preservando ocupações e identificadores.
 * Se a nova demanda for menor que as vagas ocupadas existentes, marca o excesso como EXCEDENTE.
 */
export function aplicarIdempotenciaVagas(
  novasVagas: VagaCalculada[],
  vagasExistentes: RhVaga[],
): VagaCalculada[] {
  if (!vagasExistentes || vagasExistentes.length === 0) {
    return novasVagas
  }

  // Agrupar vagas existentes por funcaoId + modalidade
  const existentesPorChave = new Map<string, RhVaga[]>()
  for (const ve of vagasExistentes) {
    const chave = `${ve.funcao_id}_${ve.modalidade}`
    const list = existentesPorChave.get(chave) || []
    list.push(ve)
    existentesPorChave.set(chave, list)
  }

  // Agrupar novas vagas por funcaoId + modalidade
  const novasPorChave = new Map<string, VagaCalculada[]>()
  for (const nv of novasVagas) {
    const chave = `${nv.funcaoId}_${nv.modalidade}`
    const list = novasPorChave.get(chave) || []
    list.push(nv)
    novasPorChave.set(chave, list)
  }

  const todasChaves = new Set([...existentesPorChave.keys(), ...novasPorChave.keys()])
  const resultado: VagaCalculada[] = []

  for (const chave of todasChaves) {
    const existentes = existentesPorChave.get(chave) || []
    const novas = novasPorChave.get(chave) || []

    const qtdNovas = novas.length
    const ocupadas = existentes.filter((e) => e.status === 'OCUPADA')
    const abertasExistentes = existentes.filter((e) => e.status !== 'OCUPADA')

    // Casamento 1: Atribuir vagas ocupadas primeiro
    let ocupadasUtilizadas = 0
    for (let i = 0; i < qtdNovas; i++) {
      const nova = novas[i]
      if (ocupadasUtilizadas < ocupadas.length) {
        const oc = ocupadas[ocupadasUtilizadas++]
        resultado.push({
          ...nova,
          id: oc.id,
          status: 'OCUPADA',
          servidorId: oc.servidor_id,
          sequencial: i + 1,
        })
      } else if (abertasExistentes.length > 0) {
        const ab = abertasExistentes.shift()!
        resultado.push({
          ...nova,
          id: ab.id,
          status: ab.status === 'BLOQUEADA' ? 'BLOQUEADA' : 'ABERTA',
          servidorId: ab.servidor_id,
          sequencial: i + 1,
        })
      } else {
        resultado.push({
          ...nova,
          sequencial: i + 1,
        })
      }
    }

    // Se existiam mais ocupadas do que a nova regra prevê, as vagas excedentes NÃO são apagadas,
    // são marcadas como EXCEDENTE
    while (ocupadasUtilizadas < ocupadas.length) {
      const oc = ocupadas[ocupadasUtilizadas++]
      resultado.push({
        id: oc.id,
        funcaoId: oc.funcao_id,
        funcaoNome: oc.funcao?.nome || 'Função',
        turno: oc.turno,
        modalidade: oc.modalidade,
        origem: oc.origem,
        regraOrigemId: oc.regra_origem_id,
        status: 'EXCEDENTE',
        servidorId: oc.servidor_id,
        sequencial: resultado.length + 1,
        observacao: 'Vaga excedente ao porte atual da unidade (preservada por estar ocupada)',
      })
    }
  }

  return resultado
}

/**
 * Monta o quadro comparativo Previsto pelo Porte x Lotação Atual -> DÉFICIT / OK / EXCEDENTE
 */
export function gerarQuadroComparativo(
  vagasGeradas: VagaCalculada[],
  lotacoes: RhLotacao[],
  regrasNivel: RhRegraNivel[],
  avisosGerais: string[],
): ItemQuadroComparativo[] {
  const mapaPrevisto = new Map<
    string,
    { nome: string; fixo: number; itinerante: number; total: number }
  >()

  for (const v of vagasGeradas) {
    const cur = mapaPrevisto.get(v.funcaoId) || {
      nome: v.funcaoNome || 'Função',
      fixo: 0,
      itinerante: 0,
      total: 0,
    }
    if (v.status !== 'EXCEDENTE') {
      if (v.modalidade === 'FIXO') cur.fixo++
      else cur.itinerante++
      cur.total++
    }
    mapaPrevisto.set(v.funcaoId, cur)
  }

  const mapaLotado = new Map<string, number>()
  for (const l of lotacoes) {
    const cur = mapaLotado.get(l.funcao_id) || 0
    mapaLotado.set(l.funcao_id, cur + 1)
  }

  const todasFuncoes = new Set([...mapaPrevisto.keys(), ...mapaLotado.keys()])
  const itens: ItemQuadroComparativo[] = []

  for (const fid of todasFuncoes) {
    const prev = mapaPrevisto.get(fid) || { nome: 'Função', fixo: 0, itinerante: 0, total: 0 }
    const lotado = mapaLotado.get(fid) || 0
    const saldo = lotado - prev.total

    let situacao: 'DÉFICIT' | 'OK' | 'EXCEDENTE' = 'OK'
    if (saldo < 0) situacao = 'DÉFICIT'
    else if (saldo > 0) situacao = 'EXCEDENTE'

    let aviso: string | null = null
    if (
      prev.nome.toLowerCase().includes('coordenador pedagógico') &&
      avisosGerais.some((a) => a.includes('Art. 9º'))
    ) {
      aviso = 'Assume turmas na falta docente (sem Suporte Geral no nível).'
    }

    itens.push({
      funcaoId: fid,
      funcaoNome: prev.nome,
      previstoFixo: prev.fixo,
      previstoItinerante: prev.itinerante,
      previstoTotal: prev.total,
      lotadoTotal: lotado,
      saldo,
      situacao,
      aviso,
    })
  }

  return itens.sort((a, b) => a.funcaoNome.localeCompare(b.funcaoNome))
}
