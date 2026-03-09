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
  variant?: 'default' | 'destructive' | 'success' | 'purple' | 'warning';
  showCountWhenZero?: boolean;
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
  
  // Status tabs - flat list (preferred for simple cases)
  tabs?: StatusTabConfig[];
  
  // Status tab groups (preferred for visual grouping with labels and separators)
  tabGroups?: TabGroup[];
  
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  
  // Show label above tabs (only used with flat tabs)
  tabsLabel?: string;
  
  // Right slot for extra actions
  rightSlot?: ReactNode;
  
  className?: string;
}

// Helper to get badge class based on variant
const getBadgeClassName = (tab: StatusTabConfig, isActive: boolean) => {
  if (!isActive && tab.count > 0) {
    if (tab.variant === 'success') return 'bg-success text-success-foreground';
    if (tab.variant === 'purple') return 'bg-[hsl(260,70%,50%)] text-white';
    if (tab.variant === 'destructive') return 'bg-destructive text-destructive-foreground';
    if (tab.variant === 'warning') return 'bg-warning text-warning-foreground';
  }
  return '';
};

// Helper to get border class based on variant
const getBorderClassName = (tab: StatusTabConfig, isActive: boolean) => {
  if (!isActive && tab.count > 0) {
    if (tab.variant === 'destructive') return 'border-destructive/50 text-destructive hover:bg-destructive/10';
    if (tab.variant === 'success') return 'border-success/50 text-success hover:bg-success/10';
    if (tab.variant === 'purple') return 'border-[hsl(260,70%,50%)]/50 text-[hsl(260,70%,50%)] hover:bg-[hsl(260,70%,50%)]/10';
    if (tab.variant === 'warning') return 'border-warning/50 text-warning hover:bg-warning/10';
  }
  return '';
};

// Render a single tab button
const TabButton = ({ 
  tab, 
  isActive, 
  onClick 
}: { 
  tab: StatusTabConfig; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  const showBadge = tab.showCountWhenZero !== false || tab.count > 0;
  
  // Determine button styling
  let buttonVariant: 'default' | 'outline' | 'destructive' = 'outline';
  if (isActive) {
    buttonVariant = tab.variant === 'destructive' ? 'destructive' : 'default';
  }
  
  return (
    <Button
      variant={buttonVariant}
      size="sm"
      onClick={onClick}
      className={cn(
        "gap-1.5 text-xs h-8 whitespace-nowrap shrink-0 transition-all",
        getBorderClassName(tab, isActive)
      )}
    >
      {tab.icon}
      {tab.label}
      {showBadge && (
        <Badge 
          variant={isActive ? 'secondary' : (tab.variant === 'destructive' && tab.count > 0 ? 'destructive' : 'secondary')}
          className={cn(
            "ml-0.5 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center font-semibold",
            !isActive && getBadgeClassName(tab, isActive)
          )}
        >
          {tab.count}
        </Badge>
      )}
    </Button>
  );
};

// Vertical/horizontal separator between groups
const GroupSeparator = () => (
  <>
    <div className="hidden lg:block w-px h-12 bg-border mx-2 shrink-0" />
    <div className="lg:hidden h-px w-full bg-border" />
  </>
);

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
  // Determine if we're using groups or flat tabs
  const hasGroups = tabGroups.length > 0;
  
  // Flatten tabGroups into tabs for backward compatibility
  const allTabs = hasGroups ? tabGroups.flatMap(g => g.tabs) : tabs;
  
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
      
      {/* Tab Groups (with labels and separators) */}
      {hasGroups && onTabChange && (
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-2 lg:items-center">
          {tabGroups.map((group, groupIndex) => (
            <React.Fragment key={group.id}>
              {/* Separator between groups (not before first) */}
              {groupIndex > 0 && <GroupSeparator />}
              
              {/* Group */}
              <div className="flex flex-col gap-1.5">
                {/* Group label */}
                {group.label && (
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wider px-1 flex items-center gap-1",
                    group.labelClassName || "text-muted-foreground"
                  )}>
                    {group.icon}
                    {group.label}
                  </span>
                )}
                
                {/* Group tabs */}
                <div className="flex gap-1 flex-wrap">
                  {group.tabs.map((tab) => (
                    <TabButton
                      key={tab.id}
                      tab={tab}
                      isActive={activeTab === tab.id}
                      onClick={() => onTabChange(tab.id)}
                    />
                  ))}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
      
      {/* Flat Tabs (simple horizontal layout without groups) */}
      {!hasGroups && allTabs.length > 0 && onTabChange && (
        <div className="space-y-2">
          {/* Optional label */}
          {tabsLabel && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5" />
              {tabsLabel}
            </div>
          )}
          
          {/* Tabs row with scroll + fade indicators */}
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background/80 to-transparent pointer-events-none z-10 hidden sm:block" />
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10 hidden sm:block" />
            <div className="overflow-x-auto scrollbar-none -mx-1 px-1 pb-1 scroll-smooth snap-x">
              <div className="flex items-center gap-1.5 flex-nowrap">
                {allTabs.map((tab) => (
                  <TabButton
                    key={tab.id}
                    tab={tab}
                    isActive={activeTab === tab.id}
                    onClick={() => onTabChange(tab.id)}
                  />
                ))}
              </div>
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
