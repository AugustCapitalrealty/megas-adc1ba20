import * as XLSX from 'xlsx';
import { FLUIG_COLUMN_MAPPINGS, type FluigRowData } from '@/types/fluig';

// Normalize header: trim, lowercase, remove accents, collapse spaces
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

// Find column index by normalized header name(s)
function findColumnIndex(headers: string[], possibleNames: readonly string[]): number {
  const normalizedHeaders = headers.map(normalizeHeader);
  
  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);
    const index = normalizedHeaders.indexOf(normalizedName);
    if (index !== -1) return index;
  }
  return -1;
}

// Get first non-empty value from multiple possible columns
function getFirstValue(row: any[], headers: string[], possibleNames: readonly string[]): string | null {
  for (const name of possibleNames) {
    const index = findColumnIndex(headers, [name]);
    if (index !== -1 && row[index] != null && String(row[index]).trim() !== '') {
      return String(row[index]).trim();
    }
  }
  return null;
}

// Parse Excel date
function parseExcelDate(value: any): Date | null {
  if (value == null || value === '') return null;
  
  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d, date.H || 0, date.M || 0, date.S || 0);
    }
  }
  
  // If it's a string, try to parse
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    
    // Try DD/MM/YYYY HH:mm:ss format (with proper time capture)
    const brMatchFull = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (brMatchFull) {
      const [, day, month, year, hour, min, sec] = brMatchFull;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        parseInt(sec)
      );
    }
    
    // Try DD/MM/YYYY HH:mm format (without seconds)
    const brMatchNoSec = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (brMatchNoSec) {
      const [, day, month, year, hour, min] = brMatchNoSec;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(min),
        0
      );
    }
    
    // Try DD/MM/YYYY format (date only)
    const brMatchDateOnly = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatchDateOnly) {
      const [, day, month, year] = brMatchDateOnly;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        0, 0, 0
      );
    }
    
    // Try ISO format
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // If it's already a Date
  if (value instanceof Date) return value;
  
  return null;
}

// Parse numeric value
function parseNumericValue(value: any): number | null {
  if (value == null || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove currency symbols and formatting
    const cleaned = value
      .replace(/R\$\s*/gi, '')
      .replace(/\./g, '') // Remove thousand separators
      .replace(',', '.') // Convert decimal separator
      .trim();
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  
  return null;
}

export interface ParseResult {
  data: FluigRowData[];
  invalidRows: { row: number; reason: string }[];
  headers: string[];
  totalRows: number;
}

export function parseFluigXLSX(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  // Get first sheet (Página1)
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to array of arrays
  // IMPORTANT: keep raw values to preserve date-time (hours/minutes) from Excel
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    dateNF: 'dd/mm/yyyy hh:mm:ss',
  });
  
  if (rawData.length < 2) {
    return { data: [], invalidRows: [], headers: [], totalRows: 0 };
  }
  
  const headers = rawData[0].map(h => String(h || ''));
  const rows = rawData.slice(1);
  
  // Check if "Solicitação" column exists
  const solicitacaoIndex = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.solicitacao);
  if (solicitacaoIndex === -1) {
    throw new Error('Coluna "Solicitação" não encontrada na planilha');
  }
  
  const data: FluigRowData[] = [];
  const invalidRows: { row: number; reason: string }[] = [];
  
  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // Excel row number (1-indexed + header)
    
    // Get solicitação (required)
    const solicitacao = row[solicitacaoIndex] != null ? String(row[solicitacaoIndex]).trim() : '';
    
    if (!solicitacao) {
      invalidRows.push({ row: rowNum, reason: 'Solicitação vazia' });
      return;
    }
    
    // Get basic columns
    const inicioIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.inicio);
    const fimIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.fim);
    const responsavelIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.responsavel);
    const situacaoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.situacao);
    const localizacaoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.localizacao);
    const descricaoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.descricao);
    const empreendimentoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.empreendimento);
    
    // Get description (priority) and service type
    const servicoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.servico);
    const descricao = descricaoIdx !== -1 && row[descricaoIdx] ? String(row[descricaoIdx]).trim() : null;
    const tipoServico = servicoIdx !== -1 && row[servicoIdx] ? String(row[servicoIdx]).trim() : null;
    
    // Priority: use descricao (detailed description) as main value
    // Only use tipoServico as fallback if descricao is empty
    let servico = descricao || tipoServico;
    
    // Get approval stages
    const gerenciaResponsavelIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.gerencia_responsavel);
    const gerenciaConclusaoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.gerencia_conclusao);
    const gerenciaFinResponsavelIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.gerencia_financeiro_responsavel);
    const gerenciaFinConclusaoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.gerencia_financeiro_conclusao);
    const diretoriaResponsavelIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.diretoria_responsavel);
    const diretoriaConclusaoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.diretoria_conclusao);
    const gerenciaFacResponsavelIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.gerencia_facilities_responsavel);
    const gerenciaFacConclusaoIdx = findColumnIndex(headers, FLUIG_COLUMN_MAPPINGS.gerencia_facilities_conclusao);
    
    const rowData: FluigRowData = {
      solicitacao_fluig: solicitacao,
      data_lancamento: inicioIdx !== -1 ? parseExcelDate(row[inicioIdx]) : null,
      fornecedor: getFirstValue(row, headers, FLUIG_COLUMN_MAPPINGS.fornecedor),
      valor: parseNumericValue(getFirstValue(row, headers, FLUIG_COLUMN_MAPPINGS.valor)),
      servico,
      responsavel_atual: responsavelIdx !== -1 && row[responsavelIdx] ? String(row[responsavelIdx]).trim() : null,
      empreendimento: empreendimentoIdx !== -1 && row[empreendimentoIdx] ? String(row[empreendimentoIdx]).trim() : null,
      situacao: situacaoIdx !== -1 && row[situacaoIdx] ? String(row[situacaoIdx]).trim() : null,
      localizacao: localizacaoIdx !== -1 && row[localizacaoIdx] ? String(row[localizacaoIdx]).trim() : null,
      
      gerencia_responsavel: gerenciaResponsavelIdx !== -1 && row[gerenciaResponsavelIdx] ? String(row[gerenciaResponsavelIdx]).trim() : null,
      gerencia_conclusao: gerenciaConclusaoIdx !== -1 ? parseExcelDate(row[gerenciaConclusaoIdx]) : null,
      gerencia_facilities_responsavel: gerenciaFacResponsavelIdx !== -1 && row[gerenciaFacResponsavelIdx] ? String(row[gerenciaFacResponsavelIdx]).trim() : null,
      gerencia_facilities_conclusao: gerenciaFacConclusaoIdx !== -1 ? parseExcelDate(row[gerenciaFacConclusaoIdx]) : null,
      gerencia_financeiro_responsavel: gerenciaFinResponsavelIdx !== -1 && row[gerenciaFinResponsavelIdx] ? String(row[gerenciaFinResponsavelIdx]).trim() : null,
      gerencia_financeiro_conclusao: gerenciaFinConclusaoIdx !== -1 ? parseExcelDate(row[gerenciaFinConclusaoIdx]) : null,
      diretoria_responsavel: diretoriaResponsavelIdx !== -1 && row[diretoriaResponsavelIdx] ? String(row[diretoriaResponsavelIdx]).trim() : null,
      diretoria_conclusao: diretoriaConclusaoIdx !== -1 ? parseExcelDate(row[diretoriaConclusaoIdx]) : null,
      
      data_inicio: inicioIdx !== -1 ? parseExcelDate(row[inicioIdx]) : null,
      data_fim: fimIdx !== -1 ? parseExcelDate(row[fimIdx]) : null,
    };
    
    data.push(rowData);
  });
  
  return { data, invalidRows, headers, totalRows: rows.length };
}

// Calculate duration string
export function calculateDuration(inicio: Date | string | null, fim: Date | string | null): string {
  if (!inicio) return '-';
  
  const startDate = typeof inicio === 'string' ? new Date(inicio) : inicio;
  const endDate = fim ? (typeof fim === 'string' ? new Date(fim) : fim) : new Date();
  
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return '-';
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays} dias ${String(diffHours).padStart(2, '0')}h ${String(diffMins).padStart(2, '0')}min`;
  }
  return `${String(diffHours).padStart(2, '0')}h ${String(diffMins).padStart(2, '0')}min`;
}
