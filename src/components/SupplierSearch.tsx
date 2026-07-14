import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCNPJ, dbRowToFornecedor } from '@/hooks/useCNPJ';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Building2, RefreshCw, Globe } from 'lucide-react';
import { type Fornecedor } from '@/types';
import { cn } from '@/lib/utils';
import { FornecedorCard } from './FornecedorCard';
import { useToast } from '@/hooks/use-toast';
import { InternationalSupplierForm } from './InternationalSupplierForm';
import { ManualSupplierForm } from './ManualSupplierForm';
import { AlertTriangle } from 'lucide-react';

interface SupplierSearchProps {
  label: string;
  required?: boolean;
  value: Fornecedor | null;
  onChange: (fornecedor: Fornecedor | null) => void;
  compact?: boolean;
}

export function SupplierSearch({ label, required = false, value, onChange, compact = false }: SupplierSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Fornecedor[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showIntlForm, setShowIntlForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualPrefill, setManualPrefill] = useState('');
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const { formatCNPJ, lookupCNPJ, loading: cnpjLoading, error, apiStatus, clearError } = useCNPJ();
  const { toast } = useToast();

  // Debounced search for suggestions
  useEffect(() => {
    const searchFornecedores = async () => {
      const term = searchTerm.replace(/\D/g, '').length >= 3 
        ? searchTerm.replace(/\D/g, '') // Search by CNPJ digits
        : searchTerm.trim();
      
      if (term.length < 3) {
        setSuggestions([]);
        return;
      }

      setSearchLoading(true);
      
      // Check if it looks like a CNPJ (mostly digits)
      const isLikelyCNPJ = searchTerm.replace(/\D/g, '').length >= 8;
      
      let query = supabase
        .from('fornecedores')
        .select('*')
        .limit(10);

      if (isLikelyCNPJ) {
        query = query.ilike('cnpj', `%${searchTerm.replace(/\D/g, '')}%`);
      } else {
        query = query.or(`razao_social.ilike.%${term}%,nome_fantasia.ilike.%${term}%,identificador_fiscal.ilike.%${term}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setSuggestions(data.map(dbRowToFornecedor));
      }
      setSearchLoading(false);
    };

    const timer = setTimeout(searchFornecedores, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearch = async () => {
    const cleanCNPJ = searchTerm.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;

    setApiUnavailable(false);
    const result = await lookupCNPJ(searchTerm);
    if (result) {
      onChange(result);
      setSearchTerm('');
      setSuggestions([]);
      setShowSuggestions(false);
      
      // Mostrar alerta se fornecedor com situação irregular
      if (result.situacao_cadastral_descricao && 
          !result.situacao_cadastral_descricao.toUpperCase().includes('ATIVA')) {
        toast({
          title: '⚠️ Atenção: Fornecedor com status irregular',
          description: `Situação: ${result.situacao_cadastral_descricao}. Verifique antes de prosseguir.`,
          variant: 'destructive',
        });
      }
    } else if (apiStatus === 'unavailable' || apiStatus === 'network') {
      setApiUnavailable(true);
      toast({
        title: 'Receita Federal indisponível',
        description: 'Você pode cadastrar este CNPJ manualmente e atualizar os dados depois.',
        variant: 'destructive',
      });
    }
  };

  const openManual = (prefill: string) => {
    setManualPrefill(prefill);
    setShowManualForm(true);
    setApiUnavailable(false);
    clearError();
    setShowSuggestions(false);
  };

  const handleRefresh = async () => {
    if (!value || !value.cnpj) return;
    
    setRefreshing(true);
    const result = await lookupCNPJ(value.cnpj, true); // Force refresh
    if (result) {
      onChange(result);
      toast({
        title: 'Dados atualizados',
        description: 'Os dados do fornecedor foram atualizados da Receita Federal.',
      });
    }
    setRefreshing(false);
  };

  const handleSelectSuggestion = async (fornecedor: Fornecedor) => {
    // Internacional: usar como está, sem buscar BrasilAPI
    if ((fornecedor.tipo_fornecedor ?? 'nacional') === 'internacional') {
      onChange(fornecedor);
      setSearchTerm('');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    // Se não tem dados enriquecidos, tenta buscar da API
    if (!fornecedor.ultima_atualizacao_api && fornecedor.cnpj) {
      setSearchLoading(true);
      const enrichedFornecedor = await lookupCNPJ(fornecedor.cnpj);
      setSearchLoading(false);
      
      if (enrichedFornecedor) {
        onChange(enrichedFornecedor);
        
        // Mostrar alerta se fornecedor com situação irregular
        if (enrichedFornecedor.situacao_cadastral_descricao && 
            !enrichedFornecedor.situacao_cadastral_descricao.toUpperCase().includes('ATIVA')) {
          toast({
            title: '⚠️ Atenção: Fornecedor com status irregular',
            description: `Situação: ${enrichedFornecedor.situacao_cadastral_descricao}. Verifique antes de prosseguir.`,
            variant: 'destructive',
          });
        }
      } else {
        onChange(fornecedor);
      }
    } else {
      onChange(fornecedor);
      
      // Mostrar alerta se fornecedor com situação irregular
      if (fornecedor.situacao_cadastral_descricao && 
          !fornecedor.situacao_cadastral_descricao.toUpperCase().includes('ATIVA')) {
        toast({
          title: '⚠️ Atenção: Fornecedor com status irregular',
          description: `Situação: ${fornecedor.situacao_cadastral_descricao}. Verifique antes de prosseguir.`,
          variant: 'destructive',
        });
      }
    }
    
    setSearchTerm('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
    setSuggestions([]);
  };

  const handleInputFocus = () => {
    if (searchTerm.length >= 3) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const isCNPJComplete = searchTerm.replace(/\D/g, '').length === 14;
  const isInternational = (value?.tipo_fornecedor ?? 'nacional') === 'internacional';

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      {value ? (
        <div className="space-y-2">
          <FornecedorCard 
            fornecedor={value}
            onClear={handleClear}
            showClearButton={true}
            compact={compact}
            formatCNPJ={formatCNPJ}
          />
          {!compact && !isInternational && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar dados da Receita Federal
            </Button>
          )}
        </div>
      ) : showIntlForm ? (
        <InternationalSupplierForm
          onCreated={(f) => { setShowIntlForm(false); onChange(f); }}
          onCancel={() => setShowIntlForm(false)}
        />
      ) : showManualForm ? (
        <ManualSupplierForm
          initialCNPJ={manualPrefill}
          onCreated={(f) => { setShowManualForm(false); setSearchTerm(''); onChange(f); }}
          onCancel={() => setShowManualForm(false)}
        />
      ) : (
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                placeholder="Buscar por CNPJ, nome ou razão social..."
                value={searchTerm.replace(/\D/g, '').length >= 11 ? formatCNPJ(searchTerm) : searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isCNPJComplete) {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              {(searchLoading || cnpjLoading) && (
                <div className="absolute right-3 top-2.5 flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Buscando...</span>
                </div>
              )}
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={cnpjLoading || !isCNPJComplete}
              title={!isCNPJComplete ? 'Digite um CNPJ completo para buscar na Receita Federal' : 'Buscar CNPJ na Receita Federal'}
            >
              {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowIntlForm(true)}
              title="Cadastrar fornecedor internacional (sem CNPJ)"
            >
              <Globe className="h-4 w-4 mr-1" />
              Internacional
            </Button>
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="p-1">
                <p className="text-xs text-muted-foreground px-2 py-1">
                  Fornecedores cadastrados:
                </p>
                {suggestions.map((fornecedor) => (
                  <button
                    key={fornecedor.id}
                    className={cn(
                      "w-full text-left px-2 py-2 rounded hover:bg-accent cursor-pointer",
                      "flex items-start gap-2"
                    )}
                    onClick={() => handleSelectSuggestion(fornecedor)}
                  >
                    <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {fornecedor.razao_social || fornecedor.nome_fantasia || 'Sem nome'}
                        </p>
                        {fornecedor.situacao_cadastral_descricao && (
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded",
                            fornecedor.situacao_cadastral_descricao.toUpperCase().includes('ATIVA')
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-destructive/10 text-destructive"
                          )}>
                            {fornecedor.situacao_cadastral_descricao}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(fornecedor.tipo_fornecedor ?? 'nacional') === 'internacional'
                          ? `🌐 ${fornecedor.pais ?? ''} • ${fornecedor.tipo_identificador_fiscal ?? 'ID'}: ${fornecedor.identificador_fiscal ?? '—'}`
                          : `${formatCNPJ(fornecedor.cnpj ?? '')}${fornecedor.cidade ? ` • ${fornecedor.cidade}/${fornecedor.uf}` : ''}`}
                      </p>
                      {fornecedor.cnae_principal_descricao && (
                        <p className="text-xs text-muted-foreground truncate">
                          CNAE: {fornecedor.cnae_principal_codigo}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {showSuggestions && searchTerm.length >= 3 && suggestions.length === 0 && !searchLoading && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3">
              <p className="text-sm text-muted-foreground text-center mb-2">
                {isCNPJComplete 
                  ? 'CNPJ não encontrado. Clique no botão de busca para consultar na Receita Federal.'
                  : 'Nenhum fornecedor encontrado. Digite um CNPJ completo para cadastrar.'}
              </p>
              <div className="flex flex-col gap-2">
                {isCNPJComplete && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onMouseDown={(e) => { e.preventDefault(); openManual(searchTerm.replace(/\D/g, '')); }}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    Cadastrar manualmente (sem consultar Receita)
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onMouseDown={(e) => { e.preventDefault(); setShowIntlForm(true); setShowSuggestions(false); }}
                >
                  <Globe className="h-4 w-4 mr-1" />
                  Cadastrar fornecedor internacional
                </Button>
              </div>
            </div>
          )}

          {/* API indisponível → oferecer cadastro manual */}
          {apiUnavailable && (
            <div className="mt-2 p-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
              <div className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Receita Federal (BrasilAPI) indisponível para este CNPJ.</p>
                  <p className="text-xs mt-0.5">Você pode cadastrar manualmente agora e atualizar os dados quando a API voltar.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openManual(searchTerm.replace(/\D/g, ''))}
                >
                  <Building2 className="h-4 w-4 mr-1" />
                  Cadastrar manualmente
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSearch}
                  disabled={cnpjLoading}
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {error && !apiUnavailable && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
