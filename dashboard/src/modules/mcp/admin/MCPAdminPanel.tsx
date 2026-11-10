"use client";

import { CanonicalCard } from "@/components/canonical/CanonicalCard";

export const MCPAdminPanel = () => (
  <div className="p-default py-6">
    <CanonicalCard
      heading="MCP Connections"
      subtitle="Tool and data access, separate from chat and scripted events."
    >
      <p role="status">
        No MCP transport or connection-management backend is configured.
      </p>
      <p className="mt-3">
        The scripted-events tool adapter validates application payloads only. It
        does not connect to a server, run tools, or insert results into chat.
      </p>
      <p className="mt-3">
        Connection creation, credentials, tool permissions, and audit records
        require server-side management before they can be enabled here.
      </p>
    </CanonicalCard>
  </div>
);
