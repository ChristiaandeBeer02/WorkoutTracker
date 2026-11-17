import { useEffect, useRef, useState } from "react";
import {
  armBeep,
  cancelRestAlert,
  finishRestAlert,
  requestNotifyPermission,
  scheduleRestAlert,
} from "../restAlert";
import { setRestStarter } from "../restBridge";
import {
  formatRemaining,
  loadRestState,
  remainingMs,
  REST_PRESETS,
  saveRestState,
  type RestState,
} from "../restTimer";

export function RestBar() {
  const [state, setState] = useState<RestState>(loadRestState);
  const [now, setNow] = useState(() => Date.now());
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loaded = loadRestState();
    saveRestState(loaded);
    setState(loaded);
    if (loaded.status === "running" && loaded.endAt != null) void scheduleRestAlert(loaded.endAt);
  }, []);

  useEffect(() => {
    if (state.status !== "running" || state.endAt == null) return;
    const endAt = state.endAt;
    let timer = 0;
    const tick = () => {
      const left = endAt - Date.now();
      setNow(Date.now());
      if (left <= 0) {
        const current = stateRef.current;
        if (current.notified || current.status !== "running") return;
        const finished: RestState = { ...current, status: "finished", notified: true };
        stateRef.current = finished;
        saveRestState(finished);
        setState(finished);
        void finishRestAlert();
        return;
      }
      timer = window.setTimeout(tick, Math.min(250, left));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state.status, state.endAt]);

  const left = remainingMs(state, now);

  function commit(next: RestState) {
    stateRef.current = next;
    saveRestState(next);
    setState(next);
  }

  function start() {
    const current = stateRef.current;
    if (current.status === "running") return;
    requestNotifyPermission();
    armBeep();
    const endAt = Date.now() + current.durationMs;
    commit({
      durationMs: current.durationMs,
      endAt,
      status: "running",
      notified: false,
    });
    void scheduleRestAlert(endAt);
  }

  useEffect(() => setRestStarter(start));

  function reset() {
    commit({
      durationMs: state.durationMs,
      endAt: null,
      status: "idle",
      notified: false,
    });
    void cancelRestAlert();
  }

  function chooseDuration(ms: number) {
    if (state.status === "running") return;
    commit({ ...state, durationMs: ms, endAt: null, status: "idle", notified: false });
  }

  return (
    <div className="rest-bar">
      <div className="rest-time">
        {state.status === "running" ? (
          <span className="rest-readout" role="timer" aria-live="off" aria-label={`${formatRemaining(left)} left`}>
            {formatRemaining(left)}
          </span>
        ) : state.status === "finished" ? (
          <span className="rest-readout rest-done" role="status">
            Done
          </span>
        ) : (
          <select
            aria-label="Rest length"
            value={state.durationMs}
            onChange={(event) => chooseDuration(Number(event.target.value))}
          >
            {REST_PRESETS.map((preset) => (
              <option key={preset.ms} value={preset.ms}>
                {preset.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="rest-controls">
        <button type="button" className="rest-start" onClick={start} disabled={state.status === "running"}>
          Start
        </button>
        <button type="button" className="rest-reset" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
