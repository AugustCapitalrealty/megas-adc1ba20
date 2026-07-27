import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Lock, Unlock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSharedCompetencia } from './CompetenciaContext';

interface Competencia { id: string; ano_mes: string; status: 'rascunho' | 'fechada' }

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function formatCompetencia(ano_mes: string) {
  const [ano, mes] = (ano_mes || '').split('-');
  const m = parseInt(mes, 10);
  return `${MESES[m - 1] ?? mes}/${ano}`;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Barra única de contexto da competência — visível em todas as telas do
 * fechamento de energia. Substitui os seletores duplicados em cada aba.
 */
export function EnergiaCompetenciaBar() {
  const { user } = useAuth();
  const { currentCompId, setCurrentCompId, version, bumpCompetencias } = useSharedCompetencia();
  const [competencias, setCompetencias] = useState<Competencia[]>([]);
  const [totalCopel, setTotalCopel] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('energia_competencias')
        .select('id, ano_mes, status')
        .order('ano_mes', { ascending: false });
      const list = (data as Competencia[] | null) || [];
      setCompetencias(list);
      if (!currentCompId && list.length > 0) setCurrentCompId(list[0].id);
    })();
  }, [version]);

  const loadTotal = useCallback(async (compId: string) => {
    const { data } = await supabase
      .from('energia_competencia_tarifas')
      .select('fatura_copel_itens')
      .eq('competencia_id', compId)
      .maybeSingle();
    const fc: any = (data as any)?.fatura_copel_itens || {};
    const total = Number(String(fc.total_a_pagar || '0').replace(/\./g, '').replace(',', '.')) || 0;
    setTotalCopel(total);
  }, []);

  useEffect(() => {
    if (!currentCompId) return;
    setTotalCopel(null);
    loadTotal(currentCompId);
  }, [currentCompId, loadTotal, version]);

  const currentComp = useMemo(
    () => competencias.find((c) => c.id === currentCompId) || null,
    [competencias, currentCompId],
  );
  const isLocked = currentComp?.status === 'fechada';

  const toggleLock = async () => {
    if (!currentComp) return;
    setSaving(true);
    const next = isLocked ? 'rascunho' : 'fechada';
    const { error } = await supabase
      .from('energia_competencias')
      .update({
        status: next,
        fechada_em: next === 'fechada' ? new Date().toISOString() : null,
        fechada_por: next === 'fechada' ? user?.id : null,
        updated_by: user?.id,
      } as any)
      .eq('id', currentComp.id);
    setSaving(false);
    if (error) return toast.error('Erro ao atualizar status da competência');
    toast.success(next === 'fechada' ? 'Competência fechada' : 'Competência reaberta');
    bumpCompetencias();
  };

  return (
    <div className="sticky top-0 z-30 -mx-1 px-1 py-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground hidden sm:inline">Competência</span>
        <Select value={currentCompId ?? ''} onValueChange={setCurrentCompId}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            {competencias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {formatCompetencia(c.ano_mes)}{c.status === 'fechada' ? ' • fechada' : ''}
              </SelectItem>
            ))}
            {competencias.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground">Crie a primeira em Lançamentos</div>
            )}
          </SelectContent>
        </Select>

        {currentComp && (
          <span className="text-[11px] text-muted-foreground hidden md:inline">
            consumo de {formatCompetencia(mesConsumo(currentComp.ano_mes))}
          </span>
        )}
        {currentComp && (
          <Badge variant={isLocked ? 'secondary' : 'default'} className="h-7">
            {isLocked ? 'Fechada' : 'Rascunho'}
          </Badge>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
          <Zap className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Fatura Copel:</span>
          <span className="font-mono font-semibold text-foreground">
            {totalCopel === null ? '—' : brl(totalCopel)}
          </span>
        </div>

        {currentComp && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={toggleLock} disabled={saving}>
            {isLocked ? <Unlock className="h-4 w-4 mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
            {isLocked ? 'Reabrir' : 'Fechar competência'}
          </Button>
        )}
      </div>
    </div>
  );
}