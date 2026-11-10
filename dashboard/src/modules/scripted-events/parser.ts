import { type } from "arktype";
import {
  type ScriptedAnnouncement,
  ScriptedAnnouncementsPayloadContract,
  type ScriptedEvent,
  ScriptedEventContract,
} from "./contracts";

const logSchemaMismatch = (surface: string, summary: string) => {
  console.warn(`[scripted-events] invalid ${surface} payload: ${summary}`);
};

const eventShapeMatchesKind = (event: ScriptedEvent) => {
  if (event.kind === "announcement") return !!event.announcement;
  if (event.kind === "tooltip") return !!event.tooltip;
  if (event.kind === "popup") return !!event.popup;
  return false;
};

const keepRenderableEvents = (events: ScriptedEvent[]) =>
  events.filter((event) => {
    if (!eventShapeMatchesKind(event)) {
      logSchemaMismatch(
        "event-kind-shape",
        `${event.id} kind=${event.kind} is missing matching payload`,
      );
      return false;
    }
    return true;
  });

export const parseScriptedAnnouncementsEnvelope = (payload: unknown) => {
  const parsed = ScriptedAnnouncementsPayloadContract(payload);
  if (parsed instanceof type.errors) {
    logSchemaMismatch("announcement", parsed.summary);
    return { announcements: [], events: [] as ScriptedEvent[] };
  }

  if (Array.isArray(parsed)) {
    return { announcements: parsed, events: [] as ScriptedEvent[] };
  }

  return {
    announcements: parsed.announcements,
    events: keepRenderableEvents(parsed.events ?? []),
  };
};

export const parseScriptedAnnouncementsPayload = (
  payload: unknown,
): ScriptedAnnouncement[] => {
  return parseScriptedAnnouncementsEnvelope(payload).announcements;
};

export const parseScriptedEventsPayload = (
  payload: unknown,
): ScriptedEvent[] => {
  const parsed = ScriptedEventContract.array()(payload);
  if (parsed instanceof type.errors) {
    logSchemaMismatch("events", parsed.summary);
    return [];
  }

  return keepRenderableEvents(parsed);
};
