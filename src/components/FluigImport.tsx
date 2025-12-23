import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFluigImport } from '@/hooks/useFluigDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  FileCheck,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Hash,
  FileText,
  XCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Clock,
  Wrench,
  FileQuestion,
} from 'lucide-react';
import { ImportImpactSummary } from './ImportImpactSummary';
import { cn } from '@/lib/utils';

interface FluigImportProps {
  onImportComplete?: () => void;
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getSituacaoColor(situacao: string | null): string {
  if (!situacao) return 'bg-muted text-muted-foreground';
  const lower = situacao.toLowerCase();
  if (lower.includes('conclu') || lower.includes('aprovad') || lower.includes('finaliz')) {
    return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
  }
  if (lower.includes('cancel') || lower.includes('rejeit')) {
    return 'bg-destructive/20 text-destructive';
  }
  if (lower.includes('andamento') || lower.includes('process') || lower.includes('aguard')) {
    return 'bg-amber-500/20 text-amber-700 dark:text-amber-400';
  }
  return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
}

export function FluigImport({ onImportComplete }: FluigImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { importing, parseResult, importResult, progress, parseFile, importData, reset } = useFluigImport();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [headersOpen, setHeadersOpen] = useState(false);
  const [invalidRowsOpen, setInvalidRowsOpen] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Calculate estimated time remaining
  useEffect(() => {
    if (importing && progress.current > 0 && startTime) {
      const elapsed = Date.now() - startTime;
      const perItem = elapsed / progress.current;
      const remaining = (progress.total - progress.current) * perItem;
      setEstimatedTime(Math.round(remaining / 1000));
    }
  }, [importing, progress, startTime]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setParseError('Selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }
    
    setFile(selectedFile);
    setParseError(null);
    setParsing(true);
    reset();
    
    try {
      await parseFile(selectedFile);
    } catch (err: any) {
      setParseError(err.message || 'Erro ao ler a planilha');
    } finally {
      setParsing(false);
    }
  }, [parseFile, reset]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!parseResult || !user) return;
    
    setStartTime(Date.now());
    setEstimatedTime(null);
    
    const result = await importData(parseResult.data, user.id);
    
    if (result.erros.length === 0) {
      toast({
        title: 'Importação concluída!',
        description: `${result.novas} novas, ${result.atualizadas} atualizadas`,
      });
      onImportComplete?.();
    } else {
      toast({
        variant: 'destructive',
        title: 'Importação com erros',
        description: `${result.erros.length} erros encontrados`,
      });
    }
  };

  const clearFile = () => {
    setFile(null);
    setParseError(null);
    setEstimatedTime(null);
    setStartTime(null);
    reset();
  };

  const currentRecord = parseResult?.data[progress.current - 1];

  // Determine if we should show action button
  const showImportButton = parseResult && !importResult && !importing && parseResult.data.length > 0;
  const showClearButton = importResult;

  return (
    <div className="flex flex-col h-full max-h-[calc(85vh-80px)]">
      {/* Scrollable Content Area */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-4">
          {/* Upload Area - Compact */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Importar Planilha Fluig</span>
              </div>
            </div>
            <div className="p-4">
              {!file ? (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer',
                    dragOver 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('fluig-file-input')?.click()}
                >
                  <FileSpreadsheet className={cn(
                    'h-8 w-8 mx-auto mb-2',
                    dragOver ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground mt-1">.xlsx (Excel)</p>
                  <Input
                    id="fluig-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {parseError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{parseError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Parse Progress - Compact */}
          {parsing && (
            <div className="flex items-center justify-center gap-3 py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Analisando planilha...</span>
            </div>
          )}

          {/* Import in Progress - Compact */}
          {importing && parseResult && (
            <Card className="border-primary/30">
              <CardContent className="py-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Importando...
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>#{currentRecord?.solicitacao_fluig || '...'}</span>
                    <span className="text-muted-foreground">
                      {progress.current}/{progress.total} • {estimatedTime !== null ? `~${estimatedTime}s` : '...'}
                    </span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Parse Preview - Compact */}
          {parseResult && !importResult && !importing && (
            <div className="space-y-4">
              {/* Statistics - Compact inline */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-bold">{parseResult.totalRows}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{parseResult.data.length}</p>
                    <p className="text-[10px] text-muted-foreground">Válidas</p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border",
                  parseResult.invalidRows.length > 0 
                    ? "border-destructive/30 bg-destructive/10"
                    : "border-muted bg-muted/30"
                )}>
                  <XCircle className={cn(
                    "h-4 w-4",
                    parseResult.invalidRows.length > 0 ? "text-destructive" : "text-muted-foreground"
                  )} />
                  <div>
                    <p className={cn(
                      "text-xl font-bold",
                      parseResult.invalidRows.length > 0 ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {parseResult.invalidRows.length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Inválidas</p>
                  </div>
                </div>
              </div>

              {/* Invalid Rows Warning - Collapsible */}
              {parseResult.invalidRows.length > 0 && (
                <Collapsible open={invalidRowsOpen} onOpenChange={setInvalidRowsOpen}>
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                      <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                        <FileQuestion className="h-4 w-4" />
                        <span>{parseResult.invalidRows.length} linhas ignoradas</span>
                      </div>
                      {invalidRowsOpen ? (
                        <ChevronDown className="h-4 w-4 text-amber-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-amber-600" />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-2">
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>Verifique se as linhas possuem o número da Solicitação preenchido.</span>
                      </div>
                      <ScrollArea className="h-16">
                        <ul className="text-xs space-y-0.5">
                          {parseResult.invalidRows.slice(0, 10).map((inv, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 font-mono">
                                L{inv.row}
                              </Badge>
                              <span className="text-muted-foreground truncate">{inv.reason}</span>
                            </li>
                          ))}
                          {parseResult.invalidRows.length > 10 && (
                            <li className="text-amber-600 text-[10px]">
                              +{parseResult.invalidRows.length - 10} mais
                            </li>
                          )}
                        </ul>
                      </ScrollArea>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {parseResult.data.length > 0 && (
                <>
                  {/* Collapsible Headers */}
                  <Collapsible open={headersOpen} onOpenChange={setHeadersOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                        {headersOpen ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span>{parseResult.headers.filter(Boolean).length} headers detectados</span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="rounded-lg border bg-muted/20 p-2 mt-1">
                        <div className="flex flex-wrap gap-1">
                          {parseResult.headers.filter(Boolean).map((h, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] font-normal">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Sample Table - More compact */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Amostra (3 primeiras linhas)
                      </Label>
                    </div>
                    <TooltipProvider>
                      <div className="rounded-lg border overflow-hidden">
                        <div className="max-h-[140px] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted hover:bg-muted">
                                <TableHead className="text-[10px] font-semibold py-2 h-auto">Solic.</TableHead>
                                <TableHead className="text-[10px] font-semibold py-2 h-auto">Empreend.</TableHead>
                                <TableHead className="text-[10px] font-semibold py-2 h-auto">Fornecedor</TableHead>
                                <TableHead className="text-[10px] font-semibold py-2 h-auto text-right">Valor</TableHead>
                                <TableHead className="text-[10px] font-semibold py-2 h-auto text-center">Situação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parseResult.data.slice(0, 3).map((row, i) => (
                                <TableRow key={i} className="text-xs">
                                  <TableCell className="font-mono font-semibold text-[10px] text-primary py-1.5">
                                    {row.solicitacao_fluig}
                                  </TableCell>
                                  <TableCell className="text-[10px] py-1.5">
                                    <span className="block truncate max-w-[100px]">
                                      {row.empreendimento || '-'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-[10px] py-1.5">
                                    <span className="block truncate max-w-[100px]">
                                      {row.fornecedor || '-'}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-[10px] text-right py-1.5">
                                    {formatCurrency(row.valor)}
                                  </TableCell>
                                  <TableCell className="text-center py-1.5">
                                    <span className={cn(
                                      'inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium',
                                      getSituacaoColor(row.situacao)
                                    )}>
                                      {row.situacao || '-'}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TooltipProvider>
                  </div>

                  {/* Impact Summary - Compact */}
                  <ImportImpactSummary data={parseResult.data} compact />
                </>
              )}
            </div>
          )}

          {/* Import Result - Compact */}
          {importResult && (
            <Card className="border-emerald-500/30">
              <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-emerald-600 text-base">
                  <CheckCircle className="h-4 w-4" />
                  Importação Concluída
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 rounded-lg bg-muted/50 border">
                    <p className="text-lg font-bold">{importResult.totalLinhas}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-lg font-bold text-emerald-600">{importResult.novas}</p>
                    <p className="text-[10px] text-muted-foreground">Novas</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-lg font-bold text-blue-600">{importResult.atualizadas}</p>
                    <p className="text-[10px] text-muted-foreground">Atualiz.</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <p className="text-lg font-bold text-amber-600">{importResult.comAlteracaoStatus}</p>
                    <p className="text-[10px] text-muted-foreground">Δ Status</p>
                  </div>
                </div>

                {importResult.erros.length > 0 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <AlertTitle className="text-sm">Erros</AlertTitle>
                    <AlertDescription>
                      <ScrollArea className="h-16 mt-1">
                        <ul className="text-xs space-y-0.5">
                          {importResult.erros.slice(0, 5).map((err, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <XCircle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{err}</span>
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Footer with Action Button */}
      {(showImportButton || showClearButton) && (
        <div className="shrink-0 border-t bg-background p-4">
          {showImportButton && (
            <Button 
              onClick={handleImport} 
              disabled={importing}
              size="lg"
              className="w-full h-12 text-sm font-semibold gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
            >
              <TrendingUp className="h-4 w-4" />
              Importar {parseResult?.data.length} registros
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {showClearButton && (
            <Button 
              variant="outline" 
              onClick={clearFile} 
              size="lg"
              className="w-full h-12 gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar outra planilha
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
