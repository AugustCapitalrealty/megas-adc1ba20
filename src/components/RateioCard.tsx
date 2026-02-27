import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { Download, PieChart } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text('Demonstrativo de Rateio entre Condomínios', 14, 20);

    // Info
    doc.setFontSize(10);
    if (protocolo) {
      doc.text(`Protocolo: ${protocolo}`, 14, 30);
    }
    doc.text(`Tipo de Rateio: ${tipoRateio === 'por_unidade' ? 'Por Unidade (igual)' : 'Por Área (proporcional)'}`, 14, 36);
    doc.text(`Valor Total: ${(valorTotal ?? total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, 42);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 48);

    // Table
    autoTable(doc, {
      startY: 56,
      head: [['Condomínio', 'Área (m²)', '%', 'Valor (R$)']],
      body: [
        ...rateioValores.map(r => [
          EMPREENDIMENTO_LABELS[r.empreendimento as Empreendimento] || r.empreendimento,
          r.area_m2.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          `${r.percentual.toFixed(2)}%`,
          r.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        ]),
        [
          { content: 'Total', styles: { fontStyle: 'bold' } },
          { content: totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' } },
          { content: '100,00%', styles: { fontStyle: 'bold' } },
          { content: (valorTotal ?? total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), styles: { fontStyle: 'bold' } },
        ],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`rateio_${protocolo || 'demonstrativo'}.pdf`);
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
