import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FluigRowData } from '@/types/fluig';

interface ImportImpactSummaryProps {
  data: FluigRowData[];
  className?: string;
  compact?: boolean;
}

interface ImpactAnalysis {
  novas: number;
  atualizadas: number;
  estimatedTimeSeconds: number;
}

export function ImportImpactSummary({ data, className, compact = false }: ImportImpactSummaryProps) {
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function analyzeImpact() {
      if (!data || data.length === 0) {
        setAnalysis(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        // Buscar solicitações existentes no banco
        const solicitacaoIds = data.map(d => d.solicitacao_fluig);
        const { data: existing } = await supabase
          .from('fluig_painel_snapshot')
          .select('solicitacao_fluig')
          .in('solicitacao_fluig', solicitacaoIds);

        const existingSet = new Set((existing || []).map(e => e.solicitacao_fluig));

        let novas = 0;
        let atualizadas = 0;

        data.forEach(row => {
          if (existingSet.has(row.solicitacao_fluig)) {
            atualizadas++;
          } else {
            novas++;
          }
        });

        // Estimativa de tempo: ~200ms por registro
        const estimatedTimeSeconds = Math.ceil((data.length * 200) / 1000);

        setAnalysis({
          novas,
          atualizadas,
          estimatedTimeSeconds,
        });
      } catch (error) {
        console.error('Erro ao analisar impacto:', error);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    }

    analyzeImpact();
  }, [data]);

  if (loading) {
    return (
      <div className={cn('flex items-center gap-2 p-3 rounded-lg border border-dashed', className)}>
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // Compact inline version
  if (compact) {
    const timeLabel = analysis.estimatedTimeSeconds < 60 
      ? `${analysis.estimatedTimeSeconds}s` 
      : `${Math.ceil(analysis.estimatedTimeSeconds / 60)}min`;

    return (
      <div className={cn(
        'flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5',
        className
      )}>
        <div className="flex items-center gap-2 text-sm">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Resultado esperado:</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1 text-emerald-600">
            <Sparkles className="h-3 w-3" />
            {analysis.novas} novas
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="flex items-center gap-1 text-blue-600">
            <RefreshCw className="h-3 w-3" />
            {analysis.atualizadas} atualiz.
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="flex items-center gap-1 text-amber-600">
            <Clock className="h-3 w-3" />
            ~{timeLabel}
          </span>
        </div>
      </div>
    );
  }

  // Full version (kept for backwards compatibility)
  return (
    <div className={cn(
      'p-4 rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-transparent',
      className
    )}>
      <div className="flex items-start gap-3 mb-3">
        <Info className="h-4 w-4 text-primary mt-0.5" />
        <div>
          <h4 className="font-medium text-sm">O que vai acontecer?</h4>
          <p className="text-xs text-muted-foreground">Análise baseada nos dados atuais</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-600">{analysis.novas}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Novas</p>
        </div>

        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-sm font-bold text-blue-600">{analysis.atualizadas}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Atualizadas</p>
        </div>

        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-sm font-bold text-amber-600">
              ~{analysis.estimatedTimeSeconds < 60 
                ? `${analysis.estimatedTimeSeconds}s` 
                : `${Math.ceil(analysis.estimatedTimeSeconds / 60)}min`
              }
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Tempo est.</p>
        </div>
      </div>
    </div>
  );
}
