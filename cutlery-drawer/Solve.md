# The Cutlery Drawer — Solution

> Spoiler — full walkthrough and flag.

**Flag:** `P2P{The_Standing_Order}`

An easy OSINT challenge: identify the venue from a single image of a distinctive carpet.

## Walkthrough

### 1 — Read the (minimal) prompt

```
God I just can't stand these challenges!
```

The word **"stand"** is a soft hint toward the venue name (*Standing*).

### 2 — Inspect the image

`OSINT.jpeg` at first looks like an abstract pattern, but it is a **carpet** — an ornate
Wetherspoons-style design. (Checking metadata with `exiftool OSINT.jpeg` is a sensible
first move, but the EXIF has been stripped, so the solve is visual.)

### 3 — Recognise the Wetherspoons carpet

Wetherspoons pubs are known for unique, venue-specific carpets. Reverse-image search or
search terms like *"wetherspoons carpet Edinburgh"* / *"Wetherspoons carpet The Standing
Order"* turn the task into venue-matching.

### 4 — Match the venue

The carpet belongs to **The Standing Order, Edinburgh** — which also fits the "stand"
hint in the prompt.

### 5 — Build the flag

Format `P2P{Name_of_place}`, words joined with underscores:

**`P2P{The_Standing_Order}`**
