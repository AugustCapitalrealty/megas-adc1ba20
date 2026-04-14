import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  inserted: number;
  errors: string[];
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const HEADER_MAP: Record<string, string> = {
  'numero requisicao': 'numero_requisicao',
  'numero da requisicao': 'numero_requisicao',
  'n fluig': 'numero_fluig',
  'no fluig': 'numero_fluig',
  'numero fluig': 'numero_fluig',
  'data da requisicao': 'data_requisicao',
  'data requisicao': 'data_requisicao',
  'data da ultima aprovacao': 'data_ultima_aprovacao',
  'data ultima aprovacao': 'data_ultima_aprovacao',
  'data do ultimo envio para aprovacao': 'data_ultimo_envio_aprovacao',
  'data ultimo envio para aprovacao': 'data_ultimo_envio_aprovacao',
  'data do ultimo envio aprovacao': 'data_ultimo_envio_aprovacao',
  'detalhes': 'detalhes',
  'empreendimento': 'empreendimento',
  'requisitante': 'requisitante',
  'tipo requisicao': 'tipo_requisicao',
  'tipo da requisicao': 'tipo_requisicao',
  'usuarios responsaveis': 'responsavel',
  'usuario responsavel': 'responsavel',
  'responsavel': 'responsavel',
  'status': 'status',
  'data da finalizacao': 'data_finalizacao',
  'data finalizacao': 'data_finalizacao',
  'cliente/fornecedor': 'cliente_fornecedor',
  'cliente fornecedor': 'cliente_fornecedor',
};

function parseDateBR(val: string): string | null {
  const trimmed = val?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*(.*)$/);
  if (!match) return null;
  const [, day, month, year, time] = match;
  const iso = `${year}-${month}-${day}T${time?.trim() || '00:00'}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ';') { current.push(field); field = ''; }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++;
        current.push(field);
        field = '';
        if (current.length > 1) rows.push(current);
        current = [];
      } else { field += ch; }
    }
  }
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1) rows.push(current);
  }
  return rows;
}

function buildColumnMap(headerRow: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const normalized = normalize(headerRow[i]);
    const field = HEADER_MAP[normalized];
    if (field && !(field in map)) {
      map[field] = i;
    }
  }
  return map;
}

const DATE_FIELDS = ['data_requisicao', 'data_ultima_aprovacao', 'data_ultimo_envio_aprovacao', 'data_finalizacao'];

export function ProjurisImport({ onImported }: { onImported: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLoading(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder('latin1');
      const text = decoder.decode(buffer);
      const rows = parseCSV(text);

      if (rows.length < 2) throw new Error('Arquivo vazio ou formato inválido');

      const headerRow = rows[0];
      const colMap = buildColumnMap(headerRow);
      const expectedCols = headerRow.length;

      if (!('numero_requisicao' in colMap)) {
        throw new Error('Coluna "Número Requisição" não encontrada no cabeçalho. Colunas detectadas: ' + headerRow.join(', '));
      }

      const detalhesIdx = colMap['detalhes'];

      const dataRows = rows.slice(1);
      const res: ImportResult = { inserted: 0, errors: [] };

      const batchSize = 50;
      for (let i = 0; i < dataRows.length; i += batchSize) {
        const batch = dataRows.slice(i, i + batchSize);
        const records = batch.map((row, idx) => {
          // Fix rows with extra columns caused by unescaped quotes in Detalhes
          if (row.length > expectedCols && detalhesIdx !== undefined) {
            const extraCols = row.length - expectedCols;
            const detalhesEnd = detalhesIdx + extraCols + 1;
            const fixedDetalhes = row.slice(detalhesIdx, detalhesEnd).join(';');
            row.splice(detalhesIdx, extraCols + 1, fixedDetalhes);
          }

          const get = (field: string) => {
            const colIdx = colMap[field];
            return colIdx !== undefined ? row[colIdx]?.trim() || null : null;
          };

          const numReq = get('numero_requisicao');
          if (!numReq) {
            res.errors.push(`Linha ${i + idx + 2}: Número Requisição vazio`);
            return null;
          }

          // Validate numero_requisicao — reject obviously wrong values
          if (numReq.includes('.') || numReq.length > 10 || numReq === '0' || numReq === '00') {
            res.errors.push(`Linha ${i + idx + 2}: numero_requisicao inválido: ${numReq}`);
            return null;
          }

          const record: Record<string, any> = {
            numero_requisicao: numReq,
            importado_por: user.id,
          };

          // Text fields
          for (const field of ['numero_fluig', 'detalhes', 'empreendimento', 'requisitante', 'tipo_requisicao', 'responsavel', 'status', 'cliente_fornecedor']) {
            if (field in colMap) record[field] = get(field);
          }

          // Date fields
          for (const field of DATE_FIELDS) {
            if (field in colMap) {
              const raw = get(field);
              record[field] = raw ? parseDateBR(raw) : null;
            }
          }

          return record;
        }).filter(Boolean);

        if (records.length === 0) continue;

        const { error } = await supabase
          .from('projuris_requisicoes')
          .upsert(records as any[], { onConflict: 'numero_requisicao', ignoreDuplicates: false });

        if (error) {
          res.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          res.inserted += records.length;
        }
      }

      setResult(res);
      if (res.errors.length === 0) {
        toast.success(`Importação concluída: ${res.inserted} registros processados`);
        onImported();
      } else {
        toast.warning(`Importação com ${res.errors.length} erros`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro na importação');
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Upload className="h-4 w-4" />
        Importar Planilha
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar Planilha Projuris</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o arquivo CSV (separado por <code>;</code>) exportado do Projuris.
              As colunas são detectadas automaticamente pelo cabeçalho.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              disabled={loading}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{result.inserted} registros processados</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{result.errors.length} erros</span>
                    </div>
                    <div className="max-h-32 overflow-auto text-xs text-muted-foreground bg-muted p-2 rounded">
                      {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
