import { AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SupplierSearch } from '@/components/SupplierSearch';
import { CNAECompatibilityBadge } from '@/components/CNAECompatibilityBadge';
import { MEIAlertBadge } from '@/components/MEIAlertBadge';
import type { StepProps } from '../types';

export function FornecedorStep({ formState, derived, setters }: StepProps) {
  const {
    fornecedor, fornecedorConcorrente1, fornecedorConcorrente2,
    fornecimentoExclusivo, justificativaExclusividade,
    excecaoFornecedores, justificativaFornecedores, descricao,
  } = formState;
  const { requires3CNPJs, valorNumerico } = derived;

  return (
    <div className="space-y-6">
      <SupplierSearch label="Fornecedor Principal" required value={fornecedor} onChange={setters.setFornecedor} />

      {fornecedor && (
        <div className="space-y-3 mt-4">
          {(fornecedor.tipo_fornecedor ?? 'nacional') !== 'internacional' && fornecedor.is_mei && (
            <MEIAlertBadge showInlineAlert valorTotal={valorNumerico} />
          )}
          {(fornecedor.tipo_fornecedor ?? 'nacional') !== 'internacional' && fornecedor.cnae_principal_codigo && (
            <CNAECompatibilityBadge descricao={descricao} fornecedor={fornecedor} enabled={descricao.length >= 20} />
          )}
        </div>
      )}

      {/* Fornecimento Exclusivo */}
      <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="fornecimentoExclusivo"
            checked={fornecimentoExclusivo}
            onCheckedChange={(checked) => {
              setters.setFornecimentoExclusivo(!!checked);
              if (!checked) setters.setJustificativaExclusividade('');
            }}
          />
          <Label htmlFor="fornecimentoExclusivo" className="cursor-pointer font-medium text-purple-800 dark:text-purple-200">
            Fornecimento Exclusivo
          </Label>
        </div>
        <p className="text-sm text-purple-700 dark:text-purple-300">
          Marque esta opção se este fornecedor é o único disponível no mercado para este serviço/material.
        </p>
        {fornecimentoExclusivo && (
          <div className="pt-2">
            <Label htmlFor="justificativaExclusividade" className="text-purple-800 dark:text-purple-200">
              Justificativa da exclusividade *
            </Label>
            <Textarea
              id="justificativaExclusividade"
              placeholder="Explique por que não existem outros fornecedores disponíveis no mercado para este serviço/material..."
              value={justificativaExclusividade}
              onChange={(e) => setters.setJustificativaExclusividade(e.target.value)}
              rows={3}
              className="mt-2 bg-background"
            />
          </div>
        )}
      </div>

      {/* 3 fornecedores */}
      {requires3CNPJs && !fornecimentoExclusivo && (
        <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Concorrência com 3 fornecedores?</Label>
            <p className="text-sm text-muted-foreground">
              AC de serviços não emergencial normalmente requer 3 fornecedores com cotações.
            </p>
            <RadioGroup
              value={excecaoFornecedores ? 'nao' : 'sim'}
              onValueChange={(v) => {
                setters.setExcecaoFornecedores(v === 'nao');
                if (v === 'sim') setters.setJustificativaFornecedores('');
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="3forn-sim" />
                <Label htmlFor="3forn-sim" className="cursor-pointer">Sim, tenho 3 fornecedores</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="3forn-nao" />
                <Label htmlFor="3forn-nao" className="cursor-pointer">Não (exceção)</Label>
              </div>
            </RadioGroup>
          </div>

          {!excecaoFornecedores && (
            <>
              <SupplierSearch label="Fornecedor Concorrente 1" required value={fornecedorConcorrente1} onChange={setters.setFornecedorConcorrente1} />
              <SupplierSearch label="Fornecedor Concorrente 2" required value={fornecedorConcorrente2} onChange={setters.setFornecedorConcorrente2} />
            </>
          )}

          {excecaoFornecedores && (
            <div className="pt-4 border-t">
              <Label htmlFor="justificativa" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Justificativa para exceção (obrigatória)
              </Label>
              <Textarea
                id="justificativa"
                placeholder="Explique por que não foi possível obter 3 orçamentos de fornecedores diferentes..."
                value={justificativaFornecedores}
                onChange={(e) => setters.setJustificativaFornecedores(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
