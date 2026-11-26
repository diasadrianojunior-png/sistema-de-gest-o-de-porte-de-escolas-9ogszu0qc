import { supabase } from '@/lib/supabase/client'
import { registrarAuditoria } from '@/services/auditoria'

/**
 * Índice de conteúdo dos "Arquivo(s) Comprobatório(s) de Especialidade(s)" do
 * Cadastro de Profissionais.
 *
 * Cada comprovante (PDF) tem o texto extraído no navegador com pdf.js
 * (carregado sob demanda via CDN ESM) e gravado na tabela
 * `profissionais_arquivos_indice` (migração 20261124200000): texto de até 25
 * milhões de caracteres, coluna gerada `busca` (tsvector 'portuguese') com
 * índice GIN e RPC `profissionais_busca_por_arquivos(text)` para o filtro da
 * listagem.
 *
 * O pdf.js NÃO é dependência npm (package.json é protegido contra edição): o
 * módulo ESM e o worker vêm do CDN jsdelivr sob demanda, na primeira extração.
 * Falha de CDN → o arquivo segue subindo, apenas sem indexação (auditado).
 *
 * Imagens (PNG/JPG/WEBP) não têm OCR na plataforma: ficam indexadas com texto
 * vazio e seguem sem erro (comunicado ao usuário).
 */

const db = supabase as any
const TABELA_INDICE = 'profissionais_arquivos_indice'
/** Limite da migração: 25 milhões de caracteres de texto por arquivo. */
export const LIMITE_CARACTERES_INDICE = 25_000_000

/**
 * pdf.js carregado sob demanda (lazy) via CDN ESM — SEM dependência npm nem
 * import estático (o bundler não resolve "pdfjs-dist" no build). O módulo e o
 * worker vêm do jsdelivr na primeira extração de texto de um PDF.
 */
const CDN_PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs'
const CDN_PDFJS_WORKER_URL =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs'

/** Tipagem mínima local: o módulo CDN não é importado estaticamente. */
type PdfJs = any

let pdfjsCache: PdfJs | null = null
/** true quando o último carregamento do CDN falhou (para auditoria/aviso). */
let ultimoCarregamentoFalhou = false

/** Indica se o último carregamento do leitor de PDF (CDN) falhou. */
export function carregamentoLeitorFalhou(): boolean {
  return ultimoCarregamentoFalhou
}

/** Erro amigável quando o CDN do pdf.js não responde. */
export class ErroCarregamentoPdfJs extends Error {
  constructor() {
    super('Não foi possível carregar o leitor de PDF — verifique a conexão e tente novamente')
    this.name = 'ErroCarregamentoPdfJs'
  }
}

/** Carrega o pdf.js do CDN uma única vez e configura o worker (lazy). */
async function carregarPdfJs(): Promise<PdfJs> {
  if (pdfjsCache) return pdfjsCache
  let modulo: PdfJs
  try {
    // Import dinâmico de URL externa (variável + @vite-ignore): o bundler deixa
    // passar sem tentar resolver, e o navegador baixa o módulo em tempo real.
    const urlCdn = CDN_PDFJS_URL
    modulo = (await import(/* @vite-ignore */ urlCdn)) as PdfJs
    ultimoCarregamentoFalhou = false
  } catch (e) {
    ultimoCarregamentoFalhou = true
    console.error('Falha ao carregar o leitor de PDF (CDN):', e)
    throw new ErroCarregamentoPdfJs()
  }
  if (!modulo?.getDocument) {
    console.error('Módulo pdf.js do CDN sem a API esperada (getDocument).')
    throw new ErroCarregamentoPdfJs()
  }
  try {
    modulo.GlobalWorkerOptions.workerSrc = CDN_PDFJS_WORKER_URL
  } catch (e) {
    console.warn('Worker do pdf.js indisponível; usando execução no thread principal.', e)
  }
  pdfjsCache = modulo
  return modulo
}

/**
 * Extrai o texto de um PDF no navegador com pdf.js, concatenando o texto de
 * todas as páginas. Sempre devolve texto (string vazia quando o PDF não tem
 * texto extraível — PDF digitalizado, ou leitor indisponível) e nunca lança
 * erro que trave o upload: o arquivo continua subindo, apenas sem indexação.
 */
export async function extrairTextoPdf(file: File): Promise<string> {
  let pdfjs: PdfJs
  try {
    pdfjs = await carregarPdfJs()
  } catch (e) {
    // CDN indisponível: o arquivo segue subindo, apenas sem indexação.
    // O aviso amigável e o registro na auditoria ficam em quem chama
    // (indexarArquivoComprobatorio / uploadArquivoComprobatorio).
    return ''
  }
  try {
    const buffer = await file.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buffer }).promise
    let texto = ''
    for (let num = 1; num <= doc.numPages; num++) {
      const page = await doc.getPage(num)
      const conteudo = await page.getTextContent()
      const pagina = conteudo.items
        .map((item: any) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ')
      texto += (texto ? '\n' : '') + pagina.trim()
      page.cleanup()
    }
    await doc.destroy()
    // Limpeza básica: colapsa espaços repetidos mantendo quebras de linha
    return texto
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  } catch (e) {
    console.error('Falha ao extrair texto do PDF (o arquivo segue sem conteúdo indexado):', e)
    return ''
  }
}

/** Ponto de entrada: devolve o texto indexável do arquivo (PDF) ou vazio (imagem). */
export async function extrairTextoArquivo(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const texto = await extrairTextoPdf(file)
    // Respeita o limite de 25 milhões de caracteres por arquivo
    return texto.length > LIMITE_CARACTERES_INDICE
      ? texto.slice(0, LIMITE_CARACTERES_INDICE)
      : texto
  }
  // Imagens (PNG/JPG/WEBP): sem OCR na plataforma — texto vazio, sem erro
  return ''
}

export interface RegistrarIndiceParams {
  profissionalId: string | null
  nomeArquivo: string
  caminho: string
  tipoArquivo: string
  texto: string
  /** Nome do profissional para a auditoria. */
  profissionalNome?: string | null
  profissionalCodigo?: string | null
}

/**
 * Grava (upsert por caminho) o texto extraído de um comprovante no índice e
 * registra o evento na Auditoria. Melhor esforço: erro de índice não trava o
 * salvamento do profissional.
 */
export async function indexarArquivoComprobatorio(params: RegistrarIndiceParams): Promise<void> {
  const { profissionalId, nomeArquivo, caminho, tipoArquivo, texto } = params
  const caracteres = texto.length
  // PDF sem texto pode ser digitalizado OU leitor (CDN) indisponível: a auditoria
  // distingue os dois para o usuário saber o que aconteceu.
  const leitorIndisponivel =
    tipoArquivo === 'application/pdf' && caracteres === 0 && carregamentoLeitorFalhou()
  try {
    const { error } = await db.from(TABELA_INDICE).upsert(
      {
        profissional_id: profissionalId,
        nome_arquivo: nomeArquivo,
        caminho,
        tipo_arquivo: tipoArquivo,
        texto_indexado: texto,
        caracteres_indexados: caracteres,
        indexado_em: new Date().toISOString(),
      },
      { onConflict: 'caminho' },
    )
    if (error) throw error

    await registrarAuditoria({
      entidade: 'Profissionais',
      acao: 'Indexação de Comprovante',
      registro_codigo: params.profissionalCodigo || null,
      descricao: leitorIndisponivel
        ? `Arquivo comprobatório "${nomeArquivo}" do profissional "${params.profissionalNome || 'Novo profissional'}" NÃO pôde ser indexado: ${new ErroCarregamentoPdfJs().message}. O arquivo foi enviado normalmente e fica fora da busca por palavras.`
        : `Arquivo comprobatório "${nomeArquivo}" indexado para o profissional "${params.profissionalNome || 'Novo profissional'}" — ${caracteres} caractere(s) extraído(s) (limite de 25 milhões por arquivo).`,
      detalhes: {
        tipo_evento: 'indexacao_comprovante',
        acao: leitorIndisponivel ? 'indexado_sem_leitor' : 'indexado',
        profissional_id: profissionalId,
        profissional_nome: params.profissionalNome || null,
        profissional_codigo: params.profissionalCodigo || null,
        nome_arquivo: nomeArquivo,
        caminho,
        tipo_arquivo: tipoArquivo,
        caracteres_indexados: caracteres,
      },
    })
  } catch (e) {
    console.error('Erro ao indexar arquivo comprobatório:', e)
  }
}

/**
 * Remove a entrada do índice de um comprovante excluído/substituído e registra
 * o evento na Auditoria. Melhor esforço: erro não trava o salvamento.
 */
export async function desindexarArquivoComprobatorio(
  caminho: string,
  contexto: {
    profissionalNome?: string | null
    profissionalCodigo?: string | null
    motivo: 'substituído' | 'removido'
  } = { motivo: 'removido' },
): Promise<void> {
  try {
    const { data, error } = await db
      .from(TABELA_INDICE)
      .delete()
      .eq('caminho', caminho)
      .select('nome_arquivo, caracteres_indexados')

    if (error) throw error

    const nomeArquivo =
      (data as Array<{ nome_arquivo?: string }> | null)?.[0]?.nome_arquivo || caminho

    await registrarAuditoria({
      entidade: 'Profissionais',
      acao: 'Indexação de Comprovante',
      registro_codigo: contexto.profissionalCodigo || null,
      descricao: `Índice de conteúdo do arquivo comprobatório "${nomeArquivo}" ${contexto.motivo} do profissional "${contexto.profissionalNome || '—'}". O texto extraído saiu da busca por palavras.`,
      detalhes: {
        tipo_evento: 'indexacao_comprovante',
        acao: contexto.motivo,
        profissional_nome: contexto.profissionalNome || null,
        profissional_codigo: contexto.profissionalCodigo || null,
        nome_arquivo: nomeArquivo,
        caminho,
      },
    })
  } catch (e) {
    console.error('Erro ao remover arquivo do índice de comprovantes:', e)
  }
}

/** Remove todas as entradas do índice de um profissional excluído (best-effort). */
export async function desindexarArquivosDoProfissional(
  arquivos: Array<{ caminho: string }> | null | undefined,
  contexto: { profissionalNome?: string | null; profissionalCodigo?: string | null } = {},
): Promise<void> {
  for (const arquivo of arquivos || []) {
    if (!arquivo?.caminho) continue
    await desindexarArquivoComprobatorio(arquivo.caminho, { ...contexto, motivo: 'removido' })
  }
}

/**
 * Filtro de busca por palavras contidas nos comprovantes: chama a RPC
 * `profissionais_busca_por_arquivos` (tsvector pt-BR + GIN) e devolve os ids
 * dos profissionais que possuem ao menos um arquivo com as palavras buscadas.
 */
export async function buscarProfissionaisPorConteudoArquivos(busca: string): Promise<string[]> {
  const termo = busca.trim()
  if (!termo) return []
  const { data, error } = await db.rpc('profissionais_busca_por_arquivos', { p_busca: termo })
  if (error) {
    console.error('Erro na busca por palavras nos arquivos comprobatórios:', error)
    throw error
  }
  return ((data as string[]) || []).filter(Boolean)
}
