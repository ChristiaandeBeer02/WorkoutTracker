import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { flushDraftsNow } from "../trackerDrafts";

export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let active = true;
    const apply = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (active) setReady(true);
      },
    });
    setUpdate(() => apply);
    return () => {
      active = false;
    };
  }, []);

  const visible = ready && !dismissed;

  useEffect(() => {
    document.body.classList.toggle("update-ready", visible);
    return () => document.body.classList.remove("update-ready");
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="update-banner" role="status">
      <p>New version ready</p>
      <button
        type="button"
        className="update-go"
        onClick={() => {
          flushDraftsNow();
          void update?.();
        }}
      >
        Update
      </button>
      <button type="button" className="update-dismiss" aria-label="Dismiss update" onClick={() => setDismissed(true)}>
        ×
      </button>
    </div>
  );
}

