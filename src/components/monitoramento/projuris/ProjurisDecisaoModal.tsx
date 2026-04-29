import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjurisRowLite {
  id: string;
  numero_requisicao: string;
  status: string | null;
  cliente_fornecedor: string | null;
  empreendimento: string | null;
  responsavel: string | null;
}

interface AcaoHistorico {
  id: string;
  acao: string;
  observacao: string | null;
  status_anterior: string | null;
  status_novo: string | null;
  proxima_revisao: string | null;
  created_at: string;
  user_id: string;
}

interface Props {
  row: ProjurisRowLite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusOptions: string[];
  onSaved: () => void;
}

const ACOES_RAPIDAS: Array<{ key: string; label: string; suggestedStatus?: string }> = [
  { key: 'minuta_enviada_fornecedor', label: 'Minuta enviada ao Fornecedor', suggestedStatus: 'AGUARDANDO INFORMAÇÕES' },
  { key: 'minuta_recebida_fornecedor', label: 'Minuta recebida do Fornecedor', suggestedStatus: 'EM REQUISIÇÃO' },
  { key: 'aguardando_assinatura_fornecedor', label: 'Aguardando assinatura do Fornecedor', suggestedStatus: 'AGUARDANDO INFORMAÇÕES' },
  { key: 'enviado_aprovacao_interna', label: 'Enviado para aprovação interna', suggestedStatus: 'AGUARDANDO APROVAÇÃO' },
  { key: 'solicitado_complemento', label: 'Solicitado complemento de informações', suggestedStatus: 'AGUARDANDO INFORMAÇÕES' },
  { key: 'documentacao_ok', label: 'Documentação OK — pronto para execução', suggestedStatus: 'AGUARDANDO EXECUÇÃO' },
  { key: 'outro', label: 'Outro (descrever)' },
];

export function ProjurisDecisaoModal({ row, open, onOpenChange, statusOptions, onSaved }: Props) {
  const { user } = useAuth();
  const [acaoKey, setAcaoKey] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [novoStatus, setNovoStatus] = useState<string>('__keep__');
  const [proximaRevisao, setProximaRevisao] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<AcaoHistorico[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const fetchHistorico = useCallback(async () => {
    if (!row) return;
    setLoadingHist(true);
    const { data } = await supabase
      .from('projuris_acoes')
      .select('id, acao, observacao, status_anterior, status_novo, proxima_revisao, created_at, user_id')
      .eq('requisicao_id', row.id)
      .order('created_at', { ascending: false });
    setHistorico((data as AcaoHistorico[]) || []);
    setLoadingHist(false);
  }, [row]);

  useEffect(() => {
    if (open && row) {
      setAcaoKey('');
      setObservacao('');
      setNovoStatus('__keep__');
      setProximaRevisao('');
      fetchHistorico();
    }
  }, [open, row, fetchHistorico]);

  const handleSelectAcao = (key: string) => {
    setAcaoKey(key);
    const def = ACOES_RAPIDAS.find(a => a.key === key);
    if (def && key !== 'outro') {
      setObservacao(def.label);
      if (def.suggestedStatus && statusOptions.includes(def.suggestedStatus)) {
        setNovoStatus(def.suggestedStatus);
      }
    } else if (key === 'outro') {
      setObservacao('');
    }
  };

  const canSave = !!acaoKey && !!observacao.trim() && !!user && !!row;

  const handleSave = async () => {
    if (!canSave || !row || !user) return;
    setSaving(true);
    try {
      const statusMudou = novoStatus !== '__keep__' && novoStatus !== row.status;
      const statusAnterior = row.status;
      const statusNovo = statusMudou ? novoStatus : null;

      const { error: actErr } = await supabase.from('projuris_acoes').insert({
        requisicao_id: row.id,
        user_id: user.id,
        acao: acaoKey,
        observacao: observacao.trim(),
        status_anterior: statusAnterior,
        status_novo: statusNovo,
        proxima_revisao: proximaRevisao || null,
      });
      if (actErr) throw actErr;

      if (statusMudou) {
        const { error: updErr } = await supabase
          .from('projuris_requisicoes')
          .update({ status: novoStatus, updated_at: new Date().toISOString() })
          .eq('id', row.id);
        if (updErr) throw updErr;
      }

      toast({ title: 'Ação registrada', description: statusMudou ? `Status atualizado para ${novoStatus}` : 'Histórico atualizado.' });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>Tomar ação · Requisição {row.numero_requisicao}</span>
            {row.status && <Badge variant="outline" className="text-xs">{row.status}</Badge>}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {row.cliente_fornecedor || '—'} · {row.empreendimento || '—'} · Resp.: {row.responsavel || '—'}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Ação</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {ACOES_RAPIDAS.map(a => (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => handleSelectAcao(a.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs border transition-colors',
                      acaoKey === a.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border',
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Atualizar status</Label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">Manter ({row.status || '—'})</SelectItem>
                    {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Próxima revisão (opcional)</Label>
                <Input
                  type="date"
                  value={proximaRevisao}
                  onChange={e => setProximaRevisao(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observação</Label>
              <Textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Detalhe a ação tomada..."
                rows={3}
                className="mt-1.5"
              />
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Histórico de ações</p>
              {loadingHist ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>
              ) : historico.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhuma ação registrada ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {historico.map(h => (
                    <li key={h.id} className="text-xs border-l-2 border-primary/40 pl-3 py-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                        <span className="font-medium">{h.observacao || h.acao}</span>
                        {h.status_novo && (
                          <Badge variant="outline" className="text-[10px]">
                            {h.status_anterior || '—'} → {h.status_novo}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {format(new Date(h.created_at), 'dd/MM/yyyy HH:mm')}
                        {h.proxima_revisao && <span>· Revisão: {format(new Date(h.proxima_revisao), 'dd/MM/yyyy')}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar ação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}