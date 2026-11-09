/**
 * Serviço de listagem para o módulo "Gera Lista de Vagas Abertas".
 * Reaproveita o modelo e as proteções de src/services/vagas.ts (sanitização
 * contra o valor sentinela "TODOS" em colunas UUID) sem alterar sua lógica.
 */
import { supabase } from '@/lib/supabase/client'
import { VagaCompleta } from '@/services/vagas'
export type { VagaCompleta }

const TABELA = 'vaga' as const

/**
 * Lista as vagas do Ano Letivo informado, ordenadas por Unidade Escolar e número sequencial.
 * Somente leitura: não altera registros, apenas consulta para a lista do novo módulo.
 */
export async function listarVagasAbertasAnoLetivo(anoLetivo: number): Promise<VagaCompleta[]> {
  if (!anoLetivo || !Number.isFinite(anoLetivo)) return []
  const { data, error } = await supabase
    .from(TABELA)
    .select(
      `*,
       unidade_escolar:unidade_escolar_id(id, nome, tipo_atendimento),
       cargo:cargo_id(id, nome, codigo),
       funcao_objeto:funcao_id(id, nome, codigo),
       profissional_titular:profissional_titular_id(id, nome, codigo),
       profissional_ocupante:profissional_ocupante_id(id, nome, codigo),
       configuracao_rh:configuracao_rh_id(id, tipo_atendimento, ano_letivo, status)
      `,
    )
    .eq('ano_letivo', anoLetivo)
    .order('unidade_escolar_id', { ascending: true })
    .order('numero_sequencial', { ascending: true })
  if (error) throw error
  return (data || []) as unknown as VagaCompleta[]
}
