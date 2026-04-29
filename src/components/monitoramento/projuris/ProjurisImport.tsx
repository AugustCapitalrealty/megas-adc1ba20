import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Upload, Loader2, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatBR } from '@/lib/date-utils';

interface ImportResult {
  inserted: number;
  errors: string[];
}

interface MissingRow {
  id: string;
  numero_requisicao: string;
  status: string | null;
  requisitante: string | null;
  cliente_fornecedor: string | null;
  data_requisicao: string | null;
}

const CLOSED_STATUSES = ['FINALIZADA', 'CANCELADA', 'REPROVADA'];

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
  const [missing, setMissing] = useState<MissingRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLoading(true);
    setResult(null);
    setMissing([]);
    setSelected(new Set());

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
      const planilhaSet = new Set<string>();

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

          planilhaSet.add(numReq);

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

      // Detect requisitions that exist in our DB but were removed from the spreadsheet
      const { data: dbData, error: dbErr } = await supabase
        .from('projuris_requisicoes')
        .select('id, numero_requisicao, status, requisitante, cliente_fornecedor, data_requisicao')
        .not('status', 'in', `(${CLOSED_STATUSES.join(',')})`);

      if (dbErr) {
        res.errors.push(`Detecção de removidos: ${dbErr.message}`);
      } else {
        const missingRows = ((dbData as MissingRow[]) || []).filter(r => !planilhaSet.has(r.numero_requisicao));
        setMissing(missingRows);
        setSelected(new Set(missingRows.map(r => r.id)));
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

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === missing.length ? new Set() : new Set(missing.map(r => r.id)));
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from('projuris_requisicoes').delete().in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} requisição(ões) excluída(s) da base`);
      setMissing(prev => prev.filter(r => !selected.has(r.id)));
      setSelected(new Set());
      setConfirmOpen(false);
      onImported();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Upload className="h-4 w-4" />
        Importar Planilha
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
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

            {missing.length > 0 && (
              <div className="space-y-2 border rounded-md p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    {missing.length} requisição(ões) na base não estão mais na planilha
                  </div>
                  <Button size="sm" variant="ghost" onClick={toggleAll} className="h-7 text-xs">
                    {selected.size === missing.length ? 'Desmarcar todas' : 'Marcar todas'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Foram removidas do Projuris ou ficaram fora deste filtro. Selecione quais excluir da nossa base.
                </p>
                <ScrollArea className="h-[220px] rounded border bg-background">
                  <div className="divide-y">
                    {missing.map(r => (
                      <label key={r.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 cursor-pointer text-xs">
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={() => toggleOne(r.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-medium">{r.numero_requisicao}</span>
                            {r.status && <Badge variant="outline" className="text-[9px] py-0">{r.status}</Badge>}
                            {r.data_requisicao && (
                              <span className="text-[10px] text-muted-foreground">{formatBR(r.data_requisicao, 'dd/MM/yyyy')}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {r.requisitante || '—'} · {r.cliente_fornecedor?.split(' - ')[0] || '—'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setMissing([]); setSelected(new Set()); }}>
                    Manter todas
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmOpen(true)}
                    disabled={selected.size === 0 || deleting}
                    className="gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir {selected.size > 0 ? `(${selected.size})` : ''}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} requisição(ões)?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai remover permanentemente os registros selecionados de <strong>projuris_requisicoes</strong>.
              O histórico de ações (projuris_acoes) também ficará órfão. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
