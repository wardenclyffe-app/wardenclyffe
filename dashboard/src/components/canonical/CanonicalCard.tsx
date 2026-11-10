import { cn } from "@utils/helpers";
import { useId, type HTMLAttributes, type ReactNode } from "react";

interface CanonicalCardProps extends HTMLAttributes<HTMLElement> {
  as?: "section" | "article" | "div";
  heading?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export const CanonicalCard = ({
  as = "section",
  className,
  heading,
  subtitle,
  actions,
  children,
  footer,
  ...props
}: CanonicalCardProps) => {
  const Component = as;
  const titleId = useId();
  const labelledBy = heading ? titleId : undefined;

  return (
    <Component
      className={cn(
        "wc-shell-frame border px-[var(--wc-space-4)] py-[var(--wc-space-3)]",
        className,
      )}
      aria-labelledby={labelledBy}
      {...props}
    >
      {(heading || subtitle || actions) && (
        <header className="mb-[var(--wc-space-3)] flex items-start justify-between gap-[var(--wc-space-3)]">
          <div className="min-w-0">
            {heading && (
              <h3 id={titleId} className="wc-fluid-text-md text-nb-gray-100">
                {heading}
              </h3>
            )}
            {subtitle && (
              <p className="wc-fluid-text-sm mt-[var(--wc-space-1)] text-nb-gray-300">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      <div className="wc-fluid-text-sm">{children}</div>
      {footer && (
        <footer className="mt-[var(--wc-space-3)] border-t border-nb-gray-850 pt-[var(--wc-space-2)]">
          {footer}
        </footer>
      )}
    </Component>
  );
};
