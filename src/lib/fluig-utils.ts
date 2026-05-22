// Utilitários compartilhados para lógica de Fluig

// ============================================================
// MAPA DE LOCALIZAÇÃO → ETAPA
// ============================================================

// Mapa: localização → etapa numérica (para determinar aprovações reais)
// Facilities = Nível 1, Financeiro = Nível 2, Diretoria = Nível 3
export const LOCALIZACAO_TO_ETAPA: Record<string, number> = {
  'Início': 0,
  // Nível 1 - Facilities
  'Para o Papel Gestor Condominio': 1,
  'Para o Papel Gestor Condomínio': 1,
  'Aprovação Nivel 1': 1,
  'Aprovação Nível 1': 1,
  // Nível 2 - Financeiro (Facilities já aprovou)
  'Aprovação Financeiro': 2,
  'Para o Papel Gerente Financeiro': 2,
  'Aprovação Nivel 2': 2,
  'Aprovação Nível 2': 2,
  // Nível 3 - Diretoria (Financeiro já aprovou)
  'Aprovação Diretoria': 3,
  'Aprovação Nivel 3': 3,
  'Aprovação Nível 3': 3,
  // Concluído (Diretoria já aprovou)
  'Emitir Solicitação': 4,
  'Emitir Solicitacao': 4,
};

// Mapa: etapa numérica → nome do departamento (para exibição)
export function mapEtapaToDepartamento(etapa: number): string {
  switch (etapa) {
    case 0: return 'Início';
    case 1: return 'Gerência de Facilities';
    case 2: return 'Gerência Financeira';
    case 3: return 'Diretoria';
    case 4: return 'Emissão';
    default: return 'Desconhecido';
  }
}

// ============================================================
// MAPA UNIFICADO DE PESSOAS → DEPARTAMENTOS
// Substitui RESPONSAVEL_LABELS, RESPONSAVEL_PROXIMA_ETAPA, 
// RESPONSAVEL_ETAPA_INDEX, ETAPA_LABELS de vários arquivos
// ============================================================

export const RESPONSAVEL_TO_DEPARTAMENTO: Record<string, string> = {
  // Início
  'Laureane Bransin': 'Início',
  'Paloma Correa Grigoletto': 'Início',
  'Roberta Gonçalves Pires da Costa': 'Início',
  // Gerência de Facilities
  'Jonatas Augusto Ferreira': 'Gerência de Facilities',
  // Gerência Financeira
  'Kethli Pereira Bezerra': 'Gerência Financeira',
  // Diretoria
  'Thiago Demeterco Lucchesi': 'Diretoria',
};

// Mapa de primeiro nome → departamento (para matching parcial)
const PRIMEIRO_NOME_TO_DEPARTAMENTO: Record<string, string> = {
  'laureane': 'Início',
  'paloma': 'Início',
  'roberta': 'Início',
  'jonatas': 'Gerência de Facilities',
  'kethli': 'Gerência Financeira',
  'thiago': 'Diretoria',
};

// Mapa de papéis do Fluig → departamento
const PAPEL_TO_DEPARTAMENTO: Record<string, string> = {
  'Para o Papel Gestor Condominio': 'Gerência de Facilities',
  'Para o Papel Gestor Condomínio': 'Gerência de Facilities',
  'Gestor Condominio': 'Gerência de Facilities',
  'Gestor Condomínio': 'Gerência de Facilities',
  'Para o Papel Gerente Financeiro': 'Gerência Financeira',
  'Para o Papel Diretor': 'Diretoria',
};

// Mapa de departamento → etapa numérica
const DEPARTAMENTO_TO_ETAPA: Record<string, number> = {
  'Início': -1,
  'Gerência de Facilities': 0,
  'Gerência Financeira': 1,
  'Diretoria': 2,
};

// Mapa de departamento → próxima etapa
const DEPARTAMENTO_TO_PROXIMA: Record<string, string> = {
  'Início': 'Gerência de Facilities',
  'Gerência de Facilities': 'Gerência Financeira',
  'Gerência Financeira': 'Diretoria',
  'Diretoria': 'Conclusão',
};

// Pessoas do "Início" - quando responsável muda para uma delas, significa retorno para correção
export const PESSOAS_INICIO = [
  'Laureane Bransin',
  'Paloma Correa Grigoletto',
  'Roberta Gonçalves Pires da Costa',
];

// Verifica se o novo responsável é uma pessoa do Início (retorno para correção)
export function isRetornoParaCorrecao(novoResponsavel: string | null): boolean {
  if (!novoResponsavel) return false;
  return PESSOAS_INICIO.some(nome => novoResponsavel.includes(nome));
}

// ============================================================
// FUNÇÕES CENTRALIZADAS DE STATUS FLUIG
// ============================================================

// Tipo genérico para snapshot (aceita tanto Row do Supabase quanto o tipo do hook)
interface FluigSnapshotLike {
  valor?: number | null;
  situacao?: string | null;
  localizacao?: string | null;
  responsavel_atual?: string | null;
  gerencia_conclusao?: string | null;
  gerencia_facilities_conclusao?: string | null;
  gerencia_facilities_responsavel?: string | null;
  gerencia_responsavel?: string | null;
  gerencia_financeiro_conclusao?: string | null;
  gerencia_financeiro_responsavel?: string | null;
  diretoria_conclusao?: string | null;
  diretoria_responsavel?: string | null;
  data_fim?: string | null;
}

/**
 * Regra de negócio: valor <= 2500 não precisa de Diretoria.
 * Fecha quando Financeiro aprova. valor > 2500 precisa de Diretoria.
 */
export function isFluigFechado(snapshot: FluigSnapshotLike): boolean {
  if (!snapshot.valor) return false;
  if (snapshot.valor <= 2500) {
    return !!snapshot.gerencia_financeiro_conclusao;
  }
  return !!snapshot.diretoria_conclusao;
}

/**
 * Verifica se a solicitação foi cancelada
 */
export function isFluigCancelado(snapshot: FluigSnapshotLike): boolean {
  const sit = snapshot.situacao?.toLowerCase() || '';
  return sit === 'cancelado' || sit === 'cancelada';
}

/**
 * Retorna a data de conclusão final do snapshot
 */
export function getDataConclusaoFluig(snapshot: FluigSnapshotLike): Date | null {
  if (!isFluigFechado(snapshot)) return null;
  if (snapshot.valor != null && snapshot.valor <= 2500 && snapshot.gerencia_financeiro_conclusao) {
    return new Date(snapshot.gerencia_financeiro_conclusao);
  }
  if (snapshot.diretoria_conclusao) return new Date(snapshot.diretoria_conclusao);
  if (snapshot.gerencia_financeiro_conclusao) return new Date(snapshot.gerencia_financeiro_conclusao);
  return null;
}

export type FluigApprovalStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'not_required';

export interface FluigApprovalResult {
  facilities: FluigApprovalStatus;
  facilitiesResponsavel: string | null;
  facilitiesConclusao: string | null;
  financeiro: FluigApprovalStatus;
  financeiroResponsavel: string | null;
  financeiroConclusao: string | null;
  diretoria: FluigApprovalStatus;
  diretoriaResponsavel: string | null;
  diretoriaConclusao: string | null;
}

/**
 * Status unificado de aprovação para cada etapa, considerando localização + valor.
 * Fonte de verdade: LOCALIZACAO_TO_ETAPA para determinar o estágio atual.
 */
export function getFluigApprovalStatus(snapshot: FluigSnapshotLike): FluigApprovalResult {
  // Se está fechado, todas as etapas necessárias são approved
  if (isFluigFechado(snapshot)) {
    const facilitiesResponsavel = (snapshot.gerencia_facilities_responsavel && snapshot.gerencia_facilities_responsavel !== 'System:Auto')
      ? snapshot.gerencia_facilities_responsavel
      : snapshot.gerencia_responsavel || null;
    return {
      facilities: 'approved',
      facilitiesResponsavel,
      facilitiesConclusao: snapshot.gerencia_facilities_conclusao || snapshot.gerencia_conclusao || null,
      financeiro: 'approved',
      financeiroResponsavel: snapshot.gerencia_financeiro_responsavel || null,
      financeiroConclusao: snapshot.gerencia_financeiro_conclusao || null,
      diretoria: (snapshot.valor != null && snapshot.valor <= 2500) ? 'not_required' : 'approved',
      diretoriaResponsavel: snapshot.diretoria_responsavel || null,
      diretoriaConclusao: snapshot.diretoria_conclusao || null,
    };
  }

  const currentStage = LOCALIZACAO_TO_ETAPA[snapshot.localizacao || ''] ?? 0;
  
  // Facilities: usa gerencia_facilities se disponível, senão gerencia
  const facilitiesResponsavel = (snapshot.gerencia_facilities_responsavel && snapshot.gerencia_facilities_responsavel !== 'System:Auto')
    ? snapshot.gerencia_facilities_responsavel
    : snapshot.gerencia_responsavel || null;
  const facilitiesConclusao = snapshot.gerencia_facilities_conclusao || snapshot.gerencia_conclusao || null;
  
  const financeiroResponsavel = snapshot.gerencia_financeiro_responsavel || null;
  const financeiroConclusao = snapshot.gerencia_financeiro_conclusao || null;
  
  const diretoriaResponsavel = snapshot.diretoria_responsavel || null;
  const diretoriaConclusao = snapshot.diretoria_conclusao || null;

  // Determinar status de Facilities
  let facilities: FluigApprovalStatus;
  if (currentStage >= 2) {
    // Já passou de Facilities
    facilities = 'approved';
  } else if (currentStage === 1) {
    // Está com Facilities agora
    if (facilitiesConclusao) {
      // Tem conclusão mas voltou para Facilities = re-aprovação pendente
      facilities = 'in_progress';
    } else {
      facilities = 'in_progress';
    }
  } else {
    // Está no Início (stage 0)
    if (facilitiesConclusao) {
      // Facilities já atuou mas voltou ao Início = rejeitado/devolvido
      facilities = 'rejected';
    } else {
      facilities = 'pending';
    }
  }

  // Determinar status de Financeiro
  let financeiro: FluigApprovalStatus;
  if (currentStage >= 3) {
    // Já passou de Financeiro
    financeiro = 'approved';
  } else if (currentStage === 2) {
    // Está com Financeiro
    if (financeiroConclusao) {
      financeiro = 'in_progress'; // Re-aprovação
    } else {
      financeiro = 'in_progress';
    }
  } else {
    // Antes de Financeiro
    if (financeiroConclusao && currentStage < 2) {
      // Financeiro atuou mas voltou para antes dele = rejeitado/devolvido
      financeiro = 'rejected';
    } else {
      financeiro = 'pending';
    }
  }

  // Determinar status de Diretoria
  let diretoria: FluigApprovalStatus;
  if (snapshot.valor != null && snapshot.valor <= 2500) {
    diretoria = 'not_required';
  } else if (currentStage >= 4) {
    diretoria = 'approved';
  } else if (currentStage === 3) {
    diretoria = 'in_progress';
  } else if (diretoriaConclusao && currentStage < 3) {
    diretoria = 'rejected';
  } else {
    diretoria = 'pending';
  }

  return {
    facilities,
    facilitiesResponsavel,
    facilitiesConclusao: facilities === 'rejected' || (currentStage === 1 && facilitiesConclusao) ? null : facilitiesConclusao,
    financeiro,
    financeiroResponsavel,
    financeiroConclusao: financeiro === 'rejected' || (currentStage === 2 && financeiroConclusao) ? null : financeiroConclusao,
    diretoria,
    diretoriaResponsavel,
    diretoriaConclusao,
  };
}

/**
 * Traduz responsavel_atual para nome de departamento amigável.
 * Remove prefixos "Para o Papel" e sufixos "Pool:Role:...".
 */
export function formatResponsavelFluig(responsavelAtual: string | null): string {
  if (!responsavelAtual) return '-';

  // Remove "Para o Papel" prefix
  let cleaned = responsavelAtual.replace(/^Para o Papel\s*/i, '').trim();

  // Remove ", Pool:Role:..." suffix (Fluig system metadata)
  cleaned = cleaned.replace(/,\s*Pool:Role:[^\s,]*/gi, '').trim();

  // Verificar se é um papel conhecido
  if (PAPEL_TO_DEPARTAMENTO[responsavelAtual]) {
    return PAPEL_TO_DEPARTAMENTO[responsavelAtual];
  }

  // Verificar se o nome completo existe no mapeamento
  if (RESPONSAVEL_TO_DEPARTAMENTO[cleaned]) {
    return RESPONSAVEL_TO_DEPARTAMENTO[cleaned];
  }

  // Verificar primeiro nome
  const firstName = cleaned.split(' ')[0].toLowerCase();
  if (PRIMEIRO_NOME_TO_DEPARTAMENTO[firstName]) {
    return PRIMEIRO_NOME_TO_DEPARTAMENTO[firstName];
  }

  // Para nomes de papel/área, manter o label completo
  const normalized = cleaned.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const roleKeywords = ['gestor', 'analista', 'coordenador', 'diretor', 'gerente', 'gerencia', 'supervisor', 'assistente'];
  if (roleKeywords.some(kw => normalized.includes(kw))) return cleaned;

  // Caso contrário, retornar primeiro nome
  return cleaned.split(' ')[0];
}

/**
 * Retorna o índice da etapa atual baseado no responsável.
 * -1 = início, 0 = facilities, 1 = financeiro, 2 = diretoria
 */
export function getEtapaIndexPorResponsavel(responsavelAtual: string | null): number {
  if (!responsavelAtual) return -1;
  
  // Verificar por nome completo
  for (const [nome, depto] of Object.entries(RESPONSAVEL_TO_DEPARTAMENTO)) {
    if (responsavelAtual.includes(nome)) {
      return DEPARTAMENTO_TO_ETAPA[depto] ?? -1;
    }
  }

  // Verificar por papel
  for (const [papel, depto] of Object.entries(PAPEL_TO_DEPARTAMENTO)) {
    if (responsavelAtual.includes(papel)) {
      return DEPARTAMENTO_TO_ETAPA[depto] ?? -1;
    }
  }
  
  return -1;
}

/**
 * Retorna a próxima etapa baseado no responsável atual e localização.
 */
export function getProximaEtapaFluig(responsavelAtual: string | null, localizacao: string | null): string {
  // Primeiro, tentar pelo responsável
  if (responsavelAtual) {
    for (const [nome, depto] of Object.entries(RESPONSAVEL_TO_DEPARTAMENTO)) {
      if (responsavelAtual.includes(nome)) {
        return DEPARTAMENTO_TO_PROXIMA[depto] || '-';
      }
    }
    for (const [papel, depto] of Object.entries(PAPEL_TO_DEPARTAMENTO)) {
      if (responsavelAtual.includes(papel)) {
        return DEPARTAMENTO_TO_PROXIMA[depto] || '-';
      }
    }
  }

  // Fallback por localização
  if (localizacao) {
    const etapa = LOCALIZACAO_TO_ETAPA[localizacao] ?? 0;
    const depto = mapEtapaToDepartamento(etapa);
    return DEPARTAMENTO_TO_PROXIMA[depto] || localizacao;
  }

  return '-';
}

/**
 * Papéis Fluig por primeiro nome do usuário (para "Minhas Pendências").
 */
export const USER_FLUIG_ROLES: Record<string, string[]> = {
  'jonatas': ['gestor condominio', 'gestor condomínio', 'gerência de facilities', 'gerencia de facilities'],
  'kethli': ['gerência financeira', 'gerencia financeira', 'financeiro'],
  'thiago': ['diretoria', 'diretor'],
};

/**
 * Verifica se o usuário é responsável pelo snapshot baseado no nome.
 */
export function isUserResponsibleFluig(userName: string | null, responsavelAtual: string | null): boolean {
  if (!userName || !responsavelAtual) return false;
  const userFirstName = userName.split(' ')[0].toLowerCase();
  const responsavelLower = responsavelAtual.toLowerCase();
  
  if (responsavelLower.includes(userFirstName)) return true;
  
  const userRoles = USER_FLUIG_ROLES[userFirstName] || [];
  return userRoles.some(role => responsavelLower.includes(role));
}

// ============================================================
// FUNÇÕES LEGADAS (mantidas para backward compatibility)
// ============================================================

// Determina quais aprovações realmente ocorreram baseado na localização atual
export function getAprovacoesPorLocalizacao(localizacao: string | null): { 
  facilitiesAprovado: boolean; 
  financeiroAprovado: boolean; 
  diretoriaAprovado: boolean 
} {
  const etapaAtual = LOCALIZACAO_TO_ETAPA[localizacao || ''] ?? 0;
  return {
    facilitiesAprovado: etapaAtual >= 2,
    financeiroAprovado: etapaAtual >= 3,
    diretoriaAprovado: etapaAtual >= 4,
  };
}

// Labels para campos de aprovação
export const CAMPO_APROVACAO_LABELS: Record<string, string> = {
  'gerencia_conclusao': 'Gerência',
  'gerencia_facilities_conclusao': 'Gerência de Facilities',
  'gerencia_financeiro_conclusao': 'Gerência Financeira',
  'diretoria_conclusao': 'Diretoria',
};

// Verifica se um evento de *_conclusao é uma aprovação real
export function isAprovacaoReal(campoAprovacao: string, localizacao: string | null): boolean {
  const aprovacoes = getAprovacoesPorLocalizacao(localizacao);
  switch (campoAprovacao) {
    case 'gerencia_facilities_conclusao':
      return aprovacoes.facilitiesAprovado;
    case 'gerencia_financeiro_conclusao':
      return aprovacoes.financeiroAprovado;
    case 'diretoria_conclusao':
      return aprovacoes.diretoriaAprovado;
    default:
      return true;
  }
}

// Labels para eventos de devolução por departamento
export const DEVOLUCAO_LABELS: Record<string, string> = {
  'gerencia_facilities_conclusao': 'Devolvido pela Gerência de Facilities para correção',
  'gerencia_financeiro_conclusao': 'Devolvido pela Gerência Financeira para correção',
  'diretoria_conclusao': 'Devolvido pela Diretoria para correção',
};

export function getDevolucaoLabel(campoAlterado: string): string | null {
  return DEVOLUCAO_LABELS[campoAlterado] || null;
}
