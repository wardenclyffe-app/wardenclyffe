"use client";

import { MessageCircle, Minus, PanelLeft, PanelTop, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CanonicalButton } from "@/components/canonical/CanonicalButton";

type OverlayDock = "left" | "top" | "right";

interface ChatBoundaryProps {
  title?: string;
  children: ReactNode;
  defaultDock?: OverlayDock;
}

export const ChatBoundary = ({
  title = "Clyffy Chat",
  children,
  defaultDock = "right",
}: ChatBoundaryProps) => {
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [dock, setDock] = useState<OverlayDock>(defaultDock);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) launcher.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
  };

  const dockClass =
    dock === "right"
      ? "right-[var(--wc-space-3)] bottom-[var(--wc-space-3)] w-[min(30rem,calc(100%-2*var(--wc-space-3)))]"
      : dock === "left"
      ? "left-[var(--wc-space-3)] top-[var(--wc-shell-top)] w-[min(30rem,92vw)]"
      : "left-1/2 top-[var(--wc-space-3)] -translate-x-1/2 w-[min(48rem,96vw)]";

  return (
    <>
      <button
        ref={launcher}
        type="button"
        className="fixed bottom-[var(--wc-space-3)] right-[var(--wc-space-3)] z-40 flex min-h-12 items-center gap-2 rounded-full bg-wardenclyffe-400 px-5 text-black shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        aria-label="Open Clyffy chat"
        aria-expanded={open}
        hidden={open}
        style={open ? { display: "none" } : undefined}
        onClick={() => {
          setOpen(true);
          setMinimized(false);
          requestAnimationFrame(() => panel.current?.focus());
        }}
      >
        <MessageCircle aria-hidden="true" size={20} />
        Clyffy Chat
      </button>
      {open && (
        <aside
          ref={panel}
          tabIndex={-1}
          className={`wc-shell-frame fixed z-40 ${dockClass} border p-[var(--wc-space-2)] shadow-2xl`}
          role="dialog"
          aria-label={title}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className="mb-[var(--wc-space-2)] flex items-center justify-between gap-2">
            <div className="wc-fluid-text-sm text-nb-gray-100">{title}</div>
            <div className="flex items-center gap-1">
              <CanonicalButton
                className="min-h-12 min-w-12"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={
                  dock === "top" ? "Dock to bottom right" : "Dock to top"
                }
                onClick={() => setDock((d) => (d === "top" ? "right" : "top"))}
              >
                {dock === "left" ? (
                  <PanelTop size={16} />
                ) : (
                  <PanelLeft size={16} />
                )}
              </CanonicalButton>
              <CanonicalButton
                className="min-h-12 min-w-12"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={minimized ? "Expand chat" : "Minimize chat"}
                onClick={() => setMinimized((v) => !v)}
              >
                <Minus size={16} />
              </CanonicalButton>
              <CanonicalButton
                className="min-h-12 min-w-12"
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Close chat"
                onClick={close}
              >
                <X size={16} />
              </CanonicalButton>
            </div>
          </header>

          {!minimized && (
            <div className="max-h-[min(70vh,42rem)] overflow-auto">
              {children}
            </div>
          )}
        </aside>
      )}
    </>
  );
};
