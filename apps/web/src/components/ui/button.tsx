import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'md' | 'sm' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-input font-semibold transition-colors select-none disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80',
  secondary: 'border border-border bg-surface text-ink hover:bg-bg active:bg-border/60',
  ghost: 'text-primary hover:bg-primary/8 active:bg-primary/15',
  danger: 'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
  accent: 'border-2 border-primary bg-surface text-primary hover:bg-primary/5',
};

// Touch targets stay ≥ 48 px on phones (§17.1); `sm` shrinks only on pointer-precise screens.
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-12 px-3 text-sm md:min-h-10',
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cn(base, variants[variant], sizes[size], extra);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Text announced while loading, e.g. "Inahifadhi…". */
  loadingLabel?: string;
  icon?: ReactNode;
  block?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  loadingLabel,
  icon,
  block,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, size, cn(block && 'w-full', className))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  icon: ReactNode;
  variant?: 'ghost' | 'secondary' | 'primary';
  ref?: Ref<HTMLButtonElement>;
}

/** Icon-only control; `label` is required and becomes the accessible name (§17.12). */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50',
        variant === 'ghost' && 'text-ink hover:bg-ink/6',
        variant === 'secondary' && 'border border-border bg-surface text-ink hover:bg-bg',
        variant === 'primary' && 'bg-primary text-on-primary hover:bg-primary/90',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center">
      <svg
        className={cn('size-5 animate-spin motion-reduce:animate-none', className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
