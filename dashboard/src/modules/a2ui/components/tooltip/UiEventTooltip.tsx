"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UiEvent } from "../../contracts/UiEvent";

export const UiEventTooltip = ({
  event,
  anchor,
  onDismiss,
}: {
  event: UiEvent;
  anchor: HTMLElement;
  onDismiss: () => void;
}) => {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useEffect(() => {
    const update = () => {
      if (!anchor.isConnected) {
        onDismiss();
        return;
      }
      const box = anchor.getBoundingClientRect();
      setPosition({
        left: Math.max(
          8,
          Math.min(box.left, innerWidth - Math.min(320, innerWidth - 16) - 8),
        ),
        top: Math.max(
          8,
          Math.min(
            box.bottom + 8,
            innerHeight - (panel.current?.offsetHeight ?? 160) - 8,
          ),
        ),
      });
    };
    const previous = anchor.getAttribute("aria-describedby");
    anchor.setAttribute(
      "aria-describedby",
      [previous, id].filter(Boolean).join(" "),
    );
    const leave = (event: Event) => {
      if (
        event instanceof MouseEvent &&
        event.relatedTarget instanceof Node &&
        anchor.contains(event.relatedTarget)
      )
        return;
      if (
        event instanceof MouseEvent &&
        event.relatedTarget instanceof Node &&
        panel.current?.contains(event.relatedTarget)
      )
        return;
      onDismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    anchor.addEventListener("pointerout", leave);
    anchor.addEventListener("focusout", leave);
    document.addEventListener("keydown", escape, true);
    return () => {
      const description = anchor
        .getAttribute("aria-describedby")
        ?.split(/\s+/)
        .filter((value) => value !== id)
        .join(" ");
      if (description) anchor.setAttribute("aria-describedby", description);
      else anchor.removeAttribute("aria-describedby");
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      anchor.removeEventListener("pointerout", leave);
      anchor.removeEventListener("focusout", leave);
      document.removeEventListener("keydown", escape, true);
    };
  }, [anchor, id, onDismiss]);
  return createPortal(
    <div
      ref={panel}
      id={id}
      role="tooltip"
      data-ui-event={event.id}
      style={{ ...position, position: "fixed" }}
      onPointerLeave={(pointerEvent) => {
        if (
          !(pointerEvent.relatedTarget instanceof Node) ||
          !anchor.contains(pointerEvent.relatedTarget)
        )
          onDismiss();
      }}
      className="wc-shell-frame z-[10000] max-h-[calc(100dvh-1rem)] w-[min(20rem,calc(100%-1rem))] overflow-auto p-3 text-nb-gray-100 shadow-xl"
    >
      <p className="font-semibold">{event.title}</p>
      <p className="mt-1 break-words">{event.body}</p>
      <p className="mt-2 text-xs text-nb-gray-300">
        {event.provenance.source} · {event.provenance.signal}
      </p>
    </div>,
    document.body,
  );
};
