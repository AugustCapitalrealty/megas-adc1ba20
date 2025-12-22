import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, MapPin, User, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FluigStatus {
  solicitacao_fluig: string;
  responsavel_atual: string | null;
  localizacao: string | null;
  situacao: string | null;
  data_lancamento: string | null;
  gerencia_conclusao: string | null;
  gerencia_facilities_conclusao: string | null;
  gerencia_financeiro_conclusao: string | null;
  diretoria_conclusao: string | null;
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

export function FluigStatusCard({ numeroChamadoFluig }: FluigStatusCardProps) {
  const [status, setStatus] = useState<FluigStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFluigStatus();
  }, [numeroChamadoFluig]);

  const fetchFluigStatus = async () => {
    const { data, error } = await supabase
      .from('fluig_painel_snapshot')
      .select('solicitacao_fluig, responsavel_atual, localizacao, situacao, data_lancamento, gerencia_conclusao, gerencia_facilities_conclusao, gerencia_financeiro_conclusao, diretoria_conclusao')
      .eq('solicitacao_fluig', numeroChamadoFluig)
      .maybeSingle();

    if (!error && data) {
      setStatus(data);
    }
    setLoading(false);
  };

  if (loading) {
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

  // Calculate days with current responsible
  const diasComResponsavel = status.data_lancamento
    ? differenceInDays(new Date(), new Date(status.data_lancamento))
    : 0;

  // Determine current stage based on responsavel_atual
  const etapaAtualIndex = getEtapaAtualIndex(status.responsavel_atual);

  // Determine approval stages with 3 states: done (green), in_progress (yellow), pending (gray)
  const approvalStages = [
    { key: 'facilities', label: 'Facilities', conclusao: status.gerencia_facilities_conclusao },
    { key: 'financeiro', label: 'Financeiro', conclusao: status.gerencia_financeiro_conclusao },
    { key: 'diretoria', label: 'Diretoria', conclusao: status.diretoria_conclusao },
  ].map((stage, index) => {
    // If has conclusao date, it's done
    if (stage.conclusao) {
      return { ...stage, status: 'done' as const };
    }
    // If this is the current stage (based on responsavel), it's in progress
    if (index === etapaAtualIndex) {
      return { ...stage, status: 'in_progress' as const };
    }
    // If before the current stage, it's done (already passed)
    if (etapaAtualIndex >= 0 && index < etapaAtualIndex) {
      return { ...stage, status: 'done' as const };
    }
    // Otherwise pending
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
        {/* Current responsible */}
        {status.responsavel_atual && (
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">Responsável atual:</span>
            <span className="font-medium text-foreground">{ETAPA_LABELS[status.responsavel_atual] || status.responsavel_atual}</span>
            <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {diasComResponsavel}d
            </Badge>
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
      </div>
    </div>
  );
}
