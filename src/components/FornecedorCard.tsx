import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Copy, 
  Check,
  AlertTriangle,
  Loader2,
  Info,
  Globe
} from 'lucide-react';
import { type Fornecedor } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getPais } from '@/lib/paises';

interface FornecedorCardProps {
  fornecedor: Fornecedor;
  onClear?: () => void;
  showClearButton?: boolean;
  compact?: boolean;
  loading?: boolean;
  formatCNPJ: (cnpj: string) => string;
}

export function FornecedorCard({ 
  fornecedor, 
  onClear, 
  showClearButton = true,
  compact = false,
  loading = false,
  formatCNPJ 
}: FornecedorCardProps) {
  const [cnaesOpen, setCnaesOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const isIntl = (fornecedor.tipo_fornecedor ?? 'nacional') === 'internacional';
  const paisInfo = isIntl ? getPais(fornecedor.pais) : undefined;
  const idLabel = isIntl
    ? `${fornecedor.tipo_identificador_fiscal ?? 'ID'}: ${fornecedor.identificador_fiscal ?? '—'}`
    : null;

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: 'Copiado!',
        description: `${field} copiado para a área de transferência.`,
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        variant: 'destructive',
      });
    }
  };

  const getSituacaoStyle = (situacao: number | null, descricao: string | null) => {
    const desc = descricao?.toUpperCase() || '';
    if (desc.includes('ATIVA') || situacao === 2) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    }
    if (desc.includes('BAIXADA') || situacao === 8) {
      return 'bg-muted text-muted-foreground';
    }
    if (desc.includes('INAPTA') || desc.includes('SUSPENSA') || situacao === 4 || situacao === 3) {
      return 'bg-destructive/10 text-destructive';
    }
    return 'bg-warning/10 text-warning';
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    } catch {
      return dateStr;
    }
  };

  const isIrregular = fornecedor.situacao_cadastral_descricao && 
    !fornecedor.situacao_cadastral_descricao.toUpperCase().includes('ATIVA');

  const hasEnrichedData = fornecedor.cnae_principal_codigo || fornecedor.situacao_cadastral_descricao;

  // Versão compacta para listagens
  if (compact) {
    return (
      <Card className={cn(
        "bg-accent/50 transition-colors",
        isIrregular && "border-destructive/50"
      )}>
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">
                {fornecedor.razao_social || fornecedor.nome_fantasia || 'Sem nome'}
              </p>
              {isIntl && (
                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Globe className="h-3 w-3 mr-1" />
                  {paisInfo ? `${paisInfo.bandeira} ${paisInfo.iso}` : 'Internacional'}
                </Badge>
              )}
              {!isIntl && fornecedor.situacao_cadastral_descricao && (
                <Badge variant="outline" className={cn("text-xs", getSituacaoStyle(fornecedor.situacao_cadastral, fornecedor.situacao_cadastral_descricao))}>
                  {fornecedor.situacao_cadastral_descricao}
                </Badge>
              )}
              {!isIntl && fornecedor.is_mei && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        className={cn(
                          "text-xs cursor-help",
                          "bg-orange-100 text-orange-800 border-orange-300",
                          "dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700"
                        )}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        MEI
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium text-sm">Fornecedor MEI</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Pode ter impactos tributários e limites de faturamento.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {fornecedor.nome_fantasia && fornecedor.razao_social && (
              <p className="text-xs text-muted-foreground truncate">{fornecedor.nome_fantasia}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {isIntl
                ? `${idLabel}${fornecedor.moeda_padrao ? ` • ${fornecedor.moeda_padrao}` : ''}`
                : `${formatCNPJ(fornecedor.cnpj ?? '')}${fornecedor.cidade ? ` • ${fornecedor.cidade}/${fornecedor.uf}` : ''}`}
            </p>
            {!isIntl && fornecedor.cnae_principal_descricao && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                CNAE: {fornecedor.cnae_principal_codigo} - {fornecedor.cnae_principal_descricao}
              </p>
            )}
          </div>
          {showClearButton && onClear && (
            <Button variant="ghost" size="icon" onClick={onClear} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Versão completa
  return (
    <Card className={cn(
      "bg-card transition-colors",
      isIrregular && "border-destructive/50"
    )}>
      <CardContent className="p-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Buscando dados do CNPJ...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Header: Nome e Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isIntl ? <Globe className="h-5 w-5 text-primary flex-shrink-0" /> : <Building2 className="h-5 w-5 text-primary flex-shrink-0" />}
                  <h3 className="font-semibold text-base truncate">
                    {fornecedor.razao_social || fornecedor.nome_fantasia || 'Sem nome'}
                  </h3>
                </div>
                {fornecedor.nome_fantasia && fornecedor.razao_social && (
                  <p className="text-sm text-muted-foreground ml-7">{fornecedor.nome_fantasia}</p>
                )}
                {isIntl ? (
                  <p className="text-sm text-muted-foreground ml-7">
                    {paisInfo ? `${paisInfo.bandeira} ${paisInfo.nome}` : 'País não informado'} • {idLabel}
                    {fornecedor.moeda_padrao && ` • Moeda: ${fornecedor.moeda_padrao}`}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground ml-7">
                    CNPJ: {formatCNPJ(fornecedor.cnpj ?? '')}
                  </p>
                )}
              </div>
              {showClearButton && onClear && (
                <Button variant="ghost" size="icon" onClick={onClear}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Status, MEI e Porte (nacional) ou Badge Internacional */}
            <div className="flex flex-wrap items-center gap-2">
              {isIntl && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <Globe className="h-3 w-3 mr-1" />
                  Fornecedor internacional
                </Badge>
              )}
              {!isIntl && fornecedor.situacao_cadastral_descricao && (
                <Badge 
                  variant="outline" 
                  className={cn("text-sm font-medium", getSituacaoStyle(fornecedor.situacao_cadastral, fornecedor.situacao_cadastral_descricao))}
                >
                  {fornecedor.situacao_cadastral_descricao}
                  {fornecedor.data_situacao_cadastral && (
                    <span className="ml-1 opacity-75">
                      desde {formatDate(fornecedor.data_situacao_cadastral)}
                    </span>
                  )}
                </Badge>
              )}
              {!isIntl && fornecedor.is_mei && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        className={cn(
                          "cursor-help transition-colors",
                          "bg-orange-100 text-orange-800 border-orange-300",
                          "hover:bg-orange-200",
                          "dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700"
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
                          Valide as regras internas antes de prosseguir.
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isIntl && fornecedor.porte && (
                <Badge variant="outline" className="text-muted-foreground">
                  {fornecedor.porte}
                </Badge>
              )}
            </div>

            {/* Alerta de situação irregular */}
            {!isIntl && isIrregular && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Atenção: Fornecedor com situação irregular
                  </p>
                  <p className="text-xs text-destructive/80">
                    Verifique a situação cadastral antes de prosseguir com esta solicitação.
                  </p>
                </div>
              </div>
            )}

            {/* CNAE Principal */}
            {!isIntl && fornecedor.cnae_principal_codigo && (
              <div className="bg-accent/50 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      CNAE Principal
                    </p>
                    <p className="text-sm font-medium">
                      {fornecedor.cnae_principal_codigo} - {fornecedor.cnae_principal_descricao}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => handleCopy(
                      `${fornecedor.cnae_principal_codigo} - ${fornecedor.cnae_principal_descricao}`,
                      'CNAE Principal'
                    )}
                  >
                    {copiedField === 'CNAE Principal' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* CNAEs Secundários (colapsável) */}
            {!isIntl && fornecedor.cnaes_secundarios && fornecedor.cnaes_secundarios.length > 0 && (
              <Collapsible open={cnaesOpen} onOpenChange={setCnaesOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                    <span className="text-sm text-muted-foreground">
                      CNAEs Secundários ({fornecedor.cnaes_secundarios.length})
                    </span>
                    {cnaesOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-2">
                  {fornecedor.cnaes_secundarios.map((cnae) => (
                    <div 
                      key={cnae.codigo} 
                      className="text-xs text-muted-foreground bg-accent/30 rounded px-2 py-1.5"
                    >
                      <span className="font-mono">{cnae.codigo}</span> - {cnae.descricao}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Endereço */}
            {(fornecedor.logradouro || fornecedor.endereco) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  {fornecedor.logradouro ? (
                    <>
                      <p>
                        {fornecedor.logradouro}
                        {fornecedor.numero && `, ${fornecedor.numero}`}
                        {fornecedor.complemento && ` - ${fornecedor.complemento}`}
                      </p>
                      <p className="text-muted-foreground">
                        {fornecedor.bairro && `${fornecedor.bairro} - `}
                        {fornecedor.cidade}/{fornecedor.uf}
                        {fornecedor.cep && ` - CEP ${fornecedor.cep}`}
                      </p>
                    </>
                  ) : (
                    <p>{fornecedor.endereco}</p>
                  )}
                </div>
              </div>
            )}

            {/* Contato */}
            <div className="flex flex-wrap gap-4 text-sm">
              {fornecedor.telefone && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{fornecedor.telefone}</span>
                </div>
              )}
              {fornecedor.email && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{fornecedor.email}</span>
                </div>
              )}
              {fornecedor.data_inicio_atividade && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Desde {formatDate(fornecedor.data_inicio_atividade)}</span>
                </div>
              )}
            </div>

            {/* Informações adicionais */}
            {(fornecedor.natureza_juridica || fornecedor.capital_social) && (
              <div className="text-xs text-muted-foreground border-t pt-3 mt-3 space-y-1">
                {fornecedor.natureza_juridica && (
                  <p><span className="font-medium">Natureza Jurídica:</span> {fornecedor.natureza_juridica}</p>
                )}
                {fornecedor.capital_social && fornecedor.capital_social > 0 && (
                  <p>
                    <span className="font-medium">Capital Social:</span>{' '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fornecedor.capital_social)}
                  </p>
                )}
              </div>
            )}

            {/* Indicador de dados não enriquecidos */}
            {!isIntl && !hasEnrichedData && (
              <div className="text-xs text-muted-foreground text-center py-2 border-t">
                Dados básicos. Clique em buscar para atualizar informações da Receita Federal.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
