import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, MapPin, User, Calendar, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, UserCircle, ArrowRight, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getFluigApprovalStatus, isFluigFechado, CAMPO_APROVACAO_LABELS, getDevolucaoLabel, LOCALIZACAO_TO_ETAPA, mapEtapaToDepartamento, formatResponsavelFluig, getEtapaIndexPorResponsavel, getProximaEtapaFluig } from '@/lib/fluig-utils';
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

// Obtém a data real do evento (para aprovações, usa valor_novo que contém a data ISO)
const getEventoDataReal = (evento: FluigEvento): Date => {
  if (evento.campo_alterado.includes('_conclusao') && evento.valor_novo) {
    try {
      return new Date(evento.valor_novo);
    } catch {
      return new Date(evento.created_at);
    }
  }
  return new Date(evento.created_at);
};

// Kept for localizacao-to-text mappings in event formatting
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
  const approvalResult = useMemo(() => {
    if (!status) return null;
    return getFluigApprovalStatus(status);
  }, [status]);

  const aprovacoes = useMemo(() => ({
    facilitiesAprovado: approvalResult?.facilities === 'approved',
    financeiroAprovado: approvalResult?.financeiro === 'approved',
    diretoriaAprovado: approvalResult?.diretoria === 'approved',
  }), [approvalResult]);

  // Detectar se houve devolução recente - must be before early returns
  // NOVA LÓGICA: verifica sequência de eventos para detectar retorno de nível
  // Devolução = localização mudou de um nível superior para um nível inferior
  const devolucaoDetectada = useMemo(() => {
    if (!status || !eventos.length) return null;
    
    // Procurar no histórico de eventos por mudança de localização que DIMINUIU de nível
    for (let i = 0; i < eventos.length; i++) {
      const e = eventos[i];
      if (e.campo_alterado === 'localizacao' && e.valor_anterior && e.valor_novo) {
        const nivelAnterior = LOCALIZACAO_TO_ETAPA[e.valor_anterior] ?? 0;
        const nivelNovo = LOCALIZACAO_TO_ETAPA[e.valor_novo] ?? 0;
        
        // Se o nível DIMINUIU (retornou), é uma devolução
        // Exemplo: "Aprovação Nivel 2" (etapa 2) → "Para o Papel Gestor Condominio" (etapa 1)
        if (nivelNovo < nivelAnterior && nivelAnterior >= 2) {
          const departamentoQueDevolveu = mapEtapaToDepartamento(nivelAnterior);
          return { 
            departamento: departamentoQueDevolveu, 
            voltouPara: mapEtapaToDepartamento(nivelNovo) 
          };
        }
      }
    }
    
    return null;
  }, [status, eventos]);

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
  const etapaAtualIndex = getEtapaIndexPorResponsavel(status.responsavel_atual);

  // Determine approval stages based on localizacao (source of truth)
  // Também considera devoluções para marcar badges corretamente
  const approvalStages = [
    { key: 'facilities', label: 'Facilities', aprovado: aprovacoes.facilitiesAprovado, approvalStatus: approvalResult?.facilities },
    { key: 'financeiro', label: 'Financeiro', aprovado: aprovacoes.financeiroAprovado, approvalStatus: approvalResult?.financeiro },
    { key: 'diretoria', label: 'Diretoria', aprovado: aprovacoes.diretoriaAprovado, approvalStatus: approvalResult?.diretoria },
  ].map((stage, index) => {
    // Se não é necessário (ex: Diretoria para valor <= 2500)
    if (stage.approvalStatus === 'not_required') {
      return { ...stage, status: 'not_required' as const };
    }
    // Se há devolução detectada por este departamento, marcar como rejected
    if (devolucaoDetectada?.departamento.includes(stage.label)) {
      return { ...stage, status: 'rejected' as const };
    }
    // Se aprovado, está done
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
        <Link
          to="/painel-fluig"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-auto"
        >
          Ver no Painel
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-2 text-sm">
        {/* Current responsible - always show REAL responsible based on responsavel_atual/localizacao */}
        {(status.responsavel_atual || devolucaoDetectada) && (
          <div className="flex items-center gap-2 flex-wrap">
            <User className={`h-3.5 w-3.5 ${devolucaoDetectada ? 'text-amber-500' : 'text-blue-500'}`} />
            <span className="text-muted-foreground">Responsável atual:</span>
            <span className={`font-medium ${devolucaoDetectada ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
              {formatResponsavelFluig(status.responsavel_atual) !== '-' 
                ? formatResponsavelFluig(status.responsavel_atual)
                : formatResponsavelFluig(status.localizacao) !== '-'
                  ? formatResponsavelFluig(status.localizacao)
                  : 'Não definido'}
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
            <span className="font-medium text-foreground">{getProximaEtapaFluig(status.responsavel_atual, status.localizacao)}</span>
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
              {approvalStages.filter(s => s.status !== 'not_required').map((stage) => (
                <Badge 
                  key={stage.key} 
                  variant={stage.status === 'done' ? 'default' : 'outline'}
                  className={`text-xs flex items-center gap-1 ${
                    stage.status === 'done' 
                      ? 'bg-green-500 hover:bg-green-500 text-white' 
                      : stage.status === 'rejected'
                        ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                        : stage.status === 'in_progress'
                          ? 'bg-yellow-500 hover:bg-yellow-500 text-white border-yellow-500'
                          : 'bg-transparent text-muted-foreground border-muted-foreground/30'
                  }`}
                >
                  {stage.status === 'done' && <CheckCircle className="h-3 w-3" />}
                  {stage.status === 'rejected' && <RotateCcw className="h-3 w-3" />}
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
