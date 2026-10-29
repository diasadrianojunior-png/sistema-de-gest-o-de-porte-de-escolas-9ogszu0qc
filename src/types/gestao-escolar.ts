export interface MunicipioRede {
  id: string
  codigo?: string
  nome: string
  uf: string
  esfera: string
  created_at?: string
  updated_at?: string
}

export interface TipoEscola {
  id: string
  codigo?: string
  nome: string
  descricao: string | null
  created_at?: string
  updated_at?: string
}

export interface Cargo {
  id: string
  codigo?: string
  nome: string
  carga_horaria?: string | null
  natureza?: string | null // 'EFETIVO' | 'TERCEIRIZADO'
  docente?: boolean | null
  ativo?: boolean | null
  created_at?: string
  updated_at?: string
}

export interface Funcao {
  id: string
  codigo?: string
  nome: string
  descricao?: string | null
  exige_autorizacao_semed?: boolean | null
  ativo?: boolean | null
  created_at?: string
  updated_at?: string
  cargos_vinculados?: Cargo[]
}

export interface FuncaoCargoVinculo {
  id: string
  funcao_id: string
  cargo_id: string
  created_at?: string
}

export interface Etapa {
  id: string
  codigo?: string
  nome: string
  ano_letivo: number
  created_at?: string
  updated_at?: string
}

export interface AnoSerie {
  id: string
  codigo?: string
  nome: string
  ano_letivo: number
  etapa_id?: string | null
  etapa?: Etapa | null
  created_at?: string
  updated_at?: string
}

export interface Turma {
  id: string
  codigo?: string
  nome: string
  unidade_escolar_id?: string | null
  etapa_id: string | null
  ano_letivo: number
  ano_serie_id: string | null
  created_at?: string
  updated_at?: string
  unidade_escolar?: UnidadeEscolar | null
  etapa?: Etapa | null
  ano_serie?: AnoSerie | null
}

export type TipoAtendimentoUnidade =
  | 'Ensino Fundamental e Educação Infantil (20h)'
  | 'Educação Infantil (40h)'

/**
 * Rótulos padrão oficiais das faixas de RH por tipo de atendimento (conforme anexo oficial)
 * Utilizados como fallback de compatibilidade caso a consulta ao banco esteja em andamento.
 */
export const OPCOES_NIVEL_20H = [
  'Nível I: Até 100 alunos',
  'Nível II: De 101 a 150 alunos',
  'Nível III: De 151 a 220 alunos',
  'Nível IV: De 221 a 320 alunos',
  'Nível V: De 321 a 420 alunos',
  'Nível VI: De 421 a 500 alunos',
  'Nível VII: De 501 a 600 alunos',
  'Nível VIII: Acima de 600 alunos',
] as const

export const OPCOES_NIVEL_40H = [
  'Nível A: Até 90 alunos',
  'Nível B: De 91 a 140 alunos',
  'Nível C: Acima de 140 alunos',
] as const

export const MAPA_LEGADO_NIVEL: Record<string, string> = {
  // Variações e formatos legados para Ensino Fundamental e Educação Infantil (20h)
  'Nível 1 (até 100 alunos)': 'Nível I: Até 100 alunos',
  'Nível 1': 'Nível I: Até 100 alunos',
  'Nível I': 'Nível I: Até 100 alunos',
  'Nível I: Até 100 alunos': 'Nível I: Até 100 alunos',
  'Porte 1': 'Nível I: Até 100 alunos',
  'Nível 2 (101 a 250 alunos)': 'Nível II: De 101 a 150 alunos',
  'Nível 2': 'Nível II: De 101 a 150 alunos',
  'Nível II': 'Nível II: De 101 a 150 alunos',
  'Nível II: De 101 a 150 alunos': 'Nível II: De 101 a 150 alunos',
  'Porte 2': 'Nível II: De 101 a 150 alunos',
  'Nível 3 (251 a 500 alunos)': 'Nível III: De 151 a 220 alunos',
  'Nível 3': 'Nível III: De 151 a 220 alunos',
  'Nível III': 'Nível III: De 151 a 220 alunos',
  'Nível III: De 151 a 220 alunos': 'Nível III: De 151 a 220 alunos',
  'Porte 3': 'Nível III: De 151 a 220 alunos',
  'Nível 4 (501 a 750 alunos)': 'Nível IV: De 221 a 320 alunos',
  'Nível 4': 'Nível IV: De 221 a 320 alunos',
  'Nível IV': 'Nível IV: De 221 a 320 alunos',
  'Nível IV: De 221 a 320 alunos': 'Nível IV: De 221 a 320 alunos',
  'Porte 4': 'Nível IV: De 221 a 320 alunos',
  'Nível 5 (751 a 1.000 alunos)': 'Nível V: De 321 a 420 alunos',
  'Nível 5': 'Nível V: De 321 a 420 alunos',
  'Nível V': 'Nível V: De 321 a 420 alunos',
  'Nível V: De 321 a 420 alunos': 'Nível V: De 321 a 420 alunos',
  'Porte 5': 'Nível V: De 321 a 420 alunos',
  'Nível 6 (1.001 a 1.250 alunos)': 'Nível VI: De 421 a 500 alunos',
  'Nível 6': 'Nível VI: De 421 a 500 alunos',
  'Nível VI': 'Nível VI: De 421 a 500 alunos',
  'Nível VI: De 421 a 500 alunos': 'Nível VI: De 421 a 500 alunos',
  'Porte 6': 'Nível VI: De 421 a 500 alunos',
  'Nível 7 (1.251 a 1.500 alunos)': 'Nível VII: De 501 a 600 alunos',
  'Nível 7': 'Nível VII: De 501 a 600 alunos',
  'Nível VII': 'Nível VII: De 501 a 600 alunos',
  'Nível VII: De 501 a 600 alunos': 'Nível VII: De 501 a 600 alunos',
  'Porte 7': 'Nível VII: De 501 a 600 alunos',
  'Nível 8 (mais de 1.500 alunos)': 'Nível VIII: Acima de 600 alunos',
  'Nível 8': 'Nível VIII: Acima de 600 alunos',
  'Nível VIII': 'Nível VIII: Acima de 600 alunos',
  'Nível VIII: Acima de 600 alunos': 'Nível VIII: Acima de 600 alunos',
  'Porte 8': 'Nível VIII: Acima de 600 alunos',

  // Variações e formatos legados para Educação Infantil (40h)
  'Até 100 alunos': 'Nível A: Até 90 alunos',
  'Nível A': 'Nível A: Até 90 alunos',
  'Nível A: Até 90 alunos': 'Nível A: Até 90 alunos',
  'Faixa 1': 'Nível A: Até 90 alunos',
  '101 a 200 alunos': 'Nível B: De 91 a 140 alunos',
  'Nível B': 'Nível B: De 91 a 140 alunos',
  'Nível B: De 91 a 140 alunos': 'Nível B: De 91 a 140 alunos',
  'Faixa 2': 'Nível B: De 91 a 140 alunos',
  'Mais de 200 alunos': 'Nível C: Acima de 140 alunos',
  'Nível C': 'Nível C: Acima de 140 alunos',
  'Nível C: Acima de 140 alunos': 'Nível C: Acima de 140 alunos',
  'Nível C: Acima de 141 alunos': 'Nível C: Acima de 140 alunos',
  'Faixa 3': 'Nível C: Acima de 140 alunos',
}

export function normalizarNivelPorte(tipoAtendimento: string, nivelPorte: string): string {
  if (!nivelPorte) return ''
  const trimmed = nivelPorte.trim()

  // Se já bate diretamente no mapa legado ou nas opções novas
  if (MAPA_LEGADO_NIVEL[trimmed]) return MAPA_LEGADO_NIVEL[trimmed]

  if (tipoAtendimento === 'Ensino Fundamental e Educação Infantil (20h)') {
    if ((OPCOES_NIVEL_20H as readonly string[]).includes(trimmed as any)) return trimmed
    const match = OPCOES_NIVEL_20H.find((op) => op.toLowerCase().includes(trimmed.toLowerCase()))
    if (match) return match
  } else if (tipoAtendimento === 'Educação Infantil (40h)') {
    if ((OPCOES_NIVEL_40H as readonly string[]).includes(trimmed as any)) return trimmed
    const match = OPCOES_NIVEL_40H.find((op) => op.toLowerCase().includes(trimmed.toLowerCase()))
    if (match) return match
  }
  return MAPA_LEGADO_NIVEL[trimmed] || trimmed
}

export interface UnidadeEscolar {
  id: string
  codigo?: string
  nome: string
  tipo_atendimento: TipoAtendimentoUnidade
  nivel_porte: string
  localizacao: string
  quantidade_alunos?: number | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  bairro?: string | null
  estado_uf?: string | null
  cidade?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at?: string
  updated_at?: string
}

// Compatibilidade transitória se necessário
export interface Escola {
  id: string
  codigo?: string
  nome: string
  endereco?: string
  numero_alunos?: number
  numero_servidores?: number
  municipio_id?: string | null
  tipo_escola_id?: string | null
  created_at?: string
  updated_at?: string
  municipio?: MunicipioRede | null
  tipo_escola?: TipoEscola | null
}

export type PerfilUsuario = 'Administrador' | 'Operador'
export type EstadoUsuario = 'Ativo' | 'Inativo'

export interface UsuarioSistema {
  id: string
  user_id?: string | null
  codigo?: string
  nome_completo: string
  email: string
  perfil: PerfilUsuario
  estado: EstadoUsuario
  created_at?: string
  updated_at?: string
}

export type AcaoAuditoria = 'Criação' | 'Edição' | 'Exclusão' | 'Login'

export type CriptografiaSmtp = 'TLS' | 'SSL' | 'NENHUMA'

export interface ContaEmail {
  id: string
  codigo?: string
  descricao: string
  ativa: boolean
  host: string
  porta: number
  criptografia: CriptografiaSmtp
  usuario_smtp: string
  email_from: string
  nome_from: string
  reply_to?: string | null
  limite_diario?: number | null
  created_at?: string
  updated_at?: string
}

export interface SalvarContaEmailInput {
  id?: string
  descricao: string
  ativa: boolean
  host: string
  porta: number
  criptografia: CriptografiaSmtp
  usuario_smtp: string
  senha_smtp?: string
  email_from: string
  nome_from: string
  reply_to?: string | null
  limite_diario?: number | null
}

export type EntidadeAuditoria =
  | 'Unidades escolares'
  | 'Turmas'
  | 'Municípios/Redes'
  | 'Tipos de escola'
  | 'Cargos'
  | 'Funções'
  | 'Etapas'
  | 'Ano/Série'
  | 'Configurações de RH (CRH)'
  | 'Cargos e Funções (CARE)'
  | 'Níveis de Porte'
  | 'Configuração RH'
  | 'Usuários'
  | 'Contas de E-mail'
  | 'Permissões'
  | 'Autenticação'

export type SistemaMenuKey =
  | 'painel'
  | 'unidades_escolares'
  | 'turmas'
  | 'profissionais'
  | 'porte_escola'
  | 'cargos'
  | 'funcoes'
  | 'etapas'
  | 'anos_series'
  | 'configuracao_rh'
  | 'vagas'
  | 'usuarios'
  | 'contas_email'
  | 'auditoria'

export interface NivelPorte {
  id: string
  codigo?: string
  tipo_atendimento: TipoAtendimentoUnidade | string
  nivel: string
  alunos_min: number
  alunos_max: number | null
  ordem: number
  descricao?: string | null
  created_at?: string
  updated_at?: string
}

export interface CrhConfiguracao {
  id: string
  codigo?: string
  ano_letivo: number
  unidade_escolar_id: string
  tipo_atendimento: TipoAtendimentoUnidade | string
  nivel_unidade: string
  cargo_id: string
  quantidade_profissionais: number
  por_turma: 'Sim' | 'Não'
  por_periodo: 'Sim' | 'Não'
  natureza_cargo: 'Fixo' | 'Itinerante'
  funcao_id: string
  quantidade_por_funcao: number
  created_at?: string
  updated_at?: string
  // Relações carregadas opcionalmente
  unidade_escolar?: UnidadeEscolar | null
  cargo?: Cargo | null
  funcao?: Funcao | null
}

export interface PermissaoPerfil {
  id: string
  codigo?: string
  perfil: PerfilUsuario
  menu_key: SistemaMenuKey
  menu_label: string
  pode_ver: boolean
  pode_editar: boolean
  suporta_edicao: boolean
  ordem: number
  created_at?: string
  updated_at?: string
}

export interface PermissaoUsuario {
  id: string
  codigo?: string
  usuario_id: string
  menu_key: SistemaMenuKey
  menu_label: string
  pode_ver: boolean
  pode_editar: boolean
  suporta_edicao: boolean
  ordem: number
  created_at?: string
  updated_at?: string
}

export type CareStatusVaga = 'Aberta' | 'Preenchida'

export interface CareVaga {
  id: string
  codigo?: string // VAG-0001
  unidade_escolar_id: string
  ano_letivo: number
  crh_configuracao_id: string
  crh_codigo?: string | null
  cargo_id: string
  funcao_id: string
  numero_sequencial_vaga: number
  quantidade_referencia: number
  criterio_dimensionamento: 'Por Unidade' | 'Por Turma' | 'Por Período' | string
  natureza_cargo: 'Fixo' | 'Itinerante' | string
  status: CareStatusVaga
  created_at?: string
  updated_at?: string
  // Relações carregadas opcionalmente
  unidade_escolar?: UnidadeEscolar | null
  cargo?: Cargo | null
  funcao?: Funcao | null
  crh_configuracao?: CrhConfiguracao | null
}

export interface RegistroAuditoria {
  id: string
  codigo?: string
  registro_codigo?: string | null
  entidade: EntidadeAuditoria | string
  acao: AcaoAuditoria | string
  descricao: string
  usuario_id?: string | null
  usuario_nome: string
  usuario_email: string
  detalhes?: Record<string, any> | null
  created_at: string
}

// ==========================================
// NOVO MÓDULO: CONFIGURAÇÃO DE RH POR NÍVEL (ETAPA 1)
// ==========================================

export type StatusConfiguracaoRh = 'RASCUNHO' | 'VIGENTE' | 'ARQUIVADA'

export type BaseCalculoRh = 'POR_ESCOLA' | 'POR_PERIODO' | 'POR_TURMA' | 'POR_TURMA_ETAPA'

export type ModalidadeRhVaga = 'FIXO' | 'ITINERANTE'

export type CondicaoLinhaCargo = 'NENHUMA' | 'READAPTADO_COMPATIVEL_LAUDO' | 'AUTORIZACAO_SEMED'

export type TipoLinhaRh = 'FUNCAO' | 'CARGO'

export interface ConfiguracaoRh {
  id: string
  codigo?: string // CRHN-0001
  tipo_atendimento: string
  ano_letivo: number
  status: StatusConfiguracaoRh
  observacao?: string | null
  created_at?: string
  updated_at?: string
}

export interface ConfiguracaoRhNivel {
  id: string
  codigo?: string // NIV-0001
  configuracao_rh_id: string
  codigo_nivel: string // I, II, A, B, etc.
  ordem: number
  min_alunos: number
  max_alunos: number | null // null = sem limite
  observacao?: string | null
  created_at?: string
  updated_at?: string
}

export interface ConfiguracaoRhLinhaCargo {
  id?: string
  linha_id?: string
  cargo_id: string
  condicao: CondicaoLinhaCargo
  created_at?: string
  cargo?: Cargo
}

export interface ConfiguracaoRhLinha {
  id: string
  codigo?: string // LNH-0001
  configuracao_rh_id: string
  tipo_linha?: TipoLinhaRh // 'FUNCAO' | 'CARGO'
  funcao_id?: string | null
  cargo_id?: string | null
  ordem: number
  base_calculo: BaseCalculoRh
  etapas_filtro?: string[] | null // ex: ["INFANTIL", "INFANTIL_I", "INFANTIL_II"]
  observacao?: string | null
  created_at?: string
  updated_at?: string
  funcao?: Funcao
  cargo?: Cargo
  cargos?: ConfiguracaoRhLinhaCargo[]
}

export interface ConfiguracaoRhVaga {
  id: string
  codigo?: string // VAG-0001
  linha_id: string
  nivel_id: string
  quantidade: number
  modalidade: ModalidadeRhVaga
  dias_semana?: number | null
  created_at?: string
  updated_at?: string
}

export interface ConfiguracaoRhCompleta extends ConfiguracaoRh {
  niveis: ConfiguracaoRhNivel[]
  linhas: ConfiguracaoRhLinha[]
  vagas: ConfiguracaoRhVaga[]
}

// ==========================================
// ETAPA 2: CADASTRO DE VAGAS E ESCOLA/ANO
// ==========================================

export type PeriodoEscola = 'MANHA' | 'TARDE' | 'INTEGRAL' | 'NOITE'

export type StatusVagaReal = 'ABERTA' | 'OCUPADA' | 'EXCEDENTE'

export interface TurmaPorEtapaItem {
  etapa: string
  quantidade: number
}

export interface UnidadeEscolarAno {
  id: string
  codigo?: string // UEA-0001
  unidade_escolar_id: string
  ano_letivo: number
  qtd_alunos: number
  qtd_turmas: number
  periodos: PeriodoEscola[]
  turmas_por_etapa?: Record<string, number> | TurmaPorEtapaItem[] | null
  nivel_calculado?: string | null
  configuracao_rh_id?: string | null
  data_ultima_geracao?: string | null
  observacao?: string | null
  created_at?: string
  updated_at?: string
  // Vínculos expandidos
  unidade_escolar?: UnidadeEscolar | null
  configuracao_rh?: ConfiguracaoRh | null
}

export interface VagaReal {
  id: string
  codigo?: string // VAGP-0001
  unidade_escolar_id: string
  ano_letivo: number
  configuracao_rh_id: string
  configuracao_rh_linha_id: string
  funcao: string
  numero_sequencial: number
  periodo?: PeriodoEscola | null
  turma_id?: string | null
  modalidade: ModalidadeRhVaga
  dias_semana?: number | null
  cargo_id?: string | null
  servidor_id?: string | null
  nome_ocupante?: string | null
  status: StatusVagaReal
  observacao?: string | null
  created_at?: string
  updated_at?: string
  // Vínculos expandidos
  unidade_escolar?: UnidadeEscolar | null
  cargo?: Cargo | null
  turma?: Turma | null
  configuracao_rh?: ConfiguracaoRh | null
  configuracao_rh_linha?: ConfiguracaoRhLinha | null
}

// ==========================================
// CADASTRO DE PROFISSIONAIS
// ==========================================

export interface ProfissionalVaga {
  id: string
  profissional_id: string
  vaga_id: string
  titular: boolean
  cargo_id?: string | null
  created_at?: string
  updated_at?: string
  // Relações expandidas
  vaga?: VagaReal | null
  cargo?: Cargo | null
}

export interface Profissional {
  id: string
  codigo?: string // PRO-0001
  nome: string
  unidade_escolar_id: string
  ativo: boolean
  created_at?: string
  updated_at?: string
  // Relações expandidas
  unidade_escolar?: UnidadeEscolar | null
  vagas_vinculadas?: ProfissionalVaga[]
}

// ==========================================
// PORTE DA ESCOLA POR ANO LETIVO
// ==========================================

export interface PorteEscolaAno {
  id: string
  codigo?: string // PRT-0001
  unidade_escolar_id: string
  ano_letivo: number
  quantidade_alunos: number
  nivel_faixa: string // ex: "Nível V: De 321 a 420 alunos" ou "Nível V"
  nivel_sugerido?: string | null // Nível calculado pela configuração de vagas
  justificativa_mudanca?: string | null
  created_at?: string
  updated_at?: string
  // Relações expandidas
  unidade_escolar?: UnidadeEscolar | null
}
