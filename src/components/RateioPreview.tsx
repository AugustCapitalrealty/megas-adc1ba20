import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { Loader2, PieChart } from 'lucide-react';

export interface RateioValor {
  empreendimento: string;
  area_m2: number;
  percentual: number;
  valor: number;
}

interface RateioPreviewProps {
  valorTotal: number;
  tipoRateio: string;
  onTipoRateioChange: (tipo: string) => void;
  onRateioValoresChange: (valores: RateioValor[]) => void;
  selectedEmpreendimentos: string[];
  onSelectedEmpreendimentosChange: (selected: string[]) => void;
}

const EMPREENDIMENTOS_RATEIO: Empreendimento[] = ['mega_esteio', 'mega_itajai', 'mega_curitiba', 'mega_canoas'];

export function RateioPreview({ valorTotal, tipoRateio, onTipoRateioChange, onRateioValoresChange, selectedEmpreendimentos, onSelectedEmpreendimentosChange }: RateioPreviewProps) {
  const [configs, setConfigs] = useState<{ empreendimento: string; area_m2: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('rateio_configuracao')
        .select('empreendimento, area_m2')
        .in('empreendimento', EMPREENDIMENTOS_RATEIO);

      if (data) {
        setConfigs(data as unknown as { empreendimento: string; area_m2: number }[]);
        // Initialize selected if empty
        if (selectedEmpreendimentos.length === 0) {
          onSelectedEmpreendimentosChange(data.map((d: any) => d.empreendimento));
        }
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const filteredConfigs = useMemo(() => {
    return configs.filter(c => selectedEmpreendimentos.includes(c.empreendimento));
  }, [configs, selectedEmpreendimentos]);

  const rateioValores = useMemo(() => {
    if (filteredConfigs.length === 0 || valorTotal <= 0) return [];

    if (tipoRateio === 'por_unidade') {
      const valorPorUnidade = valorTotal / filteredConfigs.length;
      const percentual = 100 / filteredConfigs.length;
      return filteredConfigs.map(c => ({
        empreendimento: c.empreendimento,
        area_m2: c.area_m2,
        percentual: Math.round(percentual * 100) / 100,
        valor: Math.round(valorPorUnidade * 100) / 100,
      }));
    }

    // por_area
    const totalArea = filteredConfigs.reduce((s, c) => s + c.area_m2, 0);
    if (totalArea === 0) return [];
    return filteredConfigs.map(c => {
      const pct = (c.area_m2 / totalArea) * 100;
      return {
        empreendimento: c.empreendimento,
        area_m2: c.area_m2,
        percentual: Math.round(pct * 100) / 100,
        valor: Math.round((valorTotal * pct / 100) * 100) / 100,
      };
    });
  }, [filteredConfigs, valorTotal, tipoRateio]);

  useEffect(() => {
    onRateioValoresChange(rateioValores);
  }, [rateioValores, onRateioValoresChange]);

  const handleToggleEmpreendimento = (emp: string, checked: boolean) => {
    if (checked) {
      onSelectedEmpreendimentosChange([...selectedEmpreendimentos, emp]);
    } else {
      // Don't allow deselecting all
      const newSelected = selectedEmpreendimentos.filter(e => e !== emp);
      if (newSelected.length > 0) {
        onSelectedEmpreendimentosChange(newSelected);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando configurações de rateio...
      </div>
    );
  }

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <PieChart className="h-4 w-4 text-blue-600" />
          Rateio entre Condomínios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Empreendimento selection */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Condomínios participantes do rateio</Label>
          <div className="grid grid-cols-2 gap-2">
            {configs.map((c) => (
              <label
                key={c.empreendimento}
                className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selectedEmpreendimentos.includes(c.empreendimento)}
                  onCheckedChange={(checked) => handleToggleEmpreendimento(c.empreendimento, !!checked)}
                />
                <span className="text-sm">
                  {EMPREENDIMENTO_LABELS[c.empreendimento as Empreendimento] || c.empreendimento}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Selecione ao menos 2 condomínios para o rateio</p>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Tipo de Rateio</Label>
          <RadioGroup value={tipoRateio} onValueChange={onTipoRateioChange} className="flex gap-4">
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer flex-1">
              <RadioGroupItem value="por_unidade" id="rateio_unidade" />
              <Label htmlFor="rateio_unidade" className="cursor-pointer">
                <span className="font-medium">Por Unidade</span>
                <span className="block text-xs text-muted-foreground">Valor igual para cada condomínio</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer flex-1">
              <RadioGroupItem value="por_area" id="rateio_area" />
              <Label htmlFor="rateio_area" className="cursor-pointer">
                <span className="font-medium">Por Área (m²)</span>
                <span className="block text-xs text-muted-foreground">Proporcional à área de cada condomínio</span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {valorTotal > 0 && rateioValores.length > 0 && (
          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Condomínio</TableHead>
                  <TableHead className="text-right">Área (m²)</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Valor (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateioValores.map((r) => (
                  <TableRow key={r.empreendimento}>
                    <TableCell className="font-medium">
                      {EMPREENDIMENTO_LABELS[r.empreendimento as Empreendimento] || r.empreendimento}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.area_m2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {r.percentual.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {r.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {rateioValores.reduce((s, r) => s + r.area_m2, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">100,00%</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
