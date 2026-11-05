/**
 * Utilitários de impressão da Central de Ajuda.
 * Centraliza a formatação de escopo/descrição e o registro de auditoria do
 * acionamento da impressão (quem, quando e o que foi impresso).
 */
import { registrarAuditoria } from '@/services/auditoria'

export const ESCOPO_TODOS = 'todos_os_modulos'
export const ESCOPO_MODULO = 'apenas_este_modulo'

export type EscopoImpressao = typeof ESCOPO_TODOS | typeof ESCOPO_MODULO

/** Rótulo do escopo usado no diálogo e no registro de auditoria */
export const rotuloEscopoImpressao = (
  escopo: EscopoImpressao,
  tituloModulo?: string | null,
): string =>
  escopo === ESCOPO_MODULO
    ? `Apenas este módulo (${tituloModulo || 'módulo não identificado'})`
    : 'Todos os módulos (Central de Ajuda completa)'

/**
 * Registra na auditoria o acionamento da impressão da Central de Ajuda.
 * Nunca interrompe o fluxo de impressão em caso de falha.
 */
export const registrarAuditoriaImpressaoAjuda = async (
  escopo: EscopoImpressao,
  tituloModulo?: string | null,
): Promise<void> => {
  try {
    await registrarAuditoria({
      entidade: 'Central de Ajuda',
      acao: 'Impressão',
      registro_codigo: null,
      descricao: `Impressão da Central de Ajuda — escopo: ${rotuloEscopoImpressao(escopo, tituloModulo)}.`,
      detalhes: {
        escopo,
        modulo: escopo === ESCOPO_MODULO ? tituloModulo || null : null,
        data_hora: new Date().toISOString(),
      },
    })
  } catch (err) {
    console.warn('Aviso: falha ao registrar auditoria da impressão da ajuda:', err)
  }
}
