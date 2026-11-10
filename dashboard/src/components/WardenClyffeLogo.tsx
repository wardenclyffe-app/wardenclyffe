import { cn } from "@utils/helpers";
import * as React from "react";

/*
 * WardenClyffe brand marks as inline SVG.
 *
 * Colours resolve through the --wc-* custom properties defined in
 * src/app/globals.css, which follow the app theme class (.dark / .light) that
 * ThemeProvider sets on <html>. Every var() carries the dark-palette value as a
 * fallback, so the marks still render correctly where globals.css is absent.
 */

const palette = {
  cyan: "var(--wc-cyan, #7DD3FC)",
  coral: "var(--wc-coral, #E8A87C)",
  gold: "var(--wc-gold, #F2C879)",
  ink: "var(--wc-ink, #EDEAE2)",
} as const;

// The badge always sits on its own dark tile, so its artwork stays on the dark
// palette in both themes (theme-following ink would vanish on the tile).
const badgePalette = {
  cyan: "#7DD3FC",
  coral: "#E8A87C",
  gold: "#F2C879",
  ink: "#EDEAE2",
} as const;
const badgeTile = "var(--wc-tile, #131A28)";

type Palette = typeof palette | typeof badgePalette;

export type WardenClyffeMarkVariant = "ligature" | "minimal" | "badge";
export type WardenClyffeTone = "duo" | "mono";

type SvgProps = Omit<
  React.ComponentPropsWithoutRef<"svg">,
  "children" | "width" | "height" | "viewBox"
>;

type A11yProps = {
  /** Hide from assistive tech, e.g. when the name is already visible as text. */
  decorative?: boolean;
  /** Accessible name. Defaults to "WardenClyffe". */
  title?: string;
};

const DEFAULT_TITLE = "WardenClyffe";

// Gradient and mask ids must be unique per instance. useId output contains
// characters that not every url(#…) parser accepts, so keep it to [\w-].
function useSvgId() {
  return `wc${React.useId().replace(/[^\w-]/g, "")}`;
}

function a11yProps(decorative: boolean | undefined, title: string) {
  return decorative
    ? ({ "aria-hidden": true, focusable: "false" } as const)
    : ({ role: "img", "aria-label": title } as const);
}

/* ------------------------------------------------------------------ mark -- */

// Visual bounds of each variant inside its 128-unit drawing grid, so `size`
// is the size of the artwork rather than of an invisible safe area.
const MARK_VIEWBOX: Record<WardenClyffeMarkVariant, string> = {
  ligature: "9 9 110 110",
  minimal: "5.5 5.5 117 117",
  badge: "0 0 128 128",
};

const GRADIENT_STOPS = [
  [0, "cyan"],
  [0.36, "cyan"],
  [0.56, "coral"],
  [0.7, "coral"],
  [0.86, "gold"],
] as const;

function Gradient({
  id,
  colors,
  y1 = 10,
  y2 = 118,
}: {
  id: string;
  colors: Palette;
  y1?: number;
  y2?: number;
}) {
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={30}
      y1={y1}
      x2={98}
      y2={y2}
    >
      {GRADIENT_STOPS.map(([offset, key]) => (
        <stop key={offset} offset={offset} style={{ stopColor: colors[key] }} />
      ))}
    </linearGradient>
  );
}

function MarkArtwork({
  variant,
  id,
}: {
  variant: WardenClyffeMarkVariant;
  id: string;
}) {
  const stroke = `url(#${id}-g)`;

  if (variant === "minimal") {
    const nodes = "M64 12h0M116 64h0M64 116h0M12 64h0";
    return (
      <>
        <defs>
          <Gradient id={`${id}-g`} colors={palette} />
          <mask id={`${id}-m`}>
            <rect width={128} height={128} fill="#fff" />
            <path
              d={nodes}
              stroke="#000"
              strokeWidth={22}
              strokeLinecap="round"
            />
          </mask>
        </defs>
        <g fill="none" stroke={stroke} strokeLinecap="round">
          <circle
            cx={64}
            cy={64}
            r={52}
            strokeWidth={7}
            mask={`url(#${id}-m)`}
          />
          <path d={nodes} strokeWidth={13} />
          <path
            d="M26.8 46.7A41 41 0 0 1 101.2 46.7M46.7 101.2A41 41 0 0 1 25.5 78"
            strokeWidth={5}
          />
          <path d="M87 44.7A30 30 0 1 0 87 83.3" strokeWidth={8.5} />
        </g>
        <path
          d="M44.5 53.5L53 75.5L61.5 60.1L70 75.5L78.5 53.5"
          fill="none"
          style={{ stroke: palette.ink }}
          strokeWidth={8.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (variant === "badge") {
    const nodes =
      "M64 21h0M94.4 33.6h0M107 64h0M94.4 94.4h0M64 107h0M33.6 94.4h0M21 64h0M33.6 33.6h0";
    return (
      <>
        <defs>
          <Gradient id={`${id}-g`} colors={badgePalette} y1={14} y2={114} />
        </defs>
        <rect width={128} height={128} rx={28} style={{ fill: badgeTile }} />
        <g fill="none" stroke={stroke} strokeLinecap="round">
          <circle cx={64} cy={64} r={43} strokeWidth={3.5} />
          <path d={nodes} strokeWidth={13} opacity={0.18} />
          <path d={nodes} strokeWidth={8} />
          <path
            d="M86.5 90.8A35 35 0 1 1 81.5 33.7M90 40.6A35 35 0 0 1 96.9 76"
            strokeWidth={3.5}
          />
        </g>
        <path
          d="M84.7 46.6A27 27 0 1 0 84.7 81.4M47 54.5L54.5 74.5L62 60.5L69.5 74.5L77 54.5"
          fill="none"
          stroke={badgePalette.ink}
          strokeWidth={7.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </>
    );
  }

  return (
    <>
      <defs>
        <Gradient id={`${id}-g`} colors={palette} />
      </defs>
      <g fill="none" stroke={stroke} strokeLinecap="round">
        <circle cx={64} cy={64} r={50} strokeWidth={4} />
        <path
          d="M64 14h0M99.4 28.6h0M114 64h0M99.4 99.4h0M64 114h0M28.6 99.4h0M14 64h0M28.6 28.6h0"
          strokeWidth={10}
        />
        <path
          d="M29.4 84A40 40 0 0 1 84 29.4M84 98.6A40 40 0 0 1 47.1 100.3"
          strokeWidth={4.5}
        />
      </g>
      <path
        d="M44 55L52 76L60 61.3L68 76L81.4 40.8A29 29 0 1 0 86.2 82.6"
        fill="none"
        style={{ stroke: palette.ink }}
        strokeWidth={8.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </>
  );
}

export type WardenClyffeMarkProps = SvgProps &
  A11yProps & {
    /** ligature: primary mark · minimal: small sizes / favicon · badge: app-icon tile */
    variant?: WardenClyffeMarkVariant;
    /** Rendered width and height in px. */
    size?: number;
  };

export const WardenClyffeMark = React.forwardRef<
  SVGSVGElement,
  WardenClyffeMarkProps
>(function WardenClyffeMark(
  {
    variant = "ligature",
    size = 24,
    decorative,
    title = DEFAULT_TITLE,
    className,
    ...props
  },
  ref,
) {
  const id = useSvgId();
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={MARK_VIEWBOX[variant]}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      {...a11yProps(decorative, title)}
      {...props}
    >
      {!decorative && <title>{title}</title>}
      <MarkArtwork variant={variant} id={id} />
    </svg>
  );
});

/* -------------------------------------------------------------- wordmark -- */

// "WardenClyffe" in Saira (SIL Open Font License 1.1), wght 560 / wdth 112.5,
// outlined to paths. Grid: cap height 50, baseline y=50, left ink edge x=0.
const WORDMARK_WARDEN =
  "M14 50l-14-50h9.5l10.7 38.9h.3l11.6-38.9h9.6l11.7 38.9h.4l10.1-38.9h9.4l-14 50h-11.3l-11.2-36.4h-.3l-11.2 36.4h-11.3zM88.1 50.6q-3.9 0-6.6-1q-2.7-1.1-4.1-3.4q-1.3-2.4-1.3-6.5q0-4.2 1-6.8q1-2.5 3.7-3.7q2.7-1.1 7.4-1.1q.8 0 2.3 0q1.5.1 3.4.1q2 0 4 .1q2 0 3.6.1v-1.5q0-2.6-.4-4.1q-.4-1.5-1.6-2.2q-1.1-.7-3.4-.9q-2.2-.1-5.8-.1q-1.8 0-4.1.1q-2.3.1-4.4.2q-2.1.2-3.2.3v-6.7q3.3-.6 7.1-.9q3.8-.2 7.7-.2q4.5 0 7.6.5q3 .6 4.9 1.7q1.9 1.1 2.8 2.9q.9 1.8 1.2 4.2q.4 2.4.4 5.5v22.8h-8.1l-.3-4.7h-.5q-1.4 2.4-3.6 3.5q-2.2 1.1-4.8 1.5q-2.6.3-4.9.3zm4.2-6.9q1.9 0 3.4-.2q1.6-.3 2.7-.9q1.2-.6 1.8-1.7q.6-1.1 1-2.7q.3-1.5.3-3.5v-.9h-11.1q-2.4 0-3.7.3q-1.3.4-1.7 1.5q-.4 1.1-.4 3.3q0 2.1.5 3.1q.5 1 2.2 1.4q1.7.3 5 .3zM122.3 50v-37.1h8.1l.3 6.6h.6q1-2.8 2.8-4.4q1.9-1.5 4.4-2.1q2.5-.6 5.8-.6v8.3q-5.3 0-8.1 1.5q-2.9 1.4-4 4.5q-1.1 3.2-1.1 8.4v14.9h-8.8zM164.6 50.6q-3.8 0-6.5-.9q-2.7-.9-4.3-3.1q-1.7-2.2-2.4-5.9q-.8-3.6-.8-9.2q0-5.5.7-9.2q.8-3.7 2.4-5.9q1.6-2.2 4.2-3.1q2.6-.9 6.4-.9q2.7 0 5 .4q2.3.3 4.2 1.4q1.8 1 3 3h.5v-21.2h8.7v54h-8l-.3-4.8h-.5q-1.2 2.2-3.2 3.4q-2 1.1-4.3 1.6q-2.4.4-4.8.4zm3.7-7.7q3.2 0 5-.8q1.8-.8 2.6-2.4q.8-1.6.9-3.6q.2-2 .2-4.7q0-2.7-.2-4.8q-.2-2-.9-3.4q-.9-1.6-2.7-2.4q-1.8-.7-5-.7q-2.9 0-4.7.4q-1.7.3-2.6 1.5q-.9 1.1-1.1 3.4q-.3 2.2-.3 6.1q0 3.8.3 6.1q.2 2.3 1.1 3.5q.9 1.1 2.7 1.5q1.7.3 4.7.3zM214.8 50.6q-5 0-8.4-.7q-3.4-.6-5.5-2q-2-1.4-3-3.6q-1-2.3-1.3-5.4q-.4-3.2-.4-7.4q0-4.9.6-8.6q.6-3.6 2.4-5.9q1.7-2.4 5.3-3.5q3.7-1.1 9.7-1.1q4.7 0 7.8.7q3.1.7 4.8 2.2q1.8 1.5 2.6 3.8q.8 2.3 1.1 5.4q.2 3.1.2 7.1v2.7h-25.6q0 2.9.3 4.7q.3 1.8 1.4 2.8q1.1.9 3.5 1.3q2.4.3 6.7.3q1.7 0 3.9 0q2.1-.1 4.3-.3q2.2-.2 3.9-.4v6.8q-1.7.3-4.1.6q-2.5.2-5.1.4q-2.6.1-5.1.1zm7.5-20.8v-1.6q0-2.9-.4-4.6q-.4-1.8-1.3-2.7q-1-.9-2.6-1.1q-1.6-.3-4-.3q-2.9 0-4.7.3q-1.8.4-2.7 1.4q-.9 1-1.2 2.8q-.3 1.8-.3 4.6h18.6l-1.4 1.2zM241.1 50v-37.1h8.2l.2 4.9h.7q1-1.8 2.6-3q1.6-1.2 4-1.8q2.4-.6 5.8-.6q4.2 0 6.7.9q2.6 1 3.9 2.8q1.3 1.9 1.8 4.6q.5 2.7.5 6.3v23h-8.8v-19.6q0-3.6-.2-5.7q-.3-2.1-1.1-3q-.8-1-2.4-1.3q-1.6-.3-4.3-.3q-3 0-4.7.6q-1.8.7-2.7 2q-.8 1.4-1.1 3.4q-.3 2.1-.3 4.8v19.1h-8.8z";
const WORDMARK_CLYFFE =
  "M309.1 50.6q-5.8 0-9.8-.7q-4-.7-6.5-2.4q-2.5-1.7-3.8-4.6q-1.3-2.9-1.8-7.4q-.4-4.4-.4-10.5q0-6.2.4-10.6q.5-4.4 1.8-7.3q1.3-2.9 3.8-4.6q2.5-1.7 6.5-2.4q4-.7 9.8-.7q2.3 0 4.7.2q2.5.1 4.7.4q2.3.3 3.9.7v7.3q-1.9-.3-3.9-.5q-2.1-.1-3.8-.2q-1.8-.1-3.1-.1q-4.3 0-7.1.3q-2.9.3-4.5 1.2q-1.7 1-2.5 2.9q-.8 1.9-1.1 5.2q-.2 3.2-.2 8.2q0 4.9.2 8.2q.3 3.3 1.1 5.2q.8 1.9 2.5 2.9q1.6.9 4.5 1.2q2.8.3 7.1.3q2.7 0 5.8-.2q3.1-.2 5.4-.6v7.5q-1.8.3-4.2.6q-2.3.2-4.8.3q-2.5.2-4.7.2zM332.9 50v-54h8.8v54h-8.8zM369.7 65.1q-2.2 0-4.7-.1q-2.4-.1-4.7-.2q-2.2-.2-3.9-.4v-6.8q3.1.2 5.1.2q2.1.1 3.6.1q1.4 0 2.6 0q4.2 0 6.5-.4q2.4-.5 3.5-1.6q1.1-1.2 1.4-3.1q.3-2 .3-5.1v-2.5h-.5q-.9 1.6-2.5 2.7q-1.5 1.1-3.9 1.7q-2.4.6-5.9.6q-4 0-6.6-.9q-2.5-.9-3.9-2.6q-1.3-1.8-1.8-4.4q-.5-2.6-.5-6v-23.4h8.7v19.5q0 3.5.3 5.6q.3 2.1 1.1 3.1q.8 1 2.4 1.3q1.6.3 4.3.3q2.9 0 4.7-.7q1.7-.7 2.6-2q.9-1.4 1.2-3.4q.3-2.1.3-4.8v-18.9h8.7v32.9q0 5.2-.5 8.8q-.6 3.7-2.4 6q-1.8 2.3-5.5 3.4q-3.7 1.1-10 1.1zM403.9 50v-29.8h-8v-7.3h8v-4q0-3.7.6-6.1q.5-2.4 1.8-3.7q1.3-1.4 3.5-2q2.2-.7 5.4-.8q3.2-.2 7.6-.2v6.5q-3.3 0-5.3.1q-2 .2-3.1.7q-1 .5-1.4 1.4q-.3 1-.3 2.7v5.4h10.1v7.3h-10.1v29.8h-8.8zM434.7 50v-29.8h-8v-7.3h8v-4q0-3.7.5-6.1q.6-2.4 1.9-3.7q1.3-1.4 3.4-2q2.2-.7 5.4-.8q3.3-.2 7.7-.2v6.5q-3.3 0-5.4.1q-2 .2-3 .7q-1.1.5-1.4 1.4q-.4 1-.4 2.7v5.4h10.2v7.3h-10.2v29.8h-8.7zM478.3 50.6q-5.1 0-8.5-.7q-3.4-.6-5.4-2q-2.1-1.4-3.1-3.6q-.9-2.3-1.3-5.4q-.3-3.2-.3-7.4q0-4.9.6-8.6q.6-3.6 2.3-5.9q1.8-2.4 5.4-3.5q3.6-1.1 9.6-1.1q4.8 0 7.8.7q3.1.7 4.9 2.2q1.7 1.5 2.6 3.8q.8 2.3 1 5.4q.2 3.1.2 7.1v2.7h-25.6q0 2.9.3 4.7q.3 1.8 1.4 2.8q1.2.9 3.6 1.3q2.4.3 6.6.3q1.8 0 3.9 0q2.2-.1 4.4-.3q2.1-.2 3.8-.4v6.8q-1.7.3-4.1.6q-2.4.2-5.1.4q-2.6.1-5 .1zm7.5-20.8v-1.6q0-2.9-.4-4.6q-.4-1.8-1.4-2.7q-.9-.9-2.6-1.1q-1.6-.3-4-.3q-2.9 0-4.7.3q-1.7.4-2.6 1.4q-.9 1-1.2 2.8q-.4 1.8-.4 4.6h18.7l-1.4 1.2z";
const WORDMARK_WIDTH = 494.1;
const WORDMARK_HEIGHT = 69.1;
const WORDMARK_VIEWBOX = `0 -4 ${WORDMARK_WIDTH} ${WORDMARK_HEIGHT}`;

function WordmarkArtwork({ tone }: { tone: WardenClyffeTone }) {
  return (
    <>
      <path d={WORDMARK_WARDEN} style={{ fill: palette.ink }} />
      <path
        d={WORDMARK_CLYFFE}
        style={{ fill: tone === "duo" ? palette.cyan : palette.ink }}
      />
    </>
  );
}

export type WardenClyffeWordmarkProps = SvgProps &
  A11yProps & {
    /** Rendered height in px (ascender to descender); width follows. */
    height?: number;
    /** duo: "Warden" ink + "Clyffe" cyan · mono: single ink colour */
    tone?: WardenClyffeTone;
  };

export const WardenClyffeWordmark = React.forwardRef<
  SVGSVGElement,
  WardenClyffeWordmarkProps
>(function WardenClyffeWordmark(
  { height = 16, tone = "duo", decorative, title = DEFAULT_TITLE, ...props },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={WORDMARK_VIEWBOX}
      width={round1((height * WORDMARK_WIDTH) / WORDMARK_HEIGHT)}
      height={height}
      {...a11yProps(decorative, title)}
      {...props}
    >
      {!decorative && <title>{title}</title>}
      <WordmarkArtwork tone={tone} />
    </svg>
  );
});

/* ---------------------------------------------------------------- lockup -- */

// Mark fills a 110-unit square; the wordmark's cap height is half the mark
// height, centred on it, with a gap of 0.3 x mark height.
const LOCKUP_HEIGHT = 110;
const LOCKUP_WIDTH = 686.5;
const WORDMARK_TRANSFORM = "translate(143 27.5) scale(1.1)";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export type WardenClyffeLockupProps = SvgProps &
  A11yProps & {
    /** Rendered height in px; width follows the lockup's aspect ratio. */
    height?: number;
    markVariant?: WardenClyffeMarkVariant;
    tone?: WardenClyffeTone;
  };

export const WardenClyffeLockup = React.forwardRef<
  SVGSVGElement,
  WardenClyffeLockupProps
>(function WardenClyffeLockup(
  {
    height = 24,
    markVariant = "ligature",
    tone = "duo",
    decorative,
    title = DEFAULT_TITLE,
    ...props
  },
  ref,
) {
  const id = useSvgId();
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${LOCKUP_WIDTH} ${LOCKUP_HEIGHT}`}
      width={round1((height * LOCKUP_WIDTH) / LOCKUP_HEIGHT)}
      height={height}
      {...a11yProps(decorative, title)}
      {...props}
    >
      {!decorative && <title>{title}</title>}
      <svg
        width={LOCKUP_HEIGHT}
        height={LOCKUP_HEIGHT}
        viewBox={MARK_VIEWBOX[markVariant]}
      >
        <MarkArtwork variant={markVariant} id={id} />
      </svg>
      <g transform={WORDMARK_TRANSFORM}>
        <WordmarkArtwork tone={tone} />
      </g>
    </svg>
  );
});

/* --------------------------------------------------- responsive logo ----- */

const LOGO_SIZES = {
  default: { desktop: 22, mobile: 30 },
  large: { desktop: 24, mobile: 40 },
} as const;

export type WardenClyffeLogoProps = A11yProps & {
  size?: keyof typeof LOGO_SIZES;
  /** Swap the lockup for the mark below the md breakpoint. */
  mobile?: boolean;
  className?: string;
  markVariant?: WardenClyffeMarkVariant;
  tone?: WardenClyffeTone;
};

/**
 * Header logo: the full lockup from md up and, when `mobile` is set, the mark
 * alone below md. The ref points at the lockup.
 */
export const WardenClyffeLogo = React.forwardRef<
  SVGSVGElement,
  WardenClyffeLogoProps
>(function WardenClyffeLogo(
  {
    size = "default",
    mobile = true,
    className,
    markVariant = "ligature",
    tone = "duo",
    decorative,
    title,
  },
  ref,
) {
  const { desktop, mobile: mobileSize } = LOGO_SIZES[size];
  return (
    <>
      <WardenClyffeLockup
        ref={ref}
        height={desktop}
        markVariant={markVariant}
        tone={tone}
        decorative={decorative}
        title={title}
        className={cn(mobile && "hidden md:block", className)}
      />
      {mobile && (
        <WardenClyffeMark
          size={mobileSize}
          variant={markVariant}
          decorative={decorative}
          title={title}
          className={cn("md:hidden ml-4", className)}
        />
      )}
    </>
  );
});
