const commandItems = [
  { label: "Home", detail: "Portfolio overview", href: "/" },
  { label: "Projects", detail: "RFIDemon and ROC network project work", href: "/projects/" },
  { label: "Writeups", detail: "Hack The Box and TryHackMe archive", href: "/writeups/" },
  { label: "Tools", detail: "Local browser security workbench", href: "/tools/" },
  { label: "About", detail: "Methodology, ethics, and focus", href: "/about/" },
  { label: "Credentials", detail: "Credential details and verification links", href: "/credentials/" },
  { label: "Contact", detail: "Collaboration and hiring contact", href: "/#contact" },
  { label: "RFIDemon", detail: "Raspberry Pi RFID analysis and cloning workstation", href: "/projects/#rfidemon" },
  { label: "ROC Network", detail: "Royal Observer Corps interactive project", href: "/projects/roc-network/" },
  { label: "Password Generator", detail: "Generate and score local passwords", href: "/tools/#tool-password" },
  { label: "IOC Extractor", detail: "Extract, defang, and refang indicators", href: "/tools/#tool-ioc" },
  { label: "JWT Decoder", detail: "Decode token headers and claims locally", href: "/tools/#tool-jwt" },
  { label: "Hash Verifier", detail: "Hash text and compare digests", href: "/tools/#tool-hash" },
  { label: "CIDR Converter", detail: "Map IPv4 CIDR ranges", href: "/tools/#tool-subnet" },
  { label: "Regex Tester", detail: "Test patterns and capture groups", href: "/tools/#tool-regex" }
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
  input.placeholder = "Search pages, projects, and tools...";
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
      empty.textContent = "No matching pages or tools.";
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
