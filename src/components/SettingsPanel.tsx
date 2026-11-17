import { DAY_KEYS, DAY_LABELS, type DayKey } from "../colors";

export function SettingsPanel({
  colors,
  onChange,
  onReset,
}: {
  colors: Record<DayKey, string>;
  onChange: (key: DayKey, value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="settings" id="colour-settings">
      <p className="settings-note">Day colours are saved on this phone.</p>
      <div className="color-grid">
        {DAY_KEYS.map((key) => (
          <label key={key} className="color-field">
            <input
              type="color"
              value={colors[key]}
              aria-label={`${DAY_LABELS[key]} colour`}
              onChange={(event) => onChange(key, event.target.value)}
            />
            <span>{DAY_LABELS[key]}</span>
          </label>
        ))}
      </div>
      <button type="button" className="btn btn-quiet btn-block" onClick={onReset}>
        Reset to defaults
      </button>
    </div>
  );
}
