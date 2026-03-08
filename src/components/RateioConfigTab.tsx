import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import { Loader2, Save, Building2, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoMega from '@/assets/logos/logo-mega.png';

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

  const handleGenerateTestPDF = async () => {
    const valorTotal = Math.round(Math.random() * 90000 + 10000);
    const totalAreaCalc = configs.reduce((sum, c) => {
      const val = parseFloat(editValues[c.id] || '0');
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const rateioValores = configs.map(c => {
      const area = parseFloat(editValues[c.id] || '0') || 0;
      const pct = totalAreaCalc > 0 ? (area / totalAreaCalc) * 100 : 0;
      return {
        empreendimento: c.empreendimento,
        area_m2: area,
        percentual: pct,
        valor: valorTotal * (pct / 100),
      };
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const orange: [number, number, number] = [232, 119, 34];
    const grey: [number, number, number] = [100, 102, 106];
    const white: [number, number, number] = [255, 255, 255];

    doc.setFillColor(...orange);
    doc.rect(0, 0, pageWidth, 70, 'F');

    try {
      const logoBase64 = await loadImageAsBase64(logoMega);
      doc.addImage(logoBase64, 'PNG', 14, 8, 50, 50);
    } catch { /* proceed without logo */ }

    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Demonstrativo de Rateio', 72, 28);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('entre Condomínios', 72, 40);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, 76, pageWidth - 14, 76);

    let yPos = 84;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grey);
    doc.text('Protocolo: ', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text('TESTE-0000', 14 + doc.getTextWidth('Protocolo: '), yPos);
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Tipo de Rateio: ', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text('Por Área (proporcional)', 14 + doc.getTextWidth('Tipo de Rateio: '), yPos);
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Valor Total: ', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 14 + doc.getTextWidth('Valor Total: '), yPos);
    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Data: ', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), 14 + doc.getTextWidth('Data: '), yPos);
    yPos += 12;

    const totalAreaFinal = rateioValores.reduce((s, r) => s + r.area_m2, 0);

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
          { content: 'Total', styles: { fontStyle: 'bold' as const, fillColor: grey, textColor: white } },
          { content: totalAreaFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold' as const, fillColor: grey, textColor: white } },
          { content: '100,00%', styles: { fontStyle: 'bold' as const, fillColor: grey, textColor: white } },
          { content: valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), styles: { fontStyle: 'bold' as const, fillColor: grey, textColor: white } },
        ],
      ],
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: orange, textColor: white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 14, right: 14 },
      columnStyles: { 0: { cellWidth: 60 } },
    });

    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...grey);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 24, pageWidth - 14, pageHeight - 24);
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.setFont('helvetica', 'italic');
    doc.text('Documento confidencial', pageWidth / 2, pageHeight - 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Mega Centro Logístico — Documento gerado em ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, 14, pageHeight - 12);

    doc.save('rateio_TESTE-0000.pdf');
    toast.success('PDF de teste gerado!');
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
