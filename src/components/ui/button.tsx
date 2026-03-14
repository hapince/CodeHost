import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-mono text-sm tracking-widest uppercase transition-none focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-foreground focus-visible:outline-offset-[3px] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-foreground text-background hover:bg-transparent hover:text-foreground border-2 border-transparent hover:border-foreground',
        outline:
          'border-2 border-foreground bg-transparent hover:bg-foreground hover:text-background',
        ghost:
          'hover:bg-muted hover:text-foreground',
        link:
          'underline-offset-4 hover:underline text-foreground',
        destructive:
          'bg-foreground text-background hover:bg-muted-foreground',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-9 px-4 py-2 text-xs',
        lg: 'h-14 px-8 py-4',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
