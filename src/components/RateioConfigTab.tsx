import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { Loader2, Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface RateioConfig {
  id: string;
  empreendimento: Empreendimento;
  area_m2: number;
  updated_at: string;
}

export function RateioConfigTab() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<RateioConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rateio_configuracao')
      .select('*')
      .order('area_m2', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar configurações de rateio');
      console.error(error);
    } else {
      const typed = (data || []) as unknown as RateioConfig[];
      setConfigs(typed);
      const values: Record<string, string> = {};
      typed.forEach(c => { values[c.id] = c.area_m2.toString(); });
      setEditValues(values);
    }
    setLoading(false);
  };

  const totalArea = configs.reduce((sum, c) => {
    const val = parseFloat(editValues[c.id] || '0');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const getPercentual = (id: string) => {
    if (totalArea === 0) return 0;
    const val = parseFloat(editValues[id] || '0');
    return isNaN(val) ? 0 : (val / totalArea) * 100;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const config of configs) {
        const newArea = parseFloat(editValues[config.id]);
        if (isNaN(newArea) || newArea <= 0) {
          toast.error(`Área inválida para ${EMPREENDIMENTO_LABELS[config.empreendimento]}`);
          setSaving(false);
          return;
        }

        const { error } = await supabase
          .from('rateio_configuracao')
          .update({ area_m2: newArea, updated_by: user?.id } as any)
          .eq('id', config.id);

        if (error) throw error;
      }
      toast.success('Configurações de rateio salvas!');
      fetchConfigs();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Configuração de Rateio entre Condomínios
        </CardTitle>
        <CardDescription>
          Defina a área (m²) de cada empreendimento. O percentual é calculado automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Condomínio</TableHead>
                <TableHead className="text-right">Área (m²)</TableHead>
                <TableHead className="text-right">Percentual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">
                    {EMPREENDIMENTO_LABELS[config.empreendimento]}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValues[config.id] || ''}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [config.id]: e.target.value }))}
                      className="w-40 text-right ml-auto"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {getPercentual(config.id).toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right font-mono">
                  {totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono">100,00%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Configurações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
