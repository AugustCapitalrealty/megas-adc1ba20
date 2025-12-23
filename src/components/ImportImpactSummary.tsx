import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RefreshCw, AlertCircle, Clock, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FluigRowData } from '@/types/fluig';

interface ImportImpactSummaryProps {
  data: FluigRowData[];
  className?: string;
}

interface ImpactAnalysis {
  novas: number;
  atualizadas: number;
  solicitacoesNovas: string[];
  solicitacoesAtualizadas: string[];
  estimatedTimeSeconds: number;
}

export function ImportImpactSummary({ data, className }: ImportImpactSummaryProps) {
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

        const novas: string[] = [];
        const atualizadas: string[] = [];

        data.forEach(row => {
          if (existingSet.has(row.solicitacao_fluig)) {
            atualizadas.push(row.solicitacao_fluig);
          } else {
            novas.push(row.solicitacao_fluig);
          }
        });

        // Estimativa de tempo: ~200ms por registro
        const estimatedTimeSeconds = Math.ceil((data.length * 200) / 1000);

        setAnalysis({
          novas: novas.length,
          atualizadas: atualizadas.length,
          solicitacoesNovas: novas.slice(0, 5),
          solicitacoesAtualizadas: atualizadas.slice(0, 5),
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
      <Card className={cn('border-dashed', className)}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className={cn('border-primary/30 bg-gradient-to-r from-primary/5 to-transparent', className)}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">O que vai acontecer ao clicar em Importar?</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Análise prévia baseada nos dados atuais do sistema
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Novas */}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span className="text-lg font-bold text-emerald-600">{analysis.novas}</span>
            </div>
            <p className="text-xs text-muted-foreground">Serão criadas</p>
            {analysis.solicitacoesNovas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {analysis.solicitacoesNovas.map(s => (
                  <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    {s}
                  </Badge>
                ))}
                {analysis.novas > 5 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{analysis.novas - 5}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Atualizadas */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="h-4 w-4 text-blue-600" />
              <span className="text-lg font-bold text-blue-600">{analysis.atualizadas}</span>
            </div>
            <p className="text-xs text-muted-foreground">Serão atualizadas</p>
            {analysis.solicitacoesAtualizadas.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {analysis.solicitacoesAtualizadas.map(s => (
                  <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    {s}
                  </Badge>
                ))}
                {analysis.atualizadas > 5 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    +{analysis.atualizadas - 5}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Tempo estimado */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-lg font-bold text-amber-600">
                ~{analysis.estimatedTimeSeconds < 60 
                  ? `${analysis.estimatedTimeSeconds}s` 
                  : `${Math.ceil(analysis.estimatedTimeSeconds / 60)}min`
                }
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Tempo estimado</p>
          </div>
        </div>

        {/* Aviso de que a ação é segura */}
        <div className="mt-4 p-2 rounded bg-muted/50 border border-muted">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>
              A importação não apaga dados existentes. Registros já cadastrados serão apenas atualizados com as informações mais recentes.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
