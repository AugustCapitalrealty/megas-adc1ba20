import { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select';
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface StatusTabConfig {
  id: string;
  label: string;
  count: number;
  variant?: 'default' | 'destructive' | 'success' | 'purple';
  showCountWhenZero?: boolean;
  pulseWhenActive?: boolean;
}

export interface TabGroup {
  id: string;
  label: string;
  icon?: ReactNode;
  labelClassName?: string;
  tabs: StatusTabConfig[];
}

export interface FilterBarProps {
  // Search
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  showSearch?: boolean;
  
  // Filters
  filters?: FilterConfig[];
  
  // Status tabs
  tabGroups?: TabGroup[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  
  // Right slot for extra actions
  rightSlot?: ReactNode;
  
  className?: string;
}

export function FilterBar({
  searchPlaceholder = 'Buscar...',
  searchValue = '',
  onSearchChange,
  showSearch = false,
  filters = [],
  tabGroups = [],
  activeTab,
  onTabChange,
  rightSlot,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Top row: Search and Filters */}
      {(showSearch || filters.length > 0 || rightSlot) && (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {showSearch && onSearchChange && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          {filters.map((filter) => (
            <Select 
              key={filter.id} 
              value={filter.value} 
              onValueChange={filter.onChange}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={filter.placeholder || filter.label} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          
          {rightSlot && <div className="ml-auto">{rightSlot}</div>}
        </div>
      )}
      
      {/* Tab groups */}
      {tabGroups.length > 0 && onTabChange && (
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-2 lg:items-center">
          {tabGroups.map((group, groupIndex) => (
            <div key={group.id} className="flex flex-col gap-1.5">
              {/* Group label */}
              <span className={cn(
                "text-xs font-medium uppercase tracking-wider px-1 flex items-center gap-1",
                group.labelClassName || "text-muted-foreground"
              )}>
                {group.icon}
                {group.label}
              </span>
              
              {/* Tabs */}
              <div className="flex gap-1 flex-wrap">
                {group.tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const showBadge = tab.showCountWhenZero !== false || tab.count > 0;
                  
                  // Determine button variant
                  let buttonVariant: 'default' | 'outline' | 'destructive' = 'outline';
                  if (isActive) {
                    buttonVariant = tab.variant === 'destructive' ? 'destructive' : 'default';
                  }
                  
                  // Determine badge color based on variant when not active
                  const getBadgeStyle = () => {
                    if (!isActive && tab.count > 0) {
                      switch (tab.variant) {
                        case 'destructive':
                          return 'border-destructive text-destructive hover:bg-destructive/10';
                        case 'success':
                          return '';
                        case 'purple':
                          return '';
                        default:
                          return '';
                      }
                    }
                    return '';
                  };
                  
                  const getBadgeClassName = () => {
                    if (tab.variant === 'success' && tab.count > 0) {
                      return 'bg-success text-success-foreground';
                    }
                    if (tab.variant === 'purple' && tab.count > 0) {
                      return 'bg-[hsl(260,70%,50%)] text-white';
                    }
                    if (tab.variant === 'destructive' && tab.count > 0) {
                      return cn(
                        'bg-destructive text-destructive-foreground',
                        tab.pulseWhenActive && 'animate-pulse'
                      );
                    }
                    return '';
                  };
                  
                  return (
                    <Button
                      key={tab.id}
                      variant={buttonVariant}
                      size="sm"
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "gap-1 text-xs h-8",
                        !isActive && getBadgeStyle()
                      )}
                    >
                      {tab.label}
                      {showBadge && (
                        <Badge 
                          variant={isActive ? 'secondary' : (tab.variant === 'destructive' && tab.count > 0 ? 'destructive' : 'secondary')}
                          className={cn(
                            "ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center",
                            !isActive && getBadgeClassName()
                          )}
                        >
                          {tab.count}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
              
              {/* Separator between groups */}
              {groupIndex < tabGroups.length - 1 && (
                <>
                  <div className="hidden lg:block w-px h-12 bg-border mx-2 absolute" style={{ display: 'none' }} />
                </>
              )}
            </div>
          ))}
          
          {/* Group separators */}
          {tabGroups.length > 1 && (
            <style>{`
              .flex.flex-col.lg\\:flex-row > div:not(:last-child)::after {
                content: '';
                display: block;
              }
            `}</style>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for tab group separator
export function FilterBarSeparator() {
  return (
    <>
      <div className="hidden lg:block w-px h-12 bg-border mx-2" />
      <div className="lg:hidden h-px w-full bg-border" />
    </>
  );
}
