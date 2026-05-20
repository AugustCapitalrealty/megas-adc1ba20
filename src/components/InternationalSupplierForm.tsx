import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { dbRowToFornecedor } from '@/hooks/useCNPJ';
import { PAISES, MOEDAS, getPais } from '@/lib/paises';
import type { Fornecedor } from '@/types';

interface InternationalSupplierFormProps {
  onCreated: (fornecedor: Fornecedor) => void;
  onCancel: () => void;
}

type TipoId = 'VAT' | 'EIN' | 'TAX_ID' | 'OTHER';

export function InternationalSupplierForm({ onCreated, onCancel }: InternationalSupplierFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [pais, setPais] = useState('US');
  const [tipoId, setTipoId] = useState<TipoId>('VAT');
  const [identificador, setIdentificador] = useState('');
  const [moeda, setMoeda] = useState('USD');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  const handlePaisChange = (iso: string) => {
    setPais(iso);
    const p = getPais(iso);
    if (p) setMoeda(p.moeda);
  };

  const canSubmit = razaoSocial.trim().length >= 2 && !!pais && identificador.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert({
          tipo_fornecedor: 'internacional',
          cnpj: null,
          razao_social: razaoSocial.trim(),
          nome_fantasia: nomeFantasia.trim() || null,
          pais,
          identificador_fiscal: identificador.trim(),
          tipo_identificador_fiscal: tipoId,
          moeda_padrao: moeda,
          endereco: endereco.trim() || null,
          cidade: cidade.trim() || null,
          email: email.trim() || null,
          telefone: telefone.trim() || null,
          is_mei: false,
        } as never)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Fornecedor internacional cadastrado' });
      onCreated(dbRowToFornecedor(data));
    } catch (e: any) {
      toast({
        title: 'Erro ao cadastrar',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <h4 className="font-semibold">Cadastrar fornecedor internacional</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label>Razão social *</Label>
          <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Ex.: Lovable Labs Incorporated" />
        </div>
        <div className="md:col-span-2">
          <Label>Nome fantasia</Label>
          <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} />
        </div>

        <div>
          <Label>País *</Label>
          <Select value={pais} onValueChange={handlePaisChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAISES.map((p) => (
                <SelectItem key={p.iso} value={p.iso}>{p.bandeira} {p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Moeda padrão</Label>
          <Select value={moeda} onValueChange={setMoeda}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOEDAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tipo de identificador</Label>
          <Select value={tipoId} onValueChange={(v) => setTipoId(v as TipoId)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="VAT">VAT</SelectItem>
              <SelectItem value="EIN">EIN</SelectItem>
              <SelectItem value="TAX_ID">TAX ID</SelectItem>
              <SelectItem value="OTHER">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Identificador fiscal *</Label>
          <Input value={identificador} onChange={(e) => setIdentificador(e.target.value)} placeholder="Ex.: EU372090612" />
        </div>

        <div className="md:col-span-2">
          <Label>Endereço</Label>
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, complemento" />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar fornecedor
        </Button>
      </div>
    </div>
  );
}