import { logger } from '@/lib/logger';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  Lightbulb,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCNAEValidation, type CNAEValidationResult } from '@/hooks/useCNAEValidation';
import type { Fornecedor } from '@/types';

interface CachedCNAEResult {
  status: string;
  justificativa: string;
}

interface CNAECompatibilityBadgeProps {
  descricao: string;
  fornecedor: Fornecedor | null;
  enabled?: boolean;
  className?: string;
  cachedResult?: CachedCNAEResult | null;
}

export function CNAECompatibilityBadge({ 
  descricao, 
  fornecedor, 
  enabled = true,
  className,
  cachedResult 
}: CNAECompatibilityBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Skip AI call when we have cached results from the database
  const { isValidating, validationResult: liveResult, error } = useCNAEValidation({
    descricao,
    fornecedor,
    enabled: enabled && !cachedResult
  });
  
  // Use cached result if available, otherwise use live AI result
  const validationResult: CNAEValidationResult | null = cachedResult
    ? {
        status: cachedResult.status as CNAEValidationResult['status'],
        score_confianca: 0,
        justificativa_curta: cachedResult.justificativa || '',
        itens_extraidos: [],
        cnaes_considerados: [],
      }
    : liveResult;
  
  // Não renderiza nada se não há fornecedor ou CNAE
  if (!fornecedor || !fornecedor.cnae_principal_codigo) {
    return null;
  }
  
  // Descrição muito curta
  if (descricao.length < 20) {
    return null;
  }
  
  // Loading state
  if (isValidating) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          Verificando compatibilidade...
        </Badge>
      </div>
    );
  }
  
  // Erro - não mostra badge, apenas log
  if (error) {
    logger.warn('CNAE validation error:', error);
    return null;
  }
  
  // Sem resultado
  if (!validationResult) {
    return null;
  }
  
  const { status, score_confianca, justificativa_curta, itens_extraidos, cnaes_considerados } = validationResult;
  
  // Config visual por status
  const statusConfig = {
    compativel: {
      icon: CheckCircle2,
      label: 'Compatível com CNAE',
      badgeClass: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
      alertClass: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
      iconClass: 'text-green-600 dark:text-green-400',
    },
    incompativel: {
      icon: AlertTriangle,
      label: 'Possível incompatibilidade',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700',
      alertClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
      iconClass: 'text-amber-600 dark:text-amber-400',
    },
    insuficiente: {
      icon: HelpCircle,
      label: 'Não foi possível avaliar',
      badgeClass: 'bg-muted text-muted-foreground border-border',
      alertClass: 'bg-muted/30 border-border',
      iconClass: 'text-muted-foreground',
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      "p-3 rounded-lg border-2 transition-colors",
      status === 'compativel' && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
      status === 'incompativel' && "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800",
      status === 'insuficiente' && "bg-muted/30 border-border",
      className
    )}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.iconClass)} />
            <span className={cn(
              "font-medium text-sm",
              status === 'compativel' && "text-green-800 dark:text-green-300",
              status === 'incompativel' && "text-amber-800 dark:text-amber-300",
              status === 'insuficiente' && "text-muted-foreground"
            )}>
              {config.label}
            </span>
            {score_confianca > 0 && status === 'compativel' && (
              <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                {score_confianca}% confiança
              </Badge>
            )}
          </div>
          {status !== 'compativel' && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 hover:bg-transparent"
              >
                <span className="text-xs text-muted-foreground mr-1">Ver detalhes</span>
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        
        {status !== 'compativel' && (
          <CollapsibleContent className="pt-2">
            <Alert className={cn("border", config.alertClass)}>
              <Icon className={cn("h-4 w-4", config.iconClass)} />
              <AlertDescription className="space-y-3">
                {/* Justificativa */}
                <p className="text-sm">{justificativa_curta}</p>
                
                {/* Sugestões */}
                {status === 'incompativel' && (
                  <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <strong>Sugestões:</strong> Detalhe melhor o serviço/produto na descrição, 
                      ou confirme se este fornecedor realmente executa este tipo de atividade.
                    </p>
                  </div>
                )}
                
                {status === 'insuficiente' && (
                  <div className="flex items-start gap-2 pt-2 border-t border-border/50">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <strong>Dica:</strong> Inclua mais detalhes específicos na descrição 
                      (ex: tipo de serviço, material, local de aplicação).
                    </p>
                  </div>
                )}
                
                {/* Itens extraídos */}
                {itens_extraidos && itens_extraidos.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Itens identificados na descrição:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {itens_extraidos.map((item, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-xs font-normal"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Score de confiança */}
                {score_confianca > 0 && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Confiança da análise: {score_confianca}%
                  </p>
                )}
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        )}
      </Collapsible>
      
      {/* Mensagem de compatibilidade */}
      {status === 'compativel' && (
        <p className="text-xs text-green-700 dark:text-green-400 mt-2 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          A descrição parece compatível com o CNAE do fornecedor
        </p>
      )}
    </div>
  );
}
