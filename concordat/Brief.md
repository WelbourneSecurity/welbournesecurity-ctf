# Concordat (Cold War Communications) — Brief

- **Event:** Pwn2Play (2025 lineage; archived)
- **Category:** Cryptography (Hard) · multi-leg
- **Entry point:** `/concordat/`
- **Flag format:** `P2P{...}` (one combined flag assembled from three fragments)

## Prompt

Three intelligence services run parallel watch positions in one week of March 1989
— British SIGINT, American case-handling, and Soviet cryptography. Three intercept
legs each yield a fragment; assemble the fragments at the operator workstation to
recover the single combined flag.

## Pieces

- `/concordat/intercepts/intercept-a/` — British leg (`broadcast.ogg`, `keymat.txt`,
  `station-brief.txt`, `intercept-log.txt`).
- `/concordat/intercepts/intercept-b/` — American leg (`cable.html` / `cable.txt`).
- `/concordat/intercepts/intercept-c/` — Soviet leg (`telegram.txt`, `telegram-brief.txt`).
- `/concordat/operator/` — operator workstation that validates/assembles the
  fragments into the final flag.
