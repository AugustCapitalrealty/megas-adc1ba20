import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertCircle, Receipt, ClipboardList, Users, ArrowRight, Calendar } from 'lucide-react';
import { useSharedCompetencia } from './CompetenciaContext';

interface Competencia { id: string; ano_mes: string; status: 'rascunho' | 'fechada'; }

interface Status {
  copelLancada: boolean;
  totalCopel: number;
  lancamentosCount: number;
  modulosAtivos: number;
}

interface Props {
  onGoTo: (target: 'fatura' | 'lancamentos' | 'faturas') => void;
}

function formatCompetencia(ano_mes: string) {
  const [ano, mes] = ano_mes.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const m = parseInt(mes, 10);
  return `${meses[m - 1] ?? mes}/${ano}`;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function EnergiaPainelTab({ onGoTo }: Props) {
  const { currentCompId, setCurrentCompId, version } = useSharedCompetencia();
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('energia_competencias')
        .select('id, ano_mes, status')
        .order('ano_mes', { ascending: false });
      const list = (data as Competencia[] | null) || [];
      setCompetencias(list);
      if (!currentCompId && list.length > 0) setCurrentCompId(list[0].id);
      setLoading(false);
    })();
  }, [version]);

  const loadStatus = useCallback(async (compId: string) => {
    const [t, l, m] = await Promise.all([
      supabase
        .from('energia_competencia_tarifas')
        .select('fatura_copel_itens')
        .eq('competencia_id', compId)
        .maybeSingle(),
      supabase
        .from('energia_competencia_lancamentos')
        .select('modulo_id')
        .eq('competencia_id', compId),
      supabase.from('energia_modulos').select('id').eq('ativo', true),
    ]);
    const fc: any = (t.data as any)?.fatura_copel_itens || {};
    const totalCopel = Number(
      String(fc.total_a_pagar || '0').replace(/\./g, '').replace(',', '.'),
    ) || 0;
    const copelLancada = totalCopel > 0 || Object.keys(fc.itens || {}).length > 0;
    setStatus({
      copelLancada,
      totalCopel,
      lancamentosCount: (l.data as any[] | null)?.length || 0,
      modulosAtivos: (m.data as any[] | null)?.length || 0,
    });
  }, []);

  useEffect(() => {
    if (currentCompId) {
      setStatus(null);
      loadStatus(currentCompId);
    }
  }, [currentCompId, loadStatus, version]);

  const currentComp = useMemo(
    () => competencias.find((c) => c.id === currentCompId) || null,
    [competencias, currentCompId],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const lancamentosCompleto = status && status.modulosAtivos > 0 && status.lancamentosCount >= status.modulosAtivos;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Fechamento de {currentComp ? formatCompetencia(currentComp.ano_mes) : '—'}
          </CardTitle>
          <CardDescription>
            Acompanhe o fechamento mensal e vá direto ao passo pendente. Troque a competência na barra acima.
          </CardDescription>
        </CardHeader>
      </Card>

      {!currentComp && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma competência cadastrada ainda. Crie a primeira em Cadastros Base.
          </CardContent>
        </Card>
      )}

      {currentComp && (
        <>
          {/* Fluxo mensal — 3 passos */}
          <div className="grid gap-4 md:grid-cols-3">
            <StepCard
              step={1}
              title="Fatura Copel"
              icon={Receipt}
              done={!!status?.copelLancada}
              detail={
                status
                  ? status.copelLancada
                    ? `Total: ${brl(status.totalCopel)}`
                    : 'Ainda não lançada'
                  : '—'
              }
              cta="Abrir Fatura Copel"
              onClick={() => onGoTo('fatura')}
            />
            <StepCard
              step={2}
              title="Lançamentos por Módulo"
              icon={ClipboardList}
              done={!!lancamentosCompleto}
              detail={
                status
                  ? `${status.lancamentosCount} de ${status.modulosAtivos} módulos`
                  : '—'
              }
              cta="Abrir Lançamentos"
              onClick={() => onGoTo('lancamentos')}
            />
            <StepCard
              step={3}
              title="Faturas por Cliente"
              icon={Users}
              done={!!(status?.copelLancada && lancamentosCompleto)}
              detail={
                status?.copelLancada && lancamentosCompleto
                  ? 'Pronto para gerar'
                  : 'Aguardando passos 1 e 2'
              }
              cta="Abrir Faturas"
              onClick={() => onGoTo('faturas')}
            />
          </div>

          {/* Resumo rápido */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pendências do fechamento</CardTitle>
              <CardDescription>Clique para ir direto ao ponto que falta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ChecklistItem
                done={!!status?.copelLancada}
                label="Fatura Copel lançada e conferida"
                onClick={() => onGoTo('fatura')}
              />
              <ChecklistItem
                done={!!lancamentosCompleto}
                label={`Lançamentos de todos os módulos (${status?.lancamentosCount ?? 0}/${status?.modulosAtivos ?? 0})`}
                onClick={() => onGoTo('lancamentos')}
              />
              <ChecklistItem
                done={!!(status?.copelLancada && lancamentosCompleto)}
                label="Faturas por cliente conferidas contra a Copel"
                onClick={() => onGoTo('faturas')}
              />
              <ChecklistItem
                done={currentComp.status === 'fechada'}
                label="Competência fechada (bloqueia edições)"
              />
            </CardContent>
          </Card>

          {status?.copelLancada && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo desta competência</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Fatura Copel</div>
                    <div className="text-2xl font-semibold font-mono">{brl(status.totalCopel)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Módulos lançados</div>
                    <div className="text-2xl font-semibold font-mono">
                      {status.lancamentosCount}
                      <span className="text-base text-muted-foreground font-normal"> / {status.modulosAtivos}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="mt-1">
                      {currentComp.status === 'fechada' ? (
                        <Badge variant="secondary">Competência fechada</Badge>
                      ) : (
                        <Badge>Rascunho</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StepCard({
  step, title, icon: Icon, done, detail, cta, onClick,
}: {
  step: number;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  done: boolean;
  detail: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <Card className={done ? 'border-primary/40' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${done ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {step}
            </div>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : (
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <CardTitle className="text-base pt-2">{title}</CardTitle>
        <CardDescription>{detail}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant={done ? 'outline' : 'default'} size="sm" className="w-full" onClick={onClick}>
          {cta} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}