import * as React from "react";
import { memo } from "react";
import WardenClyffeIcon from "@/assets/icons/WardenClyffeIcon";

const MemoizedWardenClyffeIcon = () => {
  return <WardenClyffeIcon size={14} />;
};

export default memo(MemoizedWardenClyffeIcon);
