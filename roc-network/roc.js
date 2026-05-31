const mapBounds = {
  west: -10.476361,
  east: 1.765083,
  north: 60.846142,
  south: 49.1626,
  width: 628.09174,
  height: 1051.4788
};

const mapOverlayOffset = {
  x: 0,
  y: 32
};

// Sectors used by the UKWMO from the 1973 reorganisation onward.
// Source: ringbell.co.uk/ukwmo/Page222.htm and Wikipedia "List of ROC Group
// Headquarters and UKWMO Sector controls".
// The five UK sectors each contained five Group Controls; Northern Ireland
// (Group 31) was administratively part of the Western Sector.
// There was no distinct "Eastern" sector — that role was filled by the
// Midland Sector (HQ at Lincoln, Group 15).
const sectors = [
  { id: "metropolitan", name: "Metropolitan Sector" },
  { id: "midland",      name: "Midland Sector" },
  { id: "southern",     name: "Southern Sector" },
  { id: "western",      name: "Western Sector" },
  { id: "caledonian",   name: "Caledonian Sector" }
];

let groupControls = [];

// Cluster topology for all UKWMO groups. Group 20 (York) is fully documented
// from the March 1989 ringbell.co.uk map (https://www.ringbell.co.uk/ukwmo/Page221.htm).
// All other groups carry representative 3-post clusters reflecting the
// standard ROC reporting topology: each cluster has one VHF-radio master post
// and two or three satellite posts on landlines.
let clusters = [];

let monitoringPosts = [];

// Derived structures — populated by buildIndices() once roc-data.json
// has been fetched. Listed here as `let` so module-scope readers find
// the same name even before data lands (renderers guard on state.viewId
// and array contents, so an empty initial value is safe).
let clustersByGroup, originalPostById, postById, postClusterById;
let clusterById, masterPostIds;
let allSites = [];
let numberedPosts = [];
let groupsBySector = [];


// Monitoring posts: 343 verified-coord entries (SubBrit / archived ROC index
// / Group 20 worked example) plus ~1,310 entries imported from the public
// Wikipedia post lists via tmp/fetch_roc_posts.py (OS Grid -> WGS84).
//
// Wikipedia entries have an accurate position but:
//   1. no UKWMO post number — Wikipedia doesn't publish them
//   2. no documented Group assignment — assigned to the geographically nearest
//      Group Control (right for most posts, off at sector boundaries). A real
//      county -> Group mapping would need ringbell.co.uk's Group cluster maps,
//      which are PDFs/images and require manual transcription.
//   3. no cluster topology — same source constraint. Imports render as loose
//      dots in the Group view; the 200 pre-existing clusters (Group 20 fully
//      documented; representative 3-post clusters elsewhere) are preserved.

const state = {
  controls: true,
  posts: true,
  selectedId: "g20",
  viewId: "group:20"
};

const svg = document.getElementById("roc-map");
const pointLayer = document.getElementById("roc-point-layer");
const linkLayer = document.getElementById("roc-link-layer");
const selectedPanel = document.getElementById("roc-selected");
const toggles = Array.from(document.querySelectorAll("[data-layer-toggle]"));
// This public page is the educational tribute only; it contains no challenge
// data, no flag digests, and no flag payloads. Flag handling for the
// Bikini State: RED challenge is done on the Pwn2Play scoreboard.
const calculatorForm = document.getElementById("roc-calculator");
const reportRows = Array.from(document.querySelectorAll("[data-report-row]"));
const calculatorOutput = document.getElementById("roc-calc-output");
const clearCalculatorButton = document.querySelector("[data-calc-clear]");
const calculatorFormError = document.querySelector("[data-calc-error]");
const sectorChipContainer = document.querySelector("[data-sector-chips]");
const groupChipContainer = document.querySelector("[data-group-chips]");
const allViewButton = document.querySelector("[data-view='all']");

// MapSVG's united-kingdom.svg is drawn in Mercator. X scales linearly in
// longitude; Y must use the Mercator stretch so points at high latitudes
// (Scotland) and low latitudes (south coast) line up with the SVG paths.
// Equirectangular Y was wrong everywhere except the middle of the lat range.
const mercatorY = (latDeg) =>
  Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI / 180) / 2));
const _yMercTop = mercatorY(mapBounds.north);
const _yMercBot = mercatorY(mapBounds.south);

const project = ({ lat, lon }) => ({
  x: ((lon - mapBounds.west) / (mapBounds.east - mapBounds.west)) * mapBounds.width + mapOverlayOffset.x,
  y: ((_yMercTop - mercatorY(lat)) / (_yMercTop - _yMercBot)) * mapBounds.height + mapOverlayOffset.y
});

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Touch-first devices need bigger hit targets; coarse-pointer matches phones,
// tablets and stylus-only setups. Re-evaluated on resize so an unplugged mouse
// (or rotation that triggers different media queries) is picked up.
let isTouch = window.matchMedia?.("(hover: none), (pointer: coarse)").matches ?? false;
window.matchMedia?.("(hover: none), (pointer: coarse)").addEventListener?.("change", (e) => {
  isTouch = e.matches;
});

const createSvgElement = (tag, attributes = {}) => {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });
  return element;
};

// Sector tints sit at the bottom of the overlay stack so they read as
// background regions, not foreground annotations.
const sectorLayer = createSvgElement("g", { "aria-hidden": "true", class: "roc-sector-layer" });
svg?.insertBefore(sectorLayer, pointLayer);

const clusterLayer = createSvgElement("g", { "aria-hidden": "true", class: "roc-cluster-layer" });
svg?.insertBefore(clusterLayer, pointLayer);

const fixLayer = createSvgElement("g", { "aria-hidden": "true", class: "roc-fix-layer" });
svg?.insertBefore(fixLayer, pointLayer);

// Sector overlays are pre-baked from real county / council-area boundaries
// (see tmp/build_sector_paths.py). Loaded once at module init; classes are
// toggled live to indicate the active sector.
const loadSectorOverlay = async () => {
  try {
    const res = await fetch("./uk-sectors.svg", { cache: "force-cache" });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const overlay = doc.getElementById("roc-sector-overlay");
    if (!overlay) throw new Error("missing #roc-sector-overlay group");
    // Move every <path> child into our existing sectorLayer so existing CSS
    // sector-colour classes pick them up immediately.
    Array.from(overlay.children).forEach((child) => {
      sectorLayer.appendChild(document.importNode(child, true));
    });
    setSectorActive(activeSectorForView());
  } catch (err) {
    console.warn("[ROC] sector overlay load failed:", err);
  }
};

const setSectorActive = (sectorId) => {
  Array.from(sectorLayer.children).forEach((el) => {
    if (!(el instanceof Element)) return;
    el.classList.remove("is-active", "is-dim");
    if (!sectorId) return;
    if (el.getAttribute("id") === sectorId || el.classList.contains(`roc-sector-${sectorId}`)) {
      el.classList.add("is-active");
    } else {
      el.classList.add("is-dim");
    }
  });
};

const toRadians = (value) => (value * Math.PI) / 180;

const toLocalPoint = (site, origin) => {
  const latKm = 110.574;
  const lonKm = 111.32 * Math.cos(toRadians(origin.lat));
  return {
    x: (site.lon - origin.lon) * lonKm,
    y: (site.lat - origin.lat) * latKm
  };
};

const fromLocalPoint = (point, origin) => {
  const latKm = 110.574;
  const lonKm = 111.32 * Math.cos(toRadians(origin.lat));
  return {
    lat: origin.lat + point.y / latKm,
    lon: origin.lon + point.x / lonKm
  };
};

const lineIntersection = (first, second, origin) => {
  const firstPoint = toLocalPoint(first.site, origin);
  const secondPoint = toLocalPoint(second.site, origin);
  const firstBearing = toRadians(first.bearing);
  const secondBearing = toRadians(second.bearing);
  const firstVector = { x: Math.sin(firstBearing), y: Math.cos(firstBearing) };
  const secondVector = { x: Math.sin(secondBearing), y: Math.cos(secondBearing) };
  const cross = firstVector.x * secondVector.y - firstVector.y * secondVector.x;
  if (Math.abs(cross) < 0.0001) return null;

  const delta = { x: secondPoint.x - firstPoint.x, y: secondPoint.y - firstPoint.y };
  const t = (delta.x * secondVector.y - delta.y * secondVector.x) / cross;
  return {
    x: firstPoint.x + firstVector.x * t,
    y: firstPoint.y + firstVector.y * t
  };
};

const calculateFix = (reports) => {
  const origin = {
    lat: reports.reduce((total, report) => total + report.site.lat, 0) / reports.length,
    lon: reports.reduce((total, report) => total + report.site.lon, 0) / reports.length
  };
  const intersections = [];

  reports.forEach((first, firstIndex) => {
    reports.slice(firstIndex + 1).forEach((second) => {
      const point = lineIntersection(first, second, origin);
      if (point) intersections.push({ point, pair: `${first.site.number}/${second.site.number}` });
    });
  });

  if (intersections.length < 2) return null;

  const mean = intersections.reduce(
    (total, intersection) => ({
      x: total.x + intersection.point.x / intersections.length,
      y: total.y + intersection.point.y / intersections.length
    }),
    { x: 0, y: 0 }
  );
  const fix = fromLocalPoint(mean, origin);
  const spread = intersections.reduce((largest, intersection) => {
    const distance = Math.hypot(intersection.point.x - mean.x, intersection.point.y - mean.y);
    return Math.max(largest, distance);
  }, 0);

  return { fix, intersections, spread, origin };
};

// ── Fix marker helpers ────────────────────────────────────────────────────────

const clearFixMarker = () => {
  while (fixLayer.firstChild) fixLayer.firstChild.remove();
};

const renderFixMarker = (result) => {
  clearFixMarker();
  if (!result) return;

  const { fix, intersections, spread, origin } = result;
  const center = project({ lat: fix.lat, lon: fix.lon });

  const midLat = (mapBounds.north + mapBounds.south) / 2;
  const lonKmPerDeg = 111.32 * Math.cos(midLat * Math.PI / 180);
  const pxPerKm = mapBounds.width / ((mapBounds.east - mapBounds.west) * lonKmPerDeg);
  const spreadPx = Math.max(5, spread * pxPerKm);

  fixLayer.append(createSvgElement("circle", {
    cx: center.x.toFixed(2), cy: center.y.toFixed(2),
    r: spreadPx.toFixed(2),
    class: "roc-fix-spread"
  }));

  intersections.forEach(({ point }) => {
    const pt = project(fromLocalPoint(point, origin));
    fixLayer.append(createSvgElement("line", {
      x1: pt.x.toFixed(2), y1: pt.y.toFixed(2),
      x2: center.x.toFixed(2), y2: center.y.toFixed(2),
      class: "roc-fix-pair-line"
    }));
    fixLayer.append(createSvgElement("circle", {
      cx: pt.x.toFixed(2), cy: pt.y.toFixed(2),
      r: "2.5",
      class: "roc-fix-pair"
    }));
  });

  const arm = 9;
  fixLayer.append(createSvgElement("line", {
    x1: (center.x - arm).toFixed(2), y1: center.y.toFixed(2),
    x2: (center.x + arm).toFixed(2), y2: center.y.toFixed(2),
    class: "roc-fix-crosshair"
  }));
  fixLayer.append(createSvgElement("line", {
    x1: center.x.toFixed(2), y1: (center.y - arm).toFixed(2),
    x2: center.x.toFixed(2), y2: (center.y + arm).toFixed(2),
    class: "roc-fix-crosshair"
  }));

  // Single-shot pulse on the fix layer so the operator's eye is drawn to the
  // newly-rendered crosshair. Class auto-removed after one keyframe cycle.
  // Skipped automatically by CSS when prefers-reduced-motion: reduce is on.
  fixLayer.classList.remove("roc-fix-pulse");
  // Force reflow so removing/adding the class actually re-triggers the
  // animation when the operator runs a second calculation in the same view.
  void fixLayer.getBoundingClientRect();
  fixLayer.classList.add("roc-fix-pulse");
};

const animateOutputRows = (container) => {
  // Reduced-motion users get the result instantly with no fade-in.
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const rows = Array.from(container.children);
  rows.forEach((row, i) => {
    if (!(row instanceof HTMLElement)) return;
    row.style.opacity = "0";
    row.style.transform = "translateY(4px)";
    row.style.transition = "opacity 0.18s ease, transform 0.18s ease";
    window.setTimeout(() => {
      row.style.opacity = "1";
      row.style.transform = "translateY(0)";
    }, (i + 1) * 110);
  });
};

const clearChildren = (node) => {
  if (!node) return;
  while (node.firstChild) node.firstChild.remove();
};

// ── View bounds (sectors / groups / all UK) ───────────────────────────────────

const fitBoundsToSites = (sites, paddingFactor = 0.18) => {
  if (!sites.length) {
    return { x: 0, y: 0, width: mapBounds.width, height: mapBounds.height };
  }
  const points = sites.map(project);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const targetRatio = mapBounds.width / mapBounds.height;
  let width = w * (1 + paddingFactor * 2);
  let height = h * (1 + paddingFactor * 2);
  if (width / height < targetRatio) width = height * targetRatio;
  else height = width / targetRatio;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let x = clamp(cx - width / 2, 0, Math.max(0, mapBounds.width - width));
  let y = clamp(cy - height / 2, 0, Math.max(0, mapBounds.height - height));
  if (width > mapBounds.width) { width = mapBounds.width; x = 0; }
  if (height > mapBounds.height) { height = mapBounds.height; y = 0; }
  return { x, y, width, height };
};

const computeViewBox = (viewId) => {
  if (viewId === "all") {
    return { x: 0, y: 0, width: mapBounds.width, height: mapBounds.height };
  }
  if (viewId.startsWith("sector:")) {
    const sectorId = viewId.slice(7);
    const groupsInSector = groupControls.filter((g) => g.sector === sectorId);
    const postsInSector = monitoringPosts.filter((p) =>
      groupsInSector.some((g) => g.group === p.group)
    );
    return fitBoundsToSites([...groupsInSector, ...postsInSector], 0.22);
  }
  if (viewId.startsWith("group:")) {
    const groupNum = viewId.slice(6);
    const ctrl = groupControls.find((g) => g.group === groupNum);
    const postsInGroup = monitoringPosts.filter((p) => p.group === groupNum);
    const sites = ctrl ? [ctrl, ...postsInGroup] : postsInGroup;
    return fitBoundsToSites(sites, 0.18);
  }
  return { x: 0, y: 0, width: mapBounds.width, height: mapBounds.height };
};

// ── Map rendering ─────────────────────────────────────────────────────────────

const renderLinks = () => {
  clearChildren(linkLayer);
  if (!state.viewId.startsWith("group:")) return;
  const groupNum = state.viewId.slice(6);
  const control = groupControls.find((g) => g.group === groupNum);
  if (!control) return;

  monitoringPosts
    .filter((p) => p.group === groupNum && masterPostIds.has(p.id))
    .forEach((post) => {
      const start = project(post);
      const end = project(control);
      linkLayer.append(
        createSvgElement("line", {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          class: "roc-link",
          "vector-effect": "non-scaling-stroke"
        })
      );
    });
};

// Determine which sector should appear "active" (highlighted) for the
// current view. Returns the sector id or null.
const activeSectorForView = () => {
  if (state.viewId.startsWith("sector:")) return state.viewId.slice(7);
  if (state.viewId.startsWith("group:")) {
    const ctrl = groupControls.find((g) => g.group === state.viewId.slice(6));
    return ctrl?.sector ?? null;
  }
  return null;
};

// Sector polygons are loaded once via loadSectorOverlay(); render() only needs
// to update which one is active.
const renderSectors = () => {
  setSectorActive(activeSectorForView());
};

const renderClusters = () => {
  clearChildren(clusterLayer);
  if (!state.viewId.startsWith("group:")) return;

  const groupNum = state.viewId.slice(6);
  const groupClusters = clusters.filter((c) => c.group === groupNum);

  groupClusters.forEach((cluster) => {
    const members = cluster.memberIds
      .map((id) => monitoringPosts.find((p) => p.id === id))
      .filter(Boolean);
    if (members.length < 2) return;

    if (members.length === 2) {
      const [a, b] = members.map(project);
      clusterLayer.append(createSvgElement("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: "roc-cluster-line",
        "vector-effect": "non-scaling-stroke"
      }));
      return;
    }

    const points = members.map(project).map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    clusterLayer.append(createSvgElement("polygon", {
      points,
      class: "roc-cluster-line",
      "vector-effect": "non-scaling-stroke"
    }));
  });
};

const renderPoints = () => {
  clearChildren(pointLayer);

  // Compute dot radius so dots stay a fixed physical pixel size at every zoom
  // level. We derive how many SVG user units equal 1 screen pixel from the
  // current viewBox width and the rendered SVG element width.
  const vbWidth = computeViewBox(state.viewId).width;
  const svgPxWidth = (svg instanceof SVGSVGElement ? svg.getBoundingClientRect().width : 0) || 600;
  const unitsPerPx = vbWidth / svgPxWidth;

  // Target physical sizes (screen pixels).
  const R = {
    control: 6.5 * unitsPerPx,
    master:  5.0 * unitsPerPx,
    post:    3.8 * unitsPerPx
  };

  // Posts render in every view; the sidebar toggle hides them via CSS
  // (.roc-map.hide-posts). Filter by what's relevant to the current view.
  const inGroupView = state.viewId.startsWith("group:");
  const inSectorView = state.viewId.startsWith("sector:");
  const groupNum = inGroupView ? state.viewId.slice(6) : null;
  const sectorGroupNums = inSectorView
    ? new Set(groupControls.filter((g) => g.sector === state.viewId.slice(7)).map((g) => g.group))
    : null;

  // Tighten post hit pads when zoomed out so 600 dots don't form one giant
  // overlapping click target. Group view keeps the comfortable target.
  const minHitPx = isTouch
    ? (inGroupView ? 28 : 12)
    : (inGroupView ? 14 : 8);

  // Build into a fragment, then attach once. Avoids 600+ live-tree mutations
  // (each of which forces SVG layout work) when re-rendering all-UK view.
  const fragment = document.createDocumentFragment();

  allSites.forEach((site) => {
    if (site.type === "post") {
      if (inGroupView && site.group !== groupNum) return;
      if (inSectorView && !sectorGroupNums.has(site.group)) return;
    }

    const point = project(site);
    const isCtrl   = site.type === "control";
    const isMaster = !isCtrl && site.isMaster;
    let roleClass = `roc-point-${site.type}`;
    if (isMaster) roleClass += " roc-point-master";
    const role = isCtrl ? "Group Control" : isMaster ? "Cluster master post" : "Monitoring post";

    const button = createSvgElement("g", {
      class: `roc-point ${roleClass}${state.selectedId === site.id ? " is-selected" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": `${site.name}, ${role}`,
      "data-site-id": site.id,
      transform: `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`
    });

    const baseR  = isCtrl ? R.control : isMaster ? R.master : R.post;
    const radius = baseR.toFixed(2);

    // Centred square hit target. Was previously asymmetric (extended ~3× to
    // the right to cover the label) which made dead-on dot clicks register
    // as clicks on the right-hand neighbour. The label is no longer part of
    // the hit area; clicking the dot itself is now precise.
    // Touch devices get a larger pad so finger taps reliably hit the dot.
    const hitSize = Math.max(parseFloat(radius) * 2 + 8, minHitPx * unitsPerPx);

    button.append(createSvgElement("rect", {
      class: "roc-point-hit",
      x: -hitSize / 2, y: -hitSize / 2,
      width: hitSize, height: hitSize
    }));
    button.append(createSvgElement("circle", { r: radius }));

    // Number labels are unreadable when zoomed out and add ~600 text nodes
    // to the all-UK / sector views — skip them outside group view to keep
    // viewBox tweens smooth.
    const wantLabel = isCtrl || (site.number && inGroupView);
    if (wantLabel) {
      const label = createSvgElement("text", {
        x: (parseFloat(radius) + 2.2).toFixed(1),
        y: (parseFloat(radius) * 0.38).toFixed(1)
      });
      // font-size in SVG user units (no "px") — scales with the viewBox
      label.setAttribute("font-size", (parseFloat(radius) * 2.1).toFixed(1));
      label.textContent = isCtrl ? site.group : site.number;
      button.append(label);
    }

    fragment.append(button);
  });

  pointLayer.append(fragment);
};

const makeDlRow = (label, value) => {
  const div = document.createElement("div");
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  div.append(dt, dd);
  return div;
};

const sectorName = (sectorId) => sectors.find((s) => s.id === sectorId)?.name || "—";

const renderSelected = () => {
  const site = allSites.find((item) => item.id === state.selectedId) || allSites[0];
  if (!site || !(selectedPanel instanceof HTMLElement)) return;

  const isControl = site.type === "control";
  const isMaster = !isControl && site.isMaster;

  const kicker = document.createElement("p");
  kicker.className = "roc-kicker";
  kicker.textContent = isControl ? "Group Control" : isMaster ? "Cluster master post" : "Monitoring Post";

  const heading = document.createElement("h3");
  heading.textContent = site.name;

  const dl = document.createElement("dl");
  dl.append(makeDlRow("Area", site.place || site.name));

  if (site.number) dl.append(makeDlRow("Post No.", site.number));

  dl.append(makeDlRow("Group", `No. ${site.group}`));
  if (isControl) {
    dl.append(makeDlRow("Sector", sectorName(site.sector)));
  } else {
    dl.append(makeDlRow("Status", site.status || "—"));
    const clusterId = site.cluster || postClusterById.get(site.id);
    if (clusterId) {
      const cluster = clusterById[clusterId];
      if (cluster) {
        const master = monitoringPosts.find((p) => p.id === cluster.masterId);
        dl.append(makeDlRow(
          "Cluster",
          `${master ? master.name.replace(" ROC Post", "") : "—"} (${cluster.memberIds.length} posts)`
        ));
        const fellow = cluster.memberIds
          .filter((id) => id !== site.id)
          .map((id) => monitoringPosts.find((p) => p.id === id))
          .filter(Boolean)
          .map((p) => p.name.replace(" ROC Post", ""))
          .join(", ");
        if (fellow) dl.append(makeDlRow("With", fellow));
      }
    }
  }

  if (!isControl) {
    dl.append(makeDlRow("Instruments", "GZI · FSM · BPI"));
    dl.append(makeDlRow("Depth", "Approx. 14 ft underground"));
    const coords = `${site.lat.toFixed(4)}°N, ${Math.abs(site.lon).toFixed(4)}°${site.lon < 0 ? "W" : "E"}`;
    dl.append(makeDlRow("Coordinates", coords));
  }

  dl.append(makeDlRow("Active period", "1955 – 1991"));

  const source = document.createElement("p");
  source.className = "roc-selected-source";
  source.textContent = `Source: ${site.source || (isControl ? "SubBrit Group HQ list" : "ringbell.co.uk March 1989 map · SubBrit")}`;

  selectedPanel.replaceChildren(kicker, heading, dl, source);

  // On narrow viewports the inspector sits below the map. Scroll it into view
  // so the user sees the detail without having to manually scroll down.
  if (window.innerWidth < 768 && selectedPanel instanceof HTMLElement) {
    selectedPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
};

// ── Smooth viewBox transitions ────────────────────────────────────────────────
// SVG viewBox isn't a CSS-animatable attribute, so we tween it manually.
let _vbAnimHandle = 0;
let _vbCurrent = null;
const _vbEase = (t) => 1 - Math.pow(1 - t, 3);  // cubic-out

const tweenViewBox = (to, ms = 350) => {
  if (!(svg instanceof SVGSVGElement)) return;
  const apply = (v) => svg.setAttribute(
    "viewBox",
    `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.width.toFixed(2)} ${v.height.toFixed(2)}`
  );
  // First paint: snap with no animation.
  if (!_vbCurrent) {
    _vbCurrent = { ...to };
    apply(to);
    return;
  }
  // No-op: re-clicking the active view shouldn't trigger a 350 ms RAF cycle
  // (sub-half-unit drift counts as identical given our 2-decimal apply()).
  if (
    Math.abs(_vbCurrent.x - to.x) < 0.5 &&
    Math.abs(_vbCurrent.y - to.y) < 0.5 &&
    Math.abs(_vbCurrent.width - to.width) < 0.5 &&
    Math.abs(_vbCurrent.height - to.height) < 0.5
  ) {
    return;
  }
  // Honour reduced-motion users.
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) {
    _vbCurrent = { ...to };
    apply(to);
    return;
  }
  cancelAnimationFrame(_vbAnimHandle);
  const from = { ..._vbCurrent };
  const t0 = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - t0) / ms);
    const k = _vbEase(t);
    const v = {
      x: from.x + (to.x - from.x) * k,
      y: from.y + (to.y - from.y) * k,
      width: from.width + (to.width - from.width) * k,
      height: from.height + (to.height - from.height) * k
    };
    _vbCurrent = { ...v };  // keep current in sync so re-entrant tweens start from here
    apply(v);
    if (t < 1) {
      _vbAnimHandle = requestAnimationFrame(step);
    }
  };
  _vbAnimHandle = requestAnimationFrame(step);
};

const renderMapView = () => {
  if (!(svg instanceof SVGSVGElement)) return;
  const view = computeViewBox(state.viewId);
  tweenViewBox(view);
  svg.dataset.viewScale = state.viewId === "all" ? "all" : state.viewId.startsWith("sector:") ? "sector" : "group";
};

const render = () => {
  renderMapView();
  renderSectors();
  renderLinks();
  renderClusters();
  renderPoints();
  renderSelected();
};

const selectSite = (siteId) => {
  if (!allSites.some((site) => site.id === siteId)) return;
  state.selectedId = siteId;
  render();
  pushUrlState();
};

// ── Sector / Group navigation UI ──────────────────────────────────────────────

const updateNavActiveStates = () => {
  if (allViewButton instanceof HTMLButtonElement) {
    allViewButton.classList.toggle("is-active", state.viewId === "all");
    allViewButton.setAttribute("aria-pressed", state.viewId === "all" ? "true" : "false");
  }
  if (sectorChipContainer) {
    Array.from(sectorChipContainer.querySelectorAll("[data-sector]")).forEach((btn) => {
      const sectorId = btn.getAttribute("data-sector");
      const inGroupView = state.viewId.startsWith("group:") &&
        groupControls.find((g) => g.group === state.viewId.slice(6))?.sector === sectorId;
      const active = state.viewId === `sector:${sectorId}` || inGroupView;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
  if (groupChipContainer) {
    Array.from(groupChipContainer.querySelectorAll("[data-group]")).forEach((btn) => {
      const groupNum = btn.getAttribute("data-group");
      const active = state.viewId === `group:${groupNum}`;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
};

const renderGroupChips = (sectorId) => {
  if (!(groupChipContainer instanceof HTMLElement)) return;
  const sector = groupsBySector.find((s) => s.id === sectorId);
  clearChildren(groupChipContainer);
  if (!sector || !sector.groups.length) {
    groupChipContainer.hidden = true;
    return;
  }
  groupChipContainer.hidden = false;
  sector.groups.forEach((g) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "roc-chip roc-chip-group";
    btn.dataset.group = g.group;
    btn.setAttribute("aria-pressed", "false");
    // Show the well-known city name. For "Acomb, York" take the part after the
    // comma; for "Preston / Goosnargh" take the part before the slash.
    const byComma = g.place.split(/, /);
    const city = byComma.length > 1
      ? byComma[byComma.length - 1].trim()
      : g.place.split(/ \/ /)[0].trim();
    btn.textContent = city;
    btn.title = `Group ${g.group} — ${g.name}`;
    groupChipContainer.append(btn);
  });
};

// ── URL state / deep linking ──────────────────────────────────────────────────
// Uses replaceState (not pushState) so map interactions don't litter the
// browser history stack. The query string is the canonical permalink.
// Format: ?view=group:20&site=g20p38  (defaults omitted to keep URLs short)

const DEFAULT_VIEW_ID = "group:20";
const DEFAULT_SITE_ID = "g20";

const pushUrlState = () => {
  const params = new URLSearchParams();
  if (state.viewId   !== DEFAULT_VIEW_ID)  params.set("view",   state.viewId);
  if (state.selectedId !== DEFAULT_SITE_ID) params.set("site",   state.selectedId || "");
  const qs  = params.toString();
  history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
};

// Reads ?view / ?site params and updates state before first render.
// Called once inside the bootstrap .then() after data has loaded.
const applyUrlState = () => {
  const params = new URLSearchParams(location.search);
  const viewParam   = params.get("view");
  const siteParam   = params.get("site");
  if (viewParam) state.viewId     = viewParam;
  if (siteParam) state.selectedId = siteParam;
};

const setView = (viewId) => {
  state.viewId = viewId;
  if (viewId.startsWith("sector:")) {
    renderGroupChips(viewId.slice(7));
  } else if (viewId.startsWith("group:")) {
    const ctrl = groupControls.find((g) => g.group === viewId.slice(6));
    if (ctrl) {
      renderGroupChips(ctrl.sector);
      state.selectedId = ctrl.id;
    }
  } else if (groupChipContainer instanceof HTMLElement) {
    groupChipContainer.hidden = true;
    clearChildren(groupChipContainer);
  }
  updateNavActiveStates();
  render();
  pushUrlState();
};

const buildSectorChips = () => {
  if (!(sectorChipContainer instanceof HTMLElement)) return;
  clearChildren(sectorChipContainer);
  groupsBySector.forEach((s) => {
    if (!s.groups.length) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "roc-chip roc-chip-sector";
    btn.dataset.sector = s.id;
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = s.name.replace(" Sector", "");
    btn.title = s.name;
    sectorChipContainer.append(btn);
  });
};

// ── Calculator ────────────────────────────────────────────────────────────────

const populateCalculator = () => {
  reportRows.forEach((row) => {
    const select = row.querySelector("[data-report-post]");
    if (!(select instanceof HTMLSelectElement)) return;
    clearChildren(select);

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Post number";
    select.append(placeholder);

    const group20Posts = numberedPosts.filter((s) => s.group === "20");
    const otherPosts = numberedPosts.filter((s) => s.group !== "20");

    if (group20Posts.length) {
      const og = document.createElement("optgroup");
      og.label = "Group 20 — York";
      group20Posts.forEach((site) => {
        const isMaster = masterPostIds.has(site.id);
        const option = document.createElement("option");
        option.value = site.id;
        option.textContent = `${site.number} - ${site.name.replace(" ROC Post", "")}${isMaster ? " (master)" : ""}`;
        og.append(option);
      });
      select.append(og);
    }

    if (otherPosts.length) {
      const og = document.createElement("optgroup");
      og.label = "Other groups";
      otherPosts.forEach((site) => {
        const option = document.createElement("option");
        option.value = site.id;
        option.textContent = `${site.number} - ${site.name.replace(" ROC Post", "")} (Grp ${site.group})`;
        og.append(option);
      });
      select.append(og);
    }
  });
};

const setCalculatorMessage = (message, tone = "neutral") => {
  if (!(calculatorOutput instanceof HTMLElement)) return;
  calculatorOutput.dataset.tone = tone;
  const span = document.createElement("span");
  span.textContent = message;
  calculatorOutput.replaceChildren(span);
};

const readCalculatorReports = () =>
  reportRows.map((row) => {
    const select = row.querySelector("[data-report-post]");
    const input = row.querySelector("[data-report-bearing]");
    const site = select instanceof HTMLSelectElement
      ? monitoringPosts.find((item) => item.id === select.value)
      : null;
    const bearing = input instanceof HTMLInputElement ? Number(input.value) : Number.NaN;
    return { site, bearing };
  });

const buildResultRow = (label, value) => {
  const div = document.createElement("div");
  const span = document.createElement("span");
  span.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  div.append(span, strong);
  return div;
};

const buildEl = (tag, props = {}, text = null) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k === "dataset") for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    else el.setAttribute(k, v);
  }
  if (text !== null) el.textContent = text;
  return el;
};

const renderCalculatorResult = (result, reports) => {
  const origin = {
    lat: reports.reduce((total, report) => total + report.site.lat, 0) / reports.length,
    lon: reports.reduce((total, report) => total + report.site.lon, 0) / reports.length
  };

  calculatorOutput.dataset.tone = "ready";
  const fixCoord = `${result.fix.lat.toFixed(4)}, ${result.fix.lon.toFixed(4)}`;
  const tight = result.spread < 3.5;

  // Headline: mean fix coordinate, with a copy-to-clipboard control.
  const headline = buildEl("div", { class: "roc-calc-headline" });
  headline.append(
    buildEl("span", { class: "roc-calc-tick", "aria-hidden": "true" }, "✓"),
  );
  const headlineBody = buildEl("div", { class: "roc-calc-headline-body" });
  headlineBody.append(
    buildEl("span", { class: "roc-calc-headline-label" }, "Fix established"),
    buildEl("code", { class: "roc-calc-coord" }, fixCoord),
  );
  headline.append(headlineBody);
  const copyButton = buildEl("button", {
    type: "button",
    class: "roc-calc-copy",
    "aria-label": "Copy fix coordinate"
  }, "Copy");
  headline.append(copyButton);

  // Spread row: pill colour reflects whether spread is inside the quality
  // threshold. The threshold (3.5 km) is intentionally not surfaced in copy
  // — the brief refers to a "quality threshold" without specifying it.
  const spread = buildEl("div", { class: "roc-calc-spread" });
  spread.append(
    buildEl("span", { class: "roc-calc-spread-label" }, "Spread"),
    buildEl("span", {
      class: "roc-calc-spread-pill",
      dataset: { tone: tight ? "ready" : "warn" }
    }, `${result.spread.toFixed(2)} km`),
  );

  // Pairwise intersections demoted into a collapsed details so the headline
  // dominates after a successful fix. Operators can still inspect individual
  // pair geometry if they need to.
  const pairs = buildEl("details", { class: "roc-calc-pairs-disclosure" });
  pairs.append(buildEl("summary", {}, "Pairwise intersections"));
  const pairsList = buildEl("div", { class: "roc-calc-pairs" });
  result.intersections.forEach((intersection) => {
    const fix = fromLocalPoint(intersection.point, origin);
    pairsList.append(buildResultRow(intersection.pair, `${fix.lat.toFixed(4)}, ${fix.lon.toFixed(4)}`));
  });
  pairs.append(pairsList);

  calculatorOutput.replaceChildren(headline, spread, pairs);

  // Wire copy-to-clipboard (best-effort; falls back silently if blocked).
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(fixCoord);
      copyButton.textContent = "Copied";
      setTimeout(() => { copyButton.textContent = "Copy"; }, 1400);
    } catch { /* clipboard blocked — leave button alone */ }
  });
};

// ── Inline calculator validation ──────────────────────────────────────────────

const setRowError = (row, field, message) => {
  if (!(row instanceof HTMLElement)) return;
  let slot = row.querySelector(".roc-field-error");
  if (!slot) {
    slot = document.createElement("small");
    slot.className = "roc-field-error";
    slot.id = `roc-err-${Math.random().toString(36).slice(2, 8)}`;
    row.append(slot);
  }
  slot.textContent = message;
  slot.dataset.active = "true";
  const target = field ? row.querySelector(field) : null;
  if (target instanceof HTMLElement) {
    target.setAttribute("aria-invalid", "true");
    target.setAttribute("aria-describedby", slot.id);
  }
};

const clearRowError = (row) => {
  if (!(row instanceof HTMLElement)) return;
  const slot = row.querySelector(".roc-field-error");
  if (slot instanceof HTMLElement) {
    slot.textContent = "";
    delete slot.dataset.active;
  }
  row.querySelectorAll("[aria-invalid]").forEach((el) => {
    el.removeAttribute("aria-invalid");
    el.removeAttribute("aria-describedby");
  });
};

const setFormError = (message) => {
  if (!(calculatorFormError instanceof HTMLElement)) return;
  calculatorFormError.textContent = message || "";
  calculatorFormError.dataset.active = message ? "true" : "false";
};

// Wire input changes to clear stale errors on the affected row + form-level slot.
reportRows.forEach((row) => {
  row.addEventListener("change", () => { clearRowError(row); setFormError(""); });
  row.addEventListener("input",  () => { clearRowError(row); setFormError(""); });
});

calculatorForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const reports = readCalculatorReports();
  let hasError = false;

  // Per-row checks: post selection + bearing validity.
  reports.forEach((report, idx) => {
    const row = reportRows[idx];
    clearRowError(row);
    if (!report.site) {
      setRowError(row, "[data-report-post]", "Select a post for this report.");
      hasError = true;
      return;
    }
    if (!Number.isFinite(report.bearing)) {
      setRowError(row, "[data-report-bearing]", "Enter a bearing for this report.");
      hasError = true;
      return;
    }
    if (report.bearing < 0 || report.bearing >= 360) {
      setRowError(row, "[data-report-bearing]", "Bearing must be 0–359.9°.");
      hasError = true;
    }
  });

  // Cross-row check: every report must be from a distinct post. Mark every
  // row whose post id appears more than once so the operator can see exactly
  // which rows clash.
  const postCounts = new Map();
  reports.forEach((r) => {
    if (r.site) postCounts.set(r.site.id, (postCounts.get(r.site.id) || 0) + 1);
  });
  reports.forEach((report, idx) => {
    if (report.site && postCounts.get(report.site.id) > 1) {
      setRowError(reportRows[idx], "[data-report-post]", "Duplicate post — each row must use a different post.");
      hasError = true;
    }
  });

  if (hasError) {
    setFormError("Resolve the highlighted reports before plotting a fix.");
    return;
  }
  setFormError("");

  const result = calculateFix(reports);
  if (!result) {
    setFormError("These three reports do not produce a stable intersection. Re-check the bearings.");
    return;
  }

  renderCalculatorResult(result, reports);
  renderFixMarker(result);
  animateOutputRows(calculatorOutput);
});

clearCalculatorButton?.addEventListener("click", () => {
  reportRows.forEach((row) => {
    const select = row.querySelector("[data-report-post]");
    const input = row.querySelector("[data-report-bearing]");
    if (select instanceof HTMLSelectElement) select.value = "";
    if (input instanceof HTMLInputElement) {
      input.value = "";
      input.classList.remove("is-error");
    }
    clearRowError(row);
  });
  setFormError("");
  clearFixMarker();
  setCalculatorMessage("Awaiting three post reports.");
});

// (Flag verification for Bikini State: RED is handled on the Pwn2Play
//  scoreboard, not in this page.)

toggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const key = toggle.dataset.layerToggle;
    if (!key || !(key in state)) return;
    state[key] = !state[key];
    toggle.classList.toggle("is-active", Boolean(state[key]));
    // CSS classes handle visibility instantly — no DOM re-render needed.
    if (svg instanceof SVGSVGElement) {
      svg.classList.toggle("hide-controls", !state.controls);
      svg.classList.toggle("hide-posts",    !state.posts);
    }
  });
});

// ── Navigation event wiring ───────────────────────────────────────────────────

allViewButton?.addEventListener("click", () => setView("all"));

sectorChipContainer?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-sector]") : null;
  if (!(target instanceof HTMLElement)) return;
  const sectorId = target.getAttribute("data-sector");
  if (sectorId) setView(`sector:${sectorId}`);
});

groupChipContainer?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-group]") : null;
  if (!(target instanceof HTMLElement)) return;
  const groupNum = target.getAttribute("data-group");
  if (groupNum) setView(`group:${groupNum}`);
});

svg?.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-site-id]") : null;
  if (!(target instanceof Element)) return;
  selectSite(target.getAttribute("data-site-id") || "");
});

svg?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target instanceof Element ? event.target.closest("[data-site-id]") : null;
  if (!(target instanceof Element)) return;
  event.preventDefault();
  selectSite(target.getAttribute("data-site-id") || "");
});

// ── Hover tooltip + bring-to-front for occluded points ────────────────────────
const tooltipEl = document.getElementById("roc-tooltip");
const mapWrapper = svg?.closest(".roc-map-wrapper") || svg?.parentElement;

const lookupSite = (id) => allSites.find((s) => s.id === id);

const setTooltipContent = (site) => {
  if (!(tooltipEl instanceof HTMLElement)) return;
  clearChildren(tooltipEl);
  const role = site.type === "control"
    ? "Group Control"
    : site.isMaster ? "Cluster master post" : "Monitoring post";
  const groupLabel = site.type === "control"
    ? `Group ${site.group}`
    : `Group ${site.group}${site.number ? ` · Post ${site.number}` : ""}`;
  const mk = (cls, text) => {
    const div = document.createElement("div");
    div.className = cls;
    div.textContent = text;
    return div;
  };
  tooltipEl.append(mk("roc-tooltip-name", site.name));
  tooltipEl.append(mk("roc-tooltip-meta", role));
  tooltipEl.append(mk("roc-tooltip-meta", groupLabel));
  if (site.status) tooltipEl.append(mk("roc-tooltip-status", site.status));
};

const showTooltip = (target, clientX, clientY) => {
  if (!(tooltipEl instanceof HTMLElement) || !(mapWrapper instanceof HTMLElement)) return;
  const id = target.getAttribute("data-site-id");
  const site = id ? lookupSite(id) : null;
  if (!site) return;
  // Only rebuild content when the hovered target changes. On every pointermove
  // over the same dot we just reposition — saves a DOM teardown each frame.
  if (tooltipEl.dataset.siteId !== id) {
    setTooltipContent(site);
    tooltipEl.dataset.siteId = id;
  }
  tooltipEl.hidden = false;
  const wrapRect = mapWrapper.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  let x = clientX - wrapRect.left + 14;
  let y = clientY - wrapRect.top + 14;
  x = clamp(x, 6, Math.max(6, wrapRect.width - tipRect.width - 6));
  y = clamp(y, 6, Math.max(6, wrapRect.height - tipRect.height - 6));
  tooltipEl.style.transform = `translate(${x}px, ${y}px)`;
};

const hideTooltip = () => {
  if (!(tooltipEl instanceof HTMLElement)) return;
  tooltipEl.hidden = true;
  delete tooltipEl.dataset.siteId;
};

svg?.addEventListener("pointermove", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-site-id]") : null;
  if (target instanceof Element) {
    showTooltip(target, event.clientX, event.clientY);
    // Bring-to-front: move the hovered point to the end of pointLayer so its
    // hit target sits on top of any siblings that overlap. Only useful in
    // group view; with 600 dots in all-UK view this thrashes the DOM as the
    // pointer crosses overlapping hit boxes and makes pans feel laggy.
    if (
      state.viewId.startsWith("group:") &&
      target.parentElement === pointLayer &&
      target.nextElementSibling
    ) {
      pointLayer.append(target);
    }
  } else {
    hideTooltip();
  }
});
svg?.addEventListener("pointerleave", hideTooltip);
svg?.addEventListener("focusin", (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-site-id]") : null;
  if (!(target instanceof Element)) return;
  const rect = target.getBoundingClientRect();
  showTooltip(target, rect.left + rect.width / 2, rect.top);
});

// Escape closes the tooltip without disturbing focus — keyboard users can
// dismiss the focus tooltip even if it occludes nearby content.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideTooltip();
});

// Window resize: dot radii are derived from the current SVG pixel width, so
// rescaling needs renderPoints() to re-run. Debounce so a continuous drag
// only repaints once the user stops.
if (svg instanceof SVGSVGElement && typeof ResizeObserver === "function") {
  let _resizeT = 0;
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(_resizeT);
    _resizeT = window.setTimeout(renderPoints, 120);
  });
  resizeObserver.observe(svg);
}
svg?.addEventListener("focusout", hideTooltip);

// Light-touch runtime validation: drop entries with bad shape so a single
// malformed row in roc-data.json doesn't crash the whole map. tmp/validate_
// roc_data.py covers the same checks (and more) at build time — this is the
// safety net for live edits.
const SECTOR_IDS = new Set(["metropolitan", "midland", "southern", "western", "eastern", "caledonian", "ni"]);
const isLikelyUKLatLon = (lat, lon) =>
  Number.isFinite(lat) && Number.isFinite(lon) &&
  lat >= 49 && lat <= 61 && lon >= -11 && lon <= 2;

const validateData = () => {
  const before = { gc: groupControls.length, c: clusters.length, p: monitoringPosts.length };
  groupControls = groupControls.filter((gc) => {
    if (!gc || typeof gc.id !== "string" || typeof gc.group !== "string"
        || typeof gc.name !== "string" || !SECTOR_IDS.has(gc.sector)
        || !isLikelyUKLatLon(gc.lat, gc.lon)) {
      console.warn("[ROC] dropping invalid groupControl:", gc);
      return false;
    }
    return true;
  });
  monitoringPosts = monitoringPosts.filter((p) => {
    if (!p || typeof p.id !== "string" || typeof p.name !== "string"
        || typeof p.group !== "string" || !isLikelyUKLatLon(p.lat, p.lon)) {
      console.warn("[ROC] dropping invalid monitoringPost:", p);
      return false;
    }
    return true;
  });
  clusters = clusters.filter((c) => {
    if (!c || typeof c.id !== "string" || typeof c.group !== "string"
        || typeof c.masterId !== "string" || !Array.isArray(c.memberIds)
        || c.memberIds.length === 0 || !c.memberIds.includes(c.masterId)) {
      console.warn("[ROC] dropping invalid cluster:", c);
      return false;
    }
    return true;
  });
  const dropped =
    (before.gc - groupControls.length) +
    (before.c - clusters.length) +
    (before.p - monitoringPosts.length);
  if (dropped > 0) {
    console.warn(`[ROC] validation dropped ${dropped} malformed entr${dropped === 1 ? "y" : "ies"}`);
  }
};

// Build derived structures from the freshly-loaded data arrays. Called
// once after roc-data.json resolves; safe to call again (idempotent up
// to the cluster generation loop, which only adds entries the literal
// dataset is missing).
const buildIndices = () => {
  validateData();

  clustersByGroup = clusters.reduce((groups, cluster) => {
    if (!groups.has(cluster.group)) groups.set(cluster.group, []);
    groups.get(cluster.group).push(cluster);
    return groups;
  }, new Map());
  
  originalPostById = new Map(monitoringPosts.map((post) => [post.id, post]));
  postById = new Map(originalPostById);
  postClusterById = new Map();

  // All cluster members are now in roc-data.json — no runtime generation needed.
  // Wire postClusterById (used by renderSelected for cluster detail lookups).
  clusters.forEach((cluster) => {
    cluster.memberIds.forEach((postId) => {
      postClusterById.set(postId, cluster.id);
    });
  });

  clusterById = Object.fromEntries(clusters.map((c) => [c.id, c]));
  masterPostIds = new Set(clusters.map((c) => c.masterId));

  allSites = [
    ...groupControls.map((site) => ({ ...site, type: "control" })),
    ...monitoringPosts.map((site) => ({ ...site, type: "post", isMaster: masterPostIds.has(site.id) }))
  ];

  numberedPosts = monitoringPosts
    .filter((site) => site.number)
    .sort((first, second) => {
      const groupDiff = Number(first.group) - Number(second.group);
      if (groupDiff !== 0) return groupDiff;
      return Number(first.number) - Number(second.number);
    });

  groupsBySector = sectors.map((s) => ({
    ...s,
    groups: groupControls
      .filter((g) => g.sector === s.id)
      .sort((a, b) => Number(a.group) - Number(b.group))
  }));
};

// ── Init ──────────────────────────────────────────────────────────────────────

// Fetch the data file. The map cannot work without it; on failure we render
// a single error message instead of an empty SVG.
const _dataReady = fetch("./roc-data.json?v=5")
  .then((res) => {
    if (!res.ok) throw new Error(`roc-data.json fetch failed: ${res.status}`);
    return res.json();
  })
  .then((data) => {
    groupControls   = Array.isArray(data.groupControls)   ? data.groupControls   : [];
    clusters        = Array.isArray(data.clusters)        ? data.clusters        : [];
    monitoringPosts = Array.isArray(data.monitoringPosts) ? data.monitoringPosts : [];
    buildIndices();
  });

const showBootstrapError = () => {
  if (!(svg instanceof SVGSVGElement)) return;
  const msg = createSvgElement("text", {
    x: mapBounds.width / 2,
    y: mapBounds.height / 2,
    "text-anchor": "middle",
    class: "roc-map-error"
  });
  msg.textContent = "Map data failed to load. Reload the page to retry.";
  svg.appendChild(msg);
};

// Sector overlay is fetched async; failures are non-fatal.
const _overlayReady = loadSectorOverlay().catch(() => null);

const loadingEl = document.getElementById("roc-map-loading");

const dismissLoadingSkeleton = () => {
  if (!(loadingEl instanceof HTMLElement)) return;
  loadingEl.classList.add("is-done");
  // Remove from DOM after fade-out so it doesn't block pointer events
  loadingEl.addEventListener("transitionend", () => loadingEl.remove(), { once: true });
};

// Gate first paint on data + overlay (with 400 ms fallback for the overlay).
Promise.all([
  _dataReady,
  Promise.race([_overlayReady, new Promise((r) => setTimeout(r, 400))])
])
  .then(() => {
    applyUrlState();
    buildSectorChips();
    populateCalculator();
    const groupNum = state.viewId.startsWith("group:") ? state.viewId.slice(6) : "20";
    const ctrl = groupControls.find((g) => g.group === groupNum)
               || groupControls.find((g) => g.group === "20");
    if (ctrl) renderGroupChips(ctrl.sector);
    updateNavActiveStates();
    render();
    dismissLoadingSkeleton();
  })
  .catch((err) => {
    console.error("[ROC] bootstrap failed:", err);
    dismissLoadingSkeleton();
    showBootstrapError();
  });

reportRows.forEach((row) => {
  const input = row.querySelector("[data-report-bearing]");
  if (!(input instanceof HTMLInputElement)) return;
  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      input.classList.remove("is-error");
      input.removeAttribute("aria-invalid");
      return;
    }
    const val = Number(input.value);
    const invalid = !Number.isFinite(val) || val < 0 || val >= 360;
    input.classList.toggle("is-error", invalid);
    if (invalid) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  });
});
