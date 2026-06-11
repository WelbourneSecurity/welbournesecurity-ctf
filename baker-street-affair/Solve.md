# The Baker Street Affair: Solution

> Spoiler: full walkthrough and flags.

| Flag | Value |
|------|-------|
| **Primary** (a place) | `P2P{LYCEE_JANSON_DE_SAILLY}` |
| **Bonus** (a verdict) | `P2P{LE_TRESOR_DES_ROIS}` |

The primary flag comes from a three-stage cipher chain (Polybius entry → two parallel
ciphers → Vigenère reconciliation). The bonus is an independent PNG-stego tier behind
the wax seal.

> On this archive every file is listed on the challenge homepage. During the live event
> the entry was discovered via `robots.txt` (below).

## Stage 0: Entry (carré de Polybe)

`robots.txt` disallows two paths; the new one is `/cabinet-noir/`. That filing-room page
prints a single line of 17 digit pairs and one cipher hint, the French word **Polybe**
(*"il garde le tableau dans la tête"*):

```
12 11 25 15 42 43 44 42 15 15 44 11 21 21 11 24 42
```

Use the standard 5×5 Polybius square (`I`/`J` share `24`):

```
  1 2 3 4 5
1 A B C D E
2 F G H I/J K
3 L M N O P
4 Q R S T U
5 V W X Y Z
```

Decoding **row-first** (`12` = row 1, col 2 = `B`) yields `BAKERSTREETAFFAIR`
(column-first gives junk, legibility is the confirmation). Segment as the challenge's
own title and mount at the site root:

```
/baker-street-affair/
```

The cover page presents two document cards (Holmes, Lupin) and a wax seal.

## Stage 1: Holmes (Dancing Men)

`/baker-street-affair/holmes/` is a Doyle pastiche encoded in the *Dancing Men* cipher
(Conan Doyle, 1903). Six figures decode, the final figure carries Doyle's
end-of-message flag (not a separate letter):

```
S T R A N D
```

**Fragment H = `STRAND`** (the home of *The Strand Magazine*).

## Stage 2: Lupin (Baconian italics)

`/baker-street-affair/lupin/` is a letter from Lupin. The paragraph acrostic spells
**`DIAMANT`**, a deliberate red herring ("the diamonds were not the issue").

The real payload is one sentence set in a different typeface (IM Fell English vs the
surrounding handwriting, *"the hand is steady; the typesetting is not"*):

```
« Voici six lettres pour vous bel amis. »
```

Each of its 30 letters is italic (`B`) or roman (`A`); the Baconian bit-string decodes
in 5-bit groups to:

```
ABBBB AAAAB BAAAB AABAA BAABA AAAAB  ->  Q B S E T B
```

Lupin signs **"à rebours"** ("I sign in reverse, as always"; the signature is
surname-first). Apply his standing convention, reverse it:

`QBSETB` → **Fragment L = `BTESBQ`**.

## Stage 3: Reconcile (Vigenère)

Both fragments are 6 letters: one is the key, the other the ciphertext. Holmes's note is
written in a *standing* hand (the constant → the key); Lupin's, read in his manner, is
what the key opens. So **key = `STRAND`**, **ciphertext = `BTESBQ`**:

`P[i] = (C[i] − K[i] + 26) mod 26` →

```
B T E S B Q
S T R A N D
─────────────
J A N S O N
```

`JANSON` names the **Lycée Janson-de-Sailly** (106 rue de la Pompe, Paris XVIᵉ), the
school Isidore Beautrelet attends in Leblanc's *L'Aiguille creuse*, the "young man" of
Lupin's letter. Wrapped in house format:

**Primary flag: `P2P{LYCEE_JANSON_DE_SAILLY}`** (ASCII-only; hyphen → underscore).

## Stage 4: The wax seal (bonus)

The cover's seal is downloadable: `/baker-street-affair/src/seal.png` ("not for
ornament"). It is a normal PNG with an extra `tEXt` chunk (keyword `Slip`), extract it
with any metadata reader:

```bash
exiftool seal.png | grep -i slip     # or: strings seal.png | grep -i CABINET
```

The slip is a Cabinet Noir transcription: the diadem theft was a decoy ("le théâtre pour
Holmes"); the real target was **LE TRÉSOR DES ROIS**, the kings' treasure hidden in the
*Aiguille creuse* at Étretat.

**Bonus flag: `P2P{LE_TRESOR_DES_ROIS}`**

## Summary

| Stage | Recovered | Flag |
|-------|-----------|------|
| 0 | `robots.txt` → `/cabinet-noir/` → Polybius → `baker-street-affair` | (entry) |
| 1 | Dancing Men → `STRAND` | Fragment H |
| 2 | Baconian italics → `QBSETB` → reverse → `BTESBQ` | Fragment L |
| 3 | Vigenère(key `STRAND`) → `JANSON` → Lycée Janson-de-Sailly | `P2P{LYCEE_JANSON_DE_SAILLY}` |
| 4 | `seal.png` `tEXt` chunk → verdict | `P2P{LE_TRESOR_DES_ROIS}` |

## Pitfalls

- **Base64-ing the Polybius digits**: the only cipher hint is the word *Polybe*; no grid is printed.
- **Column-first vs row-first**: column-first is junk; row-first reads as English.
- **Falling for the `DIAMANT` acrostic**: the diadem is a decoy; the payload is the typeset blockquote.
- **Counting italics in the handwriting font**: only the IM Fell English sentence carries the Baconian bits.
- **Forgetting the "à rebours" reversal**: un-reversed `QBSETB` Vigenères to gibberish.
- **Stopping at `JANSON`**: trace Lupin's unnamed "young man" (Beautrelet) to his lycée.
- **Treating `seal.png` as a plain image**: inspect its bytes/metadata for the `tEXt` slip.
