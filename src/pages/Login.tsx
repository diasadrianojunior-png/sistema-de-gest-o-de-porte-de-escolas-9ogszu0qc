import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { School, LogIn, AlertCircle, Loader2, Mail, CheckCircle2, KeyRound } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase/client'
import { solicitarRedefinicaoSenha } from '@/services/recuperacao-senha'

export default function Login() {
  // Os campos iniciam vazios conforme solicitação do usuário
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Estado do modal "Esqueci minha senha"
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)
  const [forgotContaInfo, setForgotContaInfo] = useState<{
    codigo?: string
    descricao?: string
    remetente?: string
  } | null>(null)

  // Estado do modal de Definir / Redefinir Nova Senha (via link de recuperação/convite)
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isResetSubmitting, setIsResetSubmitting] = useState(false)
  const [resetModalError, setResetModalError] = useState<string | null>(null)
  const [resetModalSuccess, setResetModalSuccess] = useState<string | null>(null)

  // Alerta de sucesso geral na página (ex: confirmação concluída)
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null)

  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()

  // Tratamento de tokens de autenticação (convite, recuperação, confirmação de e-mail)
  useEffect(() => {
    // 1. Ouvir evento PASSWORD_RECOVERY do Supabase Auth
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordModalOpen(true)
        setResetModalError(null)
      } else if (event === 'USER_UPDATED') {
        // Usuário atualizou dados/senha
      } else if (event === 'SIGNED_IN') {
        // Se usuário acabou de entrar via link de convite (invite), abrir modal para cadastrar a primeira senha
        const hash = window.location.hash || ''
        const search = window.location.search || ''
        if (
          hash.includes('type=invite') ||
          hash.includes('type=recovery') ||
          search.includes('type=invite') ||
          search.includes('type=recovery')
        ) {
          setIsResetPasswordModalOpen(true)
        }
      }
    })

    // 2. Verificar query params e hash da URL ao montar a tela
    const parseUrlTokens = async () => {
      try {
        const hash = window.location.hash || ''
        const search = window.location.search || ''
        const searchParams = new URLSearchParams(search)

        // Supabase pode enviar erro nos parâmetros
        const errorDesc =
          searchParams.get('error_description') ||
          new URLSearchParams(hash.replace(/^#/, '')).get('error_description')
        if (errorDesc) {
          setErrorMessage(decodeURIComponent(errorDesc).replace(/\+/g, ' '))
          return
        }

        // Token de PKCE / Auth Code (?code=...)
        const code = searchParams.get('code')
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchangeErr) {
            setBannerSuccess('Autenticação/confirmação via link concluída com sucesso!')
            // Limpa query params da barra de endereço para segurança
            window.history.replaceState({}, document.title, window.location.pathname)
            const type = searchParams.get('type')
            if (type === 'recovery' || type === 'invite') {
              setIsResetPasswordModalOpen(true)
            }
            return
          }
        }

        // Token de hash fragment (#access_token=...&type=recovery|invite|signup)
        if (hash) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
          const type = hashParams.get('type')
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            if (!setSessionErr) {
              // Limpa o hash para evitar reprocessamento
              window.history.replaceState({}, document.title, window.location.pathname)
              if (type === 'recovery' || type === 'invite') {
                setIsResetPasswordModalOpen(true)
              } else if (type === 'signup') {
                setBannerSuccess(
                  'E-mail confirmado com sucesso no sistema! Você já pode realizar seu login.',
                )
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao processar tokens da URL de login:', err)
      }
    }

    parseUrlTokens()

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Só redireciona automaticamente para o painel se o modal de redefinição/criação de senha não estiver aberto
    if (!loading && user && !isResetPasswordModalOpen) {
      navigate('/painel', { replace: true })
    }
  }, [user, loading, navigate, isResetPasswordModalOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage('Por favor, preencha o e-mail e a senha.')
      return
    }

    try {
      setIsSubmitting(true)
      const { error } = await signIn(email, password)
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          setErrorMessage('Credenciais inválidas. Verifique seu e-mail e senha.')
        } else {
          setErrorMessage(error.message || 'Falha ao realizar login. Tente novamente.')
        }
      } else {
        // Gravar auditoria de login realizado com sucesso
        import('@/services/auditoria')
          .then(({ registrarAuditoria, getUsuarioAtualParaAuditoria }) => {
            getUsuarioAtualParaAuditoria().then((usr) => {
              registrarAuditoria({
                entidade: 'Autenticação',
                acao: 'Login',
                registro_codigo: null,
                descricao: `Login realizado com sucesso no sistema pelo usuário ${usr.nome} (${email.trim().toLowerCase()}).`,
                usuario_id: usr.id,
                usuario_nome: usr.nome,
                usuario_email: email.trim().toLowerCase(),
                detalhes: {
                  email: email.trim().toLowerCase(),
                  timestamp: new Date().toISOString(),
                },
              }).catch((err) => console.warn('Erro ao auditar login:', err))
            })
          })
          .catch((err) => console.warn('Falha no import do serviço de auditoria:', err))

        navigate('/painel')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado durante o login.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenForgotModal = () => {
    // Se o usuário já digitou o e-mail no formulário, aproveita no modal
    setForgotEmail(email.trim())
    setForgotError(null)
    setForgotSuccess(null)
    setForgotContaInfo(null)
    setIsForgotModalOpen(true)
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(null)
    setForgotSuccess(null)
    setForgotContaInfo(null)

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Por favor, informe um endereço de e-mail válido.')
      return
    }

    try {
      setIsForgotSubmitting(true)
      const resp = await solicitarRedefinicaoSenha(forgotEmail)

      if (!resp.success) {
        setForgotError(resp.error || 'Não foi possível processar a solicitação.')
      } else {
        setForgotSuccess(
          resp.message ||
            `E-mail de redefinição enviado para ${forgotEmail.trim().toLowerCase()}. Verifique sua caixa de entrada e spam.`,
        )
        if (resp.conta_smtp) {
          setForgotContaInfo(resp.conta_smtp)
        }
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Falha inesperada ao enviar e-mail de recuperação.')
    } finally {
      setIsForgotSubmitting(false)
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetModalError(null)
    setResetModalSuccess(null)

    if (!newPassword || newPassword.length < 6) {
      setResetModalError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setResetModalError('As senhas digitadas não coincidem.')
      return
    }

    try {
      setIsResetSubmitting(true)
      const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateErr) {
        throw updateErr
      }

      setResetModalSuccess('Sua nova senha foi salva com sucesso!')

      // Registrar auditoria de redefinição de senha concluída
      try {
        const userEmail = updateData.user?.email || ''
        await supabase.from('auditoria').insert({
          entidade: 'Autenticação',
          acao: 'Redefinição de Senha',
          registro_codigo: null,
          descricao: `Redefinição/criação de nova senha concluída com sucesso para o usuário ${userEmail}.`,
          usuario_nome: updateData.user?.user_metadata?.full_name || 'Usuário',
          usuario_email: userEmail,
          detalhes: {
            email: userEmail,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (auditErr) {
        console.warn('Falha ao auditar redefinição de senha:', auditErr)
      }

      setTimeout(() => {
        setIsResetPasswordModalOpen(false)
        navigate('/painel')
      }, 1500)
    } catch (err: any) {
      setResetModalError(
        err?.message || 'Não foi possível atualizar a senha. O link pode ter expirado.',
      )
    } finally {
      setIsResetSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-3 shadow-sm border border-primary/20">
            <School className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sistema de Gestão de Porte de Escolas
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Plataforma administrativa para secretarias e redes de ensino
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Acessar o Sistema</CardTitle>
            <CardDescription>Informe seu e-mail e senha cadastrados para continuar</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {bannerSuccess && (
                <Alert className="border-green-200 bg-green-50 text-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs leading-relaxed">
                    {bannerSuccess}
                  </AlertDescription>
                </Alert>
              )}

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@exemplo.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-xs text-[#0B2545] hover:text-[#133A68] hover:underline font-medium cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                className="w-full gap-2 bg-[#0B2545] hover:bg-[#133A68] text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando no sistema...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Modal Definir / Redefinir Nova Senha */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#0B2545]">
              <div className="p-2 rounded-lg bg-blue-50">
                <KeyRound className="w-5 h-5 text-[#0B2545]" />
              </div>
              <DialogTitle className="text-lg">Cadastrar Nova Senha</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 pt-1">
              Informe sua nova senha de acesso ao sistema para concluir a ativação ou redefinição da
              conta.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2">
            {resetModalError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  {resetModalError}
                </AlertDescription>
              </Alert>
            )}

            {resetModalSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-sm font-semibold text-green-900">Sucesso!</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed text-green-800 mt-1">
                  {resetModalSuccess} Redirecionando para o sistema...
                </AlertDescription>
              </Alert>
            )}

            {!resetModalSuccess && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha (mínimo 6 caracteres)</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isResetSubmitting}
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={isResetSubmitting}
                    required
                  />
                </div>
              </>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              {!resetModalSuccess && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  disabled={isResetSubmitting}
                >
                  Cancelar
                </Button>
              )}

              {!resetModalSuccess && (
                <Button
                  type="submit"
                  className="bg-[#0B2545] hover:bg-[#133A68] text-white gap-2"
                  disabled={isResetSubmitting}
                >
                  {isResetSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando nova senha...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar Nova Senha
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Esqueci Minha Senha */}
      <Dialog open={isForgotModalOpen} onOpenChange={setIsForgotModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#0B2545]">
              <div className="p-2 rounded-lg bg-blue-50">
                <KeyRound className="w-5 h-5 text-[#0B2545]" />
              </div>
              <DialogTitle className="text-lg">Recuperar Senha</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 pt-1">
              Informe o endereço de e-mail cadastrado no sistema. Nós enviaremos um link de
              redefinição usando a conta institucional de e-mail configurada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotSubmit} className="space-y-4 pt-2">
            {forgotError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs leading-relaxed">
                  {forgotError}
                </AlertDescription>
              </Alert>
            )}

            {forgotSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-sm font-semibold text-green-900">
                  Solicitação enviada!
                </AlertTitle>
                <AlertDescription className="text-xs leading-relaxed text-green-800 mt-1">
                  {forgotSuccess}
                  {forgotContaInfo && (
                    <span className="block mt-1 font-mono text-[11px] text-green-700">
                      Disparado via: {forgotContaInfo.descricao} ({forgotContaInfo.remetente})
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {!forgotSuccess && (
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-mail Cadastrado</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="seu.email@exemplo.com.br"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    disabled={isForgotSubmitting}
                    className="pl-9"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  O link de recuperação possui validade limitada e será encaminhado para sua caixa
                  postal.
                </p>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsForgotModalOpen(false)}
                disabled={isForgotSubmitting}
              >
                {forgotSuccess ? 'Fechar' : 'Cancelar'}
              </Button>

              {!forgotSuccess && (
                <Button
                  type="submit"
                  className="bg-[#0B2545] hover:bg-[#133A68] text-white gap-2"
                  disabled={isForgotSubmitting}
                >
                  {isForgotSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Enviar Instruções
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
