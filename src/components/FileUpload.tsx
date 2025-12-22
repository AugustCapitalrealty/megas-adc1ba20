import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  file: File;
  tipo: string;
  preview?: string;
}

interface FileUploadProps {
  tipo: string;
  label: string;
  required?: boolean;
  onFileSelect: (file: UploadedFile | null) => void;
  currentFile?: UploadedFile | null;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export function FileUpload({
  tipo,
  label,
  required = false,
  onFileSelect,
  currentFile,
  maxSizeMB = 100,
  acceptedTypes = ['application/pdf'],
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return 'Apenas arquivos PDF são permitidos';
    }
    if (file.size > maxSizeBytes) {
      return `Arquivo deve ter no máximo ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleFileChange = (files: FileList | null) => {
    setError(null);
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelect({ file, tipo });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>
      
      {currentFile ? (
        <Card className="bg-accent/30">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium truncate max-w-[200px]">
                  {currentFile.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(currentFile.file.size)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={removeFile}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            error && 'border-destructive'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files)}
          />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Arraste um PDF ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Máximo {maxSizeMB}MB
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}

// Component for multiple file requirements
interface AttachmentRequirement {
  tipo: string;
  label: string;
  required: boolean;
}

interface MultiFileUploadProps {
  requirements: AttachmentRequirement[];
  files: Record<string, UploadedFile | null>;
  onFilesChange: (files: Record<string, UploadedFile | null>) => void;
}

export function MultiFileUpload({ requirements, files, onFilesChange }: MultiFileUploadProps) {
  const handleFileSelect = (tipo: string, file: UploadedFile | null) => {
    onFilesChange({ ...files, [tipo]: file });
  };

  return (
    <div className="space-y-4">
      {requirements.map((req) => (
        <FileUpload
          key={req.tipo}
          tipo={req.tipo}
          label={req.label}
          required={req.required}
          currentFile={files[req.tipo]}
          onFileSelect={(file) => handleFileSelect(req.tipo, file)}
        />
      ))}
    </div>
  );
}

// Component for optional "Outros Anexos" (multiple files)
interface OtherFilesUploadProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

export function OtherFilesUpload({ files, onFilesChange, maxFiles = 5 }: OtherFilesUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Apenas arquivos PDF são permitidos';
    }
    if (file.size > maxSizeBytes) {
      return 'Arquivo deve ter no máximo 100MB';
    }
    return null;
  };

  const handleFileChange = (fileList: FileList | null) => {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const newFiles: UploadedFile[] = [];
    let hasError = false;

    for (let i = 0; i < fileList.length; i++) {
      if (files.length + newFiles.length >= maxFiles) {
        setError(`Máximo de ${maxFiles} arquivos permitidos`);
        break;
      }

      const file = fileList[i];
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        hasError = true;
        break;
      }

      // Check for duplicate file names
      const isDuplicate = files.some(f => f.file.name === file.name);
      if (isDuplicate) {
        setError(`Arquivo "${file.name}" já foi adicionado`);
        hasError = true;
        break;
      }

      newFiles.push({ file, tipo: `outros_${Date.now()}_${i}` });
    }

    if (!hasError && newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3 pt-4 border-t">
      <label className="text-sm font-medium flex items-center gap-2">
        Outros Anexos
        <span className="text-xs text-muted-foreground font-normal">(opcional - máx. {maxFiles} arquivos)</span>
      </label>

      {/* List of uploaded files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadedFile, index) => (
            <Card key={index} className="bg-accent/30">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload area - only show if under max files */}
      {files.length < maxFiles && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
            error && 'border-destructive'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files)}
          />
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
          <p className="text-sm text-muted-foreground">
            Arraste PDFs ou clique para adicionar anexos extras
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}