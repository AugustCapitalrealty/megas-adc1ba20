import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DescriptionQualityBadgeProps {
  isVague: boolean | null | undefined;
  suggestion: string | null | undefined;
  className?: string;
}

export function DescriptionQualityBadge({ isVague, suggestion, className }: DescriptionQualityBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no cached result
  if (isVague === null || isVague === undefined) {
    return null;
  }

  if (!isVague) {
    return (
      <div className={cn(
        "p-3 rounded-lg border-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
        className
      )}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="font-medium text-sm text-green-800 dark:text-green-300">
            Descrição adequada
          </span>
        </div>
        <p className="text-xs text-green-700 dark:text-green-400 mt-2 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          A descrição do serviço/material está suficientemente detalhada
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      "p-3 rounded-lg border-2 bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800",
      className
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-sm text-amber-800 dark:text-amber-300">
              Descrição possivelmente vaga
            </span>
          </div>
          {suggestion && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 hover:bg-transparent">
                <span className="text-xs text-muted-foreground mr-1">Ver sugestão</span>
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>

        {suggestion && (
          <CollapsibleContent className="pt-2">
            <Alert className="border bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <AlertDescription>
                <p className="text-sm">{suggestion}</p>
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}
