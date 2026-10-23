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

export const OPCOES_NIVEL_20H = [
  'Nível 1 (até 100 alunos)',
  'Nível 2 (101 a 250 alunos)',
  'Nível 3 (251 a 500 alunos)',
  'Nível 4 (501 a 750 alunos)',
  'Nível 5 (751 a 1.000 alunos)',
  'Nível 6 (1.001 a 1.250 alunos)',
  'Nível 7 (1.251 a 1.500 alunos)',
  'Nível 8 (mais de 1.500 alunos)',
] as const

export const OPCOES_NIVEL_40H = [
  'Até 100 alunos',
  '101 a 200 alunos',
  'Mais de 200 alunos',
] as const

export const MAPA_LEGADO_NIVEL: Record<string, string> = {
  // Variações e formatos legados para Ensino Fundamental e Educação Infantil (20h)
  'Nível 1 (até 100 alunos)': 'Nível 1 (até 100 alunos)',
  'Nível 1': 'Nível 1 (até 100 alunos)',
  'Nível I': 'Nível 1 (até 100 alunos)',
  'Nível I: Até 100 alunos': 'Nível 1 (até 100 alunos)',
  'Porte 1': 'Nível 1 (até 100 alunos)',
  'Nível 2 (101 a 250 alunos)': 'Nível 2 (101 a 250 alunos)',
  'Nível 2': 'Nível 2 (101 a 250 alunos)',
  'Nível II': 'Nível 2 (101 a 250 alunos)',
  'Nível II: De 101 a 150 alunos': 'Nível 2 (101 a 250 alunos)',
  'Porte 2': 'Nível 2 (101 a 250 alunos)',
  'Nível 3 (251 a 500 alunos)': 'Nível 3 (251 a 500 alunos)',
  'Nível 3': 'Nível 3 (251 a 500 alunos)',
  'Nível III': 'Nível 3 (251 a 500 alunos)',
  'Nível III: De 151 a 220 alunos': 'Nível 3 (251 a 500 alunos)',
  'Porte 3': 'Nível 3 (251 a 500 alunos)',
  'Nível 4 (501 a 750 alunos)': 'Nível 4 (501 a 750 alunos)',
  'Nível 4': 'Nível 4 (501 a 750 alunos)',
  'Nível IV': 'Nível 4 (501 a 750 alunos)',
  'Nível IV: De 221 a 320 alunos': 'Nível 4 (501 a 750 alunos)',
  'Porte 4': 'Nível 4 (501 a 750 alunos)',
  'Nível 5 (751 a 1.000 alunos)': 'Nível 5 (751 a 1.000 alunos)',
  'Nível 5': 'Nível 5 (751 a 1.000 alunos)',
  'Nível V': 'Nível V (751 a 1.000 alunos)',
  'Nível V: De 321 a 420 alunos': 'Nível 5 (751 a 1.000 alunos)',
  'Porte 5': 'Nível 5 (751 a 1.000 alunos)',
  'Nível 6 (1.001 a 1.250 alunos)': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível 6': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível VI': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível VI: De 421 a 500 alunos': 'Nível 6 (1.001 a 1.250 alunos)',
  'Porte 6': 'Nível 6 (1.001 a 1.250 alunos)',
  'Nível 7 (1.251 a 1.500 alunos)': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível 7': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível VII': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível VII: De 501 a 600 alunos': 'Nível 7 (1.251 a 1.500 alunos)',
  'Porte 7': 'Nível 7 (1.251 a 1.500 alunos)',
  'Nível 8 (mais de 1.500 alunos)': 'Nível 8 (mais de 1.500 alunos)',
  'Nível 8': 'Nível 8 (mais de 1.500 alunos)',
  'Nível VIII': 'Nível 8 (mais de 1.500 alunos)',
  'Nível VIII: Acima de 600 alunos': 'Nível 8 (mais de 1.500 alunos)',
  'Porte 8': 'Nível 8 (mais de 1.500 alunos)',

  // Variações e formatos legados para Educação Infantil (40h)
  'Até 100 alunos': 'Até 100 alunos',
  'Nível A': 'Até 100 alunos',
  'Nível A: Até 90 alunos': 'Até 100 alunos',
  'Faixa 1': 'Até 100 alunos',
  '101 a 200 alunos': '101 a 200 alunos',
  'Nível B': '101 a 200 alunos',
  'Nível B: De 91 a 140 alunos': '101 a 200 alunos',
  'Faixa 2': '101 a 200 alunos',
  'Mais de 200 alunos': 'Mais de 200 alunos',
  'Nível C': 'Mais de 200 alunos',
  'Nível C: Acima de 141 alunos': 'Mais de 200 alunos',
  'Faixa 3': 'Mais de 200 alunos',
}

export function normalizarNivelPorte(tipoAtendimento: string, nivelPorte: string): string {
  if (!nivelPorte) return ''
  const trimmed = nivelPorte.trim()
  if (tipoAtendimento === 'Ensino Fundamental e Educação Infantil (20h)') {
    if ((OPCOES_NIVEL_20H as readonly string[]).includes(trimmed)) return trimmed
    if (MAPA_LEGADO_NIVEL[trimmed]) return MAPA_LEGADO_NIVEL[trimmed]
    // Tenta encontrar por prefixo ou correspondência suave
    const match = OPCOES_NIVEL_20H.find((op) => op.toLowerCase().includes(trimmed.toLowerCase()))
    if (match) return match
  } else if (tipoAtendimento === 'Educação Infantil (40h)') {
    if ((OPCOES_NIVEL_40H as readonly string[]).includes(trimmed)) return trimmed
    if (MAPA_LEGADO_NIVEL[trimmed]) return MAPA_LEGADO_NIVEL[trimmed]
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
  | 'Versão de Configuração RH'
  | 'Tipos de Atendimento RH'
  | 'Níveis de Porte RH'
  | 'Regras de Nível RH'
  | 'Regras por Turmas RH'
  | 'Matriz Cargo x Função RH'
  | 'Cenário Escola RH'
  | 'Exceção de Vaga SEMED'
  | 'Vagas Geradas RH'
  | 'Usuários'
  | 'Contas de E-mail'
  | 'Permissões'
  | 'Autenticação'

export type SistemaMenuKey =
  | 'painel'
  | 'unidades_escolares'
  | 'turmas'
  | 'cargos'
  | 'funcoes'
  | 'etapas'
  | 'anos_series'
  | 'crh'
  | 'care'
  | 'rh_versoes'
  | 'rh_matriz'
  | 'rh_niveis_regras'
  | 'rh_regras_turmas'
  | 'rh_cenario_escola'
  | 'rh_painel_geral'
  | 'rh_vagas_itinerantes'
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
// MÓDULO: CONFIGURAÇÃO DE RECURSOS HUMANOS POR TIPO E NÍVEL
// ==========================================

export type StatusVersaoRH = 'RASCUNHO' | 'VIGENTE' | 'ARQUIVADA'

export interface RhVersaoConfiguracao {
  id: string
  codigo?: string
  ano_letivo: number
  descricao: string
  status: StatusVersaoRH
  criado_por: string
  created_at?: string
  updated_at?: string
}

export type ModalidadeExcluidaTipo = 'JORNADA_AMPLIADA' | 'EJA' | 'SALA_RECURSOS_MULTIFUNCIONAIS'

export interface RhTipoAtendimento {
  id: string
  codigo?: string
  versao_id: string
  nome: string
  criterio_porte: string // 'ALUNOS'
  created_at?: string
  updated_at?: string
  modalidades_excluidas?: ModalidadeExcluidaTipo[]
}

export interface RhNivel {
  id: string
  codigo?: string
  versao_id: string
  tipo_atendimento_id: string
  codigo_nivel: string // 'I', 'II', 'A', 'B'
  ordem: number
  min_alunos: number
  max_alunos: number | null // null = sem teto
  created_at?: string
  updated_at?: string
}

export type CondicaoCargoFuncao = 'NENHUMA' | 'READAPTADO_COMPATIVEL_LAUDO' | 'AUTORIZACAO_SEMED'

export interface RhCargoFuncao {
  id: string
  versao_id: string
  cargo_id: string
  funcao_id: string
  condicao: CondicaoCargoFuncao
  created_at?: string
  cargo?: Cargo
  funcao?: Funcao
}

export type BaseCalculoRegraNivel = 'FIXO_ESCOLA' | 'POR_TURNO' | 'POR_TURMA' | 'POR_TURMA_ETAPA'

export type ModalidadeVaga = 'FIXO' | 'ITINERANTE'

export interface RhRegraNivel {
  id: string
  codigo?: string
  nivel_id: string
  funcao_id: string
  quantidade: number
  base_calculo: BaseCalculoRegraNivel
  modalidade: ModalidadeVaga
  dias_semana?: number | null // nullable (ex: 2 para 2x/semana)
  etapas_filtro?: string[] | null // ["INFANTIL", "INFANTIL_I", "INFANTIL_II"]
  observacao?: string | null
  created_at?: string
  updated_at?: string
  funcao?: Funcao
}

export interface RhRegraPorTurmas {
  id: string
  codigo?: string
  versao_id: string
  funcao_id: string
  tipo_atendimento_id?: string | null // null = todos
  min_turmas: number
  max_turmas?: number | null
  qtd_fixo: number
  qtd_itinerante: number
  created_at?: string
  updated_at?: string
  funcao?: Funcao
  tipo_atendimento?: RhTipoAtendimento | null
}

export interface RhAlunosPorModalidade {
  jornada_ampliada: number
  eja: number
  srm: number
}

export interface RhEscolaAnoLetivo {
  id: string
  codigo?: string
  escola_id: string
  ano_letivo: number
  tipo_atendimento_id?: string | null
  alunos_total: number
  alunos_por_modalidade: RhAlunosPorModalidade
  turnos: string[] // ex: ["MATUTINO", "VESPERTINO"]
  metragem_m2?: number | null
  nivel_calculado_id?: string | null
  nivel_override_id?: string | null
  justificativa_override?: string | null
  versao_id?: string | null
  created_at?: string
  updated_at?: string
  escola?: UnidadeEscolar
  nivel_calculado?: RhNivel
  nivel_override?: RhNivel
  tipo_atendimento?: RhTipoAtendimento
}

export interface RhExcecaoVaga {
  id: string
  codigo?: string
  escola_ano_id: string
  funcao_id: string
  delta: number // +1, -1, etc
  justificativa: string
  autorizado_por: string
  data: string
  created_at?: string
  updated_at?: string
  funcao?: Funcao
}

export type OrigemVaga = 'REGRA_NIVEL' | 'REGRA_TURMAS' | 'EXCECAO_MANUAL'
export type StatusVaga = 'ABERTA' | 'OCUPADA' | 'BLOQUEADA' | 'EXCEDENTE'

export interface RhVaga {
  id: string
  codigo?: string
  escola_ano_id: string
  versao_id?: string | null
  funcao_id: string
  turno?: string | null
  modalidade: ModalidadeVaga
  dias_semana?: number | null
  origem: OrigemVaga
  regra_origem_id?: string | null
  status: StatusVaga
  servidor_id?: string | null
  sequencial: number
  observacao?: string | null
  created_at?: string
  updated_at?: string
  funcao?: Funcao
  servidor?: RhServidor | null
}

export interface RhServidor {
  id: string
  codigo?: string
  nome: string
  cpf?: string | null
  matricula?: string | null
  cargo_id?: string | null
  readaptado?: boolean
  laudo_compatibilidade?: string | null
  ativo?: boolean
  cargo?: Cargo
}

export interface RhLotacao {
  id: string
  codigo?: string
  servidor_id: string
  cargo_id: string
  escola_id: string
  funcao_id: string
  turno?: string | null
  readaptado?: boolean
  vigencia?: string
  created_at?: string
  updated_at?: string
  servidor?: RhServidor
  cargo?: Cargo
  funcao?: Funcao
}
