import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Search, LayoutDashboard, Plus, Shield, BarChart3, FileCheck } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  protocolo: string;
  descricao: string;
  status: string;
  fornecedor_nome?: string | null;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const { user, isBackofficeOrAdmin } = useAuth();

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2 || !user) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('solicitacoes')
        .select('id, protocolo, descricao, status, fornecedor:fornecedores(nome_fantasia, razao_social)')
        .or(`protocolo.ilike.%${debouncedQuery}%,descricao.ilike.%${debouncedQuery}%`)
        .order('created_at', { ascending: false })
        .limit(8);

      if (cancelled) return;

      setResults(
        (data || []).map((r: any) => ({
          id: r.id,
          protocolo: r.protocolo,
          descricao: r.descricao,
          status: r.status,
          fornecedor_nome: r.fornecedor?.nome_fantasia || r.fornecedor?.razao_social || null,
        }))
      );
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [debouncedQuery, user]);

  const goTo = useCallback((path: string) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  }, [navigate]);

  const pages = [
    { label: 'Nova Solicitação', icon: Plus, path: '/nova-solicitacao' },
    { label: 'Minhas Solicitações', icon: FileText, path: '/minhas-solicitacoes' },
    { label: 'Painel Fluig', icon: BarChart3, path: '/painel-fluig' },
    { label: 'Garantias', icon: Shield, path: '/garantias' },
    { label: 'Monitoramento OC', icon: FileCheck, path: '/monitoramento-oc' },
    ...(isBackofficeOrAdmin ? [
      { label: 'Backoffice', icon: LayoutDashboard, path: '/backoffice' },
    ] : []),
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar protocolo, descrição ou navegar..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Buscando...' : 'Nenhum resultado encontrado.'}
        </CommandEmpty>

        {results.length > 0 && (
          <CommandGroup heading="Solicitações">
            {results.map((r) => (
              <CommandItem
                key={r.id}
                value={`${r.protocolo} ${r.descricao}`}
                onSelect={() => goTo(`/minhas-solicitacoes?search=${r.protocolo}`)}
              >
                <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-sm">#{r.protocolo}</span>
                  <span className="text-xs text-muted-foreground truncate">
                    {r.descricao.slice(0, 80)}
                    {r.fornecedor_nome ? ` • ${r.fornecedor_nome}` : ''}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Páginas">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.path}
                value={page.label}
                onSelect={() => goTo(page.path)}
              >
                <Icon className="mr-2 h-4 w-4" />
                {page.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Atalhos: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">N</kbd> Nova · <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">S</kbd> Solicitações</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">⌘K</kbd> buscar</span>
      </div>
    </CommandDialog>
  );
}
