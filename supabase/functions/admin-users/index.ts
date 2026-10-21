import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    if (action === 'invite') {
      const email = (body.email || '').trim().toLowerCase()
      const nomeCompleto = (body.nome_completo || '').trim()
      const perfil = body.perfil || 'Operador'
      const estado = body.estado || 'Ativo'

      if (!email || !nomeCompleto) {
        return new Response(JSON.stringify({ error: 'Nome completo e e-mail são obrigatórios.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let userId: string | null = null
      let inviteSent = false
      let inviteMsg = ''

      // 1. Tentar inviteUserByEmail
      const inviteResult = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          name: nomeCompleto,
          full_name: nomeCompleto,
        },
      })

      if (inviteResult.data?.user) {
        userId = inviteResult.data.user.id
        inviteSent = true
        inviteMsg = 'E-mail de convite enviado pelo Supabase.'
      } else if (inviteResult.error) {
        inviteMsg = inviteResult.error.message
        // Se o usuário já existir no auth, buscar o id
        const { data: existingUsers } = await adminClient.auth.admin.listUsers()
        const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email)
        if (existing) {
          userId = existing.id
        }
      }

      // 2. Inserir ou atualizar na tabela usuarios_sistema
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
            inviteSent,
            message: inviteMsg,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          usuario,
          inviteSent,
          message: inviteMsg,
          user_id: userId,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

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
