import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { ExpandableDescription } from '@/components/ExpandableDescription';
import { CorrectionDeadlineBadge } from '@/components/CorrectionDeadlineBadge';
import { 
  EMPREENDIMENTO_LABELS, 
  TIPO_CONTRATACAO_LABELS,
  type Solicitacao,
  type Fornecedor,
  type DocumentoEmitido,
  type DocumentoFiscal,
} from '@/types';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
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
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-lg">#{sol.protocolo}</CardTitle>
            <StatusBadge status={sol.status} />
            <CorrectionDeadlineBadge 
              dataPendenteCorrecao={sol.data_pendente_correcao} 
              status={sol.status} 
            />
            {sol.emergencial && (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
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
      
      <CardContent>
        {/* Info Alert Slot (for rejection reasons, info requests, etc) */}
        {infoAlert}
        
        {variant === 'detailed' ? (
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <span className="font-medium">{sol.tipo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empreendimento</span>
              <span>{EMPREENDIMENTO_LABELS[sol.empreendimento]}</span>
            </div>
            {fornecedorNome && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fornecedor</span>
                <span className="text-right max-w-[60%] truncate">{fornecedorNome}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Total</span>
              <span className="font-medium">{formatCurrency(valorTotal)}</span>
            </div>
            {sol.valor_servico !== null && sol.valor_material !== null && sol.faturamento_direto && (
              <div className="flex justify-between text-xs text-muted-foreground pl-2">
                <span>(Serviço: {formatCurrency(sol.valor_servico || 0)} | Material: {formatCurrency(sol.valor_material || 0)})</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data</span>
              <span>{new Date(sol.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="mt-2 pt-2 border-t">
              <span className="text-muted-foreground block mb-1">Descrição</span>
              <ExpandableDescription description={sol.descricao} maxLength={100} />
            </div>
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
