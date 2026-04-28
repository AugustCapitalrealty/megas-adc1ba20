import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { formatBR } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

interface JustificativaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId: string;
  protocolo: string;
  onSuccess: () => void;
}

export function JustificativaModal({ open, onOpenChange, solicitacaoId, protocolo, onSuccess }: JustificativaModalProps) {
  const { user } = useAuth();
  const [justificativa, setJustificativa] = useState('');
  const [previsaoExecucao, setPrevisaoExecucao] = useState<Date | undefined>();
  const [previsaoNf, setPrevisaoNf] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const canSave = justificativa.trim().length >= 10 && previsaoNf;

  const handleSave = async () => {
    if (!canSave || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('historico_solicitacoes')
        .insert({
          solicitacao_id: solicitacaoId,
          user_id: user.id,
          acao: 'justificativa_adiamento',
          categoria: 'acompanhamento_oc',
          motivo: justificativa.trim(),
          previsao_execucao: previsaoExecucao ? formatBR(previsaoExecucao, 'yyyy-MM-dd') : null,
          previsao_nf: previsaoNf ? formatBR(previsaoNf, 'yyyy-MM-dd') : null,
        } as any);

      if (error) throw error;
      toast.success('Justificativa registrada com sucesso');
      setJustificativa('');
      setPrevisaoExecucao(undefined);
      setPrevisaoNf(undefined);
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar justificativa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Justificativa — #{protocolo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="justificativa">Motivo do adiamento *</Label>
            <Textarea
              id="justificativa"
              placeholder="Descreva o motivo pelo qual a NF não será enviada neste mês (mín. 10 caracteres)..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={4}
              className="mt-1"
            />
            {justificativa.length > 0 && justificativa.length < 10 && (
              <p className="text-xs text-destructive mt-1">Mínimo 10 caracteres</p>
            )}
          </div>

          <div>
            <Label>Previsão de execução do serviço</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal mt-1',
                    !previsaoExecucao && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {previsaoExecucao ? formatBR(previsaoExecucao, 'dd/MM/yyyy') : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={previsaoExecucao}
                  onSelect={setPrevisaoExecucao}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Previsão de emissão da NF *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal mt-1',
                    !previsaoNf && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {previsaoNf ? formatBR(previsaoNf, 'dd/MM/yyyy') : 'Selecionar data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={previsaoNf}
                  onSelect={setPrevisaoNf}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar Justificativa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
