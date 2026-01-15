'use client';

import * as React from 'react';

type SlotProps = Record<string, any> & { children?: React.ReactNode };

export const Slot = React.forwardRef<any, SlotProps>(
  ({ children, className, ...rest }, ref) => {
    if (children && React.isValidElement(children)) {
      const childProps: Record<string, any> = { ...rest, ref };
      const childClassName = (children.props as any)?.className;
      if (className) {
        childProps.className = childClassName
          ? `${childClassName} ${className}`
          : className;
      }
      return React.cloneElement(children, childProps);
    }

    return (
      <span ref={ref as any} className={className} {...rest}>
        {children}
      </span>
    );
  },
);
Slot.displayName = 'Slot';

export default Slot;


