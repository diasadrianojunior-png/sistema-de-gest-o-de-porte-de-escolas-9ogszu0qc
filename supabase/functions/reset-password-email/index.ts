import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'
import { corsHeaders } from '../_shared/cors.ts'

const DEFAULT_PROD_URL = 'https://sistema-de-gestao-de-porte-de-escolas-bf76d.goskip.app'

function sanitizeRedirectUrl(rawUrl?: string): string {
  if (!rawUrl || rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1')) {
    return `${DEFAULT_PROD_URL}/login`
  }
  return rawUrl
}

function normalizeActionLink(actionLink: string, targetRedirect: string): string {
  if (!actionLink) return actionLink
  let fixedLink = actionLink

  // Se o GoTrue gerou o link apontando para localhost, substituir pelo domínio de produção
  if (fixedLink.includes('http://localhost:3000') || fixedLink.includes('http://localhost:5173')) {
    fixedLink = fixedLink
      .replace('http://localhost:3000', DEFAULT_PROD_URL)
      .replace('http://localhost:5173', DEFAULT_PROD_URL)
  }

  // Assegurar que o parâmetro redirect_to na query string do link também aponte para a URL de produção
  try {
    const urlObj = new URL(fixedLink)
    const currentRedirect = urlObj.searchParams.get('redirect_to')
    if (!currentRedirect || currentRedirect.includes('localhost')) {
      urlObj.searchParams.set('redirect_to', targetRedirect)
      fixedLink = urlObj.toString()
    }
  } catch (_e) {
    // Continua com substituição de string
  }

  return fixedLink
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Configuração do servidor Supabase incompleta (chaves ausentes).',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await req.json().catch(() => ({}))
    const rawEmail = (body.email || '').trim().toLowerCase()
    const requestRedirect = body.redirect_to || `${req.headers.get('origin') || ''}/login`
    const redirectUrl = sanitizeRedirectUrl(requestRedirect)

    if (!rawEmail || !rawEmail.includes('@')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Por favor, informe um endereço de e-mail válido.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 1. Obter a conta SMTP ativa do banco de dados (tabela public.contas_email)
    const { data: contasSmtp, error: smtpDbError } = await adminClient.rpc('obter_conta_smtp_ativa')

    if (smtpDbError || !contasSmtp || contasSmtp.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Nenhuma conta de e-mail SMTP ativa foi encontrada no sistema. Cadastre ou ative uma conta em Administração > Contas de E-mail.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const contaAtiva = Array.isArray(contasSmtp) ? contasSmtp[0] : contasSmtp

    // 2. Verificar se o usuário existe no sistema (auth.users ou usuarios_sistema)
    const { data: usersList, error: listUserErr } = await adminClient.auth.admin.listUsers()
    if (listUserErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falha ao consultar base de usuários: ${listUserErr.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const existingAuthUser = usersList.users.find((u) => u.email?.trim().toLowerCase() === rawEmail)

    if (!existingAuthUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'O e-mail informado não foi encontrado na base de usuários cadastrados.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 3. Gerar link de recuperação de senha pelo Supabase Auth Admin
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: rawEmail,
      options: {
        redirectTo: redirectUrl,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Não foi possível gerar o link de redefinição: ${linkError?.message || 'Erro desconhecido'}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const rawActionLink = linkData.properties.action_link
    const resetActionLink = normalizeActionLink(rawActionLink, redirectUrl)

    // 4. Preparar e-mail institucional
    const senderName = contaAtiva.nome_from || 'Sistema de Gestão de Porte de Escolas'
    const fromAddress = `"${senderName}" <${contaAtiva.email_from}>`
    const isSsl = Number(contaAtiva.porta) === 465 || contaAtiva.criptografia === 'SSL'

    const emailSubject = 'Redefinição de Senha - Sistema de Gestão de Porte de Escolas'
    const emailText = `Olá,\n\nRecebemos uma solicitação para redefinir a sua senha de acesso ao Sistema de Gestão de Porte de Escolas.\n\nPara cadastrar uma nova senha, acesse o link abaixo:\n${resetActionLink}\n\nSe você não solicitou a redefinição de senha, desconsidere este e-mail. Por motivos de segurança, este link possui validade limitada.\n\nAtenciosamente,\n${senderName}`

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinição de Senha</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 16px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" cellpadding="0" cellspacing="0">
                <!-- Top Header -->
                <tr>
                  <td style="background-color: #0B2545; padding: 24px 32px; text-align: left;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.01em;">
                      Sistema de Gestão de Porte de Escolas
                    </h1>
                    <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">
                      Plataforma Administrativa de Gestão Educacional
                    </p>
                  </td>
                </tr>
                <!-- Body Content -->
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 17px; font-weight: 600;">
                      Recuperação de Acesso
                    </h2>
                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                      Olá,
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                      Recebemos uma solicitação para redefinir a senha do seu usuário <strong>${rawEmail}</strong>.
                    </p>
                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${resetActionLink}" style="display: inline-block; background-color: #0B2545; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(11, 37, 69, 0.2);">
                        Redefinir Minha Senha
                      </a>
                    </div>
                    <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                      Caso o botão acima não funcione, copie e cole o seguinte link em seu navegador:
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 1.4; color: #2563eb; word-break: break-all;">
                      ${resetActionLink}
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                      Se você não realizou esta solicitação, por favor ignore esta mensagem. Sua senha atual permanecerá inalterada.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                    Mensagem automática enviada via <strong>${contaAtiva.descricao}</strong>. Não responda a este e-mail.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    // 5. Tentativa de envio via SMTP real usando nodemailer
    let smtpSent = false
    let smtpErrorDetails = ''

    try {
      const transporter = nodemailer.createTransport({
        host: contaAtiva.host,
        port: Number(contaAtiva.porta) || 587,
        secure: isSsl,
        auth: {
          user: contaAtiva.usuario_smtp,
          pass: contaAtiva.senha_smtp,
        },
        tls: {
          rejectUnauthorized: false, // Compatibilidade com servidores que possuem certificados autoassinados ou intermediários
        },
        connectionTimeout: 10000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      })

      const mailOptions: any = {
        from: fromAddress,
        to: rawEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      }

      if (contaAtiva.reply_to) {
        mailOptions.replyTo = contaAtiva.reply_to
      }

      await transporter.sendMail(mailOptions)
      smtpSent = true
    } catch (smtpErr: any) {
      console.warn('Erro ao conectar ou enviar via SMTP:', smtpErr)
      smtpErrorDetails = smtpErr?.message || String(smtpErr)
    }

    // 6. Se o envio via SMTP encontrou restrições de rede/porta da infraestrutura,
    // utilizar o fallback integrado do Supabase Auth para envio garantido de redefinição
    let authResetTriggered = false
    if (!smtpSent) {
      try {
        const { error: resetErr } = await adminClient.auth.resetPasswordForEmail(rawEmail, {
          redirectTo: redirectUrl,
        })
        if (!resetErr) {
          authResetTriggered = true
        }
      } catch (authErr) {
        console.warn('Fallback resetPasswordForEmail falhou:', authErr)
      }
    }

    // 7. Gravar log de auditoria
    try {
      await adminClient.from('auditoria').insert({
        entidade: 'Autenticação',
        acao: 'Esqueci Senha',
        registro_codigo: contaAtiva.codigo,
        descricao: `Solicitação de redefinição de senha para o e-mail ${rawEmail} processada através da conta ${contaAtiva.codigo} (${contaAtiva.descricao}). Link gerado para ${redirectUrl}.`,
        usuario_nome: 'Sistema / Recuperação de Senha',
        usuario_email: rawEmail,
        detalhes: {
          email_destinatario: rawEmail,
          conta_smtp: {
            codigo: contaAtiva.codigo,
            descricao: contaAtiva.descricao,
            host: contaAtiva.host,
            porta: contaAtiva.porta,
            email_from: contaAtiva.email_from,
          },
          smtp_enviado: smtpSent,
          smtp_erro: smtpErrorDetails || null,
          auth_fallback: authResetTriggered,
          action_link_gerado: Boolean(resetActionLink),
          redirect_to: redirectUrl,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha ao gravar auditoria do esqueci minha senha:', auditErr)
    }

    if (!smtpSent && !authResetTriggered) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Falha no envio do e-mail via SMTP (${contaAtiva.host}:${contaAtiva.porta}): ${smtpErrorDetails || 'Servidor SMTP não respondeu'}.`,
          conta_utilizada: contaAtiva.descricao,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: smtpSent
          ? `E-mail de redefinição enviado com sucesso para ${rawEmail} através da conta de e-mail ativa (${contaAtiva.descricao}).`
          : `Instruções de redefinição de senha enviadas para ${rawEmail}.`,
        email: rawEmail,
        conta_smtp: {
          codigo: contaAtiva.codigo,
          descricao: contaAtiva.descricao,
          remetente: contaAtiva.email_from,
        },
        smtp_enviado: smtpSent,
        reset_link: resetActionLink,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Erro inesperado ao processar solicitação de redefinição de senha.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
