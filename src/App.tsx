import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import Index from './pages/Index'
import Login from './pages/Login'
import Painel from './pages/Painel'
import CadastrosApoio from './pages/CadastrosApoio'
import Cargos from './pages/Cargos'
import CadastrosMestres from './pages/CadastrosMestres'
import Administracao from './pages/Administracao'
import Auditoria from './pages/Auditoria'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Rota pública de Login */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Index />} />

          {/* Rotas protegidas dentro do Layout */}
          <Route element={<Layout />}>
            <Route path="/painel" element={<Painel />} />
            <Route path="/cadastros-mestres" element={<CadastrosMestres />} />
            <Route path="/cadastros-apoio" element={<CadastrosApoio />} />
            <Route path="/cadastros-apoio/cargos" element={<Cargos />} />
            <Route path="/administracao" element={<Administracao />} />
            <Route path="/auditoria" element={<Auditoria />} />
          </Route>

          {/* Rota 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
