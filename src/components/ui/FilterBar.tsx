import React, { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Search } from 'lucide-react';
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
      
      {/* Tab groups - horizontal layout with scroll */}
      {tabGroups.length > 0 && onTabChange && (
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <div className="flex items-center gap-2 flex-nowrap">
            {tabGroups.map((group, groupIndex) => (
              <React.Fragment key={group.id}>
                {/* Visual separator between groups */}
                {groupIndex > 0 && (
                  <div className="h-6 w-px bg-border shrink-0" />
                )}
                
                {/* Group with icon + tabs */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Group icon (if any) */}
                  {group.icon && (
                    <span className={cn("flex items-center mr-0.5", group.labelClassName)}>
                      {group.icon}
                    </span>
                  )}
                  
                  {/* Tabs */}
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
                          "gap-1 text-xs h-8 whitespace-nowrap shrink-0",
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
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for tab group separator (deprecated, now built-in)
export function FilterBarSeparator() {
  return (
    <>
      <div className="hidden lg:block w-px h-12 bg-border mx-2" />
      <div className="lg:hidden h-px w-full bg-border" />
    </>
  );
}
