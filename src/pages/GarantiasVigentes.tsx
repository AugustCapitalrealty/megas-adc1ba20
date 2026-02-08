import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, ShieldCheck, ShieldAlert, ShieldX, Search, Building2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useGarantiasVigentes, type GarantiaDetalhe, type StatusFiltro, type TipoFiltro } from '@/hooks/useGarantiasVigentes';
import { EMPREENDIMENTO_LABELS, TIPO_GARANTIA_LABELS } from '@/types';
import type { Empreendimento } from '@/types';

function KpiCard({ title, value, icon: Icon, variant }: {
  title: string;
  value: number;
  icon: React.ElementType;
  variant: 'vigente' | 'expirando' | 'expirada';
}) {
  const styles = {
    vigente: 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900',
    expirando: 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900',
    expirada: 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900',
  };
  const iconStyles = {
    vigente: 'text-green-600',
    expirando: 'text-amber-600',
    expirada: 'text-red-600',
  };
  const valueStyles = {
    vigente: 'text-green-700',
    expirando: 'text-amber-700',
    expirada: 'text-red-700',
  };

  return (
    <Card className={`${styles[variant]}`}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-2 rounded-lg ${iconStyles[variant]} bg-white/60 dark:bg-black/20`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold ${valueStyles[variant]}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GarantiaBadge({ detalhe }: { detalhe: GarantiaDetalhe }) {
  if (detalhe.expirada || detalhe.diasRestantes <= 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <ShieldX className="h-3 w-3" />
        {detalhe.label}: Expirada
      </Badge>
    );
  }
  if (detalhe.diasRestantes <= 30) {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300">
        <ShieldAlert className="h-3 w-3" />
        {detalhe.label}: {detalhe.diasRestantes}d restantes
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-green-700 border-green-300">
      <ShieldCheck className="h-3 w-3" />
      {detalhe.label}: {detalhe.diasRestantes}d restantes
    </Badge>
  );
}

function GarantiaProgressBar({ detalhe }: { detalhe: GarantiaDetalhe }) {
  const total = detalhe.diasContratados;
  const restantes = Math.max(0, detalhe.diasRestantes);
  const percentUsado = total > 0 ? Math.min(100, ((total - restantes) / total) * 100) : 100;

  const barColor = detalhe.expirada || detalhe.diasRestantes <= 0
    ? 'bg-red-500'
    : detalhe.diasRestantes <= 30
      ? 'bg-amber-500'
      : 'bg-green-500';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{format(new Date(detalhe.dataExpiracao), 'dd/MM/yyyy')}</span>
        <span>{detalhe.diasContratados} dias total</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percentUsado}%` }} />
      </div>
    </div>
  );
}

export default function GarantiasVigentes() {
  const {
    garantias,
    kpis,
    loading,
    error,
    filtroEmpreendimento, setFiltroEmpreendimento,
    filtroTipo, setFiltroTipo,
    filtroStatus, setFiltroStatus,
    busca, setBusca,
  } = useGarantiasVigentes();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Garantias Vigentes</h1>
            <p className="text-muted-foreground text-sm">Acompanhe as garantias de serviço e produto das solicitações concluídas</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard title="Vigentes" value={kpis.vigentes} icon={ShieldCheck} variant="vigente" />
          <KpiCard title="Expirando em 30 dias" value={kpis.expirando} icon={ShieldAlert} variant="expirando" />
          <KpiCard title="Expiradas" value={kpis.expiradas} icon={ShieldX} variant="expirada" />
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por protocolo, descrição ou fornecedor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={filtroEmpreendimento} onValueChange={setFiltroEmpreendimento}>
                <SelectTrigger>
                  <SelectValue placeholder="Empreendimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os empreendimentos</SelectItem>
                  {(['mega_curitiba', 'mega_itajai', 'mega_esteio'] as Empreendimento[]).map(e => (
                    <SelectItem key={e} value={e}>{EMPREENDIMENTO_LABELS[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as TipoFiltro)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de garantia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                  <SelectItem value="ambos">Serviço + Produto</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as StatusFiltro)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="vigente">Vigentes</SelectItem>
                  <SelectItem value="expirando">Expirando</SelectItem>
                  <SelectItem value="expirada">Expiradas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-destructive text-sm">
              Erro ao carregar garantias: {error}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && garantias.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">Nenhuma garantia encontrada com os filtros selecionados</p>
            </CardContent>
          </Card>
        )}

        {/* Garantias List */}
        {!loading && !error && garantias.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {garantias.length} garantia{garantias.length !== 1 ? 's' : ''} encontrada{garantias.length !== 1 ? 's' : ''}
            </p>

            {garantias.map((g) => (
              <Card key={g.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3">
                    {/* Top row: protocol + badges */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-primary">
                          #{g.protocolo}
                        </span>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Building2 className="h-3 w-3" />
                          {EMPREENDIMENTO_LABELS[g.empreendimento]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {TIPO_GARANTIA_LABELS[g.tipo_garantia]}
                        </Badge>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {g.garantias.map((det, i) => (
                          <GarantiaBadge key={i} detalhe={det} />
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-foreground line-clamp-2">{g.descricao}</p>

                    {/* Fornecedor + data */}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                      {(g.fornecedor_razao_social || g.fornecedor_nome_fantasia) && (
                        <span>
                          Fornecedor: <strong className="text-foreground">{g.fornecedor_nome_fantasia || g.fornecedor_razao_social}</strong>
                          {g.fornecedor_cnpj && ` (${g.fornecedor_cnpj})`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Conclusão: {format(new Date(g.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span>
                        Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(g.valor)}
                      </span>
                    </div>

                    {/* Progress bars */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                      {g.garantias.map((det, i) => (
                        <div key={i}>
                          <p className="text-xs font-medium mb-1">{det.label} ({det.diasContratados} dias)</p>
                          <GarantiaProgressBar detalhe={det} />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
