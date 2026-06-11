// CTF-archive flavour of the main site's palette: local hrefs point at
// challenges on this subdomain, everything else goes to welbournesecurity.com.
const commandItems = [
  { label: "CTF Archive", detail: "Playable challenges from past events", href: "/" },
  { label: "The Cutlery Drawer", detail: "OSINT: hidden in plain sight across open sources", href: "/cutlery-drawer/" },
  { label: "BIKINI State: RED", detail: "Royal Observer Corps bearings and the Group Control workstation", href: "/bikini-state-red/" },
  { label: "CONCORDAT", detail: "Three Cold War intercepts, three services, one combined flag", href: "/concordat/" },
  { label: "The Baker Street Affair", detail: "Belle Epoque crypto and stego: Holmes versus Lupin", href: "/baker-street-affair/" },
  { label: "The Sign of Four", detail: "Four-part web exploitation series", href: "/sign-of-four/" },
  { label: "ROC Network", detail: "Royal Observer Corps interactive companion", href: "/roc-network/" },
  { label: "Main site", detail: "Welbourne Security portfolio overview", href: "https://welbournesecurity.com/" },
  { label: "Projects", detail: "RFIDemon, Pwn2Play, and project work", href: "https://welbournesecurity.com/projects/" },
  { label: "Writeups", detail: "CTF, Hack The Box, and TryHackMe archive", href: "https://welbournesecurity.com/writeups/" },
  { label: "Blue Team", detail: "Defensive knowledge base: Splunk, PowerShell, DFIR, IR", href: "https://welbournesecurity.com/blue-team/" },
  { label: "About", detail: "Methodology, ethics, and focus", href: "https://welbournesecurity.com/about/" },
  { label: "Credentials", detail: "Credential details and verification links", href: "https://welbournesecurity.com/credentials/" },
  { label: "Contact", detail: "Collaboration and hiring contact", href: "https://welbournesecurity.com/#contact" },
  { label: "Email me", detail: "info@welbournesecurity.com - collaboration and hiring", href: "mailto:info@welbournesecurity.com" }
];

const normalizeQuery = (value) => value.trim().toLowerCase();

const matchesItem = (item, query) => {
  if (!query) return true;
  return `${item.label} ${item.detail}`.toLowerCase().includes(query);
};

export function initCommandPalette() {
  if (document.getElementById("command-palette")) return;

  const headerActions = document.querySelector(".header-actions");
  const themeToggle = document.getElementById("theme-toggle");

  const trigger = document.createElement("button");
  trigger.className = "command-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-controls", "command-palette");
  trigger.innerHTML = "<span>Search</span><kbd>Ctrl K</kbd>";

  if (headerActions instanceof HTMLElement) {
    headerActions.insertBefore(trigger, themeToggle || null);
  }

  const palette = document.createElement("div");
  palette.className = "command-palette";
  palette.id = "command-palette";
  palette.role = "dialog";
  palette.setAttribute("aria-modal", "true");
  palette.setAttribute("aria-label", "Site search");
  palette.hidden = true;

  const panel = document.createElement("div");
  panel.className = "command-panel";

  const input = document.createElement("input");
  input.className = "command-input";
  input.type = "search";
  input.placeholder = "Search pages, projects, and the knowledge base...";
  input.setAttribute("aria-label", "Search site");

  const list = document.createElement("div");
  list.className = "command-results";
  list.role = "listbox";

  panel.append(input, list);
  palette.append(panel);
  document.body.append(palette);

  const close = () => {
    palette.hidden = true;
    document.body.classList.remove("command-open");
    trigger.focus({ preventScroll: true });
  };

  const open = () => {
    palette.hidden = false;
    document.body.classList.add("command-open");
    input.value = "";
    render("");
    window.requestAnimationFrame(() => input.focus());
  };

  const activate = (href) => {
    window.location.href = href;
  };

  const render = (query) => {
    const filtered = commandItems.filter((item) => matchesItem(item, query)).slice(0, 8);
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "command-empty";
      empty.textContent = "No matching pages or entries.";
      list.replaceChildren(empty);
      return;
    }

    const buttons = filtered.map((item, index) => {
      const button = document.createElement("button");
      button.className = "command-item";
      button.type = "button";
      button.role = "option";
      button.tabIndex = index === 0 ? 0 : -1;
      button.innerHTML = `<strong>${item.label}</strong><span>${item.detail}</span>`;
      button.addEventListener("click", () => activate(item.href));
      return button;
    });

    list.replaceChildren(...buttons);
  };

  trigger.addEventListener("click", open);
  input.addEventListener("input", () => render(normalizeQuery(input.value)));

  palette.addEventListener("click", (event) => {
    if (event.target === palette) close();
  });

  palette.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    const items = Array.from(list.querySelectorAll(".command-item"));
    if (!items.length) return;
    const currentIndex = items.findIndex((item) => item === document.activeElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex =
        event.key === "ArrowDown"
          ? (Math.max(currentIndex, 0) + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
      items.forEach((item, index) => { item.tabIndex = index === nextIndex ? 0 : -1; });
      items[nextIndex].focus();
      return;
    }

    if (event.key === "Enter" && document.activeElement?.classList.contains("command-item")) {
      event.preventDefault();
      document.activeElement.click();
    }
  });

  document.addEventListener("keydown", (event) => {
    const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
    if (!isShortcut) return;
    event.preventDefault();
    palette.hidden ? open() : close();
  });
}
