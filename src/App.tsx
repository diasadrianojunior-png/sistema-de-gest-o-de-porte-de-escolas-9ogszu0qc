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
import Crh from './pages/Crh'
import Care from './pages/Care'
import RhVersoesPage from './pages/rh/RhVersoes'
import RhMatrizPage from './pages/rh/RhMatriz'
import RhNiveisRegrasPage from './pages/rh/RhNiveisRegras'
import RhRegrasTurmasPage from './pages/rh/RhRegrasTurmas'
import RhEscolaAnoPage from './pages/rh/RhEscolaAno'
import RhPainelGeralPage from './pages/rh/RhPainelGeral'
import RhVagasItinerantesPage from './pages/rh/RhVagasItinerantes'
import CadastrosMestres from './pages/CadastrosMestres'
import Turmas from './pages/Turmas'
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
            <Route
              path="/cadastros-apoio/crh"
              element={
                <RouteGuard menuKey="crh">
                  <Crh />
                </RouteGuard>
              }
            />
            <Route
              path="/cadastros-apoio/care"
              element={
                <RouteGuard menuKey="care">
                  <Care />
                </RouteGuard>
              }
            />
            {/* Módulo: Configuração de Recursos Humanos por Tipo e Nível */}
            <Route
              path="/rh-porte/versoes"
              element={
                <RouteGuard menuKey="rh_versoes">
                  <RhVersoesPage />
                </RouteGuard>
              }
            />
            <Route
              path="/rh-porte/matriz"
              element={
                <RouteGuard menuKey="rh_matriz">
                  <RhMatrizPage />
                </RouteGuard>
              }
            />
            <Route
              path="/rh-porte/niveis-regras"
              element={
                <RouteGuard menuKey="rh_niveis_regras">
                  <RhNiveisRegrasPage />
                </RouteGuard>
              }
            />
            <Route
              path="/rh-porte/regras-turmas"
              element={
                <RouteGuard menuKey="rh_regras_turmas">
                  <RhRegrasTurmasPage />
                </RouteGuard>
              }
            />
            <Route
              path="/rh-porte/escola-ano"
              element={
                <RouteGuard menuKey="rh_cenario_escola">
                  <RhEscolaAnoPage />
                </RouteGuard>
              }
            />
            <Route
              path="/rh-porte/painel-geral"
              element={
                <RouteGuard menuKey="rh_painel_geral">
                  <RhPainelGeralPage />
                </RouteGuard>
              }
            />
            <Route
              path="/rh-porte/vagas-itinerantes"
              element={
                <RouteGuard menuKey="rh_vagas_itinerantes">
                  <RhVagasItinerantesPage />
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
            {/* Rota legada/atalho redirecionando para /administracao/usuarios */}
            <Route
              path="/administracao"
              element={<Navigate to="/administracao/usuarios" replace />}
            />
            <Route
              path="/administracao/permissoes"
              element={<Navigate to="/administracao/usuarios" replace />}
            />
            <Route
              path="/auditoria"
              element={
                <RouteGuard menuKey="auditoria">
                  <Auditoria />
                </RouteGuard>
              }
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
