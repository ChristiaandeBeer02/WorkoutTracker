import { useEffect, useRef } from "react";

/**
 * While a pop-up is open, the phone or browser Back button closes it
 * instead of leaving the page. Nested pop-ups close one at a time.
 * Closing with a button removes that history entry so they do not pile up.
 *
 * The exercise-detail flag is kept on the history entry so Back still
 * returns from a detail to the search list once no pop-up is open.
 */

interface Marker {
  exerciseDetail?: boolean;
  trackerDetail?: boolean;
  workoutModal?: number;
}

const dismissers = new Map<number, () => void>();
const openModals: number[] = [];
let nextId = 1;
let pendingSteps = 0;
let flushScheduled = false;
let suppressEvents = 0;
let listening = false;

function readMarker(): Marker {
  const state = history.state as Marker | null;
  if (!state || typeof state !== "object") return {};
  const next: Marker = {};
  if (state.exerciseDetail) next.exerciseDetail = true;
  if (state.trackerDetail) next.trackerDetail = true;
  return next;
}

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("popstate", onPop);
}

function onPop() {
  if (suppressEvents > 0) {
    suppressEvents -= 1;
    return;
  }
  const id = openModals.pop();
  if (id == null) return;
  const dismiss = dismissers.get(id);
  dismissers.delete(id);
  dismiss?.();
}

function scheduleBack(steps: number) {
  pendingSteps += steps;
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    const stepsToTake = pendingSteps;
    pendingSteps = 0;
    if (stepsToTake <= 0) return;
    suppressEvents += 1;
    history.go(-stepsToTake);
  });
}

function release(id: number) {
  const index = openModals.lastIndexOf(id);
  if (index === -1) return;
  const steps = openModals.length - index;
  const dropped = openModals.slice(index);
  openModals.splice(index);
  for (const droppedId of dropped) dismissers.delete(droppedId);
  scheduleBack(steps);
}

/** How many pop-ups are currently holding a history entry. */
export function modalDepth(): number {
  return openModals.length;
}

/**
 * Leave the current screen and any pop-ups stacked on it in one step.
 * Pop-up cleanups then see an empty stack, so they do not schedule another Back.
 */
export function retreat(extraSteps: number) {
  const steps = openModals.length + extraSteps;
  const dropped = openModals.splice(0);
  for (const id of dropped) dismissers.delete(id);
  if (steps > 0) scheduleBack(steps);
}

export function useDismissOnBack(active: boolean, onDismiss: () => void) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return;
    ensureListener();
    const id = nextId;
    nextId += 1;
    dismissers.set(id, () => dismissRef.current());
    openModals.push(id);
    history.pushState({ ...readMarker(), workoutModal: id }, "");
    return () => {
      dismissers.delete(id);
      release(id);
    };
  }, [active]);
}

/** Mount inside a pop-up. Unmounting it, or pressing Back, closes that pop-up. */
export function CloseOnBack({ onClose }: { onClose: () => void }) {
  useDismissOnBack(true, onClose);
  return null;
}
