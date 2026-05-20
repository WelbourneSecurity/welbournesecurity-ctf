import { initCommandPalette } from "./command-palette.js";
import { initTheme } from "./theme.js";

document.addEventListener("DOMContentLoaded", () => {
  initCommandPalette();
  initTheme();
});
