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

const formatDateTime = () => {
  const now = new Date();
  const date = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const time = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
};

const formatDateOnly = () =>
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
  const mx = 14;

  // ─── 1. HEADER ───────────────────────────────────────────
  doc.setFillColor(...white);
  doc.rect(0, 0, pw, 40, 'F');
  doc.setFillColor(...orange);
  doc.rect(0, 40, pw, 2, 'F');

  try {
    const logoBase64 = await loadImageAsBase64(logoMega);
    doc.addImage(logoBase64, 'PNG', mx, 10, 40, 20);
  } catch { /* proceed without logo */ }

  doc.setTextColor(...greyDark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Demonstrativo de Rateio', pw - mx, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grey);
  doc.text('entre Condomínios', pw - mx, 28, { align: 'right' });

  // ─── 2. SUMMARY CARDS (2x2 grid) ────────────────────────
  let y = 50;
  const cardW = (pw - mx * 2 - 8) / 2;
  const cardH = 22;
  const gap = 8;
  const tipoLabel = tipoRateio === 'por_unidade' ? 'Igual por unidade' : 'Proporcional por área';

  const cards = [
    { label: 'VALOR TOTAL', value: formatCurrency(valorTotal) },
    { label: 'TIPO DE RATEIO', value: tipoLabel },
    { label: 'DATA DO RATEIO', value: formatDateOnly() },
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

    doc.setFontSize(14);
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
      3: { halign: 'right' as const, fontStyle: 'bold', textColor: [180, 70, 10] as any },
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: mx, right: mx },
  });

  // @ts-ignore - autoTable adds finalY
  y = (doc as any).lastAutoTable.finalY + 6;

  // ─── 4. TOTAL HIGHLIGHT BAND ────────────────────────────
  const totalArea = rateioValores.reduce((s, r) => s + r.area_m2, 0);
  const bandH = 20;
  doc.setFillColor(...greyDark);
  doc.roundedRect(mx, y, pw - mx * 2, bandH, 2, 2, 'F');

  // Line 1: TOTAL RATEADO + valor
  doc.setTextColor(...white);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL RATEADO', mx + 6, y + 9);
  doc.setFontSize(14);
  doc.text(formatCurrency(valorTotal), pw - mx - 6, y + 9, { align: 'right' });

  // Line 2: Área considerada
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text(`Área considerada: ${totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²`, mx + 6, y + 16);

  // Qtd condomínios
  doc.text(`${rateioValores.length} condomínios`, pw - mx - 6, y + 16, { align: 'right' });

  y += bandH + 4;

  // ─── 4b. VALOR POR M² ──────────────────────────────────
  if (tipoRateio !== 'por_unidade' && totalArea > 0) {
    const valorPorM2 = valorTotal / totalArea;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...orange);
    doc.text(
      `Valor rateado por m²: ${valorPorM2.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4 })} / m²`,
      mx, y + 4
    );
    y += 10;
  }

  // ─── 5. DISTRIBUTION CHART ──────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...greyDark);
  doc.text('Distribuição do Rateio', mx, y);
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...grey);
  doc.text('Participação proporcional por condomínio', mx, y);
  y += 6;

  const maxBarW = pw - mx * 2 - 80;
  const maxPct = Math.max(...rateioValores.map(r => r.percentual));
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
    ? `O valor total foi distribuído igualmente entre os ${rateioValores.length} condomínios participantes.`
    : `O valor total foi distribuído proporcionalmente à área construída de cada condomínio em relação à área total considerada (${totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²).`;

  doc.text(metodoTexto, mx, y, { maxWidth: pw - mx * 2 });
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.text(`Quantidade de condomínios considerados: ${rateioValores.length}`, mx, y);
  y += 8;

  // ─── 7. CONFERÊNCIA ─────────────────────────────────────
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(mx, y, pw - mx, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...greyDark);
  doc.text('Conferência', mx, y);
  y += 5;

  const somaPct = rateioValores.reduce((s, r) => s + r.percentual, 0);
  const somaValor = rateioValores.reduce((s, r) => s + r.valor, 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...grey);
  doc.text(`Soma das participações: ${somaPct.toFixed(2)}%`, mx, y);
  y += 4;
  doc.text(`Soma dos valores rateados: ${formatCurrency(somaValor)}`, mx, y);

  // ─── 8. FOOTER ───────────────────────────────────────────
  doc.setDrawColor(...grey);
  doc.setLineWidth(0.5);
  doc.line(mx, ph - 24, pw - mx, ph - 24);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grey);
  doc.text(
    `Capital Realty — Demonstrativo de Rateio  |  Protocolo: ${protocolo}  |  Gerado em ${formatDateTime()}`,
    pw / 2,
    ph - 16,
    { align: 'center' },
  );

  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('Documento confidencial', pw / 2, ph - 10, { align: 'center' });

  doc.save(`rateio_${protocolo || 'demonstrativo'}.pdf`);
}
