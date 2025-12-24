import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MEIAlertBadgeProps {
  className?: string;
  showInlineAlert?: boolean;
  valorTotal?: number;
}

export function MEIAlertBadge({ className, showInlineAlert = false, valorTotal }: MEIAlertBadgeProps) {
  const isHighValue = valorTotal && valorTotal > 5000;
  
  return (
    <div className={cn("space-y-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className={cn(
                "cursor-help transition-colors",
                "bg-orange-100 text-orange-800 border-orange-300",
                "hover:bg-orange-200",
                "dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700",
                "dark:hover:bg-orange-900/60"
              )}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              MEI
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-3">
            <div className="space-y-2">
              <p className="font-medium text-sm flex items-center gap-1.5">
                <Info className="h-4 w-4" />
                Fornecedor MEI
              </p>
              <p className="text-xs text-muted-foreground">
                Microempreendedor Individual pode ter impactos tributários e limites de faturamento anual (R$ 81.000).
              </p>
              <p className="text-xs text-muted-foreground">
                Valide as regras internas antes de prosseguir com valores elevados.
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {showInlineAlert && (
        <Alert className={cn(
          "border",
          isHighValue 
            ? "bg-orange-100 border-orange-300 dark:bg-orange-950/40 dark:border-orange-800" 
            : "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-900"
        )}>
          <AlertTriangle className={cn(
            "h-4 w-4",
            isHighValue ? "text-orange-700 dark:text-orange-400" : "text-orange-600 dark:text-orange-500"
          )} />
          <AlertDescription className={cn(
            "text-sm",
            isHighValue ? "text-orange-800 dark:text-orange-300" : "text-orange-700 dark:text-orange-400"
          )}>
            <span className="font-medium">Fornecedor MEI</span>
            <p className="mt-1 text-xs opacity-90">
              Pode haver impactos tributários e limites de faturamento. 
              {isHighValue && (
                <strong className="block mt-1">
                  ⚠️ Valor elevado: confirme limites/regras internas para MEI.
                </strong>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
