"use client";

import { cn } from "@utils/helpers";
import { forwardRef, type SelectHTMLAttributes } from "react";

export interface UiSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  eventTarget?: string;
}

export const UiSelect = forwardRef<HTMLSelectElement, UiSelectProps>(
  ({ eventTarget, className, ...props }, ref) => (
    <select
      {...props}
      ref={ref}
      data-ui-component="select"
      data-ui-target={eventTarget}
      className={cn(
        "min-h-[clamp(3rem,2.8rem+0.6vw,3.5rem)] w-full rounded border border-nb-gray-700 bg-nb-gray-950 p-3 text-nb-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wardenclyffe-400 disabled:opacity-50",
        className,
      )}
    />
  ),
);
UiSelect.displayName = "UiSelect";
