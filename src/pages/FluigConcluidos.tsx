import { AppLayout } from '@/components/layout/AppLayout';
import { FluigTable } from '@/components/FluigTable';

export default function FluigConcluidos() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Fluig - Concluídos</h1>
          <p className="text-muted-foreground">
            Solicitações aprovadas pela diretoria
          </p>
        </div>
        <FluigTable tipo="concluidos" />
      </div>
    </AppLayout>
  );
}
