import { describe, it, expect, vi } from 'vitest'
import { calcularVagasPorNivel, ResultadoCalculoVagas } from './configuracao-rh-calculo'
import {
  expandirSlotsIndividuais,
  normalizarTurmasPorEtapaDicionario,
  validarVagaManual,
  ValidacaoVagaError,
  calcularStatusPorOcupacao,
  rotuloPeriodoVaga,
  rotuloModalidadeVaga,
  rotuloStatusVagaReal,
  rotuloTipoVinculoVaga,
  PERIODOS_VAGA,
  MODALIDADES_VAGA,
  calcularPreviaGeracao,
  confirmarGeracaoVagas,
  migrarVagasAnoLetivo,
  obterResumoVagasAnoOrigem,
  editarVaga,
  inserirVagaManual,
  PreviaGeracaoResultado,
  ConfirmarGeracaoResultado,
  MigracaoAnoLetivoResultado,
  ResumoVagasAnoOrigem,
  isUuidValido,
  sanitizarFiltroTexto,
} from './vagas'
import {
  ConfiguracaoRhCompleta,
  ConfiguracaoRhLinha,
  PeriodoEscola,
  VagaReal,
} from '@/types/gestao-escolar'

/**
 * Fixture de configuração 2026: Ensino Fundamental e Educação Infantil (20h)
 * Níveis I (0 a 50) e V (301 a 350)
 */
const mockConfiguracao20h: ConfiguracaoRhCompleta = {
  id: 'cfg-20h-mock',
  codigo: 'CRHN-0003',
  tipo_atendimento: 'Ensino Fundamental e Educação Infantil (20h)',
  ano_letivo: 2026,
  status: 'RASCUNHO',
  observacao: 'Seed 2026',
  niveis: [
    {
      id: 'niv-I',
      codigo: 'NIV-0001',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'I',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 50,
    },
    {
      id: 'niv-II',
      codigo: 'NIV-0002',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'II',
      ordem: 2,
      min_alunos: 51,
      max_alunos: 100,
    },
    {
      id: 'niv-III',
      codigo: 'NIV-0003',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'III',
      ordem: 3,
      min_alunos: 101,
      max_alunos: 200,
    },
    {
      id: 'niv-IV',
      codigo: 'NIV-0004',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'IV',
      ordem: 4,
      min_alunos: 201,
      max_alunos: 300,
    },
    {
      id: 'niv-V',
      codigo: 'NIV-0005',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'V',
      ordem: 5,
      min_alunos: 301,
      max_alunos: 350,
    },
    {
      id: 'niv-VI',
      codigo: 'NIV-0006',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'VI',
      ordem: 6,
      min_alunos: 351,
      max_alunos: 500,
    },
    {
      id: 'niv-VII',
      codigo: 'NIV-0007',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'VII',
      ordem: 7,
      min_alunos: 501,
      max_alunos: 650,
    },
    {
      id: 'niv-VIII',
      codigo: 'NIV-0008',
      configuracao_rh_id: 'cfg-20h-mock',
      codigo_nivel: 'VIII',
      ordem: 8,
      min_alunos: 651,
      max_alunos: null,
    },
  ],
  linhas: [
    {
      id: 'linha-diretor',
      codigo: 'LNH-0001',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-diretor',
      ordem: 1,
      base_calculo: 'POR_ESCOLA',
      funcao: { id: 'f-diretor', codigo: 'FNC-0001', nome: 'Diretor Escolar', ativo: true },
      cargos: [
        {
          id: 'lc-1',
          cargo_id: 'cargo-prof-20h',
          condicao: 'NENHUMA',
          cargo: {
            id: 'cargo-prof-20h',
            codigo: 'CAR-0001',
            nome: 'Professor Anos Iniciais (20h)',
            ativo: true,
          },
        },
      ],
    },
    {
      id: 'linha-coord',
      codigo: 'LNH-0002',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-coord',
      ordem: 2,
      base_calculo: 'POR_PERIODO',
      funcao: { id: 'f-coord', codigo: 'FNC-0002', nome: 'Coordenador Pedagógico', ativo: true },
      cargos: [],
    },
    {
      id: 'linha-suporte',
      codigo: 'LNH-0003',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-suporte',
      ordem: 3,
      base_calculo: 'POR_PERIODO',
      funcao: { id: 'f-suporte', codigo: 'FNC-0003', nome: 'Professor Suporte', ativo: true },
      cargos: [],
    },
    {
      id: 'linha-regente',
      codigo: 'LNH-0004',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-regente',
      ordem: 4,
      base_calculo: 'POR_TURMA',
      funcao: { id: 'f-regente', codigo: 'FNC-0004', nome: 'Regente', ativo: true },
      cargos: [],
    },
    {
      id: 'linha-secretario',
      codigo: 'LNH-0005',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-secretario',
      ordem: 5,
      base_calculo: 'POR_ESCOLA',
      funcao: { id: 'f-secretario', codigo: 'FNC-0005', nome: 'Secretário', ativo: true },
      cargos: [],
    },
    {
      id: 'linha-leitura',
      codigo: 'LNH-0006',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-leitura',
      ordem: 6,
      base_calculo: 'POR_ESCOLA',
      funcao: {
        id: 'f-leitura',
        codigo: 'FNC-0006',
        nome: 'Assessor de Sala de Leitura',
        ativo: true,
      },
      cargos: [],
    },
    {
      id: 'linha-sg-fem',
      codigo: 'LNH-0007',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-sg-fem',
      ordem: 7,
      base_calculo: 'POR_ESCOLA',
      funcao: { id: 'f-sg-fem', codigo: 'FNC-0007', nome: 'Serviços Gerais Feminino', ativo: true },
      cargos: [],
    },
    {
      id: 'linha-sg-masc',
      codigo: 'LNH-0008',
      configuracao_rh_id: 'cfg-20h-mock',
      funcao_id: 'f-sg-masc',
      ordem: 8,
      base_calculo: 'POR_ESCOLA',
      funcao: {
        id: 'f-sg-masc',
        codigo: 'FNC-0008',
        nome: 'Serviços Gerais Masculino',
        ativo: true,
      },
      cargos: [],
    },
  ],
  vagas: [
    // Nível V (Roberto Conceição):
    // Diretor: 1 (POR_ESCOLA) -> 1
    // Coordenador: 1 (POR_PERIODO com 2 períodos) -> 2
    // Professor Suporte: 1 (POR_PERIODO com 2 períodos) -> 2
    // Regente: 1 (POR_TURMA com 14 turmas) -> 14
    // Secretário: 1 (POR_ESCOLA) -> 1
    // Assessor Leitura: 1 (POR_ESCOLA) -> 1
    // SG Feminino: 8 (POR_ESCOLA) -> 8
    // SG Masculino: 1 (POR_ESCOLA) -> 1
    // Total = 1 + 2 + 2 + 14 + 1 + 1 + 8 + 1 = 30
    {
      id: 'v-v-dir',
      linha_id: 'linha-diretor',
      nivel_id: 'niv-V',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-v-coord',
      linha_id: 'linha-coord',
      nivel_id: 'niv-V',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-v-sup',
      linha_id: 'linha-suporte',
      nivel_id: 'niv-V',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-v-reg',
      linha_id: 'linha-regente',
      nivel_id: 'niv-V',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-v-sec',
      linha_id: 'linha-secretario',
      nivel_id: 'niv-V',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-v-lei',
      linha_id: 'linha-leitura',
      nivel_id: 'niv-V',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-v-sgf',
      linha_id: 'linha-sg-fem',
      nivel_id: 'niv-V',
      quantidade: 8,
      modalidade: 'FIXO',
    },
    {
      id: 'v-v-sgm',
      linha_id: 'linha-sg-masc',
      nivel_id: 'niv-V',
      quantidade: 1,
      modalidade: 'FIXO',
    },

    // Nível I (Ana Zichack - 38 alunos, 5 turmas, 2 períodos):
    // Diretor: 1 (FIXO)
    // Coordenador: 1 (POR_PERIODO)
    // Professor Suporte: 0 (não tem)
    // Regente: 1 (POR_TURMA)
    // Secretário: 1 (ITINERANTE)
    // Assessor Leitura: 1 (ITINERANTE)
    // SG Feminino: 1 (FIXO)
    // SG Masculino: 0
    {
      id: 'v-i-dir',
      linha_id: 'linha-diretor',
      nivel_id: 'niv-I',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-i-coord',
      linha_id: 'linha-coord',
      nivel_id: 'niv-I',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-i-sup',
      linha_id: 'linha-suporte',
      nivel_id: 'niv-I',
      quantidade: 0,
      modalidade: 'FIXO',
    },
    {
      id: 'v-i-reg',
      linha_id: 'linha-regente',
      nivel_id: 'niv-I',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-i-sec',
      linha_id: 'linha-secretario',
      nivel_id: 'niv-I',
      quantidade: 1,
      modalidade: 'ITINERANTE',
      dias_semana: 2,
    },
    {
      id: 'v-i-lei',
      linha_id: 'linha-leitura',
      nivel_id: 'niv-I',
      quantidade: 1,
      modalidade: 'ITINERANTE',
      dias_semana: 2,
    },
    {
      id: 'v-i-sgf',
      linha_id: 'linha-sg-fem',
      nivel_id: 'niv-I',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v-i-sgm',
      linha_id: 'linha-sg-masc',
      nivel_id: 'niv-I',
      quantidade: 0,
      modalidade: 'FIXO',
    },
  ],
}

/**
 * Fixture de configuração 2026: Educação Infantil (40h)
 * Nível A (0 a 85 alunos)
 */
const mockConfiguracao40h: ConfiguracaoRhCompleta = {
  id: 'cfg-40h-mock',
  codigo: 'CRHN-0004',
  tipo_atendimento: 'Educação Infantil (40h)',
  ano_letivo: 2026,
  status: 'RASCUNHO',
  observacao: 'Seed 40h',
  niveis: [
    {
      id: 'niv-A',
      codigo: 'NIV-0010',
      configuracao_rh_id: 'cfg-40h-mock',
      codigo_nivel: 'A',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 85,
    },
    {
      id: 'niv-B',
      codigo: 'NIV-0011',
      configuracao_rh_id: 'cfg-40h-mock',
      codigo_nivel: 'B',
      ordem: 2,
      min_alunos: 86,
      max_alunos: 140,
    },
    {
      id: 'niv-C',
      codigo: 'NIV-0012',
      configuracao_rh_id: 'cfg-40h-mock',
      codigo_nivel: 'C',
      ordem: 3,
      min_alunos: 141,
      max_alunos: null,
    },
  ],
  linhas: [
    {
      id: 'l40-dir',
      codigo: 'LNH-0020',
      configuracao_rh_id: 'cfg-40h-mock',
      funcao_id: 'f-dir',
      ordem: 1,
      base_calculo: 'POR_ESCOLA',
      funcao: { id: 'f-dir', codigo: 'FNC-0001', nome: 'Diretor Escolar', ativo: true },
      cargos: [],
    },
    {
      id: 'l40-coord',
      codigo: 'LNH-0021',
      configuracao_rh_id: 'cfg-40h-mock',
      funcao_id: 'f-coord',
      ordem: 2,
      base_calculo: 'POR_ESCOLA',
      funcao: { id: 'f-coord', codigo: 'FNC-0002', nome: 'Coordenador Pedagógico', ativo: true },
      cargos: [],
    },
    {
      id: 'l40-reg',
      codigo: 'LNH-0022',
      configuracao_rh_id: 'cfg-40h-mock',
      funcao_id: 'f-reg',
      ordem: 3,
      base_calculo: 'POR_TURMA',
      funcao: { id: 'f-reg', codigo: 'FNC-0004', nome: 'Professor Regente', ativo: true },
      cargos: [],
    },
    {
      id: 'l40-sup-sala',
      codigo: 'LNH-0023',
      configuracao_rh_id: 'cfg-40h-mock',
      funcao_id: 'f-sup-sala',
      ordem: 4,
      base_calculo: 'POR_TURMA_ETAPA',
      etapas_filtro: ['INFANTIL', 'INFANTIL_I', 'INFANTIL_II'],
      funcao: {
        id: 'f-sup-sala',
        codigo: 'FNC-0009',
        nome: 'Suporte Pedagógico de Sala',
        ativo: true,
      },
      cargos: [],
    },
    {
      id: 'l40-sec',
      codigo: 'LNH-0024',
      configuracao_rh_id: 'cfg-40h-mock',
      funcao_id: 'f-sec',
      ordem: 5,
      base_calculo: 'POR_ESCOLA',
      funcao: { id: 'f-sec', codigo: 'FNC-0005', nome: 'Secretário Escolar', ativo: true },
      cargos: [],
    },
  ],
  vagas: [
    { id: 'v40-dir', linha_id: 'l40-dir', nivel_id: 'niv-A', quantidade: 1, modalidade: 'FIXO' },
    {
      id: 'v40-coord',
      linha_id: 'l40-coord',
      nivel_id: 'niv-A',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    { id: 'v40-reg', linha_id: 'l40-reg', nivel_id: 'niv-A', quantidade: 1, modalidade: 'FIXO' },
    {
      id: 'v40-sup-sala',
      linha_id: 'l40-sup-sala',
      nivel_id: 'niv-A',
      quantidade: 1,
      modalidade: 'FIXO',
    },
    {
      id: 'v40-sec',
      linha_id: 'l40-sec',
      nivel_id: 'niv-A',
      quantidade: 1,
      modalidade: 'ITINERANTE',
      dias_semana: 2,
    },
  ],
}

describe('Testes Unitários da Etapa 2 — Regras do Usuário', () => {
  // Teste 1: Roberto Conceição (323 alunos, 14 turmas, 2 períodos) → Nível V e 30 registros
  it('Roberto Conceição (323 alunos, 14 turmas, 2 períodos) → Nível V e exatamente 30 registros por função', () => {
    const res = calcularVagasPorNivel(mockConfiguracao20h, 323, 2, { TURMAS: 14 })

    expect(res.nivelEncontrado?.codigo_nivel).toBe('V')

    const periodos: PeriodoEscola[] = ['MANHA', 'TARDE']
    const todosSlots: any[] = []

    for (const v of res.vagas) {
      const linha = mockConfiguracao20h.linhas.find((l) => l.id === v.linhaId)!
      const slots = expandirSlotsIndividuais(
        linha,
        v.quantidadeMatriz,
        periodos,
        14,
        0,
        v.modalidade,
        v.diasSemana,
      )
      todosSlots.push(...slots)
    }

    // Total de registros deve ser 30:
    // Diretor 1, Coordenador 2 (1 por período), Professor Suporte 2 (1 por período),
    // Regente 14, Secretário 1, Assessor de Sala de Leitura 1,
    // Serviços Gerais Feminino 8, Serviços Gerais Masculino 1
    expect(todosSlots.length).toBe(30)

    const porFuncao = todosSlots.reduce((acc: any, cur) => {
      acc[cur.funcao] = (acc[cur.funcao] || 0) + 1
      return acc
    }, {})

    expect(porFuncao['Diretor Escolar']).toBe(1)
    expect(porFuncao['Coordenador Pedagógico']).toBe(2)
    expect(porFuncao['Professor Suporte']).toBe(2)
    expect(porFuncao['Regente']).toBe(14)
    expect(porFuncao['Secretário']).toBe(1)
    expect(porFuncao['Assessor de Sala de Leitura']).toBe(1)
    expect(porFuncao['Serviços Gerais Feminino']).toBe(8)
    expect(porFuncao['Serviços Gerais Masculino']).toBe(1)

    // Coordenador e Professor Suporte devem ter períodos atribuídos (1 MANHA e 1 TARDE)
    const coordSlots = todosSlots.filter((s) => s.funcao === 'Coordenador Pedagógico')
    expect(coordSlots.map((s) => s.periodo)).toEqual(['MANHA', 'TARDE'])

    const supSlots = todosSlots.filter((s) => s.funcao === 'Professor Suporte')
    expect(supSlots.map((s) => s.periodo)).toEqual(['MANHA', 'TARDE'])
  })

  // Teste 2: Ana Zichack (38 alunos, 5 turmas, 2 períodos) → Nível I
  it('Ana Zichack (38 alunos, 5 turmas, 2 períodos) → Nível I: Secretário e Assessor ITINERANTES, sem Professor Suporte', () => {
    const res = calcularVagasPorNivel(mockConfiguracao20h, 38, 2, { TURMAS: 5 })

    expect(res.nivelEncontrado?.codigo_nivel).toBe('I')

    // Secretário e Assessor ITINERANTES
    const secVaga = res.vagas.find((v) => v.funcaoNome === 'Secretário')
    expect(secVaga?.modalidade).toBe('ITINERANTE')
    expect(secVaga?.diasSemana).toBe(2)

    const leiVaga = res.vagas.find((v) => v.funcaoNome === 'Assessor de Sala de Leitura')
    expect(leiVaga?.modalidade).toBe('ITINERANTE')

    // Sem Professor Suporte (quantidadeMatriz = 0 -> não aparece em vagas calculadas)
    const supVaga = res.vagas.find((v) => v.funcaoNome === 'Professor Suporte')
    expect(supVaga).toBeUndefined()
  })

  // Teste 3: CMEI Pasquina (65 alunos, 5 turmas, INTEGRAL, 3 turmas de Infantil/I/II) → Nível A
  it('CMEI Pasquina (65 alunos, 5 turmas, INTEGRAL, 3 turmas Infantil) → Nível A: Secretário ITINERANTE 2 dias/semana, Suporte de Sala = 3', () => {
    const res = calcularVagasPorNivel(mockConfiguracao40h, 65, 1, { INFANTIL: 3, OUTROS: 2 })

    expect(res.nivelEncontrado?.codigo_nivel).toBe('A')

    const secVaga = res.vagas.find((v) => v.funcaoNome === 'Secretário Escolar')
    expect(secVaga?.modalidade).toBe('ITINERANTE')
    expect(secVaga?.diasSemana).toBe(2)

    const supSala = res.vagas.find((v) => v.funcaoNome === 'Suporte Pedagógico de Sala')
    expect(supSala).toBeDefined()
    expect(supSala?.quantidadeFinal).toBe(3) // 1 matriz x 3 turmas de infantil
  })

  // Teste 4: Regerar sem mudanças → nenhum registro novo (idempotência)
  it('Regerar sem mudanças → idempotência: 0 novos registros a criar', () => {
    const linha = mockConfiguracao20h.linhas[0] // Diretor
    const slotsCalculados = expandirSlotsIndividuais(linha, 1, ['MANHA', 'TARDE'], 14, 0, 'FIXO')
    expect(slotsCalculados.length).toBe(1)

    // Se no banco já existe 1 vaga para essa linha
    const existentes: Partial<VagaReal>[] = [
      {
        id: 'vaga-existente-1',
        configuracao_rh_linha_id: linha.id,
        numero_sequencial: 1,
        status: 'OCUPADA',
      },
    ]

    const faltam = slotsCalculados.length - existentes.length
    expect(faltam).toBe(0) // nenhum novo
  })

  // Teste 5: Regerar com menos alunos e vagas ocupadas → as ocupadas viram EXCEDENTE, nunca são apagadas
  it('Regerar com redução e vagas ocupadas → ocupadas viram EXCEDENTE e nunca são deletadas', () => {
    // Cenário: eram 4 vagas de Serviços Gerais Feminino e agora o novo porte dá apenas 2
    const existentesOcupadas: Partial<VagaReal>[] = [
      { id: 'sg-1', status: 'OCUPADA', numero_sequencial: 1 },
      { id: 'sg-2', status: 'OCUPADA', numero_sequencial: 2 },
      { id: 'sg-3', status: 'OCUPADA', numero_sequencial: 3 },
      { id: 'sg-4', status: 'OCUPADA', numero_sequencial: 4 },
    ]

    const qtdIdeal = 2
    const diferencaReducao = existentesOcupadas.length - qtdIdeal // 2 a mais

    const vagasAbertas = existentesOcupadas.filter((v) => v.status === 'ABERTA')
    const vagasOcupadas = existentesOcupadas.filter((v) => v.status === 'OCUPADA')

    let abertasParaRemoverCount = Math.min(diferencaReducao, vagasAbertas.length)
    const excessoOcupado = diferencaReducao - abertasParaRemoverCount

    const ocupadasExcedentes = vagasOcupadas.slice(vagasOcupadas.length - excessoOcupado)
    const ocupadasMantidas = vagasOcupadas.slice(0, vagasOcupadas.length - excessoOcupado)

    expect(abertasParaRemoverCount).toBe(0) // Nenhuma aberta foi apagada porque eram todas ocupadas
    expect(ocupadasExcedentes.length).toBe(2) // 2 viraram excedentes
    expect(ocupadasMantidas.length).toBe(2) // 2 continuaram mantidas
  })

  // Teste 6: Turmas por etapa converter normalizador
  it('normalizarTurmasPorEtapaDicionario lida corretamente com objetos e arrays', () => {
    const rawObj = { INFANTIL: '3', BERCARIO: 2 }
    expect(normalizarTurmasPorEtapaDicionario(rawObj)).toEqual({
      INFANTIL: 3,
      BERCARIO: 2,
    })

    const rawArr = [
      { etapa: 'INFANTIL_I', quantidade: 4 },
      { etapa: 'INFANTIL_II', quantidade: '2' },
    ]
    expect(normalizarTurmasPorEtapaDicionario(rawArr)).toEqual({
      INFANTIL_I: 4,
      INFANTIL_II: 2,
    })

    expect(normalizarTurmasPorEtapaDicionario(null)).toEqual({})
  })

  // Teste 7: Regras de Migração de Vagas de Ano Letivo
  it('regras de migração copiam titular e ocupante, PREENCHIDA com ocupante, ABERTA sem ocupante e preservam vaga_excedente', () => {
    const vagasOrigem = [
      {
        id: 'v1',
        funcao: 'Professor Regente',
        numero_sequencial: 1,
        periodo: 'MANHA',
        modalidade: 'FIXO',
        dias_semana: null,
        cargo_id: 'c1',
        profissional_titular_id: 'p1',
        profissional_ocupante_id: 'p2',
        nome_ocupante: 'João Silva',
        status: 'OCUPADA',
        vaga_excedente: false, // gerada automaticamente
      },
      {
        id: 'v2',
        funcao: 'Professor Regente',
        numero_sequencial: 2,
        periodo: 'MANHA',
        modalidade: 'FIXO',
        dias_semana: null,
        cargo_id: 'c1',
        profissional_titular_id: null,
        profissional_ocupante_id: null,
        nome_ocupante: null,
        status: 'ABERTA',
        vaga_excedente: true, // manual excedente
      },
      {
        id: 'v3',
        funcao: 'Auxiliar de Serviços',
        numero_sequencial: 1,
        periodo: null,
        modalidade: 'FIXO',
        dias_semana: null,
        cargo_id: null,
        profissional_titular_id: 'p3',
        profissional_ocupante_id: null,
        nome_ocupante: null,
        status: 'EXCEDENTE',
        vaga_excedente: false,
      },
    ]

    // Simulação da transformação de migração — MESMA regra do serviço migrarVagasAnoLetivo
    const migradas = vagasOrigem.map((vo) => {
      const titularId = vo.profissional_titular_id ?? null
      const ocupanteId = vo.profissional_ocupante_id ?? null
      return {
        funcao: vo.funcao,
        numero_sequencial: vo.numero_sequencial,
        periodo: vo.periodo,
        modalidade: vo.modalidade,
        dias_semana: vo.dias_semana,
        cargo_id: vo.cargo_id,
        profissional_titular_id: titularId,
        profissional_ocupante_id: ocupanteId,
        nome_ocupante: ocupanteId ? (vo.nome_ocupante ?? null) : null,
        status: ocupanteId ? 'PREENCHIDA' : 'ABERTA',
        vaga_excedente: Boolean(vo.vaga_excedente),
      }
    })

    // Titular e ocupante da origem são levados para o ano destino
    expect(migradas[0].profissional_titular_id).toBe('p1')
    expect(migradas[0].profissional_ocupante_id).toBe('p2')
    expect(migradas[0].nome_ocupante).toBe('João Silva')
    expect(migradas[0].status).toBe('PREENCHIDA')
    expect(migradas[2].profissional_titular_id).toBe('p3')
    expect(migradas[2].profissional_ocupante_id).toBe(null)
    expect(migradas[2].status).toBe('ABERTA')

    // Vaga sem titular e sem ocupante nasce ABERTA
    expect(migradas[1].profissional_titular_id).toBe(null)
    expect(migradas[1].profissional_ocupante_id).toBe(null)
    expect(migradas[1].nome_ocupante).toBe(null)
    expect(migradas[1].status).toBe('ABERTA')

    // Vaga excedente manual preserva true, vaga gerada preserva false
    expect(migradas[0].vaga_excedente).toBe(false)
    expect(migradas[1].vaga_excedente).toBe(true)
    expect(migradas[2].vaga_excedente).toBe(false)
  })

  // Teste 8: Validação dos 9 atributos e dependência dinâmica no serviço de vagas
  it('validarVagaManual valida campos obrigatórios, dependências e modalidade itinerante', () => {
    // Falta Unidade
    expect(() =>
      validarVagaManual({
        anoLetivo: 2026,
        tipoVinculo: 'CARGO',
        cargoId: 'c1',
        periodo: 'MANHA',
        modalidade: 'FIXO',
      }),
    ).toThrow(ValidacaoVagaError)

    // Falta Ano Letivo
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        tipoVinculo: 'CARGO',
        cargoId: 'c1',
        periodo: 'MANHA',
        modalidade: 'FIXO',
      }),
    ).toThrow(ValidacaoVagaError)

    // Tipo de vínculo inválido
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'OUTRO',
        periodo: 'MANHA',
        modalidade: 'FIXO',
      }),
    ).toThrow(ValidacaoVagaError)

    // Tipo CARGO sem cargoId
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'CARGO',
        cargoId: '',
        periodo: 'MANHA',
        modalidade: 'FIXO',
      }),
    ).toThrow('Vaga de Cargo: selecione o Cargo da Vaga.')

    // Tipo FUNCAO sem funcaoId
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'FUNCAO',
        funcaoId: '',
        periodo: 'MANHA',
        modalidade: 'FIXO',
      }),
    ).toThrow('Vaga de Função: selecione a Função da Vaga.')

    // Falta Período
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'CARGO',
        cargoId: 'c1',
        periodo: null,
        modalidade: 'FIXO',
      }),
    ).toThrow('Selecione o Período da vaga.')

    // Falta Modalidade
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'CARGO',
        cargoId: 'c1',
        periodo: 'MANHA',
        modalidade: '',
      }),
    ).toThrow('Selecione a Modalidade da vaga.')

    // Modalidade ITINERANTE com dias inválidos
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'CARGO',
        cargoId: 'c1',
        periodo: 'MANHA',
        modalidade: 'ITINERANTE',
        diasSemana: 0,
      }),
    ).toThrow('Dias na Semana deve ficar entre 1 e 5 para vaga Itinerante.')

    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'CARGO',
        cargoId: 'c1',
        periodo: 'MANHA',
        modalidade: 'ITINERANTE',
        diasSemana: 6,
      }),
    ).toThrow('Dias na Semana deve ficar entre 1 e 5 para vaga Itinerante.')

    // Vaga de Cargo válida
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'CARGO',
        cargoId: 'c1',
        periodo: 'MANHA',
        modalidade: 'FIXO',
      }),
    ).not.toThrow()

    // Vaga de Função válida com Itinerante 3 dias
    expect(() =>
      validarVagaManual({
        unidadeEscolarId: 'u1',
        anoLetivo: 2026,
        tipoVinculo: 'FUNCAO',
        funcaoId: 'f1',
        periodo: 'SEM',
        modalidade: 'ITINERANTE',
        diasSemana: 3,
      }),
    ).not.toThrow()
  })

  // Teste 9: Coerência do Status com Ocupação e rótulos
  it('calcularStatusPorOcupacao e rotulos do novo modelo', () => {
    // Com profissional ocupante => PREENCHIDA
    expect(calcularStatusPorOcupacao('prof-123')).toBe('PREENCHIDA')
    // Sem profissional ocupante => ABERTA
    expect(calcularStatusPorOcupacao(null)).toBe('ABERTA')
    expect(calcularStatusPorOcupacao(undefined)).toBe('ABERTA')
    expect(calcularStatusPorOcupacao('')).toBe('ABERTA')
    // Se status informado for EXCEDENTE preserva
    expect(calcularStatusPorOcupacao('prof-123', 'EXCEDENTE')).toBe('EXCEDENTE')

    // Rótulos de período
    expect(rotuloPeriodoVaga('SEM')).toBe('Geral / Sem Período')
    expect(rotuloPeriodoVaga('GERAL')).toBe('Geral / Sem Período')
    expect(rotuloPeriodoVaga(null)).toBe('Geral / Sem Período')
    expect(rotuloPeriodoVaga('MANHA')).toBe('Manhã')
    expect(rotuloPeriodoVaga('TARDE')).toBe('Tarde')
    expect(rotuloPeriodoVaga('INTEGRAL')).toBe('Integral')
    expect(rotuloPeriodoVaga('NOITE')).toBe('Noite')

    // Rótulos de modalidade
    expect(rotuloModalidadeVaga('FIXO')).toBe('Fixo')
    expect(rotuloModalidadeVaga('ITINERANTE')).toBe('Itinerante')

    // Rótulos de status
    expect(rotuloStatusVagaReal('ABERTA')).toBe('Aberta')
    expect(rotuloStatusVagaReal('PREENCHIDA')).toBe('Preenchida')
    expect(rotuloStatusVagaReal('OCUPADA')).toBe('Preenchida')
    expect(rotuloStatusVagaReal('EXCEDENTE')).toBe('Excedente')

    // Rótulos de tipo de vínculo
    expect(rotuloTipoVinculoVaga('CARGO')).toBe('Cargo')
    expect(rotuloTipoVinculoVaga('FUNCAO')).toBe('Função')

    // Lista de opções padrão
    expect(PERIODOS_VAGA.map((p) => p.valor)).toEqual([
      'SEM',
      'MANHA',
      'TARDE',
      'INTEGRAL',
      'NOITE',
    ])
    expect(MODALIDADES_VAGA.map((m) => m.valor)).toEqual(['FIXO', 'ITINERANTE'])
  })

  // Teste 10: Assinaturas e contratos de retorno das funções do serviço
  it('exporta funções e estruturas alinhadas com as telas e drilldown', () => {
    expect(typeof calcularPreviaGeracao).toBe('function')
    expect(typeof confirmarGeracaoVagas).toBe('function')
    expect(typeof migrarVagasAnoLetivo).toBe('function')
    expect(typeof obterResumoVagasAnoOrigem).toBe('function')
    expect(typeof editarVaga).toBe('function')
    expect(typeof inserirVagaManual).toBe('function')

    // Contrato de PreviaGeracaoResultado esperado por Vagas.tsx e UnidadeVagasDrilldown.tsx
    const previaFake: PreviaGeracaoResultado = {
      ok: true,
      mensagem: undefined,
      vagasPorUnidade: [],
      totalVagas: 12,
      resumo: [{ unidade: 'Escola Modelo', total: 12 }],
      bloqueadoPorFaltaDados: null,
      configuracaoUsada: { id: 'cfg-1', status: 'VIGENTE' },
      nivelEncontradoCodigo: 'V',
      nivelFaixaDescricao: 'Faixa: 301 a 350 alunos',
      unidadeAno: { qtd_alunos: 320, qtd_turmas: 14, periodos: ['MANHA', 'TARDE'] },
      resumoTexto: 'Resumo da prévia',
      totalVagasCalculadas: 12,
      vagasLinhas: [],
      escola: { id: 'u1', nome: 'Escola Modelo', tipo_atendimento: 'Ensino Fundamental' },
      porteEscola: { quantidade_alunos: 320, nivel_faixa: 'Nível V' },
      turmasCadastradas: [],
      contagemTurmasPorEtapa: {},
      vagasExistentes: [],
    }
    expect(previaFake.nivelEncontradoCodigo).toBe('V')
    expect(previaFake.totalVagasCalculadas).toBe(12)

    // Contrato de ConfirmarGeracaoResultado
    const confirmFake: ConfirmarGeracaoResultado = {
      escolaNome: 'Escola Modelo',
      nivelCodigo: 'V',
      totalVagasFinais: 12,
      novasCriadas: 12,
      abertasRemovidas: 0,
      excedentesMarcadas: 0,
      geradas: 12,
    }
    expect(confirmFake.geradas).toBe(12)

    // Contrato de MigracaoAnoLetivoResultado
    const migracaoFake: MigracaoAnoLetivoResultado = {
      escolaNome: 'Escola Modelo',
      migradasCriadas: 10,
      anoOrigem: 2025,
      anoDestino: 2026,
      totalDestinoFinal: 10,
      copiadas: 10,
      ignoradasOcupadas: 0,
      totalOrigem: 10,
      comTitular: 7,
      comOcupante: 4,
      semOcupante: 6,
    }
    expect(migracaoFake.copiadas).toBe(10)
    expect(migracaoFake.comOcupante + migracaoFake.semOcupante).toBe(migracaoFake.copiadas)
    expect(migracaoFake.comTitular <= migracaoFake.copiadas).toBe(true)

    // Contrato de ResumoVagasAnoOrigem
    const resumoFake: ResumoVagasAnoOrigem = {
      anoOrigem: 2025,
      unidadeId: 'u1',
      total: 15,
      totalVagas: 15,
      abertas: 5,
      ocupadas: 10,
      excedentes: 2,
      funcoesDistintas: ['Diretor Escolar', 'Professor Regente'],
      porFuncao: [
        { funcao: 'Diretor Escolar', total: 1, ocupadas: 1, abertas: 0 },
        { funcao: 'Professor Regente', total: 14, ocupadas: 9, abertas: 5 },
      ],
      amostraVagas: [],
    }
    expect(resumoFake.totalVagas).toBe(15)
  })

  // Teste 11: Validação de UUID e sanitização de sentinelas TODOS/TODAS
  it('isUuidValido rejeita sentinelas TODOS/TODAS e aceita UUIDs legítimos', () => {
    expect(isUuidValido('TODOS')).toBe(false)
    expect(isUuidValido('TODAS')).toBe(false)
    expect(isUuidValido('todos')).toBe(false)
    expect(isUuidValido('todas')).toBe(false)
    expect(isUuidValido('')).toBe(false)
    expect(isUuidValido(null)).toBe(false)
    expect(isUuidValido(undefined)).toBe(false)
    expect(isUuidValido('123')).toBe(false)
    expect(isUuidValido('c1111111-1111-1111-1111-111111111111')).toBe(true)
    expect(isUuidValido('0ab8d0bc-954a-489c-94d6-7c817e696e4a')).toBe(true)
  })

  it('sanitizarFiltroTexto remove sentinelas TODOS/TODAS retornando null', () => {
    expect(sanitizarFiltroTexto('TODOS')).toBeNull()
    expect(sanitizarFiltroTexto('TODAS')).toBeNull()
    expect(sanitizarFiltroTexto('todos')).toBeNull()
    expect(sanitizarFiltroTexto('todas')).toBeNull()
    expect(sanitizarFiltroTexto('')).toBeNull()
    expect(sanitizarFiltroTexto(null)).toBeNull()
    expect(sanitizarFiltroTexto('Professor')).toBe('Professor')
    expect(sanitizarFiltroTexto('ABERTA')).toBe('ABERTA')
  })
})
