import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
}

export function FavoriteButton({ isFavorite, onToggle, className }: FavoriteButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7 shrink-0', className)}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
    >
      <Star
        className={cn(
          'h-4 w-4 transition-colors',
          isFavorite
            ? 'fill-warning text-warning'
            : 'text-muted-foreground hover:text-warning'
        )}
      />
    </Button>
  );
}
