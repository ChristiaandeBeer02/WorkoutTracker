import { useEffect, useState } from "react";
import { CloseOnBack } from "../closeOnBack";
import { applySharedDays, dayNameTaken, notifyDaysChanged } from "../dayShare";
import { loadDays } from "../days";
import {
  BAD_CODE_MESSAGE,
  decodeShareCode,
  previewLine,
  ShareError,
  type SharedDay,
} from "../shareCodec";
import { useTheme } from "../theme";

type Mode = "new" | "replace" | "add" | "";

export function ImportDays({
  initialCode = "",
  onClose,
  onApplied,
}: {
  initialCode?: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(initialCode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState<SharedDay[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [stage, setStage] = useState<"paste" | "preview">("paste");

  useEffect(() => {
    if (!initialCode.trim()) return;
    let cancel = false;
    setBusy(true);
    decodeShareCode(initialCode)
      .then((decoded) => {
        if (cancel) return;
        const existing = loadDays();
        setDays(decoded);
        setModes(decoded.map((day) => (dayNameTaken(existing, day.name) ? "" : "new")));
        setStage("preview");
      })
      .catch((caught: unknown) => {
        if (cancel) return;
        setStage("paste");
        setError(caught instanceof ShareError ? caught.message : BAD_CODE_MESSAGE);
      })
      .finally(() => {
        if (!cancel) setBusy(false);
      });
    return () => {
      cancel = true;
    };
  }, [initialCode]);

  async function readCode(raw: string) {
    setBusy(true);
    setError("");
    try {
      const decoded = await decodeShareCode(raw);
      const existing = loadDays();
      setDays(decoded);
      setModes(decoded.map((day) => (dayNameTaken(existing, day.name) ? "" : "new")));
      setStage("preview");
    } catch (caught) {
      setStage("paste");
      setError(caught instanceof ShareError ? caught.message : BAD_CODE_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  function choose(index: number, mode: "replace" | "add") {
    setModes((current) => current.map((item, itemIndex) => (itemIndex === index ? mode : item)));
  }

  function commit() {
    if (modes.some((mode) => mode === "")) return;
    const applied = applySharedDays(days, modes.map((mode) => (mode === "" ? "new" : mode)));
    for (const day of applied) {
      if (day.planKey) theme.setColor(day.planKey, day.color);
    }
    notifyDaysChanged();
    onApplied();
    onClose();
  }

  const ready = stage === "preview" && modes.every((mode) => mode !== "");

  return (
    <>
      <CloseOnBack onClose={onClose} />
      <button type="button" className="backdrop share-layer" aria-label="Close import" onClick={onClose} />
      <div className="manage-pop share-layer" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <h2 id="import-title">Import days</h2>
        {stage === "paste" ? (
          <>
            <label className="share-field">
              Share code or link
              <textarea
                className="share-code"
                value={text}
                rows={4}
                spellCheck={false}
                placeholder="Paste a code or a share link"
                onChange={(event) => {
                  setText(event.target.value);
                  setError("");
                }}
              />
            </label>
            {error ? <p className="manage-note">{error}</p> : null}
            <div className="manage-actions">
              <button type="button" onClick={onClose}>
                Close
              </button>
              <button
                type="button"
                className="manage-save"
                disabled={busy || text.trim() === ""}
                onClick={() => void readCode(text)}
              >
                Preview
              </button>
            </div>
          </>
        ) : (
          <>
            <ul className="import-preview">
              {days.map((day, index) => (
                <li key={`${day.name}-${index}`}>
                  <p className="import-line">{previewLine(day)}</p>
                  {modes[index] === "new" ? null : (
                    <>
                      <p className="import-clash">{day.name} already exists</p>
                      <div className="manage-actions editor-actions">
                        <button
                          type="button"
                          className={modes[index] === "replace" ? "manage-save" : undefined}
                          aria-pressed={modes[index] === "replace"}
                          onClick={() => choose(index, "replace")}
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          className={modes[index] === "add" ? "manage-save" : undefined}
                          aria-pressed={modes[index] === "add"}
                          onClick={() => choose(index, "add")}
                        >
                          Add
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="manage-actions">
              <button
                type="button"
                onClick={() => {
                  setStage("paste");
                  setError("");
                }}
              >
                Back
              </button>
              <button type="button" className="manage-save" disabled={!ready} onClick={commit}>
                Import
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
