"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CanonicalButton } from "@/components/canonical/CanonicalButton";
import type { UiEvent } from "../../contracts/UiEvent";

export const UiEventPopup = ({
  event,
  anchor,
  onDismiss,
}: {
  event: UiEvent;
  anchor: HTMLElement;
  onDismiss: () => void;
}) => (
  <Dialog.Root
    open
    onOpenChange={(open) => {
      if (!open) onDismiss();
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[10000] bg-black/60" />
      <Dialog.Content
        data-ui-event={event.id}
        onCloseAutoFocus={(focusEvent) => {
          focusEvent.preventDefault();
          if (anchor.isConnected) anchor.focus();
        }}
        className="wc-shell-frame fixed left-1/2 top-1/2 z-[10001] max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto p-[clamp(1rem,3vw,2rem)] text-nb-gray-100"
      >
        <Dialog.Title className="text-xl font-semibold">
          {event.title}
        </Dialog.Title>
        <Dialog.Description className="mt-3 whitespace-pre-wrap break-words">
          {event.body}
        </Dialog.Description>
        <p className="mt-3 text-sm text-nb-gray-300">
          {event.provenance.source} · {event.provenance.signal}
        </p>
        <Dialog.Close asChild>
          <CanonicalButton className="mt-4 min-h-12">
            Close event
          </CanonicalButton>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);
