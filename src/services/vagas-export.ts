import { VagaReal } from '@/types/gestao-escolar'

/**
 * Exporta a listagem de vagas para formato CSV/Excel compatível com caracteres UTF-8
 */
export function exportarVagasExcel(vagas: VagaReal[], nomeArquivo = 'cadastro-vagas.csv') {
  const colunas = [
    'Código Vaga',
    'Unidade Escolar',
    'Tipo Atendimento',
    'Ano Letivo',
    'Nível',
    'Função',
    'Nº Seq.',
    'Período',
    'Modalidade',
    'Dias/Semana',
    'Cargo',
    'Ocupante',
    'Status',
    'Condição Especial',
    'Observação',
  ]

  const linhas = vagas.map((v) => {
    const nivel = v.configuracao_rh
      ? `Nível ${v.configuracao_rh.tipo_atendimento.includes('40h') ? 'Infantil' : 'Fundamental'}`
      : '-'
    return [
      v.codigo || '',
      `"${(v.unidade_escolar?.nome || '').replace(/"/g, '""')}"`,
      `"${(v.unidade_escolar?.tipo_atendimento || '').replace(/"/g, '""')}"`,
      v.ano_letivo,
      nivel,
      `"${(v.funcao || '').replace(/"/g, '""')}"`,
      v.numero_sequencial,
      v.periodo || 'Integral/Geral',
      v.modalidade,
      v.dias_semana ? `${v.dias_semana}x/sem` : '',
      `"${(v.cargo?.nome || '').replace(/"/g, '""')}"`,
      `"${(v.nome_ocupante || '').replace(/"/g, '""')}"`,
      v.status,
      v.condicao_especial || 'NENHUMA',
      `"${(v.observacao || '').replace(/"/g, '""')}"`,
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

/**
 * Abre janela de impressão formatada em PDF/A4 para o relatório de vagas
 */
export function exportarVagasPDF(
  vagas: VagaReal[],
  filtrosDescricao: {
    anoLetivo: number
    escolaNome?: string
    totalGeral: number
    totalOcupadas: number
    totalAbertas: number
    totalExcedentes: number
  },
) {
  const janela = window.open('', '_blank', 'width=1100,height=800')
  if (!janela) {
    alert('Por favor, permita pop-ups para gerar a visualização do relatório em PDF/impressão.')
    return
  }

  const linhasHtml = vagas
    .map(
      (v, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${v.codigo || '-'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 500;">${v.unidade_escolar?.nome || '-'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${v.funcao} (${v.numero_sequencial})</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${v.periodo || '—'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${v.modalidade}${v.dias_semana ? ` (${v.dias_semana}x/sem)` : ''}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0;">${v.cargo?.nome || '—'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; font-weight: 600;">${v.nome_ocupante || '<span style="color:#94a3b8;font-weight:normal;">(Em aberto)</span>'}</td>
        <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase;
            ${
              v.status === 'OCUPADA'
                ? 'background: #dcfce7; color: #15803d;'
                : v.status === 'EXCEDENTE'
                  ? 'background: #fef3c7; color: #b45309;'
                  : 'background: #dbeafe; color: #1d4ed8;'
            }">
            ${v.status}
          </span>
        </td>
      </tr>
    `,
    )
    .join('')

  const docHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Relatório de Cadastro de Vagas - Ano Letivo ${filtrosDescricao.anoLetivo}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
        h1 { font-size: 18px; margin: 0 0 4px 0; color: #0f172a; }
        .sub { font-size: 12px; color: #64748b; margin-bottom: 16px; }
        .resumo-box { display: flex; gap: 16px; margin-bottom: 20px; padding: 12px; background: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1; }
        .resumo-item { flex: 1; }
        .resumo-item strong { display: block; font-size: 16px; color: #0f172a; }
        .resumo-item span { font-size: 11px; text-transform: uppercase; color: #475569; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: #e2e8f0; color: #1e293b; font-size: 11px; font-weight: 600; text-transform: uppercase; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
        @media print {
          @page { size: A4 landscape; margin: 12mm; }
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 10px;">
        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="padding: 8px 16px; background: #e2e8f0; color: #334155; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Fechar</button>
      </div>

      <h1>Sistema de Gestão de Porte de Escolas — Cadastro de Vagas</h1>
      <div class="sub">
        Ano Letivo: <strong>${filtrosDescricao.anoLetivo}</strong> | 
        Escola: <strong>${filtrosDescricao.escolaNome || 'Todas as Unidades'}</strong> | 
        Data de emissão: ${new Date().toLocaleString('pt-BR')}
      </div>

      <div class="resumo-box">
        <div class="resumo-item"><span>Total de Vagas</span><strong>${filtrosDescricao.totalGeral}</strong></div>
        <div class="resumo-item"><span>Ocupadas</span><strong style="color: #15803d;">${filtrosDescricao.totalOcupadas}</strong></div>
        <div class="resumo-item"><span>Abertas</span><strong style="color: #1d4ed8;">${filtrosDescricao.totalAbertas}</strong></div>
        <div class="resumo-item"><span>Excedentes</span><strong style="color: #b45309;">${filtrosDescricao.totalExcedentes}</strong></div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 80px;">Cód.</th>
            <th>Unidade Escolar</th>
            <th>Função (Nº)</th>
            <th style="width: 80px;">Período</th>
            <th style="width: 90px;">Modalidade</th>
            <th>Cargo</th>
            <th>Nome do Ocupante</th>
            <th style="width: 70px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${linhasHtml}
        </tbody>
      </table>
    </body>
    </html>
  `

  janela.document.open()
  janela.document.write(docHtml)
  janela.document.close()
}
