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
import Funcoes from './pages/Funcoes'
import Etapas from './pages/Etapas'
import AnosSeries from './pages/AnosSeries'
import ConfigRhNivelPage from './pages/ConfigRhNivel'
import VagasPage from './pages/Vagas'
import CadastrosMestres from './pages/CadastrosMestres'
import Turmas from './pages/Turmas'
import Profissionais from './pages/Profissionais'
import PorteEscolaAnoPage from './pages/PorteEscolaAno'
import Administracao from './pages/Administracao'
import ContasEmail from './pages/ContasEmail'
import Auditoria from './pages/Auditoria'
import { RouteGuard } from './components/RouteGuard'
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
            <Route
              path="/painel"
              element={
                <RouteGuard menuKey="painel">
                  <Painel />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-mestres"
              element={
                <RouteGuard menuKey="unidades_escolares">
                  <CadastrosMestres />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-mestres/turmas"
              element={
                <RouteGuard menuKey="turmas">
                  <Turmas />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-mestres/profissionais"
              element={
                <RouteGuard menuKey="profissionais">
                  <Profissionais />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-mestres/porte-escola"
              element={
                <RouteGuard menuKey="porte_escola">
                  <PorteEscolaAnoPage />
                </RouteGuard>
              }
            />
            {/* ETAPA 1: Configuração de Vagas por Nível (movido para Cadastros Mestres) */}
            <Route
              path="/cadastros-mestres/configuracao-rh"
              element={
                <RouteGuard menuKey="configuracao_rh">
                  <ConfigRhNivelPage />
                </RouteGuard>
              }
            />
            {/* ETAPA 2: Cadastro de Vagas (movido para Cadastros Mestres) */}
            <Route
              path="/cadastros-mestres/vagas"
              element={
                <RouteGuard menuKey="vagas">
                  <VagasPage />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-mestres/vagas/unidade/:unidadeId"
              element={
                <RouteGuard menuKey="vagas">
                  <VagasPage />
                </RouteGuard>
              }
            />

            {/* Redirecionamentos de compatibilidade para os caminhos antigos de vagas */}
            <Route
              path="/cadastros-apoio/configuracao-rh"
              element={<Navigate to="/cadastros-mestres/configuracao-rh" replace />}
            />
            <Route
              path="/cadastros-apoio/vagas"
              element={<Navigate to="/cadastros-mestres/vagas" replace />}
            />
            <Route
              path="/cadastros-apoio/crh"
              element={<Navigate to="/cadastros-mestres/configuracao-rh" replace />}
            />
            <Route
              path="/cadastros-apoio/care"
              element={<Navigate to="/cadastros-mestres/configuracao-rh" replace />}
            />

            {/* Cadastros de Apoio */}
            <Route path="/cadastros-apoio" element={<CadastrosApoio />} />
            <Route
              path="/cadastros-apoio/cargos"
              element={
                <RouteGuard menuKey="cargos">
                  <Cargos />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-apoio/funcoes"
              element={
                <RouteGuard menuKey="funcoes">
                  <Funcoes />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-apoio/etapas"
              element={
                <RouteGuard menuKey="etapas">
                  <Etapas />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-apoio/anos-series"
              element={
                <RouteGuard menuKey="anos_series">
                  <AnosSeries />
                </RouteGuard>
              }
            />

            {/* Submenus da Administração do Sistema */}
            <Route
              path="/administracao/usuarios"
              element={
                <RouteGuard menuKey="usuarios">
                  <Administracao />
                </RouteGuard>
              }
            />
            <Route
              path="/administracao/contas-email"
              element={
                <RouteGuard menuKey="contas_email">
                  <ContasEmail />
                </RouteGuard>
              }
            />
            <Route
              path="/administracao/auditoria"
              element={
                <RouteGuard menuKey="auditoria">
                  <Auditoria />
                </RouteGuard>
              }
            />
            {/* Rota legada /auditoria redirecionando para /administracao/auditoria */}
            <Route path="/auditoria" element={<Navigate to="/administracao/auditoria" replace />} />
            {/* Rota legada/atalho redirecionando para /administracao/usuarios */}
            <Route
              path="/administracao"
              element={<Navigate to="/administracao/usuarios" replace />}
            />
            <Route
              path="/administracao/permissoes"
              element={<Navigate to="/administracao/usuarios" replace />}
            />
          </Route>

          {/* Rota 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
