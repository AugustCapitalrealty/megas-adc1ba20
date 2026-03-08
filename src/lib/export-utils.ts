import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { STATUS_LABELS, EMPREENDIMENTO_LABELS } from '@/types';
import type { RequestStatus, Empreendimento } from '@/types';

interface ExportableRow {
  protocolo: string;
  tipo: string;
  status: RequestStatus;
  empreendimento: Empreendimento;
  valor: number;
  descricao: string;
  solicitante_nome: string | null;
  fornecedor_razao: string | null;
  fornecedor_cnpj: string | null;
  created_at: string;
  updated_at: string;
  numero_chamado_fluig: string | null;
  emergencial: boolean;
}

export function exportToExcel(rows: ExportableRow[], filename: string = 'solicitacoes') {
  const data = rows.map(r => ({
    'Protocolo': r.protocolo,
    'Tipo': r.tipo,
    'Status': STATUS_LABELS[r.status] || r.status,
    'Empreendimento': EMPREENDIMENTO_LABELS[r.empreendimento] || r.empreendimento,
    'Valor (R$)': r.valor,
    'Descrição': r.descricao,
    'Solicitante': r.solicitante_nome || '-',
    'Fornecedor': r.fornecedor_razao || '-',
    'CNPJ Fornecedor': r.fornecedor_cnpj || '-',
    'Nº Fluig': r.numero_chamado_fluig || '-',
    'Emergencial': r.emergencial ? 'Sim' : 'Não',
    'Criado em': new Date(r.created_at).toLocaleDateString('pt-BR'),
    'Atualizado em': new Date(r.updated_at).toLocaleDateString('pt-BR'),
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(r => String((r as any)[key] || '').length).slice(0, 50)) + 2
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Solicitações');
  
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
