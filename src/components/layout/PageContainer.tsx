import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  /**
   * Largura máxima.
   * - 'default' (xl) para páginas comuns
   * - 'wide' para tabelas grandes (Backoffice, Monitoramento)
   * - 'narrow' para wizards/forms longos
   */
  width?: 'default' | 'wide' | 'narrow';
}

const widthMap = {
  default: 'max-w-7xl',
  wide: 'max-w-[1600px]',
  narrow: 'max-w-3xl',
};

/**
 * Container canônico de página.
 * Padroniza padding, max-width e ritmo vertical entre seções.
 */
export function PageContainer({ children, className, width = 'default' }: PageContainerProps) {
  return (
    <div
      id="main-content"
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6',
        widthMap[width],
        className,
      )}
    >
      {children}
    </div>
  );
}