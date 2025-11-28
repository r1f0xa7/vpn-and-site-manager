/* -----------------------------------------------------------
   VIEWS.JS — Base view renderers (safe defaults)
   These functions are called by router.js.
   Later, more advanced implementations in:
     js/render/dashboard.js
     js/render/companies.js
     js/render/sites.js
     js/render/routers.js
     js/render/cameras.js
     js/render/peers.js
     js/render/interfaces.js
     js/render/users.js
     js/render/profiles.js
     js/render/ipam.js
   will override these with full UI.
----------------------------------------------------------- */

console.log("[VIEWS] Loaded views.js (base renderers)");

/* Small helper to create a simple panel */
function createBasicBlock(root, titleText, bodyHtml) {
  const block = document.createElement("section");
  block.className = "block";

  const h = document.createElement("h1");
  h.className = "block-title";
  h.textContent = titleText;

  const body = document.createElement("div");
  body.innerHTML = bodyHtml;

  block.appendChild(h);
  block.appendChild(body);
  root.appendChild(block);
}

/* -----------------------------------------------------------
   DASHBOARD
----------------------------------------------------------- */
function renderDashboard(root) {
  createBasicBlock(
    root,
    "OVERVIEW",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      Dashboard will show metrics for Companies, Sites, Routers, Cameras, Peers and Engineers.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   COMPANIES
----------------------------------------------------------- */
function renderCompanies(root) {
  createBasicBlock(
    root,
    "COMPANIES",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      Companies table and controls will appear here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   SITES
----------------------------------------------------------- */
function renderSites(root) {
  createBasicBlock(
    root,
    "SITES",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      Sites grid, status and router assignments will be rendered here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   ROUTERS (Teltonika Manager)
----------------------------------------------------------- */
function renderRouters(root) {
  createBasicBlock(
    root,
    "ROUTERS",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      Teltonika router list, signal, uptime and actions will appear here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   CAMERAS
----------------------------------------------------------- */
function renderCameras(root) {
  createBasicBlock(
    root,
    "CAMERAS",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      Camera inventory (Dahua), NAT IPs and RTSP paths will be shown here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   PEERS (WireGuard peers)
----------------------------------------------------------- */
function renderPeers(root) {
  createBasicBlock(
    root,
    "CURRENT VPN PEERS",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      WireGuard peers (routers + engineers) table will be rendered here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   INTERFACES (WireGuard Interface Admin)
----------------------------------------------------------- */
function renderInterfaces(root) {
  createBasicBlock(
    root,
    "INTERFACE ADMINISTRATION",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      wg0 interface status panel and interface list will be rendered here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   USERS (Accounts & Roles)
----------------------------------------------------------- */
function renderUsers(root) {
  createBasicBlock(
    root,
    "USERS",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      User management (roles, allowed sections) UI will appear here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   PROFILES (Engineer VPN Profiles)
----------------------------------------------------------- */
function renderProfiles(root) {
  createBasicBlock(
    root,
    "VPN PROFILES",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      Engineer VPN profiles (permanent IPs, config, QR) will be rendered here.
      (Base placeholder from views.js)
    </p>
  `
  );
}

/* -----------------------------------------------------------
   IPAM (IP Pools & Allocations)
----------------------------------------------------------- */
function renderIPAM(root) {
  createBasicBlock(
    root,
    "IPAM – IP POOLS & ALLOCATIONS",
    `
    <p style="font-size:13px;color:var(--text-soft);">
      IP pools (router, camera, engineer, infra) and permanent allocations
      will be rendered here, enforcing your global IP architecture.
      (Base placeholder from views.js)
    </p>
  `
  );
}
