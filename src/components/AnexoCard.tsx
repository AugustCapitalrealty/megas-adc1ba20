import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ANEXO_LABELS } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { saveAs } from 'file-saver';
import { 
  Download, 
  FileText, 
  FileImage, 
  FileSpreadsheet,
  File,
  Loader2,
  Star
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Anexo {
  id: string;
  tipo: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type?: string | null;
  tamanho_bytes?: number | null;
}

interface AnexoCardProps {
  anexo: Anexo;
  showTipo?: boolean;
}

// Classificar anexos por importância para hierarquia visual
const ANEXO_IMPORTANCIA: Record<string, 'primary' | 'secondary' | 'default'> = {
  orcamento_escolhido: 'primary',
  mapa_cotacao: 'primary',
  escopo_detalhado: 'primary',
  orcamento_concorrente_1: 'secondary',
  orcamento_concorrente_2: 'secondary',
  chamado_preventiva: 'secondary',
  comunicado_cliente: 'secondary',
  rateio: 'default',
  outros: 'default',
  justificativa_anexo: 'default',
};

function getFileIcon(mimeType: string | null | undefined, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return <FileImage className="h-5 w-5 text-pink-500" />;
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  }
  if (['doc', 'docx'].includes(ext || '')) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AnexoCard({ anexo, showTipo = true }: AnexoCardProps) {
  const [downloading, setDownloading] = useState(false);
  const importancia = ANEXO_IMPORTANCIA[anexo.tipo] || 'default';

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data } = await supabase.storage
        .from('anexos')
        .download(anexo.storage_path);
      
      if (data) {
        saveAs(data, anexo.nome_arquivo);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloading(false);
    }
  };

  const tipoLabel = ANEXO_LABELS[anexo.tipo] || anexo.tipo;
  const fileSize = formatFileSize(anexo.tamanho_bytes);

  return (
    <div className={cn(
      "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 w-full",
      "hover:shadow-sm cursor-pointer",
      // Visual hierarchy based on importance
      importancia === 'primary' && "bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50",
      importancia === 'secondary' && "bg-muted/50 border-border hover:bg-muted hover:border-muted-foreground/20",
      importancia === 'default' && "bg-card border-border hover:bg-accent/50 hover:border-accent-foreground/20"
    )}
    onClick={handleDownload}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
    >
      {/* File Icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
        importancia === 'primary' && "bg-primary/10",
        importancia === 'secondary' && "bg-muted",
        importancia === 'default' && "bg-muted"
      )}>
        {getFileIcon(anexo.mime_type, anexo.nome_arquivo)}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          {showTipo && (
            <Badge 
              variant={importancia === 'primary' ? 'default' : 'secondary'} 
              className={cn(
                "text-[10px] font-medium flex-shrink-0",
                importancia === 'primary' && "bg-primary text-primary-foreground"
              )}
            >
              {importancia === 'primary' && <Star className="h-2.5 w-2.5 mr-1" />}
              {tipoLabel}
            </Badge>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-sm font-medium truncate mt-0.5 max-w-full cursor-help">
              {anexo.nome_arquivo}
            </p>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[400px] break-all">
            {anexo.nome_arquivo}
          </TooltipContent>
        </Tooltip>
        {fileSize && (
          <p className="text-xs text-muted-foreground">{fileSize}</p>
        )}
      </div>

      {/* Download Button */}
      <Button
        size="sm"
        variant={importancia === 'primary' ? 'default' : 'outline'}
        onClick={(e) => {
          e.stopPropagation();
          handleDownload();
        }}
        disabled={downloading}
        className={cn(
          "flex-shrink-0 gap-1.5 transition-opacity",
          importancia !== 'primary' && "opacity-80 group-hover:opacity-100"
        )}
      >
        {downloading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Baixar</span>
      </Button>
    </div>
  );
}
