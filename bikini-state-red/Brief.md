# BIKINI State: RED — Brief

- **Event:** Pwn2Play: Core Incursion (2026)
- **Category:** Miscellaneous
- **Entry point:** `/rg-1421z/` — 20 Group York Control inbox
- **Flag format:** `P2P{SITENAME_NICKNAME}`

## Prompt

Three Royal Observer Corps monitoring-post traffic sheets from a Group 20 (York)
exercise watch — *Raven Glass*, 12 Mar 1989 — have surfaced on an unlinked UKWMO
Group Control workstation. The reporting posts are Tunstall (20/55), Keyingham
(20/56), and Skirlaugh (20/57). Each sheet records a **GZI flash bearing** and a
**GZI card error** correction.

Convert each flash bearing to a true bearing, plot the three lines of bearing on
the Group Control plotting workstation, and identify the site at the resulting
coordinate fix.

## Objective

Submit `P2P{SITENAME_NICKNAME}`, where **SITENAME** is the short name of the site
at the target coordinate and **NICKNAME** is that site's nickname.

## Pieces

- `/rg-1421z/` — the inbox; download the three `reports/REPORT_*.txt` sheets and the
  exercise brief `bikini-state-red.txt`.
- `/roc-network/` — the Group Control plotting workstation (interactive ROC map +
  triangulation calculator).
