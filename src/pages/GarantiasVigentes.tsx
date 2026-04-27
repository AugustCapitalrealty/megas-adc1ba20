import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { useGarantiasVigentes } from '@/hooks/useGarantiasVigentes';
import { GarantiaKPIs } from '@/components/garantias/GarantiaKPIs';
import { GarantiaFiltros } from '@/components/garantias/GarantiaFiltros';
import { GarantiaCard } from '@/components/garantias/GarantiaCard';
import { OCDetalhesModal } from '@/components/monitoramento/OCDetalhesModal';
import { VirtualizedList } from '@/components/ui/VirtualizedList';

export default function GarantiasVigentes() {
  const { toast } = useToast();
  const [infraspeakLoading, setInfraspeakLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSolicitacaoId, setModalSolicitacaoId] = useState<string | null>(null);
  const [modalProtocolo, setModalProtocolo] = useState<string | null>(null);

  const {
    garantias,
    kpis,
    loading,
    error,
    filtroEmpreendimento, setFiltroEmpreendimento,
    filtroTipo, setFiltroTipo,
    filtroStatus, setFiltroStatus,
    busca, setBusca,
    ordem, setOrdem,
    toggleInfraspeak,
  } = useGarantiasVigentes();

  const handleToggleInfraspeak = async (id: string, currentValue: boolean) => {
    setInfraspeakLoading(id);
    const success = await toggleInfraspeak(id, currentValue);
    toast(
      success
        ? { title: currentValue ? 'Infraspeak removido' : 'Marcado como Infraspeak' }
        : { title: 'Erro ao atualizar', variant: 'destructive' }
    );
    setInfraspeakLoading(null);
  };

  const handleVerOriginal = (id: string, protocolo: string) => {
    setModalSolicitacaoId(id);
    setModalProtocolo(protocolo);
    setModalOpen(true);
  };

  return (
    <PageContainer width="wide">
      <PageHeader
        icon={Shield}
        title="Garantias Vigentes"
        description="Acompanhe as garantias de serviço e produto das solicitações concluídas"
      />

      {/* KPIs */}
      <GarantiaKPIs
        kpis={kpis}
        filtroStatus={filtroStatus}
        setFiltroStatus={setFiltroStatus}
      />

      {/* Filtros */}
      <GarantiaFiltros
        busca={busca}
        setBusca={setBusca}
        filtroEmpreendimento={filtroEmpreendimento}
        setFiltroEmpreendimento={setFiltroEmpreendimento}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        filtroStatus={filtroStatus}
        setFiltroStatus={setFiltroStatus}
        ordem={ordem}
        setOrdem={setOrdem}
        garantias={garantias}
      />

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive text-sm">
            Erro ao carregar garantias: {error}
          </CardContent>
        </Card>
      )}

      {/* Empty */}
      {!loading && !error && garantias.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              Nenhuma garantia encontrada com os filtros selecionados
            </p>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {!loading && !error && garantias.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {garantias.length} garantia{garantias.length !== 1 ? 's' : ''} encontrada{garantias.length !== 1 ? 's' : ''}
          </p>
          <VirtualizedList
            items={garantias}
            getItemKey={(g) => g.id}
            estimateSize={180}
            overscan={5}
            gap={12}
            renderItem={(g) => (
              <GarantiaCard
                garantia={g}
                infraspeakLoading={infraspeakLoading}
                onToggleInfraspeak={handleToggleInfraspeak}
                onVerOriginal={handleVerOriginal}
              />
            )}
          />
        </div>
      )}

      <OCDetalhesModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        solicitacaoId={modalSolicitacaoId}
        protocolo={modalProtocolo}
      />
    </PageContainer>
  );
}
