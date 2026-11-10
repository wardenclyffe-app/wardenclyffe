import { cn } from "@/utils/helpers";
import wardenclyffeFull from "@/assets/wardenclyffe-full.svg";
import wardenclyffeMark from "@/assets/wardenclyffe.svg";

type Props = {
  size?: "small" | "default" | "large";
  mobile?: boolean;
};

const sizes = {
  small: {
    desktop: 14,
    mobile: 20,
  },
  default: {
    desktop: 22,
    mobile: 30,
  },
  large: {
    desktop: 24,
    mobile: 40,
  },
};

export const WardenClyffeLogo = ({ size = "default", mobile = true }: Props) => {
  return (
    <>
      <img
        src={wardenclyffeFull}
        height={sizes[size].desktop}
        style={{ height: sizes[size].desktop }}
        alt="WardenClyffe Logo"
        className={cn(mobile && "hidden md:block", "group-hover:opacity-80 transition-all")}
      />
      {mobile && (
        <img
          src={wardenclyffeMark}
          width={sizes[size].mobile}
          style={{ width: sizes[size].mobile }}
          alt="WardenClyffe Logo"
          className={cn(mobile && "md:hidden ml-4")}
        />
      )}
    </>
  );
};
