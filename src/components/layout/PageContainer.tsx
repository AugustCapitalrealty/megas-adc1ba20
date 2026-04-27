import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * Largura máxima do conteúdo (sobrepõe a do shell).
   * - 'default' (xl) páginas comuns
   * - 'wide' tabelas grandes (Backoffice, Monitoramento)
   * - 'narrow' wizards/forms longos
   * - 'full' usa toda a largura do shell
   */
  width?: 'default' | 'wide' | 'narrow' | 'full';
}

const widthMap = {
  default: 'max-w-7xl mx-auto',
  wide: 'max-w-[1600px] mx-auto',
  narrow: 'max-w-3xl mx-auto',
  full: 'w-full',
};

/**
 * Container canônico de página.
 * O AppLayout já provê `container py-6` global; este componente só padroniza
 * o ritmo vertical entre seções e a largura interna do conteúdo.
 */
export function PageContainer({ children, className, width = 'full' }: PageContainerProps) {
  return (
    <div className={cn('w-full space-y-6 animate-fade-in', widthMap[width], className)}>
      {children}
    </div>
  );
}