import type { ReactNode } from "react";
import { isExercise } from "../format";
import type { Part } from "../plan";

export function ExerciseLink({ name, onOpen }: { name: string; onOpen: (name: string) => void }) {
  if (!isExercise(name)) return <>{name}</>;
  return (
    <button type="button" className="ex-link" onClick={() => onOpen(name)}>
      {name}
    </button>
  );
}

export function RichText({ parts, onOpen }: { parts: Part[]; onOpen: (name: string) => void }) {
  return (
    <>
      {parts.map((part, index) =>
        part.kind === "text" ? (
          <span key={index}>{part.text}</span>
        ) : (
          <ExerciseLink key={`${part.name}-${index}`} name={part.name} onOpen={onOpen} />
        ),
      )}
    </>
  );
}

export function CellView({
  cell,
  onOpen,
}: {
  cell: string | Part[];
  onOpen: (name: string) => void;
}): ReactNode {
  if (typeof cell === "string") return cell;
  return <RichText parts={cell} onOpen={onOpen} />;
}
