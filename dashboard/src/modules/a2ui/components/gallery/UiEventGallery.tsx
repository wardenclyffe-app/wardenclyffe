"use client";

import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import { UiInput } from "../input/UiInput";
import { UiSelect } from "../select/UiSelect";
import { UiTextarea } from "../textarea/UiTextarea";

export const UiEventGallery = () => (
  <CanonicalCard
    heading="Canonical UI Event Test Surface"
    subtitle="Create database definitions for route /ui-events and these targets. Hover, focus, and tap the real controls; no Playwright runtime is used."
  >
    <div className="grid gap-3 text-nb-gray-100">
      <label htmlFor="ui-gallery-name">Name</label>
      <UiInput
        id="ui-gallery-name"
        eventTarget="ui.gallery.name"
        autoComplete="off"
      />
      <label htmlFor="ui-gallery-description">Description</label>
      <UiTextarea
        id="ui-gallery-description"
        eventTarget="ui.gallery.description"
      />
      <label htmlFor="ui-gallery-password">
        Password field (content never collected)
      </label>
      <UiInput
        id="ui-gallery-password"
        eventTarget="ui.gallery.password"
        type="password"
        autoComplete="new-password"
      />
      <label className="flex min-h-12 items-center gap-2">
        <input type="checkbox" data-ui-target="ui.gallery.checkbox" />
        Checkbox
      </label>
      <label htmlFor="ui-gallery-select">Select</label>
      <UiSelect id="ui-gallery-select" eventTarget="ui.gallery.select">
        <option>First choice</option>
        <option>Second choice</option>
      </UiSelect>
      <button
        type="button"
        data-ui-target="ui.gallery.action"
        className="min-h-12 rounded border border-wardenclyffe-400 p-3"
      >
        Popup event target
      </button>
    </div>
  </CanonicalCard>
);
