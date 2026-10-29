import { describe, it, expect } from 'vitest'
import {
  validarContiguidadeNiveis,
  calcularVagasPorNivel,
  encontrarNivelPorAlunos,
} from './configuracao-rh-calculo'
import { ConfiguracaoRhCompleta } from '@/types/gestao-escolar'

describe('validarContiguidadeNiveis', () => {
  it('aprova faixas contíguas sem buraco e sem sobreposição do seed de 20h', () => {
    const niveis20h = [
      { codigo_nivel: 'I', ordem: 1, min_alunos: 0, max_alunos: 100 },
      { codigo_nivel: 'II', ordem: 2, min_alunos: 101, max_alunos: 150 },
      { codigo_nivel: 'III', ordem: 3, min_alunos: 151, max_alunos: 220 },
      { codigo_nivel: 'IV', ordem: 4, min_alunos: 221, max_alunos: 320 },
      { codigo_nivel: 'V', ordem: 5, min_alunos: 321, max_alunos: 420 },
      { codigo_nivel: 'VI', ordem: 6, min_alunos: 421, max_alunos: 500 },
      { codigo_nivel: 'VII', ordem: 7, min_alunos: 501, max_alunos: 600 },
      { codigo_nivel: 'VIII', ordem: 8, min_alunos: 601, max_alunos: null },
    ]

    const res = validarContiguidadeNiveis(niveis20h)
    expect(res.valido).toBe(true)
    expect(res.erros).toHaveLength(0)
  })

  it('aprova faixas contíguas sem buraco e sem sobreposição do seed de 40h', () => {
    const niveis40h = [
      { codigo_nivel: 'A', ordem: 1, min_alunos: 0, max_alunos: 90 },
      { codigo_nivel: 'B', ordem: 2, min_alunos: 91, max_alunos: 140 },
      { codigo_nivel: 'C', ordem: 3, min_alunos: 141, max_alunos: null },
    ]

    const res = validarContiguidadeNiveis(niveis40h)
    expect(res.valido).toBe(true)
    expect(res.erros).toHaveLength(0)
  })

  it('detecta buraco exato entre faixas (ex: entre 140 e 142 deixando 141 vazio)', () => {
    const niveisComBuraco = [
      { codigo_nivel: 'A', ordem: 1, min_alunos: 0, max_alunos: 90 },
      { codigo_nivel: 'B', ordem: 2, min_alunos: 91, max_alunos: 140 },
      { codigo_nivel: 'C', ordem: 3, min_alunos: 142, max_alunos: null }, // buraco em 141
    ]

    const res = validarContiguidadeNiveis(niveisComBuraco)
    expect(res.valido).toBe(false)
    expect(res.erros.some((e) => e.includes('140') && e.includes('142'))).toBe(true)
  })

  it('detecta sobreposição de faixas (ex: nível B terminando em 150 e nível C começando em 145)', () => {
    const niveisComSobreposicao = [
      { codigo_nivel: 'I', ordem: 1, min_alunos: 0, max_alunos: 100 },
      { codigo_nivel: 'II', ordem: 2, min_alunos: 95, max_alunos: 150 }, // sobrepôs 95-100
    ]

    const res = validarContiguidadeNiveis(niveisComSobreposicao)
    expect(res.valido).toBe(false)
    expect(res.erros.some((e) => e.toLowerCase().includes('sobreposição'))).toBe(true)
  })

  it('detecta se o primeiro nível não inicia em zero', () => {
    const niveisNaoZero = [{ codigo_nivel: 'I', ordem: 1, min_alunos: 10, max_alunos: 100 }]

    const res = validarContiguidadeNiveis(niveisNaoZero)
    expect(res.valido).toBe(false)
    expect(res.erros[0]).toContain('iniciar em 0 alunos')
  })

  it('retorna erro se array de níveis for vazio ou indefinido', () => {
    const resVazio = validarContiguidadeNiveis([])
    expect(resVazio.valido).toBe(false)
    expect(resVazio.erros[0]).toBe('A configuração deve conter ao menos um nível de alunos.')
  })
})

describe('encontrarNivelPorAlunos - Limites de Faixa', () => {
  const niveis20h = [
    {
      id: '1',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'I',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 100,
    },
    {
      id: '2',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'II',
      ordem: 2,
      min_alunos: 101,
      max_alunos: 150,
    },
    {
      id: '3',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'III',
      ordem: 3,
      min_alunos: 151,
      max_alunos: 220,
    },
    {
      id: '4',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'IV',
      ordem: 4,
      min_alunos: 221,
      max_alunos: 320,
    },
    {
      id: '5',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'V',
      ordem: 5,
      min_alunos: 321,
      max_alunos: 420,
    },
    {
      id: '6',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'VI',
      ordem: 6,
      min_alunos: 421,
      max_alunos: 500,
    },
    {
      id: '7',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'VII',
      ordem: 7,
      min_alunos: 501,
      max_alunos: 600,
    },
    {
      id: '8',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'VIII',
      ordem: 8,
      min_alunos: 601,
      max_alunos: null,
    },
  ]

  const niveis40h = [
    {
      id: 'a',
      configuracao_rh_id: 'c2',
      codigo_nivel: 'A',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 90,
    },
    {
      id: 'b',
      configuracao_rh_id: 'c2',
      codigo_nivel: 'B',
      ordem: 2,
      min_alunos: 91,
      max_alunos: 140,
    },
    {
      id: 'c',
      configuracao_rh_id: 'c2',
      codigo_nivel: 'C',
      ordem: 3,
      min_alunos: 141,
      max_alunos: null,
    },
  ]

  it('limites de faixa 100 e 101 (transição Nível I e II)', () => {
    expect(encontrarNivelPorAlunos(niveis20h, 100)?.codigo_nivel).toBe('I')
    expect(encontrarNivelPorAlunos(niveis20h, 101)?.codigo_nivel).toBe('II')
  })

  it('limites de faixa 150 e 151 (transição Nível II e III)', () => {
    expect(encontrarNivelPorAlunos(niveis20h, 150)?.codigo_nivel).toBe('II')
    expect(encontrarNivelPorAlunos(niveis20h, 151)?.codigo_nivel).toBe('III')
  })

  it('limites de faixa 600 e 601 (transição Nível VII e VIII)', () => {
    expect(encontrarNivelPorAlunos(niveis20h, 600)?.codigo_nivel).toBe('VII')
    expect(encontrarNivelPorAlunos(niveis20h, 601)?.codigo_nivel).toBe('VIII')
    expect(encontrarNivelPorAlunos(niveis20h, 1200)?.codigo_nivel).toBe('VIII')
  })

  it('limites de faixa 90 e 91 (transição 40h Nível A e B)', () => {
    expect(encontrarNivelPorAlunos(niveis40h, 90)?.codigo_nivel).toBe('A')
    expect(encontrarNivelPorAlunos(niveis40h, 91)?.codigo_nivel).toBe('B')
  })

  it('limites de faixa 140 e 141 (transição 40h Nível B e C)', () => {
    expect(encontrarNivelPorAlunos(niveis40h, 140)?.codigo_nivel).toBe('B')
    expect(encontrarNivelPorAlunos(niveis40h, 141)?.codigo_nivel).toBe('C')
    expect(encontrarNivelPorAlunos(niveis40h, 300)?.codigo_nivel).toBe('C')
  })
})

describe('calcularVagasPorNivel - Simulação Completa e Regras', () => {
  // Cenário 20h completo com níveis I a VIII e 8 linhas
  const configuracao20h: ConfiguracaoRhCompleta = {
    id: 'cfg-20h',
    tipo_atendimento: 'Ensino Fundamental e Educação Infantil (20h)',
    ano_letivo: 2026,
    status: 'RASCUNHO',
    niveis: [
      {
        id: 'n1',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'I',
        ordem: 1,
        min_alunos: 0,
        max_alunos: 100,
      },
      {
        id: 'n2',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'II',
        ordem: 2,
        min_alunos: 101,
        max_alunos: 150,
      },
      {
        id: 'n3',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'III',
        ordem: 3,
        min_alunos: 151,
        max_alunos: 220,
      },
      {
        id: 'n4',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'IV',
        ordem: 4,
        min_alunos: 221,
        max_alunos: 320,
      },
      {
        id: 'n5',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'V',
        ordem: 5,
        min_alunos: 321,
        max_alunos: 420,
      },
      {
        id: 'n6',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'VI',
        ordem: 6,
        min_alunos: 421,
        max_alunos: 500,
      },
      {
        id: 'n7',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'VII',
        ordem: 7,
        min_alunos: 501,
        max_alunos: 600,
      },
      {
        id: 'n8',
        configuracao_rh_id: 'cfg-20h',
        codigo_nivel: 'VIII',
        ordem: 8,
        min_alunos: 601,
        max_alunos: null,
      },
    ],
    linhas: [
      {
        id: 'l-dir',
        configuracao_rh_id: 'cfg-20h',
        funcao_id: 'fn-dir',
        ordem: 1,
        base_calculo: 'POR_ESCOLA',
        funcao: { id: 'fn-dir', nome: 'Diretor Escolar' },
      },
      {
        id: 'l-coord',
        configuracao_rh_id: 'cfg-20h',
        funcao_id: 'fn-coord',
        ordem: 2,
        base_calculo: 'POR_PERIODO',
        funcao: { id: 'fn-coord', nome: 'Coordenador Pedagógico' },
      },
      {
        id: 'l-sup',
        configuracao_rh_id: 'cfg-20h',
        funcao_id: 'fn-sup',
        ordem: 3,
        base_calculo: 'POR_PERIODO',
        funcao: { id: 'fn-sup', nome: 'Professor Suporte' },
      },
      {
        id: 'l-reg',
        configuracao_rh_id: 'cfg-20h',
        funcao_id: 'fn-reg',
        ordem: 4,
        base_calculo: 'POR_TURMA',
        funcao: { id: 'fn-reg', nome: 'Professor Regente' },
      },
      {
        id: 'l-sec',
        configuracao_rh_id: 'cfg-20h',
        funcao_id: 'fn-sec',
        ordem: 5,
        base_calculo: 'POR_ESCOLA',
        funcao: { id: 'fn-sec', nome: 'Secretário Escolar' },
      },
    ],
    vagas: [
      // Nível I:
      { id: 'v1', linha_id: 'l-dir', nivel_id: 'n1', quantidade: 1, modalidade: 'FIXO' },
      { id: 'v2', linha_id: 'l-coord', nivel_id: 'n1', quantidade: 1, modalidade: 'FIXO' },
      { id: 'v3', linha_id: 'l-sup', nivel_id: 'n1', quantidade: 0, modalidade: 'FIXO' }, // 0 no Nível I
      { id: 'v4', linha_id: 'l-reg', nivel_id: 'n1', quantidade: 1, modalidade: 'FIXO' },
      {
        id: 'v5',
        linha_id: 'l-sec',
        nivel_id: 'n1',
        quantidade: 1,
        modalidade: 'ITINERANTE',
        dias_semana: 2,
      },
      // Nível V:
      { id: 'v6', linha_id: 'l-dir', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
      { id: 'v7', linha_id: 'l-coord', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
      { id: 'v8', linha_id: 'l-sup', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
      { id: 'v9', linha_id: 'l-reg', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
      { id: 'v10', linha_id: 'l-sec', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
    ],
  }

  it('exemplo da especificação: 20h com 323 alunos, 2 períodos, 14 turmas → Nível V', () => {
    const res = calcularVagasPorNivel(configuracao20h, 323, 2, { '1º Ano': 7, '2º Ano': 7 })

    expect(res.nivelEncontrado?.codigo_nivel).toBe('V')
    expect(res.totalTurmas).toBe(14)
    expect(res.totalPeriodos).toBe(2)

    // Diretor (POR_ESCOLA) = 1 vaga fixa
    const dir = res.vagas.find((v) => v.funcaoNome === 'Diretor Escolar')
    expect(dir?.quantidadeFinal).toBe(1)
    expect(dir?.modalidade).toBe('FIXO')

    // Coordenador (POR_PERIODO): 1 * 2 períodos = 2 vagas
    const coord = res.vagas.find((v) => v.funcaoNome === 'Coordenador Pedagógico')
    expect(coord?.quantidadeFinal).toBe(2)
    expect(coord?.memoriaCalculo).toContain('2 período(s)')

    // Professor Suporte (POR_PERIODO): 1 * 2 períodos = 2 vagas
    const sup = res.vagas.find((v) => v.funcaoNome === 'Professor Suporte')
    expect(sup?.quantidadeFinal).toBe(2)

    // Professor Regente (POR_TURMA): 1 * 14 turmas = 14 vagas
    const reg = res.vagas.find((v) => v.funcaoNome === 'Professor Regente')
    expect(reg?.quantidadeFinal).toBe(14)
    expect(reg?.memoriaCalculo).toContain('14 turma(s)')
  })

  it('POR_PERIODO com 1 período vs 2 períodos', () => {
    // 1 período
    const res1 = calcularVagasPorNivel(configuracao20h, 323, 1, { '1º Ano': 10 })
    const coord1 = res1.vagas.find((v) => v.funcaoNome === 'Coordenador Pedagógico')
    expect(coord1?.quantidadeFinal).toBe(1)

    // 2 períodos
    const res2 = calcularVagasPorNivel(configuracao20h, 323, 2, { '1º Ano': 10 })
    const coord2 = res2.vagas.find((v) => v.funcaoNome === 'Coordenador Pedagógico')
    expect(coord2?.quantidadeFinal).toBe(2)
  })

  it('quantidade 0 não gera vaga (Professor Suporte no Nível I com 50 alunos)', () => {
    const res = calcularVagasPorNivel(configuracao20h, 50, 2, { '1º Ano': 2 })
    expect(res.nivelEncontrado?.codigo_nivel).toBe('I')

    // Suporte tinha quantidade 0 no Nível I
    const sup = res.vagas.find((v) => v.funcaoNome === 'Professor Suporte')
    expect(sup).toBeUndefined()
  })

  it('itinerante com dias_semana preserva modalidade e dias', () => {
    const res = calcularVagasPorNivel(configuracao20h, 50, 1, { '1º Ano': 2 })
    const sec = res.vagas.find((v) => v.funcaoNome === 'Secretário Escolar')
    expect(sec).toBeDefined()
    expect(sec?.modalidade).toBe('ITINERANTE')
    expect(sec?.diasSemana).toBe(2)
  })

  it('exemplo da especificação: 40h com 148 alunos, 9 turmas (3 de Infantil/Infantil I/Infantil II) → Nível C', () => {
    const configuracao40h: ConfiguracaoRhCompleta = {
      id: 'cfg-40h',
      tipo_atendimento: 'Educação Infantil (40h)',
      ano_letivo: 2026,
      status: 'RASCUNHO',
      niveis: [
        {
          id: 'na',
          configuracao_rh_id: 'cfg-40h',
          codigo_nivel: 'A',
          ordem: 1,
          min_alunos: 0,
          max_alunos: 90,
        },
        {
          id: 'nb',
          configuracao_rh_id: 'cfg-40h',
          codigo_nivel: 'B',
          ordem: 2,
          min_alunos: 91,
          max_alunos: 140,
        },
        {
          id: 'nc',
          configuracao_rh_id: 'cfg-40h',
          codigo_nivel: 'C',
          ordem: 3,
          min_alunos: 141,
          max_alunos: null,
        },
      ],
      linhas: [
        {
          id: 'l-dir40',
          configuracao_rh_id: 'cfg-40h',
          funcao_id: 'f-dir',
          ordem: 1,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f-dir', nome: 'Diretor Escolar' },
        },
        {
          id: 'l-supsala',
          configuracao_rh_id: 'cfg-40h',
          funcao_id: 'f-supsala',
          ordem: 2,
          base_calculo: 'POR_TURMA_ETAPA',
          etapas_filtro: ['INFANTIL', 'INFANTIL_I', 'INFANTIL_II'],
          funcao: { id: 'f-supsala', nome: 'Professor Suporte Pedagógico de Sala' },
        },
        {
          id: 'l-supgeral',
          configuracao_rh_id: 'cfg-40h',
          funcao_id: 'f-supgeral',
          ordem: 3,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f-supgeral', nome: 'Professor Suporte Pedagógico Geral' },
        },
      ],
      vagas: [
        { id: 'v20', linha_id: 'l-dir40', nivel_id: 'nc', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v21', linha_id: 'l-supsala', nivel_id: 'nc', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v22', linha_id: 'l-supgeral', nivel_id: 'nc', quantidade: 2, modalidade: 'FIXO' },
      ],
    }

    const res = calcularVagasPorNivel(configuracao40h, 148, 1, {
      'Infantil I': 1,
      'Infantil II': 2,
      'Fundamental 1': 6, // Não entra no filtro
    })

    expect(res.nivelEncontrado?.codigo_nivel).toBe('C')
    expect(res.totalTurmas).toBe(9)

    // Diretor: 1 vaga fixa
    const dir = res.vagas.find((v) => v.funcaoNome === 'Diretor Escolar')
    expect(dir?.quantidadeFinal).toBe(1)

    // Suporte Pedagógico de Sala: 1 vaga por turma de etapa filtrada (1+2 = 3 turmas) → 3 vagas
    const supSala = res.vagas.find((v) => v.funcaoNome === 'Professor Suporte Pedagógico de Sala')
    expect(supSala?.quantidadeFinal).toBe(3)
    expect(supSala?.memoriaCalculo).toContain('3 turma(s) das etapas filtradas')

    // Suporte Pedagógico Geral (POR_ESCOLA): 2 vagas
    const supGeral = res.vagas.find((v) => v.funcaoNome === 'Professor Suporte Pedagógico Geral')
    expect(supGeral?.quantidadeFinal).toBe(2)
  })

  it('exemplo completo solicitado pelo usuário para validação 20h: Nível V com 8 linhas completas', () => {
    const config20hCompleta: ConfiguracaoRhCompleta = {
      id: 'cfg-20h-full',
      tipo_atendimento: 'Ensino Fundamental e Educação Infantil (20h)',
      ano_letivo: 2026,
      status: 'VIGENTE',
      niveis: [
        {
          id: 'n5',
          configuracao_rh_id: 'cfg-20h-full',
          codigo_nivel: 'V',
          ordem: 5,
          min_alunos: 321,
          max_alunos: 420,
        },
      ],
      linhas: [
        {
          id: 'l1',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f1',
          ordem: 1,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f1', nome: 'Diretor Escolar' },
        },
        {
          id: 'l2',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f2',
          ordem: 2,
          base_calculo: 'POR_PERIODO',
          funcao: { id: 'f2', nome: 'Coordenador Pedagógico' },
        },
        {
          id: 'l3',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f3',
          ordem: 3,
          base_calculo: 'POR_PERIODO',
          funcao: { id: 'f3', nome: 'Professor Suporte' },
        },
        {
          id: 'l4',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f4',
          ordem: 4,
          base_calculo: 'POR_TURMA',
          funcao: { id: 'f4', nome: 'Professor Regente' },
        },
        {
          id: 'l5',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f5',
          ordem: 5,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f5', nome: 'Secretário Escolar' },
        },
        {
          id: 'l6',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f6',
          ordem: 6,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f6', nome: 'Assessor de Sala de Leitura' },
        },
        {
          id: 'l7',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f7',
          ordem: 7,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f7', nome: 'Serviços Gerais Feminino' },
        },
        {
          id: 'l8',
          configuracao_rh_id: 'cfg-20h-full',
          funcao_id: 'f8',
          ordem: 8,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f8', nome: 'Serviços Gerais Masculino' },
        },
      ],
      vagas: [
        { id: 'v1', linha_id: 'l1', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v2', linha_id: 'l2', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v3', linha_id: 'l3', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v4', linha_id: 'l4', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v5', linha_id: 'l5', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v6', linha_id: 'l6', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v7', linha_id: 'l7', nivel_id: 'n5', quantidade: 8, modalidade: 'FIXO' },
        { id: 'v8', linha_id: 'l8', nivel_id: 'n5', quantidade: 1, modalidade: 'FIXO' },
      ],
    }

    const res = calcularVagasPorNivel(config20hCompleta, 323, 2, { Fundamental: 14 })

    expect(res.nivelEncontrado?.codigo_nivel).toBe('V')
    expect(res.vagas.find((v) => v.funcaoNome === 'Diretor Escolar')?.quantidadeFinal).toBe(1)
    expect(res.vagas.find((v) => v.funcaoNome === 'Coordenador Pedagógico')?.quantidadeFinal).toBe(
      2,
    )
    expect(res.vagas.find((v) => v.funcaoNome === 'Professor Suporte')?.quantidadeFinal).toBe(2)
    expect(res.vagas.find((v) => v.funcaoNome === 'Professor Regente')?.quantidadeFinal).toBe(14)
    expect(res.vagas.find((v) => v.funcaoNome === 'Secretário Escolar')?.quantidadeFinal).toBe(1)
    expect(
      res.vagas.find((v) => v.funcaoNome === 'Assessor de Sala de Leitura')?.quantidadeFinal,
    ).toBe(1)
    expect(
      res.vagas.find((v) => v.funcaoNome === 'Serviços Gerais Feminino')?.quantidadeFinal,
    ).toBe(8)
    expect(
      res.vagas.find((v) => v.funcaoNome === 'Serviços Gerais Masculino')?.quantidadeFinal,
    ).toBe(1)
  })

  it('exemplo completo solicitado pelo usuário para validação 40h: Nível C com 6 linhas completas', () => {
    const config40hCompleta: ConfiguracaoRhCompleta = {
      id: 'cfg-40h-full',
      tipo_atendimento: 'Educação Infantil (40h)',
      ano_letivo: 2026,
      status: 'VIGENTE',
      niveis: [
        {
          id: 'nc',
          configuracao_rh_id: 'cfg-40h-full',
          codigo_nivel: 'C',
          ordem: 3,
          min_alunos: 141,
          max_alunos: null,
        },
      ],
      linhas: [
        {
          id: 'l1',
          configuracao_rh_id: 'cfg-40h-full',
          funcao_id: 'f1',
          ordem: 1,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f1', nome: 'Diretor Escolar' },
        },
        {
          id: 'l2',
          configuracao_rh_id: 'cfg-40h-full',
          funcao_id: 'f2',
          ordem: 2,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f2', nome: 'Coordenador Pedagógico' },
        },
        {
          id: 'l3',
          configuracao_rh_id: 'cfg-40h-full',
          funcao_id: 'f3',
          ordem: 3,
          base_calculo: 'POR_TURMA',
          funcao: { id: 'f3', nome: 'Professor Regente' },
        },
        {
          id: 'l4',
          configuracao_rh_id: 'cfg-40h-full',
          funcao_id: 'f4',
          ordem: 4,
          base_calculo: 'POR_TURMA_ETAPA',
          etapas_filtro: ['INFANTIL', 'INFANTIL_I', 'INFANTIL_II'],
          funcao: { id: 'f4', nome: 'Suporte Pedagógico de Sala' },
        },
        {
          id: 'l5',
          configuracao_rh_id: 'cfg-40h-full',
          funcao_id: 'f5',
          ordem: 5,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f5', nome: 'Suporte Pedagógico Geral' },
        },
        {
          id: 'l6',
          configuracao_rh_id: 'cfg-40h-full',
          funcao_id: 'f6',
          ordem: 6,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f6', nome: 'Secretário Escolar' },
        },
      ],
      vagas: [
        { id: 'v1', linha_id: 'l1', nivel_id: 'nc', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v2', linha_id: 'l2', nivel_id: 'nc', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v3', linha_id: 'l3', nivel_id: 'nc', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v4', linha_id: 'l4', nivel_id: 'nc', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v5', linha_id: 'l5', nivel_id: 'nc', quantidade: 2, modalidade: 'FIXO' },
        { id: 'v6', linha_id: 'l6', nivel_id: 'nc', quantidade: 1, modalidade: 'FIXO' },
      ],
    }

    const res = calcularVagasPorNivel(config40hCompleta, 148, 1, {
      'Infantil I': 1,
      'Infantil II': 2,
      'Turma A': 6,
    })

    expect(res.nivelEncontrado?.codigo_nivel).toBe('C')
    expect(res.totalTurmas).toBe(9)
    expect(res.vagas.find((v) => v.funcaoNome === 'Diretor Escolar')?.quantidadeFinal).toBe(1)
    expect(res.vagas.find((v) => v.funcaoNome === 'Coordenador Pedagógico')?.quantidadeFinal).toBe(
      1,
    )
    expect(res.vagas.find((v) => v.funcaoNome === 'Professor Regente')?.quantidadeFinal).toBe(9)
    expect(
      res.vagas.find((v) => v.funcaoNome === 'Suporte Pedagógico de Sala')?.quantidadeFinal,
    ).toBe(3)
    expect(
      res.vagas.find((v) => v.funcaoNome === 'Suporte Pedagógico Geral')?.quantidadeFinal,
    ).toBe(2)
    expect(res.vagas.find((v) => v.funcaoNome === 'Secretário Escolar')?.quantidadeFinal).toBe(1)
  })

  it('deve calcular corretamente linhas do tipo CARGO adicionadas à configuração', () => {
    const configComLinhaCargo: any = {
      tipo_atendimento: 'Ensino Fundamental e Educação Infantil (20h)',
      ano_letivo: 2026,
      niveis: [
        { id: 'n1', codigo_nivel: 'I', ordem: 1, min_alunos: 0, max_alunos: 150 },
        { id: 'n2', codigo_nivel: 'II', ordem: 2, min_alunos: 151, max_alunos: 300 },
      ],
      linhas: [
        {
          id: 'l_funcao',
          configuracao_rh_id: 'cfg_mix',
          tipo_linha: 'FUNCAO',
          funcao_id: 'f1',
          ordem: 1,
          base_calculo: 'POR_ESCOLA',
          funcao: { id: 'f1', nome: 'Diretor' },
        },
        {
          id: 'l_cargo_escola',
          configuracao_rh_id: 'cfg_mix',
          tipo_linha: 'CARGO',
          cargo_id: 'c_merendeira',
          ordem: 2,
          base_calculo: 'POR_ESCOLA',
          cargo: { id: 'c_merendeira', nome: 'Merendeira Escolar', carga_horaria: '40h' },
          cargos: [
            {
              cargo_id: 'c_merendeira',
              condicao: 'NENHUMA',
              cargo: { id: 'c_merendeira', nome: 'Merendeira Escolar' },
            },
          ],
        },
        {
          id: 'l_cargo_periodo',
          configuracao_rh_id: 'cfg_mix',
          tipo_linha: 'CARGO',
          cargo_id: 'c_vigilante',
          ordem: 3,
          base_calculo: 'POR_PERIODO',
          cargo: {
            id: 'c_vigilante',
            nome: 'Agente de Portaria e Vigilância',
            carga_horaria: '40h',
          },
          cargos: [
            {
              cargo_id: 'c_vigilante',
              condicao: 'READAPTADO_COMPATIVEL_LAUDO',
              cargo: { id: 'c_vigilante', nome: 'Agente de Portaria e Vigilância' },
            },
          ],
        },
      ],
      vagas: [
        { id: 'v1', linha_id: 'l_funcao', nivel_id: 'n2', quantidade: 1, modalidade: 'FIXO' },
        { id: 'v2', linha_id: 'l_cargo_escola', nivel_id: 'n2', quantidade: 2, modalidade: 'FIXO' },
        {
          id: 'v3',
          linha_id: 'l_cargo_periodo',
          nivel_id: 'n2',
          quantidade: 1,
          modalidade: 'FIXO',
        },
      ],
    }

    const res = calcularVagasPorNivel(configComLinhaCargo, 220, 2, {})

    expect(res.nivelEncontrado?.codigo_nivel).toBe('II')
    expect(res.vagas).toHaveLength(3)

    // Linha de Função
    const vFuncao = res.vagas.find((v) => v.funcaoNome === 'Diretor')
    expect(vFuncao?.quantidadeFinal).toBe(1)
    expect(vFuncao?.tipoLinha).toBe('FUNCAO')

    // Linha de Cargo por Escola (2 vagas no nível II * 1)
    const vMerendeira = res.vagas.find((v) => v.funcaoNome === 'Merendeira Escolar')
    expect(vMerendeira).toBeDefined()
    expect(vMerendeira?.tipoLinha).toBe('CARGO')
    expect(vMerendeira?.cargoId).toBe('c_merendeira')
    expect(vMerendeira?.quantidadeFinal).toBe(2)
    expect(vMerendeira?.cargosElegiveis[0].cargoNome).toBe('Merendeira Escolar')
    expect(vMerendeira?.cargosElegiveis[0].condicao).toBe('NENHUMA')

    // Linha de Cargo por Período (1 vaga no nível II * 2 períodos = 2)
    const vVigilante = res.vagas.find((v) => v.funcaoNome === 'Agente de Portaria e Vigilância')
    expect(vVigilante).toBeDefined()
    expect(vVigilante?.tipoLinha).toBe('CARGO')
    expect(vVigilante?.quantidadeFinal).toBe(2) // 1 * 2 períodos
    expect(vVigilante?.cargosElegiveis[0].condicao).toBe('READAPTADO_COMPATIVEL_LAUDO')
  })
})
