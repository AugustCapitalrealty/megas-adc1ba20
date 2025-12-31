// Utilitários compartilhados para lógica de Fluig

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

// Determina quais aprovações realmente ocorreram baseado na localização atual
// A localização é a fonte de verdade, não os campos *_conclusao
export function getAprovacoesPorLocalizacao(localizacao: string | null): { 
  facilitiesAprovado: boolean; 
  financeiroAprovado: boolean; 
  diretoriaAprovado: boolean 
} {
  const etapaAtual = LOCALIZACAO_TO_ETAPA[localizacao || ''] ?? 0;
  return {
    facilitiesAprovado: etapaAtual >= 2,  // Passou de Nível 1 para Nível 2+
    financeiroAprovado: etapaAtual >= 3,  // Passou de Nível 2 para Nível 3+
    diretoriaAprovado: etapaAtual >= 4,   // Passou de Nível 3 para Emitir+
  };
}

// Labels para campos de aprovação
export const CAMPO_APROVACAO_LABELS: Record<string, string> = {
  'gerencia_conclusao': 'Gerência',
  'gerencia_facilities_conclusao': 'Gerência de Facilities',
  'gerencia_financeiro_conclusao': 'Gerência Financeira',
  'diretoria_conclusao': 'Diretoria',
};

// Verifica se um evento de *_conclusao é uma aprovação real ou reprovação/devolução
// baseado na localização atual do snapshot
export function isAprovacaoReal(
  campoAprovacao: string, 
  localizacao: string | null
): boolean {
  const aprovacoes = getAprovacoesPorLocalizacao(localizacao);
  
  switch (campoAprovacao) {
    case 'gerencia_facilities_conclusao':
      return aprovacoes.facilitiesAprovado;
    case 'gerencia_financeiro_conclusao':
      return aprovacoes.financeiroAprovado;
    case 'diretoria_conclusao':
      return aprovacoes.diretoriaAprovado;
    default:
      return true; // Para outros campos, assumir verdadeiro
  }
}

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

// Labels para eventos de devolução por departamento
export const DEVOLUCAO_LABELS: Record<string, string> = {
  'gerencia_facilities_conclusao': 'Devolvido pela Gerência de Facilities para correção',
  'gerencia_financeiro_conclusao': 'Devolvido pela Gerência Financeira para correção',
  'diretoria_conclusao': 'Devolvido pela Diretoria para correção',
};

// Retorna o label de devolução para um campo, ou null se não for devolução
export function getDevolucaoLabel(campoAlterado: string): string | null {
  return DEVOLUCAO_LABELS[campoAlterado] || null;
}
