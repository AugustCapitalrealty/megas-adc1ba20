import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EMPREENDIMENTO_LABELS, type Empreendimento } from '@/types';
import logoMega from '@/assets/logos/logo-mega_1.png';

interface RateioValor {
  empreendimento: string;
  area_m2: number;
  percentual: number;
  valor: number;
}

export interface RateioPDFData {
  tipoRateio: string;
  rateioValores: RateioValor[];
  protocolo: string;
  valorTotal: number;
}

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

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = () =>
  new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export async function generateRateioPDF(data: RateioPDFData) {
  const { tipoRateio, rateioValores, protocolo, valorTotal } = data;
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const orange: [number, number, number] = [232, 119, 34];
  const orangeLight: [number, number, number] = [255, 237, 220];
  const grey: [number, number, number] = [100, 102, 106];
  const greyDark: [number, number, number] = [55, 55, 60];
  const white: [number, number, number] = [255, 255, 255];
  const mx = 14; // margin x

  // ─── 1. HEADER ───────────────────────────────────────────
  doc.setFillColor(...orange);
  doc.rect(0, 0, pw, 60, 'F');

  try {
    const logoBase64 = await loadImageAsBase64(logoMega);
    doc.addImage(logoBase64, 'PNG', mx, 6, 48, 48);
  } catch { /* proceed without logo */ }

  doc.setTextColor(...white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Demonstrativo de Rateio', 70, 28);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('entre Condomínios', 70, 40);

  // ─── 2. SUMMARY CARDS (2x2 grid) ────────────────────────
  let y = 68;
  const cardW = (pw - mx * 2 - 8) / 2; // 2 columns with 8px gap
  const cardH = 22;
  const gap = 8;
  const tipoLabel = tipoRateio === 'por_unidade' ? 'Por Unidade (igual)' : 'Por Área (proporcional)';

  const cards = [
    { label: 'VALOR TOTAL', value: formatCurrency(valorTotal) },
    { label: 'TIPO DE RATEIO', value: tipoLabel },
    { label: 'DATA', value: formatDate() },
    { label: 'PROTOCOLO', value: protocolo },
  ];

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = mx + col * (cardW + gap);
    const cy = y + row * (cardH + gap);

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grey);
    doc.text(card.label, cx + 4, cy + 7);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...greyDark);
    doc.text(card.value, cx + 4, cy + 17);
  });

  y += (cardH + gap) * 2 + 6;

  // ─── 3. TABLE ────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...greyDark);
  doc.text('Detalhamento do Rateio', mx, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Condomínio', 'Área (m²)', 'Participação', 'Valor Rateado']],
    body: rateioValores.map(r => [
      EMPREENDIMENTO_LABELS[r.empreendimento as Empreendimento] || r.empreendimento,
      r.area_m2.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      `${r.percentual.toFixed(2)}%`,
      formatCurrency(r.valor),
    ]),
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: orange, textColor: white, fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: 'right' as const },
      2: { halign: 'right' as const, fillColor: orangeLight, textColor: greyDark, fontStyle: 'bold' },
      3: { halign: 'right' as const, fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: mx, right: mx },
  });

  // @ts-ignore - autoTable adds finalY
  y = (doc as any).lastAutoTable.finalY + 4;

  // ─── 4. TOTAL HIGHLIGHT BAND ────────────────────────────
  const totalArea = rateioValores.reduce((s, r) => s + r.area_m2, 0);
  doc.setFillColor(...greyDark);
  doc.roundedRect(mx, y, pw - mx * 2, 16, 2, 2, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RATEADO', mx + 6, y + 11);
  doc.text(formatCurrency(valorTotal), pw - mx - 6, y + 11, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const areaText = `Área total: ${totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²`;
  doc.text(areaText, pw / 2, y + 11, { align: 'center' });
  y += 24;

  // ─── 5. DISTRIBUTION CHART ──────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...greyDark);
  doc.text('Distribuição do Rateio', mx, y);
  y += 6;

  const maxBarW = pw - mx * 2 - 80;
  const maxPct = Math.max(...rateioValores.map(r => r.percentual));

  // Sort descending by percentual for visual clarity
  const sorted = [...rateioValores].sort((a, b) => b.percentual - a.percentual);

  sorted.forEach(r => {
    const label = EMPREENDIMENTO_LABELS[r.empreendimento as Empreendimento] || r.empreendimento;
    const barW = (r.percentual / maxPct) * maxBarW;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...greyDark);
    doc.text(label, mx, y + 4);

    doc.setFillColor(...orange);
    doc.roundedRect(mx + 50, y, barW, 6, 1, 1, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grey);
    doc.text(`${r.percentual.toFixed(2)}%`, mx + 50 + barW + 3, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(r.valor), pw - mx, y + 5, { align: 'right' });

    y += 12;
  });

  y += 4;

  // ─── 6. METHODOLOGY ─────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(mx, y, pw - mx, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...greyDark);
  doc.text('Metodologia de Cálculo', mx, y);
  y += 5;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...grey);

  const metodoTexto = tipoRateio === 'por_unidade'
    ? 'O valor total foi distribuído igualmente entre os condomínios participantes.'
    : `O valor total foi distribuído proporcionalmente à área construída de cada condomínio. Área total considerada: ${totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m².`;

  doc.text(metodoTexto, mx, y, { maxWidth: pw - mx * 2 });

  // ─── 7. FOOTER ───────────────────────────────────────────
  doc.setDrawColor(...grey);
  doc.setLineWidth(0.5);
  doc.line(mx, ph - 22, pw - mx, ph - 22);

  doc.setFontSize(7);
  doc.setTextColor(...grey);
  doc.setFont('helvetica', 'italic');
  doc.text('Documento confidencial', pw / 2, ph - 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `Capital Realty — Demonstrativo de Rateio  |  Protocolo ${protocolo}  |  Gerado em ${formatDate()}`,
    pw / 2,
    ph - 10,
    { align: 'center' },
  );

  doc.save(`rateio_${protocolo || 'demonstrativo'}.pdf`);
}
