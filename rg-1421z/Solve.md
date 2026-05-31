# BIKINI State: RED — Solve

> **Spoiler — author solution.** Excluded from the published site via `_config.yml`.

**Flag:** `P2P{HOLMPTON_THE_HOLE}`

## TL;DR

Apply each post's card-error correction to its GZI flash bearing, plot the three
true bearings on the Group Control workstation, and the fix lands on **RAF
Holmpton** — the Cold War ROTOR radar bunker in East Yorkshire, nicknamed
**"The Hole."** Flag = `P2P{` + site short name + `_` + nickname + `}`.

## Steps

1. **Collect the reports.** From `/rg-1421z/` download the three traffic sheets and
   the brief (`bikini-state-red.txt`). Each report gives a `GZI FLASH BEARING` and a
   signed `GZI CARD ERROR`:

   | Post | Flash bearing | Card error |
   |------|---------------|------------|
   | Tunstall 20/55  | 149.7° | +1.2 |
   | Keyingham 20/56 |  99.0° | +0.8 |
   | Skirlaugh 20/57 | 129.6° | −1.1 |

2. **Convert to true bearings** (apply the card-error correction):
   `true = flash + card error`
   - Tunstall: 149.7 + 1.2 = **150.9°**
   - Keyingham: 99.0 + 0.8 = **99.8°**
   - Skirlaugh: 129.6 − 1.1 = **128.5°**

3. **Plot the fix.** On the Group Control plotting workstation (`/roc-network/`),
   select the three posts and enter their true bearings. The three lines of bearing
   intersect tightly at approximately **53.6833, 0.0666** (spread ≈ 0.22 km).

4. **Identify the site.** That coordinate is **RAF Holmpton** (Holmpton, East Riding
   of Yorkshire) — a 1950s ROTOR underground radar/early-warning bunker, now a
   museum ("Visit the Bunker"). Its nickname is **"The Hole."**

5. **Build the flag:** `P2P{HOLMPTON_THE_HOLE}`.

## Notes for review

- Post coordinates come from the workstation dataset (`/roc-network/roc-data.json`):
  Tunstall 53.7676, −0.0113; Keyingham 53.7013, −0.1019; Skirlaugh 53.8445, −0.2748.
- Skipping the card-error step (entering the raw flash bearings) still lands ~450 m
  from the bunker — unambiguously Holmpton — so the conversion is a precision step,
  not a make-or-break one.
- **Flag wording:** updated from the earlier motto-based form. It is now
  `P2P{SITENAME_NICKNAME}` → `P2P{HOLMPTON_THE_HOLE}` (was `P2P{SITENAME_MOTTO}`).
- **Conversion-reference caveat:** the workstation's "Bearing conversion reference"
  reads `TRUE = MAGNETIC FIELD READING + WEST VARIATION + CARD ERROR`. The reports
  supply only the card error (no west-variation figure), and the data resolves to
  Holmpton when variation is treated as **0** (i.e. `true = flash + card`). If you
  intend a non-zero magnetic variation to be part of the solve, the flash figures or
  the on-page reference need adjusting to stay consistent — worth confirming.
