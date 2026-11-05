/**
 * Fonte única dos textos de ajuda ("Ajuda e Regras") de todos os módulos do sistema.
 * O botão/modal de cada tela e a Central de Ajuda leem o MESMO conteúdo daqui,
 * evitando duplicação de texto entre módulos.
 */
import { SistemaMenuKey } from '@/types/gestao-escolar'

export interface AjudaSecao {
  titulo: string
  itens: string[]
}

export interface AjudaModulo {
  menuKey: SistemaMenuKey
  titulo: string
  categoria: string
  path: string
  resumo: string
  secoes: AjudaSecao[]
}

/** Ordem/categorias espelham o Menu Principal (Painel → Apoio → Mestres → Administração → Central de Ajuda) */
export const CATEGORIAS_MENU = [
  'Painel de Início',
  'Cadastros de Apoio',
  'Cadastros Mestres',
  'Administração do Sistema',
  'Central de Ajuda',
] as const

export const AJUDAS_MODULOS: AjudaModulo[] = [
  {
    menuKey: 'painel',
    titulo: 'Painel de Início',
    categoria: 'Painel de Início',
    path: '/painel',
    resumo: 'Visão geral do sistema, com resumo dos cadastros e atalhos para os módulos.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Tela inicial do sistema, apresentada logo após o login.',
          'Exibe resumo das principais informações (unidades escolares, turmas, profissionais e vagas) e atalhos para os módulos.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Tela somente de leitura: nenhuma alteração de dados é feita aqui.',
          'Os atalhos respeitam as permissões do operador: módulos sem "Pode Ver" não são ofertados.',
        ],
      },
    ],
  },
  {
    menuKey: 'cargos',
    titulo: 'Cargos',
    categoria: 'Cadastros de Apoio',
    path: '/cadastros-apoio/cargos',
    resumo:
      'Cadastro dos cargos da rede municipal, utilizados por Funções, Configuração de RH e Vagas.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter os cargos da rede municipal de ensino (Cadastros de Apoio).',
          'O cargo é utilizado nos vínculos de Função x Cargo, nas linhas da Configuração de Vagas por Nível e no Cadastro de Vagas.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema na gravação (não é digitado).',
          'Nome do cargo: texto obrigatório, único no cadastro.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Cadastre o cargo antes de utilizá-lo em Funções ou na Configuração de Vagas por Nível.',
          'Atenção ao excluir: cargos em uso por funções, configurações de RH ou vagas impactam os registros vinculados.',
          'A exclusão pede confirmação ao operador.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Acesso controlado pela matriz de permissões (Pode Ver / Pode Editar): sem "Pode Editar" a tela abre somente para consulta.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'funcoes',
    titulo: 'Funções',
    categoria: 'Cadastros de Apoio',
    path: '/cadastros-apoio/funcoes',
    resumo: 'Cadastro das funções da rede e dos vínculos entre Função e Cargos.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter as funções da rede municipal e o vínculo de cada função com seus cargos.',
          'As funções alimentam o Cadastro de Profissionais e a Configuração de Vagas por Nível (linhas do tipo FUNCAO).',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema.',
          'Nome da função: texto obrigatório.',
          'Vínculo Função x Cargo: seleção dinâmica — apenas os cargos cadastrados no módulo Cargos são ofertados.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Dependência dinâmica: ao alterar os cargos cadastrados, a lista de opções deste cadastro se atualiza.',
          'Funções em uso por profissionais ou configurações de RH devem ser tratadas com cautela na exclusão.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'etapas',
    titulo: 'Etapas',
    categoria: 'Cadastros de Apoio',
    path: '/cadastros-apoio/etapas',
    resumo: 'Cadastro das etapas de ensino, base para Ano/Série, Turmas e Configuração de RH.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter as etapas de ensino atendidas pela rede (ex.: Educação Infantil, Ensino Fundamental).',
          'As etapas são filtradas/utilizadas em Ano/Série, Turmas, nas faixas por tipo de atendimento e nas linhas da Configuração de Vagas por Nível.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema.',
          'Descrição da etapa: texto obrigatório.',
          'Organização por ordem de exibição.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Etapas em uso por Ano/Série, Turmas ou Configuração de RH impactam os registros vinculados — verifique antes de excluir.',
          'Os filtros de etapa em outros módulos refletem o que está cadastrado aqui (dependência dinâmica).',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'anos_series',
    titulo: 'Ano/Série',
    categoria: 'Cadastros de Apoio',
    path: '/cadastros-apoio/anos-series',
    resumo: 'Cadastro dos anos/séries por etapa e ano letivo.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter os anos/séries do sistema, vinculados a uma etapa de ensino e a um ano letivo.',
          'Alimenta o cadastro de Turmas e os filtros de etapa nos demais módulos.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema.',
          'Etapa: seleção dinâmica — apenas as etapas cadastradas no módulo Etapas são ofertadas.',
          'Ano letivo e descrição do ano/série.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Ao mudar a etapa selecionada, a lista de opções compatíveis se atualiza (dependência dinâmica).',
          'Anos/séries vinculados a turmas não devem ser excluídos sem verificação dos vínculos.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'especializacoes',
    titulo: 'Especializações',
    categoria: 'Cadastros de Apoio',
    path: '/cadastros-apoio/especializacoes',
    resumo: 'Cadastro das especializações/especialidades dos profissionais.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter as especializações (especialidades) que podem ser vinculadas aos profissionais no Cadastro de Profissionais.',
          'Último item do grupo Cadastros de Apoio.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado por gatilho do banco de dados, no padrão ESP-XXXX.',
          'Descrição da especialização: texto obrigatório.',
          'Classificação da Especialidade: lista fixa de 5 opções (Graduação, Especialização, Mestrado, Doutorado e Pós-Doutorado), validada no formulário, no serviço e no banco de dados.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'A especialização é selecionada no Cadastro de Profissionais, no atributo "Especialidade(s) do Profissional" (relação de muitos para muitos).',
          'Exclusão direta com confirmação — enquanto nenhuma tabela referenciar especializações, não há bloqueio por vínculo.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'unidades_escolares',
    titulo: 'Unidades Escolares',
    categoria: 'Cadastros Mestres',
    path: '/cadastros-mestres',
    resumo: 'Cadastro mestre das unidades escolares da rede, com endereço e localização no mapa.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter o cadastro mestre das unidades escolares: identificação, endereço, localização no mapa, tipo de escola, município/rede e periods de funcionamento.',
          'É a base para Turmas, Profissionais, Porte da Escola, Configuração de Vagas por Nível e Cadastro de Vagas.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema.',
          'Nome, tipo de escola (seleção dinâmica a partir de Tipos de Escola), município/rede e situação.',
          'Seção de Localização da Unidade: endereço com busca de CEP (ViaCEP/BrasilAPI), geocodificação Google Maps e restrição ao município de Cambé/PR.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Somente endereços do município de Cambé são aceitos na localização da unidade.',
          'Unidades em uso por turmas, profissionais ou vagas impactam os registros vinculados.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'turmas',
    titulo: 'Turmas',
    categoria: 'Cadastros Mestres',
    path: '/cadastros-mestres/turmas',
    resumo: 'Cadastro das turmas por unidade escolar, ano letivo e ano/série.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter as turmas de cada unidade escolar por ano letivo.',
          'As turmas alimentam o cálculo de vagas da Configuração de Vagas por Nível (base "por turma").',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema.',
          'Unidade escolar, ano letivo, etapa e ano/série — seleções dinâmicas e encadeadas.',
          'Turno/período e quantidade de alunos.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Ao selecionar a etapa, a lista de anos/séries compatíveis se atualiza (dependência dinâmica).',
          'Turmas em uso na geração de vagas não devem ser excluídas sem verificação.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'profissionais',
    titulo: 'Profissionais',
    categoria: 'Cadastros Mestres',
    path: '/cadastros-mestres/profissionais',
    resumo: 'Cadastro dos profissionais da rede, com classe, especialidades e vínculos de vaga.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter os profissionais da rede municipal, sua unidade escolar, classe e vínculos com vagas.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema (padrão PRO-XXXX).',
          'Nome, unidade escolar (seleção dinâmica), situação (ativo/inativo), data de admissão e data de nascimento.',
          'E-mail do Profissional: campo OPCIONAL, posicionado imediatamente abaixo do Nome do Profissional. Quando preenchido, o formato do e-mail é validado (ex.: nome@dominio.com) e o salvamento é bloqueado com aviso amigável se estiver inválido. Exibido na listagem, no detalhe do profissional e na exportação (Excel/CSV).',
          'Classe Profissional: "Antigos na Rede" ou "Novos na Rede".',
          'Classificação no Concurso: texto livre, posicionado logo após a Classe Profissional; obrigatório somente quando a classe for "Novos na Rede" (validação na página e no serviço).',
          'Especialidade(s) do Profissional: relação com o cadastro de Especializações (múltipla seleção).',
          'Card "Inscrição no Processo Seletivo" (último card do formulário, opcional): lista repetível em que cada linha tem o Ano Letivo (combobox padrão 2020–2040, o mesmo usado em Turmas e Etapas) e o seletor "Inscrito no Processo Seletivo" com as opções Sim e Não.',
          'Use "Adicionar Ano Letivo" para incluir uma linha e o ícone de lixeira para removê-la. Cada ano aparece uma única vez: anos já usados em outra linha não são oferecidos no combobox.',
          'O detalhe do profissional exibe as inscrições por ano como etiquetas "Ano XXXX: Sim" ou "Ano XXXX: Não".',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'O vínculo do profissional com a vaga é titular ou não; o tipo de vínculo (CARGO/FUNCAO) é derivado da linha da Configuração de RH que gerou a vaga.',
          'Vínculos do tipo FUNCAO são sempre gravados como não titulares.',
          'A classe pode ser calculada automaticamente a partir da data de admissão (calcularClasseProfissional).',
          'E-mail do Profissional é opcional; quando informado, o formato é validado e o valor é registrado na auditoria (valores antigos → novos) em inclusões e alterações.',
          'Inscrições no Processo Seletivo: o mesmo Ano Letivo não pode se repetir no mesmo profissional; ao salvar, as inscrições anteriores são substituídas pelas informadas no formulário.',
          'Salvar o profissional sem nenhuma linha de inscrição é permitido.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'porte_escola',
    titulo: 'Porte da Escola por Ano Letivo',
    categoria: 'Cadastros Mestres',
    path: '/cadastros-mestres/porte-escola',
    resumo:
      'Classificação do porte (nível) de cada unidade por ano letivo, com sugestão calculada.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Registrar, para cada unidade escolar e ano letivo, a quantidade de alunos e o nível de porte (faixa) da escola.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema (padrão PRT-XXXX).',
          'Unidade escolar e ano letivo (seleções dinâmicas).',
          'Quantidade de alunos, nível/faixa do porte e justificativa de mudança.',
          'Nível sugerido: calculado pelo sistema a partir da configuração de vagas vigente (faixas por tipo de atendimento), podendo ser aceito ou ajustado manualmente com justificativa.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'O mesmo par unidade + ano letivo não pode ser cadastrado em duplicidade.',
          'A faixa do nível é formatada a partir das faixas de alunos configuradas por tipo de atendimento.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Inclusões, alterações e exclusões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'configuracao_rh',
    titulo: 'Configuração de Vagas por Nível',
    categoria: 'Cadastros Mestres',
    path: '/cadastros-mestres/configuracao-rh',
    resumo: 'Configuração dos níveis (faixas de alunos), linhas de função/cargo e vagas por nível.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Definir, por ano letivo e tipo de atendimento, os níveis de porte (faixas de quantidade de alunos) e as linhas de geração de vagas.',
        ],
      },
      {
        titulo: 'Atributos e estrutura',
        itens: [
          'Cabeçalho da configuração: tipo de atendimento, ano letivo, status (RASCUNHO, VIGENTE ou ARQUIVADO) e observação.',
          'Níveis: código do nível, ordem, faixa de alunos (mínimo e máximo) e observação — validação de contiguidade entre faixas.',
          'Linhas: tipo FUNCAO ou CARGO, base de cálculo (por escola, por período, por turma ou por turma/etapa), filtro de etapas, quantidade e modalidade (FIXO/ITINERANTE).',
          'Linhas do tipo CARGO admitem múltiplos cargos vinculados, inclusive com condição especial (readaptado compatível com laudo / autorização SEMED).',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Cálculo e prévia da geração executados em memória antes da gravação (validarContiguidadeNiveis / calcularVagasPorNivel).',
          'Somente uma configuração VIGENTE por tipo de atendimento/ano é considerada na geração de vagas.',
          'Duplicação de configuração disponível para facilitar novos anos letivos.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar pela matriz de permissões.',
          'Criação, alteração de status, duplicação e exclusão são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'vagas',
    titulo: 'Cadastro de Vagas',
    categoria: 'Cadastros Mestres',
    path: '/cadastros-mestres/vagas',
    resumo: 'Geração e gestão das vagas por unidade escolar e ano letivo.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Gerar, consultar e gerenciar as vagas das unidades escolares por ano letivo, mantendo a integridade com os cadastros de Cargos, Funções, Unidades e Profissionais.',
        ],
      },
      {
        titulo: 'Atributos e Ordem no Formulário',
        itens: [
          '1. "Identificação": código gerado automaticamente pelo sistema (ex.: VAG-0001 / VAGP-0001), somente leitura.',
          '2. "Ano Letivo": obrigatório, padrão do sistema com seleção de 2020 a 2040.',
          '3. "Unidade Escolar": obrigatória, vinculada ao Cadastro de Unidades Escolares com integridade referencial.',
          '4. "Tipo da Vaga (Cargo ou Função)": pergunta se a vaga é de Cargo ou de Função.',
          '5. "Cargo da Vaga" ou "Função da Vaga": dependência dinâmica estrita — ao selecionar "Cargo", solicita obrigatoriamente o Cargo vinculado ao Cadastro de Cargos; ao selecionar "Função", solicita a Função vinculada ao Cadastro de Funções. A troca limpa o campo anterior.',
          '6. "Período": obrigatório, com as opções: Geral / Sem Período, Manhã, Tarde, Integral e Noite.',
          '7. "Modalidade": obrigatória, com as opções Fixo e Itinerante (para itinerante, permite informar a quantidade de dias na semana).',
          '8. "Status da Vaga do Ocupante": opcional, com as opções "Aberta" e "Preenchida".',
          '9. "Profissional Titular": opcional, vinculado ao Cadastro de Profissionais mantendo a integridade referencial.',
          '10. "Profissional Ocupante": opcional, vinculado ao Cadastro de Profissionais, sendo permitido que o mesmo profissional seja titular e ocupante da mesma vaga.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Dependência dinâmica obrigatória: alternar entre Cargo e Função esconde o campo incompatível e limpa a seleção anterior para evitar vínculos cruzados.',
          'Identificação gerada automaticamente e preservada na edição.',
          'Profissional Titular e Ocupante podem ser o mesmo profissional sem qualquer restrição.',
          'Inserção manual marca a vaga com o atributo "Vaga Excedente: Sim"; vagas originadas da geração automática têm "Vaga Excedente: Não".',
          'Geração automática de vagas simples e por migração de ano letivo disponíveis com prévia e confirmação.',
          'Registros legados permanecem compatíveis, visíveis e editáveis.',
          'Exportação completa para Excel (CSV UTF-8) e PDF para impressão.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Pode Ver / Pode Editar controlados pela matriz de permissões do operador.',
          'Todas as criações, edições, exclusões manuais e migrações registram auditoria detalhada com usuário, data/hora e valores antigos e novos.',
        ],
      },
    ],
  },
  {
    menuKey: 'usuarios',
    titulo: 'Usuários',
    categoria: 'Administração do Sistema',
    path: '/administracao/usuarios',
    resumo: 'Gestão dos operadores do sistema, com perfil, estado e permissões individuais.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Cadastrar e manter os operadores do sistema (Administrador e Operador), incluindo estado (ativo/inativo) e permissões de acesso.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema (padrão USR-XXXX).',
          'Nome completo, e-mail (usado como login) e perfil de acesso.',
          'Matriz de permissões por operador: Pode Ver / Pode Editar para cada menu do sistema.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'O convite/confirmação é enviado por e-mail; é possível reenviar a confirmação de cadastro.',
          'A edição das permissões grava as linhas individualmente (upsert por usuário + menu) e registra as mudanças na Auditoria.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Módulo exclusivo do perfil Administrador.',
          'Criações, alterações e exclusões de usuários e permissões são registradas na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'contas_email',
    titulo: 'Contas de E-mail',
    categoria: 'Administração do Sistema',
    path: '/administracao/contas-email',
    resumo: 'Contas SMTP utilizadas pelo sistema para envio de e-mails.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Manter as contas de e-mail (SMTP) usadas pelo sistema, por exemplo no envio de recuperação de senha.',
        ],
      },
      {
        titulo: 'Atributos',
        itens: [
          'Identificador do registro: gerado automaticamente pelo sistema.',
          'Descrição/nome da conta, servidor SMTP, porta, usuário, senha e remetente (nome e endereço).',
          'Limite diário de envios e flag de reply-to opcional.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'O botão de teste dispara um envio real de e-mail para validar a configuração da conta.',
          'Somente uma conta deve permanecer marcada como ativa para uso do sistema.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Módulo administrativo — acesso controlado pela matriz de permissões.',
          'Inclusões, alterações, exclusões e testes são registrados na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'auditoria',
    titulo: 'Auditoria',
    categoria: 'Administração do Sistema',
    path: '/administracao/auditoria',
    resumo: 'Registro cronológico das ações dos usuários em todos os módulos.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Registrar e consultar o histórico de ações do sistema: criações, edições e exclusões feitas nos módulos.',
        ],
      },
      {
        titulo: 'Atributos do registro',
        itens: [
          'Identificador do registro, entidade afetada, ação (Criação/Edição/Exclusão) e descrição textual da mudança.',
          'Usuário responsável (nome e e-mail), data/hora e detalhes estruturados (JSON) com os valores envolvidos.',
        ],
      },
      {
        titulo: 'Regras e dependências',
        itens: [
          'Tela somente de consulta: nenhum registro pode ser criado ou alterado manualmente aqui.',
          'Filtros disponíveis por entidade, ação, usuário e período, com paginação da listagem.',
          'Todos os módulos que alteram dados gravam automaticamente seus registros de auditoria.',
        ],
      },
      {
        titulo: 'Permissões',
        itens: ['Acesso controlado pela matriz de permissões (Pode Ver); não suporta edição.'],
      },
    ],
  },
  {
    menuKey: 'limpeza_banco',
    titulo: 'Rotina de Limpeza do Banco de Dados',
    categoria: 'Administração do Sistema',
    path: '/administracao/limpeza-banco',
    resumo: 'Limpeza seletiva dos dados de cada módulo, com exceções preservadas.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Permitir a limpeza controlada dos dados de cada módulo do banco de dados, por exemplo para reiniciar um ano letivo.',
        ],
      },
      {
        titulo: 'Regras',
        itens: [
          'Seleção por módulo, com contagem de registros antes da limpeza (estatísticas do banco).',
          'Exceções preservadas: alguns registros-base não são apagados (ex.: configurações essenciais e usuários).',
          'Confirmação em duas etapas, com tela explicativa do que será apagado antes da execução definitiva.',
          'A operação é irreversível — os dados apagados não são recuperados.',
        ],
      },
      {
        titulo: 'Permissões e auditoria',
        itens: [
          'Módulo administrativo — acesso controlado pela matriz de permissões.',
          'Cada execução de limpeza é registrada na Auditoria.',
        ],
      },
    ],
  },
  {
    menuKey: 'central_ajuda',
    titulo: 'Central de Ajuda',
    categoria: 'Central de Ajuda',
    path: '/central-ajuda',
    resumo: 'Reúne, em um único lugar, a ajuda de todos os módulos do sistema.',
    secoes: [
      {
        titulo: 'Objetivo',
        itens: [
          'Apresentar as ajuda e regras de todos os módulos do sistema, organizadas pelos grupos do Menu Principal.',
          'A mesma fonte de texto alimenta o botão "Ajuda e Regras" de cada tela — o conteúdo aqui é sempre o mesmo exibido nos módulos.',
        ],
      },
      {
        titulo: 'Como usar',
        itens: [
          'Use o campo de busca para localizar um módulo por nome ou palavra-chave.',
          'Use o índice lateral para ir direto à ajuda de um módulo.',
          'Botão "Voltar ao Sistema" no cabeçalho da tela (com ícone de seta de retorno): volta para a tela de onde o usuário veio; se a Central foi aberta diretamente (sem histórico de navegação), volta ao Painel de Início.',
          'Tela somente de consulta: não altera dados.',
        ],
      },
      {
        titulo: 'Impressão',
        itens: [
          'Botão "Imprimir" no cabeçalho da tela, ao lado do campo de busca, no mesmo padrão visual dos demais botões de cabeçalho (com ícone de impressora).',
          'Antes de imprimir, um diálogo permite escolher o escopo: "Todos os módulos" (Central de Ajuda completa) ou "Apenas este módulo" (somente a ajuda do módulo selecionado no índice lateral).',
          'Quando nenhum módulo está selecionado no índice, a opção "Apenas este módulo" fica desabilitada e o escopo inicial é "Todos os módulos".',
          'A impressão abre a janela de impressão do navegador (Ctrl+P) com o conteúdo já formatado para papel: fundo branco e texto escuro, independentemente do tema claro/escuro da tela.',
          'A versão impressa omite o menu lateral, a barra superior e os controles de navegação; cada módulo inicia em uma nova página (quebra entre módulos) e os blocos de conteúdo são exibidos de forma neutra e legível.',
          'Cada acionamento da impressão é registrado na Auditoria: quem imprimiu, quando e qual o escopo (todos os módulos ou um módulo específico).',
        ],
      },
      {
        titulo: 'Permissões',
        itens: ['Acesso liberado a todos os operadores com "Pode Ver" na matriz de permissões.'],
      },
    ],
  },
]

export const getAjudaPorMenuKey = (menuKey: SistemaMenuKey): AjudaModulo | null =>
  AJUDAS_MODULOS.find((a) => a.menuKey === menuKey) ?? null

export const getAjudasPorCategoria = (): Array<{ categoria: string; modulos: AjudaModulo[] }> =>
  CATEGORIAS_MENU.map((categoria) => ({
    categoria,
    modulos: AJUDAS_MODULOS.filter((a) => a.categoria === categoria),
  })).filter((g) => g.modulos.length > 0)
