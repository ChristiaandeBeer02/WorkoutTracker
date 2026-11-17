import { useEffect, useRef } from "react";
import { capitalise, musclesLine, watchUrl } from "../format";
import type { ExerciseInfo } from "../plan";
import type { Paint } from "../paint";
import { Figure } from "./Figure";

export function ExerciseSheet({
  name,
  info,
  paint,
  onClose,
}: {
  name: string;
  info: ExerciseInfo;
  paint: Paint;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <>
      <button type="button" className="backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-title"
      >
        <div className="grab" aria-hidden="true" />
        <div className="sheet-body">
          <h2 id="exercise-title" className="sheet-title">
            {capitalise(name)}
          </h2>
          <div className="figure figure-popup">
            <Figure paint={paint} height={240} label={`${capitalise(name)}, front and back`} />
          </div>
          <p className="muscles-line">{musclesLine(info)}</p>
          <a
            className="btn btn-quiet btn-block"
            href={watchUrl(name)}
            target="_blank"
            rel="noreferrer"
          >
            Watch how
            <span aria-hidden="true"> →</span>
          </a>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-primary btn-block"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
