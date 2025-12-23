import React, { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
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
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'success' | 'purple';
  showCountWhenZero?: boolean;
}

// Legacy support - TabGroup is now deprecated, use flat tabs array instead
export interface TabGroup {
  id: string;
  label?: string;
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
  
  // Status tabs - flat list (preferred)
  tabs?: StatusTabConfig[];
  
  // Legacy: Status tab groups (deprecated)
  tabGroups?: TabGroup[];
  
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  
  // Show label above tabs
  tabsLabel?: string;
  
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
  tabs = [],
  tabGroups = [],
  activeTab,
  onTabChange,
  tabsLabel,
  rightSlot,
  className,
}: FilterBarProps) {
  // Flatten tabGroups into tabs for backward compatibility
  const allTabs = tabs.length > 0 ? tabs : tabGroups.flatMap(g => g.tabs);
  
  return (
    <div className={cn('space-y-3', className)}>
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
      
      {/* Tabs - flat horizontal layout */}
      {allTabs.length > 0 && onTabChange && (
        <div className="space-y-2">
          {/* Optional label */}
          {tabsLabel && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5" />
              {tabsLabel}
            </div>
          )}
          
          {/* Tabs row with scroll */}
          <div className="overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
            <div className="flex items-center gap-1.5 flex-nowrap">
              {allTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const showBadge = tab.showCountWhenZero !== false || tab.count > 0;
                
                // Determine button styling
                let buttonVariant: 'default' | 'outline' | 'destructive' = 'outline';
                if (isActive) {
                  buttonVariant = tab.variant === 'destructive' ? 'destructive' : 'default';
                }
                
                const getBadgeClassName = () => {
                  if (!isActive && tab.count > 0) {
                    if (tab.variant === 'success') return 'bg-success text-success-foreground';
                    if (tab.variant === 'purple') return 'bg-[hsl(260,70%,50%)] text-white';
                    if (tab.variant === 'destructive') return 'bg-destructive text-destructive-foreground';
                  }
                  return '';
                };
                
                const getBorderClassName = () => {
                  if (!isActive && tab.count > 0) {
                    if (tab.variant === 'destructive') return 'border-destructive/50 text-destructive hover:bg-destructive/10';
                    if (tab.variant === 'success') return 'border-success/50 text-success hover:bg-success/10';
                    if (tab.variant === 'purple') return 'border-[hsl(260,70%,50%)]/50 text-[hsl(260,70%,50%)] hover:bg-[hsl(260,70%,50%)]/10';
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
                      "gap-1.5 text-xs h-8 whitespace-nowrap shrink-0 transition-all",
                      getBorderClassName()
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                    {showBadge && (
                      <Badge 
                        variant={isActive ? 'secondary' : (tab.variant === 'destructive' && tab.count > 0 ? 'destructive' : 'secondary')}
                        className={cn(
                          "ml-0.5 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center font-semibold",
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
          </div>
        </div>
      )}
    </div>
  );
}

// Deprecated - kept for backward compatibility
export function FilterBarSeparator() {
  return null;
}
