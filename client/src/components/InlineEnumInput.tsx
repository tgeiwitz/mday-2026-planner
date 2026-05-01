import * as React from "react";

type InlineEnumInputProps = {
  /** Current value of the field. Empty string is allowed and should be treated by the caller. */
  value: string;
  /** Allowed enum values shown as datalist suggestions. Free typing is permitted; caller must validate. */
  options: string[];
  /** Optional secondary suggestions appended after the main options (e.g., free-form drivers list). */
  extraOptions?: string[];
  /** Called once the user commits the value (blur or Enter). The caller decides whether to update. */
  onCommit: (next: string) => void;
  className?: string;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
  /** Optional list of [id,label] pairs when value should be the id but suggestions show labels. */
  labelMap?: Record<string, string>;
};

/**
 * InlineEnumInput — an inline-typeable input with a `<datalist>` autocomplete.
 *
 * Replaces shadcn `<Select>` for cases where keyboard typing must be the primary mode of entry.
 * Caller is responsible for validating the committed value (e.g., enforce enum, parse number).
 *
 * Behavior:
 *   - Renders a plain text `<input>` bound to `value`.
 *   - Shows a `<datalist>` with `options` (and `extraOptions`) for browser-native autocomplete.
 *   - Commits on blur and on Enter; does NOT commit on every keystroke (avoid trpc spam).
 */
export function InlineEnumInput({
  value,
  options,
  extraOptions,
  onCommit,
  className = "",
  placeholder,
  title,
  ariaLabel,
  labelMap,
}: InlineEnumInputProps) {
  const [draft, setDraft] = React.useState<string>(value ?? "");
  const listId = React.useId();

  // If the upstream value changes (e.g. another mutation), keep the input in sync until the user types.
  React.useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  const display = labelMap && labelMap[draft] ? labelMap[draft] : draft;
  const allOptions = [...options, ...(extraOptions ?? [])];

  function commit() {
    if (draft !== (value ?? "")) onCommit(draft);
  }

  return (
    <>
      <input
        list={listId}
        value={display}
        placeholder={placeholder}
        title={title}
        aria-label={ariaLabel}
        onChange={(e) => {
          // If labelMap is set, the user is typing a label; resolve to the id on commit.
          setDraft(e.target.value);
        }}
        onBlur={() => {
          if (labelMap) {
            const inverted = Object.entries(labelMap).find(
              ([, lbl]) => lbl.toLowerCase() === draft.toLowerCase(),
            );
            if (inverted) {
              if (inverted[0] !== value) onCommit(inverted[0]);
              return;
            }
          }
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setDraft(value ?? "");
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={
          "border border-input bg-background rounded-md px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-ring " +
          className
        }
      />
      <datalist id={listId}>
        {allOptions.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </>
  );
}
