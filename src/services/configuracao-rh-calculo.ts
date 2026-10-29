import {
  ConfiguracaoRhCompleta,
  ConfiguracaoRhNivel,
  ConfiguracaoRhLinha,
  ModalidadeRhVaga,
} from '@/types/gestao-escolar'

export interface ValidacaoFaixasResultado {
  valido: boolean
  erros: string[]
}

/**
 * Validação de faixas contíguas, sem sobreposição e sem buracos dentro da mesma configuração.
 * Retorna mensagem detalhada indicando exatamente onde está a falha (ex: "entre 140 e 141 não há nível").
 */
export function validarContiguidadeNiveis(
  niveis: Array<Pick<ConfiguracaoRhNivel, 'codigo_nivel' | 'ordem' | 'min_alunos' | 'max_alunos'>>,
): ValidacaoFaixasResultado {
  const erros: string[] = []

  if (!niveis || niveis.length === 0) {
    return { valido: false, erros: ['A configuração deve conter ao menos um nível de alunos.'] }
  }

  // Ordenar por ordem ou min_alunos
  const ordenados = [...niveis].sort((a, b) => a.ordem - b.ordem)

  // 1. O primeiro nível deve começar em 0
  if (ordenados[0].min_alunos !== 0) {
    erros.push(
      `O primeiro nível (${ordenados[0].codigo_nivel}) deve iniciar em 0 alunos (atualmente inicia em ${ordenados[0].min_alunos}).`,
    )
  }

  // 2. Verificar consistência interna de cada faixa (min <= max quando max != null)
  for (const n of ordenados) {
    if (n.max_alunos !== null && n.max_alunos !== undefined && n.min_alunos > n.max_alunos) {
      erros.push(
        `O nível ${n.codigo_nivel} possui mínimo (${n.min_alunos}) maior que o máximo (${n.max_alunos}).`,
      )
    }
  }

  // 3. Verificar contiguidade entre faixas consecutivas
  for (let i = 0; i < ordenados.length - 1; i++) {
    const atual = ordenados[i]
    const proximo = ordenados[i + 1]

    if (atual.max_alunos === null || atual.max_alunos === undefined) {
      erros.push(
        `O nível ${atual.codigo_nivel} não possui limite máximo, mas há outro nível (${proximo.codigo_nivel}) após ele. Somente o último nível pode ter teto ilimitado.`,
      )
      continue
    }

    const esperadoMinProximo = atual.max_alunos + 1

    if (proximo.min_alunos > esperadoMinProximo) {
      const diferenca = proximo.min_alunos - esperadoMinProximo
      if (diferenca === 1) {
        erros.push(
          `Há um buraco entre os níveis ${atual.codigo_nivel} e ${proximo.codigo_nivel}: entre ${atual.max_alunos} e ${proximo.min_alunos} não há nível coberto (o aluno ${esperadoMinProximo} fica sem faixa).`,
        )
      } else {
        erros.push(
          `Há um buraco de alunos entre os níveis ${atual.codigo_nivel} (máx ${atual.max_alunos}) e ${proximo.codigo_nivel} (mín ${proximo.min_alunos}): entre ${atual.max_alunos} e ${proximo.min_alunos} não há nível.`,
        )
      }
    } else if (proximo.min_alunos < esperadoMinProximo) {
      erros.push(
        `Sobreposição detectada entre os níveis ${atual.codigo_nivel} (máx ${atual.max_alunos}) e ${proximo.codigo_nivel} (mín ${proximo.min_alunos}): a faixa de alunos está duplicada.`,
      )
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  }
}

/**
 * Encontra o nível correspondente ao total de alunos informado.
 */
export function encontrarNivelPorAlunos(
  niveis: ConfiguracaoRhNivel[],
  totalAlunos: number,
): ConfiguracaoRhNivel | null {
  if (!niveis || niveis.length === 0) return null
  const ordenados = [...niveis].sort((a, b) => a.ordem - b.ordem)

  for (const n of ordenados) {
    const min = n.min_alunos
    const max = n.max_alunos
    if (totalAlunos >= min && (max === null || max === undefined || totalAlunos <= max)) {
      return n
    }
  }

  return null
}

export interface VagaCalculadaMemoria {
  funcaoId?: string | null
  funcaoNome: string
  linhaId: string
  linhaCodigo?: string
  tipoLinha?: 'FUNCAO' | 'CARGO'
  cargoId?: string | null
  cargoNome?: string | null
  baseCalculo: string
  modalidade: ModalidadeRhVaga
  diasSemana?: number | null
  quantidadeMatriz: number
  multiplicador: number
  quantidadeFinal: number
  cargosElegiveis: Array<{ cargoId: string; cargoNome: string; condicao: string }>
  memoriaCalculo: string
  observacaoLinha?: string | null
}

export interface ResultadoCalculoVagas {
  nivelEncontrado: ConfiguracaoRhNivel | null
  totalAlunos: number
  totalPeriodos: number
  totalTurmas: number
  vagas: VagaCalculadaMemoria[]
  passosMemoria: string[]
  avisos: string[]
}

/**
 * Normaliza o identificador de uma etapa para comparação flexível
 * Ex: "Educação Infantil" → "INFANTIL", "Creche" → "INFANTIL", etc.
 */
export function normalizarChaveEtapa(etapa: string): string {
  if (!etapa) return ''
  return etapa
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/**
 * SERVIÇO calcularVagasPorNivel
 *
 * Calcula a lista de vagas e a memória de cálculo a partir de uma configuração completa,
 * nº de alunos, nº de períodos e dicionário de turmas por etapa.
 * NÃO persiste absolutamente nada no banco (reaproveitável para simulação e Etapa 2).
 *
 * Regras da base de cálculo:
 * - POR_ESCOLA: vaga fixa da matriz (multiplicador = 1).
 * - POR_PERIODO: quantidade da matriz multiplicada pelo nº de períodos (se matriz = 1 e 2 períodos → 2 vagas; se matriz = 2 e 2 períodos → 4 vagas).
 * - POR_TURMA: quantidade da matriz multiplicada pelo nº total de turmas.
 * - POR_TURMA_ETAPA: quantidade da matriz multiplicada apenas pelo nº de turmas das etapas listadas em etapas_filtro.
 * - Quantidade 0 na matriz para aquele nível: NÃO gera vaga.
 */
export function calcularVagasPorNivel(
  configuracao: Pick<
    ConfiguracaoRhCompleta,
    'tipo_atendimento' | 'ano_letivo' | 'niveis' | 'linhas' | 'vagas'
  >,
  alunos: number,
  periodos: number,
  turmasPorEtapa: Record<string, number>,
): ResultadoCalculoVagas {
  const passos: string[] = []
  const avisos: string[] = []

  const totalPeriodos = Math.max(1, Number(periodos) || 1)
  const totalAlunos = Math.max(0, Number(alunos) || 0)

  // Calcular total de turmas
  const totalTurmas = Object.values(turmasPorEtapa || {}).reduce(
    (acc, cur) => acc + (Number(cur) || 0),
    0,
  )

  passos.push(
    `Entrada: ${totalAlunos} alunos, ${totalPeriodos} período(s), ${totalTurmas} turma(s) no total.`,
  )

  // 1. Encontrar o nível pelos alunos
  const niveis = configuracao.niveis || []
  const nivelEncontrado = encontrarNivelPorAlunos(niveis, totalAlunos)

  if (!nivelEncontrado) {
    avisos.push(
      `Nenhum nível correspondente encontrado para ${totalAlunos} alunos na configuração "${configuracao.tipo_atendimento}".`,
    )
    passos.push(`Nível não encontrado para ${totalAlunos} alunos.`)
    return {
      nivelEncontrado: null,
      totalAlunos,
      totalPeriodos,
      totalTurmas,
      vagas: [],
      passosMemoria: passos,
      avisos,
    }
  }

  const faixaTeto =
    nivelEncontrado.max_alunos !== null && nivelEncontrado.max_alunos !== undefined
      ? `${nivelEncontrado.max_alunos}`
      : 'sem limite'
  passos.push(
    `Nível identificado: ${nivelEncontrado.codigo_nivel} (faixa: ${nivelEncontrado.min_alunos} a ${faixaTeto} alunos).`,
  )

  // 2. Mapear vagas da matriz para o nível encontrado (células linha_id × nivel_id)
  const mapaVagasMatriz = new Map<
    string,
    { quantidade: number; modalidade: ModalidadeRhVaga; dias_semana?: number | null }
  >()
  for (const v of configuracao.vagas || []) {
    if (v.nivel_id === nivelEncontrado.id) {
      mapaVagasMatriz.set(v.linha_id, {
        quantidade: v.quantidade,
        modalidade: v.modalidade,
        dias_semana: v.dias_semana,
      })
    }
  }

  // 3. Processar cada linha cadastrada
  const linhasOrdenadas = [...(configuracao.linhas || [])].sort((a, b) => a.ordem - b.ordem)
  const vagasCalculadas: VagaCalculadaMemoria[] = []

  for (const linha of linhasOrdenadas) {
    const celula = mapaVagasMatriz.get(linha.id)
    const qtdMatriz = celula ? celula.quantidade : 0
    const modalidade = celula?.modalidade || 'FIXO'
    const diasSemana = celula?.dias_semana ?? null
    const isCargo = linha.tipo_linha === 'CARGO' || (!linha.funcao_id && !!linha.cargo_id)
    const itemNome = isCargo ? linha.cargo?.nome || 'Cargo' : linha.funcao?.nome || 'Função'
    const tipoPrefixo = isCargo ? 'Linha (Cargo)' : 'Linha (Função)'

    // Regra da especificação: "quantidade 0 não gera vaga"
    if (qtdMatriz <= 0) {
      passos.push(
        `${tipoPrefixo} "${itemNome}": 0 vagas previstas para o Nível ${nivelEncontrado.codigo_nivel} (não gera vaga).`,
      )
      continue
    }

    let multiplicador = 1
    let memoriaLinha = ''

    switch (linha.base_calculo) {
      case 'POR_ESCOLA': {
        multiplicador = 1
        memoriaLinha = `Base POR_ESCOLA: ${qtdMatriz} vaga(s) fixas da tabela`
        break
      }

      case 'POR_PERIODO': {
        multiplicador = totalPeriodos
        memoriaLinha = `Base POR_PERIODO: ${qtdMatriz} × ${totalPeriodos} período(s) = ${qtdMatriz * totalPeriodos} vaga(s)`
        break
      }

      case 'POR_TURMA': {
        multiplicador = totalTurmas
        memoriaLinha = `Base POR_TURMA: ${qtdMatriz} × ${totalTurmas} turma(s) = ${qtdMatriz * totalTurmas} vaga(s)`
        break
      }

      case 'POR_TURMA_ETAPA': {
        // Filtrar turmas que pertençam a uma das etapas configuradas na linha
        const filtros = (linha.etapas_filtro || []).map((e) => normalizarChaveEtapa(e))
        let turmasFiltradas = 0

        for (const [etapaKey, qtd] of Object.entries(turmasPorEtapa || {})) {
          const normKey = normalizarChaveEtapa(etapaKey)
          // Combina se a chave normalizada é igual ou está contida/contém
          const match = filtros.some(
            (f) =>
              f === normKey ||
              normKey.includes(f) ||
              f.includes(normKey) ||
              (f === 'INFANTIL' && normKey.includes('INFANTIL')),
          )
          if (match) {
            turmasFiltradas += Number(qtd) || 0
          }
        }

        multiplicador = turmasFiltradas
        const listaEtapas = (linha.etapas_filtro || []).join(', ')
        memoriaLinha = `Base POR_TURMA_ETAPA [${listaEtapas}]: ${qtdMatriz} × ${turmasFiltradas} turma(s) das etapas filtradas = ${qtdMatriz * turmasFiltradas} vaga(s)`
        break
      }

      default:
        multiplicador = 1
        memoriaLinha = `Base ${linha.base_calculo}: ${qtdMatriz} vaga(s)`
    }

    const quantidadeFinal = qtdMatriz * multiplicador

    if (quantidadeFinal <= 0) {
      passos.push(
        `${tipoPrefixo} "${itemNome}": cálculo resultou em 0 vaga(s) (${memoriaLinha}). Não gera vaga.`,
      )
      continue
    }

    // Cargos elegíveis:
    // Se a linha já é um CARGO direto:
    // Caso tenha registro em linha.cargos com condição (ex: SEMED/Readaptado), aproveita a condição;
    // senão o próprio cargo da linha é o único cargo elegível com condição NENHUMA.
    let cargosElegiveis: Array<{ cargoId: string; cargoNome: string; condicao: string }> = []
    if (isCargo && linha.cargo_id) {
      if (linha.cargos && linha.cargos.length > 0) {
        cargosElegiveis = linha.cargos.map((c) => ({
          cargoId: c.cargo_id,
          cargoNome: c.cargo?.nome || linha.cargo?.nome || 'Cargo',
          condicao: c.condicao || 'NENHUMA',
        }))
      } else {
        cargosElegiveis = [
          {
            cargoId: linha.cargo_id,
            cargoNome: linha.cargo?.nome || 'Cargo',
            condicao: 'NENHUMA',
          },
        ]
      }
    } else {
      cargosElegiveis = (linha.cargos || []).map((c) => ({
        cargoId: c.cargo_id,
        cargoNome: c.cargo?.nome || 'Cargo',
        condicao: c.condicao,
      }))
    }

    const modDesc =
      modalidade === 'ITINERANTE'
        ? diasSemana
          ? `Itinerante (${diasSemana}x/sem)`
          : 'Itinerante'
        : 'Fixo'

    passos.push(
      `${tipoPrefixo} "${itemNome}": ${quantidadeFinal} vaga(s) [${modDesc}]. Memória: ${memoriaLinha}.`,
    )

    vagasCalculadas.push({
      funcaoId: linha.funcao_id || undefined,
      funcaoNome: itemNome,
      linhaId: linha.id,
      linhaCodigo: linha.codigo,
      tipoLinha: isCargo ? 'CARGO' : 'FUNCAO',
      cargoId: isCargo ? linha.cargo_id || null : null,
      cargoNome: isCargo ? linha.cargo?.nome || itemNome : null,
      baseCalculo: linha.base_calculo,
      modalidade,
      diasSemana,
      quantidadeMatriz: qtdMatriz,
      multiplicador,
      quantidadeFinal,
      cargosElegiveis,
      memoriaCalculo: memoriaLinha,
      observacaoLinha: linha.observacao,
    })
  }

  return {
    nivelEncontrado,
    totalAlunos,
    totalPeriodos,
    totalTurmas,
    vagas: vagasCalculadas,
    passosMemoria: passos,
    avisos,
  }
}
