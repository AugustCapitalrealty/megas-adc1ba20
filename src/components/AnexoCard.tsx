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
  Loader2
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
  const isLongName = anexo.nome_arquivo.length > 35;

  return (
    <div className={cn(
      "group flex items-center gap-3 p-3 rounded-lg border bg-card",
      "transition-all duration-200 hover:bg-accent/50 hover:border-accent-foreground/20 hover:shadow-sm"
    )}>
      {/* File Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
        {getFileIcon(anexo.mime_type, anexo.nome_arquivo)}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {showTipo && (
            <Badge variant="secondary" className="text-[10px] font-medium flex-shrink-0">
              {tipoLabel}
            </Badge>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className={cn(
              "text-sm font-medium truncate mt-0.5",
              isLongName && "cursor-help"
            )}>
              {anexo.nome_arquivo}
            </p>
          </TooltipTrigger>
          {isLongName && (
            <TooltipContent side="top" className="max-w-[400px] break-all">
              {anexo.nome_arquivo}
            </TooltipContent>
          )}
        </Tooltip>
        {fileSize && (
          <p className="text-xs text-muted-foreground">{fileSize}</p>
        )}
      </div>

      {/* Download Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        disabled={downloading}
        className="flex-shrink-0 gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
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
