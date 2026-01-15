'use client';

import * as React from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';
type SelectContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  value: string | undefined;
  setValue: (v: string) => void;
};
const SelectContext = React.createContext<SelectContextValue | null>(null);

const Select = ({ value: valueProp, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children?: React.ReactNode }) => {
  const [value, setValueState] = React.useState<string | undefined>(valueProp);
  const [open, setOpen] = React.useState(false);
  const setValue = (v: string) => {
    onValueChange?.(v);
    setValueState(v);
    setOpen(false);
  };
  return (
    <SelectContext.Provider value={{ open, setOpen, value, setValue }}>
      {children}
    </SelectContext.Provider>
  );
};

const SelectGroup = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const ctx = React.useContext<SelectContextValue | null>(SelectContext);
  return <span>{ctx?.value ?? placeholder}</span>;
};

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)!;
    return (
      <button
        ref={ref}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          className,
        )}
        onClick={() => ctx.setOpen(!ctx.open)}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
    );
  },
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)!;
    if (!ctx.open) return null;
    return (
      <div
        ref={ref}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
          className,
        )}
        {...props}
      >
        <div className={cn('p-1 w-full')}>{children}</div>
      </div>
    );
  },
);
SelectContent.displayName = 'SelectContent';

const SelectLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)} {...props} />
  ),
);
SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
  ({ className, children, value, ...props }, ref) => {
    const ctx = React.useContext(SelectContext)!;
    const isSelected = ctx.value === value;
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className,
        )}
        onClick={() => ctx.setValue(value)}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {isSelected ? <Check className="h-4 w-4" /> : null}
        </span>
        <span>{children}</span>
      </div>
    );
  },
);
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
  ),
);
SelectSeparator.displayName = 'SelectSeparator';

const SelectScrollUpButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex cursor-default items-center justify-center py-1', className)} {...props}>
      <ChevronUp className="h-4 w-4" />
    </div>
  ),
);
SelectScrollUpButton.displayName = 'SelectScrollUpButton';

const SelectScrollDownButton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex cursor-default items-center justify-center py-1', className)} {...props}>
      <ChevronDown className="h-4 w-4" />
    </div>
  ),
);
SelectScrollDownButton.displayName = 'SelectScrollDownButton';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
