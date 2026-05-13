import { CalendarioServicos } from '@/components/monitoramento/calendario/CalendarioServicos';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Calendario() {
  useDocumentTitle('Calendário de Serviços');
  return (
    <div className="space-y-6">
      <CalendarioServicos />
    </div>
  );
}