import { useMemo, useState } from 'react';
import { RefreshCw, MapPin, User, Calendar, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, UserCircle, ArrowRight, AlertCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getAprovacoesPorLocalizacao, CAMPO_APROVACAO_LABELS, getDevolucaoLabel } from '@/lib/fluig-utils';
import { useFluigStatus } from '@/hooks/useFluigStatus';

interface FluigEvento {
  id: string;
  campo_alterado: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  created_at: string;
}

// Tipo estendido para eventos com marcação de devolução
interface FluigEventoProcessado extends FluigEvento {
  _isDevolucao?: boolean;
  _devolucaoLabel?: string;
}

interface FluigStatusCardProps {
  numeroChamadoFluig: string;
}

const ETAPA_LABELS: Record<string, string> = {
  'Para o Papel Gestor Condominio': 'Gerência de Facilities',
  'Para o Papel Gestor Condomínio': 'Gerência de Facilities',
  'Aprovação Nivel 1': 'Gerência de Facilities',
  'Aprovação Nível 1': 'Gerência de Facilities',
  'Aprovação Nivel 2': 'Gerência Financeira',
  'Aprovação Nível 2': 'Gerência Financeira',
  'Aprovação Nivel 3': 'Diretoria',
  'Aprovação Nível 3': 'Diretoria',
};

// Mapa: nome do responsável → próxima etapa
const RESPONSAVEL_PROXIMA_ETAPA: Record<string, string> = {
  // Início → Facilities
  'Laureane Bransin': 'Gerência de Facilities',
  'Paloma Correa Grigoletto': 'Gerência de Facilities',
  'Roberta Gonçalves Pires da Costa': 'Gerência de Facilities',
  // Facilities → Financeiro
  'Jonatas Augusto Ferreira': 'Gerência Financeira',
  // Financeiro → Diretoria
  'Kethli Pereira Bezerra': 'Diretoria',
  // Diretoria → Conclusão
  'Thiago Demeterco Lucchesi': 'Conclusão',
};

// Mapa: nome do responsável → etapa atual (índice -1=início, 0=facilities, 1=financeiro, 2=diretoria)
const RESPONSAVEL_ETAPA_INDEX: Record<string, number> = {
  'Laureane Bransin': -1,                    // início
  'Paloma Correa Grigoletto': -1,            // início
  'Roberta Gonçalves Pires da Costa': -1,    // início
  'Jonatas Augusto Ferreira': 0,             // facilities
  'Kethli Pereira Bezerra': 1,               // financeiro
  'Thiago Demeterco Lucchesi': 2,            // diretoria
  'Para o Papel Gestor Condominio': 0,       // aguardando facilities
  'Para o Papel Gestor Condomínio': 0,       // aguardando facilities (com acento)
};

const getEtapaAtualIndex = (responsavelAtual: string | null): number => {
  if (!responsavelAtual) return -1;
  for (const [nome, index] of Object.entries(RESPONSAVEL_ETAPA_INDEX)) {
    if (responsavelAtual.includes(nome)) {
      return index;
    }
  }
  return -1;
};

// Fallback por localização (quando não há pessoa específica)
const PROXIMA_ETAPA_FALLBACK: Record<string, string> = {
  'Início': 'Gerência de Facilities',
  'Para o Papel Gestor Condominio': 'Gerência Financeira',
  'Para o Papel Gestor Condomínio': 'Gerência Financeira',
  'Aprovação Nivel 1': 'Gerência Financeira',
  'Aprovação Nível 1': 'Gerência Financeira',
  'Aprovação Financeiro': 'Diretoria',
  'Aprovação Nivel 2': 'Diretoria',
  'Aprovação Nível 2': 'Diretoria',
  'Aprovação Nivel 3': 'Conclusão',
  'Aprovação Nível 3': 'Conclusão',
};

const getProximaEtapa = (responsavelAtual: string | null, localizacao: string | null): string => {
  const responsavel = responsavelAtual || '';
  
  // Verifica se o responsável atual contém algum nome conhecido
  for (const [nome, proximaEtapa] of Object.entries(RESPONSAVEL_PROXIMA_ETAPA)) {
    if (responsavel.includes(nome)) {
      return proximaEtapa;
    }
  }
  
  // Fallback: usa localização se não encontrar pelo nome
  return PROXIMA_ETAPA_FALLBACK[localizacao || ''] || localizacao || '-';
};


// Obtém a data real do evento (para aprovações, usa valor_novo que contém a data ISO)
const getEventoDataReal = (evento: FluigEvento): Date => {
  // Para aprovações, a data real está no valor_novo (ISO string)
  if (evento.campo_alterado.includes('_conclusao') && evento.valor_novo) {
    try {
      return new Date(evento.valor_novo);
    } catch {
      return new Date(evento.created_at);
    }
  }
  // Para outros eventos, usar created_at
  return new Date(evento.created_at);
};

// Mapa: localização técnica → texto amigável para movimentações
const LOCALIZACAO_TEXTO_AMIGAVEL: Record<string, string> = {
  'Aprovação Nivel 1': 'aprovação de Facilities',
  'Aprovação Nível 1': 'aprovação de Facilities',
  'Aprovação Nivel 2': 'aprovação Financeira',
  'Aprovação Nível 2': 'aprovação Financeira',
  'Aprovação Nivel 3': 'aprovação da Diretoria',
  'Aprovação Nível 3': 'aprovação da Diretoria',
  'Emitir Solicitação': 'emissão da solicitação',
  'Emitir Solicitacao': 'emissão da solicitação',
};

// Mapa: papel genérico → texto de "Aguardando aprovação"
const PAPEL_PARA_TEXTO_AGUARDANDO: Record<string, string> = {
  'Para o Papel Gestor Condominio': 'Aguardando aprovação Gerência de Facilities',
  'Para o Papel Gestor Condomínio': 'Aguardando aprovação Gerência de Facilities',
  'Para o Papel Gerente Financeiro': 'Aguardando aprovação Gerência Financeira',
  'Para o Papel Diretor': 'Aguardando aprovação Diretoria',
};

// Formata a descrição do evento de forma inteligente
const formatEventoDescricao = (evento: FluigEventoProcessado): { texto: string; tipo: 'reprovacao' | 'aprovacao' | 'responsavel' | 'avanco' | 'situacao' | 'devolucao' | 'outro' } => {
  const { campo_alterado, valor_anterior, valor_novo } = evento;
  
  // Se é um evento de devolução marcado
  if (evento._isDevolucao && evento._devolucaoLabel) {
    return {
      texto: evento._devolucaoLabel,
      tipo: 'devolucao'
    };
  }
  
  // Mudança de responsável
  if (campo_alterado === 'responsavel_atual') {
    // Verifica se é um papel genérico (não é uma pessoa específica)
    const textoAguardando = PAPEL_PARA_TEXTO_AGUARDANDO[valor_novo || ''];
    if (textoAguardando) {
      return {
        texto: textoAguardando,
        tipo: 'responsavel'
      };
    }
    // Se for pessoa específica, usa o formato padrão
    return {
      texto: `${valor_novo} assumiu Fluig`,
      tipo: 'responsavel'
    };
  }
  
  // Mudança de localização
  if (campo_alterado === 'localizacao') {
    if (valor_novo === 'Início') {
      return {
        texto: `Devolvido de ${LOCALIZACAO_TEXTO_AMIGAVEL[valor_anterior || ''] || valor_anterior}`,
        tipo: 'reprovacao'
      };
    }
    const textoAmigavel = LOCALIZACAO_TEXTO_AMIGAVEL[valor_novo || ''] || valor_novo;
    return {
      texto: `Avançou para ${textoAmigavel}`,
      tipo: 'avanco'
    };
  }
  
  // Aprovações (campos *_conclusao)
  if (campo_alterado.includes('conclusao') && valor_novo) {
    const label = CAMPO_APROVACAO_LABELS[campo_alterado] || campo_alterado;
    const dataFormatada = format(new Date(valor_novo), "dd/MM/yyyy HH:mm", { locale: ptBR });
    return {
      texto: `${label} aprovado em ${dataFormatada}`,
      tipo: 'aprovacao'
    };
  }
  
  // Mudança de situação
  if (campo_alterado === 'situacao') {
    return {
      texto: `Status: ${valor_novo}`,
      tipo: 'situacao'
    };
  }
  
  // Outros campos
  return {
    texto: `${campo_alterado}: ${valor_anterior || '(vazio)'} → ${valor_novo || '(vazio)'}`,
    tipo: 'outro'
  };
};

// Ícone e cor baseados no tipo de evento
const getEventoIconAndColor = (tipo: 'reprovacao' | 'aprovacao' | 'responsavel' | 'avanco' | 'situacao' | 'devolucao' | 'outro') => {
  switch (tipo) {
    case 'reprovacao':
      return { icon: XCircle, colorClass: 'text-red-500' };
    case 'devolucao':
      return { icon: RotateCcw, colorClass: 'text-red-500' };
    case 'aprovacao':
      return { icon: CheckCircle, colorClass: 'text-green-500' };
    case 'responsavel':
      return { icon: UserCircle, colorClass: 'text-blue-500' };
    case 'avanco':
      return { icon: ArrowRight, colorClass: 'text-amber-500' };
    case 'situacao':
      return { icon: AlertCircle, colorClass: 'text-gray-500' };
    default:
      return { icon: Clock, colorClass: 'text-muted-foreground' };
  }
};

export function FluigStatusCard({ numeroChamadoFluig }: FluigStatusCardProps) {
  // ALL HOOKS MUST BE AT THE TOP - before any early returns
  const { data, isLoading } = useFluigStatus(numeroChamadoFluig);
  const status = data?.status || null;
  const eventos = data?.eventos || [];
  const [showHistorico, setShowHistorico] = useState(false);

  // Memoized calculations - must be before early returns
  const aprovacoes = useMemo(() => {
    if (!status?.localizacao) {
      return { facilitiesAprovado: false, financeiroAprovado: false, diretoriaAprovado: false };
    }
    return getAprovacoesPorLocalizacao(status.localizacao);
  }, [status?.localizacao]);

  // Detectar se houve devolução recente - must be before early returns
  const devolucaoDetectada = useMemo(() => {
    if (!status) return null;
    
    const { facilitiesAprovado, financeiroAprovado, diretoriaAprovado } = aprovacoes;
    
    // Diretoria concluiu mas não está aprovado = devolução pela Diretoria
    if (status.diretoria_conclusao && !diretoriaAprovado) {
      return {
        departamento: 'Diretoria',
        responsavelInferido: 'Solicitante (aguardando correção)'
      };
    }
    
    // Financeiro concluiu mas não está aprovado = devolução pelo Financeiro
    if (status.gerencia_financeiro_conclusao && !financeiroAprovado) {
      return {
        departamento: 'Gerência Financeira',
        responsavelInferido: 'Solicitante (aguardando correção)'
      };
    }
    
    // Facilities concluiu mas não está aprovado = devolução por Facilities
    if (status.gerencia_facilities_conclusao && !facilitiesAprovado) {
      return {
        departamento: 'Gerência de Facilities',
        responsavelInferido: 'Solicitante (aguardando correção)'
      };
    }
    
    return null;
  }, [status, aprovacoes]);

  // Calcular eventos filtrados e processar devoluções - must be before early returns
  const eventosFiltrados = useMemo((): FluigEventoProcessado[] => {
    if (!eventos.length) return [];
    
    const result: FluigEventoProcessado[] = [];
    
    for (const e of eventos) {
      // Sempre filtrar gerencia_conclusao (duplicado)
      if (e.campo_alterado === 'gerencia_conclusao') continue;
      
      // Para eventos de *_conclusao, verificar se é aprovação real ou devolução
      if (e.campo_alterado === 'gerencia_facilities_conclusao' && e.valor_novo) {
        if (aprovacoes.facilitiesAprovado) {
          result.push(e); // Mostrar como aprovação
        } else {
          // Marcar como devolução
          const devolucaoLabel = getDevolucaoLabel(e.campo_alterado);
          if (devolucaoLabel) {
            result.push({ ...e, _isDevolucao: true, _devolucaoLabel: devolucaoLabel });
          }
        }
        continue;
      }
      
      if (e.campo_alterado === 'gerencia_financeiro_conclusao' && e.valor_novo) {
        if (aprovacoes.financeiroAprovado) {
          result.push(e); // Mostrar como aprovação
        } else {
          const devolucaoLabel = getDevolucaoLabel(e.campo_alterado);
          if (devolucaoLabel) {
            result.push({ ...e, _isDevolucao: true, _devolucaoLabel: devolucaoLabel });
          }
        }
        continue;
      }
      
      if (e.campo_alterado === 'diretoria_conclusao' && e.valor_novo) {
        if (aprovacoes.diretoriaAprovado) {
          result.push(e); // Mostrar como aprovação
        } else {
          const devolucaoLabel = getDevolucaoLabel(e.campo_alterado);
          if (devolucaoLabel) {
            result.push({ ...e, _isDevolucao: true, _devolucaoLabel: devolucaoLabel });
          }
        }
        continue;
      }
      
      // Outros eventos passam normalmente
      result.push(e);
    }
    
    return result;
  }, [eventos, aprovacoes]);

  // NOW we can have early returns - after all hooks
  if (isLoading) {
    return (
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg animate-pulse">
        <div className="h-4 bg-blue-200 dark:bg-blue-800 rounded w-32" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="p-3 bg-muted/50 border border-border rounded-lg">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4" />
          <span>Fluig #{numeroChamadoFluig} - Aguardando importação de dados</span>
        </div>
      </div>
    );
  }

  const dataLancamentoFormatted = status.data_lancamento 
    ? format(new Date(status.data_lancamento), "dd/MM/yyyy", { locale: ptBR })
    : null;

  // Calculate days with current responsible - use ultima_movimentacao instead of data_lancamento
  const diasComResponsavel = status.ultima_movimentacao
    ? differenceInDays(new Date(), new Date(status.ultima_movimentacao))
    : 0;

  // Determine current stage based on responsavel_atual
  const etapaAtualIndex = getEtapaAtualIndex(status.responsavel_atual);

  // Determine approval stages based on localizacao (source of truth)
  const approvalStages = [
    { key: 'facilities', label: 'Facilities', aprovado: aprovacoes.facilitiesAprovado },
    { key: 'financeiro', label: 'Financeiro', aprovado: aprovacoes.financeiroAprovado },
    { key: 'diretoria', label: 'Diretoria', aprovado: aprovacoes.diretoriaAprovado },
  ].map((stage, index) => {
    // Se aprovado segundo a localização, está done
    if (stage.aprovado) {
      return { ...stage, status: 'done' as const };
    }
    // Se é a etapa atual (baseado no responsável), está em progresso
    if (index === etapaAtualIndex) {
      return { ...stage, status: 'in_progress' as const };
    }
    // Se antes da etapa atual, está done (já passou)
    if (etapaAtualIndex >= 0 && index < etapaAtualIndex) {
      return { ...stage, status: 'done' as const };
    }
    // Caso contrário, pendente
    return { ...stage, status: 'pending' as const };
  });

  const hasAnyApproval = approvalStages.some(s => s.status !== 'pending');

  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
          Status Fluig #{status.solicitacao_fluig}
        </span>
        {status.situacao && (
          <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">
            {status.situacao}
          </Badge>
        )}
      </div>

      <div className="grid gap-2 text-sm">
        {/* Current responsible - show inferred if devolução detected */}
        {(status.responsavel_atual || devolucaoDetectada) && (
          <div className="flex items-center gap-2">
            <User className={`h-3.5 w-3.5 ${devolucaoDetectada ? 'text-amber-500' : 'text-blue-500'}`} />
            <span className="text-muted-foreground">Responsável atual:</span>
            <span className={`font-medium ${devolucaoDetectada ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {devolucaoDetectada?.responsavelInferido || ETAPA_LABELS[status.responsavel_atual || ''] || status.responsavel_atual}
            </span>
            {!devolucaoDetectada && (
              <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {diasComResponsavel}d
              </Badge>
            )}
            {devolucaoDetectada && (
              <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                Devolvido por {devolucaoDetectada.departamento}
              </Badge>
            )}
          </div>
        )}

        {/* Next stage */}
        {status.localizacao && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">Próxima etapa:</span>
            <span className="font-medium text-foreground">{getProximaEtapa(status.responsavel_atual, status.localizacao)}</span>
          </div>
        )}

        {/* Launch date */}
        {dataLancamentoFormatted && (
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">Lançamento:</span>
            <span className="font-medium text-foreground">{dataLancamentoFormatted}</span>
          </div>
        )}

        {/* Approval progress */}
        {hasAnyApproval && (
          <div className="flex items-center gap-2 mt-1 pt-2 border-t border-blue-200 dark:border-blue-800">
            <span className="text-muted-foreground text-xs">Aprovações:</span>
            <div className="flex gap-1">
              {approvalStages.map((stage) => (
                <Badge 
                  key={stage.key} 
                  variant={stage.status === 'done' ? 'default' : 'outline'}
                  className={`text-xs ${
                    stage.status === 'done' 
                      ? 'bg-green-500 hover:bg-green-500 text-white' 
                      : stage.status === 'in_progress'
                        ? 'bg-yellow-500 hover:bg-yellow-500 text-white border-yellow-500'
                        : 'bg-transparent text-muted-foreground border-muted-foreground/30'
                  }`}
                >
                  {stage.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Movement History */}
        {eventosFiltrados.length > 0 && (
          <Collapsible open={showHistorico} onOpenChange={setShowHistorico}>
            <CollapsibleTrigger className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 w-full text-left hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded px-1 py-1 transition-colors">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground text-xs">Histórico de Movimentações</span>
              <Badge variant="outline" className="text-xs ml-1">
                {eventosFiltrados.length}
              </Badge>
              {showHistorico ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[...eventosFiltrados]
                  // Ordenar por data real (não por created_at da importação)
                  .sort((a, b) => getEventoDataReal(a).getTime() - getEventoDataReal(b).getTime())
                  .map((evento) => {
                    const { texto, tipo } = formatEventoDescricao(evento);
                    const { icon: Icon, colorClass } = getEventoIconAndColor(tipo);
                    const dataReal = getEventoDataReal(evento);
                    const dataFormatada = format(dataReal, "dd/MM HH:mm", { locale: ptBR });
                    
                    return (
                      <div 
                        key={evento.id} 
                        className={`flex items-start gap-2 text-xs p-1.5 rounded ${
                          tipo === 'devolucao' || tipo === 'reprovacao'
                            ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                            : 'bg-white/50 dark:bg-gray-800/30'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${colorClass}`} />
                        <div className="flex-1 min-w-0">
                          <span className={`${tipo === 'devolucao' || tipo === 'reprovacao' ? 'text-red-700 dark:text-red-300 font-medium' : 'text-foreground'}`}>
                            {texto}
                          </span>
                          {tipo !== 'aprovacao' && (
                            <span className="text-muted-foreground ml-1">
                              em {dataFormatada}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
