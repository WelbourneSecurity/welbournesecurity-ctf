# Section III — Brief

- **Event:** Pwn2Play: Core Incursion (2026)
- **Category:** SIGINT · Numbers
- **Entry point:** `/section-iii/`
- **Flag format:** `P2P{...}`

## Prompt

A BBC Y-section watch schedule queues traffic into the Section III operations inbox
(Joint Allied / CONCORDAT). Work the queued reports and triangulate the active
station.

## Pieces

- `/section-iii/` — the Section III operations inbox (`noindex`).
- `/ops/sked.txt` — the watch schedule that feeds the inbox queue.
- Cross-links into the `/concordat/` intercept legs.
