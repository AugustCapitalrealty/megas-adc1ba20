import { ReactNode, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  variant?: 'confirm' | 'form' | 'destructive' | 'info';
  icon?: LucideIcon;
  loading?: boolean;
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  showCancel?: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const variantConfig = {
  confirm: {
    icon: CheckCircle,
    iconColor: 'text-success',
    buttonVariant: 'default' as const,
  },
  form: {
    icon: Info,
    iconColor: 'text-primary',
    buttonVariant: 'default' as const,
  },
  destructive: {
    icon: AlertTriangle,
    iconColor: 'text-destructive',
    buttonVariant: 'destructive' as const,
  },
  info: {
    icon: Info,
    iconColor: 'text-info',
    buttonVariant: 'default' as const,
  },
};

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function ActionModal({
  open,
  onOpenChange,
  title,
  description,
  variant = 'confirm',
  icon,
  loading = false,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmDisabled = false,
  showCancel = true,
  children,
  footer,
  className,
  maxWidth = 'lg',
}: ActionModalProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = loading || internalLoading;
  
  const config = variantConfig[variant];
  const IconComponent = icon || config.icon;
  
  const handleConfirm = async () => {
    if (!onConfirm) return;
    
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(maxWidthClasses[maxWidth], className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className={cn('h-5 w-5', config.iconColor)} />
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        {children && (
          <div className="py-2">
            {children}
          </div>
        )}
        
        {footer ? (
          footer
        ) : (
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {showCancel && (
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={isLoading}
              >
                {cancelText}
              </Button>
            )}
            {onConfirm && (
              <Button
                variant={config.buttonVariant}
                onClick={handleConfirm}
                disabled={isLoading || confirmDisabled}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {confirmText}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Convenience components for common modal types
export function ConfirmModal(props: Omit<ActionModalProps, 'variant'>) {
  return <ActionModal {...props} variant="confirm" />;
}

export function DestructiveModal(props: Omit<ActionModalProps, 'variant'>) {
  return <ActionModal {...props} variant="destructive" />;
}

export function FormModal(props: Omit<ActionModalProps, 'variant'>) {
  return <ActionModal {...props} variant="form" />;
}
