"use client";

import { CanonicalCard } from "@/components/canonical/CanonicalCard";
import { useChat } from "../ChatProvider";

export const ChatAdminPanel = ({
  canUpdate = false,
}: {
  canUpdate?: boolean;
}) => {
  const { preferences, setEnabled } = useChat();
  return (
    <div className="p-default py-6">
      <CanonicalCard
        heading="Chat Controls"
        subtitle="Conversation UI only. These preferences apply to this browser, not the account."
      >
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            checked={preferences.enabled}
            disabled={!canUpdate}
            onChange={(event) => {
              if (canUpdate) setEnabled(event.target.checked);
            }}
          />
          Show Clyffy chat
        </label>
        <p role="status">
          No conversation backend is configured. Sending messages is disabled.
        </p>
        <p className="mt-3">
          Chat does not ingest scripted events or MCP results automatically.
        </p>
      </CanonicalCard>
    </div>
  );
};
