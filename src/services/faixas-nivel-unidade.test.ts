import { describe, it, expect } from 'vitest'
import {
  formatarDescricaoFaixaAlunos,
  formatarRotuloNivel,
  converterParaNivelFaixaFormatada,
  calcularNivelPorQtdAlunos,
  resolverRotuloNivelComFaixas,
  NivelFaixaFormatada,
} from './faixas-nivel-unidade'
import { ConfiguracaoRhNivel } from '@/types/gestao-escolar'

describe('faixas-nivel-unidade - Formatação e Cálculos', () => {
  const niveis20hRaw: ConfiguracaoRhNivel[] = [
    {
      id: 'n1',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'I',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 100,
    },
    {
      id: 'n2',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'II',
      ordem: 2,
      min_alunos: 101,
      max_alunos: 150,
    },
    {
      id: 'n3',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'III',
      ordem: 3,
      min_alunos: 151,
      max_alunos: 220,
    },
    {
      id: 'n4',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'IV',
      ordem: 4,
      min_alunos: 221,
      max_alunos: 320,
    },
    {
      id: 'n5',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'V',
      ordem: 5,
      min_alunos: 321,
      max_alunos: 420,
    },
    {
      id: 'n6',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'VI',
      ordem: 6,
      min_alunos: 421,
      max_alunos: 500,
    },
    {
      id: 'n7',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'VII',
      ordem: 7,
      min_alunos: 501,
      max_alunos: 600,
    },
    {
      id: 'n8',
      configuracao_rh_id: 'c1',
      codigo_nivel: 'VIII',
      ordem: 8,
      min_alunos: 601,
      max_alunos: null,
    },
  ]

  const niveis40hRaw: ConfiguracaoRhNivel[] = [
    {
      id: 'na',
      configuracao_rh_id: 'c2',
      codigo_nivel: 'A',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 90,
    },
    {
      id: 'nb',
      configuracao_rh_id: 'c2',
      codigo_nivel: 'B',
      ordem: 2,
      min_alunos: 91,
      max_alunos: 140,
    },
    {
      id: 'nc',
      configuracao_rh_id: 'c2',
      codigo_nivel: 'C',
      ordem: 3,
      min_alunos: 141,
      max_alunos: null,
    },
  ]

  const niveis20hFormatados: NivelFaixaFormatada[] = niveis20hRaw.map(
    converterParaNivelFaixaFormatada,
  )
  const niveis40hFormatados: NivelFaixaFormatada[] = niveis40hRaw.map(
    converterParaNivelFaixaFormatada,
  )

  it('formatação textual de faixas de alunos conforme anexo oficial', () => {
    expect(formatarDescricaoFaixaAlunos(0, 100)).toBe('Até 100 alunos')
    expect(formatarDescricaoFaixaAlunos(101, 150)).toBe('De 101 a 150 alunos')
    expect(formatarDescricaoFaixaAlunos(151, 220)).toBe('De 151 a 220 alunos')
    expect(formatarDescricaoFaixaAlunos(221, 320)).toBe('De 221 a 320 alunos')
    expect(formatarDescricaoFaixaAlunos(321, 420)).toBe('De 321 a 420 alunos')
    expect(formatarDescricaoFaixaAlunos(421, 500)).toBe('De 421 a 500 alunos')
    expect(formatarDescricaoFaixaAlunos(501, 600)).toBe('De 501 a 600 alunos')
    expect(formatarDescricaoFaixaAlunos(601, null)).toBe('Acima de 600 alunos')
  })

  it('formatação dos rótulos completos dos níveis 20h', () => {
    expect(niveis20hFormatados[0].rotulo).toBe('Nível I: Até 100 alunos')
    expect(niveis20hFormatados[1].rotulo).toBe('Nível II: De 101 a 150 alunos')
    expect(niveis20hFormatados[2].rotulo).toBe('Nível III: De 151 a 220 alunos')
    expect(niveis20hFormatados[3].rotulo).toBe('Nível IV: De 221 a 320 alunos')
    expect(niveis20hFormatados[4].rotulo).toBe('Nível V: De 321 a 420 alunos')
    expect(niveis20hFormatados[5].rotulo).toBe('Nível VI: De 421 a 500 alunos')
    expect(niveis20hFormatados[6].rotulo).toBe('Nível VII: De 501 a 600 alunos')
    expect(niveis20hFormatados[7].rotulo).toBe('Nível VIII: Acima de 600 alunos')
  })

  it('formatação dos rótulos completos dos níveis 40h', () => {
    expect(niveis40hFormatados[0].rotulo).toBe('Nível A: Até 90 alunos')
    expect(niveis40hFormatados[1].rotulo).toBe('Nível B: De 91 a 140 alunos')
    expect(niveis40hFormatados[2].rotulo).toBe('Nível C: Acima de 140 alunos')
  })

  it('conferência de sanidade do usuário: 20h com 323 alunos deve mostrar Nível V', () => {
    const nivel = calcularNivelPorQtdAlunos(niveis20hFormatados, 323)
    expect(nivel?.codigo_nivel).toBe('V')
    expect(nivel?.rotulo).toBe('Nível V: De 321 a 420 alunos')
  })

  it('conferência de sanidade do usuário: 20h com 100 alunos mostra Nível I; com 101 Nível II', () => {
    expect(calcularNivelPorQtdAlunos(niveis20hFormatados, 100)?.codigo_nivel).toBe('I')
    expect(calcularNivelPorQtdAlunos(niveis20hFormatados, 101)?.codigo_nivel).toBe('II')
  })

  it('conferência de sanidade do usuário: 20h com 600 alunos mostra Nível VII; com 601 Nível VIII', () => {
    expect(calcularNivelPorQtdAlunos(niveis20hFormatados, 600)?.codigo_nivel).toBe('VII')
    expect(calcularNivelPorQtdAlunos(niveis20hFormatados, 601)?.codigo_nivel).toBe('VIII')
    expect(calcularNivelPorQtdAlunos(niveis20hFormatados, 1200)?.codigo_nivel).toBe('VIII')
  })

  it('conferência de sanidade do usuário: 40h com 94 alunos mostra Nível B (91-140)', () => {
    const nivel = calcularNivelPorQtdAlunos(niveis40hFormatados, 94)
    expect(nivel?.codigo_nivel).toBe('B')
    expect(nivel?.rotulo).toBe('Nível B: De 91 a 140 alunos')
  })

  it('conferência de sanidade do usuário: 40h com 90 alunos mostra Nível A; com 141 Nível C', () => {
    expect(calcularNivelPorQtdAlunos(niveis40hFormatados, 90)?.codigo_nivel).toBe('A')
    expect(calcularNivelPorQtdAlunos(niveis40hFormatados, 91)?.codigo_nivel).toBe('B')
    expect(calcularNivelPorQtdAlunos(niveis40hFormatados, 140)?.codigo_nivel).toBe('B')
    expect(calcularNivelPorQtdAlunos(niveis40hFormatados, 141)?.codigo_nivel).toBe('C')
  })

  it('normalização de rótulos legados usando as faixas do banco', () => {
    expect(
      resolverRotuloNivelComFaixas(
        'Ensino Fundamental e Educação Infantil (20h)',
        'Nível 1 (até 100 alunos)',
        niveis20hFormatados,
      ),
    ).toBe('Nível I: Até 100 alunos')

    expect(
      resolverRotuloNivelComFaixas(
        'Ensino Fundamental e Educação Infantil (20h)',
        'Nível I',
        niveis20hFormatados,
      ),
    ).toBe('Nível I: Até 100 alunos')

    expect(
      resolverRotuloNivelComFaixas(
        'Ensino Fundamental e Educação Infantil (20h)',
        'Nível 5',
        niveis20hFormatados,
      ),
    ).toBe('Nível V: De 321 a 420 alunos')

    expect(
      resolverRotuloNivelComFaixas('Educação Infantil (40h)', 'Nível A', niveis40hFormatados),
    ).toBe('Nível A: Até 90 alunos')

    expect(
      resolverRotuloNivelComFaixas(
        'Educação Infantil (40h)',
        'Até 100 alunos',
        niveis40hFormatados,
      ),
    ).toBe('Nível A: Até 90 alunos')
  })
})
