"use client";

import { useEffect, useState } from "react";
import { getClientAuthHeaders } from "@/lib/client-auth";

/**
 * Presentation guard for the scoped INT-01 central pilot. Authorization is
 * still enforced by requireApiAuth and central-route-policy on the server.
 * While loading, avoid flashing write controls to the user.
 */
export function useCentralPilotReadOnly(): { readOnly: boolean; checking: boolean } {
  const [state, setState] = useState<{ readOnly: boolean; checking: boolean }>({
    readOnly: true,
    checking: true,
  });

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const headers = getClientAuthHeaders();
        const [sessionResponse, organizationsResponse] = await Promise.all([
          fetch("/api/auth/central-session", { headers, cache: "no-store", credentials: "include" }),
          fetch("/api/organizations/mine", { headers, cache: "no-store", credentials: "include" }),
        ]);
        if (!sessionResponse.ok || !organizationsResponse.ok) {
          if (mounted) setState({ readOnly: false, checking: false });
          return;
        }
        const session = await sessionResponse.json();
        const organizations = await organizationsResponse.json();
        const orgs = Array.isArray(organizations?.data) ? organizations.data : [];
        const memberRole = orgs.some((org: { role?: string }) => org.role === "member");
        if (mounted) setState({ readOnly: session?.ok === true && memberRole, checking: false });
      } catch {
        if (mounted) setState({ readOnly: false, checking: false });
      }
    };
    void run();
    return () => { mounted = false; };
  }, []);

  return state;
}
