import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { type Cliente, type Empreendimento, EMPREENDIMENTO_LABELS } from '@/types';
import { Loader2, AlertCircle } from 'lucide-react';

interface ClienteSelectProps {
  empreendimento: Empreendimento | '';
  value: string | null;
  onChange: (clienteId: string | null) => void;
  required?: boolean;
}

export function ClienteSelect({ empreendimento, value, onChange, required = false }: ClienteSelectProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmpreendimentoForTodos, setSelectedEmpreendimentoForTodos] = useState<Empreendimento | ''>('');

  // Determine which empreendimento to use for filtering
  const effectiveEmpreendimento = empreendimento === 'todos' 
    ? selectedEmpreendimentoForTodos 
    : empreendimento;

  useEffect(() => {
    if (!effectiveEmpreendimento) {
      setClientes([]);
      return;
    }

    const fetchClientes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes_empreendimentos')
        .select(`
          cliente_id,
          clientes (
            id,
            nome,
            created_at
          )
        `)
        .eq('empreendimento', effectiveEmpreendimento);

      if (!error && data) {
        const clientesList = data
          .map((ce: any) => ce.clientes as Cliente)
          .filter(Boolean)
          .sort((a, b) => a.nome.localeCompare(b.nome));
        setClientes(clientesList);
      }
      setLoading(false);
    };

    fetchClientes();
  }, [effectiveEmpreendimento]);

  // Reset value when empreendimento changes
  useEffect(() => {
    onChange(null);
    setSelectedEmpreendimentoForTodos('');
  }, [empreendimento]);

  if (empreendimento === 'todos') {
    return (
      <div className="space-y-3">
        <div>
          <Label className="flex items-center gap-1">
            Empreendimento do Cliente
            {required && <span className="text-destructive">*</span>}
          </Label>
          <p className="text-xs text-muted-foreground mb-2">
            Selecione o empreendimento associado ao cliente
          </p>
          <Select 
            value={selectedEmpreendimentoForTodos} 
            onValueChange={(v) => {
              setSelectedEmpreendimentoForTodos(v as Empreendimento);
              onChange(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o empreendimento..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(EMPREENDIMENTO_LABELS)
                .filter(([key]) => key !== 'todos')
                .map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmpreendimentoForTodos && (
          <div>
            <Label className="flex items-center gap-1">
              Cliente
              {required && <span className="text-destructive">*</span>}
            </Label>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando clientes...</span>
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Nenhum cliente encontrado</span>
              </div>
            ) : (
              <Select value={value || ''} onValueChange={(v) => onChange(v || null)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Label className="flex items-center gap-1">
        Cliente
        {required && <span className="text-destructive">*</span>}
      </Label>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando clientes...</span>
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Nenhum cliente encontrado para este empreendimento</span>
        </div>
      ) : (
        <Select value={value || ''} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cliente..." />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
