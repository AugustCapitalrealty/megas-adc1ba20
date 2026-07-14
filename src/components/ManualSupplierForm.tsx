import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertTriangle, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { dbRowToFornecedor, useCNPJ } from '@/hooks/useCNPJ';
import type { Fornecedor } from '@/types';

interface ManualSupplierFormProps {
  initialCNPJ?: string;
  onCreated: (fornecedor: Fornecedor) => void;
  onCancel: () => void;
}

export function ManualSupplierForm({ initialCNPJ = '', onCreated, onCancel }: ManualSupplierFormProps) {
  const { toast } = useToast();
  const { formatCNPJ, unformatCNPJ, validateCNPJ } = useCNPJ();
  const [saving, setSaving] = useState(false);
  const [cnpj, setCnpj] = useState(initialCNPJ);
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cnaeCodigo, setCnaeCodigo] = useState('');
  const [cnaeDescricao, setCnaeDescricao] = useState('');
  const [isMei, setIsMei] = useState(false);

  const cnpjDigits = unformatCNPJ(cnpj);
  const cnpjValido = validateCNPJ(cnpjDigits);
  const canSubmit = cnpjValido && razaoSocial.trim().length >= 2 && uf.trim().length === 2 && cidade.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      // Verifica se já existe
      const { data: existing } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('cnpj', cnpjDigits)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'CNPJ já cadastrado',
          description: 'Este fornecedor já existe. Foi selecionado automaticamente.',
        });
        onCreated(dbRowToFornecedor(existing));
        return;
      }

      const enderecoLinha = [logradouro, numero, complemento, bairro].filter((v) => v.trim()).join(', ');

      const payload = {
        tipo_fornecedor: 'nacional',
        cnpj: cnpjDigits,
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim() || null,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        cep: cep.replace(/\D/g, '') || null,
        logradouro: logradouro.trim() || null,
        numero: numero.trim() || null,
        complemento: complemento.trim() || null,
        bairro: bairro.trim() || null,
        endereco: enderecoLinha || null,
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        cnae_principal_codigo: cnaeCodigo.trim() ? Number(cnaeCodigo.replace(/\D/g, '')) : null,
        cnae_principal_descricao: cnaeDescricao.trim() || null,
        is_mei: isMei,
        // ultima_atualizacao_api deixado null de propósito → botão "Atualizar" tentará enriquecer depois
      };

      const { data, error } = await supabase
        .from('fornecedores')
        .insert(payload as never)
        .select()
        .single();

      if (error) throw error;
      toast({ title: 'Fornecedor cadastrado manualmente', description: 'Você poderá atualizar os dados da Receita Federal quando a API voltar.' });
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

  const formatCep = (v: string) => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h4 className="font-semibold">Cadastro manual (contingência)</h4>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          Dados <strong>não validados</strong> pela Receita Federal. Preencha com cuidado — você poderá clicar em
          <em> "Atualizar dados da Receita Federal"</em> mais tarde para enriquecer automaticamente.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label>CNPJ *</Label>
          <Input
            value={formatCNPJ(cnpj)}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
          {cnpj && !cnpjValido && (
            <p className="text-xs text-destructive mt-1">CNPJ inválido</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label>Razão social *</Label>
          <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} maxLength={200} />
        </div>
        <div className="md:col-span-2">
          <Label>Nome fantasia</Label>
          <Input value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} maxLength={200} />
        </div>

        <div>
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} maxLength={30} />
        </div>

        <div>
          <Label>CEP</Label>
          <Input value={formatCep(cep)} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
        </div>
        <div>
          <Label>Logradouro</Label>
          <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} maxLength={200} />
        </div>
        <div>
          <Label>Número</Label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={20} />
        </div>
        <div>
          <Label>Complemento</Label>
          <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label>Bairro</Label>
          <Input value={bairro} onChange={(e) => setBairro(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label>Cidade *</Label>
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={100} />
        </div>
        <div>
          <Label>UF *</Label>
          <Input
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            placeholder="PR"
          />
        </div>

        <div>
          <Label>CNAE principal (código)</Label>
          <Input value={cnaeCodigo} onChange={(e) => setCnaeCodigo(e.target.value)} placeholder="Ex.: 4321500" />
        </div>
        <div>
          <Label>CNAE principal (descrição)</Label>
          <Input value={cnaeDescricao} onChange={(e) => setCnaeDescricao(e.target.value)} maxLength={200} />
        </div>

        <div className="md:col-span-2 flex items-center space-x-2 pt-1">
          <Checkbox id="manual-mei" checked={isMei} onCheckedChange={(c) => setIsMei(!!c)} />
          <Label htmlFor="manual-mei" className="cursor-pointer">MEI (Microempreendedor Individual)</Label>
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