import { useEffect, useState } from "react";
import { Workbox } from "workbox-window";
import { flushDraftsNow } from "../trackerDrafts";

const CHECK_EVERY_MS = 2 * 60 * 1000;

export function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [apply, setApply] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let alive = true;
    let registration: ServiceWorkerRegistration | undefined;
    const show = () => {
      if (alive) setReady(true);
    };
    const wb = new Workbox(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: "none",
    } as { scope?: string; updateViaCache?: ServiceWorkerUpdateViaCache });
    wb.addEventListener("waiting", show);
    wb.addEventListener("controlling", (event) => {
      if (event.isUpdate) window.location.reload();
    });
    const check = () => {
      if (!registration) return;
      void registration.update().then(() => {
        if (registration?.waiting && navigator.serviceWorker.controller) show();
      }).catch(() => undefined);
    };
    void wb.register({ immediate: true }).then((reg) => {
      registration = reg;
      if (reg?.waiting && navigator.serviceWorker.controller) show();
    });
    setApply(() => () => {
      flushDraftsNow();
      wb.messageSkipWaiting();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, CHECK_EVERY_MS);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
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
      <button type="button" className="update-go" onClick={() => apply?.()}>
        Update
      </button>
      <button type="button" className="update-dismiss" aria-label="Dismiss update" onClick={() => setDismissed(true)}>
        ×
      </button>
    </div>
  );
}
