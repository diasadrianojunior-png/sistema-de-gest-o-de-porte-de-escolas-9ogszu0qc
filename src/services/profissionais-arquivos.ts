import { supabase } from '@/lib/supabase/client'

/**
 * Upload dos "Arquivos Comprobatórios de Especialidade(s)" do profissional
 * para o bucket "profissionais-comprobantes" do Supabase Storage.
 *
 * O bucket é criado automaticamente na primeira gravação (upsert), pois o
 * Storage do Supabase não tem migração SQL para buckets. O caminho do objeto
 * (pasta do profissional) é o que fica persistido em profissionais.arquivos.
 */

const NOME_BUCKET = 'profissionais-comprobantes'

/** Garante que o bucket privado exista (idempotente). */
export async function garantirBucketComprobantes(): Promise<void> {
  const { data: buckets, error: erroLista } = await supabase.storage.listBuckets()
  if (erroLista) {
    // Sem permissão para listar buckets (ex.: RLS do storage): segue a tentativa
    // de upload — o erro real aparecerá lá, se houver.
    return
  }
  if (buckets?.some((b) => b.name === NOME_BUCKET)) return

  await supabase.storage.createBucket(NOME_BUCKET, {
    public: false,
    fileSizeLimit: 10485760, // 10 MB por arquivo
  })
}

export interface ArquivoComprobatorioSalvo {
  nome: string
  caminho: string
  tamanho: number
}

/** Tipos aceitos para comprovantes (documentos escolares). */
const MIME_PERMITIDOS = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

export function validarArquivoComprobatorio(file: File): string | null {
  if (!MIME_PERMITIDOS.includes(file.type)) {
    return 'Formato não aceito. Envie PDF, PNG, JPG ou WEBP.'
  }
  if (file.size > 10 * 1024 * 1024) {
    return 'Arquivo maior que 10 MB. Reduza o tamanho antes de enviar.'
  }
  return null
}

/** Faz o upload de um arquivo para a pasta do profissional e devolve o registro do anexo. */
export async function uploadArquivoComprobatorio(
  profissionalId: string | null,
  file: File,
): Promise<ArquivoComprobatorioSalvo> {
  await garantirBucketComprobantes()

  const pasta = profissionalId ? `profissional-${profissionalId}` : 'novos'
  const sanitizado = file.name.replace(/[^\w.\-() ]+/g, '_')
  const caminho = `${pasta}/${Date.now()}_${sanitizado}`

  const { error } = await supabase.storage.from(NOME_BUCKET).upload(caminho, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    throw new Error(error.message || 'Falha no upload do arquivo comprobatório.')
  }

  return { nome: file.name, caminho, tamanho: file.size }
}

/** Remove um anexo do bucket (best-effort: erro é ignorado para não travar o salvamento). */
export async function removerArquivoComprobatorio(caminho: string): Promise<void> {
  try {
    await supabase.storage.from(NOME_BUCKET).remove([caminho])
  } catch {
    // best-effort
  }
}

/**
 * Remove todos os Arquivos Comprobatórios de Especialidade(s) de um profissional
 * (usado na exclusão do profissional). Best-effort: um erro de Storage não impede
 * a exclusão do registro — o log registra o problema.
 */
export async function excluirArquivosDoProfissional(
  arquivos: Array<{ caminho: string }> | null | undefined,
): Promise<void> {
  const caminhos = (arquivos || []).map((a) => a?.caminho).filter(Boolean)
  if (caminhos.length === 0) return
  try {
    await supabase.storage.from(NOME_BUCKET).remove(caminhos)
  } catch (e) {
    console.error('Erro ao remover arquivos comprobatórios do profissional do Storage:', e)
  }
}
