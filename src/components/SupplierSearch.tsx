import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCNPJ } from '@/hooks/useCNPJ';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, X, Building2 } from 'lucide-react';
import { type Fornecedor } from '@/types';
import { cn } from '@/lib/utils';

interface SupplierSearchProps {
  label: string;
  required?: boolean;
  value: Fornecedor | null;
  onChange: (fornecedor: Fornecedor | null) => void;
}

export function SupplierSearch({ label, required = false, value, onChange }: SupplierSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Fornecedor[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const { formatCNPJ, lookupCNPJ, loading: cnpjLoading, error } = useCNPJ();

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
        query = query.or(`razao_social.ilike.%${term}%,nome_fantasia.ilike.%${term}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setSuggestions(data as Fornecedor[]);
      }
      setSearchLoading(false);
    };

    const timer = setTimeout(searchFornecedores, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearch = async () => {
    const cleanCNPJ = searchTerm.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;
    
    const result = await lookupCNPJ(searchTerm);
    if (result) {
      onChange(result);
      setSearchTerm('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (fornecedor: Fornecedor) => {
    onChange(fornecedor);
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

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      
      {value ? (
        <Card className="bg-accent/50">
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{value.razao_social || value.nome_fantasia || 'Sem nome'}</p>
              {value.nome_fantasia && value.razao_social && (
                <p className="text-xs text-muted-foreground">{value.nome_fantasia}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatCNPJ(value.cnpj)} • {value.cidade}/{value.uf}
              </p>
              {value.is_mei && (
                <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded mt-1 inline-block">
                  MEI
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
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
              {searchLoading && (
                <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-muted-foreground" />
              )}
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={cnpjLoading || !isCNPJComplete}
              title={!isCNPJComplete ? 'Digite um CNPJ completo para buscar na BrasilAPI' : 'Buscar CNPJ na BrasilAPI'}
            >
              {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
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
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {fornecedor.razao_social || fornecedor.nome_fantasia || 'Sem nome'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCNPJ(fornecedor.cnpj)}
                        {fornecedor.cidade && ` • ${fornecedor.cidade}/${fornecedor.uf}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results message */}
          {showSuggestions && searchTerm.length >= 3 && suggestions.length === 0 && !searchLoading && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg p-3">
              <p className="text-sm text-muted-foreground text-center">
                {isCNPJComplete 
                  ? 'CNPJ não encontrado. Clique no botão de busca para consultar na BrasilAPI.'
                  : 'Nenhum fornecedor encontrado. Digite um CNPJ completo para cadastrar.'}
              </p>
            </div>
          )}
        </div>
      )}
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
