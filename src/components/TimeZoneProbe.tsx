"use client";

import { useEffect } from "react";
import { saveTimeZone } from "@/app/time-zone-actions";

// Renders nothing. The browser is the only thing that knows which zone the user
// is actually in, and asking them in a settings form is a question nobody wants
// and most would answer wrong. This reports it once, on the first authenticated
// render of a session, so the value is on the record long before anyone reaches
// the Google Calendar connect button.
//
// Mounted in the three role layouts rather than inside AppHeader: the header's
// props are identity, navigation and theme, and a device probe is none of those.
export function TimeZoneProbe({ current }: { current: string | null }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // The guard is the point — without it this writes to the database on every
    // page load for every user forever, to store the same string.
    if (!zone || zone === current) return;
    // Fire and forget. Nothing on screen depends on the result, and a failed
    // write costs the next render another attempt, which is fine.
    void saveTimeZone(zone);
  }, [current]);

  return null;
}
