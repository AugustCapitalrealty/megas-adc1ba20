import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { Download, PieChart } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoMega from '@/assets/logos/logo-mega.png';

const loadImageAsBase64 = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
};

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

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const orange: [number, number, number] = [232, 119, 34];
    const grey: [number, number, number] = [100, 102, 106];
    const white: [number, number, number] = [255, 255, 255];

    // Orange header band
    doc.setFillColor(...orange);
    doc.rect(0, 0, pageWidth, 70, 'F');

    // Logo
    try {
      const logoBase64 = await loadImageAsBase64(logoMega);
      doc.addImage(logoBase64, 'PNG', 14, 8, 50, 50);
    } catch { /* proceed without logo */ }

    // Title on orange band
    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Demonstrativo de Rateio', 72, 28);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('entre Condomínios', 72, 40);

    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, 76, pageWidth - 14, 76);

    // Info section below header
    let yPos = 84;
    doc.setFontSize(10);
    if (protocolo) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...grey);
      doc.text('Protocolo: ', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(protocolo, 14 + doc.getTextWidth('Protocolo: '), yPos);
      yPos += 8;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grey);
    doc.text('Tipo de Rateio: ', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(tipoRateio === 'por_unidade' ? 'Por Unidade (igual)' : 'Por Área (proporcional)', 14 + doc.getTextWidth('Tipo de Rateio: '), yPos);
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Valor Total: ', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text((valorTotal ?? total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 14 + doc.getTextWidth('Valor Total: '), yPos);
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Data: ', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), 14 + doc.getTextWidth('Data: '), yPos);
    yPos += 12;

    // Table
    autoTable(doc, {
      startY: yPos,
      head: [['Condomínio', 'Área (m²)', '%', 'Valor (R$)']],
      body: [
        ...rateioValores.map(r => [
          EMPREENDIMENTO_LABELS[r.empreendimento as Empreendimento] || r.empreendimento,
          r.area_m2.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
          `${r.percentual.toFixed(2)}%`,
          r.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        ]),
        [
          { content: 'Total', styles: { fontStyle: 'bold', fillColor: grey, textColor: white } },
          { content: totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: grey, textColor: white } },
          { content: '100,00%', styles: { fontStyle: 'bold', fillColor: grey, textColor: white } },
          { content: (valorTotal ?? total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), styles: { fontStyle: 'bold', fillColor: grey, textColor: white } },
        ],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: orange, textColor: white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...grey);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);
    doc.setFontSize(8);
    doc.setTextColor(...grey);
    doc.text(`Mega Centro Logístico — Documento gerado em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, 14, pageHeight - 14);

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
