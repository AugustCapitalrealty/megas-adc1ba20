import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { Download, PieChart } from 'lucide-react';
import { generateRateioPDF } from '@/lib/rateio-pdf';

interface RateioValor {
  empreendimento: string;
  area_m2: number;
  percentual: number;
  valor: number;
}

interface RateioCardProps {
  tipoRateio: string;
  rateioValores: RateioValor[];
  protocolo?: string;
  valorTotal?: number;
}

export function RateioCard({ tipoRateio, rateioValores, protocolo, valorTotal }: RateioCardProps) {
  if (!rateioValores || rateioValores.length === 0) return null;

  const total = rateioValores.reduce((s, r) => s + r.valor, 0);
  const totalArea = rateioValores.reduce((s, r) => s + r.area_m2, 0);

  const handleDownloadPDF = () => {
    generateRateioPDF({
      tipoRateio,
      rateioValores,
      protocolo: protocolo || 'SEM-PROTOCOLO',
      valorTotal: valorTotal ?? total,
    });
  };

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <PieChart className="h-4 w-4 text-blue-600" />
            Demonstrativo de Rateio
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {tipoRateio === 'por_unidade' ? 'Por Unidade' : 'Por Área (m²)'}
            </Badge>
            <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-1" />
              Baixar PDF
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
                  {totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">100,00%</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {(valorTotal ?? total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
