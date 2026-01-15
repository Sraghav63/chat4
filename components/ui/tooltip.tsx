'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type TooltipContextType = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextType | null>(null);

const TooltipProvider = ({ children, delayDuration = 0 }: { children?: React.ReactNode; delayDuration?: number }) => (
  <>{children}</>
);

const Tooltip = ({ children, open: openProp, onOpenChange }: { children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
  const [open, setOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const value = React.useMemo<TooltipContextType>(
    () => ({ open: isControlled ? !!openProp : open, setOpen: (v) => (isControlled ? onOpenChange?.(v) : setOpen(v)) }),
    [isControlled, open, openProp, onOpenChange],
  );
  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
};

const TooltipTrigger = ({ children, asChild }: { children?: React.ReactElement; asChild?: boolean }) => {
  const ctx = React.useContext(TooltipContext)!;
  const props = {
    onMouseEnter: () => ctx.setOpen(true),
    onMouseLeave: () => ctx.setOpen(false),
  } as any;
  return asChild && children ? React.cloneElement(children, props) : <span {...props}>{children}</span>;
};

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number; side?: 'top' | 'bottom' | 'left' | 'right'; align?: 'start' | 'center' | 'end' }>(
  ({ className, sideOffset = 4, style, side, align, ...props }, ref) => {
    const ctx = React.useContext(TooltipContext)!;
    if (!ctx?.open) return null;
    return (
      <div
        ref={ref}
        role="tooltip"
        style={{ marginTop: side === 'top' ? undefined : sideOffset, marginBottom: side === 'top' ? sideOffset : undefined, ...style }}
        className={cn(
          'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
          className,
        )}
        {...props}
      />
    );
  },
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
