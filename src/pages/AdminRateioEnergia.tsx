import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { RateioEnergiaTab } from '@/components/admin/RateioEnergiaTab';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function AdminRateioEnergia() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle('Rateio de Energia');

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [isAdmin, loading, navigate]);

  if (!isAdmin) return null;

  return (
    <PageContainer>
      <PageHeader
        title="Rateio de Energia"
        description="Gestão completa do rateio de energia: memória de cálculo, contratos, grandezas contratadas e cadastros."
        icon={Zap}
      />
      <div className="mt-6">
        <RateioEnergiaTab />
      </div>
    </PageContainer>
  );
}
