import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpandableDescriptionProps {
  description: string;
  maxLength?: number;
  className?: string;
}

export function ExpandableDescription({ 
  description, 
  maxLength = 100,
  className 
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = description.length > maxLength;
  const displayText = expanded || !shouldTruncate 
    ? description 
    : description.substring(0, maxLength).trim() + '...';

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
        {displayText}
      </p>
      {shouldTruncate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent font-medium"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Ver mais
            </>
          )}
        </Button>
      )}
    </div>
  );
}
