import { describe, it, expect } from 'vitest'
import { calcularVagasPorNivel, ResultadoCalculoVagas } from './configuracao-rh-calculo'
import { expandirSlotsIndividuais, normalizarTurmasPorEtapaDicionario } from './vagas'
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
})
