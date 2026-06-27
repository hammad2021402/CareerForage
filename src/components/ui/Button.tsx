import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold select-none',
    'transition-all duration-200 ease-smooth',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
    'disabled:pointer-events-none disabled:opacity-40',
    'relative overflow-hidden',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-violet-600 to-cyan-500 text-white',
          'shadow-[0_0_0_1px_rgba(139,92,246,0.3)]',
          'hover:shadow-[0_0_32px_rgba(139,92,246,0.4),0_0_64px_rgba(6,182,212,0.15)]',
          'hover:-translate-y-px',
          'active:translate-y-0 active:scale-[0.98]',
        ],
        secondary: [
          'bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-primary)]',
          'hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-strong)]',
          'active:scale-[0.98]',
        ],
        ghost: [
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
          'active:scale-[0.98]',
        ],
        destructive: [
          'bg-red-500/10 border border-red-500/30 text-red-400',
          'hover:bg-red-500/20 hover:border-red-500/50',
        ],
        outline: [
          'border border-violet-500/40 text-violet-300',
          'hover:bg-violet-500/10 hover:border-violet-500/60',
          'active:scale-[0.98]',
        ],
      },
      size: {
        xs:   'h-7  px-3    text-xs    rounded-lg',
        sm:   'h-8  px-3    text-sm    rounded-lg',
        md:   'h-10 px-4    text-sm    rounded-xl',
        lg:   'h-12 px-6    text-base  rounded-xl',
        xl:   'h-14 px-8    text-base  rounded-2xl',
        icon: 'h-10 w-10            rounded-xl',
        'icon-sm': 'h-8 w-8         rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type MotionButtonProps = Omit<HTMLMotionProps<'button'>, 'children'>;

export interface ButtonProps
  extends MotionButtonProps,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: variant === 'primary' ? 1.02 : 1.01 }}
        whileTap={{ scale: 0.97 }}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {variant === 'primary' && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.12] to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        )}
        {loading ? (
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
