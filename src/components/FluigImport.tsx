import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  AlertCircle,
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
} from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar Planilha Fluig
          </CardTitle>
          <CardDescription>
            Faça upload da planilha exportada do Fluig (.xlsx)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {!file ? (
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer group',
                dragOver 
                  ? 'border-primary bg-primary/10 scale-[1.02]' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fluig-file-input')?.click()}
            >
              <div className={cn(
                'inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-300',
                dragOver ? 'bg-primary/20' : 'bg-muted group-hover:bg-primary/10'
              )}>
                <FileSpreadsheet className={cn(
                  'h-8 w-8 transition-colors',
                  dragOver ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                )} />
              </div>
              <p className="text-sm font-medium mb-1">
                Arraste o arquivo ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground">
                Formato aceito: .xlsx (Excel)
              </p>
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
            <div className="flex items-center justify-between p-4 border rounded-xl bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile} className="hover:bg-destructive/10 hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {parseError && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao ler planilha</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Parse Progress */}
      {parsing && (
        <Card className="overflow-hidden">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
              </div>
              <div className="text-center">
                <p className="font-medium">Analisando planilha...</p>
                <p className="text-xs text-muted-foreground mt-1">Identificando colunas e validando dados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import in Progress */}
      {importing && parseResult && (
        <Card className="overflow-hidden border-primary/30">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Importando Dados do Fluig
            </CardTitle>
            <CardDescription>
              Por favor, aguarde enquanto os dados são processados
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8 space-y-6">
            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progresso</span>
                <span className="text-muted-foreground">{progress.percentage}%</span>
              </div>
              <div className="relative">
                <Progress value={progress.percentage} className="h-4" />
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
                  style={{ 
                    width: `${progress.percentage}%`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Current Processing Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Processando</p>
                  <p className="font-medium text-sm">
                    #{currentRecord?.solicitacao_fluig || '...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Hash className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Linha</p>
                  <p className="font-medium text-sm">
                    {progress.current} de {progress.total}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tempo restante</p>
                  <p className="font-medium text-sm">
                    {estimatedTime !== null ? `~${estimatedTime}s` : 'Calculando...'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parse Preview */}
      {parseResult && !importResult && !importing && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500/5 to-primary/5 border-b">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Preview da Importação
            </CardTitle>
            <CardDescription>
              Revise os dados antes de confirmar a importação
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6 space-y-6">
              {/* Statistics Cards - Improved with action context */}
              <div className="grid grid-cols-3 gap-4">
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/50 to-muted/30 p-4 transition-all hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-foreground/70" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{parseResult.totalRows}</p>
                      <p className="text-xs text-muted-foreground">Total de linhas</p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 transition-all hover:shadow-md hover:border-emerald-500/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-emerald-600">{parseResult.data.length}</p>
                      <p className="text-xs text-muted-foreground">Prontas para importar</p>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "relative overflow-hidden rounded-xl border p-4 transition-all hover:shadow-md",
                  parseResult.invalidRows.length > 0 
                    ? "border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 hover:border-destructive/50"
                    : "border-muted bg-gradient-to-br from-muted/50 to-muted/30"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      parseResult.invalidRows.length > 0 ? "bg-destructive/20" : "bg-muted"
                    )}>
                      <XCircle className={cn(
                        "h-6 w-6",
                        parseResult.invalidRows.length > 0 ? "text-destructive" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className={cn(
                        "text-3xl font-bold",
                        parseResult.invalidRows.length > 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {parseResult.invalidRows.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {parseResult.invalidRows.length > 0 ? 'Precisam de correção' : 'Sem problemas'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invalid Rows Warning - More actionable */}
              {parseResult.invalidRows.length > 0 && (
                <Alert className="border-amber-500/50 bg-amber-500/5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-700 dark:text-amber-400 flex items-center justify-between">
                    <span>Linhas ignoradas na importação</span>
                    <Badge variant="outline" className="ml-2 text-amber-600 border-amber-500/50">
                      {parseResult.invalidRows.length} {parseResult.invalidRows.length === 1 ? 'linha' : 'linhas'}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    <p className="text-xs text-muted-foreground mb-2">
                      Estas linhas não possuem número de solicitação e serão ignoradas durante a importação:
                    </p>
                    <ScrollArea className="h-24 rounded-md border border-amber-500/20 bg-amber-500/5 p-2">
                      <ul className="text-xs space-y-1">
                        {parseResult.invalidRows.slice(0, 15).map((inv, i) => (
                          <li key={i} className="flex items-center gap-2 py-0.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              Linha {inv.row}
                            </Badge>
                            <span className="text-muted-foreground">{inv.reason}</span>
                          </li>
                        ))}
                        {parseResult.invalidRows.length > 15 && (
                          <li className="font-medium text-amber-600 pt-1">
                            ... e mais {parseResult.invalidRows.length - 15} linhas com problemas similares
                          </li>
                        )}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {parseResult.data.length > 0 && (
                <>
                  {/* Solicitations Found */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Solicitações encontradas
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {parseResult.data.slice(0, 8).map((row, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs">
                          {row.solicitacao_fluig}
                        </Badge>
                      ))}
                      {parseResult.data.length > 8 && (
                        <Badge variant="secondary" className="text-xs">
                          +{parseResult.data.length - 8} mais
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Collapsible Headers */}
                  <Collapsible open={headersOpen} onOpenChange={setHeadersOpen}>
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-2">
                        {headersOpen ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        <span>Ver {parseResult.headers.filter(Boolean).length} headers detectados na planilha</span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="rounded-lg border bg-muted/20 p-3 mt-2">
                        <div className="flex flex-wrap gap-1.5">
                          {parseResult.headers.filter(Boolean).map((h, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                              {h}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator />

                  {/* Sample Table - Improved with sticky header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Amostra dos dados (primeiras 5 linhas)
                      </Label>
                      <Badge variant="outline" className="text-[10px]">
                        {parseResult.data.length} registros válidos
                      </Badge>
                    </div>
                    <TooltipProvider>
                      <div className="rounded-xl border overflow-hidden bg-card">
                        <div className="max-h-[280px] overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 z-10">
                              <TableRow className="bg-muted hover:bg-muted border-b">
                                <TableHead className="w-[100px] text-xs font-semibold">Solicitação</TableHead>
                                <TableHead className="text-xs font-semibold">Empreendimento</TableHead>
                                <TableHead className="text-xs font-semibold">Fornecedor</TableHead>
                                <TableHead className="w-[100px] text-xs font-semibold text-right">Valor</TableHead>
                                <TableHead className="w-[130px] text-xs font-semibold text-center">Situação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parseResult.data.slice(0, 5).map((row, i) => (
                                <TableRow 
                                  key={i} 
                                  className={cn(
                                    "transition-colors",
                                    i % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                                  )}
                                >
                                  <TableCell className="font-mono font-semibold text-xs text-primary">
                                    {row.solicitacao_fluig}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate max-w-[180px] cursor-default">
                                          {row.empreendimento || '-'}
                                        </span>
                                      </TooltipTrigger>
                                      {row.empreendimento && (
                                        <TooltipContent side="top" className="max-w-[300px]">
                                          {row.empreendimento}
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate max-w-[150px] cursor-default">
                                          {row.fornecedor || '-'}
                                        </span>
                                      </TooltipTrigger>
                                      {row.fornecedor && (
                                        <TooltipContent side="top" className="max-w-[300px]">
                                          {row.fornecedor}
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell className="text-xs text-right font-medium">
                                    {formatCurrency(row.valor)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className={cn(
                                          'inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-medium truncate max-w-[120px] cursor-default',
                                          getSituacaoColor(row.situacao)
                                        )}>
                                          {row.situacao || '-'}
                                        </span>
                                      </TooltipTrigger>
                                      {row.situacao && (
                                        <TooltipContent side="top">
                                          {row.situacao}
                                        </TooltipContent>
                                      )}
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </TooltipProvider>
                  </div>

                  {/* Import Button */}
                  <Button 
                    onClick={handleImport} 
                    disabled={importing}
                    size="lg"
                    className="w-full h-14 text-base font-semibold gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
                  >
                    <TrendingUp className="h-5 w-5" />
                    Importar {parseResult.data.length} registros
                    <ArrowRight className="h-5 w-5 ml-1" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card className="overflow-hidden border-emerald-500/30">
          <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-b border-emerald-500/20">
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              Importação Concluída
            </CardTitle>
            <CardDescription>
              Os dados foram processados com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-muted/50 border">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-foreground/5 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-foreground/70" />
                </div>
                <p className="text-2xl font-bold">{importResult.totalLinhas}</p>
                <p className="text-xs text-muted-foreground">Total processado</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600">{importResult.novas}</p>
                <p className="text-xs text-muted-foreground">Novas</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-blue-600">{importResult.atualizadas}</p>
                <p className="text-xs text-muted-foreground">Atualizadas</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold text-amber-600">{importResult.comAlteracaoStatus}</p>
                <p className="text-xs text-muted-foreground">Mudança status</p>
              </div>
            </div>

            {importResult.erros.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erros durante importação</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="h-24 mt-2">
                    <ul className="text-xs space-y-1">
                      {importResult.erros.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            <Button 
              variant="outline" 
              onClick={clearFile} 
              size="lg"
              className="w-full h-12 gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar outra planilha
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
