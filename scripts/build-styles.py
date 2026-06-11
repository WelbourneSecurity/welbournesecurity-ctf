# One-off migration helper: rebuilds styles.css as
#   (main site styles.css) + (challenge-specific rules preserved from the old sheet)
# Challenge-specific = any rule whose selector uses a class/id that the new
# main-site base doesn't define but the CTF pages still use.
import re
import sys
from pathlib import Path

CTF = Path(__file__).resolve().parent.parent
MAIN_CSS = Path(sys.argv[1])

old_css = (CTF / "styles.css").read_text(encoding="utf-8")
main_css = MAIN_CSS.read_text(encoding="utf-8")


def parse_rules(css):
    """Split css into top-level nodes: (kind, selector/prelude, body_text, full_text)."""
    nodes = []
    i = 0
    n = len(css)
    while i < n:
        # skip whitespace
        m = re.match(r"\s+", css[i:])
        if m:
            i += m.end()
            continue
        # comments
        if css.startswith("/*", i):
            end = css.find("*/", i) + 2
            nodes.append(("comment", "", "", css[i:end]))
            i = end
            continue
        # find the opening brace for this prelude
        brace = css.find("{", i)
        semi = css.find(";", i)
        if brace == -1:
            break
        if semi != -1 and semi < brace:  # @import etc.
            nodes.append(("at-statement", css[i:semi + 1], "", css[i:semi + 1]))
            i = semi + 1
            continue
        prelude = css[i:brace].strip()
        depth = 1
        j = brace + 1
        while j < n and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        body = css[brace + 1:j - 1]
        full = css[i:j]
        kind = "at-block" if prelude.startswith("@") else "rule"
        nodes.append((kind, prelude, body, full))
        i = j
    return nodes


def classes_and_ids(text):
    return set(re.findall(r"[.#][A-Za-z_][\w-]*", text))


# 1. Tokens used by CTF pages (static markup + scripts that build DOM).
used = set()
for f in list(CTF.rglob("*.html")) + list(CTF.rglob("*.js")):
    if ".git" in f.parts or f.name == "build-styles.py":
        continue
    text = f.read_text(encoding="utf-8", errors="replace")
    for m in re.findall(r'class="([^"]*)"', text):
        used.update("." + c for c in m.split())
    for m in re.findall(r'id="([^"]*)"', text):
        used.add("#" + m.strip())
    # classes assigned from JS (className = "...", classList.add("..."), dataset tones)
    for m in re.findall(r'(?:className\s*=\s*|classList\.(?:add|toggle|remove)\()\s*["\']([^"\']+)["\']', text):
        used.update("." + c for c in m.split())

# state-modifier classes can pair with anything; never treat them as ownership signals
GENERIC = {".is-active", ".is-collapsed", ".is-visible", ".is-selected", ".is-open",
           ".is-unread", ".is-disabled", ".is-correct", ".is-wrong", ".is-done",
           ".light-mode", ".motion-ready", ".mobile-lite"}

# 2. Tokens the new base defines.
base_defined = set()
for kind, prelude, body, full in parse_rules(main_css):
    if kind == "rule":
        base_defined |= classes_and_ids(prelude)
    elif kind == "at-block":
        for k2, p2, b2, f2 in parse_rules(body):
            if k2 == "rule":
                base_defined |= classes_and_ids(p2)

needed = (used - base_defined) - GENERIC

# 3. Walk the old sheet, keep rules that mention a needed token.
kept = []
kept_text_parts = []


def rule_is_needed(prelude):
    return bool(classes_and_ids(prelude) & needed)


for kind, prelude, body, full in parse_rules(old_css):
    if kind == "rule" and rule_is_needed(prelude):
        kept.append(full)
    elif kind == "at-block":
        at_name = prelude.split()[0] if prelude.split() else prelude
        if at_name == "@media":
            inner = [f2 for k2, p2, b2, f2 in parse_rules(body)
                     if k2 == "rule" and rule_is_needed(p2)]
            if inner:
                kept.append(prelude + " {\n" + "\n\n".join(inner) + "\n}")
        # @keyframes / @font-face handled below

kept_text = "\n\n".join(kept)

# 4. @keyframes referenced by kept rules but not defined in the base.
anims = set(re.findall(r"animation(?:-name)?:\s*([^;]+);", kept_text))
anim_names = set()
for a in anims:
    for tok in a.split(","):
        first = tok.strip().split()
        for w in first:
            if re.fullmatch(r"[A-Za-z_][\w-]*", w) and w not in (
                    "linear", "ease", "infinite", "forwards", "backwards", "both",
                    "alternate", "normal", "reverse", "none", "paused", "running",
                    "ease-in", "ease-out", "ease-in-out", "steps"):
                anim_names.add(w)

base_keyframes = set(re.findall(r"@keyframes\s+([\w-]+)", main_css))
for kind, prelude, body, full in parse_rules(old_css):
    if kind == "at-block" and prelude.startswith("@keyframes"):
        name = prelude.split()[1]
        if name in anim_names and name not in base_keyframes:
            kept.insert(0, full)

# 5. @font-face for families the kept rules use that the base doesn't ship.
base_fonts = set(re.findall(r'@font-face\s*{[^}]*font-family:\s*"([^"]+)"', main_css))
kept_fonts = set()
for m in re.findall(r"font-family:\s*([^;]+);", kept_text):
    for fam in m.split(","):
        kept_fonts.add(fam.strip().strip('"').strip("'"))
for kind, prelude, body, full in parse_rules(old_css):
    if kind == "at-block" and prelude.startswith("@font-face"):
        fam = re.search(r'font-family:\s*"([^"]+)"', body)
        if fam and fam.group(1) in kept_fonts and fam.group(1) not in base_fonts:
            kept.insert(0, full)

addons = "\n\n".join(kept)
out = (
    main_css.rstrip()
    + "\n\n/* ============================================================================\n"
    + "   CTF archive add-ons - challenge-page theming preserved from the previous\n"
    + "   stylesheet (CRT inboxes, dossiers, ROC instruments, archive file cards).\n"
    + "   Everything above this line mirrors the main site's styles.css.\n"
    + "   ============================================================================ */\n\n"
    + addons
    + "\n"
)
(CTF / "styles.css").write_text(out, encoding="utf-8", newline="\n")

# Coverage report: which used tokens are still undefined anywhere?
new_defined = set()
for kind, prelude, body, full in parse_rules(out):
    if kind == "rule":
        new_defined |= classes_and_ids(prelude)
    elif kind == "at-block":
        for k2, p2, b2, f2 in parse_rules(body):
            if k2 == "rule":
                new_defined |= classes_and_ids(p2)

missing = sorted(t for t in (used - new_defined) if t not in GENERIC)
print(f"old sheet rules kept: {len(kept)}")
print(f"needed tokens: {len(needed)}")
print("used-but-unstyled tokens (may be fine - JS hooks etc.):")
for t in missing:
    print("  ", t)
