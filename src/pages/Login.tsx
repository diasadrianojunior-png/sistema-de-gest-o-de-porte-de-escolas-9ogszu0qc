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
import { School, LogIn, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Login() {
  const [email, setEmail] = useState('renato.guenther@ajrd.com.br')
  const [password, setPassword] = useState('Skip@Pass')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/painel', { replace: true })
    }
  }, [user, loading, navigate])

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
        navigate('/painel')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado durante o login.')
    } finally {
      setIsSubmitting(false)
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

              <div className="bg-slate-100 p-3 rounded-md text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-700">Acesso padrão configurado:</p>
                <p>
                  E-mail:{' '}
                  <span className="font-mono text-slate-800">renato.guenther@ajrd.com.br</span>
                </p>
                <p>
                  Senha: <span className="font-mono text-slate-800">Skip@Pass</span>
                </p>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
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
    </div>
  )
}
