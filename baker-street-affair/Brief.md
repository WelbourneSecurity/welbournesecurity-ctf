# The Baker Street Affair

| | |
|---|---|
| **Event** | Pwn2Play: Core Incursion (2026) |
| **Category** | Crypto · Stego · Misc |
| **Difficulty** | Medium |
| **Author** | T.Λ.R.S |
| **Flags** | Primary (a place) + Bonus (a verdict) |
| **Flag format** | `P2P{UPPERCASE_WORDS_UNDERSCORED}` |

## Description

> Paris, summer 1908. Two intercepted documents have reached the *Bureau de Lecture* —
> one from the British detective Mr. Sherlock Holmes, one from the gentleman thief
> Arsène Lupin. Their accounts of the same theft disagree.
>
> Both men have written about the affair. The censors at Quai des Orfèvres preferred
> not to put certain things on record.
>
> Your starting point is `https://welbournesecurity.com/`. The case file is hidden
> within the site. Read both documents, reconcile them, recognise the writer's standing
> conventions — and, if you can, determine what the censors didn't want sent.
>
> Two flags. The primary returns a place; the bonus returns a verdict.

## Objective

Recover the **primary** flag from the reconciled cipher across Holmes's case note and
Lupin's letter (one writer keeps a standing convention not stated on the page), and the
**bonus** flag from the Cabinet Noir transcription slip hidden behind the wax seal.

## Provided files

None — everything required is hosted on the site. The primary flag names a Paris
location; the bonus names a Cabinet Noir verdict in French. No flag-format hint is given
on the site itself; both flags use the standard Pwn2Play uppercase / underscored form.
