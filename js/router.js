/* -----------------------------------------------------------
   ROUTER.JS — Single Page App Navigation System (SPA Router)
   Controls:
     - View switching
     - Dynamic nav generation (top-nav & sidebar)
     - Role-based visibility
     - Layout switching (topnav <-> sidebar)
     - Sidebar collapse
     - Last-view persistence
----------------------------------------------------------- */

console.log("[ROUTER] Loaded router.js");

/* -----------------------------------------------------------
   GLOBAL ROUTER STATE
----------------------------------------------------------- */

let currentView = loadLS("wg_current_view", "dashboard");   // default view

/* The root <main> where views get rendered */
const appViewRoot = document.getElementById("appViewRoot");

/* Navigation containers */
const topnavEl = document.getElementById("topnav");



/* -----------------------------------------------------------
   LAYOUT + NAV GENERATION
----------------------------------------------------------- */

function buildNavigationUI() {
  const visibleSections = getVisibleSections();
  const layout = state.settings.layout;

  // Clear current nav
  topnavEl.innerHTML = "";

  // Rebuild navigation depending on layout
  if (layout === "topnav") {
    buildTopNav(visibleSections);
  } else {
    buildSidebarNav(visibleSections);
  }
}

/* ------------------------ TOP NAV ------------------------ */

function buildTopNav(visibleSections) {

  topnavEl.innerHTML = ""; // clear

  visibleSections.forEach(sectionId => {
    const meta = SECTION_META[sectionId];
    if (!meta) return;

    const btn = document.createElement("button");
    btn.className = "topnav-link";
    btn.textContent = meta.label;
    btn.dataset.view = sectionId;

    if (currentView === sectionId)
      btn.classList.add("active");

    btn.onclick = () => navigateTo(sectionId);

    topnavEl.appendChild(btn);
  });
}

/* ---------------------- SIDEBAR NAV ---------------------- */

let sidebarEl = null;

function buildSidebarNav(visibleSections) {

  // If sidebar doesn't exist, create it
  if (!sidebarEl) {
    sidebarEl = document.createElement("div");
    sidebarEl.className = "sidebar";
    document.body.appendChild(sidebarEl);
  }

  sidebarEl.innerHTML = ""; // clear

  visibleSections.forEach(sectionId => {
    const meta = SECTION_META[sectionId];
    if (!meta) return;

    const item = document.createElement("div");
    item.className = "sidebar-item";
    item.dataset.view = sectionId;

    if (currentView === sectionId)
      item.classList.add("active");

    const icon = document.createElement("div");
    icon.className = "sidebar-icon";
    icon.textContent = meta.icon;

    const label = document.createElement("div");
    label.className = "sidebar-label";
    label.textContent = meta.label;

    item.appendChild(icon);
    item.appendChild(label);

    item.onclick = () => navigateTo(sectionId);

    sidebarEl.appendChild(item);
  });
}



/* -----------------------------------------------------------
   VIEW NAVIGATION
----------------------------------------------------------- */

function navigateTo(viewId) {

  if (!canAccessSection(viewId)) {
    showToast("Access Denied", "error");
    return;
  }

  currentView = viewId;
  saveLS("wg_current_view", viewId);

  // Clear active nav states
  document.querySelectorAll(".topnav-link, .sidebar-item")
    .forEach(el => el.classList.remove("active"));

  // Highlight active nav item
  const activeNavItem = document.querySelector(`[data-view='${viewId}']`);
  if (activeNavItem) activeNavItem.classList.add("active");

  // Render the requested view
  renderView(viewId);
}



/* -----------------------------------------------------------
   VIEW RENDER DISPATCHER
   Calls the appropriate render function by view name
----------------------------------------------------------- */

function renderView(viewId) {

  appViewRoot.innerHTML = ""; // clear existing view

  switch (viewId) {

    case "dashboard":
      renderDashboard(appViewRoot);
      break;

    case "companies":
      renderCompanies(appViewRoot);
      break;

    case "sites":
      renderSites(appViewRoot);
      break;

    case "routers":
      renderRouters(appViewRoot);
      break;

    case "cameras":
      renderCameras(appViewRoot);
      break;

    case "peers":
      renderPeers(appViewRoot);
      break;

    case "interfaces":
      renderInterfaces(appViewRoot);
      break;

    case "users":
      renderUsers(appViewRoot);
      break;

    case "profiles":
      renderProfiles(appViewRoot);
      break;

    case "ipam":
      renderIPAM(appViewRoot);
      break;

    case "logs":
      renderLogs(appViewRoot);
      break;

    default:
      appViewRoot.innerHTML = `<div style="padding:20px;">Unknown view: ${viewId}</div>`;
  }
}



/* -----------------------------------------------------------
   APPLY LAYOUT (topnav / sidebar)
   Called at startup and when user changes settings
----------------------------------------------------------- */

function applyLayoutLayout() {
  const layout = state.settings.layout;

  if (layout === "topnav") {
    document.body.classList.add("layout-topnav");
    document.body.classList.remove("layout-sidebar");
  } else {
    document.body.classList.remove("layout-topnav");
    document.body.classList.add("layout-sidebar");
  }
}



/* -----------------------------------------------------------
   SIDEBAR COLLAPSE HANDLER
----------------------------------------------------------- */

function applySidebarCollapse() {
  if (state.settings.sidebarCollapsed) {
    document.body.classList.add("sidebar-collapsed");
  } else {
    document.body.classList.remove("sidebar-collapsed");
  }
}



/* -----------------------------------------------------------
   INITIALIZE ROUTER
----------------------------------------------------------- */

function routerInit() {
  console.log("[ROUTER] Initializing router...");

  applyLayoutLayout();
  applySidebarCollapse();
  buildNavigationUI();
  renderView(currentView);

  // Update current user name in topbar
  document.getElementById("currentUserName").textContent =
    getCurrentUser().name;
}

document.addEventListener("DOMContentLoaded", routerInit);
