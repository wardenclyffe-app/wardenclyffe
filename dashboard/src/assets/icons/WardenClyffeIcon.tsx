import { WardenClyffeMark } from "@components/WardenClyffeLogo";
import * as React from "react";
import { memo } from "react";

type Props = {
  size?: number;
  className?: string;
};

// Inline (theme-aware) mark. The minimal variant is drawn for small sizes;
// larger renders get the full ligature mark.
function WardenClyffeIcon({ size = 16, className }: Props) {
  return (
    <WardenClyffeMark
      size={size}
      variant={size <= 32 ? "minimal" : "ligature"}
      className={className}
    />
  );
}

export default memo(WardenClyffeIcon);
