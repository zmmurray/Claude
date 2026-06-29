"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// One-tap maintenance: clear leftover "urgent" flags so urgent is meaningful again.
export default function AccountTools() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function clearUrgent() {
    setBusy(true);
    const sb = createSupabaseBrowser();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from("tasks").update({ urgent: false }).eq("user_id", user.id).eq("urgent", true);
    }
    setBusy(false);
    setDone(true);
  }

  return (
    <div className="mt-5 pt-5 border-t border-black/5">
      <button onClick={clearUrgent} disabled={busy} className="btn-quiet text-sm">
        {busy ? "Clearing…" : "Clear all urgent flags"}
      </button>
      {done && <p className="text-moss text-sm mt-2">Done — urgent is fresh. Add new urgent tasks and they'll lead Right now.</p>}
    </div>
  );
}
