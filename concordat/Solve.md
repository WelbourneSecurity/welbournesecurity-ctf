# CONCORDAT: Solution

> Spoiler: full walkthrough and flag.

**Flag:** `P2P{ZARVECK_KETROVE_VENTOR}`

Three legs, **WAVERLY** (MI6), **SOLO** (CIA), **KURYAKIN** (KGB), each yield one word
fragment. The operator workstation assembles them into the combined flag. SOLO is
load-bearing: it carries the key that unlocks KURYAKIN.

> On this archive every artefact is listed on the challenge homepage. During the live
> event the legs were discovered through a hidden trail (below).

## Stage 0: Find the way in

The Concordat page reads as an educational tribute; the intercepts are not linked
openly. A hidden anchor on the phrase **"watch schedule"** points to `/ops/sked.txt`
(reveal it by hovering, tabbing to it, or viewing source). That file ends with a
Base64 route group:

```
c2VjdGlvbi1paWk=   ->   section-iii
```

`/section-iii/` then lists the three intercept legs and a pointer to the operator
workstation.

## Stage 1: WAVERLY (MI6, British)

A numbers-station recording (`broadcast.ogg`, English voice) plus `keymat.txt`. Transcribe:

- Indicator group (spoken twice): `00042`
- Eight body groups: `45312 19464 72809 93538 30449 39072 76550 57712`

Indicator `00042` selects **row 042** of the pad:

```
73849 21750 38461 28394 75692 81047 39582 64193
```

Decode with a one-time pad, digit-wise `PT = (CT + PAD) mod 10`:

| CT | PAD | PT |
|----|-----|----|
| 45312 | 73849 | 18151 |
| 19464 | 21750 | 30114 |
| 72809 | 38461 | 00260 |
| 93538 | 28394 | 11822 |
| 30449 | 75692 | 05031 |
| 39072 | 81047 | 10019 |
| 76550 | 39582 | 05032 |
| 57712 | 64193 | 11805 |

Read the result as 2-digit letter codes (`A=01 … Z=26`, `00=space`):

```
18 15 13 01 14 00 26 01 18 22 05 03 11 00 19 05 03 21 18 05
 R  O  M  A  N  _  Z  A  R  V  E  C  K  _  S  E  C  U  R  E
```

Plaintext **`ROMAN ZARVECK SECURE`** → **fragment `ZARVECK`**.

## Stage 2: SOLO (CIA, American)

A CIA Station Rome cable (`cable.html`) with CSS redaction bars. The real text is
Base64 in each span's `data-c` attribute (`user-select: none` defeats text-selection,
so use DevTools / the console):

```js
[...document.querySelectorAll('span.redact')].map(s => atob(s.dataset.c)).join('\n')
```

The **SUBJ-line** redaction is the asset codename → **fragment `KETROVE`**. The other
body redactions are decoys.

Paragraph 6 lists three Cyrillic names (handler line / operation codename / fallback
principal), these are the **candidate keys for KURYAKIN**:

```
ЛЕНИН    СТАЛИН    ХРУЩЕВ
```

## Stage 3: KURYAKIN (KGB, Soviet)

A short Cyrillic ciphertext **`НЙЫЫЬЬ`** (6 letters), the 33-letter Russian alphabet,
and the hint *"period key not recovered locally"* (the key comes from SOLO). This is a
Vigenère cipher: `P[i] = (C[i] − K[i] + 33) mod 33`. Test the three candidate keys;
only **`ЛЕНИН`** yields a legible result:

| C | Н | Й | Ы | Ы | Ь | Ь |
|---|---|---|---|---|---|---|
| K | Л | Е | Н | И | Н | Л |
| P | В | Е | Н | Т | О | Р |

Plaintext **`ВЕНТОР`** → transliterate → **fragment `VENTOR`**.

## Stage 4: Assemble

Enter the three fragments at the operator workstation:

| Leg | Fragment |
|-----|----------|
| WAVERLY | `ZARVECK` |
| SOLO | `KETROVE` |
| KURYAKIN | `VENTOR` |

The workstation assembles and verifies:

**`P2P{ZARVECK_KETROVE_VENTOR}`** ✓

## Pitfalls

- **Missing the hidden entry link**: the page reads as a normal tribute; hover the prose.
- **Wrong KURYAKIN key**: `СТАЛИН` / `ХРУЩЕВ` produce gibberish; only `ЛЕНИН` (from SOLO) decrypts.
- **Cyrillic at the workstation**: the form strips non-`[A-Z0-9]`; submit the *transliterated* `VENTOR`.
- **Text-selecting the redactions**: yields nothing (`user-select: none`); read the `data-c` Base64 via DevTools.
- **WAVERLY with no auto-decoder**: the page gives the pad and a scratch area; the mod-10 maths is the player's to do.
