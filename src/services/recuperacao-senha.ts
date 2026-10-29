import { supabase } from '@/lib/supabase/client'

export interface EsqueciSenhaResponse {
  success: boolean
  message?: string
  error?: string
  email?: string
  conta_smtp?: {
    codigo?: string
    descricao?: string
    remetente?: string
  }
  smtp_enviado?: boolean
  reset_link?: string
}

/**
 * Solicita redefinição de senha para um e-mail cadastrado.
 * Utiliza a edge function 'reset-password-email' que busca a conta SMTP ativa
 * na tabela 'contas_email' (descriptografando as credenciais de forma segura no servidor)
 * e dispara o e-mail institucional com o link oficial de redefinição de senha.
 */
const DEFAULT_PROD_URL = 'https://sistema-de-gestao-de-porte-de-escolas-bf76d.goskip.app'

export async function solicitarRedefinicaoSenha(
  email: string,
  redirectTo?: string,
): Promise<EsqueciSenhaResponse> {
  const emailLimpo = email.trim().toLowerCase()

  try {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : DEFAULT_PROD_URL
    const defaultRedirect = `${origin}/login`

    const { data, error } = await supabase.functions.invoke('reset-password-email', {
      body: {
        email: emailLimpo,
        redirect_to: redirectTo || defaultRedirect,
      },
    })

    if (error) {
      console.warn('Erro ao chamar edge function reset-password-email:', error)
      return {
        success: false,
        error: error.message || 'Erro ao comunicar com o servidor de redefinição de senha.',
      }
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || 'Não foi possível enviar o e-mail de redefinição.',
      }
    }

    return {
      success: true,
      message: data.message || `E-mail de redefinição enviado com sucesso para ${emailLimpo}.`,
      email: data.email,
      conta_smtp: data.conta_smtp,
      smtp_enviado: data.smtp_enviado,
      reset_link: data.reset_link,
    }
  } catch (err: any) {
    console.error('Exceção ao solicitar redefinição de senha:', err)
    return {
      success: false,
      error: err?.message || 'Falha inesperada ao solicitar redefinição de senha.',
    }
  }
}
