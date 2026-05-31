# BIKINI State: RED

| | |
|---|---|
| **Event** | Pwn2Play: Core Incursion (2026) |
| **Category** | Misc · light web enumeration + mapping |
| **Difficulty** | Easy |
| **Author** | T.Λ.R.S |
| **Flag format** | `P2P{NAME_NICKNAME}` |

## Description

> The year is 1975. You are working as part of the Royal Observer Corps, stationed
> deep within the York Group Control bunker.
>
> Outside, the siren's wail has been replaced by a deafening, unnatural silence. You
> have just transitioned to **BIKINI State: RED**. Fifteen feet below the topsoil the
> air is stale and the lights flicker as the first "Flash" report from Skipsea Post
> reaches your desk. The clock reads 1421 Zulu.
>
> Your task is to take the readings — the bearing of the fire and the weight of the
> air — and plot them on the master board. You must use the **TRUE** bearing provided
> by the observers to ensure the strike is fixed with absolute precision.
>
> The volunteers at the surface have seen the light and recorded the pressure. Now it
> is up to you to triangulate the source. Find the coordinate. Map the fallout. Save
> what can be saved.
>
> First step — where did I leave that pesky control panel? Somewhere on
> https://welbournesecurity.com/ I believe 👀

## Objective

Find the hidden control panel from the starting site, recover the Royal Observer Corps
traffic sheets, correct each recorded bearing to a **TRUE** bearing, plot the three
lines of bearing on the ROC Network workstation to fix the target coordinate, then
identify the site and its **nickname** to build the flag.

## Provided files

None at the start. Players are given only the brief and the starting site
(`https://welbournesecurity.com/`); the traffic sheets are recovered through light web
enumeration.
