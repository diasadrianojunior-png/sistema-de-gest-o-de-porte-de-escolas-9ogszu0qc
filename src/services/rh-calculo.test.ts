import { describe, it, expect } from 'vitest'
import {
  validarContiguidadeNiveis,
  calcularVagasPorte,
  aplicarIdempotenciaVagas,
} from './rh-calculo'
import {
  RhNivel,
  RhRegraNivel,
  RhRegraPorTurmas,
  RhExcecaoVaga,
  RhVaga,
} from '@/types/gestao-escolar'

describe('Serviço de Cálculo de Porte de Escolas e Vagas de RH', () => {
  // Níveis de teste para o tipo 20h
  const niveis20h: RhNivel[] = [
    {
      id: 'n1',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'I',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 100,
    },
    {
      id: 'n2',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'II',
      ordem: 2,
      min_alunos: 101,
      max_alunos: 150,
    },
    {
      id: 'n3',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'III',
      ordem: 3,
      min_alunos: 151,
      max_alunos: 220,
    },
    {
      id: 'n4',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'IV',
      ordem: 4,
      min_alunos: 221,
      max_alunos: 320,
    },
    {
      id: 'n5',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'V',
      ordem: 5,
      min_alunos: 321,
      max_alunos: 420,
    },
    {
      id: 'n6',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'VI',
      ordem: 6,
      min_alunos: 421,
      max_alunos: 500,
    },
    {
      id: 'n7',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'VII',
      ordem: 7,
      min_alunos: 501,
      max_alunos: 600,
    },
    {
      id: 'n8',
      versao_id: 'v1',
      tipo_atendimento_id: 't20',
      codigo_nivel: 'VIII',
      ordem: 8,
      min_alunos: 601,
      max_alunos: null,
    },
  ]

  // Níveis de teste para o tipo 40h
  const niveis40h: RhNivel[] = [
    {
      id: 'na',
      versao_id: 'v1',
      tipo_atendimento_id: 't40',
      codigo_nivel: 'A',
      ordem: 1,
      min_alunos: 0,
      max_alunos: 100,
    },
    {
      id: 'nb',
      versao_id: 'v1',
      tipo_atendimento_id: 't40',
      codigo_nivel: 'B',
      ordem: 2,
      min_alunos: 101,
      max_alunos: 140,
    },
    {
      id: 'nc',
      versao_id: 'v1',
      tipo_atendimento_id: 't40',
      codigo_nivel: 'C',
      ordem: 3,
      min_alunos: 141,
      max_alunos: null,
    },
  ]

  describe('1. Validação de Contiguidade de Faixas', () => {
    it('deve aprovar faixas perfeitamente contíguas do 20h e 40h', () => {
      const v20 = validarContiguidadeNiveis(niveis20h)
      expect(v20.valido).toBe(true)
      expect(v20.erros).toHaveLength(0)

      const v40 = validarContiguidadeNiveis(niveis40h)
      expect(v40.valido).toBe(true)
      expect(v40.erros).toHaveLength(0)
    })

    it('deve reprovar sobreposição ou buraco nos limites', () => {
      const niveisComBuraco: RhNivel[] = [
        {
          id: '1',
          versao_id: 'v1',
          tipo_atendimento_id: 't',
          codigo_nivel: 'A',
          ordem: 1,
          min_alunos: 0,
          max_alunos: 100,
        },
        {
          id: '2',
          versao_id: 'v1',
          tipo_atendimento_id: 't',
          codigo_nivel: 'B',
          ordem: 2,
          min_alunos: 105,
          max_alunos: 200,
        }, // buraco 101-104
      ]
      const checagemBuraco = validarContiguidadeNiveis(niveisComBuraco)
      expect(checagemBuraco.valido).toBe(false)
      expect(checagemBuraco.erros[0]).toContain('Buraco/descontinuidade')

      const niveisComSobreposicao: RhNivel[] = [
        {
          id: '1',
          versao_id: 'v1',
          tipo_atendimento_id: 't',
          codigo_nivel: 'A',
          ordem: 1,
          min_alunos: 0,
          max_alunos: 140,
        },
        {
          id: '2',
          versao_id: 'v1',
          tipo_atendimento_id: 't',
          codigo_nivel: 'B',
          ordem: 2,
          min_alunos: 130,
          max_alunos: 200,
        }, // sobrepõe
      ]
      const checagemSobreposicao = validarContiguidadeNiveis(niveisComSobreposicao)
      expect(checagemSobreposicao.valido).toBe(false)
      expect(checagemSobreposicao.erros[0]).toContain('Sobreposição')
    })
  })

  describe('2. Teste de Limites de Faixa (100/101, 140/141, 600/601)', () => {
    it('deve classificar 100 como Nível I e 101 como Nível II (20h)', () => {
      const res100 = calcularVagasPorte({
        alunosTotal: 100,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas: [],
      })
      expect(res100.nivelCalculado?.codigo_nivel).toBe('I')

      const res101 = calcularVagasPorte({
        alunosTotal: 101,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas: [],
      })
      expect(res101.nivelCalculado?.codigo_nivel).toBe('II')
    })

    it('deve classificar 140 como Nível B e 141 como Nível C (40h)', () => {
      const res140 = calcularVagasPorte({
        alunosTotal: 140,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis40h,
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['INTEGRAL'],
        turmas: [],
      })
      expect(res140.nivelCalculado?.codigo_nivel).toBe('B')

      const res141 = calcularVagasPorte({
        alunosTotal: 141,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis40h,
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['INTEGRAL'],
        turmas: [],
      })
      expect(res141.nivelCalculado?.codigo_nivel).toBe('C')
    })

    it('deve classificar 600 como Nível VII e 601 como Nível VIII (20h)', () => {
      const res600 = calcularVagasPorte({
        alunosTotal: 600,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas: [],
      })
      expect(res600.nivelCalculado?.codigo_nivel).toBe('VII')

      const res601 = calcularVagasPorte({
        alunosTotal: 601,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas: [],
      })
      expect(res601.nivelCalculado?.codigo_nivel).toBe('VIII')
    })
  })

  describe('3. Exclusão de EJA, SRM e Jornada Ampliada', () => {
    it('deve descontar alunos de modalidades excluídas antes de classificar o nível', () => {
      // Total de alunos = 200, mas com 30 EJA, 15 SRM e 20 Jornada Ampliada = 65 excluídos -> 135 considerados
      const res = calcularVagasPorte({
        alunosTotal: 200,
        alunosPorModalidade: { jornada_ampliada: 20, eja: 30, srm: 15 },
        modalidadesExcluidas: ['JORNADA_AMPLIADA', 'EJA', 'SALA_RECURSOS_MULTIFUNCIONAIS'],
        niveisTipo: niveis20h,
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas: [],
      })

      expect(res.descontoModalidades).toBe(65)
      expect(res.alunosConsiderados).toBe(135)
      // 135 cai na faixa 101-150 -> Nível II (sem a exclusão seria 200 -> Nível III)
      expect(res.nivelCalculado?.codigo_nivel).toBe('II')
    })
  })

  describe('4. POR_TURNO com 1 e 2 turnos', () => {
    const regraCoord: RhRegraNivel = {
      id: 'rc1',
      nivel_id: 'n1',
      funcao_id: 'f_coord',
      quantidade: 1,
      base_calculo: 'POR_TURNO',
      modalidade: 'FIXO',
      funcao: { id: 'f_coord', nome: 'Coordenador Pedagógico' },
    }

    it('deve gerar 1 vaga para escola com 1 turno', () => {
      const res = calcularVagasPorte({
        alunosTotal: 80,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        regrasNivel: [regraCoord],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas: [],
      })

      const coords = res.vagasGeradas.filter((v) => v.funcaoId === 'f_coord')
      expect(coords).toHaveLength(1)
      expect(coords[0].turno).toBe('MATUTINO')
    })

    it('deve gerar 2 vagas para escola com 2 turnos', () => {
      const res = calcularVagasPorte({
        alunosTotal: 80,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        regrasNivel: [regraCoord],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO', 'VESPERTINO'],
        turmas: [],
      })

      const coords = res.vagasGeradas.filter((v) => v.funcaoId === 'f_coord')
      expect(coords).toHaveLength(2)
      expect(coords.map((c) => c.turno)).toEqual(['MATUTINO', 'VESPERTINO'])
    })
  })

  describe('5. POR_TURMA_ETAPA', () => {
    it('deve filtrar apenas turmas das etapas especificadas na regra', () => {
      const regraSuporteSala: RhRegraNivel = {
        id: 'rss1',
        nivel_id: 'na',
        funcao_id: 'f_supsala',
        quantidade: 1,
        base_calculo: 'POR_TURMA_ETAPA',
        modalidade: 'FIXO',
        etapas_filtro: ['INFANTIL', 'INFANTIL_I', 'INFANTIL_II'],
        funcao: { id: 'f_supsala', nome: 'Suporte Pedagógico de Sala' },
      }

      const turmas = [
        { etapaNome: 'Creche' }, // normaliza para INFANTIL
        { etapaNome: 'Pré-Escola' }, // normaliza para INFANTIL_II
        { etapaNome: 'Anos Finais' }, // não deve contar
      ]

      const res = calcularVagasPorte({
        alunosTotal: 70,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis40h,
        regrasNivel: [regraSuporteSala],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['INTEGRAL'],
        turmas,
      })

      const sups = res.vagasGeradas.filter((v) => v.funcaoId === 'f_supsala')
      expect(sups).toHaveLength(2) // Creche e Pré-Escola
    })
  })

  describe('6. Regras por Turmas nos Limites (5/6, 6/7, 13/14/15)', () => {
    // Ed. Física: <=5 -> 0+1 | 6-7 -> 1+0 | 8-13 -> 1+1 | 14 -> 2+0 | >=15 -> 2+1
    const regrasEdFis: RhRegraPorTurmas[] = [
      {
        id: 'ef1',
        versao_id: 'v1',
        funcao_id: 'f_ef',
        min_turmas: 1,
        max_turmas: 5,
        qtd_fixo: 0,
        qtd_itinerante: 1,
        funcao: { id: 'f_ef', nome: 'Ed. Física' },
      },
      {
        id: 'ef2',
        versao_id: 'v1',
        funcao_id: 'f_ef',
        min_turmas: 6,
        max_turmas: 7,
        qtd_fixo: 1,
        qtd_itinerante: 0,
        funcao: { id: 'f_ef', nome: 'Ed. Física' },
      },
      {
        id: 'ef3',
        versao_id: 'v1',
        funcao_id: 'f_ef',
        min_turmas: 8,
        max_turmas: 13,
        qtd_fixo: 1,
        qtd_itinerante: 1,
        funcao: { id: 'f_ef', nome: 'Ed. Física' },
      },
      {
        id: 'ef4',
        versao_id: 'v1',
        funcao_id: 'f_ef',
        min_turmas: 14,
        max_turmas: 14,
        qtd_fixo: 2,
        qtd_itinerante: 0,
        funcao: { id: 'f_ef', nome: 'Ed. Física' },
      },
      {
        id: 'ef5',
        versao_id: 'v1',
        funcao_id: 'f_ef',
        min_turmas: 15,
        max_turmas: null,
        qtd_fixo: 2,
        qtd_itinerante: 1,
        funcao: { id: 'f_ef', nome: 'Ed. Física' },
      },
    ]

    const testarQtd = (numTurmas: number) => {
      const turmas = Array.from({ length: numTurmas }, (_, i) => ({ etapaNome: `T${i + 1}` }))
      const res = calcularVagasPorte({
        alunosTotal: 300,
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        regrasNivel: [],
        regrasTurmas: regrasEdFis,
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas,
      })
      const fixo = res.vagasGeradas.filter(
        (v) => v.funcaoId === 'f_ef' && v.modalidade === 'FIXO',
      ).length
      const itin = res.vagasGeradas.filter(
        (v) => v.funcaoId === 'f_ef' && v.modalidade === 'ITINERANTE',
      ).length
      return { fixo, itin }
    }

    it('para 5 turmas deve gerar 0 fixo e 1 itinerante', () => {
      expect(testarQtd(5)).toEqual({ fixo: 0, itin: 1 })
    })

    it('para 6 turmas deve gerar 1 fixo e 0 itinerante', () => {
      expect(testarQtd(6)).toEqual({ fixo: 1, itin: 0 })
    })

    it('para 7 turmas deve gerar 1 fixo e 0 itinerante', () => {
      expect(testarQtd(7)).toEqual({ fixo: 1, itin: 0 })
    })

    it('para 13 turmas deve gerar 1 fixo e 1 itinerante', () => {
      expect(testarQtd(13)).toEqual({ fixo: 1, itin: 1 })
    })

    it('para 14 turmas deve gerar 2 fixo e 0 itinerante', () => {
      expect(testarQtd(14)).toEqual({ fixo: 2, itin: 0 })
    })

    it('para 15 turmas deve gerar 2 fixo e 1 itinerante', () => {
      expect(testarQtd(15)).toEqual({ fixo: 2, itin: 1 })
    })
  })

  describe('7. Override de Nível SEMED', () => {
    it('deve usar o nível override em vez do nível calculado numericamente', () => {
      const res = calcularVagasPorte({
        alunosTotal: 80, // Calculado seria Nível I
        alunosPorModalidade: { jornada_ampliada: 0, eja: 0, srm: 0 },
        modalidadesExcluidas: [],
        niveisTipo: niveis20h,
        nivelOverrideId: 'n3', // Nível III
        regrasNivel: [],
        regrasTurmas: [],
        excecoesVagas: [],
        turnosEscola: ['MATUTINO'],
        turmas: [],
      })

      expect(res.nivelCalculado?.codigo_nivel).toBe('I')
      expect(res.nivelAplicado?.codigo_nivel).toBe('III')
      expect(res.isOverride).toBe(true)
    })
  })

  describe('8. Idempotência da Regeração e Preservação de Vagas Ocupadas', () => {
    it('não apaga nem duplica vagas já ocupadas e marca excedente se a regra encolher', () => {
      // Cenário: A escola tinha 2 vagas ocupadas de Diretor, mas o novo cálculo prevê apenas 1
      const vagasExistentes: RhVaga[] = [
        {
          id: 'vaga-oc-1',
          escola_ano_id: 'ea1',
          funcao_id: 'f_dir',
          modalidade: 'FIXO',
          origem: 'REGRA_NIVEL',
          status: 'OCUPADA',
          servidor_id: 'srv-1',
          sequencial: 1,
        },
        {
          id: 'vaga-oc-2',
          escola_ano_id: 'ea1',
          funcao_id: 'f_dir',
          modalidade: 'FIXO',
          origem: 'REGRA_NIVEL',
          status: 'OCUPADA',
          servidor_id: 'srv-2',
          sequencial: 2,
        },
      ]

      // Nova regra prevê apenas 1 vaga
      const novasVagas = [
        {
          funcaoId: 'f_dir',
          modalidade: 'FIXO' as const,
          origem: 'REGRA_NIVEL' as const,
          status: 'ABERTA' as const,
          sequencial: 1,
        },
      ]

      const resultado = aplicarIdempotenciaVagas(novasVagas, vagasExistentes)

      expect(resultado).toHaveLength(2)
      // A primeira vaga prevista foi preenchida pela existente ocupada 1
      expect(resultado[0].id).toBe('vaga-oc-1')
      expect(resultado[0].status).toBe('OCUPADA')
      expect(resultado[0].servidorId).toBe('srv-1')

      // A segunda vaga, não prevista mais na regra nova mas ocupada, é preservada como EXCEDENTE
      expect(resultado[1].id).toBe('vaga-oc-2')
      expect(resultado[1].status).toBe('EXCEDENTE')
      expect(resultado[1].servidorId).toBe('srv-2')
    })
  })
})
