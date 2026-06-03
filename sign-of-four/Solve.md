# The Sign of Four, Solution

> Spoiler, full walkthrough and flags.

| Part | Flag |
|------|------|
| I, robots.txt | `P2P{St0p_L00K1nG_W31Rdo}` |
| II, browser console | `P2P{y0u_f0und_th3_c0ns0le}` |
| III, terminal command chaining | `P2P{cmd_1nj3ct10n_ftw}` |
| IV, JavaScript XOR | `P2P{gh0st_1n_th3_c1rcu1t}` |

Four flags hidden in four layers of the site, solvable entirely through manual browsing
and source inspection. There is no fixed order.

## Part I, robots.txt

Basic enumeration. Visit `/robots.txt` on the challenge site; the first flag is in the
file:

```
P2P{St0p_L00K1nG_W31Rdo}
```

## Part II, browser console

Open DevTools (`F12` / `Ctrl+Shift+I`) → **Console**. The second flag is printed to the
console on load:

```
P2P{y0u_f0und_th3_c0ns0le}
```

## Part III, terminal command chaining

The hero section has a terminal-style component that passes input to a command without
safely restricting it, allowing command chaining with a shell separator:

```bash
ls && cat flag.txt
```

```
P2P{cmd_1nj3ct10n_ftw}
```

## Part IV, JavaScript XOR

In **DevTools → Sources → `main.js`** there is a "phase calibration" block:

```javascript
const _pcS = [0x12,0x70,0x12,0x39,0x25,0x2a,0x72,0x31,0x36,0x1d,0x73,0x2c,
              0x1d,0x36,0x2a,0x71,0x1d,0x21,0x73,0x30,0x21,0x37,0x73,0x36,0x3f];
const _pcK = 0x42;
```

XOR each byte of `_pcS` with the key `_pcK`:

```python
data = [0x12,0x70,0x12,0x39,0x25,0x2a,0x72,0x31,0x36,0x1d,0x73,0x2c,
        0x1d,0x36,0x2a,0x71,0x1d,0x21,0x73,0x30,0x21,0x37,0x73,0x36,0x3f]
print(''.join(chr(b ^ 0x42) for b in data))
```

```
P2P{gh0st_1n_th3_c1rcu1t}
```

## Final answers

```
I    P2P{St0p_L00K1nG_W31Rdo}
II   P2P{y0u_f0und_th3_c0ns0le}
III  P2P{cmd_1nj3ct10n_ftw}
IV   P2P{gh0st_1n_th3_c1rcu1t}
```
