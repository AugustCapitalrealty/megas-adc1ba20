import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useCNPJ } from '@/hooks/useCNPJ';
import { Loader2, Search, X } from 'lucide-react';
import { type Fornecedor } from '@/types';

interface SupplierSearchProps {
  label: string;
  required?: boolean;
  value: Fornecedor | null;
  onChange: (fornecedor: Fornecedor | null) => void;
}

export function SupplierSearch({ label, required = false, value, onChange }: SupplierSearchProps) {
  const [cnpj, setCnpj] = useState('');
  const { formatCNPJ, lookupCNPJ, loading, error } = useCNPJ();

  const handleSearch = async () => {
    const result = await lookupCNPJ(cnpj);
    if (result) {
      onChange(result);
      setCnpj('');
    }
  };

  const handleClear = () => {
    onChange(null);
    setCnpj('');
  };

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
              <p className="font-medium text-sm">{value.razao_social}</p>
              {value.nome_fantasia && (
                <p className="text-xs text-muted-foreground">{value.nome_fantasia}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {value.cnpj} • {value.cidade}/{value.uf}
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
        <div className="flex gap-2">
          <Input
            placeholder="00.000.000/0000-00"
            value={formatCNPJ(cnpj)}
            onChange={(e) => setCnpj(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading || cnpj.replace(/\D/g, '').length !== 14}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      )}
      
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}