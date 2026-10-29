import { supabase } from '@/lib/supabase/client'
import { UnidadeEscolar } from '@/types/gestao-escolar'
import { registrarAuditoria } from './auditoria'

const db = supabase as any

export const getUnidadesEscolares = async (
  anoLetivoReferencia?: number,
): Promise<UnidadeEscolar[]> => {
  const ano = anoLetivoReferencia || 2026

  const { data, error } = await db
    .from('unidades_escolares')
    .select('*, unidade_escolar_ano(ano_letivo, qtd_alunos)')
    .order('codigo', { ascending: true })

  if (error) {
    console.error('Erro ao buscar unidades escolares:', error)
    throw error
  }

  // Mapeia quantidade_alunos a partir do registro do ano letivo de referência (ou mais recente)
  const formatados: UnidadeEscolar[] = ((data as any[]) || []).map((item) => {
    const anos: any[] = Array.isArray(item.unidade_escolar_ano) ? item.unidade_escolar_ano : []
    const registroAno = anos.find((a) => a.ano_letivo === ano) || anos[0]
    const { unidade_escolar_ano: _, ...resto } = item
    return {
      ...resto,
      quantidade_alunos:
        registroAno && registroAno.qtd_alunos !== null && registroAno.qtd_alunos !== undefined
          ? registroAno.qtd_alunos
          : null,
    } as UnidadeEscolar
  })

  return formatados
}

export const createUnidadeEscolar = async (
  unidade: Omit<UnidadeEscolar, 'id' | 'created_at' | 'updated_at'>,
  anoLetivoReferencia: number = 2026,
): Promise<UnidadeEscolar> => {
  // Separar quantidade_alunos do payload de unidades_escolares (pois pertence a unidade_escolar_ano)
  const { quantidade_alunos, ...payloadUnidade } = unidade as any

  const { data, error } = await db
    .from('unidades_escolares')
    .insert([payloadUnidade])
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao cadastrar unidade escolar:', error)
    throw error
  }

  const created = data as UnidadeEscolar

  // Se foi informada quantidade de alunos ou se deve inicializar o registro anual
  if (quantidade_alunos !== undefined && quantidade_alunos !== null) {
    try {
      const defaultPeriodos = created.tipo_atendimento.includes('40h')
        ? ['INTEGRAL']
        : ['MANHA', 'TARDE']

      await db.from('unidade_escolar_ano').upsert(
        {
          unidade_escolar_id: created.id,
          ano_letivo: anoLetivoReferencia,
          qtd_alunos: Number(quantidade_alunos) || 0,
          qtd_turmas: 0,
          periodos: defaultPeriodos,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'unidade_escolar_id,ano_letivo' },
      )
    } catch (e) {
      console.warn('Aviso: Falha ao sincronizar quantidade_alunos na unidade_escolar_ano:', e)
    }
  }

  // Registrar auditoria
  await registrarAuditoria({
    entidade: 'Unidades escolares',
    acao: 'Criação',
    registro_codigo: created.codigo || null,
    descricao: `Cadastro da unidade escolar "${created.nome}" (${created.tipo_atendimento}).`,
    detalhes: {
      unidade: {
        id: created.id,
        codigo: created.codigo,
        nome: created.nome,
        tipo_atendimento: created.tipo_atendimento,
        localizacao: created.localizacao,
        cep: created.cep,
        logradouro: created.logradouro,
        numero: created.numero,
        bairro: created.bairro,
        cidade: created.cidade,
        estado_uf: created.estado_uf,
      },
    },
  })

  return {
    ...created,
    quantidade_alunos: quantidade_alunos ?? null,
  }
}

export const updateUnidadeEscolar = async (
  id: string,
  unidade: Partial<Omit<UnidadeEscolar, 'id' | 'created_at' | 'updated_at'>>,
  anoLetivoReferencia: number = 2026,
): Promise<UnidadeEscolar> => {
  // Separar quantidade_alunos do payload de unidades_escolares (pois pertence a unidade_escolar_ano)
  const { quantidade_alunos, ...payloadUnidade } = unidade as any

  const { data, error } = await db
    .from('unidades_escolares')
    .update({ ...payloadUnidade, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao atualizar unidade escolar:', error)
    throw error
  }

  const updated = data as UnidadeEscolar

  // Se quantidade_alunos foi fornecida, grava via upsert na tabela unidade_escolar_ano
  if (quantidade_alunos !== undefined && quantidade_alunos !== null) {
    try {
      // Busca registro existente de unidade_escolar_ano para preservar qtd_turmas e períodos se já existirem
      const { data: ueaExistente } = await db
        .from('unidade_escolar_ano')
        .select('*')
        .eq('unidade_escolar_id', id)
        .eq('ano_letivo', anoLetivoReferencia)
        .maybeSingle()

      const defaultPeriodos = updated.tipo_atendimento.includes('40h')
        ? ['INTEGRAL']
        : ['MANHA', 'TARDE']

      await db.from('unidade_escolar_ano').upsert(
        {
          unidade_escolar_id: id,
          ano_letivo: anoLetivoReferencia,
          qtd_alunos: Number(quantidade_alunos) || 0,
          qtd_turmas: ueaExistente?.qtd_turmas ?? 0,
          periodos: ueaExistente?.periodos ?? defaultPeriodos,
          turmas_por_etapa: ueaExistente?.turmas_por_etapa ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'unidade_escolar_id,ano_letivo' },
      )
    } catch (e) {
      console.warn('Aviso: Falha ao atualizar quantidade_alunos na unidade_escolar_ano:', e)
    }
  }

  // Sanitiza alterações da auditoria para não incluir campos descontinuados da tela
  const {
    quantidade_alunos: _qtdAuditoria,
    nivel_porte: _nivelAuditoria,
    ...alteracoesAuditadas
  } = (unidade as any) || {}

  // Registrar auditoria
  await registrarAuditoria({
    entidade: 'Unidades escolares',
    acao: 'Edição',
    registro_codigo: updated.codigo || null,
    descricao: `Edição da unidade escolar "${updated.nome}" (${updated.tipo_atendimento}).`,
    detalhes: { id, alteracoes: alteracoesAuditadas },
  })

  return {
    ...updated,
    quantidade_alunos:
      quantidade_alunos !== undefined ? quantidade_alunos : updated.quantidade_alunos,
  }
}

export const deleteUnidadeEscolar = async (id: string): Promise<void> => {
  // Busca registro antes de excluir para salvar informações de auditoria
  const { data: anterior } = await db
    .from('unidades_escolares')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  const { error } = await db.from('unidades_escolares').delete().eq('id', id)

  if (error) {
    console.error('Erro ao excluir unidade escolar:', error)
    throw error
  }

  // Registrar auditoria
  await registrarAuditoria({
    entidade: 'Unidades escolares',
    acao: 'Exclusão',
    registro_codigo: anterior?.codigo || null,
    descricao: `Exclusão da unidade escolar "${anterior?.nome || id}".`,
    detalhes: { id, registro_anterior: anterior },
  })
}
