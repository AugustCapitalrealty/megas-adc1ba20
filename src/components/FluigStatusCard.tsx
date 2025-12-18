import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, MapPin, User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
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
  'Para o Papel Gestor Condominio': 'Gerencia de Facilities',
  'Aprovação Nivel 1': 'Gerencia de Facilities',
  'Aprovação Nivel 2': 'Gerencia Financeira',
  'Aprovação Nivel 3': 'Diretoria',
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

  // Determine approval stages
  const approvalStages = [
    { key: 'gerencia', label: 'Gerência', done: !!status.gerencia_conclusao },
    { key: 'facilities', label: 'Facilities', done: !!status.gerencia_facilities_conclusao },
    { key: 'financeiro', label: 'Financeiro', done: !!status.gerencia_financeiro_conclusao },
    { key: 'diretoria', label: 'Diretoria', done: !!status.diretoria_conclusao },
  ];

  const completedStages = approvalStages.filter(s => s.done).length;
  const hasAnyApproval = completedStages > 0;

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
            <span className="text-muted-foreground">Responsável:</span>
            <span className="font-medium text-foreground">{status.responsavel_atual}</span>
          </div>
        )}

        {/* Current location/stage */}
        {status.localizacao && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-muted-foreground">Etapa:</span>
            <span className="font-medium text-foreground">{ETAPA_LABELS[status.localizacao] || status.localizacao}</span>
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
                  variant={stage.done ? 'default' : 'outline'}
                  className={`text-xs ${stage.done 
                    ? 'bg-green-500 hover:bg-green-500 text-white' 
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
