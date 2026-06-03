# BIKINI State: RED, Solution

> Spoiler: full walkthrough and flag.

**Flag:** `P2P{HOLMPTON_THE_HOLE}`

## Overview

An OSINT / web-enumeration / mapping challenge themed on the Royal Observer Corps.
Starting from the public site, find a hidden control panel, download three ROC post
reports, correct the recorded bearings to TRUE bearings, triangulate the location on
the ROC Network workstation, and read off the site's nickname to build the flag.

## Walkthrough

### 1: Enumerate the starting site

The brief hints at a "hidden control panel" on `https://welbournesecurity.com/`. Check
`robots.txt`:

```
https://welbournesecurity.com/robots.txt
```

It discloses `/ops/traffic.txt`.

### 2: Follow the breadcrumb

Open the disclosed file:

```
https://welbournesecurity.com/ops/traffic.txt
```

It contains a Base64 value:

```
cmctMTQyMXo=
```

Decode it:

```bash
echo "cmctMTQyMXo=" | base64 -d   # -> rg-1421z
```

This gives the hidden route: `https://welbournesecurity.com/rg-1421z/`.

### 3: Recover the post reports

The control panel (20 Group York Control inbox) provides three traffic sheets:

```
REPORT_A_TUNSTALL_55.txt
REPORT_B_KEYINGHAM_56.txt
REPORT_C_SKIRLAUGH_57.txt
```

Each contains a **GZI flash bearing** and a **GZI card error**.

### 4: Correct to TRUE bearings

`TRUE bearing = GZI flash bearing + GZI card error`

| Post | Flash | Card error | TRUE bearing |
|------|-------|-----------|--------------|
| Tunstall (20/55)  | 149.6 | +1.2 | **150.8°** |
| Keyingham (20/56) |  98.8 | +0.8 |  **99.6°** |
| Skirlaugh (20/57) | 129.4 | −1.1 | **128.3°** |

### 5: Triangulate

Open the ROC Network plotting workstation, select **Tunstall**, **Keyingham**, and
**Skirlaugh**, and enter the corrected TRUE bearings (150.8 / 99.6 / 128.3). The three
lines of bearing intersect at:

```
53.684069966006874, 0.06750168441000179
```

which is **RAF Holmpton**, the Cold War ROTOR underground radar bunker on the
Holderness coast, East Riding of Yorkshire.

### 6: Build the flag

RAF Holmpton's nickname is **"The Hole."** With format `P2P{NAME_NICKNAME}`:

- `NAME` = `HOLMPTON`
- `NICKNAME` = `THE_HOLE`

**Flag: `P2P{HOLMPTON_THE_HOLE}`**

## Notes

- On the CTF archive the workstation is the ROC Network page (`/roc-network/`) and the
  inbox is `/rg-1421z/`; all task files are listed on the challenge homepage.
- Skipping the card-error correction (plotting the raw flash bearings) still lands
  within a few hundred metres of the bunker, so it remains identifiable, the
  correction is a precision step.
