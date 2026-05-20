// ── CONCORDAT umbrella workstation ─────────────────────────────────────────
// Three-leg combined-flag self-check. Players solve each leg independently
// (numbers station, redacted cable, Cyrillic Vigenère) and assemble the
// recovered fragments here. Plaintext flags do not appear in this source;
// only the SHA-256 digest of the canonical combined flag.

const EXPECTED_FLAG_HASH = "c3afb0cb75925055425bb29c6506e0ff23de7c6f2b0b0031b0e7b4e593a90ea1";

const form         = document.getElementById("concordat-form");
const inputs       = Array.from(document.querySelectorAll("[data-leg]"));
const preview      = document.querySelector("[data-preview]");
const formError    = document.querySelector("[data-form-error]");
const output       = document.getElementById("concordat-output");
const clearButton  = document.querySelector("[data-form-clear]");

const sha256Hex = async (text) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const normaliseFragment = (raw) =>
  raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

const assemble = () => {
  const parts = inputs.map((el) => normaliseFragment(el.value));
  if (parts.some((p) => !p)) return null;
  return `P2P{${parts.join("_")}}`;
};

const updatePreview = () => {
  const assembled = assemble();
  if (!(preview instanceof HTMLElement)) return;
  preview.textContent = assembled ?? "P2P{…}";
};

const setFormError = (message) => {
  if (!(formError instanceof HTMLElement)) return;
  formError.textContent = message || "";
  formError.dataset.active = message ? "true" : "false";
};

const setOutput = (message, tone = "neutral") => {
  if (!(output instanceof HTMLElement)) return;
  output.dataset.tone = tone;
  const span = document.createElement("span");
  span.textContent = message;
  output.replaceChildren(span);
};

inputs.forEach((input) => {
  input.addEventListener("input", () => {
    updatePreview();
    setFormError("");
  });
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const assembled = assemble();
  if (!assembled) {
    setFormError("Enter all three fragments before verifying.");
    return;
  }
  setFormError("");

  let digest;
  try {
    digest = await sha256Hex(assembled);
  } catch {
    setOutput("Verification unavailable in this browser.", "warn");
    return;
  }

  if (digest === EXPECTED_FLAG_HASH) {
    setOutput(`✓ Combined flag confirmed. Submit ${assembled} to the Pwn2Play scoreboard.`, "ready");
  } else {
    setOutput("× No match. Recheck each leg and try again.", "warn");
  }
});

clearButton?.addEventListener("click", () => {
  inputs.forEach((input) => {
    if (input instanceof HTMLInputElement) input.value = "";
  });
  setFormError("");
  updatePreview();
  setOutput("Awaiting three fragments.");
});

updatePreview();
