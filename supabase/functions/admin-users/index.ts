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
    // Caso a URL seja formatada de forma não-padrão, segue a substituição por string
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
          error: 'Chaves de serviço do Supabase não configuradas.',
          inviteSent: false,
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
    const { action } = body

    // =========================================================================
    // AÇÃO: INVITE OU RESEND_CONFIRMATION (Criação de usuário ou reenvio)
    // =========================================================================
    if (action === 'invite' || action === 'resend_invite') {
      const email = (body.email || '').trim().toLowerCase()
      const nomeCompleto = (body.nome_completo || '').trim()
      const perfil = body.perfil || 'Operador'
      const estado = body.estado || 'Ativo'
      const requestRedirect = body.redirect_to || `${DEFAULT_PROD_URL}/login`
      const redirectUrl = sanitizeRedirectUrl(requestRedirect)

      if (!email || !email.includes('@')) {
        return new Response(JSON.stringify({ error: 'Um e-mail válido é obrigatório.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (action === 'invite' && !nomeCompleto) {
        return new Response(JSON.stringify({ error: 'Nome completo é obrigatório.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // 1. Obter a conta SMTP ativa do banco de dados (tabela public.contas_email)
      const { data: contasSmtp } = await adminClient.rpc('obter_conta_smtp_ativa')
      const contaAtiva = Array.isArray(contasSmtp) ? contasSmtp[0] : contasSmtp

      let userId: string | null = null
      let actionLink = ''

      // 2. Gerar link de convite/confirmação via Auth Admin generateLink
      // generateLink cria o usuário no auth se ainda não existir, sem disparar pelo remetente default do Supabase
      const linkResult = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: redirectUrl,
          data: {
            name: nomeCompleto,
            full_name: nomeCompleto,
          },
        },
      })

      if (linkResult.data?.properties?.action_link) {
        actionLink = linkResult.data.properties.action_link
        userId = linkResult.data.user?.id || null
      } else {
        // Fallback para tipo 'magiclink' ou busca do usuário existente
        const { data: existingUsers } = await adminClient.auth.admin.listUsers()
        const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email)
        if (existing) {
          userId = existing.id
          const recoveryLink = await adminClient.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: { redirectTo: redirectUrl },
          })
          if (recoveryLink.data?.properties?.action_link) {
            actionLink = recoveryLink.data.properties.action_link
          }
        } else {
          // Tentar criar com admin.createUser sem autoConfirm para gerar link
          const createRes = await adminClient.auth.admin.createUser({
            email,
            email_confirm: false,
            user_metadata: { name: nomeCompleto, full_name: nomeCompleto },
          })
          if (createRes.data?.user) {
            userId = createRes.data.user.id
            const inv = await adminClient.auth.admin.generateLink({
              type: 'invite',
              email,
              options: { redirectTo: redirectUrl },
            })
            actionLink = inv.data?.properties?.action_link || ''
          }
        }
      }

      // Normaliza o action link para garantir que NUNCA aponte para localhost
      const finalActionLink = normalizeActionLink(actionLink, redirectUrl)

      // 3. Disparar e-mail institucional via SMTP configurado (mesmo remetente do esqueci minha senha)
      let smtpSent = false
      let smtpErrorDetails = ''

      if (contaAtiva && finalActionLink) {
        try {
          const senderName = contaAtiva.nome_from || 'Sistema de Gestão de Porte de Escolas'
          const fromAddress = `"${senderName}" <${contaAtiva.email_from}>`
          const isSsl = Number(contaAtiva.porta) === 465 || contaAtiva.criptografia === 'SSL'

          const transporter = nodemailer.createTransport({
            host: contaAtiva.host,
            port: Number(contaAtiva.porta) || 587,
            secure: isSsl,
            auth: {
              user: contaAtiva.usuario_smtp,
              pass: contaAtiva.senha_smtp,
            },
            tls: {
              rejectUnauthorized: false,
            },
            connectionTimeout: 10000,
            greetingTimeout: 8000,
            socketTimeout: 12000,
          })

          const isResend = action === 'resend_invite'
          const emailSubject = isResend
            ? 'Confirmação de Cadastro - Sistema de Gestão de Porte de Escolas'
            : 'Bem-vindo ao Sistema de Gestão de Porte de Escolas - Ative seu Acesso'

          const emailText = `Olá ${nomeCompleto || ''},\n\nVocê foi cadastrado no Sistema de Gestão de Porte de Escolas.\n\nPara ativar sua conta e definir sua senha de acesso, clique no link abaixo:\n${finalActionLink}\n\nCaso o link não funcione, copie e cole o endereço no seu navegador.\n\nAtenciosamente,\n${senderName}`

          const emailHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${emailSubject}</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 16px;">
                <tr>
                  <td align="center">
                    <table width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color: #0B2545; padding: 24px 32px; text-align: left;">
                          <h1 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">
                            Sistema de Gestão de Porte de Escolas
                          </h1>
                          <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">
                            Plataforma Administrativa de Gestão Educacional
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 32px;">
                          <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 17px; font-weight: 600;">
                            ${isResend ? 'Confirmação de Acesso' : 'Bem-vindo(a) ao Sistema'}
                          </h2>
                          <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                            Olá <strong>${nomeCompleto || email}</strong>,
                          </p>
                          <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                            ${
                              isResend
                                ? `Encaminhamos novamente o link de ativação para o seu usuário <strong>${email}</strong>.`
                                : `Um cadastro foi criado para você no sistema com o login <strong>${email}</strong>. Para ativar seu acesso e criar sua senha, clique no botão abaixo:`
                            }
                          </p>
                          <div style="text-align: center; margin: 28px 0;">
                            <a href="${finalActionLink}" style="display: inline-block; background-color: #0B2545; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(11, 37, 69, 0.2);">
                              ${isResend ? 'Confirmar Meu Acesso' : 'Ativar Minha Conta e Criar Senha'}
                            </a>
                          </div>
                          <p style="margin: 0 0 12px 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                            Caso o botão acima não abra, copie e cole o seguinte link em seu navegador:
                          </p>
                          <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 1.4; color: #2563eb; word-break: break-all;">
                            ${finalActionLink}
                          </p>
                          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8;">
                            O link aponta com segurança para o domínio oficial da plataforma (${DEFAULT_PROD_URL}).
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                          Mensagem institucional enviada via <strong>${contaAtiva.descricao}</strong> (${contaAtiva.email_from}). Não responda a este e-mail.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `

          const mailOptions: any = {
            from: fromAddress,
            to: email,
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
          console.warn('Erro ao disparar e-mail de convite via SMTP:', smtpErr)
          smtpErrorDetails = smtpErr?.message || String(smtpErr)
        }
      }

      // Se o envio SMTP direto não ocorreu e action === 'invite', usar fallback
      if (!smtpSent && action === 'invite') {
        try {
          const invRes = await adminClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: redirectUrl,
            data: { name: nomeCompleto, full_name: nomeCompleto },
          })
          if (invRes.data?.user) {
            userId = invRes.data.user.id
          }
        } catch (fbErr) {
          console.warn('Fallback inviteUserByEmail falhou:', fbErr)
        }
      }

      // Se for apenas reenvio, atualizar auditoria e retornar
      if (action === 'resend_invite') {
        try {
          await adminClient.from('auditoria').insert({
            entidade: 'Usuários',
            acao: 'Reenvio de Confirmação',
            registro_codigo: body.codigo || null,
            descricao: `Reenvio de e-mail de confirmação/ativação para o usuário "${nomeCompleto || email}" (${email}) via SMTP ${contaAtiva?.codigo || 'institucional'}.`,
            usuario_nome: 'Sistema / Administração',
            usuario_email: email,
            detalhes: {
              email,
              action_link: finalActionLink,
              smtp_enviado: smtpSent,
              smtp_erro: smtpErrorDetails || null,
              conta_smtp: contaAtiva
                ? {
                    codigo: contaAtiva.codigo,
                    descricao: contaAtiva.descricao,
                    remetente: contaAtiva.email_from,
                  }
                : null,
            },
          })
        } catch (auditErr) {
          console.warn('Falha ao auditar reenvio de convite:', auditErr)
        }

        return new Response(
          JSON.stringify({
            success: true,
            inviteSent: smtpSent,
            message: smtpSent
              ? `E-mail de confirmação reenviado com sucesso para ${email} via ${contaAtiva?.descricao || 'SMTP'}.`
              : `Link gerado com sucesso. (${smtpErrorDetails || 'Envio processado'})`,
            action_link: finalActionLink,
            conta_smtp: contaAtiva
              ? {
                  codigo: contaAtiva.codigo,
                  descricao: contaAtiva.descricao,
                  remetente: contaAtiva.email_from,
                }
              : null,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // 4. Inserir na tabela usuarios_sistema para novo usuário
      const { data: usuario, error: dbError } = await adminClient
        .from('usuarios_sistema')
        .insert([
          {
            user_id: userId,
            nome_completo: nomeCompleto,
            email,
            perfil,
            estado,
          },
        ])
        .select()
        .single()

      if (dbError) {
        return new Response(
          JSON.stringify({
            error: dbError.message,
            inviteSent: smtpSent,
            message: smtpErrorDetails,
            action_link: finalActionLink,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // Registrar auditoria de criação de usuário com dados de envio SMTP
      try {
        await adminClient.from('auditoria').insert({
          entidade: 'Usuários',
          acao: 'Criação',
          registro_codigo: usuario?.codigo || null,
          descricao: `Cadastro do usuário "${usuario.nome_completo}" (${usuario.email}, perfil ${usuario.perfil}, estado ${usuario.estado}). E-mail de confirmação enviado via conta SMTP institucional (${contaAtiva?.descricao || 'configurada'}).`,
          usuario_nome: 'Sistema / Administração',
          usuario_email: email,
          detalhes: {
            usuario,
            inviteSent: smtpSent,
            smtp_erro: smtpErrorDetails || null,
            conta_smtp: contaAtiva
              ? {
                  codigo: contaAtiva.codigo,
                  descricao: contaAtiva.descricao,
                  remetente: contaAtiva.email_from,
                }
              : null,
            action_link: finalActionLink,
          },
        })
      } catch (auditErr) {
        console.warn('Falha ao auditar criação com SMTP:', auditErr)
      }

      return new Response(
        JSON.stringify({
          success: true,
          usuario,
          inviteSent: smtpSent,
          message: smtpSent
            ? `E-mail de confirmação de cadastro enviado com sucesso via ${contaAtiva?.descricao}.`
            : `Usuário cadastrado com sucesso.`,
          user_id: userId,
          action_link: finalActionLink,
          conta_smtp: contaAtiva
            ? {
                codigo: contaAtiva.codigo,
                descricao: contaAtiva.descricao,
                remetente: contaAtiva.email_from,
              }
            : null,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // =========================================================================
    // AÇÃO: DELETE (Exclusão de usuário)
    // =========================================================================
    if (action === 'delete') {
      const { user_id, email, usuario_id } = body
      let authDeleted = false

      if (user_id) {
        const { error } = await adminClient.auth.admin.deleteUser(user_id)
        if (!error) authDeleted = true
      } else if (email) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers()
        const target = existingUsers?.users?.find(
          (u) => u.email?.toLowerCase() === String(email).toLowerCase(),
        )
        if (target) {
          const { error } = await adminClient.auth.admin.deleteUser(target.id)
          if (!error) authDeleted = true
        }
      }

      if (usuario_id) {
        await adminClient.from('usuarios_sistema').delete().eq('id', usuario_id)
      }

      return new Response(JSON.stringify({ success: true, authDeleted }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
