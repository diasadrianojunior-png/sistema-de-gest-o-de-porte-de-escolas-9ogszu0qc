import { Profissional } from '@/types/gestao-escolar'
import { determinarTipoVinculoVaga } from '@/services/profissionais'

/**
 * Exporta a listagem de profissionais para formato CSV/Excel compatível com caracteres UTF-8.
 * Segue o padrão da exportação de Vagas (colunas com aspas, BOM UTF-8, separador ";").
 */
export function exportarProfissionaisExcel(
  profissionais: Profissional[],
  nomeArquivo = 'cadastro-profissionais.csv',
) {
  const colunas = [
    'Identificador',
    'Nome do Profissional',
    'E-mail do Profissional',
    'Classe',
    'Classificação no Concurso',
    'Especialidade(s)',
    'Unidade Escolar',
    'Vagas Vinculadas',
    'Status',
  ]

  const linhas = profissionais.map((p) => {
    const especialidades = (p.especialidades || [])
      .map((e) => e.especializacao?.nome || e.especializacao_id)
      .filter(Boolean)
      .join(', ')

    const vagas = (p.vagas_vinculadas || [])
      .map((v) => {
        const tipo = v.vaga && determinarTipoVinculoVaga(v.vaga) === 'FUNCAO' ? 'F' : 'C'
        const titular = tipo === 'C' && v.titular ? ' (Titular)' : ''
        return `[${tipo}] ${v.vaga?.funcao || 'Vaga'}${titular}`
      })
      .join(', ')

    return [
      p.codigo || '',
      `"${(p.nome || '').replace(/"/g, '""')}"`,
      `"${(p.email_profissional || '').replace(/"/g, '""')}"`,
      `"${(p.classe || 'Antigos na Rede').replace(/"/g, '""')}"`,
      `"${(p.classificacao_concurso || '').replace(/"/g, '""')}"`,
      `"${especialidades.replace(/"/g, '""')}"`,
      `"${(p.unidade_escolar?.nome || '').replace(/"/g, '""')}"`,
      `"${vagas.replace(/"/g, '""')}"`,
      p.ativo ? 'Ativo' : 'Inativo',
    ].join(';')
  })

  // BOM para o Microsoft Excel abrir caracteres acentuados corretamente em UTF-8
  const csvContent = '\uFEFF' + [colunas.join(';'), ...linhas].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', nomeArquivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
