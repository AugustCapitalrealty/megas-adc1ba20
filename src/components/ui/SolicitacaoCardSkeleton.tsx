import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function SolicitacaoCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Favorite + Protocolo */}
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-24" />
            {/* Status badge */}
            <Skeleton className="h-5 w-20 rounded-full" />
            {/* Time badge */}
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {/* Description */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        {/* Metadata line: type • empreendimento • fornecedor • valor • date */}
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-3.5 w-8" />
          <Skeleton className="h-3.5 w-1 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-1 rounded-full" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-1 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-1 rounded-full" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        {/* Workflow progress bar */}
        <Skeleton className="h-2 w-full mt-2 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function SolicitacaoCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SolicitacaoCardSkeleton key={i} />
      ))}
    </div>
  );
}
