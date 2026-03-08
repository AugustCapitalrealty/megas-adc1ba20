import { useState, useEffect } from 'react';
import { Check, FileText, Loader2, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  type EtapaJuridica,
  type AcompanhamentoJuridico,
  ETAPA_JURIDICA_LABELS,
  ETAPAS_JURIDICAS_ORDEM,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatBR } from '@/lib/date-utils';

interface JuridicoTrackerProps {
  solicitacaoId: string;
  readOnly?: boolean;
  className?: string;
}

export function JuridicoTracker({ solicitacaoId, readOnly = false, className }: JuridicoTrackerProps) {
  const [registros, setRegistros] = useState<AcompanhamentoJuridico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [etapaSelecionada, setEtapaSelecionada] = useState<EtapaJuridica | ''>('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchRegistros = async () => {
    const { data, error } = await supabase
      .from('acompanhamento_juridico')
      .select('*')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Fetch profile names for each record
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      setRegistros(data.map(r => ({
        ...r,
        etapa: r.etapa as EtapaJuridica,
        profile: { full_name: profileMap.get(r.user_id) || null },
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRegistros();
  }, [solicitacaoId]);

  // Determine completed stages and current stage
  const etapasRegistradas = registros.map(r => r.etapa);
  const ultimaEtapa = etapasRegistradas.length > 0 ? etapasRegistradas[etapasRegistradas.length - 1] : null;
  const ultimaEtapaIndex = ultimaEtapa ? ETAPAS_JURIDICAS_ORDEM.indexOf(ultimaEtapa) : -1;

  // Available next stages for registration
  const etapasDisponiveis = ETAPAS_JURIDICAS_ORDEM.filter(e => !etapasRegistradas.includes(e));

  const handleRegistrar = async () => {
    if (!etapaSelecionada) return;
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from('acompanhamento_juridico')
      .insert({
        solicitacao_id: solicitacaoId,
        etapa: etapaSelecionada,
        observacao: observacao.trim() || null,
        user_id: user.id,
      });

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível registrar a etapa.', variant: 'destructive' });
      setSaving(false);
      return;
    }

    // Log in historico
    await supabase.from('historico_solicitacoes').insert({
      solicitacao_id: solicitacaoId,
      user_id: user.id,
      acao: 'etapa_juridica',
      motivo: `Etapa jurídica: ${ETAPA_JURIDICA_LABELS[etapaSelecionada]}${observacao.trim() ? ` — ${observacao.trim()}` : ''}`,
    });

    toast({ title: 'Etapa registrada', description: ETAPA_JURIDICA_LABELS[etapaSelecionada] });
    setModalOpen(false);
    setEtapaSelecionada('');
    setObservacao('');
    setSaving(false);
    fetchRegistros();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Carregando acompanhamento jurídico...</span>
      </div>
    );
  }

  // If no records and read-only, show nothing
  if (registros.length === 0 && readOnly) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Acompanhamento jurídico ainda não iniciado.
        </p>
      </div>
    );
  }

  const registroMap = new Map(registros.map(r => [r.etapa, r]));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Acompanhamento Jurídico
        </p>
        {!readOnly && etapasDisponiveis.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Registrar Etapa
          </Button>
        )}
      </div>

      {/* Stepper visual */}
      <div className="relative">
        {/* Mobile: vertical list */}
        <div className="space-y-1">
          {ETAPAS_JURIDICAS_ORDEM.map((etapa, index) => {
            const registro = registroMap.get(etapa);
            const isCompleted = !!registro;
            const isCurrent = etapa === ultimaEtapa;
            const isPast = ETAPAS_JURIDICAS_ORDEM.indexOf(etapa) < ultimaEtapaIndex;

            return (
              <div
                key={etapa}
                className={cn(
                  'flex items-start gap-3 p-2 rounded-md transition-colors',
                  isCompleted && 'bg-primary/5',
                  isCurrent && 'bg-primary/10 ring-1 ring-primary/20',
                )}
              >
                {/* Step indicator */}
                <div className="flex flex-col items-center pt-0.5">
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all',
                      isCompleted && !isCurrent && 'bg-primary text-primary-foreground',
                      isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                      !isCompleted && 'bg-muted text-muted-foreground border border-border',
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
                  </div>
                  {index < ETAPAS_JURIDICAS_ORDEM.length - 1 && (
                    <div className={cn(
                      'w-0.5 h-4 mt-1 rounded-full',
                      isPast || isCurrent ? 'bg-primary/40' : 'bg-border',
                    )} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    isCompleted ? 'text-foreground' : 'text-muted-foreground',
                  )}>
                    {ETAPA_JURIDICA_LABELS[etapa]}
                  </p>
                  {registro && (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {registro.profile?.full_name || 'Usuário'} • {formatBR(registro.created_at, "dd/MM/yy 'às' HH:mm")}
                      </p>
                      {registro.observacao && (
                        <p className="text-xs text-muted-foreground/80 flex items-start gap-1">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          {registro.observacao}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {isCurrent && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">Atual</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de registro */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Etapa Jurídica</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={etapaSelecionada} onValueChange={(v) => setEtapaSelecionada(v as EtapaJuridica)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa" />
                </SelectTrigger>
                <SelectContent>
                  {etapasDisponiveis.map(e => (
                    <SelectItem key={e} value={e}>{ETAPA_JURIDICA_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                placeholder="Detalhes sobre esta etapa..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRegistrar} disabled={!etapaSelecionada || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
