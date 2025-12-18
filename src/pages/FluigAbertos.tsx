import { AppLayout } from '@/components/layout/AppLayout';
import { FluigTable } from '@/components/FluigTable';

export default function FluigAbertos() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Fluig - Em Aberto</h1>
          <p className="text-muted-foreground">
            Solicitações aguardando aprovação
          </p>
        </div>
        <FluigTable tipo="abertos" />
      </div>
    </AppLayout>
  );
}
