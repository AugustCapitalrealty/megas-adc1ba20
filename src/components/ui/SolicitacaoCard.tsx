import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { CorrectionDeadlineBadge } from '@/components/CorrectionDeadlineBadge';
import { WorkflowProgress } from '@/components/WorkflowProgress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  EMPREENDIMENTO_LABELS, 
  TIPO_CONTRATACAO_LABELS,
  type Solicitacao,
  type Fornecedor,
  type DocumentoEmitido,
  type DocumentoFiscal,
} from '@/types';
import { ChevronDown, ChevronUp, User, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SolicitacaoWithDetails extends Solicitacao {
  fornecedor?: Fornecedor | null;
  documentoEmitido?: DocumentoEmitido | null;
  documentosFiscais?: DocumentoFiscal[];
  solicitante_nome?: string | null;
}

export interface SolicitacaoCardProps {
  solicitacao: SolicitacaoWithDetails;
  variant?: 'compact' | 'detailed';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showOwnerBadge?: boolean;
  actionBanner?: ReactNode;
  headerActions?: ReactNode;
  expandedContent?: ReactNode;
  infoAlert?: ReactNode;
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getFornecedorNome = (sol: SolicitacaoWithDetails) => {
  if (!sol.fornecedor) return null;
  return sol.fornecedor.nome_fantasia || sol.fornecedor.razao_social || null;
};

export function SolicitacaoCard({
  solicitacao: sol,
  variant = 'detailed',
  isExpanded = false,
  onToggleExpand,
  showOwnerBadge = false,
  actionBanner,
  headerActions,
  expandedContent,
  infoAlert,
  className,
}: SolicitacaoCardProps) {
  const fornecedorNome = getFornecedorNome(sol);
  const [copied, setCopied] = useState(false);

  const handleCopyProtocolo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sol.protocolo) {
      navigator.clipboard.writeText(sol.protocolo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const valorTotal = sol.faturamento_direto && sol.valor_servico !== null && sol.valor_material !== null
    ? (sol.valor_servico || 0) + (sol.valor_material || 0)
    : sol.valor;

  return (
    <Card className={cn('transition-all', className)}>
      {/* Action Banner Slot */}
      {actionBanner}
      
      {/* Owner Badge for empreendimento view */}
      {showOwnerBadge && sol.solicitante_nome && (
        <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Solicitado por: <strong className="text-foreground">{sol.solicitante_nome}</strong></span>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopyProtocolo}
                  className="font-semibold text-base inline-flex items-center gap-1 hover:text-primary transition-colors group/proto"
                  aria-label={`Copiar protocolo ${sol.protocolo}`}
                >
                  #{sol.protocolo}
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-0 group-hover/proto:opacity-50 transition-opacity" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {copied ? 'Copiado!' : 'Clique para copiar'}
              </TooltipContent>
            </Tooltip>
            <StatusBadge status={sol.status} />
            <CorrectionDeadlineBadge 
              dataPendenteCorrecao={sol.data_pendente_correcao} 
              status={sol.status} 
            />
            {sol.emergencial && (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded font-medium">
                Emergencial
              </span>
            )}
            {sol.numero_chamado_fluig && sol.numero_chamado_fluig === 'RM' && (
              <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                RM
              </Badge>
            )}
            {sol.numero_chamado_fluig && sol.numero_chamado_fluig !== 'RM' && (
              <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                Fluig: {sol.numero_chamado_fluig}
              </Badge>
            )}
            {sol.tipo_contratacao && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                {TIPO_CONTRATACAO_LABELS[sol.tipo_contratacao]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {onToggleExpand && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleExpand}
                aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Info Alert Slot (for rejection reasons, info requests, etc) */}
        {infoAlert}
        
        {variant === 'detailed' ? (
          <div className="space-y-2">
            {/* Description as primary content */}
            <ExpandableDescription description={sol.descricao} maxLength={120} />
            
            {/* Compact metadata line */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span>{sol.tipo}</span>
              <span className="text-border">•</span>
              <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
              {fornecedorNome && (
                <>
                  <span className="text-border">•</span>
                  <span className="truncate max-w-[200px]">{fornecedorNome}</span>
                </>
              )}
              <span className="text-border">•</span>
              <span className="font-semibold text-foreground">{formatCurrency(valorTotal)}</span>
              {sol.valor_servico !== null && sol.valor_material !== null && sol.faturamento_direto && (
                <span className="text-xs">
                  (S: {formatCurrency(sol.valor_servico || 0)} | M: {formatCurrency(sol.valor_material || 0)})
                </span>
              )}
              <span className="text-border">•</span>
              <span>{new Date(sol.created_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
            </div>
            
            {/* Workflow Progress Bar */}
            <WorkflowProgress status={sol.status} className="mt-2" />
          </div>
        ) : (
          // Compact variant
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{sol.tipo}</span>
              <span className="text-muted-foreground">{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
              <span className="font-medium">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
        )}
        
        {/* Expanded Content Slot */}
        {isExpanded && expandedContent && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {expandedContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
