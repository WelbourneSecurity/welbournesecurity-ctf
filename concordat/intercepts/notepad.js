// Per-page scratch notepad. Opt in by adding `data-notepad="<key>"` to a
// textarea; values are persisted to localStorage under "concordat-notepad-<key>".
// A sibling [data-notepad-status] node and [data-notepad-clear] button are
// optional. Nothing here renders or touches plaintext flags.

(() => {
  const textareas = document.querySelectorAll("textarea[data-notepad]");
  textareas.forEach((ta) => {
    const key = "concordat-notepad-" + ta.dataset.notepad;
    const status = document.querySelector(
      `[data-notepad-status][data-for="${ta.dataset.notepad}"]`,
    ) || document.querySelector("[data-notepad-status]");
    const clear = document.querySelector(
      `[data-notepad-clear][data-for="${ta.dataset.notepad}"]`,
    ) || document.querySelector("[data-notepad-clear]");

    try {
      const stored = localStorage.getItem(key);
      if (stored != null) ta.value = stored;
    } catch (_) {
      /* private browsing: ignore */
    }

    const defaultStatus = status?.textContent || "";
    const flashStatus = (message) => {
      if (!status) return;
      status.textContent = message;
      status.dataset.state = "saved";
      setTimeout(() => {
        status.textContent = defaultStatus;
        delete status.dataset.state;
      }, 1200);
    };

    let saveTimer = null;
    ta.addEventListener("input", () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(key, ta.value);
          flashStatus("Saved.");
        } catch (_) { /* quota / private mode */ }
      }, 250);
    });

    clear?.addEventListener("click", () => {
      if (!confirm("Clear all notes from this notepad?")) return;
      ta.value = "";
      try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
      flashStatus("Cleared.");
      ta.focus();
    });
  });
})();
