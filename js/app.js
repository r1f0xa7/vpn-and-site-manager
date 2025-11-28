/* -----------------------------------------------------------
   APP.JS — Global App Initialisation & Settings
   Handles:
     - Theme (WG / Mono)
     - Layout (Topnav / Sidebar)
     - Sidebar collapse
     - Modal style (WG / Modern)
     - Settings (⚙) menu
     - Sync with state.settings + localStorage
----------------------------------------------------------- */

console.log("[APP] Loaded app.js");

/* ===========================================================
   APPLY THEME, MODAL STYLE, LAYOUT, SIDEBAR COLLAPSE
=========================================================== */

function applyThemeFromSettings() {
  const theme = state.settings?.theme || "wg";
  const body = document.body;

  body.classList.remove(
    "theme-wg",
    "theme-mono",
    "theme-light",
    "theme-pink"
  );

  switch (theme) {
    case "mono":
      body.classList.add("theme-mono");
      break;
    case "light":
      body.classList.add("theme-light");
      break;
    case "pink":
      body.classList.add("theme-pink");
      break;
    default:
      body.classList.add("theme-wg");
  }

  const btn = document.getElementById("themeToggle");
  if (btn) {
    const labelMap = {
      wg: "Theme: A (WG)",
      mono: "Theme: B (Mono)",
      light: "Theme: C (Light)",
      pink: "Theme: D (Pink)",
    };
    btn.textContent = labelMap[theme] || "Theme: A (WG)";
  }
}


function applyModalStyleFromSettings() {
  const modalStyle = state.settings?.modalStyle || "wg";
  const body = document.body;
  body.classList.remove("modal-style-wg", "modal-style-modern");

  if (modalStyle === "modern") {
    body.classList.add("modal-style-modern");
  } else {
    body.classList.add("modal-style-wg");
  }
}

function applyLayoutFromSettings() {
  // router.js exposes applyLayoutLayout + applySidebarCollapse
  applyLayoutLayout();
  applySidebarCollapse();
  buildNavigationUI();
}



/* ===========================================================
   SETTINGS MENU (⚙)
=========================================================== */

let settingsMenuEl = null;

function createSettingsMenu() {
  if (settingsMenuEl) return settingsMenuEl;

  settingsMenuEl = document.createElement("div");
  settingsMenuEl.className = "settings-menu";
  settingsMenuEl.id = "settingsMenu";

  // Layout controls
  const layoutSection = document.createElement("div");
  layoutSection.className = "settings-section";

  layoutSection.innerHTML = `
    <div class="settings-section-title">Layout</div>
    <div class="settings-option">
      <label for="layoutTopnav">Top Navigation</label>
      <input type="radio" name="layoutMode" id="layoutTopnav" value="topnav">
    </div>
    <div class="settings-option">
      <label for="layoutSidebar">Sidebar Navigation</label>
      <input type="radio" name="layoutMode" id="layoutSidebar" value="sidebar">
    </div>
  `;

  // Sidebar collapse (only useful in sidebar mode)
  const sidebarSection = document.createElement("div");
  sidebarSection.className = "settings-section";

  sidebarSection.innerHTML = `
    <div class="settings-section-title">Sidebar</div>
    <div class="settings-option">
      <label for="sidebarCollapsed">Collapsed</label>
      <label class="switch">
        <input type="checkbox" id="sidebarCollapsed">
        <span class="slider"></span>
      </label>
    </div>
  `;

  // Modal style section
  const modalSection = document.createElement("div");
  modalSection.className = "settings-section";

  modalSection.innerHTML = `
    <div class="settings-section-title">Modal Style</div>
    <div class="settings-option">
      <label for="modalStyleWG">WireGuard (flat)</label>
      <input type="radio" name="modalStyle" id="modalStyleWG" value="wg">
    </div>
    <div class="settings-option">
      <label for="modalStyleModern">Modern (shadow)</label>
      <input type="radio" name="modalStyle" id="modalStyleModern" value="modern">
    </div>
  `;

  // Small note if user cannot change settings
  const perms = getCurrentRolePermissions();
  const note = document.createElement("div");
  note.style.fontSize = "11px";
  note.style.color = "var(--text-muted)";
  note.style.marginTop = "4px";
  if (!perms.canChangeSettings) {
    note.textContent = "You do not have permission to change global settings.";
  } else {
    note.textContent = "";
  }

  settingsMenuEl.appendChild(layoutSection);
  settingsMenuEl.appendChild(sidebarSection);
  settingsMenuEl.appendChild(modalSection);
  settingsMenuEl.appendChild(note);

  document.body.appendChild(settingsMenuEl);

  return settingsMenuEl;
}

function updateSettingsMenuControls() {
  const layout = state.settings.layout || "topnav";
  const collapsed = !!state.settings.sidebarCollapsed;
  const modalStyle = state.settings.modalStyle || "wg";

  const layoutTop = document.getElementById("layoutTopnav");
  const layoutSide = document.getElementById("layoutSidebar");
  const sidebarCollapsed = document.getElementById("sidebarCollapsed");
  const modalWg = document.getElementById("modalStyleWG");
  const modalModern = document.getElementById("modalStyleModern");

  if (layoutTop) layoutTop.checked = layout === "topnav";
  if (layoutSide) layoutSide.checked = layout === "sidebar";
  if (sidebarCollapsed) sidebarCollapsed.checked = collapsed;

  if (modalWg) modalWg.checked = modalStyle === "wg";
  if (modalModern) modalModern.checked = modalStyle === "modern";

  // Disable sidebar collapse checkbox if layout is topnav
  if (sidebarCollapsed) sidebarCollapsed.disabled = layout !== "sidebar";

  // Disable all controls if user cannot change settings
  const perms = getCurrentRolePermissions();
  if (!perms.canChangeSettings) {
    [layoutTop, layoutSide, sidebarCollapsed, modalWg, modalModern].forEach((el) => {
      if (el) el.disabled = true;
    });
  }
}

function bindSettingsMenuEvents() {
  const perms = getCurrentRolePermissions();

  // Layout mode radios
  const layoutTop = document.getElementById("layoutTopnav");
  const layoutSide = document.getElementById("layoutSidebar");
  if (layoutTop) {
    layoutTop.addEventListener("change", () => {
      if (!perms.canChangeSettings) return;
      state.settings.layout = "topnav";
      saveState();
      applyLayoutFromSettings();
      updateSettingsMenuControls();
    });
  }
  if (layoutSide) {
    layoutSide.addEventListener("change", () => {
      if (!perms.canChangeSettings) return;
      state.settings.layout = "sidebar";
      saveState();
      applyLayoutFromSettings();
      updateSettingsMenuControls();
    });
  }

  // Sidebar collapse switch
  const sidebarCollapsed = document.getElementById("sidebarCollapsed");
  if (sidebarCollapsed) {
    sidebarCollapsed.addEventListener("change", () => {
      if (!perms.canChangeSettings) return;
      state.settings.sidebarCollapsed = sidebarCollapsed.checked;
      saveState();
      applySidebarCollapse();
    });
  }

  // Modal style radios
  const modalWg = document.getElementById("modalStyleWG");
  const modalModern = document.getElementById("modalStyleModern");
  if (modalWg) {
    modalWg.addEventListener("change", () => {
      if (!perms.canChangeSettings) return;
      state.settings.modalStyle = "wg";
      saveState();
      applyModalStyleFromSettings();
    });
  }
  if (modalModern) {
    modalModern.addEventListener("change", () => {
      if (!perms.canChangeSettings) return;
      state.settings.modalStyle = "modern";
      saveState();
      applyModalStyleFromSettings();
    });
  }
}

function toggleSettingsMenu() {
  const menu = createSettingsMenu();
  const isShown = menu.classList.contains("show");
  if (isShown) {
    menu.classList.remove("show");
  } else {
    updateSettingsMenuControls();
    menu.classList.add("show");
  }
}

function hideSettingsMenu() {
  if (!settingsMenuEl) return;
  settingsMenuEl.classList.remove("show");
}



/* ===========================================================
   THEME TOGGLE BUTTON (bottom-right)
=========================================================== */

function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const themes = ["wg", "mono", "light", "pink"];
    const current = state.settings.theme || "wg";
    const idx = themes.indexOf(current);
    const next = themes[(idx + 1 + themes.length) % themes.length];
  
    state.settings.theme = next;
    saveState();
    applyThemeFromSettings();
  
    showToast(`Theme changed to ${next.toUpperCase()}`, "info");
  });
  
  
}



/* ===========================================================
   APP INIT
=========================================================== */

function appInit() {
  console.log("[APP] Initialising app...");

  // Ensure settings object exists
  if (!state.settings) {
    state.settings = {
      theme: "wg",
      layout: "topnav",
      sidebarCollapsed: false,
      modalStyle: "wg"
    };
    saveState();
  }

  // Apply theme + modal style + layout from state
  applyThemeFromSettings();
  applyModalStyleFromSettings();
  applyLayoutFromSettings();

  // Initialise theme toggle button
  initThemeToggle();

  // Build settings menu + attach to ⚙
  const settingsBtn = document.getElementById("btnSettings");
  if (settingsBtn) {
    createSettingsMenu();
    bindSettingsMenuEvents();

    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleSettingsMenu();
    });
  }

  // Hide settings when clicking outside
  document.addEventListener("click", (e) => {
    if (!settingsMenuEl) return;
    const settingsBtn = document.getElementById("btnSettings");
    if (
      settingsMenuEl.contains(e.target) ||
      (settingsBtn && settingsBtn.contains(e.target))
    ) {
      return;
    }
    hideSettingsMenu();
  });

  console.log("[APP] Initialisation complete.");
}

document.addEventListener("DOMContentLoaded", appInit);
