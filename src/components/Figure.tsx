import { Fragment } from "react";
import { BACK, BACK_BODY, FRONT, FRONT_BODY } from "../anatomy";
import type { Paint } from "../paint";

export function Figure({
  paint,
  height,
  label = "Muscle map, front and back",
}: {
  paint: Paint;
  height?: number;
  label?: string;
}) {
  const body = (outline: string, shapes: typeof FRONT, dx: number) => (
    <g transform={`translate(${dx} 0)`}>
      <path d={outline} fill="var(--silhouette)" />
      {shapes.map(([group, d], index) => {
        const mark = paint[group];
        return (
          <Fragment key={index}>
            <path
              d={d}
              fill="var(--neutral)"
              stroke="var(--seam)"
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {mark ? (
              <path
                d={d}
                fill={mark.color}
                fillOpacity={mark.opacity}
                stroke="var(--seam)"
                strokeWidth={3}
                strokeLinejoin="round"
              />
            ) : null}
          </Fragment>
        );
      })}
    </g>
  );

  return (
    <svg
      viewBox="185 50 1283 1410"
      role="img"
      aria-label={label}
      style={
        height
          ? { display: "block", height, width: "auto", maxWidth: "100%", margin: "0 auto" }
          : { display: "block", width: "100%", height: "auto" }
      }
    >
      {body(FRONT_BODY, FRONT, 0)}
      {body(BACK_BODY, BACK, 640)}
    </svg>
  );
}
