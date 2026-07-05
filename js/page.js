import { initCommandPalette } from "./command-palette.js";
import { initTheme } from "./theme.js";
import { initHeroDither } from "./hero-dither.js";

document.addEventListener("DOMContentLoaded", () => {
  initCommandPalette();
  initTheme();
  initHeroDither();
});
