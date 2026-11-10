import { type } from "arktype";

export const ScriptedAnnouncementContract = type({
  "+": "reject",
  tag: "string",
  text: "string > 0",
  "link?": "string.url",
  "linkText?": "string > 0",
  variant: "'default' | 'important'",
  "isExternal?": "boolean",
  closeable: "boolean",
  isCloudOnly: "boolean",
});

export type ScriptedAnnouncement = typeof ScriptedAnnouncementContract.infer;

export const ScriptedTooltipContract = type({
  "+": "reject",
  id: "string > 0",
  text: "string > 0",
  "title?": "string > 0",
  "anchor?": "string > 0",
  "placement?":
    "'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end'",
});

export type ScriptedTooltip = typeof ScriptedTooltipContract.infer;

export const ScriptedPopupContract = type({
  "+": "reject",
  id: "string > 0",
  title: "string > 0",
  body: "string > 0",
  "ctaLabel?": "string > 0",
  "ctaAction?": "string > 0",
});

export type ScriptedPopup = typeof ScriptedPopupContract.infer;

export const ScriptedEventContract = type({
  "+": "reject",
  id: "string > 0",
  "enabled?": "boolean",
  kind: "'announcement' | 'tooltip' | 'popup'",
  trigger:
    "'app_load' | 'route_change' | 'hover' | 'click' | 'scheduled' | 'manual' | 'mcp'",
  source: "'knowledgedrop' | 'didyouknow' | 'operator' | 'system' | 'mcp'",
  actor: "'clyffy' | 'council' | 'system' | 'operator' | 'mcp'",
  visibility: "'visible' | 'background'",
  delivery: "'ui' | 'datasink' | 'hybrid'",
  focus: "'full' | 'limited_tunnel'",
  "councilRole?": "'analyst' | 'guide' | 'guardian' | 'narrator'",
  priority: "number.integer >= 0",
  "target?": "string > 0",
  "announcement?": ScriptedAnnouncementContract,
  "tooltip?": ScriptedTooltipContract,
  "popup?": ScriptedPopupContract,
  "metadata?": "Record<string, unknown>",
});

export type ScriptedEvent = typeof ScriptedEventContract.infer;

export const ScriptedAnnouncementsPayloadContract = type(
  ScriptedAnnouncementContract.array(),
  "|",
  {
    "+": "reject",
    announcements: ScriptedAnnouncementContract.array(),
    "events?": ScriptedEventContract.array(),
  },
);

export type ScriptedAnnouncementsPayload =
  typeof ScriptedAnnouncementsPayloadContract.infer;
