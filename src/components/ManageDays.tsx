import { useRef, useState } from "react";
import { CloseOnBack, useDismissOnBack } from "../closeOnBack";
import {
  createDay,
  isPlanDay,
  loadDays,
  resetDayList,
  saveDays,
  type TrackerDay,
} from "../days";
import { notifyDaysChanged } from "../dayShare";
import { useTheme } from "../theme";
import { purgeDayData, resetStoredWorkouts, saveDayWorkouts } from "../trackerStore";
import { ExportDays } from "./ExportDays";
import { ImportDays } from "./ImportDays";

function blankCard() {
  return {
    id: `added-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    options: [] as string[],
    sets: 3,
  };
}

function nameProblem(days: TrackerDay[], id: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a name.";
  const clash = days.some((day) => day.id !== id && day.name.trim().toLowerCase() === trimmed.toLowerCase());
  return clash ? "That name is already used." : "";
}

export function ManageDays({ onChange, onClose }: { onChange: () => void; onClose: () => void }) {
  const theme = useTheme();
  const [days, setDays] = useState(loadDays);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [blocked, setBlocked] = useState("");
  const [importing, setImporting] = useState(false);
  const [exportIds, setExportIds] = useState<string[] | null>(null);
  const drag = useRef<{ from: number; last: number; startY: number; height: number } | null>(null);
  useDismissOnBack(confirmDelete, () => setConfirmDelete(false));
  useDismissOnBack(confirmReset, () => setConfirmReset(false));

  function commit(next: TrackerDay[]) {
    saveDays(next);
    setDays(next);
    onChange();
  }

  function rename(day: TrackerDay, value: string) {
    setDrafts((current) => ({ ...current, [day.id]: value }));
    setBlocked("");
    if (nameProblem(days, day.id, value)) return;
    commit(days.map((item) => (item.id === day.id ? { ...item, name: value } : item)));
  }

  function recolor(day: TrackerDay, color: string) {
    commit(days.map((item) => (item.id === day.id ? { ...item, color } : item)));
    if (!isPlanDay(day.id)) return;
    theme.setColor(day.id === "cardio" ? "cardioCore" : day.id, color);
  }

  function move(from: number, to: number) {
    if (from === to) return;
    const next = [...days];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    commit(next);
  }

  function addDay() {
    const { days: next, created } = createDay(days);
    saveDayWorkouts(created.id, [blankCard()]);
    commit(next);
    setConfirmDelete(false);
    setConfirmReset(false);
  }

  function deleteSelected() {
    if (selected.length === 0) return;
    if (days.length - selected.length < 1) {
      setBlocked("Keep at least one day.");
      setConfirmDelete(false);
      return;
    }
    if (!confirmDelete) {
      setConfirmDelete(true);
      setConfirmReset(false);
      return;
    }
    const next = days.filter((day) => !selected.includes(day.id));
    for (const id of selected) purgeDayData(id);
    setSelected([]);
    setConfirmDelete(false);
    commit(next);
  }

  function reset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setConfirmDelete(false);
      return;
    }
    const next = resetDayList();
    resetStoredWorkouts(next.map((day) => day.id));
    theme.resetColors();
    setDays(next);
    setDrafts({});
    setSelected([]);
    setConfirmReset(false);
    onChange();
  }

  function close() {
    const problem = days.find((day) => nameProblem(days, day.id, drafts[day.id] ?? day.name));
    if (problem) {
      setBlocked(nameProblem(days, problem.id, drafts[problem.id] ?? problem.name));
      return;
    }
    onClose();
  }

  return (
    <>
      <CloseOnBack onClose={onClose} />
      <button type="button" className="backdrop" aria-label="Close manage days" onClick={close} />
      <div className="manage-pop" role="dialog" aria-modal="true" aria-labelledby="manage-days-title">
        <h2 id="manage-days-title">Manage days</h2>
        <ul className="manage-list">
          {days.map((day, index) => {
            const value = drafts[day.id] ?? day.name;
            const problem = nameProblem(days, day.id, value);
            return (
              <li key={day.id} className="manage-row">
                <button
                  type="button"
                  className="drag-handle"
                  aria-label={`Reorder ${day.name}`}
                  onPointerDown={(event) => {
                    const row = event.currentTarget.closest("li");
                    const height = row?.getBoundingClientRect().height ?? 52;
                    drag.current = { from: index, last: index, startY: event.clientY, height };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const active = drag.current;
                    if (!active) return;
                    const next = Math.max(
                      0,
                      Math.min(days.length - 1, active.from + Math.round((event.clientY - active.startY) / active.height)),
                    );
                    if (next === active.last) return;
                    move(active.last, next);
                    active.last = next;
                    active.from = next;
                    active.startY = event.clientY;
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                >
                  ⋮⋮
                </button>
                <input
                  type="text"
                  aria-label={`Day name ${day.name}`}
                  value={value}
                  aria-invalid={problem ? true : undefined}
                  onChange={(event) => rename(day, event.target.value)}
                />
                <input
                  type="color"
                  aria-label={`${day.name} colour`}
                  value={day.color}
                  onChange={(event) => recolor(day, event.target.value)}
                />
                <button type="button" className="row-share" onClick={() => setExportIds([day.id])}>
                  Share
                </button>
                <input
                  type="checkbox"
                  aria-label={`Select ${day.name}`}
                  checked={selected.includes(day.id)}
                  onChange={(event) => {
                    setSelected((current) =>
                      event.target.checked ? [...current, day.id] : current.filter((id) => id !== day.id),
                    );
                    setConfirmDelete(false);
                  }}
                />
              </li>
            );
          })}
        </ul>
        {blocked ? <p className="manage-note">{blocked}</p> : null}
        <div className="manage-actions-stack">
          <div className="manage-actions">
            <button type="button" onClick={() => setImporting(true)}>
              Import
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={() => setExportIds(days.filter((day) => selected.includes(day.id)).map((day) => day.id))}
            >
              Export
            </button>
          </div>
          <div className="manage-actions">
            <button type="button" onClick={() => setExportIds(days.map((day) => day.id))}>
              Export all days
            </button>
          </div>
          <div className="manage-actions">
            <button type="button" onClick={addDay} aria-label="Add day">
              +
            </button>
            <button type="button" onClick={deleteSelected} disabled={selected.length === 0}>
              {confirmDelete ? "Delete?" : "Delete"}
            </button>
            <button type="button" onClick={reset}>
              {confirmReset ? "Reset?" : "Reset"}
            </button>
            <button type="button" className="manage-save" onClick={close}>
              Save
            </button>
          </div>
        </div>
      </div>
      {exportIds ? <ExportDays ids={exportIds} onClose={() => setExportIds(null)} /> : null}
      {importing ? (
        <ImportDays
          onClose={() => setImporting(false)}
          onApplied={() => {
            setDays(loadDays());
            setDrafts({});
            setSelected([]);
            onChange();
            notifyDaysChanged();
          }}
        />
      ) : null}
    </>
  );
}
