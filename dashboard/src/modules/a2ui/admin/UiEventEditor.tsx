"use client";

import { type Dispatch, type FormEvent, type SetStateAction } from "react";
import { UiInput } from "../components/input/UiInput";
import { UiSelect } from "../components/select/UiSelect";
import { UiTextarea } from "../components/textarea/UiTextarea";
import type { UiEventRequest } from "../contracts/UiEvent";

const textFields = [
  { key: "route", label: "Exact route", maxLength: 2000 },
  { key: "target", label: "Canonical target", maxLength: 200 },
  { key: "title", label: "Title", maxLength: 200 },
] as const;
const provenanceFields = [
  { key: "source", label: "Provenance source" },
  { key: "signal", label: "Provenance signal" },
] as const;

export const UiEventEditor = ({
  draft,
  setDraft,
  disabled,
  onSubmit,
  children,
}: {
  draft: UiEventRequest;
  setDraft: Dispatch<SetStateAction<UiEventRequest>>;
  disabled: boolean;
  onSubmit: (event: FormEvent) => void;
  children: React.ReactNode;
}) => (
  <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
    {textFields.map(({ key, label, maxLength }) => (
      <div key={key} className="grid gap-2">
        <label htmlFor={`ui-event-${key}`}>{label}</label>
        <UiInput
          id={`ui-event-${key}`}
          eventTarget={`ui.events.editor.${key}`}
          maxLength={maxLength}
          value={draft[key]}
          onChange={(event) =>
            setDraft((previous) => ({ ...previous, [key]: event.target.value }))
          }
          required
          disabled={disabled}
        />
      </div>
    ))}
    <label htmlFor="ui-event-body">Plain-text content</label>
    <UiTextarea
      id="ui-event-body"
      eventTarget="ui.events.editor.body"
      maxLength={4000}
      value={draft.body}
      onChange={(event) =>
        setDraft((previous) => ({ ...previous, body: event.target.value }))
      }
      required
      disabled={disabled}
    />
    <label htmlFor="ui-event-kind">Presentation</label>
    <UiSelect
      id="ui-event-kind"
      eventTarget="ui.events.editor.kind"
      value={draft.kind}
      disabled={disabled}
      onChange={(event) => {
        const value = event.target.value;
        if (value === "tooltip" || value === "popup")
          setDraft((previous) => ({ ...previous, kind: value }));
      }}
    >
      <option value="tooltip">Tooltip</option>
      <option value="popup">Popup</option>
    </UiSelect>
    <label htmlFor="ui-event-trigger">Trigger</label>
    <UiSelect
      id="ui-event-trigger"
      eventTarget="ui.events.editor.trigger"
      value={draft.trigger}
      disabled={disabled}
      onChange={(event) => {
        const value = event.target.value;
        if (
          value === "hover" ||
          value === "focus" ||
          value === "click" ||
          value === "manual"
        )
          setDraft((previous) => ({ ...previous, trigger: value }));
      }}
    >
      <option value="hover">Pointer hover / keyboard focus for tooltips</option>
      <option value="focus">Keyboard focus</option>
      <option value="click">Click / tap</option>
      <option value="manual">Explicit dispatch</option>
    </UiSelect>
    <label htmlFor="ui-event-priority">Priority</label>
    <UiInput
      id="ui-event-priority"
      eventTarget="ui.events.editor.priority"
      type="number"
      min={0}
      max={100000}
      value={draft.priority}
      onChange={(event) =>
        setDraft((previous) => ({
          ...previous,
          priority: event.target.valueAsNumber,
        }))
      }
      disabled={disabled}
    />
    {provenanceFields.map(({ key, label }) => (
      <div key={key} className="grid gap-2">
        <label htmlFor={`ui-event-${key}`}>{label}</label>
        <UiInput
          id={`ui-event-${key}`}
          eventTarget={`ui.events.editor.${key}`}
          maxLength={200}
          value={draft.provenance[key]}
          onChange={(event) =>
            setDraft((previous) => ({
              ...previous,
              provenance: { ...previous.provenance, [key]: event.target.value },
            }))
          }
          required
          disabled={disabled}
        />
      </div>
    ))}
    <label className="flex min-h-12 items-center gap-2">
      <input
        data-ui-target="ui.events.editor.enabled"
        type="checkbox"
        checked={draft.enabled}
        onChange={(event) =>
          setDraft((previous) => ({
            ...previous,
            enabled: event.target.checked,
          }))
        }
        disabled={disabled}
      />
      Enabled
    </label>
    {children}
  </form>
);
