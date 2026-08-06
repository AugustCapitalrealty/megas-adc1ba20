import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileSignature } from 'lucide-react';
import { maskCPF, maskTelefone } from '@/lib/signatarios';
import { FieldError } from './FieldError';

export interface SignatarioValues {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
}

interface PessoaProps {
  titulo: string;
  prefixo: string;
  values: SignatarioValues;
  onChange: (campo: keyof SignatarioValues, valor: string) => void;
  errors?: Record<string, string | undefined>;
}

function PessoaFields({ titulo, prefixo, values, onChange, errors }: PessoaProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{titulo}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${prefixo}-nome`}>Nome completo</Label>
          <Input
            id={`${prefixo}-nome`}
            value={values.nome}
            onChange={(e) => onChange('nome', e.target.value)}
            placeholder="Nome como consta no documento"
            className="bg-background"
          />
          <FieldError message={errors?.[`${prefixo}Nome`]} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${prefixo}-cpf`}>CPF</Label>
          <Input
            id={`${prefixo}-cpf`}
            value={values.cpf}
            onChange={(e) => onChange('cpf', maskCPF(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="bg-background"
          />
          <FieldError message={errors?.[`${prefixo}Cpf`]} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${prefixo}-email`}>E-mail</Label>
          <Input
            id={`${prefixo}-email`}
            type="email"
            value={values.email}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="nome@empresa.com.br"
            className="bg-background"
          />
          <FieldError message={errors?.[`${prefixo}Email`]} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${prefixo}-telefone`}>Telefone</Label>
          <Input
            id={`${prefixo}-telefone`}
            value={values.telefone}
            onChange={(e) => onChange('telefone', maskTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            inputMode="numeric"
            className="bg-background"
          />
          <FieldError message={errors?.[`${prefixo}Telefone`]} />
        </div>
      </div>
    </div>
  );
}

interface SignatariosBlockProps {
  representante: SignatarioValues;
  testemunha: SignatarioValues;
  onRepresentanteChange: (campo: keyof SignatarioValues, valor: string) => void;
  onTestemunhaChange: (campo: keyof SignatarioValues, valor: string) => void;
  errors?: Record<string, string | undefined>;
}

export function SignatariosBlock({
  representante, testemunha, onRepresentanteChange, onTestemunhaChange, errors,
}: SignatariosBlockProps) {
  return (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-5">
      <div className="flex items-start gap-2">
        <FileSignature className="h-4 w-4 mt-0.5 text-primary" />
        <div>
          <p className="font-medium text-sm">Dados para assinatura (Webdox)</p>
          <p className="text-xs text-muted-foreground">
            Obrigatório para termos e contratos. Sem esses dados o jurídico não consegue abrir a requisição no Webdox.
          </p>
        </div>
      </div>
      <PessoaFields
        titulo="Representante legal do fornecedor"
        prefixo="representanteLegal"
        values={representante}
        onChange={onRepresentanteChange}
        errors={errors}
      />
      <PessoaFields
        titulo="Testemunha"
        prefixo="testemunha"
        values={testemunha}
        onChange={onTestemunhaChange}
        errors={errors}
      />
    </div>
  );
}