import { CellView } from "./ExerciseLink";
import type { DataTable as TableData } from "../plan";

export function DataTable({
  table,
  onOpen,
}: {
  table: TableData;
  onOpen: (name: string) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {table.columns.map((column, index) => (
              <th key={column} className={table.align[index] === "end" ? "end" : undefined}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  data-label={table.columns[cellIndex]}
                  className={table.align[cellIndex] === "end" ? "end" : undefined}
                >
                  <CellView cell={cell} onOpen={onOpen} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
