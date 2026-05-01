import { useEffect, useId, useRef, useState } from "react";
// (useRef kept for wrapper element)
import { Input } from "@/components/ui/input";

export type TypeAheadOption = {
  /** Stable value sent to the server when this row is chosen. */
  value: string;
  /** What the user sees + types. */
  label: string;
};

type TypeAheadProps = {
  /** Currently committed value (option.value). */
  value: string;
  /** All available options. */
  options: TypeAheadOption[];
  /** Called when the user picks/commits an option. Pass "" to clear. */
  onCommit: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** When true, value must match an option (free text is rejected on commit). */
  strict?: boolean;
  /** Disable input (e.g. while a mutation is pending). */
  disabled?: boolean;
  /** Optional clear button label; if provided, shows a "clear" pseudo-row. */
  clearLabel?: string;
};

/**
 * Type-to-edit replacement for shadcn Select. Renders a normal text Input that
 * filters the options as the user types and commits on Enter / blur / option
 * click. Free-text is allowed unless `strict` is true. Keeps keyboard nav
 * (Up/Down/Enter/Escape) and stays a11y-friendly via aria-* attributes.
 */
export function TypeAhead({
  value,
  options,
  onCommit,
  placeholder,
  className,
  strict = false,
  disabled = false,
  clearLabel,
}: TypeAheadProps) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const labelFor = (v: string) =>
    options.find((o) => o.value === v)?.label ?? v ?? "";

  const [text, setText] = useState<string>(labelFor(value));
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // Sync external value -> input text when it changes.
  useEffect(() => {
    setText(labelFor(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, options.length]);

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = (() => {
    const q = text.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options
      .filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      .slice(0, 50);
  })();

  function commit(next: string) {
    if (strict) {
      const match = options.find(
        (o) => o.label.toLowerCase() === next.trim().toLowerCase() || o.value === next
      );
      if (!match) {
        // Restore last valid value
        setText(labelFor(value));
        setOpen(false);
        return;
      }
      setText(match.label);
      onCommit(match.value);
    } else {
      // Loose: prefer option match, otherwise pass the raw text up.
      const match = options.find(
        (o) => o.label.toLowerCase() === next.trim().toLowerCase() || o.value === next
      );
      if (match) {
        setText(match.label);
        onCommit(match.value);
      } else {
        onCommit(next.trim());
      }
    }
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActiveIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Slight delay so option click registers before commit.
          setTimeout(() => {
            if (!wrapRef.current?.contains(document.activeElement)) {
              commit(text);
            }
          }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const opt = filtered[activeIdx];
            if (opt) commit(opt.value);
            else commit(text);
          } else if (e.key === "Escape") {
            setText(labelFor(value));
            setOpen(false);
          }
        }}
      />
      {open && (filtered.length > 0 || clearLabel) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          {clearLabel && (
            <li
              role="option"
              aria-selected={value === ""}
              className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground italic text-muted-foreground"
              onMouseDown={(e) => {
                e.preventDefault();
                setText("");
                onCommit("");
                setOpen(false);
              }}
            >
              {clearLabel}
            </li>
          )}
          {filtered.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={i === activeIdx}
              className={`px-3 py-1.5 text-sm cursor-pointer ${
                i === activeIdx ? "bg-accent text-accent-foreground" : ""
              }`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                // mousedown so it fires before input blur
                e.preventDefault();
                commit(o.value);
              }}
            >
              {o.label}
            </li>
          ))}
          {filtered.length === 0 && !clearLabel && (
            <li className="px-3 py-1.5 text-sm text-muted-foreground">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}
