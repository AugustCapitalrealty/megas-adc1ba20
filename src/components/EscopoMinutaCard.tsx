import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Copy, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EscopoMinutaCardProps {
  escopo: string | null;
  protocolo: string;
  onSolicitarAjuste?: () => void;
  showActions?: boolean;
}

export function EscopoMinutaCard({ 
  escopo, 
  protocolo, 
  onSolicitarAjuste,
  showActions = true 
}: EscopoMinutaCardProps) {
  const { toast } = useToast();

  if (!escopo) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(escopo);
      toast({
        title: 'Copiado!',
        description: 'Escopo copiado para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o texto.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-200">
          <FileText className="h-5 w-5" />
          Escopo para Minuta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[150px] w-full rounded-md border bg-background p-3">
          <p className="text-sm whitespace-pre-wrap">{escopo}</p>
        </ScrollArea>
        
        {showActions && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
            {onSolicitarAjuste && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSolicitarAjuste}
                className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950"
              >
                <Edit className="h-4 w-4" />
                Solicitar Ajuste
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
