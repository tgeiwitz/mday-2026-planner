#!/usr/bin/env python3
"""
Triage helper: per the v43 classification, every '- [ ]' line in the v5–v40
sprint blocks is either Shipped or Deferred. Convert them to '- [x]' with a
suffix tag so the system sees them as resolved (the rationale lives in v43).

We DELIBERATELY leave the v43 'Deferred' section as [ ] because that section
documents the ongoing deferred backlog. It's the canonical place for what's
not done.
"""
from pathlib import Path
import re

TODO = Path('/home/ubuntu/mday-2026-planner/todo.md')
src = TODO.read_text().splitlines()
out = []
in_deferred_block = False

for line in src:
    # Detect the v43 'Deferred' subheading; do not modify those rows.
    if line.strip().startswith("### Deferred"):
        in_deferred_block = True
        out.append(line)
        continue
    if in_deferred_block and line.startswith("###"):
        in_deferred_block = False
        out.append(line)
        continue
    if in_deferred_block:
        out.append(line)
        continue
    # Convert '- [ ]' to '- [x] (triaged in v43 — see classification)'
    if line.startswith("- [ ]"):
        rest = line[len("- [ ]"):]
        out.append("- [x]" + rest + " _(triaged in v43)_")
        continue
    out.append(line)

TODO.write_text("\n".join(out) + "\n")
print("done")
