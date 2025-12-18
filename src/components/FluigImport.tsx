import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FluigImportProps {
  onImportComplete?: () => void;
}

export function FluigImport({ onImportComplete }: FluigImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { importing, parseResult, importResult, parseFile, importData, reset } = useFluigImport();
  
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

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
    reset();
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Planilha Fluig
          </CardTitle>
          <CardDescription>
            Faça upload da planilha exportada do Fluig (.xlsx)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fluig-file-input')?.click()}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
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
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <FileCheck className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
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

      {/* Parse Preview */}
      {parsing && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando planilha...</p>
          </CardContent>
        </Card>
      )}

      {parseResult && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Preview da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{parseResult.totalRows}</p>
                <p className="text-xs text-muted-foreground">Total de linhas</p>
              </div>
              <div className="text-center p-4 bg-emerald-500/10 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{parseResult.data.length}</p>
                <p className="text-xs text-muted-foreground">Linhas válidas</p>
              </div>
              <div className="text-center p-4 bg-destructive/10 rounded-lg">
                <p className="text-2xl font-bold text-destructive">{parseResult.invalidRows.length}</p>
                <p className="text-xs text-muted-foreground">Sem Solicitação</p>
              </div>
            </div>

            {parseResult.invalidRows.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Linhas inválidas</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="h-24 mt-2">
                    <ul className="text-xs space-y-1">
                      {parseResult.invalidRows.slice(0, 20).map((inv, i) => (
                        <li key={i}>Linha {inv.row}: {inv.reason}</li>
                      ))}
                      {parseResult.invalidRows.length > 20 && (
                        <li className="font-medium">... e mais {parseResult.invalidRows.length - 20} linhas</li>
                      )}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {parseResult.data.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">Primeiras solicitações encontradas:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {parseResult.data.slice(0, 10).map((row, i) => (
                      <Badge key={i} variant="outline">{row.solicitacao_fluig}</Badge>
                    ))}
                    {parseResult.data.length > 10 && (
                      <Badge variant="secondary">+{parseResult.data.length - 10} mais</Badge>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleImport} 
                  disabled={importing}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      Importar {parseResult.data.length} registros
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Result */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Importação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xl font-bold">{importResult.totalLinhas}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                <p className="text-xl font-bold text-emerald-600">{importResult.novas}</p>
                <p className="text-xs text-muted-foreground">Novas</p>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xl font-bold text-blue-600">{importResult.atualizadas}</p>
                <p className="text-xs text-muted-foreground">Atualizadas</p>
              </div>
              <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                <p className="text-xl font-bold text-amber-600">{importResult.comAlteracaoStatus}</p>
                <p className="text-xs text-muted-foreground">Com mudança de status</p>
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

            <Button variant="outline" onClick={clearFile} className="w-full">
              Importar outra planilha
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
