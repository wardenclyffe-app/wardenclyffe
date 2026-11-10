"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@utils/helpers";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const canonicalButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 border font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wardenclyffe-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nb-gray disabled:opacity-45 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "border-wardenclyffe-500 bg-wardenclyffe-500 text-black hover:bg-wardenclyffe-400 hover:border-wardenclyffe-400",
        secondary:
          "border-nb-gray-700 bg-nb-gray-900 text-nb-gray-100 hover:bg-nb-gray-850",
        ghost:
          "border-transparent bg-transparent text-nb-gray-200 hover:bg-nb-gray-900/60",
      },
      size: {
        sm: "rounded-[var(--wc-radius-sm)] px-[var(--wc-space-2)] py-[var(--wc-space-1)] wc-fluid-text-xs",
        md: "rounded-[var(--wc-radius-md)] px-[var(--wc-space-3)] py-[var(--wc-space-2)] wc-fluid-text-sm",
        lg: "rounded-[var(--wc-radius-md)] px-[var(--wc-space-4)] py-[var(--wc-space-3)] wc-fluid-text-md",
      },
      iconOnly: {
        true: "aspect-square px-0",
        false: "",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
      iconOnly: false,
    },
  },
);

type BaseProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof canonicalButtonVariants> & {
    children: ReactNode;
  };

type IconOnlyProps = BaseProps & {
  iconOnly: true;
  "aria-label": string;
};

type ContentProps = BaseProps & {
  iconOnly?: false;
};

export type CanonicalButtonProps = IconOnlyProps | ContentProps;

export const CanonicalButton = ({
  className,
  variant,
  size,
  iconOnly,
  type = "button",
  ...props
}: CanonicalButtonProps) => (
  <button
    type={type}
    className={cn(canonicalButtonVariants({ variant, size, iconOnly }), className)}
    {...props}
  />
);

